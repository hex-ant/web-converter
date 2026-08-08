<script setup lang="ts">
const colorMode = useColorMode()
defineEmits<{ home: [] }>()
const isDark = computed(() => colorMode.value === 'dark')
const toggleTheme = () => { colorMode.preference = isDark.value ? 'light' : 'dark' }
</script>

<template>
  <header class="header">
    <button class="brand" type="button" aria-label="Go to start" @click="$emit('home')">
      <span class="brand-mark"><Icon name="fluent:shapes-24-filled" /></span>
      <span>amber</span>
    </button>
    <div class="privacy"><Icon name="fluent:lock-closed-20-regular" /> Your files never leave this device</div>
    <button class="theme-button" type="button" :aria-label="`Use ${isDark ? 'light' : 'dark'} mode`" @click="toggleTheme">
      <Icon :name="isDark ? 'fluent:weather-sunny-24-regular' : 'fluent:weather-moon-24-regular'" />
    </button>
  </header>
</template>

<style scoped>
.header { height: 76px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; max-width: 1180px; margin: auto; padding: 0 28px; }
.brand { display: flex; align-items: center; gap: 10px; padding: 0; border: 0; background: transparent; color: inherit; font-size: 19px; font-weight: 600; letter-spacing: -.5px; cursor: pointer; }
.brand-mark { display: grid; place-items: center; width: 31px; height: 31px; border-radius: 10px; color: #241600; background: var(--accent); font-size: 19px; transform: rotate(-4deg); }
.privacy { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px; }
.theme-button { justify-self: end; display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--line); background: var(--surface); border-radius: 50%; cursor: pointer; font-size: 20px; transition: .2s; }
.theme-button:hover { border-color: var(--accent); transform: rotate(8deg); }
@media (max-width: 640px) { .header { grid-template-columns: 1fr auto; padding: 0 18px; } .privacy { display: none; } }
</style>
