import type { FormEvent } from 'react'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  onSearch: (value: string) => void
  placeholder?: string
}

/** Los resultados (o "sin resultados") solo se actualizan al presionar Enter. */
export function SearchBar({ value, onChange, onSearch, placeholder }: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(value)
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex w-full max-w-[420px] items-center gap-2 rounded-lg border border-border bg-code-bg px-3.5 py-2.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/10"
    >
      <button
        type="submit"
        aria-label="Buscar"
        className="flex shrink-0 items-center justify-center text-text/60 hover:text-accent"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
      </button>
      <input
        type="search"
        value={value}
        placeholder={placeholder ?? 'Buscar juegos…'}
        aria-label="Buscar juegos"
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 bg-transparent text-[14px] text-text-h outline-none placeholder:text-text/60"
      />
    </form>
  )
}
