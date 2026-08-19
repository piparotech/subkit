const [packageName, packageVersion, expectedState] = process.argv.slice(2)

if (!packageName?.startsWith('@piparotech/') || !packageVersion) {
  throw new Error('Expected a @piparotech package name and version')
}
if (!['absent', 'present'].includes(expectedState)) {
  throw new Error('Expected state must be absent or present')
}
if (process.env.NODE_AUTH_TOKEN != null) {
  throw new Error('Public npm metadata verification must not receive NODE_AUTH_TOKEN')
}

const packagePath = encodeURIComponent(packageName)
const url = `https://registry.npmjs.org/${packagePath}`
const fetchPackument = (accept) =>
  fetch(url, {
    headers: {
      accept,
      'cache-control': 'no-cache',
    },
  })
const response = await fetchPackument('application/json')

if (expectedState === 'absent') {
  if (response.status === 404) {
    console.log(`Verified ${packageName}@${packageVersion} is absent from public npm.`)
    process.exit(0)
  }
  if (response.ok) {
    throw new Error(`${packageName}@${packageVersion} already exists; publication is forbidden`)
  }
  throw new Error(`Could not prove package absence: public npm returned HTTP ${response.status}`)
}

if (!response.ok) {
  throw new Error(
    `Public npm returned HTTP ${response.status} for ${packageName}@${packageVersion}`,
  )
}
const packument = await response.json()
const metadata = packument?.versions?.[packageVersion]
if (
  packument?.name !== packageName ||
  metadata?.name !== packageName ||
  metadata?.version !== packageVersion ||
  typeof metadata?.dist?.integrity !== 'string' ||
  !metadata.dist.integrity.startsWith('sha512-') ||
  typeof metadata?.dist?.tarball !== 'string' ||
  !metadata.dist.tarball.startsWith('https://registry.npmjs.org/')
) {
  throw new Error(`Public npm metadata is incomplete for ${packageName}@${packageVersion}`)
}
const installationResponse = await fetchPackument('application/vnd.npm.install-v1+json')
if (!installationResponse.ok) {
  throw new Error(
    `Public npm install metadata returned HTTP ${installationResponse.status} for ${packageName}@${packageVersion}`,
  )
}
const installationPackument = await installationResponse.json()
const installationMetadata = installationPackument?.versions?.[packageVersion]
if (
  installationPackument?.name !== packageName ||
  installationMetadata?.name !== packageName ||
  installationMetadata?.version !== packageVersion ||
  installationMetadata?.dist?.integrity !== metadata.dist.integrity ||
  installationMetadata?.dist?.tarball !== metadata.dist.tarball
) {
  throw new Error(`Public npm install metadata is incomplete for ${packageName}@${packageVersion}`)
}
console.log(`Verified public npm metadata for ${packageName}@${packageVersion}.`)
