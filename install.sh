#!/bin/bash
# PACT universal installer — works on macOS, Linux, Windows (Git Bash/WSL)
# Usage: curl -fsSL https://raw.githubusercontent.com/hmatrades/PACT/main/install.sh | bash
set -e

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║   PACT installer              ║"
echo "  ║   ZIP's bigger brother.       ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)  PLATFORM="macos" ;;
  Linux)   PLATFORM="linux" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
  *)       echo "  Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
  arm64|aarch64) ARCH_TAG="arm64" ;;
  x86_64|amd64)  ARCH_TAG="x64" ;;
  *)             echo "  Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "  Detected: $PLATFORM $ARCH_TAG"
echo ""

# Check for Node.js (needed for npx fallback)
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v)
  echo "  Node.js: $NODE_VERSION"
else
  echo "  Node.js not found. Installing via npx won't work."
  echo "  Install Node.js 18+ from https://nodejs.org"
  exit 1
fi

# Install the npm package globally
echo ""
echo "  Installing pact-cc..."
npm install -g pact-cc 2>/dev/null || npx pact-cc --help >/dev/null 2>&1

# Set up the binary
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

# Create a wrapper script that calls npx
WRAPPER="$INSTALL_DIR/pact"
cat > "$WRAPPER" << 'SCRIPT'
#!/bin/bash
npx --yes pact-cc "$@"
SCRIPT
chmod +x "$WRAPPER"

echo "  Binary: $WRAPPER"

# Add to PATH if needed
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  SHELL_RC=""
  case "$SHELL" in
    */zsh)  SHELL_RC="$HOME/.zshrc" ;;
    */bash) SHELL_RC="$HOME/.bashrc" ;;
    *)      SHELL_RC="$HOME/.profile" ;;
  esac
  if [ -n "$SHELL_RC" ] && ! grep -q '.local/bin' "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
    echo "  Added to PATH in $SHELL_RC"
  fi
  export PATH="$INSTALL_DIR:$PATH"
fi

# Install global Claude Code compaction
echo ""
echo "  Setting up Claude Code compaction..."
pact install --global 2>/dev/null || npx pact-cc install --global 2>/dev/null || true

# macOS: install Finder Quick Actions
if [ "$PLATFORM" = "macos" ]; then
  echo ""
  echo "  Installing Finder Quick Actions..."
  SERVICES="$HOME/Library/Services"

  install_workflow() {
    local NAME="$1"
    local CMD="$2"
    local DIR="$SERVICES/$NAME.workflow/Contents"
    mkdir -p "$DIR"

    cat > "$DIR/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSServices</key><array><dict>
    <key>NSMenuItem</key><dict><key>default</key><string>$NAME</string></dict>
    <key>NSMessage</key><string>runWorkflowAsService</string>
    <key>NSSendFileTypes</key><array><string>public.item</string></array>
  </dict></array>
</dict>
</plist>
PLIST

    cat > "$DIR/document.wflow" << WFLOW
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AMApplicationBuild</key><string>523</string>
  <key>AMApplicationVersion</key><string>2.10</string>
  <key>AMDocumentVersion</key><string>2</string>
  <key>actions</key><array><dict><key>action</key><dict>
    <key>AMAccepts</key><dict><key>Container</key><string>List</string><key>Optional</key><true/><key>Types</key><array><string>com.apple.cocoa.path</string></array></dict>
    <key>AMActionVersion</key><string>2.0.3</string>
    <key>AMApplication</key><array><string>Automator</string></array>
    <key>AMParameterProperties</key><dict><key>COMMAND_STRING</key><dict/><key>CheckedForUserDefaultShell</key><dict/><key>inputMethod</key><dict/><key>shell</key><dict/><key>source</key><dict/></dict>
    <key>AMProvides</key><dict><key>Container</key><string>List</string><key>Types</key><array><string>com.apple.cocoa.string</string></array></dict>
    <key>ActionBundlePath</key><string>/System/Library/Automator/Run Shell Script.action</string>
    <key>ActionName</key><string>Run Shell Script</string>
    <key>ActionParameters</key><dict>
      <key>COMMAND_STRING</key><string>$CMD</string>
      <key>CheckedForUserDefaultShell</key><true/>
      <key>inputMethod</key><integer>1</integer>
      <key>shell</key><string>/bin/zsh</string>
      <key>source</key><string></string>
    </dict>
    <key>BundleIdentifier</key><string>com.apple.RunShellScript</string>
    <key>CFBundleVersion</key><string>2.0.3</string>
    <key>CanShowSelectedItemsWhenRun</key><false/>
    <key>CanShowWhenRun</key><true/>
    <key>Category</key><array><string>AMCategoryUtilities</string></array>
    <key>Class Name</key><string>RunShellScriptAction</string>
    <key>InputUUID</key><string>A2B1C3D4-0000-0000-0000-000000000001</string>
    <key>OutputUUID</key><string>A2B1C3D4-0000-0000-0000-000000000002</string>
    <key>UUID</key><string>A2B1C3D4-0000-0000-0000-000000000003</string>
    <key>UnlocalizedApplications</key><array><string>Automator</string></array>
    <key>arguments</key><dict><key>0</key><dict><key>default value</key><integer>0</integer><key>name</key><string>inputMethod</string><key>required</key><string>0</string><key>type</key><string>0</string><key>uuid</key><string>0</string></dict></dict>
    <key>isViewVisible</key><integer>1</integer>
    <key>location</key><string>449.500000:620.000000</string>
    <key>nibPath</key><string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/English.lproj/main.nib</string>
  </dict><key>isViewVisible</key><integer>1</integer></dict></array>
  <key>connectors</key><dict/>
  <key>workflowMetaData</key><dict>
    <key>serviceInputTypeIdentifier</key><string>com.apple.Automator.fileSystemObject</string>
    <key>serviceOutputTypeIdentifier</key><string>com.apple.Automator.nothing</string>
    <key>serviceProcessesInput</key><integer>0</integer>
    <key>workflowTypeIdentifier</key><string>com.apple.Automator.servicesMenu</string>
  </dict>
</dict>
</plist>
WFLOW
  }

  PACK_CMD='export PATH="$HOME/.local/bin:$PATH"; for f in "$@"; do npx --yes pact-cc pack "$f"; done'
  UNPACK_CMD='export PATH="$HOME/.local/bin:$PATH"; for f in "$@"; do npx --yes pact-cc unpack "$f"; done'
  INSPECT_CMD='export PATH="$HOME/.local/bin:$PATH"; for f in "$@"; do npx --yes pact-cc inspect "$f" | open -f; done'

  install_workflow "Pack with PACT" "$PACK_CMD"
  install_workflow "Unpack PACT" "$UNPACK_CMD"
  install_workflow "Inspect PACT" "$INSPECT_CMD"

  /System/Library/CoreServices/pbs -flush 2>/dev/null || true
  echo "  Quick Actions: Pack with PACT / Unpack PACT / Inspect PACT"
fi

# Linux: install Nautilus scripts
if [ "$PLATFORM" = "linux" ]; then
  SCRIPTS_DIR="$HOME/.local/share/nautilus/scripts"
  if [ -d "$(dirname "$SCRIPTS_DIR")" ] || command -v nautilus >/dev/null 2>&1; then
    mkdir -p "$SCRIPTS_DIR"
    cat > "$SCRIPTS_DIR/Pack with PACT" << 'NAUTILUS'
#!/bin/bash
for f in $NAUTILUS_SCRIPT_SELECTED_FILE_PATHS; do
  npx --yes pact-cc pack "$f"
done
notify-send "PACT" "Compression complete"
NAUTILUS
    chmod +x "$SCRIPTS_DIR/Pack with PACT"

    cat > "$SCRIPTS_DIR/Unpack PACT" << 'NAUTILUS'
#!/bin/bash
for f in $NAUTILUS_SCRIPT_SELECTED_FILE_PATHS; do
  npx --yes pact-cc unpack "$f"
done
notify-send "PACT" "Decompression complete"
NAUTILUS
    chmod +x "$SCRIPTS_DIR/Unpack PACT"
    echo "  Nautilus scripts installed (right-click > Scripts)"
  fi
fi

# Windows: create context menu registry entries
if [ "$PLATFORM" = "windows" ]; then
  echo ""
  echo "  Windows detected. Creating registry file..."
  PACT_PATH=$(cygpath -w "$INSTALL_DIR/pact" 2>/dev/null || echo "$INSTALL_DIR/pact")
  cat > "$HOME/Desktop/pact-install.reg" << REGEOF
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\*\\shell\\Pack with PACT]
@="Pack with PACT"

[HKEY_CLASSES_ROOT\\*\\shell\\Pack with PACT\\command]
@="\"$PACT_PATH\" pack \"%1\""

[HKEY_CLASSES_ROOT\\*\\shell\\Unpack PACT]
@="Unpack PACT"

[HKEY_CLASSES_ROOT\\*\\shell\\Unpack PACT\\command]
@="\"$PACT_PATH\" unpack \"%1\""
REGEOF
  echo "  Registry file: ~/Desktop/pact-install.reg"
  echo "  Double-click it to add right-click menu entries."
fi

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║   PACT installed.             ║"
echo "  ╚═══════════════════════════════╝"
echo ""
echo "  pact pack <file|dir>    compress"
echo "  pact unpack <file.pact> decompress"
echo "  pact inspect <file.pact> view contents"
echo ""
echo "  Claude Code auto-compaction: active"
echo "  Right-click integration: $([ "$PLATFORM" = "macos" ] && echo "Finder Quick Actions" || [ "$PLATFORM" = "linux" ] && echo "Nautilus Scripts" || echo "Registry file on Desktop")"
echo ""
