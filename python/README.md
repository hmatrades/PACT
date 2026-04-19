# pact-cc (Python)

Python SDK for [pact-cc](https://github.com/aidenharris/pact-cc).

## Install

```bash
pip install pact-cc
```

Requires Node.js >= 18 on PATH.

## Usage

```python
from pact_cc import compress, decompress, install, status

result = compress(my_long_context)
print(f"Compressed {result.tokens_before} → {result.tokens_after} tokens ({result.ratio:.1f}x)")

text = decompress(result.pact)
install()  # register in current Claude Code project
print(status())
```
