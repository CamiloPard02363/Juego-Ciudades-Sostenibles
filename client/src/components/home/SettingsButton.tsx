import { Settings } from 'lucide-react'

type SettingsButtonProps = {
  onClick: () => void
}

/**
 * Botón de tuerca independiente junto al nombre de usuario (mismo lenguaje
 * visual que `ThemeToggle`: borde, superficie y sombra del tema), en vez de
 * quedar mezclado como un ítem más dentro del menú de perfil.
 */
export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      type="button"
      data-tour="settings"
      onClick={onClick}
      aria-label="Configuración"
      title="Configuración"
      className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text shadow-[var(--shadow)] transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Settings className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-45" strokeWidth={2} />
    </button>
  )
}
