import { PanelActions } from '~/components/ui/PanelActions'
import { PanelHeader } from '~/components/ui/PanelHeader'
import { ProductFormFields } from '~/domain/subscriptions/ProductFormFields'
import { TrialToggle } from '~/domain/subscriptions/TrialToggle'
import type { EditableSubscriptionTextField, SubscriptionProduct } from '~/domain/subscriptions/types'

export function SubscriptionPanel({
  mode,
  onClose,
  onFieldChange,
  onSave,
  onTrialToggle,
  subscription,
}: {
  mode: 'new' | 'edit'
  onClose: () => void
  onFieldChange: (field: EditableSubscriptionTextField, value: string) => void
  onSave: () => void
  onTrialToggle: () => void
  subscription: SubscriptionProduct
}) {
  return (
    <aside
      aria-label={mode === 'new' ? 'New subscription' : `Edit ${subscription.name}`}
      className="fixed bottom-0 right-0 top-0 z-[90] flex w-[480px] animate-[subkit-slide-in_220ms_cubic-bezier(.2,.7,.2,1)] flex-col bg-[var(--subkit-panel)] shadow-[-16px_0_40px_-16px_rgba(20,20,50,0.28)] max-sm:left-0 max-sm:w-auto"
      role="dialog"
    >
      <PanelHeader
        kicker={mode === 'new' ? 'New product' : 'Edit subscription'}
        onClose={onClose}
        title={mode === 'new' ? 'New subscription' : subscription.name || 'Subscription'}
      />
      <div className="flex-1 overflow-y-auto p-[22px]">
        <div className="flex flex-col gap-[18px]">
          <ProductFormFields onTextChange={onFieldChange} subscription={subscription} />
          <TrialToggle enabled={subscription.trialOn} onToggle={onTrialToggle} />
        </div>
      </div>
      <PanelActions primaryLabel={mode === 'new' ? 'Create subscription' : 'Save changes'} onClose={onClose} onPrimary={onSave} />
    </aside>
  )
}
