/**
 * Screen copy — config-driven + i18n-agnostic (no lingui macro dep in the module). The host passes
 * a partial (e.g. from AuthConfig.texts, the customer-editable surface) merged over English defaults.
 */
export type AuthScreenTexts = {
  signInTitle: string
  signUpTitle: string
  forgotTitle: string
  confirmTitle: string
  resetTitle: string
  emailLabel: string
  passwordLabel: string
  codeLabel: string
  newPasswordLabel: string
  signInButton: string
  signUpButton: string
  forgotButton: string
  confirmButton: string
  resetButton: string
  /** `{provider}` is replaced with the provider label. */
  continueWithProvider: string
  toSignUp: string
  toSignIn: string
  toForgot: string
  checkEmail: string
  resetDone: string
  errorInvalidCredentials: string
  errorInvalidCode: string
  errorValidation: string
  errorGeneric: string
}

export const defaultAuthTexts: AuthScreenTexts = {
  signInTitle: 'Sign in',
  signUpTitle: 'Create account',
  forgotTitle: 'Reset password',
  confirmTitle: 'Confirm your email',
  resetTitle: 'Set a new password',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  codeLabel: 'Code',
  newPasswordLabel: 'New password',
  signInButton: 'Sign in',
  signUpButton: 'Create account',
  forgotButton: 'Send reset link',
  confirmButton: 'Confirm',
  resetButton: 'Set password',
  continueWithProvider: 'Continue with {provider}',
  toSignUp: 'Create an account',
  toSignIn: 'Back to sign in',
  toForgot: 'Forgot password?',
  checkEmail: 'Check your email for the next step.',
  resetDone: 'Your password has been updated. You can sign in now.',
  errorInvalidCredentials: 'Wrong email or password.',
  errorInvalidCode: 'That code is invalid or has expired.',
  errorValidation: 'Please check your input.',
  errorGeneric: 'Something went wrong. Please try again.',
}

export function resolveAuthTexts(overrides?: Partial<AuthScreenTexts>): AuthScreenTexts {
  return overrides ? { ...defaultAuthTexts, ...overrides } : defaultAuthTexts
}

export function authErrorMessage(code: string, texts: AuthScreenTexts): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return texts.errorInvalidCredentials
    case 'INVALID_CODE':
      return texts.errorInvalidCode
    case 'VALIDATION':
      return texts.errorValidation
    default:
      return texts.errorGeneric
  }
}
