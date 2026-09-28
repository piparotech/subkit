import { z } from 'zod'

export const INVITATION_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export const invitationCodeFormatSchema = z
  .object({
    prefix: z
      .string()
      .max(24)
      .regex(/^(?:[A-Z][A-Z0-9]*-)?$/),
    randomLength: z.number().int().min(8).max(32),
    alphabet: z.literal('unambiguous-uppercase'),
    groupSize: z.number().int().min(1).max(8).nullable(),
  })
  .strict()
  .refine((format) => format.groupSize === null || format.groupSize <= format.randomLength, {
    message: 'Code grouping must fit the random body',
  })
export type InvitationCodeFormat = z.infer<typeof invitationCodeFormatSchema>

/** Normalize independently of current app settings so previously issued formats remain usable. */
export const invitationCodeInputSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9\- \t\r\n]+$/)
  .transform((value) => value.replace(/[ \t\r\n]/g, '').toUpperCase())
  .pipe(z.string().min(8).max(56))

export function formatInvitationCodeBody(body: string, input: InvitationCodeFormat): string {
  const format = invitationCodeFormatSchema.parse(input)
  if (
    body.length !== format.randomLength ||
    [...body].some((character) => !INVITATION_CODE_ALPHABET.includes(character))
  ) {
    throw new Error('Invitation code body does not match its format')
  }
  if (format.groupSize === null) return `${format.prefix}${body}`
  const groups: string[] = []
  for (let offset = 0; offset < body.length; offset += format.groupSize) {
    groups.push(body.slice(offset, offset + format.groupSize))
  }
  return `${format.prefix}${groups.join(' ')}`
}

export function invitationCodeMatchesFormat(code: string, format: InvitationCodeFormat): boolean {
  const input = invitationCodeInputSchema.safeParse(code)
  if (!input.success || !input.data.startsWith(format.prefix)) return false
  const body = input.data.slice(format.prefix.length)
  if (
    body.length !== format.randomLength ||
    [...body].some((character) => !INVITATION_CODE_ALPHABET.includes(character))
  ) {
    return false
  }
  return code === formatInvitationCodeBody(body, format)
}
