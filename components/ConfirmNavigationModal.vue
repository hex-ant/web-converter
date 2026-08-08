<script setup lang="ts">
defineProps<{ processing: boolean }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" role="presentation" @click.self="$emit('cancel')">
      <section class="modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-description">
        <span class="icon"><Icon name="fluent:warning-24-regular" /></span>
        <h2 id="leave-title">{{ processing ? 'Stop this export?' : 'Leave without downloading?' }}</h2>
        <p id="leave-description">{{ processing ? 'Processing will be cancelled and its current progress will be lost.' : 'Your finished file has not been downloaded. Leaving will discard it, and you would need to process it again.' }}</p>
        <div class="buttons"><button type="button" @click="$emit('cancel')">Stay here</button><button class="confirm" type="button" @click="$emit('confirm')">{{ processing ? 'Stop and leave' : 'Discard and leave' }}</button></div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(10, 9, 7, .58); backdrop-filter: blur(6px); }
.modal { width: min(410px, 100%); padding: 27px; border: 1px solid var(--line); border-radius: 20px; background: var(--surface-solid); box-shadow: 0 30px 100px rgba(0, 0, 0, .35); }
.icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--accent-soft); color: var(--accent-strong); font-size: 22px; }
h2 { margin: 18px 0 9px; font-size: 19px; font-weight: 600; letter-spacing: -.03em; }
p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.65; }
.buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 25px; }
button { padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--text); cursor: pointer; font-size: 10px; }
button.confirm { border-color: var(--accent); background: var(--accent); color: #2b1900; font-weight: 600; }
</style>
