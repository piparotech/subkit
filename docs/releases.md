# SDK releases

Core, Node and Expo use independent versions and existing per-package changelogs.
Changesets 3.0.2 prepares versions and notes; it does not publish or create tags.
The private docs workspace has no package release. Historical changelog sections
are retained, not reconstructed from Git.

## Prepare

1. Add reviewed changesets with implementation changes. See `.changeset/README.md`.
2. Run `pnpm check`. Commit the reviewed implementation and changesets when
   explicitly authorized. The worktree must be clean before version preparation.
3. Run `pnpm release:version`. This consumes changesets, updates package versions
   and notes, refreshes the lockfile, and writes `release-plan.json` containing the
   exact source SHA and selected versions. An empty plan changes no files.
4. Review the diff and run `pnpm check` again. Commit all release files together
   as **one non-merge release commit directly after the recorded source SHA**.
   Do not combine implementation changes with version preparation. Rebase or
   squash operations that change the parent require regenerating this record.
5. Push/merge only with explicit authorization. The release workflow must run
   on trusted `main` at this exact release commit. No extra follow-up commit may
   be substituted: prepare a new release candidate if the parent contract fails.

The publisher reconstructs the selection from source-commit manifests and
changesets, compares it with the record, checks current versions/changelogs and
requires all changesets consumed. Source files and workflow changes are forbidden
in a release commit. Selection ignores Changesets `type: none` entries. In
particular a Core patch must not republish unchanged Node/Expo versions simply
because newly packing them would resolve a newer `workspace:^` peer.

## Publish and verify

The manually dispatched `.github/workflows/release-packages.yml` retains GitHub
Packages (`https://npm.pkg.github.com/`, restricted access), step-scoped temporary
authentication, `contents: read`, `packages: write`, trusted `main` and exact SHA.
It runs the full `pnpm check` gate for that SHA before publication.

It preflights **every selected version before any publish**, refusing existing
versions or ambiguous registry/authentication responses. It packs only selected
packages, publishes Core before selected Node/Expo dependents, and verifies exact
versions plus integrity. The clean registry consumer then installs **all three
manifest versions**, including already-published unchanged SDKs, and resolves
every Expo subpath. Local repacks do not replace this registry check.

`verify_existing=true` performs read-only metadata/consumer verification of the
same release commit, skipping publication. Metadata propagation has bounded
waits; publishing itself is never retried automatically. No changeset `publish`
command or competing publisher should be added.

After independent verification, component tags may be created with explicit
permission: `subkit-core-vVERSION`, `subkit-node-vVERSION`, `subkit-expo-vVERSION`
for the packages actually released. Never move existing tags or create a second
Changesets-style tag scheme.

## Partial publication / recovery

If transport fails, first inspect all exact target versions and integrity; do not
assume failure means the version is absent. Never republish an existing version.
If everything exists, use read-only verification and repair only outstanding
verification/tagging steps after approval.

If only part exists, keep those immutable versions. Diagnose the failure and
prepare a **new forward-only release**: bump the intended package set beyond any
published versions, include required dependent releases, create a new reviewed
source/release commit pair and rerun all gates. The normal publisher intentionally
rejects a partially published selection; it does not silently skip it or replay
remaining mutations. The dist-tag is not automatically changed during recovery.

## Separate service adoption

SDK publication and service deployment are separate releases with different
versions. Document API capabilities, SDK minimum versions and rollout order for
contract changes. A successful SDK publish is not proof that a corresponding API
is deployed. Coordinate compatible rollout order explicitly; do not assume every
change is SDK-first. Keep service implementation and private operator details out
of this repository.
