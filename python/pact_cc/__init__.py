"""
pact-cc Python SDK — thin subprocess wrapper around the Node.js CLI.
Requires: Node.js >= 18 on PATH.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from typing import Optional


def _node_available() -> bool:
    return shutil.which("node") is not None


def _run(args: list[str], input_text: Optional[str] = None) -> subprocess.CompletedProcess:
    """Run npx pact-cc with given args. Raises RuntimeError on non-zero exit."""
    if not _node_available():
        raise RuntimeError(
            "Node.js >= 18 is required. Install from https://nodejs.org"
        )
    cmd = ["npx", "pact-cc", *args]
    result = subprocess.run(
        cmd,
        input=input_text,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"pact-cc error (exit {result.returncode}):\n{result.stderr.strip()}"
        )
    return result


@dataclass
class CompressResult:
    pact: str
    ratio: float
    tokens_before: int
    tokens_after: int


def compress(
    context: str,
    *,
    model: Optional[str] = None,
    threshold: Optional[float] = None,
) -> Optional[CompressResult]:
    """
    Compress a context string to PACT syntax.

    Returns CompressResult on success, None if compression fails.
    """
    args = ["compress", "--stats"]
    if model:
        args += ["--model", model]

    try:
        result = _run(args, input_text=context)
    except RuntimeError:
        return None

    lines = result.stdout.strip().splitlines()
    # Parse stats lines: "# tokens before: N", "# tokens after: N", "# ratio: Nx"
    tokens_before = 0
    tokens_after = 0
    ratio = 0.0
    pact_lines: list[str] = []

    for line in lines:
        if line.startswith("# tokens before:"):
            tokens_before = int(line.split(":")[-1].strip())
        elif line.startswith("# tokens after:"):
            tokens_after = int(line.split(":")[-1].strip())
        elif line.startswith("# ratio:"):
            ratio = float(line.split(":")[-1].strip().rstrip("x"))
        else:
            pact_lines.append(line)

    pact = "\n".join(pact_lines).strip()
    if not pact:
        return None

    return CompressResult(
        pact=pact,
        ratio=ratio,
        tokens_before=tokens_before,
        tokens_after=tokens_after,
    )


def decompress(pact: str) -> str:
    """Expand a PACT program back to natural language."""
    result = _run(["decompress"], input_text=pact)
    return result.stdout.strip()


def install(project_dir: Optional[str] = None, *, threshold: Optional[float] = None, model: Optional[str] = None) -> None:
    """Install PACT hook in a Claude Code project."""
    args = ["install"]
    if project_dir:
        args += ["--project-dir", project_dir]
    if threshold is not None:
        args += ["--threshold", str(threshold)]
    if model:
        args += ["--model", model]
    _run(args)


def uninstall(project_dir: Optional[str] = None) -> None:
    """Remove PACT hook from a Claude Code project."""
    args = ["uninstall"]
    if project_dir:
        args += ["--project-dir", project_dir]
    _run(args)


@dataclass
class StatusResult:
    installed: bool
    threshold: float
    model: str
    sessions_compressed: int
    avg_ratio: float
    tokens_saved: int


def status(project_dir: Optional[str] = None) -> StatusResult:
    """Get PACT installation status for a project."""
    args = ["status", "--json"]
    if project_dir:
        args += ["--project-dir", project_dir]
    try:
        result = _run(args)
        data = json.loads(result.stdout)
        return StatusResult(
            installed=data.get("installed", False),
            threshold=data.get("threshold", 0.80),
            model=data.get("model", "claude-haiku-4-5-20251001"),
            sessions_compressed=data.get("sessionsCompressed", 0),
            avg_ratio=data.get("avgRatio", 0.0),
            tokens_saved=data.get("tokensSaved", 0),
        )
    except Exception:
        return StatusResult(
            installed=False,
            threshold=0.80,
            model="claude-haiku-4-5-20251001",
            sessions_compressed=0,
            avg_ratio=0.0,
            tokens_saved=0,
        )
