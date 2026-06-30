/**
 * The on-device persistence seam. The Engine is storage-agnostic: it reads/writes a single string
 * value under a key. The Shell wires this to MMKV (synchronous, fast, survives restart); tests and
 * the isomorphic engine use the in-memory default. Keeping the seam string-in/string-out makes the
 * store trivially backed by MMKV's `getString`/`set` AND by `AsyncStorage`/`localStorage` if needed.
 */
export type SettingsStorage = {
  getString(key: string): string | undefined
  set(key: string, value: string): void
  delete(key: string): void
}

export function inMemorySettingsStorage(): SettingsStorage {
  const map = new Map<string, string>()
  return {
    getString: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
    delete: (key) => void map.delete(key),
  }
}

/** The MMKV instance shape the Shell adapter relies on (declared, not imported — RN-only dep). */
export type MmkvLike = {
  getString(key: string): string | undefined
  set(key: string, value: string): void
  delete(key: string): void
}

/** Adapt a react-native-mmkv instance to the storage seam. Used by the Shell on-device. */
export function mmkvSettingsStorage(mmkv: MmkvLike): SettingsStorage {
  return {
    getString: (key) => mmkv.getString(key),
    set: (key, value) => mmkv.set(key, value),
    delete: (key) => mmkv.delete(key),
  }
}
