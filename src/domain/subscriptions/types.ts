export interface SubscriptionProduct {
  appId: string
  name: string
  identifier: string
  iosId: string
  androidId: string
  duration: string
  price: string
  activeAppUsers: string
  entitlement: string
  trial: string
  trialOn: boolean
}

export type EditableSubscriptionTextField =
  | 'name'
  | 'identifier'
  | 'iosId'
  | 'androidId'
  | 'duration'
  | 'price'
  | 'entitlement'
  | 'trial'
