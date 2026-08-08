<script setup lang="ts">
import type { MediaFileInfo } from '~/types/media'
defineProps<{ media: MediaFileInfo }>()
defineEmits<{ remove: [] }>()
const size = (bytes: number) => bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(1)} MB`
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
</script>

<template>
  <div class="file-card">
    <div class="thumb">
      <video v-if="media.kind === 'video'" :src="media.url" muted />
      <Icon v-else name="fluent:music-note-2-24-regular" />
      <span><Icon :name="media.kind === 'video' ? 'fluent:video-20-filled' : 'fluent:speaker-2-20-filled'" /></span>
    </div>
    <div class="info">
      <strong>{{ media.file.name }}</strong>
      <span>{{ size(media.file.size) }} · {{ time(media.duration) }}<template v-if="media.width"> · {{ media.width }} × {{ media.height }}</template></span>
    </div>
    <span class="ready"><Icon name="fluent:checkmark-circle-20-filled" /> Ready</span>
    <button type="button" aria-label="Remove file" @click="$emit('remove')"><Icon name="fluent:dismiss-20-regular" /></button>
  </div>
</template>

<style scoped>
.file-card { display: grid; grid-template-columns: 58px minmax(0, 1fr) auto auto; gap: 16px; align-items: center; padding: 12px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); }
.thumb { position: relative; width: 58px; height: 48px; border-radius: 10px; background: var(--surface-raised); display: grid; place-items: center; overflow: hidden; color: var(--accent); font-size: 24px; }
.thumb video { width: 100%; height: 100%; object-fit: cover; }
.thumb > span { position: absolute; bottom: 3px; right: 3px; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 5px; background: rgba(0,0,0,.65); color: white; font-size: 11px; }
.info { min-width: 0; display: grid; gap: 5px; text-align: left; }
.info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.info span { color: var(--muted); font-size: 11px; }
.ready { display: flex; align-items: center; gap: 5px; color: #5b9b56; font-size: 11px; }
button { border: 0; background: transparent; color: var(--muted); font-size: 18px; cursor: pointer; }
@media(max-width: 520px) { .ready { display: none; } }
</style>
