type AiSparklesIconProps = {
  className?: string
}

/** Icono de IA (destellos) en SVG propio; hereda el color con `currentColor`. */
export function AiSparklesIcon({ className }: AiSparklesIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 2.5c.4 0 .75.27.85.66l.9 3.5a5 5 0 0 0 3.6 3.6l3.5.9a.88.88 0 0 1 0 1.7l-3.5.9a5 5 0 0 0-3.6 3.6l-.9 3.5a.88.88 0 0 1-1.7 0l-.9-3.5a5 5 0 0 0-3.6-3.6l-3.5-.9a.88.88 0 0 1 0-1.7l3.5-.9a5 5 0 0 0 3.6-3.6l.9-3.5c.1-.39.45-.66.85-.66Z" />
      <path d="M19 1.5c.28 0 .52.19.6.46l.33 1.2c.15.55.58.98 1.13 1.13l1.2.33a.62.62 0 0 1 0 1.2l-1.2.33c-.55.15-.98.58-1.13 1.13l-.33 1.2a.62.62 0 0 1-1.2 0l-.33-1.2a1.7 1.7 0 0 0-1.13-1.13l-1.2-.33a.62.62 0 0 1 0-1.2l1.2-.33c.55-.15.98-.58 1.13-1.13l.33-1.2c.08-.27.32-.46.6-.46Z" />
    </svg>
  )
}
