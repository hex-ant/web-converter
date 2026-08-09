<script setup lang="ts">
defineProps<{ busy?: boolean; error?: string }>()
const emit = defineEmits<{ select: [file: File] }>()
const dragging = ref(false)
const input = ref<HTMLInputElement>()

const accept = (files: FileList | null) => {
  const file = files?.[0]
  if (file) emit('select', file)
}
</script>

<template>
  <section class="intro">
    <div class="eyebrow"><span /> Private media tools</div>
    <h1>Make your media<br><em>fit the moment.</em></h1>
    <p>Convert or shrink any video and audio, right here in your browser.</p>
    <button class="drop" :class="{ dragging }" type="button" @click="input?.click()" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="dragging = false; accept($event.dataTransfer?.files || null)">
      <span class="drop-icon"><Icon name="fluent:arrow-upload-24-regular" /></span>
      <strong>{{ busy ? 'Reading your file…' : 'Drop a video or audio here' }}</strong>
      <span>or choose a file from your device</span>
      <small>MP4, MOV, WebM, MP3, WAV, M4A and more</small>
    </button>
    <input ref="input" class="sr-only" type="file" accept="video/*,audio/*" @change="accept(($event.target as HTMLInputElement).files)">
    <p v-if="error" class="error"><Icon name="fluent:error-circle-20-regular" /> {{ error }}</p>
  </section>
</template>

<style scoped>
.intro { text-align: center; padding: 50px 20px 80px; }
.eyebrow { display: inline-flex; align-items: center; gap: 9px; color: var(--accent-strong); font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
.eyebrow span { width: 5px; height: 5px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 5px var(--accent-soft); }
h1 { margin: 20px 0 15px; font-size: clamp(42px, 7vw, 76px); line-height: .98; letter-spacing: -.06em; font-weight: 500; }
h1 em {
  color: var(--accent);
  font-family: 'Bodoni Moda', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.05em;
  font-variant-ligatures: common-ligatures;
  font-feature-settings: 'liga' 1;
}
.intro > p { color: var(--muted); margin: 0 auto 34px; font-size: 15px; }
.drop { position: relative; display: flex; flex-direction: column; align-items: center; width: min(610px, 100%); min-height: 260px; margin: auto; padding: 42px 24px 28px; border: 1px dashed var(--line); border-radius: 24px; color: var(--text); background: var(--surface); box-shadow: var(--shadow); cursor: pointer; transition: .25s; overflow: hidden; }
.drop::before { content: ''; position: absolute; width: 180px; height: 180px; border-radius: 50%; background: var(--accent); opacity: .08; filter: blur(30px); top: -95px; }
.drop:hover, .drop.dragging { border-color: var(--accent); transform: translateY(-3px); background: var(--surface-solid); }
.drop-icon { z-index: 1; display: grid; place-items: center; width: 54px; height: 54px; margin-bottom: 20px; border-radius: 17px; background: var(--accent); color: #2a1900; font-size: 26px; box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 30%, transparent); }
.drop strong { font-size: 16px; font-weight: 600; }
.drop > span:not(.drop-icon) { margin-top: 7px; color: var(--muted); font-size: 13px; }
.drop small { margin-top: auto; color: var(--muted); opacity: .75; font-size: 10px; }
.intro .error { margin-top: 18px; color: var(--danger); }
</style>
