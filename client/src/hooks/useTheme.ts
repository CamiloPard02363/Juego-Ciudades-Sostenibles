import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { isKidsMode } from '../utils/kidsMode'

export type Theme = 'light' | 'dark' | 'kids'

const STORAGE_KEY = 'nexusplay-theme'

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'kids' ? stored : null
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  // El Modo Kids ya no es una elección manual: todo STUDENT menor de 10 años
  // (ver isKidsMode) lo ve siempre, sin importar lo que haya guardado en
  // localStorage de una sesión anterior (por ejemplo, si el dispositivo lo
  // usó antes un profesor en modo oscuro). `useAuth` es seguro acá porque
  // `useTheme` solo se usa dentro del árbol de <AuthProvider> (ver main.tsx).
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? getSystemTheme())
  const effectiveTheme: Theme = isKidsMode(user) ? 'kids' : theme

  useEffect(() => {
    applyTheme(effectiveTheme)
  }, [effectiveTheme])

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme: effectiveTheme, setTheme, toggleTheme }
}
