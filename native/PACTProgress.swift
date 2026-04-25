import Cocoa

class PACTWindow: NSWindow {
    init() {
        let width: CGFloat = 340
        let height: CGFloat = 160
        let screen = NSScreen.main!.frame
        let x = (screen.width - width) / 2
        let y = (screen.height - height) / 2 + 100

        super.init(
            contentRect: NSRect(x: x, y: y, width: width, height: height),
            styleMask: [.titled, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        self.titlebarAppearsTransparent = true
        self.titleVisibility = .hidden
        self.isMovableByWindowBackground = true
        self.level = .floating
        self.backgroundColor = NSColor(white: 0.12, alpha: 0.95)
        self.isOpaque = false
        self.hasShadow = true
    }
}

class ProgressViewController: NSViewController {
    private let titleLabel = NSTextField(labelWithString: "")
    private let fileLabel = NSTextField(labelWithString: "")
    private let statusLabel = NSTextField(labelWithString: "")
    private let progressBar = NSProgressIndicator()
    private let iconView = NSImageView()
    private let action: String
    private let filePath: String

    init(action: String, filePath: String) {
        self.action = action
        self.filePath = filePath
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func loadView() {
        let container = NSView(frame: NSRect(x: 0, y: 0, width: 340, height: 160))

        let icon = NSImage(systemSymbolName: action == "pack" ? "archivebox.fill" : "archivebox",
                          accessibilityDescription: nil)
        iconView.image = icon
        iconView.contentTintColor = NSColor(red: 0.4, green: 0.8, blue: 1.0, alpha: 1.0)
        iconView.frame = NSRect(x: 24, y: 90, width: 36, height: 36)
        iconView.imageScaling = .scaleProportionallyUpOrDown
        container.addSubview(iconView)

        titleLabel.stringValue = action == "pack" ? "PACT" : "PACT"
        titleLabel.font = NSFont.systemFont(ofSize: 18, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.frame = NSRect(x: 72, y: 108, width: 240, height: 24)
        titleLabel.isBezeled = false
        titleLabel.drawsBackground = false
        titleLabel.isEditable = false
        container.addSubview(titleLabel)

        let fileName = (filePath as NSString).lastPathComponent
        fileLabel.stringValue = fileName
        fileLabel.font = NSFont.systemFont(ofSize: 12, weight: .regular)
        fileLabel.textColor = NSColor(white: 0.7, alpha: 1.0)
        fileLabel.frame = NSRect(x: 72, y: 90, width: 240, height: 16)
        fileLabel.isBezeled = false
        fileLabel.drawsBackground = false
        fileLabel.isEditable = false
        fileLabel.lineBreakMode = .byTruncatingMiddle
        container.addSubview(fileLabel)

        progressBar.frame = NSRect(x: 24, y: 58, width: 292, height: 6)
        progressBar.style = .bar
        progressBar.isIndeterminate = true
        progressBar.appearance = NSAppearance(named: .vibrantDark)
        container.addSubview(progressBar)

        statusLabel.stringValue = action == "pack" ? "Compressing..." : "Decompressing..."
        statusLabel.font = NSFont.systemFont(ofSize: 11, weight: .medium)
        statusLabel.textColor = NSColor(white: 0.5, alpha: 1.0)
        statusLabel.frame = NSRect(x: 24, y: 28, width: 292, height: 16)
        statusLabel.isBezeled = false
        statusLabel.drawsBackground = false
        statusLabel.isEditable = false
        container.addSubview(statusLabel)

        self.view = container
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        progressBar.startAnimation(nil)
        runPACT()
    }

    private func runPACT() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }

            let process = Process()
            let pipe = Pipe()

            let pactPath = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent(".local/bin/pact").path

            process.executableURL = URL(fileURLWithPath: pactPath)
            process.arguments = [self.action, self.filePath]
            process.standardOutput = pipe
            process.standardError = pipe

            do {
                try process.run()
                process.waitUntilExit()

                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                let output = String(data: data, encoding: .utf8) ?? ""

                DispatchQueue.main.async {
                    self.showResult(output: output, success: process.terminationStatus == 0)
                }
            } catch {
                DispatchQueue.main.async {
                    self.showResult(output: "Error: \(error.localizedDescription)", success: false)
                }
            }
        }
    }

    private func showResult(output: String, success: Bool) {
        progressBar.stopAnimation(nil)
        progressBar.isIndeterminate = false
        progressBar.doubleValue = 100

        if success {
            iconView.contentTintColor = NSColor(red: 0.3, green: 0.9, blue: 0.5, alpha: 1.0)
            iconView.image = NSImage(systemSymbolName: "checkmark.circle.fill",
                                    accessibilityDescription: nil)

            let lines = output.components(separatedBy: "\n").map { $0.trimmingCharacters(in: .whitespaces) }
            let packed = lines.first(where: { $0.hasPrefix("PACKED") || $0.hasPrefix("RESTORED") }) ?? ""
            let saved = lines.first(where: { $0.hasPrefix("SAVED") }) ?? ""
            let outLine = lines.first(where: { $0.hasPrefix("OUT") }) ?? ""

            if !packed.isEmpty {
                titleLabel.stringValue = packed
                titleLabel.font = NSFont.systemFont(ofSize: 13, weight: .bold)
            }

            if !saved.isEmpty {
                statusLabel.stringValue = saved
                statusLabel.textColor = NSColor(red: 0.3, green: 0.9, blue: 0.5, alpha: 1.0)
            } else if !outLine.isEmpty {
                statusLabel.stringValue = outLine
                statusLabel.textColor = NSColor(white: 0.7, alpha: 1.0)
            } else {
                statusLabel.stringValue = "Done"
                statusLabel.textColor = NSColor(red: 0.3, green: 0.9, blue: 0.5, alpha: 1.0)
            }
        } else {
            iconView.contentTintColor = NSColor(red: 1.0, green: 0.3, blue: 0.3, alpha: 1.0)
            iconView.image = NSImage(systemSymbolName: "xmark.circle.fill",
                                    accessibilityDescription: nil)
            statusLabel.stringValue = "Compression failed"
            statusLabel.textColor = NSColor(red: 1.0, green: 0.3, blue: 0.3, alpha: 1.0)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            NSApp.terminate(nil)
        }
    }
}

// --- Main ---

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("Usage: PACTProgress <pack|unpack|inspect> <file>")
    exit(1)
}

let action = args[1]
let filePath = args[2]

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let window = PACTWindow()
let vc = ProgressViewController(action: action, filePath: filePath)
window.contentViewController = vc
window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)

app.run()
