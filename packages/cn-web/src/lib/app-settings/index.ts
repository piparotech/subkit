// @piparo/app-settings — on-device app settings without login (capability app-settings; 1:1 module).
// Language, theme and text size persisted via MMKV (the storage seam), an on-device push-topic
// subscription store, and a push-permission soft-ask priming state machine. The schlanke Vorstufe to
// auth-core + profile-basic: no account, no backend — kept migratable to an account on later login.
// The reactive hooks + cn-native screens live in app/ (the vendored Shell).
export * from './config'
export * from './storage'
export * from './settings'
export * from './topics'
export * from './priming'
