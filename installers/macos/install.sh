#!/bin/bash
set -e

echo "PACT Installer — macOS"
echo "======================"
echo ""

ARCH=$(uname -m)
INSTALL_DIR="$HOME/.local/bin"
SERVICES_DIR="$HOME/Library/Services"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$INSTALL_DIR"

if [ -f "$SCRIPT_DIR/../../release/pact" ]; then
  BINARY="$SCRIPT_DIR/../../release/pact"
elif [ -f "$SCRIPT_DIR/pact" ]; then
  BINARY="$SCRIPT_DIR/pact"
else
  echo "Error: pact binary not found. Run 'npm run build && npm run build:binary' first."
  exit 1
fi

echo "Installing pact binary to $INSTALL_DIR/pact..."
cp "$BINARY" "$INSTALL_DIR/pact"
chmod +x "$INSTALL_DIR/pact"

if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  SHELL_RC="$HOME/.zshrc"
  [ -f "$HOME/.bashrc" ] && [ ! -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.bashrc"
  if ! grep -q '.local/bin' "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
    echo "Added $INSTALL_DIR to PATH in $SHELL_RC"
  fi
fi

echo "Installing Finder Quick Actions..."

install_workflow() {
  local NAME="$1"
  local COMMAND="$2"
  local DIR="$SERVICES_DIR/$NAME.workflow/Contents"

  mkdir -p "$DIR"

  cat > "$DIR/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSServices</key>
  <array>
    <dict>
      <key>NSMenuItem</key>
      <dict>
        <key>default</key>
PLIST
  echo "        <string>$NAME</string>" >> "$DIR/Info.plist"
  cat >> "$DIR/Info.plist" << 'PLIST'
      </dict>
      <key>NSMessage</key>
      <string>runWorkflowAsService</string>
      <key>NSSendFileTypes</key>
      <array>
        <string>public.item</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
PLIST

  cat > "$DIR/document.wflow" << WFLOW
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AMApplicationBuild</key><string>521.1</string>
  <key>AMApplicationVersion</key><string>2.10</string>
  <key>AMDocumentVersion</key><string>2</string>
  <key>actions</key>
  <array>
    <dict>
      <key>action</key>
      <dict>
        <key>AMAccepts</key>
        <dict>
          <key>Container</key><string>List</string>
          <key>Optional</key><true/>
          <key>Types</key>
          <array><string>com.apple.cocoa.path</string></array>
        </dict>
        <key>AMActionVersion</key><string>2.0.3</string>
        <key>AMApplication</key><array><string>Finder</string></array>
        <key>AMParameterProperties</key>
        <dict>
          <key>COMMAND_STRING</key><dict/>
          <key>CheckedForUserDefaultShell</key><dict/>
          <key>inputMethod</key><dict/>
          <key>shell</key><dict/>
          <key>source</key><dict/>
        </dict>
        <key>AMProvides</key>
        <dict>
          <key>Container</key><string>List</string>
          <key>Types</key>
          <array><string>com.apple.cocoa.string</string></array>
        </dict>
        <key>ActionBundlePath</key>
        <string>/System/Library/Automator/Run Shell Script.action</string>
        <key>ActionName</key><string>Run Shell Script</string>
        <key>ActionParameters</key>
        <dict>
          <key>COMMAND_STRING</key>
          <string>$COMMAND</string>
          <key>CheckedForUserDefaultShell</key><true/>
          <key>inputMethod</key><integer>0</integer>
          <key>shell</key><string>/bin/bash</string>
          <key>source</key><string></string>
        </dict>
        <key>BundleIdentifier</key>
        <string>com.apple.RunShellScript</string>
        <key>CFBundleVersion</key><string>2.0.3</string>
        <key>CanShowSelectedItemsWhenRun</key><false/>
        <key>CanShowWhenRun</key><true/>
        <key>Category</key><array><string>AMCategoryUtilities</string></array>
        <key>Class Name</key><string>RunShellScriptAction</string>
        <key>InputUUID</key><string>C920E025-94DB-4C25-A5D3-92ABE1C624ED</string>
        <key>Keywords</key><array><string>Shell</string></array>
        <key>OutputUUID</key><string>297588CC-AED5-4730-A67C-5ABA17740B55</string>
        <key>UUID</key><string>BD77F7EE-8774-4E6A-B472-D5176BA2A21D</string>
        <key>UnlocalizedApplications</key><array><string>Finder</string></array>
        <key>arguments</key>
        <dict>
          <key>0</key>
          <dict>
            <key>default value</key><integer>0</integer>
            <key>name</key><string>inputMethod</string>
            <key>required</key><string>0</string>
            <key>type</key><string>0</string>
            <key>uuid</key><string>0</string>
          </dict>
        </dict>
        <key>isViewVisible</key><integer>1</integer>
        <key>location</key><string>309.000000:244.000000</string>
        <key>nibPath</key>
        <string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/English.lproj/main.nib</string>
      </dict>
      <key>isViewVisible</key><integer>1</integer>
    </dict>
  </array>
  <key>connectors</key><dict/>
  <key>workflowMetaData</key>
  <dict>
    <key>workflowType</key><integer>1</integer>
  </dict>
</dict>
</plist>
WFLOW
}

PACK_CMD='export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
for f in "$@"; do
  pact pack "$f" 2>&gt;&amp;1
done
osascript -e '"'"'display notification "PACT compression complete" with title "PACT"'"'"''

UNPACK_CMD='export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
for f in "$@"; do
  pact unpack "$f" 2>&gt;&amp;1
done
osascript -e '"'"'display notification "PACT decompression complete" with title "PACT"'"'"''

INSPECT_CMD='export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
for f in "$@"; do
  pact inspect "$f" 2>&gt;&amp;1 | open -f
done'

install_workflow "Pack with PACT" "$PACK_CMD"
install_workflow "Unpack PACT" "$UNPACK_CMD"
install_workflow "Inspect PACT" "$INSPECT_CMD"

echo ""
echo "Done! Installed:"
echo "  Binary:        $INSTALL_DIR/pact"
echo "  Quick Actions: Pack with PACT / Unpack PACT / Inspect PACT"
echo ""
echo "Right-click any file in Finder → Quick Actions → Pack with PACT"
echo "Right-click a .pact file → Quick Actions → Unpack PACT"
echo ""
echo "CLI usage:"
echo "  pact pack <file|dir>     Compress a file or directory"
echo "  pact unpack <file.pact>  Decompress a .pact file"
echo "  pact inspect <file.pact> View contents without decompressing"
