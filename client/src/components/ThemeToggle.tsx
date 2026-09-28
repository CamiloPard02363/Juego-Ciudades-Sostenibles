import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      data-tour="theme-toggle"
      className="flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-[var(--shadow)]"
      role="group"
      aria-label="Tema"
    >
      <button
        type="button"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          theme === 'light' ? 'bg-accent text-white' : 'text-text hover:text-text-h'
        }`}
        aria-pressed={theme === 'light'}
        aria-label="Tema claro"
        onClick={() => setTheme('light')}
      >
        <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          theme === 'dark' ? 'bg-accent text-white' : 'text-text hover:text-text-h'
        }`}
        aria-pressed={theme === 'dark'}
        aria-label="Tema oscuro"
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
    </div>
  )
}
