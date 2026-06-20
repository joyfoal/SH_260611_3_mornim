'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { themes, type ThemeName, type Theme } from './theme'

interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.warm,
  themeName: 'warm',
  setTheme: () => {},
})

function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'warm'
  const stored = localStorage.getItem('mornim-theme') as ThemeName | null
  if (stored && stored in themes) return stored
  return 'warm'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(getInitialTheme)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = themes[themeName]
    const root = document.documentElement
    root.style.setProperty('--color-bg-primary', t.bg.primary)
    root.style.setProperty('--color-bg-card', t.bg.card)
    root.style.setProperty('--color-bg-dark', t.bg.dark)
    root.style.setProperty('--color-bg-surface', t.bg.surface)
    root.style.setProperty('--color-text-primary', t.text.primary)
    root.style.setProperty('--color-text-secondary', t.text.secondary)
    root.style.setProperty('--color-text-muted', t.text.muted)
    root.style.setProperty('--color-text-onDark', t.text.onDark)
    root.style.setProperty('--color-accent-primary', t.accent.primary)
    root.style.setProperty('--color-accent-secondary', t.accent.secondary)
    root.style.setProperty('--color-accent-light', t.accent.light)
    root.style.setProperty('--color-accent-highlight', t.accent.highlight)
    root.style.setProperty('--color-border', t.border)
    root.style.setProperty('--color-tab-active', t.tab.active)
    root.style.setProperty('--color-tab-inactive', t.tab.inactive)
  }, [themeName])

  const setTheme = (name: ThemeName) => {
    setThemeName(name)
    if (typeof window !== 'undefined') {
      localStorage.setItem('mornim-theme', name)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
