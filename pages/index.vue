<script setup lang="ts">
import type { MediaFileInfo, ProcessResult, ProcessSettings, ToolMode, OutputKind } from '~/types/media'
import { aspectRatios, compressPresets, convertPresets, formatsFor, outputResolutions } from '~/utils/presets'

const step = ref(1)
const media = ref<MediaFileInfo | null>(null)
const result = ref<ProcessResult | null>(null)
const downloaded = ref(false)
const pendingNavigation = ref<number | null>(null)
const error = ref('')
const probing = ref(false)
const showAdvanced = ref(false)
const processingVideo = ref<HTMLVideoElement | null>(null)
const pixelatedFrame = ref<HTMLCanvasElement | null>(null)
const cropper = ref<HTMLElement | null>(null)
const imageWidth = ref(0)
const imageHeight = ref(0)
const aspectChoice = ref('16:9')
const resolutionChoice = ref(1080)
const customWidth = ref(1920)
const customHeight = ref(1080)
const cropRect = reactive({ x: 7, y: 7, width: 86, height: 86 })
type CropGestureMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'
let cropGesture: { mode: CropGestureMode; startX: number; startY: number; x: number; y: number; width: number; height: number } | null = null
const { probe } = useMediaProbe()
const ffmpeg = useFfmpeg()
const settings = reactive<ProcessSettings>({ tool: 'convert', outputKind: 'video', presetId: 'compatible', format: 'mp4', videoCodec: 'libx264', audioCodec: 'aac', resolution: 'original', frameRate: 30, quality: 23, audioBitrate: 192, backdropMode: 'color', backdropColor: '#17130c', backdropImage: null, backdropImageUrl: '', outputWidth: 1920, outputHeight: 1080, cropX: 7, cropY: 7, cropWidth: 86, cropHeight: 86 })
const presets = computed(() => settings.tool === 'compress' ? compressPresets : convertPresets[settings.outputKind])
const formats = computed(() => media.value ? formatsFor(media.value.kind, settings.outputKind) : ['mp4'])
const isAudioToVideo = computed(() => media.value?.kind === 'audio' && settings.outputKind === 'video')
const canStart = computed(() => !isAudioToVideo.value || settings.backdropMode === 'color' || !!settings.backdropImage)
const imageRatio = computed(() => imageWidth.value && imageHeight.value ? imageWidth.value / imageHeight.value : 16 / 9)
const selectedRatio = computed(() => aspectRatios.find(item => item.id === aspectChoice.value)?.ratio || imageRatio.value)

async function chooseFile(file: File) {
  error.value = ''
  if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) return void (error.value = 'Please choose a video or audio file.')
  probing.value = true
  try {
    media.value = await probe(file)
    settings.outputKind = media.value.kind
    setOutput(media.value.kind)
    step.value = 2
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'This file could not be opened.' }
  finally { probing.value = false }
}
function removeFile() { if (media.value) URL.revokeObjectURL(media.value.url); media.value = null; step.value = 1; error.value = '' }
function setTool(tool: ToolMode) { settings.tool = tool; settings.presetId = tool === 'compress' ? 'balanced' : settings.outputKind === 'video' ? 'compatible' : 'listen-anywhere' }
function setOutput(kind: OutputKind) { settings.outputKind = kind; settings.format = kind === 'video' ? 'mp4' : 'mp3'; settings.presetId = kind === 'video' ? 'compatible' : 'listen-anywhere' }
async function chooseBackdrop(files: FileList | null) {
  const file = files?.[0]
  if (!file) return
  if (settings.backdropImageUrl) URL.revokeObjectURL(settings.backdropImageUrl)
  settings.backdropImage = file
  settings.backdropImageUrl = URL.createObjectURL(file)
  const image = new Image()
  image.src = settings.backdropImageUrl
  await image.decode()
  imageWidth.value = image.naturalWidth
  imageHeight.value = image.naturalHeight
  resetCrop()
  updateOutputDimensions()
}
function updateOutputDimensions() {
  const ratio = selectedRatio.value
  if (resolutionChoice.value === -1) {
    settings.outputWidth = customWidth.value
    settings.outputHeight = customHeight.value
  } else if (resolutionChoice.value === 0) {
    if (imageWidth.value && imageHeight.value) {
      settings.outputWidth = Math.max(2, Math.round(imageWidth.value * cropRect.width / 100 / 2) * 2)
      settings.outputHeight = Math.max(2, Math.round(imageHeight.value * cropRect.height / 100 / 2) * 2)
    } else if (ratio >= 1) { settings.outputHeight = 1080; settings.outputWidth = Math.round(1080 * ratio / 2) * 2 }
    else { settings.outputWidth = 1080; settings.outputHeight = Math.round(1080 / ratio / 2) * 2 }
  } else if (ratio >= 1) {
    settings.outputHeight = resolutionChoice.value
    settings.outputWidth = Math.round(resolutionChoice.value * ratio / 2) * 2
  } else {
    settings.outputWidth = resolutionChoice.value
    settings.outputHeight = Math.round(resolutionChoice.value / ratio / 2) * 2
  }
}
function resetCrop() {
  if (aspectChoice.value === "original") { cropRect.x = 0; cropRect.y = 0; cropRect.width = 100; cropRect.height = 100; return }
  const heightPerWidth = imageRatio.value / selectedRatio.value
  let width = 86
  let height = width * heightPerWidth
  if (height > 86) { height = 86; width = height / heightPerWidth }
  cropRect.width = width; cropRect.height = height
  cropRect.x = (100 - width) / 2; cropRect.y = (100 - height) / 2
}
function selectAspect(id: string) {
  aspectChoice.value = id
  resetCrop()
  if (resolutionChoice.value === -1) setCustomDimension('width', customWidth.value)
  else updateOutputDimensions()
}
function selectResolution(value: number) { resolutionChoice.value = value; updateOutputDimensions() }
function enableCustomResolution() {
  customWidth.value = settings.outputWidth
  customHeight.value = settings.outputHeight
  resolutionChoice.value = -1
  updateOutputDimensions()
}
function setCustomDimension(axis: 'width' | 'height', value: number) {
  const safeValue = Math.max(2, Math.min(7680, Math.round(value || 2)))
  resolutionChoice.value = -1
  if (axis === 'width') {
    customWidth.value = safeValue
    customHeight.value = Math.max(2, Math.round(safeValue / selectedRatio.value / 2) * 2)
  } else {
    customHeight.value = safeValue
    customWidth.value = Math.max(2, Math.round(safeValue * selectedRatio.value / 2) * 2)
  }
  updateOutputDimensions()
}
function beginCrop(event: PointerEvent, mode: CropGestureMode) {
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  cropGesture = { mode, startX: event.clientX, startY: event.clientY, ...cropRect }
}
function moveCrop(event: PointerEvent) {
  if (!cropGesture || !cropper.value) return
  const bounds = cropper.value.getBoundingClientRect()
  const dx = (event.clientX - cropGesture.startX) / bounds.width * 100
  const dy = (event.clientY - cropGesture.startY) / bounds.height * 100
  if (cropGesture.mode === 'move') {
    cropRect.x = Math.max(0, Math.min(100 - cropRect.width, cropGesture.x + dx))
    cropRect.y = Math.max(0, Math.min(100 - cropRect.height, cropGesture.y + dy))
  } else {
    const heightPerWidth = imageRatio.value / selectedRatio.value
    const fromLeft = cropGesture.mode.endsWith('w')
    const fromTop = cropGesture.mode.startsWith('n')
    const horizontalChange = fromLeft ? -dx : dx
    const verticalChange = (fromTop ? -dy : dy) / heightPerWidth
    const change = Math.abs(horizontalChange) > Math.abs(verticalChange) ? horizontalChange : verticalChange
    const maxHorizontal = fromLeft ? cropGesture.x + cropGesture.width : 100 - cropGesture.x
    const maxVertical = (fromTop ? cropGesture.y + cropGesture.height : 100 - cropGesture.y) / heightPerWidth
    const width = Math.max(15, Math.min(maxHorizontal, maxVertical, cropGesture.width + change))
    const height = width * heightPerWidth
    cropRect.width = width
    cropRect.height = height
    cropRect.x = fromLeft ? cropGesture.x + cropGesture.width - width : cropGesture.x
    cropRect.y = fromTop ? cropGesture.y + cropGesture.height - height : cropGesture.y
  }
}
function endCrop() { cropGesture = null; updateOutputDimensions() }
watch(cropRect, (rect) => {
  settings.cropX = rect.x
  settings.cropY = rect.y
  settings.cropWidth = rect.width
  settings.cropHeight = rect.height
}, { deep: true, immediate: true })
async function start() { if (!media.value || !canStart.value) return; downloaded.value = false; step.value = 3; error.value = ''; try { result.value = await ffmpeg.process(media.value, settings); step.value = 4 } catch (reason) { if (step.value === 3) { error.value = reason instanceof Error ? reason.message : 'Processing stopped unexpectedly.'; step.value = 2 } } }
function requestNavigation(target: number) {
  if (target >= step.value) return
  if (step.value === 3 || (step.value === 4 && !downloaded.value)) pendingNavigation.value = target
  else navigateToStep(target)
}
function navigateToStep(target: number) {
  pendingNavigation.value = null
  if (step.value === 3) ffmpeg.cancel()
  if (result.value) { URL.revokeObjectURL(result.value.url); result.value = null }
  downloaded.value = false
  if (target === 1) { removeFile(); return }
  if (target === 2) { step.value = 2; return }
  if (target === 3) start()
}
function confirmNavigation() { if (pendingNavigation.value !== null) navigateToStep(pendingNavigation.value) }
function handleBeforeUnload(event: BeforeUnloadEvent) { if (step.value === 3 || (step.value === 4 && !downloaded.value)) event.preventDefault() }
const size = (bytes: number) => bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(1)} MB`
const savings = computed(() => media.value && result.value ? Math.max(0, Math.round((1 - result.value.size / media.value.file.size) * 100)) : 0)
function drawPixelatedFrame() {
  const video = processingVideo.value
  const canvas = pixelatedFrame.value
  if (!video || !canvas || !video.videoWidth || !video.videoHeight) return
  const context = canvas.getContext('2d')
  if (!context) return
  const targetRatio = canvas.width / canvas.height
  const sourceRatio = video.videoWidth / video.videoHeight
  let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight
  if (sourceRatio > targetRatio) { sw = video.videoHeight * targetRatio; sx = (video.videoWidth - sw) / 2 }
  else { sh = video.videoWidth / targetRatio; sy = (video.videoHeight - sh) / 2 }
  context.imageSmoothingEnabled = false
  context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
}
watch(() => ffmpeg.processedTime.value, (time) => {
  const video = processingVideo.value
  if (!video || !Number.isFinite(time) || Math.abs(video.currentTime - time) < 0.08) return
  video.currentTime = Math.min(time, Math.max(0, (video.duration || media.value?.duration || 0) - 0.01))
})
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => { window.removeEventListener('beforeunload', handleBeforeUnload); if (media.value) URL.revokeObjectURL(media.value.url); if (result.value) URL.revokeObjectURL(result.value.url); if (settings.backdropImageUrl) URL.revokeObjectURL(settings.backdropImageUrl) })
</script>

<template>
  <div class="app-shell">
    <AppHeader @home="requestNavigation(1)" />
    <main>
      <StepIndicator :current="step" @navigate="requestNavigation" />
      <DropZone v-if="step === 1" :busy="probing" :error="error" @select="chooseFile" />

      <section v-else-if="step === 2 && media" class="workspace">
        <header class="section-heading"><span class="kicker">Your goal</span><h1>What would you like to do?</h1><p>Choose the outcome that matters to you. We’ll handle the technical details.</p></header>
        <MediaSummary :media="media" @remove="removeFile" />
        <div class="tool-switch">
          <button :class="{ active: settings.tool === 'convert' }" @click="setTool('convert')"><Icon name="fluent:arrow-repeat-all-24-regular" /><span><strong>Convert</strong><small>Change its format or type</small></span></button>
          <button :class="{ active: settings.tool === 'compress' }" @click="setTool('compress')"><Icon name="fluent:arrow-minimize-24-regular" /><span><strong>Compress</strong><small>Make the file smaller</small></span></button>
        </div>
        <div v-if="settings.tool === 'convert'" class="output-row"><span>Turn this into</span><div class="segmented"><button :class="{ active: settings.outputKind === 'video' }" @click="setOutput('video')"><Icon name="fluent:video-20-regular" /> Video</button><button :class="{ active: settings.outputKind === 'audio' }" @click="setOutput('audio')"><Icon name="fluent:music-note-2-20-regular" /> Audio only</button></div><select v-model="settings.format" aria-label="Output format"><option v-for="format in formats" :key="format" :value="format">.{{ format.toUpperCase() }}</option></select></div>
        <div class="subheading"><span>Choose what matters most</span><small>No technical knowledge needed</small></div>
        <div class="preset-grid"><button v-for="preset in presets" :key="preset.id" class="preset" :class="{ selected: settings.presetId === preset.id }" @click="settings.presetId = preset.id"><span class="preset-icon"><Icon :name="preset.icon" /></span><strong>{{ preset.title }}</strong><small>{{ preset.description }}</small><span class="radio"><Icon v-if="settings.presetId === preset.id" name="fluent:checkmark-12-filled" /></span></button></div>

        <div v-if="isAudioToVideo" class="backdrop-panel">
          <div class="subheading"><span>What should the video show?</span><small>Your audio will play over this background</small></div>
          <div class="backdrop-tabs"><button :class="{ active: settings.backdropMode === 'color' }" @click="settings.backdropMode = 'color'"><Icon name="fluent:color-20-regular" /> Solid color</button><button :class="{ active: settings.backdropMode === 'image' }" @click="settings.backdropMode = 'image'"><Icon name="fluent:image-20-regular" /> Your image</button></div>
          <div v-if="settings.backdropMode === 'color'" class="solid-editor">
            <div class="background-preview" :style="{ aspectRatio: selectedRatio, background: settings.backdropColor }" />
            <label>Background color <span><input v-model="settings.backdropColor" type="color"><code>{{ settings.backdropColor.toUpperCase() }}</code></span></label>
          </div>
          <div v-else class="image-choice">
            <label v-if="!settings.backdropImageUrl" class="image-upload"><Icon name="fluent:image-add-24-regular" /><strong>Choose a cover image</strong><span>JPG, PNG or WebP</span><input class="sr-only" type="file" accept="image/*" @change="chooseBackdrop(($event.target as HTMLInputElement).files)"></label>
            <div v-else ref="cropper" class="direct-cropper" :style="{ aspectRatio: imageRatio, maxWidth: Math.min(560, 360 * imageRatio) + 'px' }">
              <img :src="settings.backdropImageUrl" alt="Cover crop preview">
              <div class="crop-selection" :style="{ left: cropRect.x + '%', top: cropRect.y + '%', width: cropRect.width + '%', height: cropRect.height + '%' }" @pointerdown="beginCrop($event, 'move')" @pointermove="moveCrop" @pointerup="endCrop" @pointercancel="endCrop"><span v-for="corner in ['nw', 'ne', 'sw', 'se'] as const" :key="corner" class="resize-handle" :class="corner" @pointerdown.stop="beginCrop($event, corner)" /></div>
              <label class="replace">Replace<input class="sr-only" type="file" accept="image/*" @change="chooseBackdrop(($event.target as HTMLInputElement).files)"></label>
            </div>
            <p v-if="settings.backdropImageUrl" class="crop-hint">Drag the frame to position it. Drag the corner to resize.</p>
          </div>
          <div class="output-pickers">
            <div><span>Aspect ratio</span><div class="choice-row"><button v-for="aspect in aspectRatios" :key="aspect.id" :class="{ active: aspectChoice === aspect.id }" @click="selectAspect(aspect.id)">{{ aspect.label }}</button></div></div>
            <div><span>Resolution</span><div class="choice-row"><button v-for="resolution in outputResolutions" :key="resolution" :class="{ active: resolutionChoice === resolution }" @click="selectResolution(resolution)">{{ resolution ? resolution + 'p' : 'Original' }}</button><button :class="{ active: resolutionChoice === -1 }" @click="enableCustomResolution">Custom</button><label v-if="resolutionChoice === -1" class="custom-resolution"><input v-model.number="customWidth" type="number" min="2" max="7680" @change="setCustomDimension('width', customWidth)"><span>×</span><input v-model.number="customHeight" type="number" min="2" max="7680" @change="setCustomDimension('height', customHeight)"></label></div></div>
            <small>Output: {{ settings.outputWidth }} × {{ settings.outputHeight }}</small>
          </div>
        </div>

        <div class="advanced"><button @click="showAdvanced = !showAdvanced"><span><Icon name="fluent:settings-20-regular" /> Advanced settings</span><Icon :name="showAdvanced ? 'fluent:chevron-up-20-regular' : 'fluent:chevron-down-20-regular'" /></button><div v-if="showAdvanced" class="advanced-grid"><label v-if="settings.outputKind === 'video'">Video codec<select v-model="settings.videoCodec"><option value="libx264">H.264</option><option value="libvpx-vp9">VP9</option></select></label><label v-if="settings.outputKind === 'video'">Frame rate<input v-model.number="settings.frameRate" type="number" min="12" max="60"></label><label v-if="settings.outputKind === 'video'">CRF quality<input v-model.number="settings.quality" type="number" min="0" max="51"></label><label>Audio bitrate<select v-model.number="settings.audioBitrate"><option :value="64">64 kbps</option><option :value="128">128 kbps</option><option :value="192">192 kbps</option><option :value="320">320 kbps</option></select></label></div></div>
        <p v-if="error" class="error"><Icon name="fluent:error-circle-20-regular" /> {{ error }}</p>
        <footer class="actions"><span><Icon name="fluent:shield-checkmark-20-regular" /> Processed privately on your device</span><button class="primary" :disabled="!canStart" @click="start">Start {{ settings.tool === 'convert' ? 'converting' : 'compressing' }} <Icon name="fluent:arrow-right-20-regular" /></button></footer>
      </section>

      <section v-else-if="step === 3 && media" class="processing">
        <div class="processing-visual"><template v-if="media.kind === 'video'"><video ref="processingVideo" :src="media.url" muted playsinline preload="auto" @loadeddata="drawPixelatedFrame" @seeked="drawPixelatedFrame" /><canvas ref="pixelatedFrame" class="pixelated-frame" width="96" height="52" :style="{ clipPath: `inset(0 0 0 ${ffmpeg.progress.value * 100}%)` }" /><span class="split-boundary" :style="{ left: `${ffmpeg.progress.value * 100}%` }" /></template><div v-else class="audio-visual"><span class="disc"><Icon name="fluent:music-note-2-24-filled" /></span><div class="wave"><i v-for="n in 34" :key="n" :style="{ animationDelay: `${n * -0.07}s` }" /></div></div><span class="live"><i /> Processing locally</span></div>
        <span class="kicker">Almost there</span><h1>{{ ffmpeg.status.value }}</h1><p>{{ Math.round(ffmpeg.progress.value * 100) }}% complete · Keep this tab open</p><div class="progress"><i :style="{ width: `${Math.max(2, ffmpeg.progress.value * 100)}%` }" /></div><button @click="requestNavigation(2)">Cancel</button>
      </section>

      <section v-else-if="step === 4 && media && result" class="done">
        <div class="done-icon"><Icon name="fluent:checkmark-32-filled" /></div><span class="kicker">All done</span><h1>Your file is ready.</h1><p>Converted entirely on your device. Nothing was uploaded anywhere.</p>
        <div class="result-card"><span class="result-icon"><Icon :name="settings.outputKind === 'video' ? 'fluent:video-24-regular' : 'fluent:music-note-2-24-regular'" /></span><div><strong>{{ result.fileName }}</strong><span>{{ size(result.size) }}<template v-if="savings"> · {{ savings }}% smaller</template></span></div><a :href="result.url" :download="result.fileName" @click="downloaded = true"><Icon name="fluent:arrow-download-20-regular" /> Download</a></div>
        <button class="again" @click="requestNavigation(1)"><Icon name="fluent:add-20-regular" /> Work on another file</button>
      </section>
    </main>
    <footer class="site-footer">Made for you, not your data. <span>·</span> Runs with FFmpeg WebAssembly</footer>
    <ConfirmNavigationModal v-if="pendingNavigation !== null" :processing="step === 3" @cancel="pendingNavigation = null" @confirm="confirmNavigation" />
  </div>
</template>

<style scoped src="~/assets/css/page.css"></style>

<style scoped>
.pixelated-frame {
  filter: brightness(.58) saturate(.72);
}

.split-boundary {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--accent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 70%, transparent);
  transform: translateX(-.5px);
  transition: left .2s linear;
  pointer-events: none;
}
.solid-editor { display: grid; grid-template-columns: minmax(0, 1fr) 150px; gap: 18px; align-items: center; margin-top: 16px; }
.background-preview { width: 100%; max-height: 260px; border-radius: 13px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.solid-editor label { display: grid; gap: 10px; color: var(--muted); font-size: 9px; }
.solid-editor label span { display: flex; align-items: center; gap: 9px; }
.solid-editor input { width: 36px; height: 36px; padding: 0; border: 0; background: transparent; }
.solid-editor code { color: var(--text); }
.direct-cropper { position: relative; width: 100%; margin: 16px auto 0; overflow: hidden; border-radius: 13px; background: #111; touch-action: none; user-select: none; }
.direct-cropper .replace { z-index: 3; }
.direct-cropper > img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.direct-cropper::after { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,.34); pointer-events: none; }
.crop-selection { position: absolute; z-index: 2; border: 1px solid var(--accent); box-shadow: 0 0 0 999px rgba(0,0,0,.36), 0 0 12px color-mix(in srgb, var(--accent) 35%, transparent); cursor: move; touch-action: none; }
.crop-selection::before { content: ""; position: absolute; inset: 0; backdrop-filter: brightness(2.2); }
.resize-handle { position: absolute; z-index: 2; width: 12px; height: 12px; border: 2px solid var(--surface-solid); border-radius: 50%; background: var(--accent); }
.resize-handle.nw { top: -6px; left: -6px; cursor: nwse-resize; }
.resize-handle.ne { top: -6px; right: -6px; cursor: nesw-resize; }
.resize-handle.sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
.resize-handle.se { right: -6px; bottom: -6px; cursor: nwse-resize; }
.crop-hint { margin: 8px 0 0; text-align: center; color: var(--muted); font-size: 8px; }
.output-pickers { display: grid; gap: 14px; margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }
.output-pickers > div { display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 10px; }
.output-pickers > div > span { color: var(--muted); font-size: 9px; }
.choice-row { display: flex; flex-wrap: wrap; gap: 6px; }
.choice-row button { padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer; font-size: 8px; }
.choice-row button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
.custom-resolution { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); font-size: 8px; }
.custom-resolution input { width: 65px; padding: 7px 6px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-solid); color: var(--text); font-size: 8px; }
.output-pickers > small { justify-self: end; color: var(--muted); font-size: 8px; }
@media (max-width: 600px) { .solid-editor { grid-template-columns: 1fr; } .output-pickers > div { grid-template-columns: 1fr; } }
</style>
