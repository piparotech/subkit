import { Trans } from '@lingui/react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIText } from './PUIText'

const meta = {
  title: 'PUI/i18n',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

// Toggle the Locale toolbar (EN/DE) to see <Trans> translate. The primitives
// themselves are i18n-agnostic — they just render the children you pass.
// (Apps use the <Trans>…</Trans> macro with their babel setup; here we use the
// runtime <Trans id/> so the demo needs no Storybook-specific babel config.)
export const Trans_: Story = {
  name: 'Trans (toggle Locale: EN/DE)',
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <PUIText variant="title2">
        <Trans id="Welcome to piparo" message="Welcome to piparo" />
      </PUIText>
      <div className="flex gap-2">
        <PUIButton>
          <Trans id="Save" message="Save" />
        </PUIButton>
        <PUIButton variant="outline">
          <Trans id="Cancel" message="Cancel" />
        </PUIButton>
      </div>
    </div>
  ),
}
