import * as React from 'react'

import { cn } from '../../lib/utils'

export type ColorScheme = 'light' | 'dark'

const ThemeContext = React.createContext<ColorScheme>('light')

export interface ThemeProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sets `data-theme` so the @piparo/design-tokens CSS vars resolve to this scheme. */
  scheme?: ColorScheme
}

export function ThemeProvider({
  scheme = 'light',
  className,
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={scheme}>
      <div
        data-theme={scheme}
        className={cn(scheme === 'dark' && 'dark', 'bg-background text-foreground', className)}
        {...props}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

/** Current color scheme (styling itself is CSS-var driven; this is for JS that needs the scheme). */
// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider (library, not an HMR app)
export function useTheme(): ColorScheme {
  return React.useContext(ThemeContext)
}
