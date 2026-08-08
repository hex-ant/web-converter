<script setup lang="ts">
defineProps<{ current: number }>()
defineEmits<{ navigate: [step: number] }>()
const steps = ['Choose file', 'Set your goal', 'Processing', 'Done']
</script>

<template>
  <nav class="steps" aria-label="Progress">
    <template v-for="(label, index) in steps" :key="label">
      <button class="step" :class="{ active: index + 1 === current, complete: index + 1 < current }" type="button" :disabled="index + 1 >= current" @click="$emit('navigate', index + 1)">
        <span class="number"><Icon v-if="index + 1 < current" name="fluent:checkmark-16-filled" /><template v-else>{{ index + 1 }}</template></span>
        <span class="label">{{ label }}</span>
      </button>
      <span v-if="index < steps.length - 1" class="line" :class="{ filled: index + 1 < current }" />
    </template>
  </nav>
</template>

<style scoped>
.steps { display: flex; align-items: center; justify-content: center; width: min(650px, 100%); margin: 18px auto 42px; }
.step { display: flex; align-items: center; gap: 9px; padding: 0; border: 0; background: transparent; color: var(--muted); font-size: 12px; white-space: nowrap; }
.step.complete { cursor: pointer; }
.step.complete:hover .label { color: var(--text); }
.step:disabled { cursor: default; }
.number { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; font-size: 11px; font-weight: 600; }
.step.active { color: var(--text); }
.step.active .number { background: var(--accent); color: #291900; border-color: var(--accent); }
.step.complete .number { color: var(--accent-strong); background: var(--accent-soft); border-color: transparent; }
.line { width: clamp(18px, 7vw, 74px); height: 1px; background: var(--line); margin: 0 12px; }
.line.filled { background: var(--accent); }
@media (max-width: 600px) { .steps { margin-bottom: 30px; } .label { display: none; } .line { flex: 1; } }
</style>
