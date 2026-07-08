import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import { SoftTag } from '~/components/ui/SoftTag'
import { StatusLabel } from '~/components/ui/StatusLabel'
import { ViewTitle } from '~/components/ui/ViewTitle'
import type { CatalogProduct } from '~/domain/products/types'
import { StoreId } from '~/domain/stores/StoreId'

export function ProductsView({
  isFiltering,
  onOpenProduct,
  products,
}: {
  isFiltering: boolean
  onOpenProduct: (product: CatalogProduct) => void
  products: CatalogProduct[]
}) {
  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle
        description="Canonical SubKit products. Store records are bindings that sync through preview and confirmation."
        title="Products"
      />
      <div className="mt-[14px] rounded-[12px] border border-[var(--subkit-accent-line)] bg-[var(--subkit-accent-soft)] px-[14px] py-[11px] text-[12.5px] leading-[1.45] text-[var(--subkit-accent-d)]">
        Products define what SubKit intends to sell or grant. Apple and Google product IDs are store
        bindings, not the canonical source.
      </div>
      <div className="mt-[20px] overflow-hidden rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] max-lg:overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className="grid grid-cols-[1.25fr_0.85fr_0.85fr_1.15fr_1.15fr_0.8fr_0.75fr] gap-[14px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[18px] py-[12px] text-[11px] font-semibold tracking-[0.04em] text-[var(--subkit-faint)] uppercase">
            <div>Product</div>
            <div>Type</div>
            <div>Grants</div>
            <div>Apple binding</div>
            <div>Google binding</div>
            <div>Reference</div>
            <div className="text-right">Status</div>
          </div>
          {products.length === 0 ? (
            <div className="px-[18px] py-[16px]">
              <EmptySettingsText>
                {isFiltering
                  ? 'No products match this search. Clear the search to see all products for this app.'
                  : 'No products yet. Create the first SubKit product, then bind Apple or Google store product IDs from the product panel.'}
              </EmptySettingsText>
            </div>
          ) : null}
          {products.map((product) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[1.25fr_0.85fr_0.85fr_1.15fr_1.15fr_0.8fr_0.75fr] items-center gap-[14px] border-b border-[var(--subkit-border)] px-[18px] py-[14px] text-left last:border-b-0 hover:bg-[var(--subkit-panel-2)]"
              key={product.planId}
              onClick={() => onOpenProduct(product)}
              type="button"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">{product.name}</div>
                <div className="font-mono text-[11.5px] text-[var(--subkit-faint)]">
                  {product.productKey} · {product.planKey} · {product.billingPeriod}
                </div>
              </div>
              <div>
                <SoftTag tone="muted">{product.productType.replaceAll('_', ' ')}</SoftTag>
              </div>
              <div>
                <SoftTag tone="success">{product.entitlement}</SoftTag>
              </div>
              <StoreId platform="iOS" value={product.appleProductId || 'Unbound'} />
              <StoreId platform="Android" value={googleBindingLabel(product)} />
              <div className="font-mono text-[13.5px] font-semibold">{product.price}</div>
              <div className="flex justify-end">
                <StatusLabel
                  label={product.status}
                  tone={
                    product.status === 'active'
                      ? 'success'
                      : product.status === 'draft'
                        ? 'warning'
                        : 'muted'
                  }
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function googleBindingLabel(product: CatalogProduct): string {
  if (!product.googleProductId) return 'Unbound'
  if (!product.googleBasePlanId) return product.googleProductId
  return `${product.googleProductId} · ${product.googleBasePlanId}`
}
