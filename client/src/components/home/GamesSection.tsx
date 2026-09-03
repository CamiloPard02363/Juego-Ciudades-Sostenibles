import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Atom,
  Brain,
  Calculator,
  Dna,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  Music,
  Palette,
  PlusCircle,
  Sparkles,
  Stethoscope,
  Trophy,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  listGames,
  getGameBySlug,
  deleteGame,
  type GameSummary,
  type GameDetail,
} from '../../services/game.service'
import {
  listCategories,
  deleteCategory,
  type CategoryWithGameCount,
} from '../../services/category.service'
import { ApiError } from '../../utils/http'
import { GameCard } from './games/GameCard'
import { GameDetailModal } from './games/GameDetailModal'
import { Modal } from './games/Modal'
import { PlayOptionsPopup } from './games/PlayOptionsPopup'
import type { Difficulty } from './games/PlayOptionsPopup'
import { MemoryMatchGame } from './games/MemoryMatchGame'
import { GameTypePicker } from './games/GameTypePicker'
import type { GameTypeChoice } from './games/GameTypePicker'
import { GameModePicker } from './games/GameModePicker'
import { OppositesGameForm } from './games/OppositesGameForm'
import { SimplePairsGameForm } from './games/SimplePairsGameForm'
import { GuessWhoGameForm } from './games/GuessWhoGameForm'
import { GuessWhoRoom } from './games/GuessWhoRoom'
import type { MemoryMatchPair, MemoryMatchConfig, MemoryMatchMode } from './games/memoryMatchTypes'

type CreateFlowStep =
  | 'closed'
  | 'picking-type'
  | 'picking-mode'
  | 'opposites-form'
  | 'pairs-form'
  | 'guess-who-form'

type GamesSectionProps = {
  searchQuery: string
}

type PlaySession = {
  game: GameDetail
  pairCount: number
  difficulty: Difficulty
  showPreview: boolean
}

const DEFAULT_MEMORY_CONFIG: MemoryMatchConfig = {
  mode: 'OPPOSITES',
  perZone: 8,
  timePerZoneSeconds: 90,
  previewSeconds: 5,
}

const CATEGORY_PALETTE = ['#7c3aed', '#ff3d8a', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899']

/** Palabras clave -> ícono representativo. Las categorías son texto libre creado
 * por usuarios, así que esto es una heurística por nombre, con Sparkles de respaldo. */
const CATEGORY_ICON_RULES: Array<{ keywords: string[]; icon: LucideIcon }> = [
  { keywords: ['matematic', 'algebra', 'geometr', 'calculo', 'aritmetic'], icon: Calculator },
  { keywords: ['biolog', 'natural', 'ecolog', 'ambiente', 'plantas', 'botanic'], icon: Leaf },
  { keywords: ['geografia', 'geograf', 'mundo', 'pais', 'capital'], icon: Globe2 },
  { keywords: ['medicin', 'salud', 'anatomi', 'clinic'], icon: Stethoscope },
  { keywords: ['historia', 'civic', 'sociales'], icon: Landmark },
  { keywords: ['fisica', 'quimic', 'ciencia'], icon: Atom },
  { keywords: ['genetic', 'adn'], icon: Dna },
  { keywords: ['idioma', 'ingles', 'frances', 'lengua', 'lenguaje'], icon: Languages },
  { keywords: ['arte', 'dibujo', 'pintura'], icon: Palette },
  { keywords: ['musica', 'sonido'], icon: Music },
  { keywords: ['logica', 'psicolog', 'mente', 'razonamiento'], icon: Brain },
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function iconForCategory(name: string): LucideIcon {
  const normalized = normalize(name)
  const match = CATEGORY_ICON_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  )
  return match?.icon ?? Sparkles
}

function sortByGameCount(categories: CategoryWithGameCount[]): CategoryWithGameCount[] {
  return [...categories].sort((a, b) => b.gameCount - a.gameCount)
}

export function GamesSection({ searchQuery }: GamesSectionProps) {
  const { token, user } = useAuth()
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [showPlayOptions, setShowPlayOptions] = useState(false)
  const [playSession, setPlaySession] = useState<PlaySession | null>(null)
  const [guessWhoRoomGameId, setGuessWhoRoomGameId] = useState<string | null>(null)
  const [createFlowStep, setCreateFlowStep] = useState<CreateFlowStep>('closed')
  const [deleting, setDeleting] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithGameCount | null>(null)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const wasSearchingRef = useRef(false)

  // Al empezar a buscar, el resultado (o el "sin resultados") queda debajo
  // del banner y las categorías: sin esto, hay que scrollear a mano para
  // verlo. Solo se dispara al pasar de "sin búsqueda" a "buscando", no en
  // cada tecla, para no reiniciar el scroll suave todo el tiempo.
  useEffect(() => {
    const isSearching = searchQuery.trim().length > 0
    if (isSearching && !wasSearchingRef.current) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    wasSearchingRef.current = isSearching
  }, [searchQuery])

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listGames(token, {
      search: searchQuery || undefined,
      categoryId: activeCategoryId ?? undefined,
      pageSize: 40,
    })
      .then((result) => setGames(result.items))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los juegos.')
      })
      .finally(() => setLoading(false))
  }, [token, searchQuery, activeCategoryId])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!token) return
    listCategories(token)
      .then((items) => setCategories(sortByGameCount(items)))
      .catch(() => {})
  }, [token])

  async function openGame(summary: GameSummary) {
    if (!token) return
    setDetailError(null)
    try {
      const detail = await getGameBySlug(token, summary.slug)
      setSelectedGame(detail)
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'No se pudo abrir el juego.')
    }
  }

  async function handleDelete() {
    if (!token || !selectedGame) return
    setDeleting(true)
    setDetailError(null)
    try {
      await deleteGame(token, selectedGame.id)
      setSelectedGame(null)
      reload()
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'No se pudo eliminar el juego.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteCategory() {
    if (!token || !categoryToDelete) return
    setDeletingCategory(true)
    setCategoryDeleteError(null)
    try {
      await deleteCategory(token, categoryToDelete.id)
      setCategories((current) => current.filter((c) => c.id !== categoryToDelete.id))
      if (activeCategoryId === categoryToDelete.id) setActiveCategoryId(null)
      setCategoryToDelete(null)
    } catch (err) {
      setCategoryDeleteError(
        err instanceof ApiError ? err.message : 'No se pudo eliminar la materia.',
      )
    } finally {
      setDeletingCategory(false)
    }
  }

  function handleCreated() {
    setCreateFlowStep('closed')
    reload()
    if (token) {
      listCategories(token)
        .then((items) => setCategories(sortByGameCount(items)))
        .catch(() => {})
    }
  }

  function handleSelectMode(mode: MemoryMatchMode) {
    setCreateFlowStep(mode === 'PAIRS' ? 'pairs-form' : 'opposites-form')
  }

  function handleSelectType(choice: GameTypeChoice) {
    setCreateFlowStep(choice === 'GUESS_WHO' ? 'guess-who-form' : 'picking-mode')
  }

  function handlePlayClick() {
    if (!selectedGame) return
    if (selectedGame.gameType === 'GUESS_WHO') {
      setGuessWhoRoomGameId(selectedGame.id)
      setSelectedGame(null)
      return
    }
    setShowPlayOptions(true)
  }

  return (
    <section className="flex flex-col gap-10">
      <div
        className="relative overflow-hidden rounded-3xl border border-border p-8 sm:p-10"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 55%), radial-gradient(circle at 85% 85%, color-mix(in srgb, var(--accent-2) 30%, transparent), transparent 50%), var(--surface)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
            maskImage: 'radial-gradient(circle at 25% 30%, black, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at 25% 30%, black, transparent 70%)',
          }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div className="max-w-[440px]">
            <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-accent uppercase">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              Modo creación · Cualquier materia
            </p>
            <h2 className="text-[30px] leading-[1.1] font-bold tracking-tight text-text-h">
              Convierte cualquier tema en un juego
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-text">
              Matemáticas, biología, geografía, medicina — arma retos, invita a tu equipo y
              compite en tiempo real.
            </p>
            <button
              type="button"
              className="mt-6 flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={() => setCreateFlowStep('picking-type')}
            >
              <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
              Crear nueva partida
            </button>
          </div>

          <div
            className="flex h-[130px] w-[130px] shrink-0 items-center justify-center rounded-3xl border border-border"
            style={{ background: 'var(--bg)' }}
          >
            <Trophy className="h-14 w-14 text-accent-2" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-text-h">Explorar materias</h3>
            {activeCategoryId && (
              <button
                type="button"
                className="text-[12.5px] font-medium text-accent hover:underline"
                onClick={() => setActiveCategoryId(null)}
              >
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category, index) => {
              const color = CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]
              const active = activeCategoryId === category.id
              const Icon = iconForCategory(category.name)
              // Además del creador y un admin, cualquier usuario puede limpiar una
              // categoría sin dueño registrado (creada antes de rastrear autoría).
              const canDeleteCategory = Boolean(
                user &&
                  (user.role === 'ADMIN' ||
                    user.id === category.creatorUserId ||
                    category.creatorUserId === null),
              )
              return (
                <div key={category.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryId(active ? null : category.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5 ${
                      active ? 'border-transparent' : 'border-border'
                    }`}
                    style={
                      active
                        ? { background: `${color}22`, boxShadow: `0 0 0 1.5px ${color}` }
                        : { background: 'var(--surface)' }
                    }
                  >
                    <span
                      className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{ background: color }}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <p className="truncate text-[13px] font-semibold text-text-h">
                      {category.name}
                    </p>
                    <p className="text-[11.5px] text-text">
                      {category.gameCount} {category.gameCount === 1 ? 'juego' : 'juegos'}
                    </p>
                  </button>

                  {canDeleteCategory && (
                    <button
                      type="button"
                      aria-label={`Eliminar materia ${category.name}`}
                      title="Eliminar materia"
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-text/70 shadow-[var(--shadow)] transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                      onClick={(event) => {
                        event.stopPropagation()
                        setCategoryDeleteError(null)
                        setCategoryToDelete(category)
                      }}
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div ref={resultsRef} className="scroll-mt-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Juegos</h2>
            <p className="text-[14px] text-text">Elige un juego para empezar a aprender jugando.</p>
          </div>
        </div>

        {error && (
          <p
            className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {detailError && (
          <p
            className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {detailError}
          </p>
        )}

        {loading ? (
          <p className="text-[14px] text-text">Cargando juegos…</p>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <span
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              aria-hidden="true"
            >
              <Sparkles className="h-6 w-6" strokeWidth={2} />
            </span>
            <p className="text-[15px] font-medium text-text-h">
              {searchQuery
                ? `Sin resultados para "${searchQuery}".`
                : 'Aún no hay juegos disponibles.'}
            </p>
            <p className="mt-1 max-w-[320px] text-[13px] text-text">
              {searchQuery
                ? 'Prueba con otro término de búsqueda.'
                : 'Sé la primera persona en crear uno.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, index) => (
              <div
                key={game.id}
                className="animate-[fade-in-up_0.35s_ease-out_backwards]"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <GameCard game={game} onClick={() => openGame(game)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedGame && !showPlayOptions && (
        <GameDetailModal
          game={selectedGame}
          canDelete={Boolean(
            user && (user.role === 'ADMIN' || user.id === selectedGame.creatorUserId),
          )}
          deleting={deleting}
          onClose={() => setSelectedGame(null)}
          onPlay={handlePlayClick}
          onDelete={handleDelete}
        />
      )}

      {categoryToDelete && (
        <Modal
          onClose={() => {
            if (!deletingCategory) setCategoryToDelete(null)
          }}
        >
          <h2 className="mb-2 text-[18px] tracking-tight text-text-h">Eliminar materia</h2>
          <p className="mb-6 text-[14px] leading-relaxed text-text">
            ¿Eliminar "{categoryToDelete.name}"? Esta acción no se puede deshacer.
          </p>

          {categoryDeleteError && (
            <p
              className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
              role="alert"
            >
              {categoryDeleteError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-danger px-4 py-3 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDeleteCategory}
              disabled={deletingCategory}
            >
              {deletingCategory ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-3 text-[15px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setCategoryToDelete(null)}
              disabled={deletingCategory}
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {guessWhoRoomGameId && (
        <GuessWhoRoom gameId={guessWhoRoomGameId} onExit={() => setGuessWhoRoomGameId(null)} />
      )}

      {selectedGame && showPlayOptions && (
        <PlayOptionsPopup
          game={selectedGame}
          onClose={() => setShowPlayOptions(false)}
          onStart={(options) => {
            setPlaySession({ game: selectedGame, ...options })
            setShowPlayOptions(false)
            setSelectedGame(null)
          }}
        />
      )}

      {playSession && (
        <MemoryMatchGame
          title={playSession.game.title}
          primaryColor={playSession.game.theme.primaryColor}
          pairs={playSession.game.content as MemoryMatchPair[]}
          pairCount={playSession.pairCount}
          difficulty={playSession.difficulty}
          showPreview={playSession.showPreview}
          perZone={(playSession.game.config as Partial<MemoryMatchConfig>).perZone ?? DEFAULT_MEMORY_CONFIG.perZone}
          timePerZoneSeconds={
            (playSession.game.config as Partial<MemoryMatchConfig>).timePerZoneSeconds ??
            DEFAULT_MEMORY_CONFIG.timePerZoneSeconds
          }
          previewSeconds={
            (playSession.game.config as Partial<MemoryMatchConfig>).previewSeconds ??
            DEFAULT_MEMORY_CONFIG.previewSeconds
          }
          onExit={() => setPlaySession(null)}
        />
      )}

      {createFlowStep === 'picking-type' && (
        <GameTypePicker onClose={() => setCreateFlowStep('closed')} onSelect={handleSelectType} />
      )}

      {createFlowStep === 'picking-mode' && (
        <GameModePicker onClose={() => setCreateFlowStep('closed')} onSelect={handleSelectMode} />
      )}

      {createFlowStep === 'opposites-form' && (
        <OppositesGameForm
          onClose={() => setCreateFlowStep('closed')}
          onBack={() => setCreateFlowStep('picking-mode')}
          onCreated={handleCreated}
        />
      )}

      {createFlowStep === 'pairs-form' && (
        <SimplePairsGameForm
          onClose={() => setCreateFlowStep('closed')}
          onBack={() => setCreateFlowStep('picking-mode')}
          onCreated={handleCreated}
        />
      )}

      {createFlowStep === 'guess-who-form' && (
        <GuessWhoGameForm
          onClose={() => setCreateFlowStep('closed')}
          onBack={() => setCreateFlowStep('picking-type')}
          onCreated={handleCreated}
        />
      )}
    </section>
  )
}
