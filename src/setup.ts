import { writeFileSync, mkdirSync, existsSync, readFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
import { execFileSync } from 'node:child_process'
import { installCompaction } from './compaction.js'

function log(msg: string) { console.log(`  ${msg}`) }

function getPactCommand(): string {
  const which = platform() === 'win32' ? 'where' : 'which'
  try {
    execFileSync(which, ['pact-cc'], { stdio: 'pipe' })
    return 'pact-cc'
  } catch {
    return 'npx --yes pact-cc'
  }
}

function hasPACTProgress(): boolean {
  return existsSync(join(homedir(), '.local', 'bin', 'PACTProgress'))
}

function setupMacOS() {
  log('Platform: macOS')
  log('')

  const servicesDir = join(homedir(), 'Library', 'Services')
  const pact = getPactCommand()
  const useNative = hasPACTProgress()

  if (useNative) {
    log('Native progress UI: detected')
  } else {
    log('Native progress UI: not found (using notifications)')
    log('To get the animated window: copy PACTProgress to ~/.local/bin/')
  }
  log('')

  const packCmd = useNative
    ? `for f in "$@"; do\n  "$HOME/.local/bin/PACTProgress" pack "$f"\ndone`
    : `export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"\nfor f in "$@"; do\n  ${pact} pack "$f"\ndone\nosascript -e 'display notification "Packed" with title "PACT"'`

  const unpackCmd = useNative
    ? `for f in "$@"; do\n  "$HOME/.local/bin/PACTProgress" unpack "$f"\ndone`
    : `export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"\nfor f in "$@"; do\n  ${pact} unpack "$f"\ndone\nosascript -e 'display notification "Unpacked" with title "PACT"'`

  const inspectCmd = `export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"\nfor f in "$@"; do\n  ${pact} inspect "$f" | open -f\ndone`

  const workflows: Array<{ name: string; cmd: string }> = [
    { name: 'Pack with PACT', cmd: packCmd },
    { name: 'Unpack PACT', cmd: unpackCmd },
    { name: 'Inspect PACT', cmd: inspectCmd },
  ]

  for (const wf of workflows) {
    const dir = join(servicesDir, `${wf.name}.workflow`, 'Contents')
    mkdirSync(dir, { recursive: true })

    writeFileSync(join(dir, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSServices</key><array><dict>
    <key>NSMenuItem</key><dict><key>default</key><string>${wf.name}</string></dict>
    <key>NSMessage</key><string>runWorkflowAsService</string>
    <key>NSSendFileTypes</key><array><string>public.item</string></array>
  </dict></array>
</dict>
</plist>`)

    writeFileSync(join(dir, 'document.wflow'), `<?xml version="1.0" encoding="UTF-8"?>
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
      <key>COMMAND_STRING</key><string>${wf.cmd}</string>
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
    <key>location</key><string>449.5:620.0</string>
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
</plist>`)

    log(`Quick Action: ${wf.name}`)
  }

  try {
    execFileSync('/System/Library/CoreServices/pbs', ['-flush'], { stdio: 'pipe' })
  } catch { /* ok */ }

  log('')
  log('Right-click any file > Services > Pack with PACT')
}

function setupWindows() {
  log('Platform: Windows')
  log('')

  const pact = getPactCommand()

  const entries: Array<{ key: string; name: string; cmd: string }> = [
    { key: 'HKCU\\Software\\Classes\\*\\shell\\PACTPack', name: 'Pack with PACT', cmd: `${pact} pack "%1"` },
    { key: 'HKCU\\Software\\Classes\\*\\shell\\PACTUnpack', name: 'Unpack PACT', cmd: `${pact} unpack "%1"` },
    { key: 'HKCU\\Software\\Classes\\*\\shell\\PACTInspect', name: 'Inspect PACT', cmd: `${pact} inspect "%1"` },
    { key: 'HKCU\\Software\\Classes\\Directory\\shell\\PACTPack', name: 'Pack folder with PACT', cmd: `${pact} pack "%1"` },
  ]

  for (const e of entries) {
    try {
      execFileSync('reg', ['add', e.key, '/ve', '/d', e.name, '/f'], { stdio: 'pipe' })
      execFileSync('reg', ['add', `${e.key}\\command`, '/ve', '/d', e.cmd, '/f'], { stdio: 'pipe' })
      log(`Registry: ${e.name}`)
    } catch {
      log(`(skipped: ${e.name} — may need admin)`)
    }
  }

  log('')
  log('Right-click any file > Pack with PACT')
}

function setupLinux() {
  log('Platform: Linux')
  log('')

  const pact = getPactCommand()

  // Nautilus (GNOME / Ubuntu)
  const nautilusDir = join(homedir(), '.local', 'share', 'nautilus', 'scripts')
  mkdirSync(nautilusDir, { recursive: true })

  const nautilusScripts: Array<{ name: string; body: string }> = [
    { name: 'Pack with PACT', body: `#!/bin/bash\nfor f in $NAUTILUS_SCRIPT_SELECTED_FILE_PATHS; do\n  ${pact} pack "$f"\ndone\nnotify-send "PACT" "Done" 2>/dev/null || true\n` },
    { name: 'Unpack PACT', body: `#!/bin/bash\nfor f in $NAUTILUS_SCRIPT_SELECTED_FILE_PATHS; do\n  ${pact} unpack "$f"\ndone\nnotify-send "PACT" "Done" 2>/dev/null || true\n` },
    { name: 'Inspect PACT', body: `#!/bin/bash\nfor f in $NAUTILUS_SCRIPT_SELECTED_FILE_PATHS; do\n  ${pact} inspect "$f"\ndone\n` },
  ]

  for (const s of nautilusScripts) {
    const p = join(nautilusDir, s.name)
    writeFileSync(p, s.body)
    chmodSync(p, 0o755)
  }
  log('Nautilus scripts: right-click > Scripts > Pack with PACT')

  // Dolphin (KDE)
  const dolphinDir = join(homedir(), '.local', 'share', 'kio', 'servicemenus')
  mkdirSync(dolphinDir, { recursive: true })
  writeFileSync(join(dolphinDir, 'pact.desktop'),
`[Desktop Entry]
Type=Service
MimeType=all/all;
Actions=pack;unpack;inspect

[Desktop Action pack]
Name=Pack with PACT
Exec=${pact} pack %f

[Desktop Action unpack]
Name=Unpack PACT
Exec=${pact} unpack %f

[Desktop Action inspect]
Name=Inspect PACT
Exec=${pact} inspect %f
`)
  log('Dolphin service menu: right-click > Pack with PACT')

  // Nemo (Cinnamon / Mint)
  const nemoDir = join(homedir(), '.local', 'share', 'nemo', 'scripts')
  mkdirSync(nemoDir, { recursive: true })
  for (const s of nautilusScripts) {
    const body = s.body.replace('NAUTILUS_SCRIPT_SELECTED_FILE_PATHS', 'NEMO_SCRIPT_SELECTED_FILE_PATHS')
    const p = join(nemoDir, s.name)
    writeFileSync(p, body)
    chmodSync(p, 0o755)
  }
  log('Nemo scripts installed')

  // Thunar (XFCE)
  const thunarDir = join(homedir(), '.config', 'Thunar')
  mkdirSync(thunarDir, { recursive: true })
  const ucaPath = join(thunarDir, 'uca.xml')
  const thunarEntry = `<action>
  <name>Pack with PACT</name>
  <command>${pact} pack %f</command>
  <patterns>*</patterns>
  <directories/><audio-files/><image-files/><other-files/><text-files/><video-files/>
</action>
<action>
  <name>Unpack PACT</name>
  <command>${pact} unpack %f</command>
  <patterns>*.pact</patterns>
  <other-files/>
</action>`

  if (existsSync(ucaPath)) {
    const existing = readFileSync(ucaPath, 'utf8')
    if (!existing.includes('Pack with PACT')) {
      writeFileSync(ucaPath, existing.replace('</actions>', `${thunarEntry}\n</actions>`))
      log('Thunar custom actions updated')
    }
  } else {
    writeFileSync(ucaPath, `<?xml version="1.0" encoding="UTF-8"?>\n<actions>\n${thunarEntry}\n</actions>\n`)
    log('Thunar custom actions created')
  }

  log('')
  log('Covers: Nautilus, Dolphin, Nemo, Thunar')
}

export async function runSetup() {
  console.log('')
  console.log('  ╔═══════════════════════════════════╗')
  console.log('  ║   PACT setup                      ║')
  console.log('  ║   ZIP\'s bigger brother.            ║')
  console.log('  ╚═══════════════════════════════════╝')
  console.log('')

  const os = platform()

  log('--- Right-click integration ---')
  log('')
  if (os === 'darwin') setupMacOS()
  else if (os === 'win32') setupWindows()
  else setupLinux()

  log('')
  log('--- Claude Code compaction ---')
  log('')
  try {
    installCompaction()
    log('Global compaction hook installed.')
    log('Every Claude Code session auto-compresses at 50%.')
    log('Zero API calls. Lossless.')
  } catch {
    log('(skipped — Claude Code not detected)')
  }

  console.log('')
  console.log('  ╔═══════════════════════════════════╗')
  console.log('  ║   Done.                           ║')
  console.log('  ╚═══════════════════════════════════╝')
  console.log('')
  console.log('  pact pack <file|dir>    compress')
  console.log('  pact unpack <file.pact> decompress')
  console.log('  pact inspect <file.pact> view contents')
  console.log('')
}
