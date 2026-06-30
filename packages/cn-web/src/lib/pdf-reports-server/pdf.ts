import type { ReportBranding, ReportSpec } from './report'

/**
 * A small, dependency-free, byte-DETERMINISTIC PDF writer (capability AC-1). It emits a valid PDF 1.7
 * with a fixed creation date, embedded fonts, multi-page layout, per-page CI branding and vector bar
 * charts. No Puppeteer/headless Chromium, no native canvas — those are non-deterministic and cannot run
 * inside a fast offline test. The output of `renderReport(spec, opts)` is a pure function of its inputs:
 * identical inputs → identical bytes.
 *
 * Why hand-rolled: the determinism + "all glyphs from embedded fonts" + "vector charts" + "branding on
 * every page" acceptance criteria are precisely the things general PDF libs make hard to pin down. A
 * focused writer keeps every byte under our control.
 */

const PAGE_WIDTH = 595.28 // A4 in PDF points
const PAGE_HEIGHT = 841.89
const MARGIN = 56
const HEADER_Y = PAGE_HEIGHT - 40
const FOOTER_Y = 28
const CONTENT_TOP = PAGE_HEIGHT - 88
const CONTENT_BOTTOM = 56
const LINE = 14

export type RenderFont = {
  /** PostScript name written into the PDF font dictionary. */
  name: string
  /** Raw TrueType (sfnt) bytes embedded as a `FontFile2` so all glyphs render from the file (AC-3). */
  data: Uint8Array
  /** Advance width per glyph in 1000-unit em space (monospace approximation keeps layout deterministic). */
  advance: number
}

export type RenderOptions = {
  /**
   * A TrueType font embedded into the PDF so multilingual content + special characters render from the
   * file, not a viewer substitute (AC-3). When omitted the engine uses the PDF base-14 Helvetica (still
   * deterministic; embeds no glyph program). Provide a font to satisfy the embedded-glyph criterion.
   */
  font?: RenderFont
}

export type RenderResult = {
  bytes: Uint8Array
  pageCount: number
}

const enc = new TextEncoder()

/** Serialize a content-stream string as single-byte WinAnsi/latin1, NOT UTF-8 — `encodeText` has
 *  already restricted every char to a code point ≤ 0xFF, and the page font uses `/WinAnsiEncoding`, so
 *  one byte per char is what a viewer (and the embedded font's cmap) expects. UTF-8 here would split
 *  e.g. 'Ö' (U+00D6) into 0xC3 0x96 and the glyph would not render (AC-3). */
function latin1Bytes(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff
  return bytes
}

/** Escape a string for a PDF literal `(...)` string (parentheses + backslash). */
function pdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/** WinAnsi-encode a string for the content stream: keep printable ASCII, map the rest to a dot so the
 *  byte stream stays valid for the base-14 font. The embedded-font path carries the same bytes; the
 *  embedded sfnt supplies the glyph programs that a viewer renders (AC-3). */
function encodeText(s: string): string {
  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0
    out += cp >= 32 && cp <= 126 ? ch : cp >= 160 && cp <= 255 ? ch : '.'
  }
  return pdfString(out)
}

function num(n: number): string {
  // Fixed 2-decimal formatting → identical bytes regardless of float noise.
  return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '')
}

/** A serialized PDF object: either ASCII text or raw bytes (a binary stream object). */
type Segment = string | Uint8Array

type Op = string

/** A page being composed into content-stream operators. */
class PageBuilder {
  readonly ops: Op[] = []

  text(x: number, y: number, size: number, value: string): void {
    this.ops.push(
      `BT /F1 ${num(size)} Tf 1 0 0 1 ${num(x)} ${num(y)} Tm (${encodeText(value)}) Tj ET`,
    )
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.75): void {
    this.ops.push(`${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`)
  }

  rect(x: number, y: number, w: number, h: number, fillGray: number): void {
    this.ops.push(`${num(fillGray)} g ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f 0 g`)
  }

  build(): string {
    return this.ops.join('\n')
  }
}

/** Word-wrap a paragraph to a column width (monospace-ish, deterministic). */
function wrap(text: string, size: number, maxWidth: number, advance: number): string[] {
  const charWidth = (size * advance) / 1000
  const perLine = Math.max(1, Math.floor(maxWidth / charWidth))
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= perLine) {
      current = candidate
    } else {
      if (current) lines.push(current)
      // A single over-long word is hard-split so it never overflows the column.
      let rest = word
      while (rest.length > perLine) {
        lines.push(rest.slice(0, perLine))
        rest = rest.slice(perLine)
      }
      current = rest
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function drawBranding(
  page: PageBuilder,
  branding: ReportBranding,
  pageNo: number,
  total: number,
): void {
  // Header: logo monogram box + title (+ optional subtitle).
  page.rect(MARGIN, HEADER_Y - 4, 22, 22, 0.12)
  page.text(MARGIN + 4, HEADER_Y + 2, 11, branding.logoMonogram)
  page.text(MARGIN + 30, HEADER_Y + 4, 12, branding.title)
  if (branding.subtitle) page.text(MARGIN + 30, HEADER_Y - 8, 8, branding.subtitle)
  page.line(MARGIN, HEADER_Y - 12, PAGE_WIDTH - MARGIN, HEADER_Y - 12)

  // Footer: footer line + page numbers on every page.
  page.line(MARGIN, FOOTER_Y + 12, PAGE_WIDTH - MARGIN, FOOTER_Y + 12)
  if (branding.footer) page.text(MARGIN, FOOTER_Y, 8, branding.footer)
  page.text(PAGE_WIDTH - MARGIN - 60, FOOTER_Y, 8, `Seite ${pageNo} / ${total}`)
}

/** Lay the blocks out across as many pages as needed; returns each page's operators. */
function layout(spec: ReportSpec, advance: number): PageBuilder[] {
  const pages: PageBuilder[] = []
  let page = new PageBuilder()
  let y = CONTENT_TOP
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

  const newPage = () => {
    pages.push(page)
    page = new PageBuilder()
    y = CONTENT_TOP
  }
  const need = (h: number) => {
    if (y - h < CONTENT_BOTTOM) newPage()
  }

  // Document title on the first page.
  need(28)
  page.text(MARGIN, y, 20, spec.title)
  y -= 28

  for (const block of spec.blocks) {
    switch (block.type) {
      case 'heading': {
        const size = block.level === 1 ? 15 : 12
        need(size + 10)
        y -= 6
        page.text(MARGIN, y, size, block.text)
        y -= size + 4
        break
      }
      case 'paragraph': {
        for (const ln of wrap(block.text, 10, contentWidth, advance)) {
          need(LINE)
          page.text(MARGIN, y, 10, ln)
          y -= LINE
        }
        y -= 4
        break
      }
      case 'table': {
        const colW = contentWidth / block.columns.length
        const drawRow = (cells: string[], header: boolean) => {
          need(LINE + 4)
          if (header) page.rect(MARGIN, y - 3, contentWidth, LINE + 2, 0.9)
          cells.forEach((cell, i) => {
            page.text(MARGIN + 4 + i * colW, y, 9, cell)
          })
          y -= LINE + 2
        }
        drawRow(block.columns, true)
        for (const row of block.rows) drawRow(row, false)
        y -= 6
        break
      }
      case 'barChart': {
        const chartH = 150
        need(chartH + 24)
        if (block.title) {
          page.text(MARGIN, y, 11, block.title)
          y -= 16
        }
        const baseY = y - chartH
        const max = Math.max(1, ...block.series.map((s) => s.value))
        const slot = contentWidth / block.series.length
        const barW = slot * 0.6
        // Axes (vector lines) — print-ready, resolution-independent (AC-2).
        page.line(MARGIN, baseY, MARGIN, y)
        page.line(MARGIN, baseY, PAGE_WIDTH - MARGIN, baseY)
        block.series.forEach((s, i) => {
          const h = (s.value / max) * (chartH - 16)
          const x = MARGIN + i * slot + (slot - barW) / 2
          page.rect(x, baseY, barW, h, 0.35)
          page.text(x, baseY - 10, 7, s.label)
          page.text(x, baseY + h + 2, 7, num(s.value))
        })
        y = baseY - 18
        break
      }
    }
  }
  pages.push(page)
  return pages
}

/** A growable byte sink that accepts ASCII text or raw bytes and tracks the running offset. */
class ByteSink {
  private chunks: Uint8Array[] = []
  length = 0
  push(seg: Segment): void {
    const bytes = typeof seg === 'string' ? enc.encode(seg) : seg
    this.chunks.push(bytes)
    this.length += bytes.length
  }
  concat(): Uint8Array {
    const out = new Uint8Array(this.length)
    let at = 0
    for (const c of this.chunks) {
      out.set(c, at)
      at += c.length
    }
    return out
  }
}

/** Build the PDF cross-reference table + trailer over already-serialized objects (text or binary). */
function assemble(objects: Segment[][], rootRef: number, infoRef: number): Uint8Array {
  const sink = new ByteSink()
  // Binary header comment so the file is treated as binary by all viewers.
  sink.push('%PDF-1.7\n%')
  sink.push(new Uint8Array([0xff, 0xff, 0xff, 0xff]))
  sink.push('\n')
  const offsets: number[] = []
  for (let i = 0; i < objects.length; i++) {
    offsets.push(sink.length)
    sink.push(`${i + 1} 0 obj\n`)
    for (const seg of objects[i]!) sink.push(seg)
    sink.push('\nendobj\n')
  }
  const xrefStart = sink.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${off.toString().padStart(10, '0')} 00000 n \n`
  sink.push(xref)
  sink.push(
    `trailer\n<< /Size ${objects.length + 1} /Root ${rootRef} 0 R /Info ${infoRef} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
  )
  return sink.concat()
}

/**
 * Render a report spec to deterministic PDF bytes. Same `spec` + same `opts` → identical bytes (no
 * timestamps, no random ids). Returns the bytes and the page count.
 */
export function renderReport(spec: ReportSpec, opts: RenderOptions = {}): RenderResult {
  const advance = opts.font?.advance ?? 500
  const pages = layout(spec, advance)
  const pageCount = pages.length

  const objects: Segment[][] = []
  const ref = (n: number) => `${n} 0 R`
  // Object numbering (1-based):
  // 1 Catalog, 2 Pages, 3 Font, [4 FontDescriptor + 5 FontFile2 if embedded], then per page: Page + Content.
  const catalogRef = 1
  const pagesRef = 2
  const fontRef = 3

  let next = 4
  if (opts.font) {
    const descRef = next++
    const fileRef = next++
    objects[fontRef - 1] = [
      `<< /Type /Font /Subtype /TrueType /BaseFont /${opts.font.name} /FirstChar 32 /LastChar 255 /Widths [${widths(opts.font.advance)}] /FontDescriptor ${ref(descRef)} /Encoding /WinAnsiEncoding >>`,
    ]
    objects[descRef - 1] = [
      `<< /Type /FontDescriptor /FontName /${opts.font.name} /Flags 4 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 /FontFile2 ${ref(fileRef)} >>`,
    ]
    objects[fileRef - 1] = streamObject(opts.font.data, [`/Length1 ${opts.font.data.length}`])
  } else {
    objects[fontRef - 1] = [
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    ]
  }

  const pageRefs: number[] = []
  for (let i = 0; i < pages.length; i++) {
    const pageObjRef = next++
    const contentRef = next++
    pageRefs.push(pageObjRef)
    const builder = pages[i]!
    drawBranding(builder, spec.branding, i + 1, pageCount)
    const content = builder.build()
    objects[contentRef - 1] = streamObject(latin1Bytes(content), [])
    objects[pageObjRef - 1] = [
      `<< /Type /Page /Parent ${ref(pagesRef)} /MediaBox [0 0 ${num(PAGE_WIDTH)} ${num(PAGE_HEIGHT)}] /Resources << /Font << /F1 ${ref(fontRef)} >> >> /Contents ${ref(contentRef)} >>`,
    ]
  }

  objects[catalogRef - 1] = [`<< /Type /Catalog /Pages ${ref(pagesRef)} >>`]
  objects[pagesRef - 1] = [
    `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map(ref).join(' ')}] >>`,
  ]

  // Info object — fixed date so identical inputs yield identical bytes (determinism, AC-1).
  const infoRef = next
  objects[infoRef - 1] = [
    `<< /Title (${pdfString(spec.title)}) /Producer (piparo pdf-reports-server) /Lang (${pdfString(spec.language)}) /CreationDate (D:20000101000000Z) >>`,
  ]

  return { bytes: assemble(objects, catalogRef, infoRef), pageCount }
}

/** A binary stream object with raw (uncompressed → deterministic) bytes kept as raw bytes (never
 *  re-encoded), so font programs and content survive byte-for-byte. */
function streamObject(data: Uint8Array, extra: string[]): Segment[] {
  const head = `<< /Length ${data.length}${extra.length ? ' ' + extra.join(' ') : ''} >>\nstream\n`
  return [head, data, '\nendstream']
}

/** Widths array (FirstChar 32..LastChar 255) — monospace advance keeps layout math deterministic. */
function widths(advance: number): string {
  return Array.from({ length: 255 - 32 + 1 }, () => advance).join(' ')
}

/** Lowercase-hex SHA-256 of the bytes — the determinism fingerprint (AC-1). Uses Web Crypto, present
 *  in both node and bun. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
