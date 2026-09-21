// Ejecutar contra Vite local. Requiere Playwright (o PLAYWRIGHT_MODULE con su ruta).
// Todas las respuestas de API son simuladas: no se usan cuentas reales.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const base = process.env.TOUR_TEST_URL || 'http://127.0.0.1:5173'

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const scenario of ['TEACHER', 'TEACHER_ORG', 'ADMIN', 'STUDENT']) {
      const role = scenario === 'TEACHER_ORG' ? 'TEACHER' : scenario
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      let userId = 'tour-user'
      let currentRole = role
      const errors = []
      const diagnostics = []
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') diagnostics.push(message.text()) })
      page.on('requestfailed', request => diagnostics.push(`${request.url()}: ${request.failure()?.errorText}`))
      await page.route('**/*', route => {
        const url = new URL(route.request().url())
        const json = data => route.fulfill({ json: data })
        if (url.pathname.endsWith('/auth/refresh')) return json({ accessToken: 'tour-test-token' })
        if (url.pathname.endsWith('/users/me')) return json({ id: userId, role: currentRole, displayName: 'Alex Demo', firstName: 'Alex', lastName: 'Demo', email: 'demo@example.test', avatarUrl: null })
        if (url.pathname.endsWith('/subjects')) return json([{ id: 'math', name: 'Matemáticas', slug: 'math', parentSubjectId: null, status: 'PUBLIC', gameCount: 1 }])
        if (url.pathname.endsWith('/games')) return json({ items: [], total: 0, page: 1, pageSize: 40 })
        if (url.pathname.includes('/organizations/')) return json(scenario === 'TEACHER_ORG' ? [{ id: 'school', name: 'Colegio demo', myOrgRole: 'ADMIN' }] : [])
        if (url.pathname.endsWith('/analytics/events')) return json({})
        if (url.origin === base) return route.continue()
        return route.abort()
      })
      const card = page.getByRole('region', { name: 'Recorrido de NexusPlay' })
      const guide = page.getByRole('button', { name: 'Repetir recorrido de bienvenida' })
      await page.goto(base)
      await guide.waitFor().catch(async error => {
        console.error('Initial UI:', await page.locator('body').innerText(), errors, diagnostics)
        throw error
      })
      await page.keyboard.press('Escape')
      assert.equal(await guide.getAttribute('data-tour-active'), 'true', 'Se conserva la invitación inicial')
      await guide.click()
      await card.getByRole('button', { name: 'Cerrar recorrido' }).click()
      await card.waitFor({ state: 'hidden' })
      await page.reload()
      await guide.waitFor()
      assert.equal(await card.count(), 0, 'Dismissal survives reload')
      assert.equal(await guide.getAttribute('data-tour-active'), null, 'No se reinicia la bienvenida para cuentas existentes')
      if (scenario === 'TEACHER_ORG') await page.locator('[data-tour="nav-organization"]').waitFor()
      await guide.click()
      const targets = role === 'STUDENT' ? ['worlds', 'worlds', 'profile'] : [
        'join', 'create', 'navigation', 'nav-home', 'nav-subjects',
        ...(role === 'TEACHER' ? ['nav-classes'] : []), 'nav-community', 'nav-own-games',
        ...(role === 'ADMIN' ? ['nav-themes', 'nav-users'] : []),
        ...(role === 'ADMIN' || scenario === 'TEACHER_ORG' ? ['nav-organization'] : []),
        'search', 'menu-toggle', 'theme-toggle', 'profile',
      ]
      for (let i = 0; i < targets.length; i++) {
        await page.locator(`[data-tour="${targets[i]}"][data-tour-active="true"]`).waitFor()
        assert.ok((await card.innerText()).includes(`${i + 1} de ${targets.length}`))
        assert.equal(await page.locator('[data-tour-active="true"]').count(), 1)
        if (targets[i] === 'nav-subjects') {
          fs.mkdirSync('.scratch', { recursive: true })
          await page.screenshot({ path: `.scratch/tour-navigation-${scenario}-desktop.png` })
        }
        if (role === 'STUDENT') assert.doesNotMatch(await card.innerText(), /crear|administr|Temas|Mis clases/i)
        if (role === 'TEACHER') assert.doesNotMatch(await card.innerText(), /administras|Temas/)
        if (i === 1) {
          await card.getByRole('button', { name: 'Atrás' }).click()
          await page.locator(`[data-tour="${targets[0]}"][data-tour-active]`).waitFor()
          await card.getByRole('button', { name: 'Siguiente' }).click()
        }
        await card.getByRole('button', { name: i === targets.length - 1 ? '¡Listo!' : 'Siguiente', exact: true }).click()
      }
      await card.waitFor({ state: 'hidden' })
      assert.equal(await page.locator('[data-tour-active]').count(), 0)
      assert.equal(await guide.evaluate(el => el === document.activeElement), true)
      await guide.click()
      await page.keyboard.press('Escape')
      await card.waitFor({ state: 'hidden' })

      if (role !== 'STUDENT') {
        await guide.click()
        await card.getByRole('button', { name: 'Probar con un código' }).click()
        await page.getByPlaceholder('CÓDIGO').waitFor()
        await card.waitFor({ state: 'hidden' })
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await guide.click()
        await card.getByRole('button', { name: 'Siguiente' }).click()
        await card.getByRole('button', { name: 'Crear una actividad' }).click()
        await page.waitForURL('**/juegos/crear')
        await page.getByRole('button', { name: 'Volver', exact: true }).click()
        await guide.waitFor()
        assert.equal(await card.count(), 0)
      } else {
        await guide.click()
        await page.locator('[data-tour="worlds"] button').first().click()
        await card.waitFor({ state: 'hidden' })
        await page.getByRole('heading', { name: 'Matemáticas', exact: true }).waitFor()
        await guide.click()
        await card.getByRole('button', { name: 'Siguiente' }).click()
        await card.getByRole('button', { name: 'Siguiente' }).click()
        await page.locator('[data-tour="worlds-back"][data-tour-active="true"]').waitFor()
        assert.ok((await card.innerText()).includes('3 de 4'))
        await card.getByRole('button', { name: 'Volver a los mundos' }).click()
        await page.locator('[data-tour="worlds-back"]').waitFor({ state: 'hidden' })
      }
      if (role !== 'STUDENT') {
        async function openStep(target) {
          await guide.click()
          for (let i = 0; i < targets.indexOf(target); i++) await card.getByRole('button', { name: 'Siguiente' }).click()
          await page.locator(`[data-tour="${target}"][data-tour-active="true"]`).waitFor()
        }
        await openStep('nav-community')
        await card.getByRole('button', { name: 'Explorar comunidad' }).click()
        await page.waitForURL('**/comunidad')
        await card.waitFor({ state: 'hidden' })
        await page.goto(base)
        await openStep('search')
        await card.getByRole('button', { name: 'Probar la búsqueda' }).click()
        assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true)
        await page.getByRole('searchbox').fill('números')
        await page.getByRole('searchbox').press('Enter')
        await page.getByRole('searchbox').fill('')
        await openStep('theme-toggle')
        await card.getByRole('button', { name: 'Elegir apariencia' }).click()
        await page.getByRole('button', { name: 'Tema oscuro', exact: true }).click()
        assert.equal(await page.getByRole('button', { name: 'Tema oscuro', exact: true }).getAttribute('aria-pressed'), 'true')
        await page.getByRole('button', { name: 'Tema claro', exact: true }).click()
        await openStep('menu-toggle')
        await card.getByRole('button', { name: 'Cambiar tamaño del menú' }).click()
        await page.getByRole('button', { name: 'Expandir menú', exact: true }).waitFor()
        await guide.click()
        for (let i = 0; i < targets.length; i++) {
          await page.locator(`[data-tour="${targets[i]}"][data-tour-active="true"]`).waitFor()
          await card.getByRole('button', { name: i === targets.length - 1 ? '¡Listo!' : 'Siguiente', exact: true }).click()
        }
      }
      // Probar el enlace al perfil desde el último paso.
      await guide.click()
      for (let i = 1; i < targets.length; i++) await card.getByRole('button', { name: 'Siguiente' }).click()
      await card.getByRole('button', { name: 'Abrir mi perfil' }).click()
      await page.getByRole('menu').waitFor()
      await page.keyboard.press('Escape')

      // Otra cuenta recibe su propia invitación en el mismo dispositivo.
      userId = 'another-user'
      await page.reload()
      await guide.click()
      await card.waitFor()
      await card.getByRole('button', { name: 'Cerrar recorrido' }).click()
      userId = 'fresh-deep-link'
      await page.goto(`${base}/comunidad`)
      await guide.waitFor()
      assert.equal(await card.count(), 0)
      await guide.click()
      await page.waitForURL(base + '/')
      await card.waitFor()
      await page.goBack()
      await page.waitForURL('**/comunidad')
      await card.waitFor({ state: 'hidden' })
      await page.goForward()
      await page.waitForURL(base + '/')
      assert.equal(await card.count(), 0, 'Leaving the tour does not reopen it on browser back/forward')
      // Vista móvil: tarjeta y cierre siempre dentro de la pantalla.
      await page.setViewportSize({ width: 390, height: 844 })
      const guideBounds = await guide.boundingBox()
      assert.ok(guideBounds.x >= 0 && guideBounds.x + guideBounds.width <= 391, 'Replay visible on mobile')
      await guide.click()
      const bounds = await card.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391)
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 845)
      // Los nuevos pasos también deben tener objetivos reales y una tarjeta visible en móvil.
      for (let i = 0; i < targets.length; i++) {
        await page.locator(`[data-tour="${targets[i]}"][data-tour-active="true"]`).waitFor()
        const stepBounds = await card.boundingBox()
        assert.ok(stepBounds.x >= 0 && stepBounds.x + stepBounds.width <= 391)
        assert.ok(stepBounds.y >= 0 && stepBounds.y + stepBounds.height <= 845)
        if (targets[i] === 'nav-subjects') await page.screenshot({ path: `.scratch/tour-navigation-${scenario}-mobile.png` })
        if (i < targets.length - 1) await card.getByRole('button', { name: 'Siguiente' }).click()
      }
      fs.mkdirSync('.scratch', { recursive: true })
      await page.screenshot({ path: `.scratch/welcome-${role.toLowerCase()}-mobile.png` })
      await card.getByRole('button', { name: 'Cerrar recorrido' }).click()
      await page.setViewportSize({ width: 1280, height: 800 })
      await guide.click()
      await page.screenshot({ path: `.scratch/welcome-${role.toLowerCase()}-desktop.png` })
      await page.keyboard.press('Escape')
      currentRole = role === 'STUDENT' ? 'TEACHER' : 'STUDENT'
      await page.reload()
      await guide.click()
      await card.waitFor()
      await card.getByRole('button', { name: 'Cerrar recorrido' }).click()
      // Simular almacenamiento bloqueado solo para la guía (otras preferencias intactas).
      await page.addInitScript(() => {
        for (const method of ['getItem', 'setItem']) {
          const original = Storage.prototype[method]
          Storage.prototype[method] = function (key, ...args) {
            if (key.startsWith('nexusplay-welcome-')) throw new Error('Storage blocked for test')
            return original.call(this, key, ...args)
          }
        }
      })
      userId = 'blocked-storage'
      await page.reload()
      await guide.click()
      await card.waitFor()
      await card.getByRole('button', { name: 'Cerrar recorrido' }).click()
      await guide.click()
      await page.keyboard.press('Escape')
      await card.waitFor({ state: 'hidden' })
      assert.deepEqual(errors, [], 'No uncaught browser errors')
      await context.close()
      console.log(`PASS ${scenario}: pasos, objetivos, permisos, repetición, persistencia, acciones, menú contraído y móvil`)
    }
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
