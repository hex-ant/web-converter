<script setup lang="ts">
import type { MediaFileInfo, ProcessResult, ProcessSettings, ToolMode, OutputKind } from '~/types/media'
import { compressPresets, convertPresets, formatsFor, resolutions } from '~/utils/presets'

const step = ref(1)
const media = ref<MediaFileInfo | null>(null)
const result = ref<ProcessResult | null>(null)
const error = ref('')
const probing = ref(false)
const showAdvanced = ref(false)
const { probe } = useMediaProbe()
const ffmpeg = useFfmpeg()
const settings = reactive<ProcessSettings>({ tool: 'convert', outputKind: 'video', presetId: 'compatible', format: 'mp4', videoCodec: 'libx264', audioCodec: 'aac', resolution: 'original', frameRate: 30, quality: 23, audioBitrate: 192, backdropMode: 'color', backdropColor: '#17130c', backdropImage: null, backdropImageUrl: '', outputWidth: 1920, outputHeight: 1080, cropX: 50, cropY: 50, cropScale: 100 })
const presets = computed(() => settings.tool === 'compress' ? compressPresets : convertPresets[settings.outputKind])
const formats = computed(() => media.value ? formatsFor(media.value.kind, settings.outputKind) : ['mp4'])
const isAudioToVideo = computed(() => media.value?.kind === 'audio' && settings.outputKind === 'video')
const canStart = computed(() => !isAudioToVideo.value || settings.backdropMode === 'color' || !!settings.backdropImage)

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
function chooseBackdrop(files: FileList | null) { const file = files?.[0]; if (!file) return; if (settings.backdropImageUrl) URL.revokeObjectURL(settings.backdropImageUrl); settings.backdropImage = file; settings.backdropImageUrl = URL.createObjectURL(file) }
function selectResolution(width: number, height: number) { settings.outputWidth = width; settings.outputHeight = height }
async function start() { if (!media.value || !canStart.value) return; step.value = 3; error.value = ''; try { result.value = await ffmpeg.process(media.value, settings); step.value = 4 } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Processing stopped unexpectedly.'; step.value = 2 } }
function reset() { if (result.value) URL.revokeObjectURL(result.value.url); result.value = null; removeFile() }
const size = (bytes: number) => bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(1)} MB`
const savings = computed(() => media.value && result.value ? Math.max(0, Math.round((1 - result.value.size / media.value.file.size) * 100)) : 0)
onBeforeUnmount(() => { if (media.value) URL.revokeObjectURL(media.value.url); if (result.value) URL.revokeObjectURL(result.value.url); if (settings.backdropImageUrl) URL.revokeObjectURL(settings.backdropImageUrl) })
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main>
      <StepIndicator :current="step" />
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
        <div class="preset-grid"><button v-for="preset in presets" :key="preset.id" class="preset" :class="{ selected: settings.presetId === preset.id }" @click="settings.presetId = preset.id"><span class="preset-icon"><Icon :name="preset.icon" /></span><strong>{{ preset.title }}</strong><small>{{ preset.description }}</small><span class="radio"><Icon v-if="settings.presetId === preset.id" name="fluent:checkmark-12-bold" /></span></button></div>

        <div v-if="isAudioToVideo" class="backdrop-panel">
          <div class="subheading"><span>What should the video show?</span><small>Your audio will play over this background</small></div>
          <div class="backdrop-tabs"><button :class="{ active: settings.backdropMode === 'color' }" @click="settings.backdropMode = 'color'"><Icon name="fluent:color-20-regular" /> Solid color</button><button :class="{ active: settings.backdropMode === 'image' }" @click="settings.backdropMode = 'image'"><Icon name="fluent:image-20-regular" /> Your image</button></div>
          <div v-if="settings.backdropMode === 'color'" class="color-choice"><div class="color-preview" :style="{ background: settings.backdropColor }"><span class="audio-mark"><i v-for="n in 9" :key="n" :style="{ height: `${10 + (n % 4) * 8}px` }" /></span></div><label>Background color <span><input v-model="settings.backdropColor" type="color"><code>{{ settings.backdropColor.toUpperCase() }}</code></span></label></div>
          <div v-else class="image-choice">
            <label v-if="!settings.backdropImageUrl" class="image-upload"><Icon name="fluent:image-add-24-regular" /><strong>Choose a cover image</strong><span>JPG, PNG or WebP</span><input class="sr-only" type="file" accept="image/*" @change="chooseBackdrop(($event.target as HTMLInputElement).files)"></label>
            <div v-else class="cropper" :style="{ aspectRatio: `${settings.outputWidth}/${settings.outputHeight}` }"><img :src="settings.backdropImageUrl" alt="Cover crop preview" :style="{ objectPosition: `${settings.cropX}% ${settings.cropY}%`, transform: `scale(${settings.cropScale / 100})` }"><span class="crop-grid" /><label class="replace">Replace<input class="sr-only" type="file" accept="image/*" @change="chooseBackdrop(($event.target as HTMLInputElement).files)"></label></div>
            <div v-if="settings.backdropImageUrl" class="crop-controls"><label>Horizontal<input v-model="settings.cropX" type="range" min="0" max="100"></label><label>Vertical<input v-model="settings.cropY" type="range" min="0" max="100"></label><label>Zoom<input v-model="settings.cropScale" type="range" min="100" max="200"></label></div>
          </div>
          <div class="resolution-row"><span>Video shape</span><button v-for="resolution in resolutions" :key="resolution.label" :class="{ active: settings.outputWidth === resolution.width && settings.outputHeight === resolution.height }" @click="selectResolution(resolution.width, resolution.height)">{{ resolution.label }}<small>{{ resolution.width }} × {{ resolution.height }}</small></button><label class="custom-size"><input v-model.number="settings.outputWidth" type="number" min="240" max="3840"> × <input v-model.number="settings.outputHeight" type="number" min="240" max="3840"></label></div>
        </div>

        <div class="advanced"><button @click="showAdvanced = !showAdvanced"><span><Icon name="fluent:settings-20-regular" /> Advanced settings</span><Icon :name="showAdvanced ? 'fluent:chevron-up-20-regular' : 'fluent:chevron-down-20-regular'" /></button><div v-if="showAdvanced" class="advanced-grid"><label v-if="settings.outputKind === 'video'">Video codec<select v-model="settings.videoCodec"><option value="libx264">H.264</option><option value="libvpx-vp9">VP9</option></select></label><label v-if="settings.outputKind === 'video'">Frame rate<input v-model.number="settings.frameRate" type="number" min="12" max="60"></label><label v-if="settings.outputKind === 'video'">CRF quality<input v-model.number="settings.quality" type="number" min="0" max="51"></label><label>Audio bitrate<select v-model.number="settings.audioBitrate"><option :value="64">64 kbps</option><option :value="128">128 kbps</option><option :value="192">192 kbps</option><option :value="320">320 kbps</option></select></label></div></div>
        <p v-if="error" class="error"><Icon name="fluent:error-circle-20-regular" /> {{ error }}</p>
        <footer class="actions"><span><Icon name="fluent:shield-checkmark-20-regular" /> Processed privately on your device</span><button class="primary" :disabled="!canStart" @click="start">Start {{ settings.tool === 'convert' ? 'converting' : 'compressing' }} <Icon name="fluent:arrow-right-20-regular" /></button></footer>
      </section>

      <section v-else-if="step === 3 && media" class="processing">
        <div class="processing-visual"><video v-if="media.kind === 'video'" :src="media.url" muted autoplay loop /><div v-else class="audio-visual"><span class="disc"><Icon name="fluent:music-note-2-32-filled" /></span><div class="wave"><i v-for="n in 34" :key="n" :style="{ animationDelay: `${n * -0.07}s` }" /></div></div><div class="scan" /><span class="live"><i /> Processing locally</span></div>
        <span class="kicker">Almost there</span><h1>{{ ffmpeg.status.value }}</h1><p>{{ Math.round(ffmpeg.progress.value * 100) }}% complete · Keep this tab open</p><div class="progress"><i :style="{ width: `${Math.max(2, ffmpeg.progress.value * 100)}%` }" /></div><button @click="ffmpeg.cancel(); step = 2">Cancel</button>
      </section>

      <section v-else-if="step === 4 && media && result" class="done">
        <div class="done-icon"><Icon name="fluent:checkmark-32-bold" /></div><span class="kicker">All done</span><h1>Your file is ready.</h1><p>Converted entirely on your device. Nothing was uploaded anywhere.</p>
        <div class="result-card"><span class="result-icon"><Icon :name="settings.outputKind === 'video' ? 'fluent:video-24-regular' : 'fluent:music-note-2-24-regular'" /></span><div><strong>{{ result.fileName }}</strong><span>{{ size(result.size) }}<template v-if="savings"> · {{ savings }}% smaller</template></span></div><a :href="result.url" :download="result.fileName"><Icon name="fluent:arrow-download-20-regular" /> Download</a></div>
        <button class="again" @click="reset"><Icon name="fluent:add-20-regular" /> Work on another file</button>
      </section>
    </main>
    <footer class="site-footer">Made for your files, not your data. <span>·</span> Runs with FFmpeg WebAssembly</footer>
  </div>
</template>

<style scoped src="~/assets/css/page.css"></style>
