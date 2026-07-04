import { computed, ref } from 'vue'

import { supportedTheme, themeStorageKey, type SupportedTheme, type ThemePreference } from '../constants/theme'

const mediaQuery = '(prefers-color-scheme: dark)'
const preference = ref<ThemePreference>('system')
const resolvedTheme = ref<SupportedTheme>('soundup')
let initialized = false
let attachedListener = false

function isSupportedTheme(value: string): value is SupportedTheme {
  return supportedTheme.includes(value as SupportedTheme)
}

function resolveTheme(value: ThemePreference): SupportedTheme {
  if (value !== 'system') {
    return value
  }

  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'soundup'
  }

  return window.matchMedia(mediaQuery).matches ? 'dark' : 'light'
}

function applyResolvedTheme(value: SupportedTheme) {
  resolvedTheme.value = value
  document.documentElement.setAttribute('data-theme', value)
}

function persistPreference(value: ThemePreference) {
  localStorage.setItem(themeStorageKey, value)
}

function setTheme(value: ThemePreference, options?: { skipPersist?: boolean }) {
  preference.value = value
  applyResolvedTheme(resolveTheme(value))

  if (!options?.skipPersist) {
    persistPreference(value)
  }
}

function onSystemThemeChanged() {
  if (preference.value !== 'system') {
    return
  }
  applyResolvedTheme(resolveTheme('system'))
}

function ensureSystemThemeListener() {
  if (attachedListener || typeof window === 'undefined' || !window.matchMedia) {
    return
  }

  const watcher = window.matchMedia(mediaQuery)
  if (watcher.addEventListener) {
    watcher.addEventListener('change', onSystemThemeChanged)
  } else {
    watcher.addListener(onSystemThemeChanged)
  }
  attachedListener = true
}

function initTheme() {
  if (initialized) {
    return
  }

  initialized = true
  ensureSystemThemeListener()

  const stored = localStorage.getItem(themeStorageKey)
  if (stored === 'system' || (stored && isSupportedTheme(stored))) {
    setTheme(stored, { skipPersist: true })
    return
  }

  setTheme('soundup', { skipPersist: true })
}

const themeOptions = computed(() => [
  { label: 'System', value: 'system' as ThemePreference },
  ...supportedTheme.map((value) => ({ label: value, value: value as ThemePreference })),
])

export function useTheme() {
  return {
    themePreference: preference,
    resolvedTheme,
    themeOptions,
    setTheme,
    initTheme,
  }
}
