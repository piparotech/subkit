import { z } from 'zod'

import { type AppSettingsConfig, type PushTopic } from './config'
import { type SettingsStorage } from './storage'

/**
 * On-device push-topic subscriptions — the UI/prefs VORSTUFE without an account. The user toggles
 * which topics they want; we persist the set on-device and hand the resolved list to the push-topic
 * mechanism (FCM/edge topic subscribe). The actual subscribe/unsubscribe call lives in the push
 * mechanic, NOT here — this module only owns the preference state. Server-side multi-channel routing
 * is the separate `notification-preferences` capability.
 */

export const TOPICS_STORAGE_KEY = 'piparo.app-settings.topics.v1'
export const TOPICS_SCHEMA_VERSION = 1

/** Persisted as the explicit per-topic choices the user has made (absent => follow the default). */
export const PersistedTopics = z.strictObject({
  version: z.literal(TOPICS_SCHEMA_VERSION),
  /** topicId -> subscribed. Only ids the user actually toggled appear here. */
  choices: z.record(z.string(), z.boolean()),
})
export type PersistedTopics = z.infer<typeof PersistedTopics>

/** A topic with its effective subscribed state, ready for the toggle UI. */
export type TopicSubscription = PushTopic & { subscribed: boolean }

function defaults(): PersistedTopics {
  return { version: TOPICS_SCHEMA_VERSION, choices: {} }
}

export function migrateTopics(raw: unknown): PersistedTopics {
  if (raw == null || typeof raw !== 'object') return defaults()
  const current = PersistedTopics.safeParse(raw)
  if (current.success) return current.data
  const obj = raw as Record<string, unknown>
  const out = defaults()
  if (obj.choices && typeof obj.choices === 'object') {
    for (const [id, value] of Object.entries(obj.choices as Record<string, unknown>)) {
      if (typeof value === 'boolean') out.choices[id] = value
    }
  }
  return out
}

/** Effective subscription for one topic: the user's explicit choice, else the config default. */
export function isSubscribed(topic: PushTopic, choices: Record<string, boolean>): boolean {
  return topic.id in choices ? (choices[topic.id] as boolean) : topic.defaultSubscribed
}

export type TopicsStoreOptions = {
  config: AppSettingsConfig
  storage: SettingsStorage
  key?: string
}

export type TopicsStore = {
  /** The full catalogue with effective subscribed state, in config order. */
  list(): TopicSubscription[]
  /** The ids that are effectively subscribed — what you pass to the push-topic mechanism. */
  subscribedIds(): string[]
  /** Set one topic's subscription and return the updated catalogue. */
  setSubscribed(topicId: string, subscribed: boolean): TopicSubscription[]
  /** Toggle one topic and return the updated catalogue. */
  toggle(topicId: string): TopicSubscription[]
  /** Forget all explicit choices (back to config defaults). */
  reset(): TopicSubscription[]
}

export function createTopicsStore(options: TopicsStoreOptions): TopicsStore {
  const { config, storage } = options
  const key = options.key ?? TOPICS_STORAGE_KEY
  const known = new Set(config.pushTopics.map((t) => t.id))

  function load(): PersistedTopics {
    const raw = storage.getString(key)
    let parsed: unknown
    if (raw != null) {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = undefined
      }
    }
    const migrated = migrateTopics(parsed)
    // Drop choices for topics no longer in the catalogue so the store stays in sync with config.
    let pruned = false
    for (const id of Object.keys(migrated.choices)) {
      if (!known.has(id)) {
        delete migrated.choices[id]
        pruned = true
      }
    }
    if (raw == null || pruned || JSON.stringify(migrated) !== raw) persist(migrated)
    return migrated
  }

  function persist(value: PersistedTopics): void {
    storage.set(key, JSON.stringify(value))
  }

  function list(choices = load().choices): TopicSubscription[] {
    return config.pushTopics.map((t) => ({ ...t, subscribed: isSubscribed(t, choices) }))
  }

  return {
    list: () => list(),
    subscribedIds: () =>
      list()
        .filter((t) => t.subscribed)
        .map((t) => t.id),
    setSubscribed: (topicId, subscribed) => {
      if (!known.has(topicId)) return list()
      const state = load()
      const next: PersistedTopics = {
        version: TOPICS_SCHEMA_VERSION,
        choices: { ...state.choices, [topicId]: subscribed },
      }
      persist(next)
      return list(next.choices)
    },
    toggle: (topicId) => {
      const topic = config.pushTopics.find((t) => t.id === topicId)
      if (!topic) return list()
      const state = load()
      const current = isSubscribed(topic, state.choices)
      const next: PersistedTopics = {
        version: TOPICS_SCHEMA_VERSION,
        choices: { ...state.choices, [topicId]: !current },
      }
      persist(next)
      return list(next.choices)
    },
    reset: () => {
      const fresh = defaults()
      persist(fresh)
      return list(fresh.choices)
    },
  }
}
