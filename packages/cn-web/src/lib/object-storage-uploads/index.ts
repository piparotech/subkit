// object-storage-uploads — S3-compatible object storage + presigned-URL file upload (capability
// object-storage-uploads; 1:1 module). Auth-module-agnostic: every object is keyed by the verified
// owner subject, so a caller only ever touches their own objects. The file bytes go DIRECT to storage
// via short-lived presigned URLs, never through the app server. The provider is reached only through
// the StoragePresigner seam, so an S3 / MinIO / R2 switch is a config change, not an API change.
// src/ (config + shared schema + isomorphic client + presigner) is the Engine vendored into the
// showcase; backend/ and the RN Shell stay in the platform module.
export * from './config'
export * from './uploads'
export * from './storage'
export * from './sigv4'
export * from './client'
