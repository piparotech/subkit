---
title: License ordering and cursors
description: Read license pages in server order without reusing cursors across selections.
---

```ts
const page = await subkit.licenses.list({
  sortBy: 'validUntil',
  sortDirection: 'asc',
  kind: 'club',
})
```

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
