export { compress, decompress } from './compress.js'
export { install, uninstall, status } from './install.js'
export { pack, unpack, inspectPack } from './pack.js'
export type { PackResult, UnpackResult, PackInfo } from './pack.js'

export type CompressResult = {
  pact: string
  ratio: number
  tokens: { before: number; after: number }
}

export type StatusResult = {
  installed: boolean
  threshold: number
  model: string
  sessionsCompressed: number
  avgRatio: number
  tokensSaved: number
}
