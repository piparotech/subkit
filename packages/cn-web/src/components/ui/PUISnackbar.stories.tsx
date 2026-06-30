import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUISnackbarProvider, type PUISnackbarProviderProps, useSnackbar } from './PUISnackbar'

function Demo() {
  const { show } = useSnackbar()
  return (
    <div className="flex flex-col items-start gap-3">
      <PUIButton onPress={() => show({ message: 'Link copied to clipboard.' })}>
        Show default
      </PUIButton>
      <PUIButton
        onPress={() =>
          show({
            message: 'Message deleted.',
            action: { label: 'Undo', onPress: () => undefined },
          })
        }
        variant="secondary"
      >
        Show with action
      </PUIButton>
      <PUIButton
        onPress={() => show({ message: 'Profile updated.', state: 'success' })}
        variant="secondary"
      >
        Show success
      </PUIButton>
      <PUIButton
        onPress={() =>
          show({
            message: 'Could not save your changes. Check your connection and try again.',
            state: 'failure',
            action: { label: 'Retry', onPress: () => undefined },
          })
        }
        variant="destructive"
      >
        Show failure
      </PUIButton>
      <PUIButton
        onPress={() => show({ message: 'Uploading…', state: 'loading', duration: 0 })}
        variant="secondary"
      >
        Show loading (persists)
      </PUIButton>
    </div>
  )
}

function Wrapper({ position }: Partial<PUISnackbarProviderProps>) {
  return (
    <PUISnackbarProvider position={position}>
      <Demo />
    </PUISnackbarProvider>
  )
}

const meta = {
  title: 'PUI/Overlays/Snackbar',
  component: PUISnackbarProvider,
  tags: ['autodocs'],
  args: { children: null },
} satisfies Meta<typeof PUISnackbarProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Bottom: Story = { render: () => <Wrapper position="bottom" /> }

export const Top: Story = { render: () => <Wrapper position="top" /> }
