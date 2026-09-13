import { assembleReleasePlan } from '@changesets/assemble-release-plan'
import { readConfig } from '@changesets/config'
import { readChangesets } from '@changesets/read'
import { getPackages } from '@manypkg/get-packages'

const allowed = new Set([
  '@piparotech/subkit-core',
  '@piparotech/subkit-node',
  '@piparotech/subkit-expo',
])

export async function getPlan(root) {
  const packages = await getPackages(root)
  const { config, errors } = await readConfig(root, packages)
  if (errors?.length) throw new Error(errors.join('\n'))
  const changesets = await readChangesets(root)
  for (const changeset of changesets) {
    if (!changeset.summary.trim() && changeset.releases.length) {
      throw new Error(`Missing release summary: ${changeset.id}`)
    }
    for (const release of changeset.releases) {
      if (!allowed.has(release.name) || !['patch', 'minor', 'major'].includes(release.type)) {
        throw new Error(`Invalid release in ${changeset.id}: ${release.name}/${release.type}`)
      }
    }
  }
  return assembleReleasePlan(changesets, packages, config)
}

export function releasedPackages(plan) {
  const order = [...allowed]
  return plan.releases
    .filter((release) => release.type !== 'none')
    .map(({ name, type, oldVersion, newVersion }) => ({ name, type, oldVersion, newVersion }))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
}
