#!/bin/bash
echo "PACT Uninstaller — macOS"
echo "========================"
echo ""

rm -f "$HOME/.local/bin/pact"
rm -rf "$HOME/Library/Services/Pack with PACT.workflow"
rm -rf "$HOME/Library/Services/Unpack PACT.workflow"
rm -rf "$HOME/Library/Services/Inspect PACT.workflow"

echo "Removed:"
echo "  Binary:        ~/.local/bin/pact"
echo "  Quick Actions: Pack with PACT / Unpack PACT / Inspect PACT"
echo ""
echo "PACT uninstalled."
