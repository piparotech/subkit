# @piparotech/subkit-expo-iap

Private Expo / React Native SDK for SubKit-managed in-app purchases.

SubKit is the entitlement authority. `expo-iap` is only the native store adapter.

## Basic usage

Configure SubKit once during app startup, then import the shared `client` wherever you need it.

```ts
import { client, configureSubKit } from "@piparotech/subkit-expo-iap";

configureSubKit({
  // SubKit app id from your dashboard; not the Apple app id, bundle id, or Android package name.
  appId: "app_123",
  // Stable user id from your app/backend/auth system. Purchases require an identified user.
  appUserId: "user_123",
  // Stable id for this app install on this device. Generate once, persist locally, and reuse on every launch.
  installationId: "install_abc",
  // Public/runtime SubKit key for mobile apps. Do not use the server secret key here.
  sdkKey: "runtime_public_key",
});

await client.start();
```

If `client` is accessed before `configureSubKit(...)` was called, the SDK throws an error.

## Where to call `configureSubKit`

Call `configureSubKit(...)` once during app bootstrap, before any paywall, purchase button, entitlement check, or sync logic uses `client`.

Good places in an Expo app:

- Expo Router: your root `app/_layout.tsx`, after loading persisted app state such as `installationId` and the current auth user.
- Classic Expo app: your root `App.tsx`, inside the app initialization flow before rendering purchase-dependent UI.
- A root provider/component that runs once after auth/session hydration.

Do not call `configureSubKit(...)` inside paywall screens, purchase buttons, or components that re-render often. Calling it again replaces the configured client and stops the previous one.

If the user is already known during startup, pass `appUserId` to `configureSubKit(...)`. If the user logs in later, configure SubKit without `appUserId` first and call `client.identify(user.id)` after login.

Example with Expo Router:

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { client, configureSubKit } from "@piparotech/subkit-expo-iap";

import { getOrCreateInstallationId } from "../src/installation-id";
import { useAuth } from "../src/auth";

export default function RootLayout() {
  const { user, isLoaded } = useAuth();
  const [subkitReady, setSubkitReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    async function configure() {
      const installationId = await getOrCreateInstallationId();

      configureSubKit({
        appId: "app_123",
        appUserId: user?.id,
        installationId,
        sdkKey: "runtime_public_key",
      });

      await client.start();
      setSubkitReady(true);
    }

    configure().catch((error: unknown) => {
      console.error("Failed to configure SubKit", error);
    });
  }, [isLoaded, user?.id]);

  if (!subkitReady) return null;

  return <Stack />;
}
```

For login after app startup:

```ts
import { client } from "@piparotech/subkit-expo-iap";

await client.identify(user.id);
```

The SDK uses these defaults:

- `apiBaseUrl`: `https://subkit.piparo.tech`
- `platform`: detected from React Native (`ios` or `android`)
- `adapterBundle`: Expo IAP adapter from `expo-iap`
- `queue`: in-memory purchase queue
- `appStateSource`: React Native `AppState`
- `iap`: automatic sync on app start, foreground, and purchase events

For production apps, pass a persistent `queue` as shown in the advanced example.

## Checking whether the user is subscribed

SubKit exposes entitlements, not just a raw `isSubscribed` flag. Your app should check the entitlement your product grants, for example `pro` or `premium`. This keeps your app logic stable even if multiple App Store / Play Store products grant the same access.

```ts
import { client } from "@piparotech/subkit-expo-iap";

await client.identify("user_123");

const PRO_ENTITLEMENT = "pro"; // the entitlement key configured in SubKit
const customerInfo = await client.getCustomerInfo();
const hasPro = customerInfo.entitlements[PRO_ENTITLEMENT]?.active === true;

if (hasPro) {
  // unlock paid features
} else {
  // show paywall or limited experience
}
```

`identify()` also returns `CustomerInfo`, so you can check immediately after login:

```ts
const PREMIUM_ENTITLEMENT = "premium"; // another entitlement key configured in SubKit
const customerInfo = await client.identify("user_123");
const hasPremium =
  customerInfo.entitlements[PREMIUM_ENTITLEMENT]?.active === true;
```

Use the entitlement key/identifier configured in SubKit, not the package id (`monthly`) or store product id (`com.example.pro.monthly`).

## Purchase flow

```ts
import { client } from "@piparotech/subkit-expo-iap";

await client.identify("user_123");
await client.getOfferings();
const result = await client.purchasePackage("monthly");
```

The SDK passes SubKit-generated store identity hints to `expo-iap` automatically:

- iOS: `appAccountToken`
- Android: `obfuscatedAccountId`, optional `obfuscatedProfileId`

The app does not pass those values manually.

## Advanced configuration

Override defaults only when your app needs custom behavior:

```ts
import { AppState, Platform } from "react-native";
import {
  configureSubKit,
  createStoredPurchaseQueueStore,
} from "@piparotech/subkit-expo-iap";
import { createExpoIapAdapter } from "@piparotech/subkit-expo-iap/expo-iap";
import AsyncStorage from "@react-native-async-storage/async-storage";

configureSubKit({
  adapterBundle: createExpoIapAdapter(),
  apiBaseUrl: "https://subkit.piparo.tech",
  appId: "app_123",
  appUserId: "user_123",
  installationId: "install_abc",
  platform: Platform.OS === "ios" ? "ios" : "android",
  queue: createStoredPurchaseQueueStore({ storage: AsyncStorage }),
  sdkKey: "runtime_public_key",
  appStateSource: {
    getCurrentState: () =>
      AppState.currentState === "active" ? "active" : "background",
    subscribe: (listener) => {
      const subscription = AppState.addEventListener("change", (state) => {
        listener(
          state === "active"
            ? "active"
            : state === "inactive"
              ? "inactive"
              : "background",
        );
      });
      return { remove: () => subscription.remove() };
    },
  },
  iap: {
    autoSync: true,
    syncOnAppStart: true,
    syncOnForeground: true,
    syncOnPurchaseEvent: true,
    foregroundMinIntervalMs: 15 * 60 * 1000,
    sessionResumeThresholdMs: 15 * 60 * 1000,
  },
});
```

Advanced options:

- `adapterBundle`: native store adapter. The default uses `expo-iap`. Override it for tests or a custom native purchase bridge.
- `apiBaseUrl`: SubKit runtime API URL. Defaults to `https://subkit.piparo.tech`.
- `appStateSource`: foreground/background source. The default uses React Native `AppState`.
- `iap`: automatic sync behavior. By default, the SDK syncs on app start, foreground, and purchase events.
- `platform`: store platform. The default uses React Native `Platform.OS` and supports `ios` and `android`.
- `queue`: local purchase queue. The default is in-memory. Use `createStoredPurchaseQueueStore` for durable production sync.

## What `createStoredPurchaseQueueStore` does

`createStoredPurchaseQueueStore({ storage })` creates a durable local queue for purchase events that still need to be sent to SubKit and finished in the store.

Why this matters:

- the user can buy while the network is flaky
- the app can be killed between purchase completion and server reconcile
- SubKit may verify the purchase, but finishing the transaction in Apple/Google can fail temporarily
- purchase listener events can arrive before your app is ready to sync them

The queue stores pending purchases locally and retries them on later syncs. A transaction is only finished after SubKit's runtime API says it is finishable.

In production, pass a storage implementation such as AsyncStorage:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStoredPurchaseQueueStore } from "@piparotech/subkit-expo-iap";

const queue = createStoredPurchaseQueueStore({ storage: AsyncStorage });
```

If you do not pass `queue`, the SDK uses an in-memory queue. That is useful for tests and prototypes, but pending purchases are lost when the app restarts. For production apps, prefer the stored queue. If your app has stricter local-data requirements, provide an encrypted storage implementation with the same `getItem` / `setItem` / `removeItem` shape.

## Automatic sync

The SDK can sync purchases automatically:

- on app start
- after `identify()`
- when the app returns to foreground after a configured background duration
- after purchase listener events
- during manual restore

Silent sync uses `getAvailablePurchases()` and never calls prompt-prone restore APIs. Manual restore uses `restorePurchases()` explicitly.

## Safety

- Transactions are finished only after SubKit runtime reconcile returns them as finishable.
- Pending purchases are queued durably when a storage-backed queue is provided.
- Queued purchases are scoped to the app user that first observed them; switching identities does not reconcile one user's pending purchases under another user.
- Ownership conflicts are returned by the runtime API and are not silently transferred.
- Server-side Apple/Google receipt validation is still a later milestone; the current reconcile path records `accepted_unverified` semantics.
