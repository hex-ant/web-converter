import type { MediaFileInfo, MediaKind } from '~/types/media'

export function useMediaProbe() {
  const probe = (file: File): Promise<MediaFileInfo> => new Promise((resolve, reject) => {
    const kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'audio'
    const url = URL.createObjectURL(file)
    const element = document.createElement(kind)
    element.preload = 'metadata'
    element.src = url
    element.onloadedmetadata = () => resolve({
      file,
      kind,
      url,
      duration: Number.isFinite(element.duration) ? element.duration : 0,
      width: kind === 'video' ? (element as HTMLVideoElement).videoWidth : 0,
      height: kind === 'video' ? (element as HTMLVideoElement).videoHeight : 0
    })
    element.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This file could not be read. Try another audio or video file.'))
    }
  })

  return { probe }
}
