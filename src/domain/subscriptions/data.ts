import type { SubscriptionProduct } from '~/domain/subscriptions/types'

export const newSubscription: SubscriptionProduct = {
  appId: '',
  name: '',
  identifier: '',
  iosId: '',
  androidId: '',
  duration: '',
  price: '',
  activeAppUsers: '0',
  entitlement: '',
  trial: 'Off',
  trialOn: false,
}
