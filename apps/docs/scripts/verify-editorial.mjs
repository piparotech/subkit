import { readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

import { walkFiles } from './docs-output-lib.mjs'

const root = resolve(import.meta.dirname, '../../..')
const contentRoot = resolve(root, 'apps/docs/src/content/docs')
const errors = []
const publicFiles = (await walkFiles(contentRoot)).filter(
  (path) => path.endsWith('.md') || path.endsWith('.mdx'),
)
const proseByFile = new Map()
let imageCount = 0
let tableCount = 0

for (const path of publicFiles) {
  const source = await readFile(path, 'utf8')
  const label = relative(root, path)
  const lines = source.split('\n')
  const proseLines = []
  let inFence = false
  let previousHeadingLevel = 1

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineNumber = index + 1

    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    proseLines.push(line.replace(/`[^`]*`/gu, ''))

    const heading = line.match(/^(#{1,6})\s+(.+)$/u)
    if (heading != null) {
      const level = heading[1].length
      if (level > previousHeadingLevel + 1) {
        errors.push(
          `${label}:${lineNumber} skips heading level ${previousHeadingLevel} to ${level}`,
        )
      }
      previousHeadingLevel = level
    }

    for (const image of line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/gu)) {
      imageCount += 1
      const alt = image[1].trim()
      if (alt.length < 12 || /^(?:diagram|image|logo|screenshot)$/iu.test(alt)) {
        errors.push(`${label}:${lineNumber} has missing or weak image alt text`)
      }
    }

    if (!line.startsWith('|') || index + 1 >= lines.length) continue
    const separator = lines[index + 1]
    if (!isTableSeparator(separator)) continue

    tableCount += 1
    const expectedColumns = tableColumns(line)
    if (expectedColumns < 2) errors.push(`${label}:${lineNumber} has an unreadable table header`)

    let rowIndex = index + 2
    while (rowIndex < lines.length && lines[rowIndex].startsWith('|')) {
      const columns = tableColumns(lines[rowIndex])
      if (columns !== expectedColumns) {
        errors.push(
          `${label}:${rowIndex + 1} has ${columns} table columns; expected ${expectedColumns}`,
        )
      }
      rowIndex += 1
    }
  }

  if (inFence) errors.push(`${label} has an unclosed code fence`)
  proseByFile.set(label, proseLines.join('\n'))
}

const prose = [...proseByFile.values()].join('\n')
const requiredTerms = [
  'App User',
  'Billing Account',
  'Access Source',
  'Access Pool',
  'Reservation',
  'Allocation',
  'Entitlement Grant',
]
for (const term of requiredTerms) {
  if (!prose.includes(term)) errors.push(`Public documentation is missing canonical term: ${term}`)
}

const forbiddenPatterns = [
  [/\bSubkit\b/gu, 'Subkit'],
  [/\bSub-kit\b/giu, 'Sub-kit'],
  [/\bAppUser\b/gu, 'AppUser'],
  [/\bBillingAccount\b/gu, 'BillingAccount'],
  [/\bAccessSource\b/gu, 'AccessSource'],
  [/\bAccessPool\b/gu, 'AccessPool'],
  [/\bEntitlementGrant\b/gu, 'EntitlementGrant'],
  [
    /\b(?:alot|adress|begining|calender|comming|concensus|definately|dependant|enviroment|existance|foriegn|goverment|happend|immediatly|independant|maintainance|neccessary|occassion|occurance|persistant|priviledge|recieve|seperate|succesful|untill|wierd|writting)\b/giu,
    'known spelling error',
  ],
]
for (const [pattern, description] of forbiddenPatterns) {
  for (const [label, text] of proseByFile) {
    if (pattern.test(text)) errors.push(`${label} contains ${description}`)
    pattern.lastIndex = 0
  }
}

if (imageCount === 0) errors.push('No public documentation images were reviewed')
if (tableCount === 0) errors.push('No public documentation tables were reviewed')

if (errors.length > 0) {
  console.error(`Docs editorial verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Verified editorial structure and terminology in ${publicFiles.length} public pages, ${tableCount} tables, and ${imageCount} images.`,
  )
}

function isTableSeparator(line) {
  if (!line.startsWith('|')) return false
  const cells = splitTableCells(line)
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell.trim()))
}

function tableColumns(line) {
  return splitTableCells(line).length
}

function splitTableCells(line) {
  const cells = []
  let current = ''
  let escaped = false
  for (const character of line.slice(1, -1)) {
    if (escaped) {
      current += character
      escaped = false
    } else if (character === '\\') {
      escaped = true
      current += character
    } else if (character === '|') {
      cells.push(current)
      current = ''
    } else {
      current += character
    }
  }
  cells.push(current)
  return cells
}
