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
    <p>Convert, compress, or extract audio from your files.<br class="medium-break"> <span class="no-break">Locally in your browser.</span> <strong class="no-break">Nothing gets uploaded.</strong><br><span class="intro-meta">Free · No account · <a href="https://github.com/hex-ant/web-converter" target="_blank" rel="noopener noreferrer">Open source</a></span></p>
    <button class="drop" :class="{ dragging }" type="button" @click="input?.click()" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="dragging = false; accept($event.dataTransfer?.files || null)">
      <span class="drop-icon"><Icon name="fluent:arrow-upload-24-regular" /></span>
      <strong>{{ busy ? 'Reading your file…' : 'Drop a video or audio here' }}</strong>
      <small class="formats">MP4, MOV, WebM, MP3, WAV, M4A and more</small>
      <span class="drop-privacy"><Icon name="fluent:lock-closed-20-regular" /> Your files never leave this device</span>
    </button>
    <input ref="input" class="sr-only" type="file" accept="video/*,audio/*" @change="accept(($event.target as HTMLInputElement).files)">
    <p v-if="error" class="error"><Icon name="fluent:error-circle-20-regular" /> {{ error }}</p>
    <section class="privacy-section" aria-labelledby="privacy-title">
      <span class="privacy-rule" />
      <h2 id="privacy-title">How it stays private</h2>
      <div class="privacy-points">
        <article>
          <Icon name="fluent:phone-laptop-24-regular" />
          <div>
            <h3>Processed on your device.</h3>
            <p>Your files stay in your browser. They’re never uploaded to a server.</p>
          </div>
        </article>
        <article>
          <Icon name="fluent:person-prohibited-24-regular" />
          <div>
            <h3>No account required.</h3>
            <p>Just visit the website, drop a file, and do the job.</p>
          </div>
        </article>
        <article>
          <Icon name="simple-icons:github" />
          <div>
            <h3>Open source.</h3>
            <p>Don’t take my word for it. The <a href="https://github.com/hex-ant/web-converter" target="_blank" rel="noopener noreferrer">source code is public</a>.</p>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.intro { text-align: center; padding: 50px 20px 80px; }
.eyebrow { display: inline-flex; align-items: center; gap: 9px; color: var(--accent-strong); font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
.eyebrow span { width: 5px; height: 5px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 5px var(--accent-soft); }
h1 { margin: 12px 0 15px; font-size: clamp(42px, 7vw, 76px); line-height: .98; letter-spacing: -.06em; font-weight: 500; }
h1 em {
  color: var(--accent);
  font-family: 'Bodoni Moda', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.05em;
  font-variant-ligatures: common-ligatures;
  font-feature-settings: 'liga' 1;
}
.intro > p { color: var(--muted); margin: 0 auto 34px; font-size: 15px; line-height: 1.6; }
.drop { position: relative; display: flex; flex-direction: column; align-items: center; width: min(610px, 100%); min-height: 260px; margin: auto; padding: 42px 24px 28px; border: 1px dashed var(--line); border-radius: 24px; color: var(--text); background: var(--surface); box-shadow: var(--shadow); cursor: pointer; transition: .25s; overflow: hidden; }
.drop::before { content: ''; position: absolute; width: 180px; height: 180px; border-radius: 50%; background: var(--accent); opacity: .08; filter: blur(30px); top: -95px; }
.drop:hover, .drop.dragging { border-color: var(--accent); transform: translateY(-3px); background: var(--surface-solid); }
.drop-icon { z-index: 1; display: grid; place-items: center; width: 54px; height: 54px; margin-bottom: 20px; border-radius: 17px; background: var(--accent); color: #2a1900; font-size: 26px; box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 30%, transparent); }
.drop strong { font-size: 16px; font-weight: 600; }
.drop .formats { margin-top: 8px; color: var(--muted); opacity: .75; font-size: 10px; }
.drop .drop-privacy { display: flex; align-items: center; gap: 7px; margin-top: auto; color: var(--muted); font-size: 11px; }
.intro .error { margin-top: 18px; color: var(--danger); }
.intro-meta { color: color-mix(in srgb, var(--muted) 70%, transparent); font-size: 12px; }
.intro-meta a { color: inherit; text-underline-offset: 2px; }
.intro-meta a:hover { color: var(--text); }
.no-break { white-space: nowrap; }
.medium-break { display: none; }
.privacy-section { width: min(760px, 100%); margin: 74px auto 0; text-align: left; }
.privacy-rule { display: block; width: 32px; height: 2px; margin: 0 auto 17px; border-radius: 99px; background: var(--accent); }
.privacy-section > h2 { margin: 0 0 28px; text-align: center; font-size: clamp(22px, 3vw, 29px); font-weight: 500; letter-spacing: -.035em; }
.privacy-points { display: grid; grid-template-columns: repeat(3, 1fr); gap: 34px; }
.privacy-points article { display: flex; align-items: flex-start; gap: 13px; }
.privacy-points article > :first-child { flex: 0 0 auto; margin-top: 2px; color: var(--accent-strong); font-size: 20px; }
.privacy-points h3 { margin: 0 0 7px; font-size: 13px; font-weight: 600; line-height: 1.45; }
.privacy-points p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.65; }
.privacy-points a { color: inherit; text-underline-offset: 2px; }
.privacy-points a:hover { color: var(--text); }
@media (min-width: 641px) {
  .medium-break { display: block; }
}
@media (max-width: 700px) {
  .privacy-section { margin-top: 56px; }
  .privacy-points { grid-template-columns: 1fr; gap: 22px; max-width: 430px; margin: auto; }
}
</style>
