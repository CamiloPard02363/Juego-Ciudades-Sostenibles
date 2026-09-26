import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
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

type ThemeContextValue = {
  theme: Theme
  setTheme: (next: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Antes `useTheme` era un hook suelto sin Provider: cada componente que lo
 * llamaba (el botón de la barra lateral, siempre montado, y la sección
 * "Temas" en /temas, montada aparte) tenía su propio `useState` privado,
 * inicializado solo una vez desde localStorage. Cambiar el tema desde uno
 * actualizaba el DOM globalmente (por eso el color del sitio sí cambiaba),
 * pero el estado local del OTRO componente no se enteraba — quedaba
 * mostrando el tema viejo como "activo" hasta el próximo montaje/refresh.
 * Ahora hay un único estado compartido acá, y todos los consumidores
 * (ThemeToggle, ThemesSection, ConfettiBurst, KidsMascot) leen la misma
 * fuente de verdad.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // El Modo Kids ya no es una elección manual: todo STUDENT menor de 10 años
  // (ver isKidsMode) lo ve siempre, sin importar lo que haya guardado en
  // localStorage de una sesión anterior (por ejemplo, si el dispositivo lo
  // usó antes un profesor en modo oscuro). `useAuth` es seguro acá porque
  // `ThemeProvider` solo se monta dentro del árbol de <AuthProvider> (ver
  // main.tsx).
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

  return (
    <ThemeContext.Provider value={{ theme: effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>.')
  }
  return context
}
