import { PanelActions } from '~/components/ui/PanelActions'
import { PanelHeader } from '~/components/ui/PanelHeader'
import { ProductFormFields } from '~/domain/products/ProductFormFields'
import { TrialToggle } from '~/domain/products/TrialToggle'
import type { CatalogProduct, EditableCatalogProductTextField } from '~/domain/products/types'

export function ProductPanel({
  mode,
  onClose,
  onFieldChange,
  onSave,
  onTrialToggle,
  product,
}: {
  mode: 'new' | 'edit'
  onClose: () => void
  onFieldChange: (field: EditableCatalogProductTextField, value: string) => void
  onSave: () => void
  onTrialToggle: () => void
  product: CatalogProduct
}) {
  return (
    <aside
      aria-label={mode === 'new' ? 'New product' : `Edit ${product.name}`}
      className="fixed top-0 right-0 bottom-0 z-[90] flex w-[520px] animate-[subkit-slide-in_220ms_cubic-bezier(.2,.7,.2,1)] flex-col bg-[var(--subkit-panel)] shadow-[-16px_0_40px_-16px_rgba(20,20,50,0.28)] max-sm:left-0 max-sm:w-auto"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <PanelHeader
        kicker={mode === 'new' ? 'New product' : 'Edit product'}
        onClose={onClose}
        title={mode === 'new' ? 'New product' : product.name || 'Product'}
      />
      <div className="flex-1 overflow-y-auto p-[22px]">
        <div className="mb-[18px] rounded-[12px] border border-[var(--subkit-accent-line)] bg-[var(--subkit-accent-soft)] p-[12px] text-[12.5px] leading-[1.45] text-[var(--subkit-accent-d)]">
          Saving here updates SubKit's canonical catalog only. Apple and Google changes require a
          separate preview and confirmation.
        </div>
        <div className="flex flex-col gap-[18px]">
          <ProductFormFields onTextChange={onFieldChange} product={product} />
          <TrialToggle enabled={product.trialOn} onToggle={onTrialToggle} />
        </div>
      </div>
      <PanelActions
        primaryLabel={mode === 'new' ? 'Create product in SubKit' : 'Save in SubKit'}
        onClose={onClose}
        onPrimary={onSave}
      />
    </aside>
  )
}
