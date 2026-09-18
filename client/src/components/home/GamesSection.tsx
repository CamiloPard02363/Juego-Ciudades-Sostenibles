import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, KeyRound, PlusCircle, Sparkles, Trash2, Trophy } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { DEFAULT_CATEGORY_COLOR, colorForCategory, iconForCategory } from './gamesCatalogVisuals'
import {
  listGames,
  getGameBySlug,
  deleteGame,
  type GameSummary,
  type GameDetail,
} from '../../services/game.service'
import {
  listSubjects as listCategories,
  createSubject,
  deleteSubject as deleteCategory,
  publishSubject,
  type SubjectWithGameCount as CategoryWithGameCount,
} from '../../services/subject.service'
import { ApiError } from '../../utils/http'
import { trackEvent } from '../../services/analytics.service'
import { GameCard } from './games/GameCard'
import { GameDetailModal } from './games/GameDetailModal'
import { Modal } from './games/Modal'
import { JoinByCodeModal } from './games/JoinByCodeModal'
import { resolveRoomCode, type ResolvedRoom } from './games/resolveRoomCode'
import { PlayOptionsPopup } from './games/PlayOptionsPopup'
import type { Difficulty } from './games/PlayOptionsPopup'
import { MemoryMatchGame } from './games/MemoryMatchGame'
import { MazeCollectorGame } from './games/MazeCollectorGame'
import { GuessWhoRoom } from './games/GuessWhoRoom'
import type { MemoryMatchPair, MemoryMatchConfig } from './games/memoryMatchTypes'
import { MAZE_LAYOUTS, DEFAULT_MAZE_CONFIG } from './games/mazeCollectorTypes'
import type { MazeCollectorConfig, MazeCollectorItem } from './games/mazeCollectorTypes'

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
  /**
   * true cuando el Modo Kids ya está mostrando su propia navegación
   * (mundos/juegos ilustrados, ver components/home/kids/) y esta sección
   * solo debe quedar montada para que, si la URL trae un slug, se siga
   * abriendo el mismo `GameDetailModal`/`handlePlayClick` de siempre — sin
   * pintar el hero, la barra de categorías ni el grid de texto del Home de
   * adulto por debajo.
   */
  browsingHidden?: boolean
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

function sortByGameCount(categories: CategoryWithGameCount[]): CategoryWithGameCount[] {
  return [...categories].sort((a, b) => b.gameCount - a.gameCount)
}

export function GamesSection({ mode, searchQuery, searchNonce, browsingHidden = false }: GamesSectionProps) {
  const navigate = useNavigate()
  const { slug: slugFromUrl } = useParams<{ slug?: string }>()
  const basePath = BASE_PATH_BY_MODE[mode]
  const { token, user } = useAuth()
  const isTeacher = user?.role?.toUpperCase() === 'TEACHER'
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [categories, setCategories] = useState<CategoryWithGameCount[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [rootUnclassifiedGames, setRootUnclassifiedGames] = useState<GameSummary[]>([])
  const [loadingRootUnclassified, setLoadingRootUnclassified] = useState(false)

  // El detalle abierto se deriva de la URL (slug en la ruta), no de un click
  // aislado: así el juego es compartible/recargable y el botón atrás cierra
  // el modal. `selectedGame` guarda el detalle ya cargado del slug actual.
  const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [showPlayOptions, setShowPlayOptions] = useState(false)
  const [playSession, setPlaySession] = useState<PlaySession | null>(null)
  const [mazeSession, setMazeSession] = useState<GameDetail | null>(null)
  const [guessWhoRoomGameId, setGuessWhoRoomGameId] = useState<string | null>(null)
  const [joinCodeContext, setJoinCodeContext] = useState<{
    code: string
    initialMode: 'individual' | 'group'
  } | null>(null)

  /**
   * Refleja el código de sala activo en la URL (para compartir/ver de un
   * vistazo en qué sala se está) SIN pasar por react-router: la sala vive
   * fuera del árbol de <Route> (es un overlay condicional, igual que antes
   * de esta migración), así que tocar la URL con `navigate` arriesgaría un
   * remount de esta sección por un cambio de ruta no relacionado. El socket
   * y su ciclo de vida no se enteran de este cambio en absoluto.
   */
  function handleRoomCodeChange(code: string | null) {
    const url = new URL(window.location.href)
    if (code) {
      url.searchParams.set('sala', code)
    } else {
      url.searchParams.delete('sala')
    }
    window.history.replaceState(null, '', url)
  }

  /**
   * Abre la sala/match correcto según lo que resolvió el código: dominó
   * navega a su página propia (ver DominoRoomPage), y "¿Quién Es?" (1v1 o
   * torneo) abre el overlay existente con el modo correspondiente. Se usa
   * tanto desde el botón agnóstico "Unirme con código" como desde el campo
   * de código propio de cada juego en su detalle.
   */
  function handleCodeResolved(resolved: ResolvedRoom, code: string) {
    if (resolved.kind === 'domino') {
      navigate(`/domino/sala/${code}`)
      return
    }
    if (resolved.kind === 'snakes-ladders') {
      navigate(`/escaleras-serpientes/sala/${code}`)
      return
    }
    if (resolved.kind === 'dual-quest') {
      navigate(`/dual-quest/sala/${code}`)
      return
    }
    setJoinCodeContext({ code, initialMode: resolved.kind === 'tournament' ? 'group' : 'individual' })
    setGuessWhoRoomGameId(resolved.gameId)
  }

  useEffect(() => {
    if (!token) return
    const sharedCode = new URLSearchParams(window.location.search).get('sala')?.trim().toUpperCase()
    if (!sharedCode || guessWhoRoomGameId) return

    resolveRoomCode(token, sharedCode)
      .then((resolved) => handleCodeResolved(resolved, sharedCode))
      .catch(() => {})
    // El enlace se resuelve una sola vez al montar la sección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
  const [joinByCodeOpen, setJoinByCodeOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<CategoryWithGameCount | null>(null)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParentId, setNewCategoryParentId] = useState('')
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
  // carga el catálogo filtrado por esa categoría (dentro del pop-up). Una
  // materia raíz abierta no carga juegos: primero muestra sus sub-materias
  // (ver el modal de categorías más abajo) — solo al entrar a una sub-materia
  // (o a los "juegos sin sub-materia" de la raíz) se listan juegos de verdad.
  const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? null
  const isActiveCategoryRoot = activeCategory !== null && activeCategory.parentSubjectId === null
  const shouldLoadGames = mode !== 'categories' || (activeCategoryId !== null && !isActiveCategoryRoot)

  const reload = useCallback(() => {
    if (!token || !shouldLoadGames || browsingHidden) return
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
  }, [token, mode, searchQuery, activeCategoryId, searchNonce, shouldLoadGames, browsingHidden])

  useEffect(() => {
    reload()
  }, [reload])

  // Al entrar a una materia raíz se muestran sus sub-materias, no un catálogo
  // de juegos — pero la raíz puede tener juegos asignados directo a ella
  // (categoryId = id de la raíz, sin pasar por ninguna sub-materia), y esos
  // deben verse igual dentro de la vista, en su propia sección.
  useEffect(() => {
    if (!token || !isActiveCategoryRoot || !activeCategoryId) {
      setRootUnclassifiedGames([])
      return
    }
    setLoadingRootUnclassified(true)
    listGames(token, { categoryId: activeCategoryId, pageSize: 40 })
      .then((result) => setRootUnclassifiedGames(result.items))
      .catch(() => setRootUnclassifiedGames([]))
      .finally(() => setLoadingRootUnclassified(false))
  }, [token, activeCategoryId, isActiveCategoryRoot])

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
    if (category.status !== 'PRIVATE') return false
    return Boolean(user && (user.role === 'ADMIN' || user.id === category.creatorUserId))
  }

  function refreshCategories() {
    if (!token) return
    listCategories(token)
      .then((items) => setCategories(sortByGameCount(items)))
      .catch(() => {})
  }

  // Materias raíz (parentSubjectId null): son el esqueleto fijo del catálogo,
  // solo un admin las crea. Toda materia nueva de un usuario normal nace como
  // sub-materia de una de estas — de ahí el selector obligatorio de abajo.
  const rootCategories = categories.filter((c) => c.parentSubjectId === null)
  const subCategories = categories.filter((c) => c.parentSubjectId !== null)

  const [publishingCategory, setPublishingCategory] = useState<CategoryWithGameCount | null>(null)
  const [publishDraftGames, setPublishDraftGames] = useState<GameSummary[]>([])
  const [loadingPublishPreview, setLoadingPublishPreview] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  function canPublishCategory(category: CategoryWithGameCount): boolean {
    if (category.status !== 'PRIVATE') return false
    return Boolean(user && (user.role === 'ADMIN' || user.id === category.creatorUserId))
  }

  async function openPublishModal(category: CategoryWithGameCount) {
    if (!token) return
    setPublishingCategory(category)
    setPublishError(null)
    setLoadingPublishPreview(true)
    try {
      const result = await listGames(token, { categoryId: category.id, status: 'DRAFT', pageSize: 100 })
      setPublishDraftGames(result.items)
    } catch {
      setPublishDraftGames([])
    } finally {
      setLoadingPublishPreview(false)
    }
  }

  async function confirmPublishCategory() {
    if (!token || !publishingCategory) return
    setPublishing(true)
    setPublishError(null)
    try {
      await publishSubject(token, publishingCategory.id)
      setPublishingCategory(null)
      refreshCategories()
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : 'No se pudo publicar la materia.')
    } finally {
      setPublishing(false)
    }
  }

  async function handleCreateCategory() {
    if (!token || !newCategoryName.trim() || !newCategoryParentId) return
    setSavingCategory(true)
    setCategoryError(null)
    try {
      await createSubject(token, newCategoryName.trim(), newCategoryParentId)
      setNewCategoryName('')
      setNewCategoryParentId('')
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
    // El dominó ahora es una sala 1v1 en tiempo real con página propia (ver
    // DominoRoomPage/App.tsx) en vez de un pop-up de un solo jugador: se
    // navega a la ruta, que crea la sala apenas monta (?gameId=).
    if (selectedGame.gameType === 'DOMINO') {
      closeGame()
      navigate(`/domino/sala?gameId=${selectedGame.id}`)
      return
    }
    // El recolector es un solo jugador contra la IA, sin sala en vivo — la
    // configuración (vidas, velocidad, laberinto) ya quedó fija al crear el
    // juego, así que no hace falta el popup de opciones de Memory Match.
    if (selectedGame.gameType === 'MAZE_COLLECTOR') {
      setMazeSession(selectedGame)
      closeGame()
      return
    }
    // Mismo criterio que Dominó: sala en tiempo real con página propia, no
    // un pop-up — acá de 2 a 4 jugadores en vez de 1v1.
    if (selectedGame.gameType === 'SNAKES_LADDERS') {
      closeGame()
      navigate(`/escaleras-serpientes/sala?gameId=${selectedGame.id}`)
      return
    }
    // Igual que Escaleras y Serpientes: sala en tiempo real con página
    // propia — acá siempre exactamente 2 jugadores (Fuego/Agua).
    if (selectedGame.gameType === 'DUAL_QUEST') {
      closeGame()
      navigate(`/dual-quest/sala?gameId=${selectedGame.id}`)
      return
    }
    // Motor físico (PixiJS + Matter.js): un solo mundo compartido en el
    // navegador de quien lo abre, sin sala en tiempo real — página propia
    // que carga el nivel por slug (ver DualQuestPixiPlayPage.tsx).
    if (selectedGame.gameType === 'DUAL_QUEST_PIXI') {
      closeGame()
      navigate(`/dual-quest-pixi/${selectedGame.slug}`)
      return
    }
    setShowPlayOptions(true)
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
            onJoinByCode={(resolved, code) => {
              closeGame()
              handleCodeResolved(resolved, code)
            }}
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
              handleRoomCodeChange(null)
            }}
            initialJoinCode={joinCodeContext?.code}
            initialMode={joinCodeContext?.initialMode}
            onRoomCodeChange={handleRoomCodeChange}
          />
        )}

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

        {mazeSession && (
          <MazeCollectorGame
            title={mazeSession.title}
            primaryColor={colorForGame(mazeSession)}
            layout={MAZE_LAYOUTS[(mazeSession.config as Partial<MazeCollectorConfig>).layout ?? DEFAULT_MAZE_CONFIG.layout]}
            items={mazeSession.content as MazeCollectorItem[]}
            config={{ ...DEFAULT_MAZE_CONFIG, ...(mazeSession.config as Partial<MazeCollectorConfig>) }}
            onExit={() => setMazeSession(null)}
          />
        )}
      </>
    )
  }

  // El Modo Kids ya pintó su propia navegación (ver KidsHomeShell) —
  // acá solo hace falta que, si la URL trae un slug, el detalle/"Jugar" de
  // siempre siga funcionando por debajo, sin el hero/categorías/grid del
  // Home de adulto.
  if (browsingHidden) {
    return renderGameOverlays()
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
          <>
            {rootCategories.length > 0 && (
              <div>
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text/70">Materias raíz</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {rootCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      countLabel={`${subCategories.filter((s) => s.parentSubjectId === category.id).length} sub-materias`}
                      onOpen={() => setActiveCategoryId(category.id)}
                      canDelete={canDeleteCategory(category)}
                      onDelete={() => setPendingDeleteCategory(category)}
                      canPublish={false}
                      onPublish={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {subCategories.length > 0 && (
              <div>
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text/70">Sub-materias</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {subCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      countLabel={`${category.gameCount} ${category.gameCount === 1 ? 'juego' : 'juegos'}`}
                      onOpen={() => setActiveCategoryId(category.id)}
                      canDelete={canDeleteCategory(category)}
                      onDelete={() => setPendingDeleteCategory(category)}
                      canPublish={canPublishCategory(category)}
                      onPublish={() => openPublishModal(category)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {creatingCategory && (
          <Modal onClose={() => (savingCategory ? null : setCreatingCategory(false))} maxWidthClassName="max-w-[400px]">
            <h2 className="mb-1 text-[18px] tracking-tight text-text-h">Nueva materia</h2>
            <p className="mb-4 text-[13px] text-text">
              Se crea como sub-materia privada: solo tú la ves hasta que decidas publicarla.
            </p>
            <label className="mb-1 block text-[12.5px] font-medium text-text-h">Materia principal</label>
            <select
              value={newCategoryParentId}
              disabled={savingCategory}
              onChange={(event) => setNewCategoryParentId(event.target.value)}
              className="mb-3 w-full rounded-lg border border-border bg-bg px-[13px] py-2.5 text-[13px] text-text-h outline-none focus:border-accent"
            >
              <option value="">Elige una materia principal…</option>
              {rootCategories.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              disabled={savingCategory}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateCategory()
              }}
              placeholder="Ej. Álgebra"
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
                disabled={savingCategory || !newCategoryName.trim() || !newCategoryParentId}
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

        {publishingCategory && (
          <Modal
            onClose={() => (publishing ? null : setPublishingCategory(null))}
            maxWidthClassName="max-w-[480px]"
          >
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-danger/35 bg-danger/10 p-3.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={2} />
              <div>
                <p className="text-[14px] font-semibold text-danger">Esta acción no se puede deshacer</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text">
                  Al publicar "{publishingCategory.name}", otros usuarios podrán ver y usar esta materia. No podrás
                  volver a hacerla privada ni eliminarla.
                </p>
              </div>
            </div>

            {loadingPublishPreview ? (
              <p className="py-2 text-[13px] text-text">Cargando juegos en borrador…</p>
            ) : publishDraftGames.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-[13px] font-medium text-text-h">
                  Estos juegos en borrador se publicarán automáticamente:
                </p>
                <ul className="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
                  {publishDraftGames.map((game) => (
                    <li
                      key={game.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] text-text-h"
                    >
                      <span className="truncate">{game.title}</span>
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        pasará a Comunidad
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mb-4 text-[13px] text-text">Esta materia no tiene juegos en borrador todavía.</p>
            )}

            {publishError && (
              <p className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm text-danger" role="alert">
                {publishError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border-2 border-danger px-4 py-3 text-[15px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmPublishCategory}
                disabled={publishing || loadingPublishPreview}
              >
                {publishing ? 'Publicando…' : 'Sí, publicar materia'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-3 text-[15px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setPublishingCategory(null)}
                disabled={publishing}
              >
                Cancelar
              </button>
            </div>
          </Modal>
        )}

        {activeCategoryId && activeCategory && (
          <Modal onClose={() => setActiveCategoryId(null)} maxWidthClassName="max-w-[880px]">
            <h2 className="mb-1 text-[22px] tracking-tight text-text-h">{activeCategory.name}</h2>

            {isActiveCategoryRoot ? (
              <>
                <p className="mb-6 text-[14px] text-text">Elige una sub-materia para ver sus juegos.</p>

                {subCategories.filter((s) => s.parentSubjectId === activeCategoryId).length === 0 &&
                rootUnclassifiedGames.length === 0 &&
                !loadingRootUnclassified ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                    <p className="text-[15px] font-medium text-text-h">Esta materia todavía no tiene sub-materias.</p>
                  </div>
                ) : (
                  <>
                    {subCategories.filter((s) => s.parentSubjectId === activeCategoryId).length > 0 && (
                      <div className="mb-6 grid max-h-[45vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                        {subCategories
                          .filter((sub) => sub.parentSubjectId === activeCategoryId)
                          .map((sub) => (
                            <CategoryCard
                              key={sub.id}
                              category={sub}
                              countLabel={`${sub.gameCount} ${sub.gameCount === 1 ? 'juego' : 'juegos'}`}
                              onOpen={() => setActiveCategoryId(sub.id)}
                              canDelete={canDeleteCategory(sub)}
                              onDelete={() => setPendingDeleteCategory(sub)}
                              canPublish={canPublishCategory(sub)}
                              onPublish={() => openPublishModal(sub)}
                            />
                          ))}
                      </div>
                    )}

                    {(loadingRootUnclassified || rootUnclassifiedGames.length > 0) && (
                      <div>
                        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text/70">
                          Juegos sin sub-materia
                        </h3>
                        {loadingRootUnclassified ? (
                          <p className="py-4 text-center text-[14px] text-text">Cargando…</p>
                        ) : (
                          <div className="grid max-h-[35vh] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                            {rootUnclassifiedGames.map((game) => (
                              <GameCard key={game.id} game={game} color={colorForGame(game)} onClick={() => openGame(game)} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
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
              </>
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
              {mode === 'community' ? 'Juegos de la comunidad' : isTeacher ? 'Mis actividades' : 'Mis juegos privados'}
            </h2>
            <p className="text-[14px] text-text">
              {mode === 'community'
                ? 'Juegos que otros usuarios crearon y decidieron publicar.'
                : isTeacher
                  ? 'Crea, organiza y administra tus actividades.'
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
            {isTeacher ? 'Crear actividad' : 'Crear juego'}
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
                  : mode === 'my-games' && isTeacher
                      ? 'Aún no has creado actividades'
                      : mode === 'my-games'
                        ? 'Aún no tienes juegos privados.'
                    : 'Aún no hay juegos disponibles.'}
            </p>
            <p className="mt-1 max-w-[320px] text-[13px] text-text">
              {searchQuery
                ? 'Prueba con otro término de búsqueda.'
                  : mode === 'my-games' && isTeacher
                    ? 'Crea tu primera actividad para comenzar a jugar con tus estudiantes.'
                : 'Sé la primera persona en crear uno.'}
            </p>
              {!searchQuery && mode === 'my-games' && isTeacher && (
                <button
                  type="button"
                  className="mt-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_28px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                  onClick={() => navigate('/juegos/crear')}
                >
                  <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
                  Crear actividad
                </button>
              )}
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
            handleCodeResolved(resolved, code)
          }}
        />
      )}

      {renderGameOverlays()}
    </section>
  )
}

function CategoryCard({
  category,
  countLabel,
  onOpen,
  canDelete,
  onDelete,
  canPublish,
  onPublish,
}: {
  category: CategoryWithGameCount
  countLabel: string
  onOpen: () => void
  canDelete: boolean
  onDelete: () => void
  canPublish: boolean
  onPublish: () => void
}) {
  const color = colorForCategory(category.name)
  const Icon = iconForCategory(category.name)
  const isPublic = category.status === 'PUBLIC'

  return (
    <div
      className="group relative rounded-2xl border border-border p-4 text-left transition-transform hover:-translate-y-0.5"
      style={{ background: 'var(--surface)' }}
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <span
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-white"
          style={{ background: color }}
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <p className="truncate pr-6 text-[14px] font-semibold text-text-h">{category.name}</p>
        <span
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide ${
            isPublic ? 'bg-accent/15 text-accent' : 'bg-text/10 text-text'
          }`}
        >
          {isPublic ? 'PÚBLICA' : 'PRIVADA'}
        </span>
        <p className="mt-1.5 text-[12px] text-text">{countLabel}</p>
      </button>

      {canDelete && (
        <button
          type="button"
          aria-label={`Eliminar materia ${category.name}`}
          title="Eliminar materia"
          className="absolute top-3 right-3 rounded-lg p-1 text-text/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}

      {canPublish && (
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-danger/60 px-3 py-1.5 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
          onClick={onPublish}
        >
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
          Publicar
        </button>
      )}
    </div>
  )
}
