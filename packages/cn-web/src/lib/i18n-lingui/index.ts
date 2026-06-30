// i18n-lingui Engine (vendored, web showcase): the pure, isomorphic core of Lingui-based multi-language
// with a runtime locale switch. The config schema, the locale registry + device-locale negotiation,
// the source-text fallback resolver (untranslated keys show the source text, not the key), and a
// storage-agnostic versioned persistence seam. No Lingui, no React, no platform APIs — the Shell wires
// those in. Vendored from piparo-platform/modules/i18n-lingui/src (backend + RN app dropped).
export * from './config'
export * from './locales'
export * from './fallback'
export * from './persist'
