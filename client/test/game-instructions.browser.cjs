// npm run build --workspace=client; npm run preview --workspace=client -- --port 4174
// API interceptada; no requiere ni modifica una base de datos.
const assert = require('node:assert/strict')
const { mkdirSync } = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.INSTRUCTIONS_TEST_URL || 'http://127.0.0.1:4174'
const picture = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="orange"/></svg>')
function fixture(kind) {
  const memory = kind === 'PAIRS' || kind === 'OPPOSITES'
  return {
    id: kind, slug: 'test-game', title: `Prueba ${kind}`, description: 'Actividad de prueba',
    gameType: memory ? 'MEMORY_MATCH' : kind, status: 'PUBLISHED',
    creatorUserId: 'author', organizationId: null, categoryId: 'math',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    theme: { primaryColor: '#7c3aed', coverImageUrl: null },
    config: memory ? { mode: kind, perZone: 2, timePerZoneSeconds: 60, previewSeconds: 3 }
      : kind === 'MAZE_COLLECTOR' ? { layout: 'CLASSIC', lives: 3, enemySpeed: 2, collectorLabel: 'Recolector', collectorIcon: 'target', enemyLabel: 'Enemigo', enemyIcon: 'cloud' }
      : { widthPx: 800, heightPx: 500, fireStart: { x: 50, y: 300 }, waterStart: { x: 100, y: 300 }, platforms: [{ x: 0, y: 450, width: 800, height: 50, material: 'concrete' }], portal: { x: 700, y: 350, width: 50, height: 100 }, finalReveal: { title: 'Fin', summary: 'Completado', positiveUrl: picture, negativeUrl: picture } },
    content: Array.from({ length: 4 }, (_, i) => kind === 'PAIRS' ? { mode: kind, pairId: `p${i}`, label: `Sol ${i}`, imageUrl: picture }
      : kind === 'OPPOSITES' ? { mode: kind, pairId: `p${i}`, posTitle: `Limpio ${i}`, posDescription: '', posImageUrl: null, negTitle: `Sucio ${i}`, negDescription: '', negImageUrl: null }
      : { itemId: `p${i}`, label: `Sol ${i}`, icon: 'sun', color: '#f59e0b' }),
  }
}
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  mkdirSync('.scratch', { recursive: true })
  let structure
  try {
    for (const [kind, close] of [['PAIRS', 'button'], ['OPPOSITES', 'escape'], ['MAZE_COLLECTOR', 'backdrop'], ['DUAL_QUEST_PIXI', 'button'], ['DEMO', 'button']]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      page.on('console', message => { if (message.type() === 'error' && message.text().includes('Error no capturado')) errors.push(message.text()) })
      await page.addInitScript(() => localStorage.setItem('nexusplay-welcome-v1:demo:TEACHER', 'seen'))
      const game = fixture(kind)
      if (kind === 'DUAL_QUEST_PIXI') game.content = []
      await page.route('**/*', route => {
        const url = new URL(route.request().url())
        const json = data => route.fulfill({ json: data })
        if (url.pathname.endsWith('/auth/refresh')) return json({ accessToken: 'test' })
        if (url.pathname.endsWith('/users/me')) return json({ id: 'demo', role: 'TEACHER', displayName: 'Demo', email: 'demo@example.test', avatarUrl: null })
        if (url.pathname.includes('/games/slug/')) return json(game)
        if (url.pathname.endsWith('/games')) return json({ items: [], total: 0 })
        if (url.pathname.endsWith('/subjects') || url.pathname.includes('/organizations/')) return json([])
        if (url.pathname.endsWith('/analytics/events')) return json({})
        if (url.origin === base || url.protocol === 'data:') return route.continue()
        return route.abort()
      })
      await page.goto(base + (kind === 'DEMO' ? '/dual-quest/pixi-demo' : kind === 'DUAL_QUEST_PIXI' ? '/dual-quest-pixi/test-game' : '/test-game'))
      if (['PAIRS', 'OPPOSITES', 'MAZE_COLLECTOR'].includes(kind)) {
        await page.getByRole('button', { name: 'Jugar', exact: true }).click()
        if (kind !== 'MAZE_COLLECTOR') await page.getByRole('button', { name: 'Empezar', exact: true }).click()
      }
      const intro = page.locator('[data-game-instructions]')
      await intro.waitFor()
      assert.equal(await intro.getAttribute('data-game-instructions'), kind === 'DEMO' ? 'DUAL_QUEST_PIXI' : kind)
      assert.equal(await page.locator('canvas').count(), 0)
      assert.equal(await page.getByText(/Zona 1 de/).count(), 0)
      await page.waitForTimeout(1200)
      assert.equal(await intro.isVisible(), true, 'El instructivo espera confirmación, sin cierre automático')
      const current = await intro.evaluate(el => [el.parentElement.className, ...Array.from(el.querySelectorAll('*'), e => `${e.tagName}:${e.getAttribute('class')}:${e.getAttribute('style')}:${e.getAttribute('d')}`)])
      if (structure) assert.deepEqual(current, structure, 'Misma estructura, estilos e iconos en todas las modalidades')
      else structure = current
      assert.equal(await intro.locator('button').count(), 1)
      await page.screenshot({ path: `.scratch/instructions-${kind}-desktop.png` })
      await page.setViewportSize({ width: 390, height: 844 })
      await intro.getByRole('button').scrollIntoViewIfNeeded()
      const bounds = await page.getByRole('dialog').last().boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390)
      await page.screenshot({ path: `.scratch/instructions-${kind}-mobile.png` })
      if (close === 'escape') await page.keyboard.press('Escape')
      else if (close === 'backdrop') await page.mouse.click(2, 2)
      else { await intro.getByRole('button').focus(); await page.keyboard.press('Enter') }
      await intro.waitFor({ state: 'detached' })
      if (kind === 'PAIRS' || kind === 'OPPOSITES') await page.getByText(/Zona 1 de/).waitFor()
      else await page.locator('canvas').waitFor().catch(async error => { console.error(await page.locator('body').innerText(), errors); throw error })
      assert.deepEqual(errors, [])
      console.log(`PASS ${kind}: entrada real, espera previa, misma estética, móvil, continuación por ${close} y juego activo`)
      await page.close()
    }
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
