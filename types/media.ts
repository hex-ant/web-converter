export type MediaKind = 'video' | 'audio'
export type ToolMode = 'convert' | 'compress'
export type OutputKind = 'video' | 'audio'
export type BackdropMode = 'color' | 'image'

export interface MediaFileInfo {
  file: File
  kind: MediaKind
  url: string
  duration: number
  width: number
  height: number
}

export interface ProcessSettings {
  tool: ToolMode
  outputKind: OutputKind
  presetId: string
  format: string
  videoCodec: string
  audioCodec: string
  resolution: string
  frameRate: number
  quality: number
  audioBitrate: number
  backdropMode: BackdropMode
  backdropColor: string
  backdropImage: File | null
  backdropImageUrl: string
  outputWidth: number
  outputHeight: number
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

export interface ProcessResult {
  blob: Blob
  url: string
  fileName: string
  size: number
}
