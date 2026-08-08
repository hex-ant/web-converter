import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
import type { MediaFileInfo, ProcessResult, ProcessSettings } from '~/types/media'
import { compressPresets, convertPresets } from '~/utils/presets'

let engine: FFmpeg | null = null
let loadPromise: Promise<boolean> | null = null

const extension = (name: string) => name.split('.').pop()?.toLowerCase() || 'bin'
const stem = (name: string) => name.replace(/\.[^/.]+$/, '')

export function useFfmpeg() {
  const progress = ref(0)
  const processedTime = ref(0)
  const status = ref('Preparing the workspace…')
  const logs = ref<string[]>([])
  let activeDuration = 0

  const load = async () => {
    if (!engine) {
      engine = new FFmpeg()
      engine.on('progress', ({ progress: value, time }) => {
        progress.value = Math.max(0, Math.min(1, value))
        // FFmpeg reports its processed media timestamp in microseconds.
        processedTime.value = time > 0 ? time / 1_000_000 : activeDuration * progress.value
      })
      engine.on('log', ({ message }) => {
        console.debug('[ffmpeg]', message)
        logs.value = [...logs.value.slice(-19), message]
        const timestamp = message.match(/time=(-?\d+):(\d+):(\d+(?:\.\d+)?)/)
        if (timestamp) {
          const [, hours, minutes, seconds] = timestamp
          processedTime.value = Math.max(0, Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds))
        }
        if (message.includes('frame=')) status.value = 'Shaping every frame…'
        else if (message.includes('time=')) status.value = 'Encoding your media…'
      })
    }
    if (!engine.loaded) {
      status.value = 'Loading the local media engine…'
      loadPromise ||= engine.load({ coreURL, wasmURL })
      await loadPromise
    }
  }

  const process = async (media: MediaFileInfo, settings: ProcessSettings): Promise<ProcessResult> => {
    progress.value = 0
    processedTime.value = 0
    activeDuration = media.duration
    logs.value = []
    await load()
    if (!engine) throw new Error('The media engine did not start.')

    const inputName = `input.${extension(media.file.name)}`
    const outputName = `output.${settings.format}`
    await engine.writeFile(inputName, await fetchFile(media.file))
    const args: string[] = ['-i', inputName]

    if (media.kind === 'audio' && settings.outputKind === 'video') {
      if (settings.backdropMode === 'image' && settings.backdropImage) {
        const imageName = `cover.${extension(settings.backdropImage.name)}`
        await engine.writeFile(imageName, await fetchFile(settings.backdropImage))
        args.splice(0, args.length, '-loop', '1', '-i', imageName, '-i', inputName)
        args.push('-map', '0:v', '-map', '1:a')
      } else {
        args.splice(0, args.length, '-f', 'lavfi', '-i', `color=c=${settings.backdropColor.replace('#', '0x')}:s=${settings.outputWidth}x${settings.outputHeight}:r=${settings.frameRate}`, '-i', inputName)
        args.push('-map', '0:v', '-map', '1:a')
      }
      const cropFilter = settings.backdropMode === 'image'
        ? `crop=iw*${settings.cropWidth / 100}:ih*${settings.cropHeight / 100}:iw*${settings.cropX / 100}:ih*${settings.cropY / 100},scale=${settings.outputWidth}:${settings.outputHeight}`
        : `scale=${settings.outputWidth}:${settings.outputHeight}`
      args.push('-vf', cropFilter, '-shortest')
    }

    const preset = settings.tool === 'compress'
      ? compressPresets.find(item => item.id === settings.presetId)
      : convertPresets[settings.outputKind].find(item => item.id === settings.presetId)

    if (settings.outputKind === 'audio') {
      args.push('-vn')
      if (settings.format === 'mp3') args.push('-c:a', 'libmp3lame')
      else if (settings.format === 'wav') args.push('-c:a', 'pcm_s16le')
      else if (settings.format === 'ogg') args.push('-c:a', 'libvorbis')
      else args.push('-c:a', settings.audioCodec)
      if (settings.format !== 'wav') args.push('-b:a', `${preset?.audioBitrate || settings.audioBitrate}k`)
    } else {
      args.push('-c:v', settings.format === 'webm' ? 'libvpx-vp9' : settings.videoCodec)
      args.push('-crf', String(preset?.quality ?? settings.quality), '-preset', 'veryfast', '-pix_fmt', 'yuv420p')
      if (preset?.resolution && media.kind === 'video') args.push('-vf', `scale=${preset.resolution}`)
      args.push('-c:a', settings.format === 'webm' ? 'libopus' : settings.audioCodec, '-b:a', `${preset?.audioBitrate || settings.audioBitrate}k`)
      if (settings.format === 'mp4') args.push('-movflags', '+faststart')
    }

    args.push(outputName)
    status.value = 'Starting the conversion…'
    await engine.exec(args)
    status.value = 'Finishing up…'
    const data = await engine.readFile(outputName)
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
    const blob = new Blob([bytes], { type: `${settings.outputKind}/${settings.format}` })
    const fileName = `${stem(media.file.name)}-${settings.tool === 'compress' ? 'smaller' : 'converted'}.${settings.format}`
    await Promise.allSettled([engine.deleteFile(inputName), engine.deleteFile(outputName)])
    return { blob, url: URL.createObjectURL(blob), fileName, size: blob.size }
  }

  const cancel = () => {
    engine?.terminate()
    engine = null
    loadPromise = null
  }

  return { progress: readonly(progress), processedTime: readonly(processedTime), status: readonly(status), logs: readonly(logs), process, cancel }
}
