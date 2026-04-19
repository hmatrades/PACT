"""Tests for pact_cc Python SDK."""
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from pact_cc import CompressResult, StatusResult, compress, decompress


class TestCompress:
    def test_returns_compress_result_on_success(self):
        mock_output = (
            "# tokens before: 212\n"
            "# tokens after: 57\n"
            "# ratio: 3.7x\n"
            "session = { goal: 'refactor auth' }\n"
            ". sjson(session)"
        )
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = mock_output
        mock_proc.stderr = ""

        with patch("subprocess.run", return_value=mock_proc):
            result = compress("some long context")

        assert result is not None
        assert isinstance(result, CompressResult)
        assert result.tokens_before == 212
        assert result.tokens_after == 57
        assert result.ratio == pytest.approx(3.7)
        assert "session" in result.pact

    def test_returns_none_on_failure(self):
        with patch("pact_cc._node_available", return_value=False):
            result = compress("some context")
        assert result is None


class TestDecompress:
    def test_returns_string(self):
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = "The agent is refactoring the auth module."
        mock_proc.stderr = ""

        with patch("subprocess.run", return_value=mock_proc):
            result = decompress("session = { goal: 'refactor auth' }")

        assert isinstance(result, str)
        assert len(result) > 0
