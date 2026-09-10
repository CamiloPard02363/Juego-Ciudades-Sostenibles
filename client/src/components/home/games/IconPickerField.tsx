import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { iconForConcept } from './dominoTypes'

type IconPickerFieldProps = {
  id?: string
  value: string
  labels: Record<string, string>
  disabled?: boolean
  onChange: (key: string) => void
}

/** Selector de ícono con buscador de texto sobre una grilla, para catálogos grandes de íconos. */
export function IconPickerField({ id, value, labels, disabled, onChange }: IconPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const normalizedQuery = query.trim().toLowerCase()
  const entries = Object.entries(labels).filter(([, label]) =>
    label.toLowerCase().includes(normalizedQuery),
  )

  const SelectedIcon = iconForConcept(value)

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-bg px-[13px] py-[11px] text-[15px] text-text-h outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2">
          <SelectedIcon className="h-4 w-4" strokeWidth={2} />
          {labels[value] ?? value}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1.5 w-full min-w-[280px] rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow)]">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-text" strokeWidth={2} />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent text-[13px] text-text-h outline-none"
              placeholder="Buscar ícono…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid max-h-[220px] grid-cols-5 gap-1.5 overflow-y-auto">
            {entries.map(([key, label]) => {
              const Icon = iconForConcept(key)
              const selected = key === value
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors hover:bg-accent/10 ${
                    selected ? 'bg-accent/15 text-accent' : 'text-text-h'
                  }`}
                  onClick={() => {
                    onChange(key)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  <span className="w-full truncate text-[10px] leading-tight">{label}</span>
                </button>
              )
            })}
            {entries.length === 0 && (
              <p className="col-span-5 py-4 text-center text-[12.5px] text-text">Sin resultados.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
