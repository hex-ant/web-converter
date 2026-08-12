<script setup lang="ts">
import type { MediaFileInfo, ProcessResult, ProcessSettings, Workflow } from '~/types/media'
import type { Preset } from '~/utils/presets'
import { aspectRatios, formatsFor, outputResolutions, workflowPresets, workflowsFor } from '~/utils/presets'

const step = ref(1)
const media = ref<MediaFileInfo | null>(null)
const result = ref<ProcessResult | null>(null)
const workflow = ref<Workflow | null>(null)
const downloaded = ref(false)
const pendingNavigation = ref<number | null>(null)
const error = ref('')
const probing = ref(false)
const showAdvanced = ref(false)
const processingVideo = ref<HTMLVideoElement | null>(null)
const pixelatedFrame = ref<HTMLCanvasElement | null>(null)
const cropper = ref<HTMLElement | null>(null)
const imageDragging = ref(false)
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
const { track } = useAnalytics()
const settings = reactive<ProcessSettings>({ tool: 'convert', outputKind: 'video', presetId: 'compatible', format: 'mp4', videoCodec: 'libx264', audioCodec: 'aac', resolution: 'original', frameRate: 30, quality: 23, audioBitrate: 192, backdropMode: 'color', backdropColor: '#17130c', backdropImage: null, backdropImageUrl: '', outputWidth: 1920, outputHeight: 1080, cropX: 7, cropY: 7, cropWidth: 86, cropHeight: 86 })
const availableWorkflows = computed(() => media.value ? workflowsFor[media.value.kind] : [])
const activeWorkflow = computed(() => availableWorkflows.value.find(item => item.id === workflow.value))
const presets = computed(() => workflow.value ? workflowPresets[workflow.value] : [])
const formats = computed(() => media.value ? formatsFor(media.value.kind, settings.outputKind) : ['mp4'])
const isAudioToVideo = computed(() => workflow.value === 'audio-video')
const hasVideoEncodingOptions = computed(() => workflow.value === 'video-compress' || workflow.value === 'video-convert')
const actionLabel = computed(() => ({
  'video-compress': 'Compress video', 'video-convert': 'Convert video', 'video-audio': 'Extract audio',
  'audio-compress': 'Compress audio', 'audio-convert': 'Convert audio', 'audio-video': 'Create video'
}[workflow.value || 'video-convert']))
const videoCodecOptions = computed(() => settings.format === 'webm' ? [{ value: 'libvpx-vp9', label: 'VP9' }] : [{ value: 'libx264', label: 'H.264' }])
const audioCodecOptions = computed(() => ({
  mp3: [{ value: 'libmp3lame', label: 'MP3' }], wav: [{ value: 'pcm_s16le', label: 'PCM (lossless)' }],
  ogg: [{ value: 'libvorbis', label: 'Vorbis' }], webm: [{ value: 'libopus', label: 'Opus' }]
}[settings.format] || [{ value: 'aac', label: 'AAC' }]))
const canStart = computed(() => !isAudioToVideo.value || settings.backdropMode !== 'image' || !!settings.backdropImage)
const imageRatio = computed(() => imageWidth.value && imageHeight.value ? imageWidth.value / imageHeight.value : 16 / 9)
const selectedRatio = computed(() => aspectRatios.find(item => item.id === aspectChoice.value)?.ratio || imageRatio.value)

async function chooseFile(file: File) {
  error.value = ''
  if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) return void (error.value = 'Please choose a video or audio file.')
  probing.value = true
  try {
    media.value = await probe(file)
    workflow.value = null
    step.value = 2
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'This file could not be opened.' }
  finally { probing.value = false }
}
function removeFile() { if (media.value) URL.revokeObjectURL(media.value.url); media.value = null; workflow.value = null; step.value = 1; error.value = '' }
function selectPreset(preset: Preset) {
  settings.presetId = preset.id
  Object.assign(settings, preset.values)
}
function chooseWorkflow(id: Workflow) {
  const option = availableWorkflows.value.find(item => item.id === id)
  if (!option) return
  workflow.value = id
  settings.tool = option.tool
  settings.outputKind = option.outputKind
  if (id === 'audio-video') Object.assign(settings, { videoCodec: 'libx264', quality: 28, frameRate: 1, resolution: 'original' })
  selectPreset(workflowPresets[id][0])
  track('tool_selected', { workflow: id })
}
function changeFormat() {
  if (settings.format === 'mp3') settings.audioCodec = 'libmp3lame'
  else if (settings.format === 'wav') settings.audioCodec = 'pcm_s16le'
  else if (settings.format === 'ogg') settings.audioCodec = 'libvorbis'
  else if (settings.format === 'webm') { settings.videoCodec = 'libvpx-vp9'; settings.audioCodec = 'libopus' }
  else settings.audioCodec = 'aac'
}
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
  } else if (ratio >= 1) {
    settings.outputHeight = resolutionChoice.value
    settings.outputWidth = Math.round(resolutionChoice.value * ratio / 2) * 2
  } else {
    settings.outputWidth = resolutionChoice.value
    settings.outputHeight = Math.round(resolutionChoice.value / ratio / 2) * 2
  }
}
function resetCrop() {
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
async function start() {
  if (!media.value || !workflow.value || !canStart.value) return
  const selectedWorkflow = workflow.value
  const outputFormat = settings.format
  downloaded.value = false
  step.value = 3
  error.value = ''
  track('processing_started', {
    workflow: selectedWorkflow,
    preset: settings.presetId,
    outputFormat,
    ...(selectedWorkflow === 'audio-video' ? { backdrop: settings.backdropMode } : {})
  })
  try {
    result.value = await ffmpeg.process(media.value, settings)
    track('processing_completed', { workflow: selectedWorkflow, outputFormat })
    step.value = 4
  } catch (reason) {
    if (step.value === 3) {
      track('processing_failed', { workflow: selectedWorkflow })
      error.value = reason instanceof Error ? reason.message : 'Processing stopped unexpectedly.'
      step.value = 2
    }
  }
}
function downloadResult() {
  downloaded.value = true
  if (workflow.value) track('download_clicked', { workflow: workflow.value, outputFormat: settings.format })
}
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
        <header class="section-heading"><span class="kicker">{{ workflow ? 'Your chosen path' : 'Your goal' }}</span><h1>{{ activeWorkflow?.title || 'What would you like to do?' }}</h1><p>{{ activeWorkflow?.description || 'Pick the result you want. Each path has settings made specifically for that job.' }}</p></header>
        <MediaSummary :media="media" @remove="removeFile" />
        <div v-if="!workflow" class="intent-grid">
          <button v-for="option in availableWorkflows" :key="option.id" @click="chooseWorkflow(option.id)"><span class="intent-icon"><Icon :name="option.icon" /></span><span><strong>{{ option.title }}</strong><small>{{ option.description }}</small></span><Icon class="intent-arrow" name="fluent:chevron-right-20-regular" /></button>
        </div>
        <div v-else class="path-config">
          <button class="change-path" @click="workflow = null"><Icon name="fluent:arrow-left-20-regular" /> Choose a different task</button>
          <div class="subheading"><span>How should we handle it?</span><small>Start with the option closest to your goal</small></div>
          <div class="preset-grid"><button v-for="preset in presets" :key="preset.id" class="preset" :class="{ selected: settings.presetId === preset.id }" @click="selectPreset(preset)"><span class="preset-icon"><Icon :name="preset.icon" /></span><strong>{{ preset.title }}</strong><small>{{ preset.description }}</small><span class="preset-summary"><i v-for="detail in preset.summary" :key="detail">{{ detail }}</i></span><span class="radio"><Icon v-if="settings.presetId === preset.id" name="fluent:checkmark-12-filled" /></span></button></div>
          <div class="format-row"><span><strong>Output format</strong><small>The file type you’ll receive</small></span><select v-model="settings.format" @change="changeFormat"><option v-for="format in formats" :key="format" :value="format">{{ format.toUpperCase() }}</option></select></div>

        <div v-if="isAudioToVideo" class="backdrop-panel">
          <div class="subheading"><span>What should the video show?</span><small>Choose an animated wave, a solid color or your own image</small></div>
          <div class="backdrop-tabs"><button :class="{ active: settings.backdropMode === 'color' }" @click="settings.backdropMode = 'color'"><Icon name="fluent:color-20-regular" /> Solid color</button><button :class="{ active: settings.backdropMode === 'image' }" @click="settings.backdropMode = 'image'"><Icon name="fluent:image-20-regular" /> Your image</button><button :class="{ active: settings.backdropMode === 'waveform' }" @click="settings.backdropMode = 'waveform'"><Icon name="fluent:pulse-20-regular" /> Audio wave</button></div>
          <div v-if="settings.backdropMode === 'color'" class="solid-editor">
            <div class="background-preview generated-preview" :style="{ aspectRatio: selectedRatio, '--preview-ratio': selectedRatio, background: settings.backdropColor }" />
            <label>Background color <span><input v-model="settings.backdropColor" type="color"><code>{{ settings.backdropColor.toUpperCase() }}</code></span></label>
          </div>
          <div v-else-if="settings.backdropMode === 'image'" class="image-choice">
            <label v-if="!settings.backdropImageUrl" class="image-upload" :class="{ dragging: imageDragging }" @dragover.prevent="imageDragging = true" @dragleave.prevent="imageDragging = false" @drop.prevent="imageDragging = false; chooseBackdrop($event.dataTransfer?.files || null)"><Icon name="fluent:image-add-24-regular" /><strong>Drop a cover image here</strong><span>or choose a JPG, PNG or WebP</span><input class="sr-only" type="file" accept="image/*" @change="chooseBackdrop(($event.target as HTMLInputElement).files)"></label>
            <div v-else ref="cropper" class="direct-cropper" :style="{ aspectRatio: imageRatio, '--image-ratio': imageRatio }">
              <img :src="settings.backdropImageUrl" alt="Cover crop preview">
              <div class="crop-selection" :style="{ left: cropRect.x + '%', top: cropRect.y + '%', width: cropRect.width + '%', height: cropRect.height + '%' }" @pointerdown="beginCrop($event, 'move')" @pointermove="moveCrop" @pointerup="endCrop" @pointercancel="endCrop"><span v-for="corner in ['nw', 'ne', 'sw', 'se'] as const" :key="corner" class="resize-handle" :class="corner" @pointerdown.stop="beginCrop($event, corner)" /></div>
              <label class="replace">Replace<input class="sr-only" type="file" accept="image/*" @change="chooseBackdrop(($event.target as HTMLInputElement).files)"></label>
            </div>
            <p class="crop-hint" :class="{ placeholder: !settings.backdropImageUrl }">Drag the frame to position it. Drag the corner to resize.</p>
          </div>
          <div v-else class="waveform-editor">
            <div class="waveform-preview generated-preview" :style="{ aspectRatio: selectedRatio, '--preview-ratio': selectedRatio, background: settings.backdropColor }"><i v-for="(height, index) in [4, 7, 12, 8, 18, 24, 14, 29, 20, 11, 26, 34, 22, 13, 31, 19, 9, 21, 38, 17, 7, 15, 28, 12, 20, 42, 27, 16, 35, 23, 11, 18, 46, 30, 14, 25, 39, 21, 10, 16, 32, 19]" :key="index" :style="{ height: height + '%' }" /></div>
            <div><strong>Moves with your audio</strong><span>The exported wave will be generated from the actual sound.</span></div>
          </div>
          <div class="output-pickers">
            <div><span>Aspect ratio</span><div class="choice-row"><button v-for="aspect in aspectRatios" :key="aspect.id" :class="{ active: aspectChoice === aspect.id }" @click="selectAspect(aspect.id)">{{ aspect.label }}</button></div></div>
            <div><span>Resolution</span><div class="choice-row"><button v-for="resolution in outputResolutions" :key="resolution" :class="{ active: resolutionChoice === resolution }" @click="selectResolution(resolution)">{{ resolution }}p</button><button :class="{ active: resolutionChoice === -1 }" @click="enableCustomResolution">Custom</button><label v-if="resolutionChoice === -1" class="custom-resolution"><input v-model.number="customWidth" type="number" min="2" max="7680" @change="setCustomDimension('width', customWidth)"><span>×</span><input v-model.number="customHeight" type="number" min="2" max="7680" @change="setCustomDimension('height', customHeight)"></label></div></div>
            <small>Output: {{ settings.outputWidth }} × {{ settings.outputHeight }}</small>
          </div>
        </div>

        <div class="advanced"><button @click="showAdvanced = !showAdvanced"><span><Icon name="fluent:settings-20-regular" /> Advanced settings <small>See and adjust everything this preset changed</small></span><Icon :name="showAdvanced ? 'fluent:chevron-up-20-regular' : 'fluent:chevron-down-20-regular'" /></button><div v-if="showAdvanced" class="advanced-grid">
          <label>Output format<select v-model="settings.format" @change="changeFormat"><option v-for="format in formats" :key="format" :value="format">{{ format.toUpperCase() }}</option></select></label>
          <template v-if="hasVideoEncodingOptions">
            <label>Video codec<select v-model="settings.videoCodec"><option v-for="codec in videoCodecOptions" :key="codec.value" :value="codec.value">{{ codec.label }}</option></select></label>
            <label>Video size<select v-model="settings.resolution"><option value="original">Original</option><option value="1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2">Up to 1080p</option><option value="1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2">Up to 720p</option><option value="854:480:force_original_aspect_ratio=decrease:force_divisible_by=2">Up to 480p</option></select></label>
            <label>Maximum frame rate<select v-model.number="settings.frameRate"><option :value="0">Original</option><option :value="24">Up to 24 fps</option><option :value="30">Up to 30 fps</option><option :value="60">Up to 60 fps</option></select></label>
            <label>Video quality (CRF)<input v-model.number="settings.quality" type="number" min="0" max="51"><small>Lower means higher quality</small></label>
          </template>
          <label>Audio codec<select v-model="settings.audioCodec"><option v-for="codec in audioCodecOptions" :key="codec.value" :value="codec.value">{{ codec.label }}</option></select></label>
          <label v-if="settings.format !== 'wav'">Audio quality<select v-model.number="settings.audioBitrate"><option :value="64">64 kbps</option><option :value="96">96 kbps</option><option :value="128">128 kbps</option><option :value="192">192 kbps</option><option :value="256">256 kbps</option><option :value="320">320 kbps</option></select></label>
        </div></div>
        <p v-if="error" class="error"><Icon name="fluent:error-circle-20-regular" /> {{ error }}</p>
        <footer class="actions"><span><Icon name="fluent:shield-checkmark-20-regular" /> Processed privately on your device</span><button class="primary" :disabled="!canStart" @click="start">{{ actionLabel }} <Icon name="fluent:arrow-right-20-regular" /></button></footer>
        </div>
      </section>

      <section v-else-if="step === 3 && media" class="processing">
        <div class="processing-visual"><template v-if="media.kind === 'video'"><video ref="processingVideo" :src="media.url" muted playsinline preload="auto" @loadeddata="drawPixelatedFrame" @seeked="drawPixelatedFrame" /><canvas ref="pixelatedFrame" class="pixelated-frame" width="96" height="52" :style="{ clipPath: `inset(0 0 0 ${ffmpeg.progress.value * 100}%)` }" /><span class="split-boundary" :style="{ left: `${ffmpeg.progress.value * 100}%` }" /></template><div v-else class="audio-visual"><span class="disc"><Icon name="fluent:music-note-2-24-filled" /></span><div class="wave"><i v-for="n in 34" :key="n" :style="{ animationDelay: `${n * -0.07}s` }" /></div></div><span class="live"><i /> Processing locally</span></div>
        <span class="kicker">Almost there</span><h1>{{ ffmpeg.status.value }}</h1><p>{{ Math.round(ffmpeg.progress.value * 100) }}% complete · Keep this tab open</p><div class="progress"><i :style="{ width: `${Math.max(2, ffmpeg.progress.value * 100)}%` }" /></div><button @click="requestNavigation(2)">Cancel</button>
      </section>

      <section v-else-if="step === 4 && media && result" class="done">
        <div class="done-icon"><Icon name="fluent:checkmark-32-filled" /></div><span class="kicker">All done</span><h1>Your file is ready.</h1><p>Converted entirely on your device. Nothing was uploaded anywhere.</p>
        <div class="result-card"><span class="result-icon"><Icon :name="settings.outputKind === 'video' ? 'fluent:video-24-regular' : 'fluent:music-note-2-24-regular'" /></span><div><strong>{{ result.fileName }}</strong><span>{{ size(result.size) }}<template v-if="savings"> · {{ savings }}% smaller</template></span></div><a :href="result.url" :download="result.fileName" @click="downloadResult"><Icon name="fluent:arrow-download-20-regular" /> Download</a></div>
        <button class="again" @click="requestNavigation(1)"><Icon name="fluent:add-20-regular" /> Work on another file</button>
      </section>
    </main>
    <footer class="site-footer">Made for you, not your data. <span>·</span> Runs entirely in your browser <span>·</span> <a href="/licenses.html">Licenses</a></footer>
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
.site-footer a { color: inherit; text-underline-offset: 2px; }
.site-footer a:hover { color: var(--text); }
.intent-grid { display: grid; gap: 10px; margin-top: 24px; }
.intent-grid > button { display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; align-items: center; gap: 14px; width: 100%; padding: 16px; border: 1px solid var(--line); border-radius: 15px; background: var(--surface); text-align: left; cursor: pointer; transition: .2s; }
.intent-grid > button:hover { border-color: var(--accent); background: var(--accent-soft); transform: translateX(3px); }
.intent-grid > button > span:nth-child(2) { display: grid; gap: 5px; }
.intent-grid strong { font-size: 12px; }
.intent-grid small { color: var(--muted); font-size: 9px; line-height: 1.5; }
.intent-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--surface-raised); color: var(--accent-strong); font-size: 21px; }
.intent-arrow { color: var(--muted); }
.change-path { display: inline-flex; align-items: center; gap: 6px; margin-top: 18px; padding: 7px 0; border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 9px; }
.change-path:hover { color: var(--text); }
.path-config .preset { min-height: 190px; }
.preset-summary { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; padding-top: 12px; }
.preset-summary i { padding: 4px 6px; border-radius: 5px; background: var(--surface-raised); color: var(--muted); font-size: 7px; font-style: normal; }
.format-row { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding: 13px 15px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.format-row > span { display: grid; gap: 3px; }
.format-row strong { font-size: 10px; }
.format-row small { color: var(--muted); font-size: 8px; }
.format-row select { min-width: 95px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-solid); color: var(--text); font-size: 9px; }
.backdrop-panel > .subheading { margin-top: 0; }
.advanced > button small { margin-left: 5px; color: var(--muted); font-size: 8px; font-weight: 400; }
.advanced-grid label > small { margin-top: -3px; font-size: 7px; }
.solid-editor { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: center; margin-top: 16px; }
.generated-preview { width: min(100%, calc(260px * var(--preview-ratio))); max-height: 260px; margin-inline: auto; }
.background-preview { border-radius: 13px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.solid-editor label { display: grid; gap: 10px; color: var(--muted); font-size: 9px; }
.solid-editor label span { display: flex; align-items: center; gap: 9px; }
.solid-editor input { width: 36px; height: 36px; padding: 0; border: 0; background: transparent; }
.solid-editor code { color: var(--text); }
.waveform-editor { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: center; margin-top: 16px; }
.waveform-preview { display: flex; align-items: center; justify-content: center; gap: .6%; padding: 0; overflow: hidden; border-radius: 13px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.waveform-preview i { flex: 1; min-width: 0; min-height: 1.2%; border-radius: 99px; background: linear-gradient(180deg, var(--accent-strong), var(--accent)); }
.waveform-editor > div:last-child { display: grid; gap: 7px; }
.waveform-editor strong { font-size: 10px; }
.waveform-editor span { color: var(--muted); font-size: 8px; line-height: 1.55; }
.image-upload { width: 100%; height: 260px; margin-top: 16px; transition: border-color .2s, background-color .2s; }
.image-upload.dragging { border-color: var(--accent); background: var(--accent-soft); }
.direct-cropper { position: relative; width: min(100%, calc(260px * var(--image-ratio))); max-height: 260px; margin: 16px auto 0; overflow: hidden; border-radius: 13px; background: #111; touch-action: none; user-select: none; }
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
.crop-hint.placeholder { visibility: hidden; }
.output-pickers { display: grid; gap: 14px; margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }
.output-pickers > div { display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 10px; }
.output-pickers > div > span { color: var(--muted); font-size: 9px; }
.choice-row { display: flex; flex-wrap: wrap; gap: 6px; }
.choice-row button { padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer; font-size: 8px; }
.choice-row button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
.custom-resolution { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); font-size: 8px; }
.custom-resolution input { width: 65px; padding: 7px 6px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-solid); color: var(--text); font-size: 8px; }
.output-pickers > small { justify-self: end; color: var(--muted); font-size: 8px; }
@media (max-width: 600px) { .solid-editor, .waveform-editor { grid-template-columns: 1fr; } .output-pickers > div { grid-template-columns: 1fr; } .path-config .preset { min-height: 150px; } .advanced > button small { display: none; } }
</style>
