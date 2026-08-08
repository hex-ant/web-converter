import type { MediaKind, OutputKind, Resolution } from '~/types/media'

export interface Preset {
  id: string
  title: string
  description: string
  icon: string
  quality: number
  resolution?: string
  audioBitrate?: number
}

export const convertPresets: Record<OutputKind, Preset[]> = {
  video: [
    { id: 'compatible', title: 'Play it anywhere', description: 'A widely supported MP4 with a great balance of quality and size.', icon: 'fluent:play-circle-24-regular', quality: 23 },
    { id: 'share', title: 'Easy to share', description: 'A smaller 720p file that sends quickly and still looks crisp.', icon: 'fluent:share-24-regular', quality: 27, resolution: '1280:-2' },
    { id: 'keep-quality', title: 'Keep the detail', description: 'Preserve the original resolution with minimal visible change.', icon: 'fluent:sparkle-24-regular', quality: 18 }
  ],
  audio: [
    { id: 'listen-anywhere', title: 'Listen anywhere', description: 'A standard MP3 that works on virtually every device.', icon: 'fluent:headphones-24-regular', quality: 0, audioBitrate: 192 },
    { id: 'small-audio', title: 'Make it lightweight', description: 'A compact MP3, ideal for speech, notes and quick sharing.', icon: 'fluent:arrow-download-24-regular', quality: 0, audioBitrate: 96 },
    { id: 'best-audio', title: 'Keep the sound rich', description: 'Higher quality audio for music and detailed recordings.', icon: 'fluent:music-note-2-24-regular', quality: 0, audioBitrate: 320 }
  ]
}

export const compressPresets: Preset[] = [
  { id: 'gentle', title: 'Save a little space', description: 'Smaller with almost no visible or audible difference.', icon: 'fluent:leaf-one-24-regular', quality: 22, audioBitrate: 192 },
  { id: 'balanced', title: 'Make sharing easier', description: 'Noticeably smaller while keeping everyday quality.', icon: 'fluent:send-24-regular', quality: 28, resolution: '1280:-2', audioBitrate: 128 },
  { id: 'smallest', title: 'Make it as small as possible', description: 'Prioritizes file size for slow connections and storage.', icon: 'fluent:archive-24-regular', quality: 34, resolution: '854:-2', audioBitrate: 64 }
]

export const resolutions: Resolution[] = [
  { label: 'Square', width: 1080, height: 1080 },
  { label: 'Landscape', width: 1920, height: 1080 },
  { label: 'Portrait', width: 1080, height: 1920 },
  { label: 'Story', width: 1080, height: 1920 },
  { label: 'Classic', width: 1280, height: 960 }
]

export const formatsFor = (source: MediaKind, target: OutputKind) => {
  if (target === 'audio') return ['mp3', 'm4a', 'wav', 'ogg']
  if (source === 'audio') return ['mp4', 'webm']
  return ['mp4', 'webm', 'mov']
}
