import { Capacitor } from '@capacitor/core'

export const platform = Capacitor.getPlatform()

export function isNativePlatform() {
  return Capacitor.isNativePlatform()
}

export function isAndroidPlatform() {
  return platform === 'android'
}

export function isIosPlatform() {
  return platform === 'ios'
}

export function isWebPlatform() {
  return platform === 'web'
}

export function isPluginAvailable(pluginName: string) {
  return Capacitor.isPluginAvailable(pluginName)
}