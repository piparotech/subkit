/* eslint-disable react-refresh/only-export-components -- library module: Provider + hook + types co-located */
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react'

import type { AuthSession, Session } from './session'

export type { Session } from './session'

/**
 * The real `SessionProvider`/`useSession` — a thin React binding over the framework-agnostic
 * session controller (client). Drop-in for the app-starter's demo shell: same `useSession`
 * contract, extended with the `restoring` boot state (async rehydrate) + per-provider actions.
 * The host constructs the `AuthSession` with the platform store (SecureStore native / web) and
 * passes it in, so this file stays free of react-native / storage deps.
 */
const SessionContext = createContext<AuthSession | null>(null)

export function SessionProvider({ auth, children }: PropsWithChildren<{ auth: AuthSession }>) {
  useEffect(() => {
    void auth.restore()
  }, [auth])
  return <SessionContext.Provider value={auth}>{children}</SessionContext.Provider>
}

export type UseSession = {
  session: Session
  signIn: AuthSession['signIn']
  register: AuthSession['register']
  confirm: AuthSession['confirm']
  forgot: AuthSession['forgot']
  reset: AuthSession['reset']
  signInWithProvider: AuthSession['applyOidcTokens']
  signOut: AuthSession['signOut']
  client: AuthSession['client']
}

export function useSession(): UseSession {
  const auth = useContext(SessionContext)
  if (!auth) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  const session = useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getSnapshot)
  return {
    session,
    signIn: auth.signIn,
    register: auth.register,
    confirm: auth.confirm,
    forgot: auth.forgot,
    reset: auth.reset,
    signInWithProvider: auth.applyOidcTokens,
    signOut: auth.signOut,
    client: auth.client,
  }
}
