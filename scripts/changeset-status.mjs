import { resolve } from 'node:path'

import { getPlan, releasedPackages } from './changeset-plan.mjs'

const plan = await getPlan(resolve(import.meta.dirname, '..'))
console.log(
  JSON.stringify({ changesets: plan.changesets.length, releases: releasedPackages(plan) }, null, 2),
)
