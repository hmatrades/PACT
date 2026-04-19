export { compress, decompress } from './compress.js'
export { install, uninstall, status } from './install.js'

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
