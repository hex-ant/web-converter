import type { MediaKind, OutputKind, ProcessSettings, Workflow } from '~/types/media'

type PresetValues = Pick<ProcessSettings, 'format' | 'videoCodec' | 'audioCodec' | 'resolution' | 'frameRate' | 'quality' | 'audioBitrate'>

export interface Preset {
  id: string
  title: string
  description: string
  icon: string
  summary: string[]
  values: Partial<PresetValues>
}

export interface WorkflowOption {
  id: Workflow
  title: string
  description: string
  icon: string
  tool: 'convert' | 'compress'
  outputKind: OutputKind
}

export const workflowsFor: Record<MediaKind, WorkflowOption[]> = {
  video: [
    { id: 'video-compress', title: 'Compress the video', description: 'Reduce its file size while keeping it as a video. You decide how much quality or resolution to preserve.', icon: 'fluent:arrow-minimize-24-regular', tool: 'compress', outputKind: 'video' },
    { id: 'video-convert', title: 'Convert the video', description: 'Change the video format for another app or device, with the option to preserve the original quality.', icon: 'fluent:video-switch-24-regular', tool: 'convert', outputKind: 'video' },
    { id: 'video-audio', title: 'Extract the audio', description: 'Keep only the sound from this video.', icon: 'fluent:music-note-2-24-regular', tool: 'convert', outputKind: 'audio' }
  ],
  audio: [
    { id: 'audio-compress', title: 'Compress the audio', description: 'Reduce its file size while keeping it as audio. You decide how much sound quality to preserve.', icon: 'fluent:arrow-minimize-24-regular', tool: 'compress', outputKind: 'audio' },
    { id: 'audio-convert', title: 'Convert the audio', description: 'Change the audio format for another app or device, with the option to preserve the original quality.', icon: 'fluent:arrow-repeat-all-24-regular', tool: 'convert', outputKind: 'audio' },
    { id: 'audio-video', title: 'Create a video from audio', description: 'Add an animated audio wave, a color or a cover image to make a shareable video.', icon: 'fluent:video-add-24-regular', tool: 'convert', outputKind: 'video' }
  ]
}

export const workflowPresets: Record<Workflow, Preset[]> = {
  'video-compress': [
    { id: 'gentle', title: 'Keep it looking the same', description: 'A modest size reduction with very little visible change.', icon: 'fluent:leaf-one-24-regular', summary: ['Original size', 'High quality', '192 kbps audio'], values: { format: 'mp4', videoCodec: 'libx264', quality: 22, resolution: 'original', frameRate: 0, audioCodec: 'aac', audioBitrate: 192 } },
    { id: 'balanced', title: 'Make sharing easier', description: 'A useful size reduction while keeping a clear, detailed picture.', icon: 'fluent:send-24-regular', summary: ['Up to 1080p', 'Up to 30 fps', '192 kbps audio'], values: { format: 'mp4', videoCodec: 'libx264', quality: 24, resolution: '1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2', frameRate: 30, audioCodec: 'aac', audioBitrate: 192 } },
    { id: 'smallest', title: 'Save the most space', description: 'A stronger reduction for storage and slower connections, with visible quality loss.', icon: 'fluent:archive-24-regular', summary: ['Up to 720p', 'Smallest file', '128 kbps audio'], values: { format: 'mp4', videoCodec: 'libx264', quality: 28, resolution: '1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2', frameRate: 30, audioCodec: 'aac', audioBitrate: 128 } }
  ],
  'video-convert': [
    { id: 'match-video', title: 'Match the original', description: 'Change format while preserving the original size and detail as closely as possible.', icon: 'fluent:sparkle-24-regular', summary: ['Original size', 'Maximum quality', '256 kbps audio'], values: { format: 'mp4', videoCodec: 'libx264', quality: 16, resolution: 'original', frameRate: 0, audioCodec: 'aac', audioBitrate: 256 } },
    { id: 'compatible-video', title: 'Play it anywhere', description: 'A highly compatible MP4 with minimal visible change.', icon: 'fluent:play-circle-24-regular', summary: ['Original size', 'High quality', 'MP4'], values: { format: 'mp4', videoCodec: 'libx264', quality: 20, resolution: 'original', frameRate: 0, audioCodec: 'aac', audioBitrate: 192 } },
    { id: 'convert-smaller', title: 'Convert and make it smaller', description: 'Change format and reduce the size while keeping a clear, detailed picture.', icon: 'fluent:arrow-download-24-regular', summary: ['Up to 1080p', 'Up to 30 fps', '192 kbps audio'], values: { format: 'mp4', videoCodec: 'libx264', quality: 24, resolution: '1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2', frameRate: 30, audioCodec: 'aac', audioBitrate: 192 } }
  ],
  'video-audio': [
    { id: 'match-extracted-audio', title: 'Keep the sound rich', description: 'Extract high-quality audio with as little change as possible.', icon: 'fluent:sparkle-24-regular', summary: ['M4A', '256 kbps', 'High quality'], values: { format: 'm4a', audioCodec: 'aac', audioBitrate: 256 } },
    { id: 'universal-extracted-audio', title: 'Listen anywhere', description: 'A standard MP3 that works on virtually every device.', icon: 'fluent:headphones-24-regular', summary: ['MP3', '192 kbps', 'Most compatible'], values: { format: 'mp3', audioCodec: 'libmp3lame', audioBitrate: 192 } },
    { id: 'speech-extracted-audio', title: 'Mostly speech', description: 'A compact file suited to meetings, lessons and spoken recordings.', icon: 'fluent:mic-24-regular', summary: ['MP3', '96 kbps', 'Small file'], values: { format: 'mp3', audioCodec: 'libmp3lame', audioBitrate: 96 } }
  ],
  'audio-compress': [
    { id: 'gentle-audio', title: 'Keep the sound rich', description: 'Reduce size gently while preserving music and detail.', icon: 'fluent:music-note-2-24-regular', summary: ['M4A', '192 kbps', 'High quality'], values: { format: 'm4a', audioCodec: 'aac', audioBitrate: 192 } },
    { id: 'balanced-audio', title: 'Make sharing easier', description: 'Good everyday sound at a meaningfully smaller size.', icon: 'fluent:send-24-regular', summary: ['MP3', '128 kbps', 'Balanced'], values: { format: 'mp3', audioCodec: 'libmp3lame', audioBitrate: 128 } },
    { id: 'smallest-audio', title: 'Save the most space', description: 'Best for voice and situations where file size matters most.', icon: 'fluent:archive-24-regular', summary: ['MP3', '64 kbps', 'Smallest file'], values: { format: 'mp3', audioCodec: 'libmp3lame', audioBitrate: 64 } }
  ],
  'audio-convert': [
    { id: 'lossless-audio', title: 'Match the original', description: 'Use lossless WAV to avoid introducing compression during conversion.', icon: 'fluent:sparkle-24-regular', summary: ['WAV', 'Lossless', 'Large file'], values: { format: 'wav', audioCodec: 'pcm_s16le' } },
    { id: 'compatible-audio', title: 'Play it anywhere', description: 'Convert to a widely supported MP3 without intentionally shrinking it.', icon: 'fluent:headphones-24-regular', summary: ['MP3', '256 kbps', 'Most compatible'], values: { format: 'mp3', audioCodec: 'libmp3lame', audioBitrate: 256 } },
    { id: 'convert-audio-smaller', title: 'Convert and make it smaller', description: 'Create a compact MP3 when a smaller file is also part of your goal.', icon: 'fluent:arrow-download-24-regular', summary: ['MP3', '96 kbps', 'Smaller file'], values: { format: 'mp3', audioCodec: 'libmp3lame', audioBitrate: 96 } }
  ],
  'audio-video': [
    { id: 'audio-video-original', title: 'Keep the original sound', description: 'Create the video while preserving audio quality as closely as possible.', icon: 'fluent:sparkle-24-regular', summary: ['MP4 video', '256 kbps audio', 'Best sound'], values: { format: 'mp4', audioCodec: 'aac', audioBitrate: 256 } },
    { id: 'audio-video-standard', title: 'Ready to share', description: 'Clear sound and a broadly compatible video for everyday sharing.', icon: 'fluent:share-24-regular', summary: ['MP4 video', '192 kbps audio', 'Compatible'], values: { format: 'mp4', audioCodec: 'aac', audioBitrate: 192 } },
    { id: 'audio-video-compact', title: 'Use less data', description: 'A smaller video for spoken audio or limited connections.', icon: 'fluent:cellular-data-1-24-regular', summary: ['MP4 video', '96 kbps audio', 'Smaller file'], values: { format: 'mp4', audioCodec: 'aac', audioBitrate: 96 } }
  ]
}

export const aspectRatios = [
  { id: '1:1', label: 'Square', ratio: 1 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 }
] as const

export const outputResolutions = [320, 480, 720, 1080] as const

export const formatsFor = (source: MediaKind, target: OutputKind) => {
  if (target === 'audio') return ['mp3', 'm4a', 'wav', 'ogg']
  if (source === 'audio') return ['mp4', 'webm']
  return ['mp4', 'webm', 'mov']
}
