# SubKit Catalog Control Plane Plan

## Zielbild

SubKit soll nicht ein UI über App Store Connect oder Google Play sein. SubKit soll die kanonische Control Plane für Subscription-Katalog, Entitlements, Offerings, Store-Bindings, Runtime-Zugriff und Store-Sync sein.

Produktversprechen:

> SubKit definiert, was gelten soll. Stores zeigen, was dort aktuell existiert. Sync vergleicht beides. Store-APIs werden erst nach Preview und expliziter Bestätigung verändert.

## Kernmodell

```txt
Entitlements
  Was darf ein App User?

Products
  Was kann gekauft, vergeben oder angeboten werden?

Product Plans
  Welche Laufzeit / Billing-Variante hat ein Product?

Prices / Offers
  Welche Preis- und Angebotsabsicht gehört zu einem Plan?

Offerings
  Welche Product Plans zeigt die App auf einer Paywall?

Store Bindings
  Welche Apple-/Google-Objekte repräsentieren einen SubKit Product Plan?

Snapshots / Drift / Mutation Plans
  Was existiert im Store, was weicht ab, was soll nach Bestätigung geändert werden?
```

Nicht verhandelbar:

- Store Product IDs gehören nicht in kanonische Products.
- Apple/Google-Produkte sind Store-Bindings, nicht die Wahrheit.
- Imports sind beobachteter Store-Zustand, nicht automatisch SubKit-Katalog.
- Canonical Edits rufen nie Store APIs.
- Store Writes nur per Preview + Confirm + Audit.
- Runtime bleibt einfach: App fragt nach Offerings und Entitlements, nicht nach Store-Komplexität.

## Ziel-Datenmodell

### Entitlements

```txt
entitlements
- id
- app_id
- key
- name
- description
- status: active | archived
- created_at
- updated_at
```

Regeln:

- `key` ist runtime-stabil, z.B. `premium`.
- Niemals store-spezifisch.
- Archivieren statt löschen, sobald referenziert.
- Unique: `(app_id, key)`.

### Products

```txt
products
- id
- app_id
- key
- name
- description
- product_type: subscription | non_consumable | consumable | voucher | manual
- status: draft | active | archived
- created_at
- updated_at
```

Nicht mehr in `products`:

```txt
appStoreId
playStoreId
priceCents
duration
trialEnabled
```

Diese Felder wandern in Plans, Prices, Offers und Store Bindings.

### Product Entitlements

```txt
product_entitlements
- id
- product_id
- entitlement_id
- grant_mode: while_active | lifetime | fixed_duration
- duration_iso nullable
- created_at
- updated_at
```

Regeln:

- Datenmodell erlaubt mehrere Entitlements pro Product.
- UI darf initial bewusst nur ein Entitlement anbieten.
- Runtime Grants werden aus Purchases/Manual Grants erzeugt, nicht direkt aus Offerings.

### Product Plans

```txt
product_plans
- id
- product_id
- key
- billing_kind: recurring | one_time
- billing_period_iso nullable
- grace_period_iso nullable
- status: draft | active | archived
- created_at
- updated_at
```

Beispiele:

```txt
Product: premium
Plan: monthly, recurring, P1M
Plan: annual, recurring, P1Y

Product: lifetime_premium
Plan: lifetime, one_time
```

### Prices

```txt
prices
- id
- product_plan_id
- currency_code
- country_code nullable
- amount_micros
- tax_inclusive nullable
- starts_at nullable
- ends_at nullable
- status: draft | active | archived
- created_at
- updated_at
```

Empfehlung:

- `amount_micros`, keine Floats.
- SubKit speichert zunächst Preisabsicht / Reference Price.
- Store-effective Preise kommen aus Snapshots.
- Preis-Push zu Stores später separat designen, wegen Regionen, Tax, Store Price Points und Lifecycle.

### Offers / Trials

```txt
product_offers
- id
- product_plan_id
- key
- offer_type: free_trial | intro_price | promo | winback | custom_code
- eligibility: new_customers | lapsed | existing | all | store_managed
- duration_iso nullable
- billing_period_count nullable
- price_amount_micros nullable
- price_currency_code nullable
- status: draft | active | archived
- starts_at nullable
- ends_at nullable
- created_at
- updated_at
```

`trialEnabled` ist zu grob und soll ersetzt werden.

### App Platforms

```txt
app_platforms
- id
- app_id
- platform: ios | android
- store: apple | google
- bundle_id / package_name
- store_app_id
- environment: production | sandbox | internal | unknown
- status: connected | needs_setup | disabled
- created_at
- updated_at
```

### Store Integrations

```txt
store_integrations
- id
- app_id
- app_platform_id nullable
- store: apple | google
- display_name
- status: connected | needs_auth | disabled | error
- external_app_id
- config_json
- capabilities_json
- last_permission_check_at nullable
- last_sync_at nullable
- created_at
- updated_at
```

Capabilities explizit:

```txt
catalog_read
catalog_write
price_read
price_write
availability_read
availability_write
sales_report_read
review_status_read
lifecycle_write
```

Secrets bleiben in der bestehenden Secret-Schicht, nicht in normalen Tabellen.

### Store Product Bindings

Zentrale Tabelle.

```txt
store_product_bindings
- id
- app_id
- app_platform_id
- product_id
- product_plan_id nullable
- store_integration_id nullable
- store: apple | google
- external_product_id
- external_base_plan_id nullable
- external_subscription_group_id nullable
- external_package_name nullable
- environment: production | sandbox | unknown
- binding_status:
    planned
    linked
    synced
    drifted
    missing_in_store
    missing_in_subkit
    unsupported
    archived
- sync_direction: subkit_to_store | store_to_subkit | manual
- last_snapshot_id nullable
- last_compared_at nullable
- created_at
- updated_at
```

Regeln:

- Apple: `external_product_id` = Apple product ID.
- Google: `external_product_id` + `external_base_plan_id` für Subscription-Plans.
- Runtime verwendet nur aktive/linked/synced Bindings.
- Product kennt keine Store IDs mehr.

### Store Catalog Snapshots

Append-only Beobachtung des Stores.

```txt
store_catalog_snapshots
- id
- app_platform_id
- store: apple | google
- sync_run_id nullable
- external_id
- external_parent_id nullable
- object_type:
    app
    subscription_group
    subscription
    base_plan
    in_app_product
    price
    offer
    localization
- environment: production | sandbox | unknown
- raw_json
- normalized_json
- content_hash
- fetched_at
```

Regeln:

- Raw Store Payload ist Diagnose, nicht Wahrheit.
- Normalized JSON ist für Diff/Drift.
- Snapshots werden nicht überschrieben.

### Drift Items

```txt
store_catalog_drift_items
- id
- app_id
- store_product_binding_id nullable
- snapshot_id nullable
- severity: info | warning | blocking
- field_path
- expected_json
- actual_json
- drift_type:
    missing_in_store
    missing_in_subkit
    value_mismatch
    unsupported_store_state
    manual_store_change
    stale_snapshot
    immutable_mismatch
    lifecycle_blocked
- status: open | acknowledged | resolved | ignored
- detected_at
- resolved_at nullable
```

### Sync Runs

```txt
sync_runs
- id
- app_id
- app_platform_id nullable
- store: apple | google
- mode: import | compare | plan | apply | verify | sales_import
- status: running | succeeded | failed | partial | cancelled
- started_by_user_id nullable
- started_at
- finished_at nullable
- summary_json
- error_detail nullable
```

### Mutation Plans

Store-Mutationsmodell.

```txt
store_mutation_plans
- id
- app_id
- app_platform_id
- store: apple | google
- status:
    draft
    ready
    confirmation_required
    confirmed
    applying
    verifying
    applied
    partial
    failed
    cancelled
    expired
    superseded
- created_by_user_id
- confirmed_by_user_id nullable
- created_at
- confirmed_at nullable
- applied_at nullable
- base_remote_snapshot_hash
- local_revision
- preview_hash
- summary_json
- risk: none | low | medium | high | irreversible
```

```txt
store_mutation_plan_items
- id
- plan_id
- store_product_binding_id nullable
- operation:
    create_product
    update_product
    archive_product
    create_price
    update_price
    create_offer
    update_offer
    link_existing
    unlink
    no_op
- object_type
- external_id nullable
- before_json nullable
- after_json
- diff_json
- risk: low | medium | high | irreversible
- status: planned | applied | failed | skipped | blocked
- error_detail nullable
- sort_order
```

Regeln:

1. Kein Store Write ohne bestätigten Plan.
2. Preview ist immutable.
3. Confirmation bindet `plan_id + preview_hash + remote_snapshot_hash + local_revision`.
4. Stale Preview darf nicht angewendet werden.
5. Apply refetcht/verifiziert Remote State.
6. Partial Apply bleibt sichtbar und reparierbar.
7. Jeder Store Write erzeugt Audit Events.
8. Irreversible Änderungen brauchen stärkere Bestätigung.

## Store Sync Architektur

### Sync Protocol

```txt
1. Read remote catalog
2. Store raw + normalized snapshots
3. Build desired projection from SubKit canonical catalog
4. Compare desired vs observed
5. Generate drift items
6. Generate mutation preview if requested
7. User confirms exact preview
8. Apply plan item-by-item
9. Refetch remote state
10. Verify and mark synced / partial / failed
```

### Idempotenz

Jeder Apply-Step braucht einen stabilen Idempotency Key:

```txt
store-sync:{operationId}:{stepId}:{target}:{requestHash}
```

Wenn Store API keine Idempotenz unterstützt:

1. Vor Write remote lesen.
2. Wenn Ziel bereits passt: `succeeded`.
3. Wenn immutable Konflikt existiert: `blocked`.
4. Create niemals blind wiederholen.
5. Nach transient failures: verify-before-retry.

### Immutable Store-Felder

Als praktisch immutable behandeln:

- Store Product ID
- Product Type
- Apple Subscription Group Binding
- Google Product ID
- Google Base Plan ID
- Google Offer ID
- Billing Period eines aktiven Plans
- Renewal Type / prepaid vs auto-renewing
- historische Preise
- Entitäten mit aktiven Subscribers

Änderung bedeutet:

```txt
create replacement entity
rebind offering intentionally
archive/deactivate old binding if allowed
```

Nicht versuchen, Store-Objekte magisch umzubauen.

## Runtime API Ziel

Runtime soll einfach bleiben.

Intern:

```txt
offering_packages
  -> product_plan_id
  -> product
  -> product_entitlements
  -> active store_product_bindings
  -> runtime payload
```

Extern weiterhin sinngemäß:

```ts
{
  all: [
    {
      identifier: 'default',
      packages: [
        {
          identifier: 'monthly',
          label: 'Monthly',
          product: {
            identifier: 'premium',
            entitlementKey: 'premium',
            storeProductIds: {
              apple: 'com.acme.app.premium.monthly',
              google: 'premium'
            }
          }
        }
      ]
    }
  ],
  current: ...
}
```

Mittelfristig Runtime v2:

```ts
{
  packageKey,
  productKey,
  planKey,
  entitlements,
  billingPeriod,
  storeProductIds: {
    apple?: {
      productId: string
      subscriptionGroupId?: string
      offerIds?: string[]
    }
    google?: {
      productId: string
      basePlanId?: string
      offerToken?: string
    }
  },
  price: {
    currencyCode: string
    amountMicros: number
    localizedLabel?: string
    source: 'store_snapshot' | 'canonical'
  }
}
```

## Frontend Dashboard

### Informationsarchitektur

Empfohlen:

```txt
Overview
Catalog
  Entitlements
  Products
  Offerings
Stores
  Bindings
  Drift
  Imports
  Sync Runs
App Users
Settings
```

Falls die Navigation flacher bleiben soll:

```txt
Overview
Entitlements
Products
Offerings
Store Sync
App Users
Settings
```

Wichtig: Hauptbegriff `Subscriptions` schrittweise durch `Products` ersetzen. SubKit verwaltet mehr als Subscriptions: Lifetime, Non-Consumables, Consumables, Vouchers, Manual Grants.

### UI Grundprinzip

Jede relevante Ansicht zeigt drei Ebenen klar:

```txt
SubKit canonical     Store current     Proposed change
```

Copy-Prinzip:

- `Save in SubKit` speichert nur lokal/kanonisch.
- `Preview store changes` erzeugt Diff, keine Store-Mutation.
- `Apply Apple changes` / `Apply Google changes` ist bewusst extern und bestätigungspflichtig.

### Status-Vokabular

Canonical Catalog:

```txt
Ready
Draft
Needs binding
Invalid
Archived
```

Store Binding:

```txt
Bound
Unbound
Imported
Drift
Conflict
Read-only
Missing
Not required
```

Sync:

```txt
In sync
Preview available
Pending confirmation
Applying
Partially applied
Failed
Blocked
Expired
```

Status immer als Text + Farbe/Icon, nie nur Farbe.

## Screens

### Overview

Ziel: Betriebssicherheit in 30 Sekunden.

Module:

```txt
Catalog health
- Entitlements ready
- Products ready / need binding
- Offerings live
- Runtime health

Needs attention
- Product missing Google binding
- Apple price drift
- Imported store products not adopted
- Credentials expired

Canonical flow
Entitlements → Products → Offerings → Runtime

Recent store sync
- import
- preview
- apply
- failures
```

Primäre CTAs:

```txt
Create product
Review drift
Import remote catalog
Preview store changes
```

### Entitlements

Liste:

```txt
Entitlement | Description | Products | Active app users | Grants | Status
```

Detail:

```txt
Identity
Granted by Products
Runtime usage
Dependencies / risk
Audit
```

Create Flow:

```txt
1. Key
2. Name
3. Description
4. Create as draft / active
```

Danach Next Actions:

```txt
Create product that grants this
Add to existing product
Done
```

### Products

Liste:

```txt
Product | Type | Grants | Apple | Google | Offering use | Status
```

Beispiel:

```txt
Pro Monthly | Subscription | pro | Bound | Missing | 2 offerings | Needs binding
Pro Annual  | Subscription | pro | Drift | Bound   | 2 offerings | Drift
Lifetime    | One-time     | pro | Bound | —       | 1 offering  | Ready
```

Detail-Struktur:

```txt
Header
- Product name
- Canonical key
- Type
- Grants
- Status
- Apple/Google summary

Sections
- Canonical fields
- Entitlements granted
- Plans / pricing / offers
- Store bindings
- Offerings using this product
- Drift
- Audit
```

Buttons:

```txt
Save in SubKit
Preview store changes
Bind store product
Review drift
Archive product
```

Product Detail Copy:

> Canonical product fields define what SubKit intends to sell or grant. Store bindings connect this product to Apple and Google product records.

### Product Create Flow

Guided, nicht ein riesiges Formular.

Step 1 — Access:

```txt
What should this product unlock?
- existing entitlement
- create new entitlement
```

Step 2 — Type:

```txt
Subscription
One-time purchase
Lifetime access
Consumable
Voucher / promo-backed
Manual grant only
```

Step 3 — Plan:

```txt
Product key
Name
Plan key
Billing period
Reference price
Trial / offer intent
```

Step 4 — Store setup:

```txt
Apple
- Bind existing
- Prepare new App Store product
- Skip for now

Google
- Bind existing
- Prepare new Google product/base plan
- Skip for now
```

Final Button:

```txt
Create product in SubKit
```

Success Copy:

> Product created in SubKit. No store changes were made.

Next CTAs:

```txt
Preview Apple sync
Bind Google product
Add to offering
```

### Offerings

Liste:

```txt
Offering | Packages | Runtime status | Products | Last changed
```

Detail:

```txt
Offering: default
Runtime key: default
Status: Ready / Warning
Preview runtime JSON

Packages
Package | Product Plan | Grants | Apple | Google | Runtime
```

Offering Copy:

> Offerings reference canonical product plans. Runtime store product IDs are resolved from each product’s store bindings.

Wichtig:

- Package braucht stabilen `key`, nicht Label als Identifier.
- Package referenziert langfristig `product_plan_id`, nicht direkt Product.
- Fehlende Bindings erscheinen als Runtime Warning.

### Store Sync

Tabs:

```txt
Bindings
Drift
Imports
Sync Runs
```

Header Copy:

> SubKit is the canonical catalog. Store products are synchronized representations. Store APIs are changed only after preview and confirmation.

Bindings Tab:

```txt
Canonical product | Plan | Apple product | Apple status | Google product/base plan | Google status
```

Actions:

```txt
Bind existing
Unbind
Review drift
Prepare create
Mark not required
```

Imports Tab:

```txt
Store Product ID | Store name | Price | Store status | Suggested action
```

Actions:

```txt
Bind to existing product
Adopt as new canonical product
Ignore
Archive imported record
```

Copy:

> Imported products are store state, not SubKit catalog. Adopt or bind them before they affect runtime offerings.

Drift Tab:

```txt
Product | Store | Field | SubKit canonical | Store current | Risk | Action
```

Resolution:

```txt
Keep SubKit canonical and prepare store update
Update SubKit from store
Accept drift
Leave unresolved
```

Sync Runs Tab:

```txt
Date | Store | Type | Result | Actor | Changes
```

Run Detail:

- input snapshot
- snapshot hash
- local revision
- diff
- plan items
- API calls planned/made
- result
- errors
- actor
- timestamps

### Preview / Apply Flow

Preview Screen:

```txt
Preview Apple sync

No store changes have been made.

Scope
- App
- Store
- Products
- Generated by
- Generated at

Summary
- Create: 1
- Update: 2
- No-op: 7
- Blocked: 1

Changes
Action | Entity | Store current | Proposed | Risk | Constraint
```

Diff Detail:

```txt
Field | SubKit canonical | Apple current | Proposed Apple value
```

Confirmation:

```txt
Apply 3 Apple changes?

This will call App Store Connect and update external store state.
SubKit local catalog is already saved.
Store changes cannot always be rolled back automatically.

Type APPLY APPLE to confirm.
```

If write not enabled:

```txt
Apple mutation is not enabled.

You can use this preview as an operator checklist in App Store Connect.
[Copy checklist]
[Download JSON]
```

## Komponenten

Neue / gemeinsame UI-Komponenten:

```txt
StatusChip
SourceBadge
DiffTable
MutationBoundaryNotice
ObjectDependencyList
SetupChecklist
StoreBindingCell
RuntimePreviewPanel
StoreSyncRunTimeline
```

Source Labels:

```txt
SubKit canonical
Apple current
Google current
Proposed
Runtime
Store only
Local only
```

Design-Stil:

- kompakte Tabellen
- Monospace für IDs
- wenig Farbe
- Farbe nur für Status/Risiko/Aktion
- keine dekorativen Dashboard-Karten
- keine Magic-Sync Buttons
- klare Mutation Boundary Notices

## Implementierungsphasen

### Phase 0 — Clean-Cut Decision und Usage Audit

Entscheidung:

> Kein Compatibility-Modus, keine temporären Kompatibilitätsspalten, keine Runtime-Ersatzpfade. Das Produkt ist noch nicht live; der Katalog darf direkt normalisiert werden.

Aufgaben:

1. Alte flache Produktfelder suchen und entfernen:
   - Store-IDs am Product
   - Preis am Product
   - Billing-Dauer am Product
   - Trial-Flag am Product
   - Single-Entitlement am Product
   - Offering Package direkt auf Product
2. Usage klassifizieren und direkt refactoren:
   - Runtime
   - UI Forms
   - Server Actions
   - Seed/Test Data
   - App Store Connect Import
3. Runtime-Contract fachlich neu festschreiben:
   - Product Key
   - Plan Key
   - Billing Period
   - Entitlement Keys
   - Store Product IDs aus Bindings
4. Preisstrategie festlegen: Store owns effective price, SubKit stores reference/intent.
5. Product↔Entitlement Cardinality: DB many-to-many, UI initial single-select.
6. Store Write Scope: zuerst read/import/preview, Writes später feature-flagged.

Deliverable:

```txt
docs/subkit-migration-checklist.md
```

### Phase 1 — Schema Foundation als neuer Baseline-Schema

Neue kanonische Tabellen:

```txt
app_platforms
product_plans
product_entitlements
prices
product_offers
store_integrations
store_product_bindings
store_catalog_snapshots
store_catalog_drift_items
sync_runs
store_mutation_plans
store_mutation_plan_items
```

Flat Product Columns werden nicht übernommen. Baseline:

```txt
products.key
products.name
products.description
products.product_type
products.status
product_plans.billing_kind
product_plans.billing_period_iso
prices.amount_micros
product_entitlements.entitlement_id
store_product_bindings.external_product_id
product_offers.offer_type
```

### Phase 2 — Runtime auf normalisierten Catalog umstellen

Ändern:

```txt
src/server/runtime-api/runtime.ts
src/server/runtime-api/products.ts
src/server/runtime-api/offerings.ts
src/server/runtime-api/customerInfo.ts
src/server/runtime-api/entitlements.ts
```

Neue Logik:

1. Offering Packages lösen über `product_plan_id` auf.
2. Products hängen über `product_plans` an Packages.
3. Store Product IDs kommen ausschließlich aus `store_product_bindings`.
4. Nur aktive/linked/synced Bindings verwenden.
5. Customer Info und Reconcile schreiben Ownerships/Grants mit Product Plan und Binding IDs.

Tests:

- binding only
- missing binding
- archived binding excluded
- package order preserved
- Apple + Google IDs
- multiple entitlement keys
- product plan purchase maps to correct entitlements

### Phase 3 — Catalog Domain Services

Neue Module:

```txt
src/domain/catalog/
src/domain/store-sync/
```

Services:

```txt
createProduct
updateProduct
archiveProduct
createEntitlement
updateEntitlement
linkProductEntitlement
createProductPlan
updateProductPlan
linkStoreProductBinding
unlinkStoreProductBinding
```

Regel:

> Catalog Services mutieren nur SubKit DB, niemals Store APIs.

### Phase 4 — App Store Read/Import Refactor

Zielstruktur:

```txt
src/integrations/app-store-connect/server/
- client.ts
- catalog-read.ts
- normalize.ts
- diff.ts
- plans.ts
- sales-reports.ts
- actions.ts
- catalog-write.ts später
```

Implementieren:

```txt
NormalizedStoreCatalog
NormalizedStoreProduct
NormalizedStorePrice
NormalizedStoreOffer
```

Regeln:

- Raw Payload als `unknown`.
- Kein `any`.
- Catalog Import speichert Snapshots.
- Import mutiert canonical Products nur über explizite lokale Apply-Aktionen.
- Externe Store-Mutationen bleiben aus.

### Phase 5 — Store Sync Dashboard read-only

UI:

```txt
Store Sync
- Bindings
- Drift
- Imports
- Sync Runs
```

Funktionen:

- Store Catalog importieren
- Snapshot anzeigen
- Bindings anzeigen
- Drift berechnen
- Imports als Store-only zeigen
- Keine Store Writes

### Phase 6 — Preview Plans für lokale Apply-Aktionen

Plan-Infrastruktur zuerst lokal nutzen:

```txt
bind_existing
adopt_as_canonical
ignore_store_product
update_subkit_from_store
unlink_binding
```

Warum:

- Nutzer lernt Preview/Apply.
- Audit- und Plan-Modell wird validiert.
- Kein externes Risiko.

### Phase 7 — Store Write Framework feature-flagged

Erst nach stabiler Read/Preview-Architektur.

Start mit Apple:

1. Low-risk Metadata Updates.
2. Create Product nur mit vollständiger Datenlage.
3. Keine Price/Trial Writes zuerst.
4. Keine destruktiven Deletes.
5. Feature Flag erforderlich.

Pflicht:

- permission check
- preview hash
- stale check
- explicit confirmation
- item-level apply status
- audit events
- verify by refetch
- partial failure handling

### Phase 8 — Google Play Adapter

Google nicht in Apple-Modell pressen.

Adapter-Konzept:

```ts
interface StoreAdapter {
  fetchCatalog(): Promise<unknown>
  normalizeRemoteCatalog(input: unknown): NormalizedStoreCatalog
  computeDesiredProjection(input: CanonicalCatalog): NormalizedStoreCatalog
  diff(input: DiffInput): StoreDiff
  buildPlan(input: StoreDiff): StoreMutationPlan
  applyStep(input: StoreMutationPlanItem): Promise<ApplyStepResult>
  verify(input: StoreMutationPlan): Promise<VerifyResult>
}
```

Gemeinsamer Sync Core, store-spezifische Adapter.

## Konkrete nächste Engineering Steps

1. Baseline-Migration prüfen und auf frischer DB anwenden.
2. Runtime-Vertrag mit Tests absichern.
3. Store Binding Service extrahieren.
4. App Store Import auf Snapshots/Normalized Catalog refactoren.
5. Product UI weiter Richtung Catalog-IA ausbauen.
6. Store Sync Read-only Dashboard bauen.
7. Lokale Preview/Apply-Pläne implementieren.
8. Externe Store-Mutationen erst danach feature-flagged aktivieren.

## Offene Entscheidungen

### Preis-Wahrheit

Empfehlung:

> Start: Store owns effective price. SubKit stores reference price / intent. Price Push später separat.

### Store Write Scope

Empfehlung:

> Erst read-only import + preview. Dann low-risk metadata writes. Preise/Trials/Offers erst nach Store-spezifischem Detailmodell.

### Apple Review Lifecycle

Empfehlung:

> Review-Transitions zunächst observed/manual, nicht vollautomatisch.

### Google Base Plans

Empfehlung:

> Product Plan ↔ Google Base Plan als Standard-Mapping. Offers separat.

### Accepted Drift Policy

Empfehlung:

> Field-level accepted drift mit Reason, Actor, optional Expiry. Kein globales Ignore-All.

## Kurzfassung

Baue SubKit als kanonischen Catalog mit Store Bindings, Snapshots, Drift und bestätigten Mutation Plans.

Die erste echte Umsetzung ist nicht Store Writes, sondern die Architektur darunter:

```txt
clean baseline schema
runtime over product plans and store bindings
read-only store snapshot import
store sync dashboard
local preview/apply plans
```

Dann erst externe Store-Mutationen feature-flagged aktivieren.
