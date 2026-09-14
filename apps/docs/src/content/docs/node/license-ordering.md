---
title: License ordering and cursors
description: Read license pages in server order without reusing cursors across selections.
---

```ts compile
const page = await subkit.licenses.list({
  sortBy: 'validUntil',
  sortDirection: 'asc',
  licenseeKind: 'organization',
})
```

`licenseeKind` filters `individual` or `organization`, independently of the
commerce source `kind` (`direct_subscription`, `contract`, and other sources).
Organization classification follows the recorded licensee relationship, not the
payer or product name. An ended organization relationship remains organizational;
`licenseeName` uses the currently effective organization when available, otherwise
the payer display name or source reference.

Each summary exposes separate `pools` with `key`, `capacity`, `used`, `reserved`
and `available`. Null capacity/availability denotes an unlimited pool. Select
pools by your application's configured keys; do not sum unrelated capacity units.
Application-specific labels belong to the consumer, not the SubKit contract.

`sortBy` accepts `createdAt` and `validUntil`; `sortDirection` accepts `asc`
and `desc`. Defaults are newest creation first. No-end licenses sort last when
sorting by validity. Source ID breaks equal-value ties.

Pass `page.nextCursor` with the same app, filters and sort options for the next
page. Discard it when changing the selection. Cursors are opaque and scoped;
malformed, old or mismatched cursors are rejected rather than treated as the
first page. Restart without a cursor when intentionally returning to page one.

This remains offset pagination, not a frozen snapshot. Concurrent license
changes may move page boundaries. A successful page read is not proof that a
multi-page export is complete or duplicate-free.

These options require the corresponding service release. Updating the SDK alone
does not establish server support. Read access and tenant/app authorization are
unchanged; sorting creates or changes no licenses.
