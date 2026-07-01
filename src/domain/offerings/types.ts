import type { StatusTone } from '~/components/ui/types'

export interface OfferingPackage {
  label: string
  productId: string
  price: string
  badge: string
  hasBadge: boolean
}

export interface Offering {
  appId: string
  id: string
  name: string
  desc: string
  tag: string
  tagTone: StatusTone
  packages: OfferingPackage[]
}
