import { readFileSync, writeFileSync, statSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { deflateSync, inflateSync, brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib'
import { basename, join, dirname, extname } from 'node:path'

const MAGIC = Buffer.from('PACT')
const VERSION = 0x03

const MODE_ZLIB = 0x01
const MODE_SEMANTIC = 0x02
const MODE_ARCHIVE = 0x03

const BROTLI_OPTS = { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }
const BROTLI_FAST = { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }

export type PackResult = {
  inputPath: string
  outputPath: string
  originalSize: number
  packedSize: number
  ratio: number
  mode: 'zlib' | 'semantic' | 'archive'
  entries?: number
}

export type UnpackResult = {
  inputPath: string
  outputPath: string
  originalSize: number
  packedSize: number
  mode: 'zlib' | 'semantic' | 'archive'
}

export type PackInfo = {
  version: number
  mode: 'zlib' | 'semantic' | 'archive'
  filename: string
  originalSize: number
  compressedSize: number
  ratio: number
  summary?: string
  entries?: PackInfo[]
}

function modeName(m: number): 'zlib' | 'semantic' | 'archive' {
  if (m === MODE_SEMANTIC) return 'semantic'
  if (m === MODE_ARCHIVE) return 'archive'
  return 'zlib'
}

function isTextContent(buf: Buffer): boolean {
  const check = buf.subarray(0, Math.min(buf.length, 8192))
  for (let i = 0; i < check.length; i++) {
    if (check[i] === 0) return false
  }
  return true
}

function extractSummary(content: string, filename: string): string {
  const ext = extname(filename).toLowerCase()
  const lines = content.split('\n')

  const parts: string[] = []
  parts.push(`file: '${basename(filename)}'`)
  parts.push(`type: '${ext || 'text'}'`)
  parts.push(`lines: ${lines.length}`)
  parts.push(`chars: ${content.length}`)

  const imports = lines.filter(l => /^\s*(import |from |require\(|#include|using )/.test(l))
  if (imports.length > 0) {
    const deps = imports.slice(0, 20).map(l => l.trim().replace(/;$/, ''))
    parts.push(`imports: [${deps.map(d => `'${d.replace(/'/g, "\\'").substring(0, 80)}'`).join(' ')}]`)
  }

  const fnPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(|=>)|def\s+(\w+)|fn\s+(\w+)|func\s+(\w+)|pub\s+fn\s+(\w+))/g
  const fns: string[] = []
  let match
  while ((match = fnPattern.exec(content)) !== null) {
    const name = match[1] || match[2] || match[3] || match[4] || match[5] || match[6]
    if (name && !fns.includes(name)) fns.push(name)
  }
  if (fns.length > 0) {
    parts.push(`functions: [${fns.slice(0, 30).map(f => `'${f}'`).join(' ')}]`)
  }

  const classPattern = /(?:class\s+(\w+)|interface\s+(\w+)|struct\s+(\w+)|enum\s+(\w+)|type\s+(\w+)\s*=)/g
  const types: string[] = []
  while ((match = classPattern.exec(content)) !== null) {
    const name = match[1] || match[2] || match[3] || match[4] || match[5]
    if (name && !types.includes(name)) types.push(name)
  }
  if (types.length > 0) {
    parts.push(`types: [${types.slice(0, 20).map(t => `'${t}'`).join(' ')}]`)
  }

  return `pact_summary = {\n ${parts.join('\n ')}\n}`
}

function writeHeader(filename: string, mode: number, originalSize: number, compressedSize: number): Buffer {
  const nameBytes = Buffer.from(filename, 'utf8')
  const prefix = Buffer.alloc(8)
  prefix.writeUInt32BE(0x50414354, 0)
  prefix.writeUInt8(VERSION, 4)
  prefix.writeUInt8(mode, 5)
  prefix.writeUInt16BE(nameBytes.length, 6)
  const suffix = Buffer.alloc(8)
  suffix.writeUInt32BE(originalSize, 0)
  suffix.writeUInt32BE(compressedSize, 4)
  return Buffer.concat([prefix, nameBytes, suffix])
}

function readHeader(buf: Buffer): { mode: number; filename: string; originalSize: number; compressedSize: number; headerSize: number; version: number } {
  if (buf.length < 16) throw new Error('File too small to be a PACT container')
  if (buf.subarray(0, 4).toString() !== 'PACT') throw new Error('Not a PACT file (bad magic)')
  const version = buf.readUInt8(4)
  if (version !== 0x02 && version !== VERSION) throw new Error(`Unsupported PACT version: ${version}`)
  const mode = buf.readUInt8(5)
  const nameLen = buf.readUInt16BE(6)
  const filename = buf.subarray(8, 8 + nameLen).toString('utf8')
  const originalSize = buf.readUInt32BE(8 + nameLen)
  const compressedSize = buf.readUInt32BE(12 + nameLen)
  return { mode, filename, originalSize, compressedSize, headerSize: 16 + nameLen, version }
}

function compressBuf(raw: Buffer, version: number): Buffer {
  if (version >= 0x03) return brotliCompressSync(raw, BROTLI_OPTS)
  return deflateSync(raw, { level: 9 })
}

function decompressBuf(compressed: Buffer, version: number): Buffer {
  if (version >= 0x03) return brotliDecompressSync(compressed)
  return inflateSync(compressed)
}

function availablePath(desired: string): string {
  if (!existsSync(desired)) return desired
  const ext = extname(desired)
  const base = desired.slice(0, desired.length - ext.length)
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base} (${i})${ext}`
    if (!existsSync(candidate)) return candidate
  }
  return `${base} (unpacked)${ext}`
}

function collectFiles(dirPath: string, base: string = ''): string[] {
  const entries: string[] = []
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      entries.push(...collectFiles(join(dirPath, entry.name), rel))
    } else if (entry.isFile()) {
      entries.push(rel)
    }
  }
  return entries
}

export async function pack(inputPath: string, outputPath?: string): Promise<PackResult> {
  const stat = statSync(inputPath)

  if (stat.isFile()) {
    const raw = readFileSync(inputPath)
    const filename = basename(inputPath)
    const isText = isTextContent(raw)
    let mode: number
    let payload: Buffer

    if (isText) {
      mode = MODE_SEMANTIC
      const summary = extractSummary(raw.toString('utf8'), filename)
      const summaryBuf = Buffer.from(summary, 'utf8')
      const compressed = brotliCompressSync(raw, BROTLI_OPTS)
      const summaryLen = Buffer.alloc(4)
      summaryLen.writeUInt32BE(summaryBuf.length, 0)
      payload = Buffer.concat([summaryLen, summaryBuf, compressed])
    } else {
      mode = MODE_ZLIB
      payload = brotliCompressSync(raw, BROTLI_OPTS)
    }

    const header = writeHeader(filename, mode, raw.length, payload.length)
    const out = outputPath ?? `${inputPath}.pact`
    writeFileSync(out, Buffer.concat([header, payload]))
    const packedSize = header.length + payload.length
    return {
      inputPath, outputPath: out, originalSize: raw.length, packedSize,
      ratio: packedSize > 0 ? raw.length / packedSize : 0,
      mode: modeName(mode),
    }
  }

  if (stat.isDirectory()) {
    const dirName = basename(inputPath)
    const files = collectFiles(inputPath)
    const fileData: Array<{ rel: string; raw: Buffer; isText: boolean; summary?: string }> = []
    let totalOriginal = 0

    for (const rel of files) {
      const raw = readFileSync(join(inputPath, rel))
      const isText = isTextContent(raw)
      const summary = isText ? extractSummary(raw.toString('utf8'), rel) : undefined
      fileData.push({ rel, raw, isText, summary })
      totalOriginal += raw.length
    }

    // Sort by extension so similar files are adjacent in the solid stream
    fileData.sort((a, b) => extname(a.rel).localeCompare(extname(b.rel)))

    // Build manifest (filenames, sizes, modes, summaries) — stored uncompressed for inspect
    const manifest: Buffer[] = []
    const manifestCountBuf = Buffer.alloc(4)
    manifestCountBuf.writeUInt32BE(fileData.length, 0)
    manifest.push(manifestCountBuf)

    for (const f of fileData) {
      const nameBytes = Buffer.from(f.rel, 'utf8')
      const entryHead = Buffer.alloc(2 + 1 + 4)
      entryHead.writeUInt16BE(nameBytes.length, 0)
      entryHead.writeUInt8(f.isText ? MODE_SEMANTIC : MODE_ZLIB, 2)
      entryHead.writeUInt32BE(f.raw.length, 3)
      manifest.push(entryHead, nameBytes)

      if (f.summary) {
        const sBuf = Buffer.from(f.summary, 'utf8')
        const sLen = Buffer.alloc(4)
        sLen.writeUInt32BE(sBuf.length, 0)
        manifest.push(sLen, sBuf)
      } else {
        const sLen = Buffer.alloc(4)
        sLen.writeUInt32BE(0, 0)
        manifest.push(sLen)
      }
    }

    const manifestBuf = Buffer.concat(manifest)

    // Solid stream: concatenate ALL raw file contents, brotli compress as one block
    const solidRaw = Buffer.concat(fileData.map(f => f.raw))
    const solidCompressed = brotliCompressSync(solidRaw, BROTLI_OPTS)

    // Archive payload: [manifest_size(4)] [manifest] [solid_compressed]
    const manifestSizeBuf = Buffer.alloc(4)
    manifestSizeBuf.writeUInt32BE(manifestBuf.length, 0)
    const archivePayload = Buffer.concat([manifestSizeBuf, manifestBuf, solidCompressed])

    const archiveHeader = writeHeader(dirName, MODE_ARCHIVE, totalOriginal, archivePayload.length)
    const out = outputPath ?? `${inputPath}.pact`
    const finalBuf = Buffer.concat([archiveHeader, archivePayload])
    writeFileSync(out, finalBuf)

    return {
      inputPath, outputPath: out, originalSize: totalOriginal,
      packedSize: finalBuf.length,
      ratio: finalBuf.length > 0 ? totalOriginal / finalBuf.length : 0,
      mode: 'archive', entries: files.length,
    }
  }

  throw new Error(`Unsupported file type: ${inputPath}`)
}

export async function unpack(inputPath: string, outputPath?: string): Promise<UnpackResult> {
  const buf = readFileSync(inputPath)
  const hdr = readHeader(buf)
  const payload = buf.subarray(hdr.headerSize, hdr.headerSize + hdr.compressedSize)

  if (hdr.mode === MODE_ZLIB) {
    const decompressed = decompressBuf(payload, hdr.version)
    const out = outputPath ?? availablePath(join(dirname(inputPath), hdr.filename))
    writeFileSync(out, decompressed)
    return { inputPath, outputPath: out, originalSize: hdr.originalSize, packedSize: buf.length, mode: 'zlib' }
  }

  if (hdr.mode === MODE_SEMANTIC) {
    const summaryLen = payload.readUInt32BE(0)
    const compressed = payload.subarray(4 + summaryLen)
    const decompressed = decompressBuf(compressed, hdr.version)
    const out = outputPath ?? availablePath(join(dirname(inputPath), hdr.filename))
    writeFileSync(out, decompressed)
    return { inputPath, outputPath: out, originalSize: hdr.originalSize, packedSize: buf.length, mode: 'semantic' }
  }

  if (hdr.mode === MODE_ARCHIVE) {
    const outDir = outputPath ?? availablePath(join(dirname(inputPath), hdr.filename))

    if (hdr.version >= 0x03) {
      // v3 solid archive
      const manifestSize = payload.readUInt32BE(0)
      const manifestBuf = payload.subarray(4, 4 + manifestSize)
      const solidCompressed = payload.subarray(4 + manifestSize)

      // Parse manifest
      const entryCount = manifestBuf.readUInt32BE(0)
      const entries: Array<{ filename: string; mode: number; originalSize: number }> = []
      let mOff = 4
      for (let i = 0; i < entryCount; i++) {
        const nameLen = manifestBuf.readUInt16BE(mOff)
        const mode = manifestBuf.readUInt8(mOff + 2)
        const origSize = manifestBuf.readUInt32BE(mOff + 3)
        const filename = manifestBuf.subarray(mOff + 7, mOff + 7 + nameLen).toString('utf8')
        mOff += 7 + nameLen
        const summaryLen = manifestBuf.readUInt32BE(mOff)
        mOff += 4 + summaryLen
        entries.push({ filename, mode, originalSize: origSize })
      }

      // Decompress solid block
      const solidRaw = brotliDecompressSync(solidCompressed)

      // Split by original sizes
      let sOff = 0
      for (const entry of entries) {
        const fileData = solidRaw.subarray(sOff, sOff + entry.originalSize)
        sOff += entry.originalSize
        const entryOut = join(outDir, entry.filename)
        mkdirSync(dirname(entryOut), { recursive: true })
        writeFileSync(entryOut, fileData)
      }
    } else {
      // v2 per-file archive (backward compat)
      const entryCount = payload.readUInt32BE(0)
      let offset = 4
      for (let i = 0; i < entryCount; i++) {
        const entryBuf = payload.subarray(offset)
        const entry = readHeader(entryBuf)
        const entryPayload = entryBuf.subarray(entry.headerSize, entry.headerSize + entry.compressedSize)
        offset += entry.headerSize + entry.compressedSize
        let decompressed: Buffer
        if (entry.mode === MODE_SEMANTIC) {
          const sLen = entryPayload.readUInt32BE(0)
          decompressed = decompressBuf(entryPayload.subarray(4 + sLen), entry.version)
        } else {
          decompressed = decompressBuf(entryPayload, entry.version)
        }
        const entryOut = join(outDir, entry.filename)
        mkdirSync(dirname(entryOut), { recursive: true })
        writeFileSync(entryOut, decompressed)
      }
    }

    return { inputPath, outputPath: outDir, originalSize: hdr.originalSize, packedSize: buf.length, mode: 'archive' }
  }

  throw new Error(`Unknown PACT mode: ${hdr.mode}`)
}

export function inspectPack(inputPath: string): PackInfo {
  const buf = readFileSync(inputPath)
  return inspectBuffer(buf)
}

function inspectBuffer(buf: Buffer): PackInfo {
  const hdr = readHeader(buf)
  const payload = buf.subarray(hdr.headerSize, hdr.headerSize + hdr.compressedSize)
  const ratio = (hdr.headerSize + hdr.compressedSize) > 0 ? hdr.originalSize / (hdr.headerSize + hdr.compressedSize) : 0

  if (hdr.mode === MODE_SEMANTIC) {
    const summaryLen = payload.readUInt32BE(0)
    const summary = payload.subarray(4, 4 + summaryLen).toString('utf8')
    return { version: hdr.version, mode: 'semantic', filename: hdr.filename, originalSize: hdr.originalSize, compressedSize: hdr.compressedSize, ratio, summary }
  }

  if (hdr.mode === MODE_ARCHIVE && hdr.version >= 0x03) {
    // v3 solid archive — read manifest for inspect (no decompression needed)
    const manifestSize = payload.readUInt32BE(0)
    const manifestBuf = payload.subarray(4, 4 + manifestSize)
    const solidSize = payload.length - 4 - manifestSize

    const entryCount = manifestBuf.readUInt32BE(0)
    const entries: PackInfo[] = []
    let mOff = 4
    for (let i = 0; i < entryCount; i++) {
      const nameLen = manifestBuf.readUInt16BE(mOff)
      const mode = manifestBuf.readUInt8(mOff + 2)
      const origSize = manifestBuf.readUInt32BE(mOff + 3)
      const filename = manifestBuf.subarray(mOff + 7, mOff + 7 + nameLen).toString('utf8')
      mOff += 7 + nameLen
      const summaryLen = manifestBuf.readUInt32BE(mOff)
      let summary: string | undefined
      if (summaryLen > 0) {
        summary = manifestBuf.subarray(mOff + 4, mOff + 4 + summaryLen).toString('utf8')
      }
      mOff += 4 + summaryLen
      entries.push({
        version: hdr.version, mode: modeName(mode), filename,
        originalSize: origSize, compressedSize: 0, ratio: 0, summary,
      })
    }

    // Per-file compressed sizes aren't meaningful in solid mode — show the solid total
    return {
      version: hdr.version, mode: 'archive', filename: hdr.filename,
      originalSize: hdr.originalSize, compressedSize: solidSize, ratio, entries,
    }
  }

  if (hdr.mode === MODE_ARCHIVE) {
    // v2 per-file archive
    const entryCount = payload.readUInt32BE(0)
    const entries: PackInfo[] = []
    let offset = 4
    for (let i = 0; i < entryCount; i++) {
      const entryBuf = payload.subarray(offset)
      const entry = readHeader(entryBuf)
      const entryPayload = entryBuf.subarray(entry.headerSize, entry.headerSize + entry.compressedSize)
      offset += entry.headerSize + entry.compressedSize
      let summary: string | undefined
      if (entry.mode === MODE_SEMANTIC) {
        const sLen = entryPayload.readUInt32BE(0)
        summary = entryPayload.subarray(4, 4 + sLen).toString('utf8')
      }
      const eRatio = (entry.headerSize + entry.compressedSize) > 0 ? entry.originalSize / (entry.headerSize + entry.compressedSize) : 0
      entries.push({
        version: entry.version, mode: modeName(entry.mode), filename: entry.filename,
        originalSize: entry.originalSize, compressedSize: entry.compressedSize, ratio: eRatio, summary,
      })
    }
    return { version: hdr.version, mode: 'archive', filename: hdr.filename, originalSize: hdr.originalSize, compressedSize: hdr.compressedSize, ratio, entries }
  }

  return { version: hdr.version, mode: 'zlib', filename: hdr.filename, originalSize: hdr.originalSize, compressedSize: hdr.compressedSize, ratio }
}
