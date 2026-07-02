# SubKit Expo IAP SDK Plan

Ziel: SubKit bekommt eine eigene RevenueCat-ähnliche Abstraktion für Expo/React-Native-Apps. `expo-iap` / OpenIAP ist dabei nur die native Store-Transport-Schicht. SubKit bleibt fachlicher Source of Truth für App Users, Offerings, Products, Store Purchases und Entitlements.

Referenzen:

- `expo-iap`: <https://github.com/hyodotdev/openiap/tree/main/libraries/expo-iap>
- RevenueCat React Native SDK: <https://github.com/RevenueCat/react-native-purchases>
- Bestehender SubKit-Produktkontext: `PRODUCT.md`
- Bestehende Runtime-Entitlement-Prüfung: `src/server/runtime-api/entitlements.ts`
- Bestehende Runtime-Route: `src/routes/api.runtime.entitlements.check.ts`
- Bestehender Prototyp-Seam: `packages/cn-web/src/lib/payments-iap-stripe/*`
- Marina-IoT-Pattern für stillen Store-Sync: `~/dev/piparo.tech/weatherdock/marina-iot/app/src/screens/subscription/*`

## Grundsatzentscheidungen

1. **SubKit ist Entitlement Authority.**
   - Der Client darf Store Purchases sammeln und an SubKit senden.
   - Ein dauerhaftes Entitlement entsteht nur durch serverseitige Validierung und Grant-Erstellung.

2. **`expo-iap` ist Adapter, nicht Produkt-API.**
   - App-Code soll nicht direkt StoreKit/Play-Billing-Details kennen.
   - App-Code arbeitet mit Offerings, Packages, CustomerInfo und Entitlements.

3. **Auto-Sync ist Pflicht.**
   - SubKit muss beim App-Start und beim Start einer neuen App-Session automatisch still synchronisieren.
   - Hintergrund: Apple/Google liefern die App-User-ID nicht zuverlässig zurück, besonders bei direkten Käufen im App Store / Play Store.

4. **Silent Sync ist nicht Manual Restore.**
   - Auto-Sync darf keine promptenden Restore-/Login-Flows auslösen.
   - Promptende Restore-Flows bleiben explizite User-Aktion über `restorePurchases()`.

5. **Keine stillen Owner-Transfers.**
   - Wenn ein Store Purchase bereits User A gehört, darf User B ihn nicht durch Foreground-Sync automatisch erhalten.
   - Konflikte werden explizit gemeldet und serverseitig/auditiert gelöst.

6. **Idempotenz ist P0.**
   - Store-Events, Purchase-Listener und Foreground-Syncs können mehrfach laufen.
   - Backend und SDK müssen Duplicate Events sicher behandeln.

## Zielbild

```txt
Expo App
  -> @subkit/expo-iap
      -> expo-iap / OpenIAP
      -> SubKit Runtime API

SubKit Server
  -> validiert Apple / Google Purchases
  -> speichert Store Purchases idempotent
  -> resolved Ownership
  -> schreibt Entitlement Grants
  -> liefert CustomerInfo / Offerings
```

Die App fragt am Ende nicht „hat User eine Subscription?“, sondern:

```txt
Hat App User X Entitlement Y?
```

## Package-Struktur

### `packages/subkit-core`

Plattformneutrale Types, Schemas und API-Contracts.

```txt
packages/subkit-core/
  package.json
  src/index.ts
  src/types.ts
  src/errors.ts
  src/schemas.ts
```

Inhalt:

- `CustomerInfo`
- `Offering`
- `OfferingPackage`
- `StoreProduct`
- `Entitlement`
- `PurchaseResult`
- `PurchaseSyncResult`
- `PurchaseSyncReason`
- `PurchaseOwnershipConflict`
- `SubKitError`
- Zod-Schemas für Runtime-Requests/-Responses

Keine React-Native-, Expo- oder Server-Credential-Imports.

### `packages/subkit-expo`

Expo-/React-Native-SDK über `expo-iap`.

```txt
packages/subkit-expo/
  package.json
  src/index.ts
  src/SubKitIapClient.ts
  src/ExpoIapStoreAdapter.ts
  src/PurchaseSyncCoordinator.ts
  src/PurchaseQueueStore.ts
  src/IdentityStore.ts
  src/EntitlementStore.ts
  src/ReconcileClient.ts
  src/errorMapping.ts
```

Peer Dependencies:

- `expo`
- `react`
- `react-native`
- `expo-iap`

Diese Package darf keine serverseitigen Apple-/Google-Credentials oder Node-only Verification-Module importieren.

### Warum zwei Packages?

MVP bleibt private, trotzdem bleiben Core und Expo-Adapter getrennt:

- `@piparotech/subkit-core` enthält nur plattformneutrale Contracts: Types, Zod-Schemas, Error-Codes und DTOs.
- `@piparotech/subkit-core` kann von Server, Web Console, Tests und Native SDK importiert werden.
- `@piparotech/subkit-expo` importiert Expo-/React-Native-/`expo-iap`-Code und darf deshalb nicht versehentlich in TanStack Server, Node oder Web Console landen.
- Die Trennung verhindert Metro-/Node-Bundling-Probleme und reduziert das Risiko, serverseitige Validation- oder Credential-Module in die Mobile-App zu ziehen.
- Core kann zuerst stabilisiert und getestet werden; Native SDK und Store-Adapter bleiben austauschbar.

Wenn das Paket später öffentlich werden soll, kann aus dieser Struktur sauber ein Public SDK entstehen. Wenn es dauerhaft privat bleibt, ist die Trennung trotzdem nützlich, weil sie Client-/Server-Grenzen technisch erzwingt.

### Server-Code im bestehenden SubKit-App-Package

Runtime-API-Implementierung lebt unter `src/server/runtime-api/*`:

```txt
src/server/runtime-api/customerInfo.ts
src/server/runtime-api/offerings.ts
src/server/runtime-api/runtime.ts
src/server/runtime-api/entitlements.ts
src/server/runtime-api/serverApiAuth.ts
```

Routes:

```txt
src/routes/api.runtime.customer-info.ts
src/routes/api.runtime.offerings.ts
src/routes/api.runtime.iap.reconcile.ts
src/routes/api.runtime.purchases.restore.ts
src/routes/api.stores.apple.notifications.ts
src/routes/api.stores.google.rtdn.ts
```

## Public SDK API

### Configure

```ts
const subkit = await configure({
  apiBaseUrl: 'https://subkit.example.com',
  appId: 'app_123',
  sdkKey: 'sk_live_public_scoped_key',
  appUserId: 'user_123',
  iap: {
    autoSync: true,
    syncOnAppStart: true,
    syncOnForeground: true,
    syncOnPurchaseEvent: true,
    foregroundMinIntervalMs: 10 * 60 * 1000,
    sessionResumeThresholdMs: 15 * 60 * 1000,
    allowPromptingRestoreAutomatically: false,
    requireIdentityForGrant: true,
  },
})
```

### Identity

```ts
await subkit.identify({
  userId: 'user_123',
  anonymousId: 'anon_abc',
})

await subkit.resetIdentity()
```

`identify()` ist ein wichtiger Sync-Trigger:

1. Identity speichern.
2. Pending Queue mit User verknüpfen, wenn sicher möglich.
3. `syncPurchases({ reason: 'identity_changed' })` auslösen.
4. `CustomerInfo` refreshen.

### Store Identity Hints im Client

SubKit erzeugt Apple-/Google-Store-Identifier serverseitig und liefert sie an die SDK zurück. Die Host-App muss sie im Normalfall nicht selbst erzeugen und auch nicht direkt an `expo-iap` weiterreichen.

Ablauf:

```txt
configure / identify
  -> SDK lädt CustomerInfo
  -> Server stellt StoreIdentityHints sicher
  -> SDK speichert Hints im IdentityStore
  -> purchasePackage baut expo-iap request mit Hints
  -> purchaseUpdatedListener empfängt Store Purchase
  -> SDK sendet Purchase + Hints an /api/runtime/iap/reconcile
```

SDK-interner Typ:

```ts
type StoreIdentityHints = {
  apple?: {
    appAccountToken: string
  }
  google?: {
    obfuscatedAccountId: string
    obfuscatedProfileId?: string
  }
}
```

Beispiel für iOS:

```ts
await requestPurchase({
  type: 'subs',
  request: {
    apple: {
      sku: storeProductId,
      appAccountToken: storeIdentityHints.apple?.appAccountToken,
    },
  },
})
```

Beispiel für Android Subscription:

```ts
await requestPurchase({
  type: 'subs',
  request: {
    google: {
      skus: [storeProductId],
      obfuscatedAccountId: storeIdentityHints.google?.obfuscatedAccountId,
      obfuscatedProfileId: storeIdentityHints.google?.obfuscatedProfileId,
      subscriptionOffers: selectedOfferToken
        ? [{ sku: storeProductId, offerToken: selectedOfferToken }]
        : undefined,
    },
  },
})
```

Beispiel für Android In-App Product:

```ts
await requestPurchase({
  type: 'in-app',
  request: {
    google: {
      skus: [storeProductId],
      obfuscatedAccountId: storeIdentityHints.google?.obfuscatedAccountId,
      obfuscatedProfileId: storeIdentityHints.google?.obfuscatedProfileId,
      offerToken: selectedOfferToken,
    },
  },
})
```

Regeln:

- App-Code ruft nur `purchasePackage(packageId)` auf; die SDK hängt Store Identity Hints automatisch an.
- SDK muss vor einem Kauf eine Identity haben oder bewusst im anonymen App-User-Modus laufen.
- Bei `resetIdentity()` werden alte Hints aus dem Memory-State entfernt.
- Bei neuem `identify()` werden Hints für den neuen App User geladen.
- Hints gelten nur für neue Store-Käufe, die aus der App gestartet werden.
- Direkte Käufe im App Store / Play Store können diese Hints nicht nachträglich bekommen; dafür gibt es App-Start-/Foreground-Reconcile.
- Wenn `expo-iap` die Felder auf einer Plattform nicht unterstützt, loggt die SDK eine Diagnostic Warning und fällt auf Server-Reconcile per aktuellem `appUserId` zurück.
- Hints sind pseudonym, aber sie werden trotzdem nicht geloggt.

### Offerings und CustomerInfo

```ts
const offerings = await subkit.getOfferings({ placement: 'settings_upgrade' })
const customerInfo = await subkit.getCustomerInfo()
const hasPro = await subkit.hasEntitlement('pro')
```

### Purchase

```ts
const result = await subkit.purchasePackage('monthly')
```

Result:

```ts
type PurchaseResult =
  | { status: 'cancelled' }
  | { status: 'pending'; purchaseId: string }
  | { status: 'verified'; customerInfo: CustomerInfo }
  | { status: 'failed'; error: SubKitError }
```

### Sync und Restore

```ts
await subkit.syncPurchases({ reason: 'foreground' })
await subkit.restorePurchases()
```

Wichtig:

- `syncPurchases()` nutzt nur stille Sync-Pfade.
- `restorePurchases()` ist explizit user-visible und darf Store-Restore-Verhalten nutzen.

### Events

```ts
const unsubscribeCustomerInfo = subkit.onCustomerInfoChanged((customerInfo) => {
  // update app state
})

const unsubscribeSync = subkit.onPurchaseSyncStateChanged((state) => {
  // idle | syncing | backoff | error
})

const unsubscribeConflict = subkit.onOwnershipConflict((conflict) => {
  // show account/support hint
})
```

## Automatic IAP Sync

Auto-Sync ist Kernfunktion der SDK.

### Trigger

```ts
type PurchaseSyncReason =
  | 'app_start'
  | 'foreground'
  | 'identity_changed'
  | 'purchase_event'
  | 'manual_restore'
  | 'paywall_preflight'
  | 'queue_retry'
```

SubKit syncs automatisch bei:

- SDK init / App-Start.
- Session-Hydration / `identify()`.
- AppState `background | inactive -> active`, wenn die App lange genug im Hintergrund war.
- Purchase-Listener-Event.
- Optional vor Paywall-Anzeige.
- Manuellem Restore.

### Marina-IoT-Pattern

Das bereits gelöste Pattern aus Marina-IoT wird konzeptionell übernommen:

```txt
App Root
  -> SilentSubscriptionStoreSync
      -> wartet auf canonical user id
      -> läuft beim Start
      -> läuft bei Foreground
      -> nutzt in-progress guard
      -> nutzt last-success timestamp
      -> ruft zentralen syncStorePurchases helper
```

Für SubKit wird daraus SDK-intern:

```txt
SubKitIapClient
  -> PurchaseSyncCoordinator
      -> IdentityStore
      -> IapManager
      -> PurchaseQueueStore
      -> ReconcileClient
      -> EntitlementStore
```

### Lifecycle-Algorithmus

#### SDK-Init

```txt
1. cached CustomerInfo laden
2. expo-iap initialisieren
3. Purchase Listener genau einmal registrieren
4. persistente Queue laden
5. wenn Identity vorhanden:
   - Queue flushen
   - syncPurchases({ reason: 'app_start' }) einplanen
```

#### `identify()`

```txt
1. canonical appUserId speichern
2. Store Identity Hints vorbereiten
3. Queue-Einträge prüfen und sicher attachen
4. syncPurchases({ reason: 'identity_changed', force: true })
5. CustomerInfo aktualisieren
```

#### Foreground / neue Session

```txt
AppState background|inactive -> active

wenn:
  - App länger als sessionResumeThresholdMs im Hintergrund war
  - letzter Foreground-Sync älter als foregroundMinIntervalMs ist
  - kein Sync läuft
  - kein Backoff aktiv ist

dann:
  syncPurchases({ reason: 'foreground' })
```

Empfohlene Defaults:

```txt
app_start: einmal pro Prozess/App-Session
foregroundMinIntervalMs: 10-15 Minuten
sessionResumeThresholdMs: 10-15 Minuten
manual_restore: kein langes Intervall, aber dedupliziert
purchase_event: sofort, höchste Priorität
```

#### Purchase Event

```txt
1. Purchase aus Listener normalisieren
2. Purchase in durable Queue upserten
3. Reconcile mit Backend starten
4. Backend validiert und accepted Purchase
5. SDK finished/acknowledged Store Transaction
6. CustomerInfo aktualisieren
```

#### Manual Restore

```txt
1. User klickt Restore Purchases
2. SDK nutzt Restore-/Available-Purchase-Pfade
3. Purchases werden normalisiert und reconciled
4. aktive unowned Purchases können claim_if_unowned erhalten
5. Konflikte gehen sichtbar an UI zurück
```

### Trigger-Priorität

Wenn mehrere Trigger gleichzeitig eintreffen:

```txt
purchase_event
manual_restore
identity_changed
paywall_preflight
app_start
foreground
queue_retry
```

Der Coordinator führt nur einen Sync gleichzeitig aus. Weitere Trigger werden coalesced und danach mit höchster verbleibender Priorität ausgeführt.

### Durable Queue

Pending Purchases müssen App-Restarts überleben.

```ts
type QueuedPurchase = {
  id: string
  platform: 'ios' | 'android'
  store: 'apple_app_store' | 'google_play'
  storeProductId: string
  transactionId?: string
  originalTransactionId?: string
  purchaseToken?: string
  orderId?: string
  purchaseTime?: number
  receipt?: string
  userId?: string
  anonymousId?: string
  createdAt: number
  updatedAt: number
  attempts: number
  lastError?: string
  rawPurchase?: unknown
}
```

Queue-Regeln:

- Upsert per stabiler Purchase Identity.
- iOS bevorzugt `transactionId` / `originalTransactionId`.
- Android bevorzugt `purchaseToken` / `orderId`.
- Keine Receipts/Tokens in Logs.
- Max Queue Size konfigurieren.
- Fehlgeschlagene Syncs bleiben für Retry erhalten.

### Silent Sync vs. Restore

| Verhalten | Silent Auto-Sync | Manual Restore |
|---|---|---|
| App-Start | ja | nein |
| Foreground | ja, gedrosselt | nein |
| darf Prompt auslösen | nein | ja, wenn Store es erfordert |
| kann unowned Purchase claimen | nur konservativ | ja, explizit |
| UI Feedback | optional/leise | sichtbar |
| Konflikte | Event/State | sichtbares Result |

## Runtime API

### `POST /api/runtime/customer-info`

Request:

```ts
type CustomerInfoRequest = {
  appId: string
  appUserId: string
}
```

Response:

```ts
type CustomerInfo = {
  appId: string
  appUserId: string
  checkedAt: string
  entitlements: Record<string, CustomerEntitlement>
  purchases: CustomerPurchase[]
  unclaimedPurchases: CustomerUnclaimedPurchase[]
  storeIdentityHints?: StoreIdentityHints
}
```

### `POST /api/runtime/offerings`

Request:

```ts
type RuntimeOfferingsRequest = {
  appId: string
  appUserId?: string
  placement?: string
  platform?: 'ios' | 'android'
}
```

Response:

```ts
type RuntimeOfferingsResponse = {
  offerings: Offering[]
}
```

### `POST /api/runtime/iap/reconcile`

Canonical endpoint für Auto-Sync, Purchase Events und Restore.

Request:

```ts
type IapReconcileRequest = {
  appId: string
  appUserId?: string
  installationId: string
  sessionId: string
  reason: PurchaseSyncReason
  platform: 'ios' | 'android'
  storeIdentities?: StoreIdentityHints
  purchases: NormalizedStorePurchase[]
}
```

Normalized Purchase:

```ts
type NormalizedStorePurchase = {
  store: 'apple_app_store' | 'google_play'
  storeProductId: string
  transactionId?: string
  originalTransactionId?: string
  purchaseToken?: string
  linkedPurchaseToken?: string
  orderId?: string
  purchaseTime?: number
  receipt?: string
  environment?: 'sandbox' | 'production' | 'unknown'
  rawPayload?: unknown
}
```

Response:

```ts
type IapReconcileResponse = {
  customerInfo: CustomerInfo
  acceptedPurchases: string[]
  finishableTransactions: FinishableTransaction[]
  conflicts: PurchaseOwnershipConflict[]
  rejectedPurchases: RejectedPurchase[]
  checkedAt: string
}
```

### Auth

MVP kann vorhandene Runtime-Auth verwenden, langfristig aber:

- per-App public SDK key
- scopes: offerings read, customer-info read, iap reconcile
- key rotation
- auditierbare Verwendung
- keine global-only Runtime Secrets für mobile SDKs

## Server-Datenmodell

Bestehende Konzepte bleiben:

- `apps`
- `products`
- `entitlements`
- `offerings`
- `offeringPackages`
- `appUsers`
- `entitlementGrants`
- `purchaseEvents`

Ergänzungen:

### `store_purchases`

Stabile Store-Kauf-Identität.

Wichtige Felder:

```txt
id
appId
store
platform
environment
storeProductId
productId
entitlementId
transactionId
originalTransactionId
purchaseTokenHash
linkedPurchaseTokenHash
orderId
status
startsAt
expiresAt
revokedAt
firstSeenAt
lastSeenAt
```

Unique Keys:

```txt
Apple: appId + store + environment + originalTransactionId
Google: appId + store + environment + purchaseTokenHash
```

### `store_purchase_owners`

Ownership-/Alias-Modell.

```txt
id
storePurchaseId
appUserId
role: current | alias | previous | disputed
source: app_account_token | obfuscated_account_id | receipt_submit | restore | server_notification | manual_admin | migration
confidence: strong | medium | weak | manual
createdAt
replacedAt
```

Regeln:

- Nur ein `current` Owner pro Store Purchase.
- Transfer nur explizit/auditiert.
- Konflikte werden nicht automatisch gelöst.

### `app_user_store_identities`

Store-Identity-Hints pro App User.

```txt
id
appId
appUserId
store
appAccountTokenHash
obfuscatedAccountIdHash
obfuscatedProfileIdHash
createdAt
lastSeenAt
```

### `store_purchase_events`

Idempotency-/Event-Ledger.

```txt
id
appId
storePurchaseId
store
eventKey
eventType
processedAt
status: processed | duplicate | ignored | failed
detail
```

Event Keys:

```txt
Apple notification: notificationUUID
Apple client submit: apple:{environment}:{transactionId}
Google RTDN: google:{packageName}:{purchaseTokenHash}:{eventType}:{eventTimeMillis}
Client Idempotency-Key: request header
```

### `entitlement_grants` erweitern

Neue optionale Links:

```txt
storePurchaseId
ownershipSource
```

`ownershipSource`:

```txt
direct_app_user
app_account_token
obfuscated_account_id
claimed_restore
manual_admin
unowned
```

## Ownership-Strategie

### Wenn Store User ID fehlt

Direkter App-Store-/Play-Store-Kauf kann ohne App-User-ID eintreffen.

Backend-Verhalten:

```txt
1. Store Purchase validieren
2. store_purchases upserten
3. wenn kein Owner sicher bestimmbar:
   - status pending_claim
   - kein user-spezifischer entitlementGrant
4. bei späterem App-Start/Foreground/Restore:
   - SDK sendet Purchase mit aktueller appUserId
   - Backend claimt, wenn unowned und valid
```

### Claim-Regeln

Safe Auto-Claim:

```txt
- Store Purchase ist unowned
- Receipt/Purchase Token validiert erfolgreich
- Purchase ist active/trialing/billing_retry
- Runtime-Kontext enthält authentifizierten appUserId
```

Idempotent Success:

```txt
- Purchase gehört bereits diesem appUserId
- CustomerInfo zurückgeben
```

Conflict:

```txt
- Purchase gehört anderem appUserId
- keine sichere Alias-/Merge-Regel
- keine Entitlement-Übertragung
- Konfliktantwort zurückgeben
```

Admin Transfer:

```txt
- nur Console/Admin API
- Support verifiziert Account Merge
- alter Owner -> previous
- neuer Owner -> current
- alter Grant revoken
- neuer Grant erstellen/aktualisieren
- Audit Event schreiben
```

## Store Identity Hints

Wenn möglich, setzt die SDK beim Kauf Store-Account-Hints.

### Apple

```txt
appAccountToken
```

Regeln:

- UUID.
- stabil pro App User und App.
- pseudonym.
- keine E-Mail.
- keine rohe interne personenbezogene ID.

### Google

```txt
obfuscatedAccountId
obfuscatedProfileId
```

Regeln:

- stabil und pseudonym.
- kein Klartext-User, keine E-Mail.
- serverseitig hashbar und matchbar.

Diese Hints helfen Store Notifications später beim Owner-Matching. Wenn sie fehlen, rettet Auto-Sync beim nächsten App-Start/Foreground.

## Store Notifications

Client-Sync ist wichtig, aber nicht die einzige Wahrheit.

Server sollte später zusätzlich ingestieren:

```txt
POST /api/stores/apple/notifications
POST /api/stores/google/rtdn
```

Verarbeitung:

```txt
1. Notification authentifizieren/signaturprüfen
2. Payload validieren
3. Store Purchase normalisieren
4. store_purchases upserten
5. Owner via appAccountToken / obfuscatedAccountId suchen
6. Entitlement Grants aktualisieren, wenn Owner klar
7. Event Ledger schreiben
8. Duplicates idempotent 2xx beantworten
```

## Privacy und Security

- Keine rohen Google Purchase Tokens dauerhaft speichern.
- Keine rohen Receipts/JWS Payloads in Logs.
- Purchase Tokens serverseitig mit Pepper hashen.
- Account-Hints nur pseudonym speichern.
- Konfliktantworten dürfen keine fremde User-ID oder E-Mail verraten.
- Runtime SDK Key pro App und Scope.
- Apple-/Google-Credentials nur serverseitig.
- Auto-Sync-Datenerhebung dokumentieren und konfigurierbar machen.

## Offline- und Cache-Verhalten

`CustomerInfo` wird lokal gecached.

Status:

```ts
type CustomerInfoFreshness =
  | 'fresh'
  | 'stale'
  | 'syncing'
  | 'offline'
  | 'error'
```

Regeln:

- Sync-Fehler heißt nicht automatisch „kein Entitlement“.
- Aktive cached Entitlements bleiben bis Expiry bzw. konfigurierter Max-Age nutzbar.
- Backend-Antwort überschreibt Cache.
- UI kann zwischen fresh/stale/offline unterscheiden.

## Fehler-Taxonomie

SDK normalisiert Store-/Network-/Backend-Fehler.

```ts
type SubKitErrorCode =
  | 'cancelled'
  | 'not_ready'
  | 'store_unavailable'
  | 'product_unavailable'
  | 'already_owned'
  | 'network'
  | 'validation_failed'
  | 'ownership_conflict'
  | 'rate_limited'
  | 'unknown'
```

Originale Store Codes können als redacted Diagnostic Metadata erhalten bleiben.

## Milestones

### M1 — Design Doc

Dieses Dokument.

### M2 — Core Contracts

`packages/subkit-core` anlegen:

- Types
- Zod-Schemas
- Error taxonomy
- DTOs für Runtime APIs
- keine Native-/Server-Dependencies

### M3 — Reconcile API Contract

Serverseitige Route und Funktion für:

```txt
POST /api/runtime/iap/reconcile
POST /api/runtime/customer-info
POST /api/runtime/offerings
```

Erst mit Fake-/Demo-Validator, aber mit echter Idempotenz- und Ownership-Struktur.

### M4 — DB Ownership Model

Drizzle-Schema und Migration:

- `store_purchases`
- `store_purchase_owners`
- `app_user_store_identities`
- `store_purchase_events`
- `entitlement_grants.storePurchaseId`
- `entitlement_grants.ownershipSource`

### M5 — SDK SyncCoordinator mit Fake IAP Adapter

Noch ohne echtes `expo-iap`:

- App start sync
- foreground sync
- identity changed sync
- durable queue
- entitlement cache
- in-flight guard
- throttling/backoff

### M6 — `expo-iap` Adapter

Echte native Integration:

- init connection
- purchase listeners
- get available purchases
- request purchase
- finish/acknowledge after backend accepted
- error mapping

### M7 — Apple Validation

- App Store Server API / transaction validation
- Apple Server Notifications V2
- appAccountToken matching

### M8 — Google Validation

- Google Play Developer API
- RTDN
- purchaseTokenHash matching
- obfuscatedAccountId matching

### M9 — Console Visibility

SubKit Console erweitern:

- Runtime SDK key
- SDK setup snippet
- Store Purchases
- Ownership status
- Konflikte
- Claim/Transfer Admin-Aktionen
- Customer timeline

### M10 — Example und Release Hardening

- Expo Example App oder externer Smoke-Test
- Sandbox-Testcheckliste
- Packaging checks
- Public/private package Entscheidung

## Tests

### Core

- Schema parsing.
- Type-level DTO coverage.
- Error normalization.
- Entitlement helper.

### Server

- Duplicate receipt submit.
- Duplicate notification.
- Unowned purchase claim.
- Same-user idempotent submit.
- Other-user conflict.
- Expired/revoked purchase.
- Product mismatch.
- Environment mismatch.
- Missing appUserId.

### SDK

- App-start sync runs once.
- Foreground sync throttles.
- Identity change flushes queue.
- Purchase event enqueues and reconciles.
- Manual restore uses same pipeline.
- Network failure preserves queue.
- Backend accepted purchase triggers finish/acknowledge.
- Backend rejected purchase does not finish.
- Conflict emits conflict event.
- Offline cache does not revoke aggressively.

### Manual / E2E

- iOS sandbox purchase.
- Android test purchase.
- Direct App Store subscription, then app open.
- Direct Play Store subscription, then app open.
- Restore after reinstall.
- Logout User A, login User B on same device.
- Duplicate purchase event.
- Network drop after store success.
- Refund/revoke.
- Renewal/grace/billing retry.

## Acceptance Criteria

- App-Code kann Offerings laden und Packages kaufen, ohne `expo-iap` direkt zu kennen.
- SubKit syncs automatisch beim App-Start.
- SubKit syncs automatisch bei neuer App-Session / Rückkehr aus langer Hintergrundphase.
- Auto-Sync ist still und löst keine Store-Prompts aus.
- Manual Restore bleibt explizit.
- Direkte App-Store-/Play-Store-Käufe werden beim nächsten Start/Foreground erkannt.
- Fehlende Apple-/Google-User-ID blockiert Reconciliation nicht.
- SDK wartet auf canonical App User, bevor user-spezifische Grants entstehen.
- Purchases können vor Identity verfügbar sein und später sicher attached werden.
- Backend validiert Store Purchases serverseitig.
- Duplicate Events erzeugen keine Duplicate Grants.
- Transaktionen werden erst nach Backend-Akzeptanz finished/acknowledged.
- User-A/B-Konflikte werden nicht still transferiert.
- Offline-Sync-Fehler entziehen aktive cached Entitlements nicht sofort.
- Raw Receipts/Tokens werden nicht geloggt oder dauerhaft ungeschützt gespeichert.

## Entscheidungen

### 1. Runtime-Endpunkte

Entscheidung: **getrennte Endpunkte, aber ein canonical Reconcile-Pfad für Purchases.**

SDK-facing Endpunkte:

```txt
POST /api/runtime/offerings
POST /api/runtime/customer-info
POST /api/runtime/iap/reconcile
POST /api/runtime/purchases/restore
```

`/api/runtime/iap/reconcile` ist der einzige canonical Write-/Sync-Pfad für Store-Purchase-Daten aus der SDK. Er verarbeitet Auto-Sync, Purchase Events, Restore-Ergebnisse und Queue-Retries.

Keine separaten SDK-Endpunkte für `purchases/receipt` und `purchases/claim` im MVP. Diese Unterscheidung bleibt interne Service-Logik bzw. später Admin-/Support-API.

Begründung:

- Auto-Sync sendet oft mehrere Purchases auf einmal.
- Receipt Submit, Restore und Claim brauchen dieselbe Idempotenz- und Ownership-Logik.
- Ein canonical Reconcile-Endpunkt reduziert divergierende Grant-Pfade.
- Read-Modelle (`offerings`, `customer-info`) bleiben getrennt und cachebar.

### 2. Auto-Sync ohne identifizierten User

Entscheidung: **Default: nicht aktiv Store Purchases scannen, solange kein canonical App User bekannt ist.**

Regeln:

- Automatischer App-Start-/Foreground-Sync wartet auf `identify()` oder einen initialen `appUserId`.
- Wenn eine App anonyme Nutzung will, muss sie einen expliziten anonymen App User setzen, z. B. `identify({ userId: 'anon_...' })` oder eine SubKit-Anon-Identity nutzen.
- Purchase-Listener-Events aus einer laufenden Kauf-Session dürfen vor Identity in die lokale Queue, werden aber nicht serverseitig geclaimed, bis Identity vorhanden ist.
- Manual Restore erfordert Identity. Ohne Identity gibt die SDK `missing_identity` zurück.

Begründung:

- Shared Devices sind real: User A kauft, loggt aus, User B öffnet App.
- Ein anonymer Store-Scan ohne App-User kann später falsch attached werden.
- Sicherer Default: erst canonical Identity, dann Store-Reconcile.

### 3. Definition „neue App-Session“

Entscheidung: Eine neue SDK-App-Session entsteht bei:

```txt
- Cold Process Start / SDK configure
- App war mindestens sessionResumeThresholdMs im Hintergrund und wird wieder active
- appUserId ändert sich durch identify/resetIdentity
- Host-App ruft optional subkit.startNewSession() auf
```

Default:

```ts
sessionResumeThresholdMs: 15 * 60 * 1000
```

Die SDK erzeugt eine `sessionId` pro SDK-App-Session. Bei Identity-Wechsel wird eine neue Session erzeugt, weil Purchase Ownership sonst vermischt werden kann.

### 4. Foreground-Schwelle

Entscheidung: **15 Minuten Default.**

```ts
foregroundMinIntervalMs: 15 * 60 * 1000
sessionResumeThresholdMs: 15 * 60 * 1000
```

Ausnahmen:

- `purchase_event` syncs sofort.
- `manual_restore` syncs sofort, aber dedupliziert.
- `identity_changed` syncs sofort.
- `paywall_preflight` darf force-syncen, wenn die Paywall gerade Zugriff verkaufen würde.

Begründung:

- Store Notifications sollen langfristig die primäre Frischequelle sein.
- Foreground-Events sind noisy.
- 15 Minuten ist konservativ genug gegen Store-/Backend-Druck und frisch genug für direkte Store-Käufe.

### 5. Promptfreie `expo-iap` APIs für Auto-Sync

Entscheidung: **Auto-Sync nutzt nur eine explizite Safe-Read-Allowlist.**

Erlaubt für Auto-Sync:

```txt
initConnection
purchaseUpdatedListener
purchaseErrorListener
getAvailablePurchases
fetchProducts
finishTransaction, aber nur nach Backend-Akzeptanz
endConnection bei Cleanup
```

Nicht erlaubt für Auto-Sync:

```txt
requestPurchase
restorePurchases
syncIOS
presentCodeRedemptionSheetIOS
showManageSubscriptionsIOS
beginRefundRequestIOS
```

`restorePurchases` und `syncIOS` bleiben nur hinter expliziter User-Aktion oder Developer-Force-Flag, weil sie je nach Plattform/Account-State promptend sein können.

Hinweis: Diese Allowlist muss im ersten echten iOS-/Android-Sandbox-Test validiert werden. Wenn `getAvailablePurchases` auf einer Plattform wider Erwarten promptet, wird diese Plattform aus Silent Sync entfernt und nur über Manual Restore unterstützt.

### 6. Apple `appAccountToken`

Entscheidung: **SubKit erzeugt den Token serverseitig by default. Host-App kann advanced override liefern, sollte es aber normalerweise nicht.**

Regeln:

- Server erzeugt pro `appId + appUserId` einen stabilen, zufälligen UUID-Token.
- Token wird in SubKit gespeichert und bei `identify()` / `customer-info` an die SDK zurückgegeben.
- SDK verwendet diesen UUID bei Apple-Purchase-Requests, sofern `expo-iap` ihn unterstützt.
- Token ist pseudonym und enthält keine E-Mail, keine rohe interne User-ID und keine personenbezogene Klartextinformation.
- Backend speichert zusätzlich einen Hash für Matching/Audit.

Begründung:

- Apple erwartet UUID-Form.
- Serverseitig persistierte Zufalls-UUID vermeidet PII und bleibt trotzdem geräteübergreifend stabil.

### 7. Google `obfuscatedAccountId`

Entscheidung: **SubKit erzeugt auch Google Store Identity Hints serverseitig by default.**

Regeln:

- Server erzeugt pro `appId + appUserId` einen stabilen pseudonymen `obfuscatedAccountId`.
- Optional kann pro Profil/Subaccount ein `obfuscatedProfileId` erzeugt werden; default ist `undefined`.
- SDK verwendet diese Werte bei Google-Purchase-Requests, sofern `expo-iap` sie unterstützt.
- Keine E-Mail, keine rohe App-User-ID, keine personenbezogene Klartextinformation.
- Backend speichert nur Hash-/Mapping-Daten für Matching.

Begründung:

- Host-Apps sollen nicht selbst PII-sichere Store-Identifier entwerfen müssen.
- Einheitliches Matching für Google RTDN und Client-Reconcile.

### 8. Offline-Policy

Entscheidung: **Default ist tolerant cached access, nicht strict server-only.**

Default-Policy:

```ts
customerInfoStaleAfterMs: 24 * 60 * 60 * 1000
nonExpiringEntitlementMaxOfflineAgeMs: 30 * 24 * 60 * 60 * 1000
```

Regeln:

- Subscription-Entitlements mit `expiresAt` bleiben offline bis `expiresAt` gültig.
- Grace-/Billing-Retry-Zustände gelten bis zum servergelieferten `expiresAt` oder `graceUntil`.
- Non-Expiring-/Lifetime-/Non-Consumable-Entitlements bleiben offline bis `verifiedAt + nonExpiringEntitlementMaxOfflineAgeMs` gültig.
- Nach `customerInfoStaleAfterMs` markiert die SDK den Cache als `stale` und versucht Sync, entzieht aber nicht sofort Zugriff.
- Apps können auf `strict` umstellen, wenn Produkt/Compliance es verlangt.

Begründung:

- Zahlende User sollen bei schlechtem Netz nicht sofort ausgesperrt werden.
- Refund-/Revocation-Risiko wird über Server Notifications und nächsten Sync reduziert.

### 9. Family Sharing V1

Entscheidung: **konservativ unterstützen: Access ja, Ownership nein.**

V1-Regeln:

- Wenn Store Validation eindeutig `family_shared` meldet, darf SubKit ein Entitlement als `source: 'family_shared'` ausgeben.
- Family-Shared Purchases dürfen nicht als Ownership-Beweis genutzt werden.
- Kein Claim, kein Transfer, keine Revenue Attribution auf Family-Shared Purchases.
- Konflikte werden nicht mit Family-Sharing-Daten automatisch gelöst.
- Wenn die Plattform Family Sharing nicht eindeutig kennzeichnet, wird kein Family-Ownership-Sonderfall erfunden.

Begründung:

- Family Sharing ist fachlich Access, aber nicht zwingend Kauf-Ownership.
- V1 soll keine falschen Account-Transfers verursachen.

### 10. Package-Veröffentlichung

Entscheidung: **erstmal private Workspace Packages.**

Package-Namen für MVP:

```txt
@piparotech/subkit-core
@piparotech/subkit-expo
```

Regeln:

- `private: true` in `package.json`.
- Keine öffentliche npm-Veröffentlichung im MVP.
- API trotzdem sauber halten, aber ohne Public-SemVer-/OSS-Druck.
- Spätere Public-Package-Entscheidung bekommt eigenen Design-/Rename-Pass.
