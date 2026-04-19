# SDK-PYTHON — Python SDK Design

> Package: `pact-cc` on PyPI. Location: `python/pact_cc/`. Install: `pip install pact-cc`.

---

## Approach: Subprocess Wrapper

The Python SDK delegates to the Node.js CLI via `subprocess`. This avoids maintaining
a parallel PACT implementation and guarantees the Python and TypeScript SDKs always
produce identical results from the same engine.

**Requirement:** Node.js ≥ 18 must be on PATH. If not found, all functions raise
`RuntimeError("Node.js ≥ 18 required. Install at nodejs.org")`.

---

## Public API

```python
from pact_cc import compress, decompress, install, uninstall, status

# Compress context to PACT
result = compress(context_string)
# → { 'pact': '...', 'ratio': 34.7, 'tokens': { 'before': 3420, 'after': 98 } }
# → None on failure (caller keeps original context)

# Decompress PACT to natural language
text = decompress(pact_string)
# → str

# Install in a project
install(project_dir=".")  # defaults to cwd

# Uninstall from a project
uninstall(project_dir=".")

# Check status
info = status(project_dir=".")
# → { 'installed': True, 'avg_ratio': 34.2, 'sessions_compressed': 3, ... }
```

---

## `pact_cc/__init__.py`

```python
import subprocess
import json
import shutil
from pathlib import Path
from typing import Optional

_CLI = "pact-cc"  # assumes npm global install or npx

def _run(args: list[str], input_text: Optional[str] = None) -> subprocess.CompletedProcess:
    if shutil.which("node") is None:
        raise RuntimeError("Node.js ≥ 18 required. Install at nodejs.org")
    return subprocess.run(
        ["npx", _CLI] + args,
        input=input_text,
        capture_output=True,
        text=True,
        timeout=30,
    )


def compress(context: str, threshold: float = 0.80, model: Optional[str] = None) -> Optional[dict]:
    args = ["compress", "--stats"]
    if model:
        args += ["--model", model]
    result = _run(args, input_text=context)
    if result.returncode != 0:
        return None
    # Parse stats header + pact body from stdout
    return _parse_compress_output(result.stdout)


def decompress(pact: str) -> str:
    result = _run(["decompress"], input_text=pact)
    if result.returncode != 0:
        return pact  # safe fallback: return raw pact
    return result.stdout.strip()


def install(project_dir: str = ".") -> None:
    result = _run(["install"], )
    if result.returncode != 0:
        raise RuntimeError(f"pact-cc install failed: {result.stderr}")


def uninstall(project_dir: str = ".") -> None:
    result = _run(["uninstall"])
    if result.returncode != 0:
        raise RuntimeError(f"pact-cc uninstall failed: {result.stderr}")


def status(project_dir: str = ".") -> dict:
    result = _run(["status", "--json"])
    if result.returncode != 0:
        return {"installed": False}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"installed": False}


def _parse_compress_output(stdout: str) -> dict:
    lines = stdout.strip().split("\n")
    stats = {}
    pact_lines = []
    in_pact = False
    for line in lines:
        if line.startswith("# tokens before:"):
            stats["before"] = int(line.split(":")[1].strip().replace(",", ""))
        elif line.startswith("# tokens after:"):
            stats["after"] = int(line.split(":")[1].strip().replace(",", ""))
        elif line.startswith("# ratio:"):
            stats["ratio"] = float(line.split(":")[1].strip().rstrip("x"))
        else:
            in_pact = True
            pact_lines.append(line)
    pact = "\n".join(pact_lines).strip()
    return {
        "pact": pact,
        "ratio": stats.get("ratio", 0),
        "tokens": {"before": stats.get("before", 0), "after": stats.get("after", 0)},
    }
```

---

## `python/pyproject.toml`

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "pact-cc"
version = "1.0.0"
description = "Semantic compression middleware for Claude Code agents"
readme = "../README.md"
license = { file = "../LICENSE" }
requires-python = ">=3.10"
dependencies = []

[project.urls]
Homepage = "https://github.com/hmatrades/PACT"

[tool.hatch.build.targets.wheel]
packages = ["pact_cc"]
```

No Python dependencies. Everything delegates to the Node CLI.

---

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Node not on PATH | `RuntimeError("Node.js ≥ 18 required")` |
| `compress` fails | Return `None` (caller keeps original) |
| `decompress` fails | Return raw PACT string (safe fallback) |
| `install` fails | `RuntimeError` with stderr |
| CLI timeout (>30s) | `subprocess.TimeoutExpired` — let it propagate |

---

## Usage Examples

```python
from pact_cc import compress, decompress, install, status

# Check requirements
info = status()
if not info["installed"]:
    install()

# Compress a long context
context = """
I need to refactor the authentication module. I've read auth/login.rs
and found that the token validation logic is tightly coupled to the
session management in auth/session.rs...
[3,000 more tokens]
"""

result = compress(context)
if result:
    print(f"Compressed {result['ratio']:.1f}x")
    print(f"Before: {result['tokens']['before']:,} tokens")
    print(f"After:  {result['tokens']['after']:,} tokens")

# Expand back when needed
expanded = decompress(result["pact"])
```

---

## PyPI Publishing (Day 4 task)

```bash
cd python/
pip install hatchling build twine
python -m build
twine upload dist/*
```

Requires `~/.pypirc` with PyPI credentials or `TWINE_PASSWORD` env var.

---

## Limitations

- Requires Node.js ≥ 18 on PATH (documented in README)
- Each call spawns a subprocess (~50ms overhead per call)
- For high-frequency use, prefer the TypeScript SDK directly
- `project_dir` arg to `install`/`uninstall`/`status` is passed as cwd to subprocess;
  the Node CLI uses `process.cwd()` internally (current limitation — future: `--dir` flag)
