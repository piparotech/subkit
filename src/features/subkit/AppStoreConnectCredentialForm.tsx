import { PUIField, PUIInput, type PUIFieldRenderProps } from '@piparo/cn-web'
import * as React from 'react'

import type { AppStoreConnectCredentialDraft } from './types'

export function CredentialForm({
  draft,
  hasStoredKey,
  onChange,
}: {
  draft: AppStoreConnectCredentialDraft
  hasStoredKey: boolean
  onChange: (field: keyof AppStoreConnectCredentialDraft, value: string) => void
}) {
  const [privateKeyFileName, setPrivateKeyFileName] = React.useState<string | null>(null)
  const [privateKeyUploadError, setPrivateKeyUploadError] = React.useState<string | null>(null)

  const handlePrivateKeyFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    setPrivateKeyUploadError(null)

    if (file == null) {
      setPrivateKeyFileName(null)
      onChange('privateKey', '')
      return
    }

    if (!file.name.endsWith('.p8')) {
      setPrivateKeyFileName(null)
      onChange('privateKey', '')
      setPrivateKeyUploadError('Please upload the .p8 private key file from App Store Connect.')
      return
    }

    file
      .text()
      .then((contents) => {
        setPrivateKeyFileName(file.name)
        onChange('privateKey', contents)
      })
      .catch(() => {
        setPrivateKeyFileName(null)
        onChange('privateKey', '')
        setPrivateKeyUploadError('Could not read the selected .p8 file.')
      })
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
        <PUIField label="Key ID">
          {(field) => <PUIInput className="font-mono" onChange={(event) => onChange('keyId', event.target.value)} placeholder="ABC123DEFG" value={draft.keyId} {...inputFieldProps(field)} />}
        </PUIField>
        <PUIField label="Issuer ID">
          {(field) => <PUIInput className="font-mono" onChange={(event) => onChange('issuerId', event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={draft.issuerId} {...inputFieldProps(field)} />}
        </PUIField>
        <PUIField hint="Required for Sales & Trends reports." label="Vendor Number">
          {(field) => <PUIInput className="font-mono" onChange={(event) => onChange('vendorNumber', event.target.value)} placeholder="12345678" value={draft.vendorNumber} {...inputFieldProps(field)} />}
        </PUIField>
        <div className="rounded-[11px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] p-[12px] text-[12.5px] text-[var(--subkit-dim)]">
          <div className="font-semibold text-[var(--subkit-text)]">Least privilege</div>
          <p className="mt-[4px] mb-0 leading-[1.45]">Start with read access. Sales reports, TestFlight, provisioning, and release metadata are checked separately.</p>
        </div>
      </div>
      <div>
        <label className="mb-[7px] block text-[12.5px] font-semibold text-[var(--subkit-text)]" htmlFor="app-store-connect-private-key">
          Private .p8 key file
        </label>
        <div className="rounded-[12px] border border-dashed border-[var(--subkit-border-2)] bg-[var(--subkit-panel-2)] p-[14px]">
          <input
            accept=".p8"
            className="block w-full cursor-pointer rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[10px] py-[8px] text-[12.5px] text-[var(--subkit-text)] file:mr-[10px] file:cursor-pointer file:rounded-[7px] file:border-0 file:bg-[var(--subkit-text)] file:px-[10px] file:py-[6px] file:text-[12px] file:font-semibold file:text-white"
            id="app-store-connect-private-key"
            onChange={handlePrivateKeyFile}
            type="file"
          />
          <div className="mt-[8px] text-[12px] text-[var(--subkit-dim)]">
            {privateKeyFileName != null
              ? `Selected: ${privateKeyFileName}`
              : hasStoredKey
                ? 'A private key is already stored. Upload a new .p8 file only to rotate it.'
                : 'Upload the AuthKey_XXXXXXXXXX.p8 file from App Store Connect.'}
          </div>
          {privateKeyUploadError != null ? <div className="mt-[6px] text-[12px] font-semibold text-[var(--subkit-red)]">{privateKeyUploadError}</div> : null}
        </div>
      </div>
    </div>
  )
}

function inputFieldProps(field: PUIFieldRenderProps) {
  return {
    'aria-describedby': field.describedby,
    'aria-invalid': field.invalid || undefined,
    disabled: field.disabled,
    id: field.id,
  }
}

