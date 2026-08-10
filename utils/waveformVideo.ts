import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat
} from 'mediabunny'

interface WaveformVideoOptions {
  width: number
  height: number
  format: 'mp4' | 'webm'
  backgroundColor: string
  frameRate?: number
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}

const BAR_COUNT = 42
const BAR_INTERVAL = 1 / 12

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('Processing was cancelled.', 'AbortError')
}

function sampleLevel(channels: Float32Array[], sampleRate: number, startTime: number, duration: number) {
  const start = Math.max(0, Math.floor(startTime * sampleRate))
  const end = Math.min(channels[0].length, Math.ceil((startTime + duration) * sampleRate))
  const stride = Math.max(1, Math.floor((end - start) / 48))
  let energy = 0
  let samples = 0

  for (let index = start; index < end; index += stride) {
    for (const channel of channels) {
      const value = channel[index] || 0
      energy += value * value
      samples++
    }
  }

  return samples ? Math.sqrt(energy / samples) : 0
}

function drawWaveformFrame(
  context: CanvasRenderingContext2D,
  levels: number[],
  time: number,
  width: number,
  height: number,
  backgroundColor: string,
  amplitudeReference: number
) {
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, width, height)

  const horizontalPadding = 0
  const availableWidth = width - horizontalPadding * 2
  const gap = Math.max(2, availableWidth * 0.006)
  const barWidth = (availableWidth - gap * (BAR_COUNT - 1)) / BAR_COUNT
  const maxBarHeight = height * 0.48
  const minBarHeight = Math.max(3, height * 0.012)
  const centerY = height / 2
  const timelinePosition = time / BAR_INTERVAL
  // A bucket appears only after its audio has happened. Before the first
  // bucket arrives, the row is filled with stable silence bars.
  const latestLevelIndex = Math.floor(timelinePosition) - 1
  const travel = timelinePosition - Math.floor(timelinePosition)
  const gradient = context.createLinearGradient(horizontalPadding, 0, width - horizontalPadding, 0)
  gradient.addColorStop(0, '#d98908')
  gradient.addColorStop(0.5, '#ffc45c')
  gradient.addColorStop(1, '#e99b13')
  context.fillStyle = gradient

  for (let slot = 0; slot < BAR_COUNT; slot++) {
    const levelIndex = latestLevelIndex - (BAR_COUNT - 1 - slot)
    const level = levelIndex >= 0 ? levels[levelIndex] || 0 : 0
    const normalized = Math.min(1, level / amplitudeReference)
    const eased = Math.pow(normalized, 0.72)
    const barHeight = minBarHeight + eased * maxBarHeight
    const x = horizontalPadding + (slot - travel) * (barWidth + gap)
    const y = centerY - barHeight / 2
    const radius = Math.min(barWidth / 2, barHeight / 2)
    context.beginPath()
    context.roundRect(x, y, barWidth, barHeight, radius)
    context.fill()
  }
}

export async function createWaveformVideo(file: File, options: WaveformVideoOptions) {
  throwIfAborted(options.signal)
  if (typeof VideoEncoder === 'undefined') throw new Error('Animated audio videos require a browser with WebCodecs support.')

  const audioContext = new AudioContext()
  let output: Output | null = null
  try {
    const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer())
    throwIfAborted(options.signal)
    const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index))
    const levelCount = Math.max(1, Math.ceil(audioBuffer.duration / BAR_INTERVAL))
    const levels = Array.from({ length: levelCount }, (_, index) => sampleLevel(channels, audioBuffer.sampleRate, index * BAR_INTERVAL, BAR_INTERVAL))
    let amplitudeReference = 0.04
    for (const level of levels) amplitudeReference = Math.max(amplitudeReference, level)
    const frameRate = options.frameRate || 30
    const frameDuration = 1 / frameRate
    const frameCount = Math.max(1, Math.ceil(audioBuffer.duration * frameRate))
    const canvas = document.createElement('canvas')
    canvas.width = options.width
    canvas.height = options.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('The waveform canvas could not be created.')

    const target = new BufferTarget()
    output = new Output({
      format: options.format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target
    })
    const source = new CanvasSource(canvas, {
      codec: options.format === 'webm' ? 'vp9' : 'avc',
      // The scene is graphically simple, so a restrained bitrate remains crisp
      // while keeping long audio-to-video exports at a reasonable size.
      bitrate: Math.max(350_000, Math.min(2_000_000, options.width * options.height * 0.7)),
      keyFrameInterval: 2
    })
    output.addVideoTrack(source, { frameRate })
    await output.start()

    for (let frame = 0; frame < frameCount; frame++) {
      throwIfAborted(options.signal)
      const timestamp = frame * frameDuration
      const duration = Math.min(frameDuration, audioBuffer.duration - timestamp)
      drawWaveformFrame(context, levels, timestamp, canvas.width, canvas.height, options.backgroundColor, amplitudeReference)
      await source.add(timestamp, Math.max(0.001, duration), { keyFrame: frame % (frameRate * 2) === 0 })
      if (frame % 3 === 0 || frame === frameCount - 1) options.onProgress?.((frame + 1) / frameCount)
    }

    source.close()
    await output.finalize()
    if (!target.buffer) throw new Error('The waveform video could not be finalized.')
    return new Blob([target.buffer], { type: options.format === 'webm' ? 'video/webm' : 'video/mp4' })
  } catch (error) {
    if (output && output.state !== 'finalized' && output.state !== 'canceled') await output.cancel().catch(() => {})
    throw error
  } finally {
    await audioContext.close().catch(() => {})
  }
}
