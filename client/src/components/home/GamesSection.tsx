import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Atom,
  Brain,
  Calculator,
  Dna,
  Globe2,
  KeyRound,
  Landmark,
  Languages,
  Leaf,
  Music,
  Palette,
  PlusCircle,
  Sparkles,
  Stethoscope,
  Trash2,
  Trophy,
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
  createCategory,
  deleteCategory,
  type CategoryWithGameCount,
} from '../../services/category.service'
import { ApiError } from '../../utils/http'
import { trackEvent } from '../../services/analytics.service'
import { GameCard } from './games/GameCard'
import { GameDetailModal } from './games/GameDetailModal'
import { Modal } from './games/Modal'
import { JoinByCodeModal } from './games/JoinByCodeModal'
import { PlayOptionsPopup } from './games/PlayOptionsPopup'
import type { Difficulty } from './games/PlayOptionsPopup'
import { MemoryMatchGame } from './games/MemoryMatchGame'
import { GuessWhoRoom } from './games/GuessWhoRoom'
import { DominoGame } from './games/DominoGame'
import type { DominoConcept, DominoConfig } from './games/dominoTypes'
import { DEFAULT_DOMINO_CONFIG } from './games/dominoTypes'
import type { MemoryMatchPair, MemoryMatchConfig } from './games/memoryMatchTypes'

export type GamesSectionMode = 'all' | 'categories' | 'community' | 'my-games'

const BASE_PATH_BY_MODE: Record<GamesSectionMode, string> = {
  all: '/',
  categories: '/materias',
  community: '/comunidad',
  'my-games': '/mis-juegos',
}

type GamesSectionProps = {
  mode: GamesSectionMode
  searchQuery: string
  searchNonce: number
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

/** Color de respaldo para una materia que no calza con ninguna regla: azul grisáceo neutro (profesional, no compite con ningún grupo). */
const DEFAULT_CATEGORY_COLOR = '#64748b'

/**
 * Palabras clave -> ícono y color representativos, elegidos por psicología
 * del color (no por índice/orden de creación): cada materia transmite algo
 * consistente sin importar cuántas materias existan o en qué orden se
 * crearon. Las categorías son texto libre creado por usuarios, así que esto
 * es una heurística por nombre, con Sparkles + DEFAULT_CATEGORY_COLOR de
 * respaldo cuando ninguna palabra clave calza.
 */
const CATEGORY_RULES: Array<{ keywords: string[]; icon: LucideIcon; color: string }> = [
  // Azul: lógica, confianza, orden — asociación clásica con lo racional/exacto.
  { keywords: ['matematic', 'algebra', 'geometr', 'calculo', 'aritmetic'], icon: Calculator, color: '#3b82f6' },
  // Verde: naturaleza, crecimiento, calma.
  { keywords: ['biolog', 'natural', 'ecolog', 'ambiente', 'plantas', 'botanic'], icon: Leaf, color: '#22c55e' },
  // Turquesa: exploración, apertura, horizontes amplios.
  { keywords: ['geografia', 'geograf', 'mundo', 'pais', 'capital'], icon: Globe2, color: '#14b8a6' },
  // Rojo coral: vitalidad, atención, cuidado — sin ser tan intenso como una alerta.
  { keywords: ['medicin', 'salud', 'anatomi', 'clinic'], icon: Stethoscope, color: '#f43f5e' },
  // Ámbar/dorado: tradición, solidez, herencia — tono "tierra".
  { keywords: ['historia', 'civic', 'sociales'], icon: Landmark, color: '#b45309' },
  // Índigo: profundidad, precisión, misterio de lo científico.
  { keywords: ['fisica', 'quimic', 'ciencia'], icon: Atom, color: '#6366f1' },
  // Violeta: descubrimiento, innovación.
  { keywords: ['genetic', 'adn'], icon: Dna, color: '#8b5cf6' },
  // Cian: comunicación, claridad.
  { keywords: ['idioma', 'ingles', 'frances', 'lengua', 'lenguaje'], icon: Languages, color: '#06b6d4' },
  // Naranja: creatividad, energía, expresión.
  { keywords: ['arte', 'dibujo', 'pintura'], icon: Palette, color: '#f97316' },
  // Rosa/magenta: pasión, emoción, expresión artística.
  { keywords: ['musica', 'sonido'], icon: Music, color: '#ec4899' },
  // Púrpura: introspección, sabiduría, lo abstracto de la mente.
  { keywords: ['logica', 'psicolog', 'mente', 'razonamiento'], icon: Brain, color: '#7c3aed' },
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function matchCategoryRule(name: string) {
  const normalized = normalize(name)
  return CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))
}

function iconForCategory(name: string): LucideIcon {
  return matchCategoryRule(name)?.icon ?? Sparkles
}

/** Color por psicología del color según la materia (ver CATEGORY_RULES); mismo criterio para el badge de la materia y para cada tarjeta de juego que pertenece a ella. */
function colorForCategory(name: string): string {
  return matchCategoryRule(name)?.color ?? DEFAULT_CATEGORY_COLOR
}

function sortByGameCount(categories: CategoryWithGameCount[]): CategoryWithGameCount[] {
  return [...categories].sort((a, b) => b.gameCount - a.gameCount)
}

export function GamesSection({ mode, searchQuery, searchNonce }: GamesSectionProps) {
  const navigate = useNavigate()
  const { slug: slugFromUrl } = useParams<{ slug?: string }>()
  const basePath = BASE_PATH_BY_MODE[mode]
  const { token, user } = useAuth()
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  // El detalle abierto se deriva de la URL (slug en la ruta), no de un click
  // aislado: así el juego es compartible/recargable y el botón atrás cierra
  // el modal. `selectedGame` guarda el detalle ya cargado del slug actual.
  const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [showPlayOptions, setShowPlayOptions] = useState(false)
  const [playSession, setPlaySession] = useState<PlaySession | null>(null)
  const [guessWhoRoomGameId, setGuessWhoRoomGameId] = useState<string | null>(null)
  const [joinCodeContext, setJoinCodeContext] = useState<{
    code: string
    initialMode: 'individual' | 'group'
  } | null>(null)
  const [joinByCodeOpen, setJoinByCodeOpen] = useState(false)
  // Sesión de dominó en curso: el juego publicado que se está jugando (su
  // contenido son los conceptos que alimentan al reproductor genérico).
  const [dominoSession, setDominoSession] = useState<GameDetail | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<CategoryWithGameCount | null>(null)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  // `searchNonce` sube en cada Enter aunque el texto no cambie, así que este
  // scroll y la recarga de abajo se disparan siempre con cada búsqueda —
  // nunca dependen de que el valor sea distinto al de la búsqueda anterior.
  useEffect(() => {
    if (searchNonce === 0) return
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchNonce])

  // En modo "categories" (Materias) no hay lista de juegos hasta elegir una
  // materia — la grilla de materias se muestra sola, y solo entonces se
  // carga el catálogo filtrado por esa categoría (dentro del pop-up).
  const shouldLoadGames = mode !== 'categories' || activeCategoryId !== null

  const reload = useCallback(() => {
    if (!token || !shouldLoadGames) return
    setLoading(true)
    setError(null)
    listGames(token, {
      search: searchQuery || undefined,
      categoryId: mode === 'categories' ? activeCategoryId ?? undefined : undefined,
      onlyMine: mode === 'my-games' || undefined,
      status: mode === 'my-games' ? 'DRAFT' : undefined,
      community: mode === 'community' || undefined,
      pageSize: 40,
    })
      .then((result) => setGames(result.items))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los juegos.')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode, searchQuery, activeCategoryId, searchNonce, shouldLoadGames])

  useEffect(() => {
    reload()
  }, [reload])

  // Se carga siempre (no solo en mode 'categories'): el color por psicología
  // del color de cada tarjeta de juego (colorForGame) necesita el nombre de
  // la materia sin importar la sección activa (Home, Comunidad, Mis juegos).
  useEffect(() => {
    if (!token) return
    listCategories(token)
      .then((items) => setCategories(sortByGameCount(items)))
      .catch(() => {})
  }, [token])

  /**
   * Color de un juego por psicología del color según su materia (ver
   * CATEGORY_RULES), en vez del color que haya elegido quien lo creó — así
   * el color transmite consistentemente de qué trata el juego, sin importar
   * quién lo hizo. Si la materia todavía no cargó, cae al color neutro.
   */
  function colorForGame(game: GameSummary): string {
    const category = categories.find((c) => c.id === game.categoryId)
    return category ? colorForCategory(category.name) : DEFAULT_CATEGORY_COLOR
  }

  // Carga el detalle cuando la URL trae un slug (clic en tarjeta, recarga
  // directa en /juego-slug, o navegación con atrás/adelante del navegador).
  useEffect(() => {
    if (!token || !slugFromUrl) {
      setSelectedGame(null)
      return
    }
    setDetailError(null)
    getGameBySlug(token, slugFromUrl)
      .then((detail) => {
        setSelectedGame(detail)
        trackEvent(token, 'game_opened', { gameId: detail.id, metadata: { section: mode } })
      })
      .catch((err: unknown) => {
        setDetailError(err instanceof ApiError ? err.message : 'No se pudo abrir el juego.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, slugFromUrl])

  function openGame(summary: GameSummary) {
    navigate(`${basePath === '/' ? '' : basePath}/${summary.slug}`)
  }

  function closeGame() {
    navigate(basePath)
  }

  async function handleDelete() {
    if (!token || !selectedGame) return
    setDeleting(true)
    setDetailError(null)
    try {
      await deleteGame(token, selectedGame.id)
      closeGame()
      reload()
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'No se pudo eliminar el juego.')
    } finally {
      setDeleting(false)
    }
  }

  async function confirmDeleteCategory() {
    if (!token || !pendingDeleteCategory) return
    setDeletingCategory(true)
    try {
      await deleteCategory(token, pendingDeleteCategory.id)
      setCategories((current) => current.filter((c) => c.id !== pendingDeleteCategory.id))
      if (activeCategoryId === pendingDeleteCategory.id) setActiveCategoryId(null)
      setPendingDeleteCategory(null)
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : 'No se pudo eliminar la materia.')
    } finally {
      setDeletingCategory(false)
    }
  }

  function canDeleteCategory(category: CategoryWithGameCount): boolean {
    return Boolean(
      user &&
        (user.role === 'ADMIN' || user.id === category.creatorUserId || category.creatorUserId === null),
    )
  }

  function refreshCategories() {
    if (!token) return
    listCategories(token)
      .then((items) => setCategories(sortByGameCount(items)))
      .catch(() => {})
  }

  async function handleCreateCategory() {
    if (!token || !newCategoryName.trim()) return
    setSavingCategory(true)
    setCategoryError(null)
    try {
      await createCategory(token, newCategoryName.trim())
      setNewCategoryName('')
      setCreatingCategory(false)
      refreshCategories()
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : 'No se pudo crear la materia.')
    } finally {
      setSavingCategory(false)
    }
  }

  function handlePlayClick() {
    if (!selectedGame) return
    if (selectedGame.gameType === 'GUESS_WHO') {
      setGuessWhoRoomGameId(selectedGame.id)
      closeGame()
      return
    }
    // El dominó no usa PlayOptionsPopup (esas opciones son de MEMORY_MATCH):
    // se abre directo el reproductor con los conceptos del juego publicado.
    if (selectedGame.gameType === 'DOMINO') {
      setDominoSession(selectedGame)
      closeGame()
      return
    }
    setShowPlayOptions(true)
  }

  /**
   * Reproductor de dominó para el juego seleccionado: el contenido publicado
   * son los conceptos, y `handSize` sale del config del propio juego.
   */
  function renderDominoSession() {
    if (!dominoSession) return null
    return (
      <DominoGame
        title={dominoSession.title}
        concepts={dominoSession.content as DominoConcept[]}
        handSize={
          (dominoSession.config as Partial<DominoConfig>).handSize ?? DEFAULT_DOMINO_CONFIG.handSize
        }
        onExit={() => setDominoSession(null)}
      />
    )
  }

  /**
   * Overlays de detalle/juego compartidos entre las dos ramas de render
   * (grilla de Materias y el resto de secciones): antes este bloque estaba
   * duplicado literalmente entre ambas.
   */
  function renderGameOverlays() {
    return (
      <>
        {selectedGame && !showPlayOptions && (
          <GameDetailModal
            game={selectedGame}
            color={colorForGame(selectedGame)}
            canDelete={Boolean(user && (user.role === 'ADMIN' || user.id === selectedGame.creatorUserId))}
            deleting={deleting}
            onClose={closeGame}
            onPlay={handlePlayClick}
            onDelete={handleDelete}
            onUpdated={(updated) => {
              setSelectedGame(updated)
              reload()
            }}
          />
        )}

        {guessWhoRoomGameId && (
          <GuessWhoRoom
            gameId={guessWhoRoomGameId}
            onExit={() => {
              setGuessWhoRoomGameId(null)
              setJoinCodeContext(null)
            }}
            initialJoinCode={joinCodeContext?.code}
            initialMode={joinCodeContext?.initialMode}
          />
        )}

        {renderDominoSession()}

        {selectedGame && showPlayOptions && (
          <PlayOptionsPopup
            game={selectedGame}
            onClose={() => setShowPlayOptions(false)}
            onStart={(options) => {
              setPlaySession({ game: selectedGame, ...options })
              setShowPlayOptions(false)
              closeGame()
            }}
          />
        )}

        {playSession && (
          <MemoryMatchGame
            title={playSession.game.title}
            primaryColor={colorForGame(playSession.game)}
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
      </>
    )
  }

  // La grilla de "Materias" es una pantalla propia: mientras no se elige una
  // materia, no se carga ni se muestra el catálogo de juegos general.
  if (mode === 'categories') {
    return (
      <section className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Materias</h2>
            <p className="text-[14px] text-text">Elige una materia para ver sus juegos publicados.</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => setCreatingCategory(true)}
          >
            <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
            Crear materia
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <span
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              aria-hidden="true"
            >
              <Sparkles className="h-6 w-6" strokeWidth={2} />
            </span>
            <p className="text-[15px] font-medium text-text-h">Aún no hay materias creadas.</p>
            <p className="mt-1 max-w-[320px] text-[13px] text-text">Crea la primera para organizar los juegos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => {
              const color = colorForCategory(category.name)
              const Icon = iconForCategory(category.name)
              return (
                <div
                  key={category.id}
                  className="group relative rounded-2xl border border-border p-4 text-left transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--surface)' }}
                >
                  <button type="button" onClick={() => setActiveCategoryId(category.id)} className="w-full text-left">
                    <span
                      className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-white"
                      style={{ background: color }}
                      aria-hidden="true"
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    </span>
                    <p className="truncate pr-6 text-[14px] font-semibold text-text-h">{category.name}</p>
                    <p className="text-[12px] text-text">
                      {category.gameCount} {category.gameCount === 1 ? 'juego' : 'juegos'}
                    </p>
                  </button>
                  {canDeleteCategory(category) && (
                    <button
                      type="button"
                      aria-label={`Eliminar materia ${category.name}`}
                      title="Eliminar materia"
                      className="absolute top-3 right-3 rounded-lg p-1 text-text/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                      onClick={() => setPendingDeleteCategory(category)}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {creatingCategory && (
          <Modal onClose={() => (savingCategory ? null : setCreatingCategory(false))} maxWidthClassName="max-w-[400px]">
            <h2 className="mb-1 text-[18px] tracking-tight text-text-h">Nueva materia</h2>
            <p className="mb-4 text-[13px] text-text">Dale un nombre claro y corto.</p>
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              disabled={savingCategory}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateCategory()
              }}
              placeholder="Ej. Matemáticas"
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-2.5 text-[13px] text-text-h outline-none focus:border-accent"
            />
            {categoryError && (
              <p className="mt-3 text-[13px] text-danger" role="alert">
                {categoryError}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                disabled={savingCategory || !newCategoryName.trim()}
                onClick={handleCreateCategory}
              >
                {savingCategory ? 'Creando…' : 'Crear'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
                onClick={() => setCreatingCategory(false)}
                disabled={savingCategory}
              >
                Cancelar
              </button>
            </div>
          </Modal>
        )}

        {pendingDeleteCategory && (
          <Modal
            onClose={() => (deletingCategory ? null : setPendingDeleteCategory(null))}
            maxWidthClassName="max-w-[420px]"
          >
            <h2 className="mb-2 text-[18px] tracking-tight text-text-h">Eliminar materia</h2>
            <p className="mb-6 text-[14px] leading-relaxed text-text">
              ¿Eliminar "{pendingDeleteCategory.name}"? Esta acción no se puede deshacer.
            </p>
            {categoryError && (
              <p
                className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
                role="alert"
              >
                {categoryError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-danger px-4 py-3 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmDeleteCategory}
                disabled={deletingCategory}
              >
                {deletingCategory ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-3 text-[15px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setPendingDeleteCategory(null)}
                disabled={deletingCategory}
              >
                Cancelar
              </button>
            </div>
          </Modal>
        )}

        {activeCategoryId && (
          <Modal onClose={() => setActiveCategoryId(null)} maxWidthClassName="max-w-[880px]">
            <h2 className="mb-1 text-[22px] tracking-tight text-text-h">
              {categories.find((c) => c.id === activeCategoryId)?.name ?? 'Materia'}
            </h2>
            <p className="mb-6 text-[14px] text-text">Juegos publicados en esta materia.</p>

            {error && (
              <p
                className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
                role="alert"
              >
                {error}
              </p>
            )}

            {loading ? (
              <p className="py-8 text-center text-[14px] text-text">Cargando juegos…</p>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                <p className="text-[15px] font-medium text-text-h">Aún no hay juegos en esta materia.</p>
              </div>
            ) : (
              <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} color={colorForGame(game)} onClick={() => openGame(game)} />
                ))}
              </div>
            )}

            <button
              type="button"
              className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
              onClick={() => setActiveCategoryId(null)}
            >
              Cerrar
            </button>
          </Modal>
        )}

        {renderGameOverlays()}
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-10">
      {mode === 'all' && (
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
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                  onClick={() => navigate('/juegos/crear')}
                >
                  <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
                  Crear un juego nuevo
                </button>
                <button
                  type="button"
                  className="join-code-glow-btn relative flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-white transition-transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, var(--accent-2), #c81d63)' }}
                  onClick={() => setJoinByCodeOpen(true)}
                >
                  <KeyRound className="h-[18px] w-[18px]" strokeWidth={2.5} />
                  Unirme con código
                </button>
              </div>
            </div>

            <div
              className="flex h-[130px] w-[130px] shrink-0 items-center justify-center rounded-3xl border border-border"
              style={{ background: 'var(--bg)' }}
            >
              <Trophy className="h-14 w-14 text-accent-2" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      )}

      {mode !== 'all' && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="mb-1 text-[22px] tracking-tight text-text-h">
              {mode === 'community' ? 'Juegos de la comunidad' : 'Mis juegos privados'}
            </h2>
            <p className="text-[14px] text-text">
              {mode === 'community'
                ? 'Juegos que otros usuarios crearon y decidieron publicar.'
                : 'Solo tú los ves. Comparte el código de la sala para que otros se unan.'}
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => navigate('/juegos/crear')}
          >
            <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
            Crear juego
          </button>
        </div>
      )}

      <div ref={resultsRef} className="scroll-mt-6">
        {mode === 'all' && (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Juegos</h2>
              <p className="text-[14px] text-text">Elige un juego para empezar a aprender jugando.</p>
            </div>
          </div>
        )}

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
                : mode === 'community'
                  ? 'Aún nadie ha publicado juegos en la comunidad.'
                  : mode === 'my-games'
                    ? 'Aún no tienes juegos privados.'
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
                <GameCard game={game} color={colorForGame(game)} onClick={() => openGame(game)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {joinByCodeOpen && (
        <JoinByCodeModal
          onClose={() => setJoinByCodeOpen(false)}
          onResolved={(resolved, code) => {
            setJoinByCodeOpen(false)
            setJoinCodeContext({ code, initialMode: resolved.kind === 'tournament' ? 'group' : 'individual' })
            setGuessWhoRoomGameId(resolved.gameId)
          }}
        />
      )}

      {renderGameOverlays()}
    </section>
  )
}
