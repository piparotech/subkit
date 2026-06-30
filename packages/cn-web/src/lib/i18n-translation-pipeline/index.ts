// i18n-translation-pipeline — the automated PO-fill Engine (capability i18n-translation-pipeline;
// 1:1 module), vendored from piparo-platform. Fills ONLY empty `msgstr`/`msgstr[N]` entries via an
// injected, provider-neutral translator (DeepL/LLM), stamps each with a machine marker for reviewer
// filtering, batches the work, persists after every batch (bounded loss on abort), and enforces a
// quota guard. Pure + isomorphic; the run controller + status UI are the Shell.
export * from './config'
export * from './po'
export * from './markers'
export * from './coverage'
export * from './quota'
export * from './translator'
export * from './pipeline'
