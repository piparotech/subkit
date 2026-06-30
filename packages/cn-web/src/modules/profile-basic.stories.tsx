import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIAvatar,
  PUIBadge,
  PUIButton,
  PUIDialog,
  PUISelect,
  PUIText,
  PUITextArea,
  PUITextInput,
} from '@/components/ui'
import {
  type ProfileClient,
  type ProfileData,
  ProfileError,
  type ProfileUpdate,
  createProfileClient,
  emptyProfile,
  validateField,
} from '@/lib/profile-basic'

import {
  MOCK_BASE_URL,
  SEEDED_PROFILE,
  SEEDED_TOKEN,
  createMockProfileFetch,
} from './mock-profile-basic'

const LOCALES = [
  { label: 'Deutsch (de-DE)', value: 'de-DE' },
  { label: 'Deutsch (de)', value: 'de' },
  { label: 'English (en-US)', value: 'en-US' },
  { label: 'English (en)', value: 'en' },
  { label: 'Français (fr-FR)', value: 'fr-FR' },
]

type Draft = Pick<ProfileData, 'displayName' | 'bio' | 'locale'>
type FieldErrors = Partial<Record<keyof Draft, string>>

function toDraft(profile: ProfileData): Draft {
  return { displayName: profile.displayName, bio: profile.bio, locale: profile.locale }
}

function localeLabel(value: string): string {
  return LOCALES.find((entry) => entry.value === value)?.label ?? value
}

function ProfileView({
  profile,
  onEdit,
  onDelete,
  deleted,
}: {
  profile: ProfileData
  onEdit: () => void
  onDelete: () => void
  deleted: boolean
}) {
  const name = profile.displayName ?? 'Unbenanntes Profil'

  return (
    <div className="flex max-w-md flex-col gap-7">
      <div className="flex items-center gap-4">
        <PUIAvatar name={name} size="lg" src={profile.avatarUrl ?? undefined} />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <PUIText className="truncate font-medium tracking-tight" variant="title3">
              {name}
            </PUIText>
            {deleted ? (
              <PUIBadge dot variant="destructive">
                Gelöscht
              </PUIBadge>
            ) : (
              <PUIBadge dot variant="success">
                Aktiv
              </PUIBadge>
            )}
          </div>
          <PUIText tone="muted" variant="footnote">
            {localeLabel(profile.locale)}
          </PUIText>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <PUIText tone="subtle" variant="caption1">
          Über mich
        </PUIText>
        <PUIText className="max-w-prose" variant="callout">
          {profile.bio ?? 'Noch keine Beschreibung hinterlegt.'}
        </PUIText>
      </div>

      <div className="flex items-center gap-3">
        <PUIButton disabled={deleted} onPress={onEdit}>
          Profil bearbeiten
        </PUIButton>
        <PUIButton disabled={deleted} onPress={onDelete} variant="ghost">
          Konto löschen
        </PUIButton>
      </div>
    </div>
  )
}

function ProfileForm({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial: ProfileData
  saving: boolean
  onCancel: () => void
  onSave: (patch: ProfileUpdate) => void
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial))
  const [errors, setErrors] = useState<FieldErrors>({})

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: validateField(key, value) ?? undefined }))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next: FieldErrors = {
      displayName: validateField('displayName', draft.displayName) ?? undefined,
      bio: validateField('bio', draft.bio) ?? undefined,
      locale: validateField('locale', draft.locale) ?? undefined,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    onSave(draft)
  }

  return (
    <form className="flex max-w-md flex-col gap-5" noValidate onSubmit={onSubmit}>
      <PUIText className="tracking-tight" variant="title3">
        Profil bearbeiten
      </PUIText>

      <PUITextInput
        autoFocus
        error={errors.displayName}
        label="Anzeigename"
        onChange={(event) => setField('displayName', event.target.value || null)}
        value={draft.displayName ?? ''}
      />

      <PUITextArea
        error={errors.bio}
        hint="Maximal 500 Zeichen."
        label="Über mich"
        onChange={(event) => setField('bio', event.target.value || null)}
        rows={4}
        value={draft.bio ?? ''}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="profile-locale">
          <PUIText className="font-medium" variant="subheadline">
            Sprache
          </PUIText>
        </label>
        <PUISelect
          id="profile-locale"
          onValueChange={(value) => setField('locale', value)}
          options={LOCALES}
          value={draft.locale}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <PUIButton loading={saving} type="submit">
          Speichern
        </PUIButton>
        <PUIButton disabled={saving} onPress={onCancel} variant="outline">
          Abbrechen
        </PUIButton>
      </div>
    </form>
  )
}

function ProfileDemo() {
  const client = useMemo<ProfileClient>(
    () =>
      createProfileClient({
        baseUrl: MOCK_BASE_URL,
        getToken: () => SEEDED_TOKEN,
        fetch: createMockProfileFetch(),
      }),
    [],
  )

  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    client.get().then(
      (data) => active && setProfile(data),
      () => active && setError('Profil konnte nicht geladen werden.'),
    )
    return () => {
      active = false
    }
  }, [client])

  const save = useCallback(
    async (patch: ProfileUpdate) => {
      setSaving(true)
      setError(undefined)
      try {
        setProfile(await client.update(patch))
        setEditing(false)
      } catch (cause) {
        setError(
          cause instanceof ProfileError
            ? `Speichern abgelehnt (${cause.code}).`
            : 'Speichern fehlgeschlagen.',
        )
      } finally {
        setSaving(false)
      }
    },
    [client],
  )

  const deleteAccount = useCallback(async () => {
    setConfirmDelete(false)
    try {
      await client.deleteAccount()
      setDeleted(true)
    } catch {
      setError('Konto konnte nicht gelöscht werden.')
    }
  }, [client])

  return (
    <div className="flex flex-col gap-4">
      {editing ? (
        <ProfileForm
          initial={profile}
          onCancel={() => setEditing(false)}
          onSave={save}
          saving={saving}
        />
      ) : (
        <ProfileView
          deleted={deleted}
          onDelete={() => setConfirmDelete(true)}
          onEdit={() => setEditing(true)}
          profile={profile}
        />
      )}

      {error ? (
        <p className="max-w-md" role="alert">
          <PUIText className="text-destructive" variant="footnote">
            {error}
          </PUIText>
        </p>
      ) : null}

      <PUIDialog
        actions={
          <>
            <PUIButton onPress={() => setConfirmDelete(false)} variant="outline">
              Abbrechen
            </PUIButton>
            <PUIButton onPress={deleteAccount} variant="destructive">
              Endgültig löschen
            </PUIButton>
          </>
        }
        description="Deine personenbezogenen Daten werden datenschutzkonform gelöscht. Das kann nicht rückgängig gemacht werden."
        onOpenChange={setConfirmDelete}
        open={confirmDelete}
        title="Konto löschen"
      />
    </div>
  )
}

const seededDescription =
  `Self-service user profile built on the framework-agnostic profile-basic Engine (the shared zod ` +
  `schema, the typed config contract, and the isomorphic fetch client), the same code the platform ` +
  `ships on web and native. In-memory demo: a mock fetch seeds ${SEEDED_PROFILE.displayName}; try ` +
  `editing the master data (inline validation comes from the one shared schema), then run the GDPR ` +
  `account deletion to tombstone the row.`

const meta = {
  title: 'Modules/Profile',
  component: ProfileDemo,
  parameters: {
    layout: 'padded',
    docs: { description: { component: seededDescription } },
  },
} satisfies Meta<typeof ProfileDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
