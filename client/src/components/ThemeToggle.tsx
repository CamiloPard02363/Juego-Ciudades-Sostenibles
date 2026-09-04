import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
      role="group"
      aria-label="Tema"
    >
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] transition-colors ${
          theme === 'light' ? 'bg-accent text-white' : 'text-text hover:text-text-h'
        }`}
        aria-pressed={theme === 'light'}
        aria-label="Tema claro"
        onClick={() => setTheme('light')}
      >
        ☀
      </button>
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] transition-colors ${
          theme === 'dark' ? 'bg-accent text-white' : 'text-text hover:text-text-h'
        }`}
        aria-pressed={theme === 'dark'}
        aria-label="Tema oscuro"
        onClick={() => setTheme('dark')}
      >
        ☾
      </button>
    </div>
  )
}
