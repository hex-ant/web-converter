import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
import type { MediaFileInfo, ProcessResult, ProcessSettings } from '~/types/media'
import { createWaveformVideo } from '~/utils/waveformVideo'

let engine: FFmpeg | null = null
let loadPromise: Promise<boolean> | null = null

const extension = (name: string) => name.split('.').pop()?.toLowerCase() || 'bin'
const stem = (name: string) => name.replace(/\.[^/.]+$/, '')
const MAX_WAVEFORM_DURATION = 10 * 60

export function useFfmpeg() {
  const progress = ref(0)
  const processedTime = ref(0)
  const status = ref('Preparing the workspace…')
  const logs = ref<string[]>([])
  let activeDuration = 0
  let ffmpegProgressStart = 0
  let activeController: AbortController | null = null

  const load = async () => {
    if (!engine) {
      engine = new FFmpeg()
      engine.on('progress', ({ progress: value, time }) => {
        const engineProgress = Math.max(0, Math.min(1, value))
        progress.value = ffmpegProgressStart + engineProgress * (1 - ffmpegProgressStart)
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
      try {
        await loadPromise
      } catch (error) {
        loadPromise = null
        engine?.terminate()
        engine = null
        throw error
      }
    }
  }

  const process = async (media: MediaFileInfo, settings: ProcessSettings): Promise<ProcessResult> => {
    progress.value = 0
    processedTime.value = 0
    ffmpegProgressStart = 0
    activeDuration = media.duration
    logs.value = []
    const controller = new AbortController()
    activeController = controller
    const inputName = `input.${extension(media.file.name)}`
    const outputName = `output.${settings.format}`
    const temporaryFiles = new Set<string>()
    let currentEngine: FFmpeg | null = null

    try {
      await load()
      currentEngine = engine
      if (!currentEngine) throw new Error('The media engine did not start.')

      const isWaveform = media.kind === 'audio' && settings.outputKind === 'video' && settings.backdropMode === 'waveform'
      const args: string[] = ['-i', inputName]
      let waveformName = ''

      if (isWaveform) {
        if (media.duration > MAX_WAVEFORM_DURATION) throw new Error('Animated audio wave videos are limited to 10 minutes to keep browser memory use stable.')
        status.value = 'Drawing your audio wave…'
        let waveform: Blob | null = await createWaveformVideo(media.file, {
          width: settings.outputWidth,
          height: settings.outputHeight,
          format: settings.format === 'webm' ? 'webm' : 'mp4',
          backgroundColor: settings.backdropColor,
          signal: controller.signal,
          onProgress: value => { progress.value = value * 0.72 }
        })
        waveformName = `waveform.${settings.format === 'webm' ? 'webm' : 'mp4'}`
        temporaryFiles.add(waveformName)
        await currentEngine.writeFile(waveformName, await fetchFile(waveform))
        waveform = null
      }

      temporaryFiles.add(inputName)
      await currentEngine.writeFile(inputName, await fetchFile(media.file))

      if (media.kind === 'audio' && settings.outputKind === 'video') {
        if (isWaveform) {
          args.splice(0, args.length, '-i', waveformName, '-i', inputName)
          args.push('-map', '0:v', '-map', '1:a', '-shortest')
          ffmpegProgressStart = 0.72
        } else if (settings.backdropMode === 'image' && settings.backdropImage) {
          const imageName = `cover.${extension(settings.backdropImage.name)}`
          temporaryFiles.add(imageName)
          await currentEngine.writeFile(imageName, await fetchFile(settings.backdropImage))
          args.splice(0, args.length, '-loop', '1', '-i', imageName, '-i', inputName)
          args.push('-map', '0:v', '-map', '1:a')
        } else {
          args.splice(0, args.length, '-f', 'lavfi', '-i', `color=c=${settings.backdropColor.replace('#', '0x')}:s=${settings.outputWidth}x${settings.outputHeight}:r=${settings.frameRate}`, '-i', inputName)
          args.push('-map', '0:v', '-map', '1:a')
        }
        if (!isWaveform) {
          const cropFilter = settings.backdropMode === 'image'
            ? `crop=iw*${settings.cropWidth / 100}:ih*${settings.cropHeight / 100}:iw*${settings.cropX / 100}:ih*${settings.cropY / 100},scale=${settings.outputWidth}:${settings.outputHeight}`
            : `scale=${settings.outputWidth}:${settings.outputHeight}`
          args.push('-vf', cropFilter, '-shortest')
        }
      }

      if (settings.outputKind === 'audio') {
        args.push('-vn')
        if (settings.format === 'mp3') args.push('-c:a', 'libmp3lame')
        else if (settings.format === 'wav') args.push('-c:a', 'pcm_s16le')
        else if (settings.format === 'ogg') args.push('-c:a', 'libvorbis')
        else args.push('-c:a', settings.audioCodec)
        if (settings.format !== 'wav') args.push('-b:a', `${settings.audioBitrate}k`)
      } else {
        if (isWaveform) args.push('-c:v', 'copy')
        else {
          args.push('-c:v', settings.format === 'webm' ? 'libvpx-vp9' : settings.videoCodec)
          args.push('-crf', String(settings.quality), '-preset', 'veryfast', '-pix_fmt', 'yuv420p')
        }
        if (media.kind === 'video') {
          const filters: string[] = []
          if (settings.resolution !== 'original') filters.push(`scale=${settings.resolution}`)
          if (settings.frameRate > 0) filters.push(`fps=fps='min(source_fps,${settings.frameRate})'`)
          if (filters.length) args.push('-vf', filters.join(','))
        }
        args.push('-c:a', settings.format === 'webm' ? 'libopus' : settings.audioCodec, '-b:a', `${settings.audioBitrate}k`)
        if (settings.format === 'mp4') args.push('-movflags', '+faststart')
      }

      args.push(outputName)
      temporaryFiles.add(outputName)
      status.value = 'Starting the conversion…'
      const exitCode = await currentEngine.exec(args)
      if (exitCode !== 0) throw new Error(`The media engine stopped with exit code ${exitCode}.`)
      status.value = 'Finishing up…'
      const data = await currentEngine.readFile(outputName)
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
      const blob = new Blob([bytes], { type: `${settings.outputKind}/${settings.format}` })
      const fileName = `${stem(media.file.name)}-${settings.tool === 'compress' ? 'smaller' : 'converted'}.${settings.format}`
      return { blob, url: URL.createObjectURL(blob), fileName, size: blob.size }
    } finally {
      if (currentEngine) await Promise.allSettled([...temporaryFiles].map(file => currentEngine!.deleteFile(file)))
      if (activeController === controller) activeController = null
    }
  }

  const cancel = () => {
    activeController?.abort()
    activeController = null
    engine?.terminate()
    engine = null
    loadPromise = null
  }

  return { progress: readonly(progress), processedTime: readonly(processedTime), status: readonly(status), logs: readonly(logs), process, cancel }
}
