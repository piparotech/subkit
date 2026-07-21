import type { CollectionEntry } from 'astro:content'
import { renderEntryAsMarkdown } from 'nimbus-docs'

function stringAttribute(value: string | boolean | undefined) {
  return typeof value === 'string' ? value : undefined
}

function normalizeFencedCode(markdown: string) {
  return markdown.replace(
    /```([^\n]*)\n([\s\S]*?)\n```/gu,
    (_match, info: string, code: string) => {
      const lines = code.split('\n')
      const indents = lines
        .filter((line) => line.trim().length > 0)
        .map((line) => line.match(/^\s*/u)?.[0].length ?? 0)
      const indent = indents.length === 0 ? 0 : Math.min(...indents)
      const normalized = lines.map((line) => line.slice(indent)).join('\n')
      return `\`\`\`${info}\n${normalized}\n\`\`\``
    },
  )
}

export function renderDocsEntryAsMarkdown(entry: CollectionEntry<'docs'>) {
  const markdown = renderEntryAsMarkdown(entry, {
    componentMap: {
      LinkCard: ({ attrs }) => {
        const title = stringAttribute(attrs.title) ?? 'Link'
        const href = stringAttribute(attrs.href) ?? '#'
        const description = stringAttribute(attrs.description)
        return `- **[${title}](${href})**${description ? ` — ${description}` : ''}`
      },
    },
  })
  return normalizeFencedCode(markdown)
}
