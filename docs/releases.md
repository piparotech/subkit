# SDK releases

Changesets 3.0.2 prepares independent Core, Node and Expo versions and their
existing changelogs. Private docs have no package release. Publishing uses the
existing component-tag workflow and public npm Trusted Publishing, not GitHub
Packages or a second Changesets publisher.

## Prepare a release

1. Add consumer-facing notes with `pnpm changeset`; see `.changeset/README.md`.
2. Run `pnpm check`. Commit the reviewed implementation and changesets when
   authorized. Version preparation requires a clean worktree.
3. Run `pnpm release:version`. This consumes changesets, updates versions and
   changelogs, refreshes the lockfile and writes `release-plan.json` containing
   the source SHA and selected versions. Empty plans change no files.
4. Review the diff and run `pnpm check` again. Commit all release files as **one
   non-merge release commit directly after the recorded source SHA**. Keep
   implementation changes separate. If rebasing or squashing changes that parent,
   regenerate the record; never hand-edit it to bypass checks.
5. Push the release commit to main after approval. No packages publish on a main
   branch push. Each package publication requires an explicitly authorized tag.

## Publish selected component tags

Component tags remain:

- `subkit-core-vVERSION`
- `subkit-node-vVERSION`
- `subkit-expo-vVERSION`

Push only the intended tag explicitly; do not use blanket `git push --tags`.
Tag pushes are publication requests, not merely bookkeeping. Never move a tag
or republish an existing immutable version.

The tag workflow checks the tag version against the manifest and proves its
commit is contained in main. The full `pnpm check` gate runs on that revision.
`scripts/check-changeset-release-tag.mjs` reconstructs the release plan from the
source commit, checks the exact versioned manifests and consumed changesets, and
requires the tagged package in that selection. Changesets `type: none` entries
are not publish targets. Implementation/workflow changes cannot be hidden in a
version-only release commit.

For Node or Expo, the exact current Core version must already be publicly
available in both npm metadata representations. For a multi-package release,
**publish Core first and wait for successful verification before pushing the
Node/Expo tags**. Workflow concurrency does not guarantee tag arrival order.
An out-of-order dependent tag fails closed before publication; do not assume a
rejected tag means the package was published. Follow the verification/recovery
procedure before an explicitly authorized retry.

The workflow retains npm 11.11.0, `id-token: write`, the existing package-specific
Trusted Publisher configuration, public access and `https://registry.npmjs.org/`.
No npm token or new repository secret is required. It checks the selected version
is absent, packs only that SDK, publishes once, and verifies full and install-v1
npm metadata plus the exact package in an anonymous clean consumer. Existing
Expo subpath checks and immutable dependency resolution remain in the consumer.
Never reintroduce `changeset publish` or the retired GitHub-Packages publisher.

## Verify and recover

There is no `verify_existing` workflow input in this tag-based contract. Use the
existing read-only metadata verifier and anonymous registry consumer instead:

```sh
env -u NODE_AUTH_TOKEN node scripts/check-public-package-version.mjs \
  @piparotech/subkit-node VERSION present
SUBKIT_NPM_REGISTRY=https://registry.npmjs.org/ SUBKIT_RELEASE_PACKAGE=node \
  env -u NODE_AUTH_TOKEN pnpm packages:verify:registry
```

Use the exact name/version and package slug for the release under investigation.
The consumer reads versions from the release checkout's manifests. Never claim
verification from a different revision. Metadata propagation waits are bounded;
publication is not automatically retried.

After ambiguous transport failure, inspect the exact target before any retry.
If the version exists, verify it and repair only missing post-publish steps;
never republish. Other component tags publish independently: a successful Core
release is not undone by a failed Node/Expo job. For an unpublished component,
fix the cause and rerun all required gates before an explicitly authorized retry
of the same proven-absent target, or prepare a new forward-only version. If code
must change, make a new source/release commit pair and new version/tag. Never
force-move old tags, automatically replay failed mutations, or revert npm versions.

## Coordinate service adoption

SDK publication and service deployment have separate versions. Document API
capabilities, minimum SDK versions and rollout order for contract changes. A
successful SDK publish does not prove the corresponding API is deployed. Keep
service code, private operator details and customer information out of this repo.

## Integration verification

The Changesets integration was reconciled with remote main `25638a8`, preserving
Core 0.1.14, Node 0.1.11 and Expo 0.1.12 and their public registry configuration.
Release fixtures retain a fixed 0.x baseline so ordinary version bumps do not
break the regression matrix. `pnpm test:release` covers native versioning,
packed peers, historical changelogs, no-op wrappers, source/selection tampering,
component-tag selection and required Core identity. Existing public-registry and
tag-resolver tests remain in `pnpm packages:verify`.
