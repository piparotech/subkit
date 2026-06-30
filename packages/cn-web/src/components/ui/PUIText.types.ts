// Apple HIG type styles — the typographic role of the text (size + weight).
export type PUITextVariant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subheadline'
  | 'footnote'
  | 'caption1'
  | 'caption2'

// Color role — orthogonal to variant.
export type PUITextTone = 'default' | 'muted' | 'subtle' | 'inverse' | 'brand'

// Rendered HTML element, so title variants can expose real heading semantics.
export type PUITextAs = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'div'
