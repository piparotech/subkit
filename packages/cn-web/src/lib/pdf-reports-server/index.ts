// Vendored Engine of the @piparo/pdf-reports-server module: the isomorphic, dependency-free PDF report
// engine (deterministic writer + shared schema + fetch client). Pure src/ only; the backend transport
// and the RN Shell are not vendored. The web showcase wires this Engine to an in-memory seam, so the
// audited engine + contract run unchanged with no server.
export * from './config'
export * from './report'
export * from './pdf'
export * from './client'
