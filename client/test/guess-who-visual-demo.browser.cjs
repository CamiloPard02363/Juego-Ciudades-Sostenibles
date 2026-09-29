// Vite en :5174; fixtures locales, sin conexión a datos ni salas reales.
// PLAYWRIGHT_MODULE permite reutilizar una instalación externa sin instalar paquetes.
const assert = require('node:assert/strict')
const { mkdirSync } = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.DEMO_TEST_URL || 'http://127.0.0.1:5174'

function fixtureHtml(custom, kind = 'GUESS_WHO') {
  return `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
    const reactModule = await import('/node_modules/.vite/deps/react.js');
    const React = reactModule.default ?? reactModule;
    const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
    const {createRoot} = domModule.default ?? domModule;
    await import('/src/index.css');
    const {GameInstructionsGate} = await import('/src/components/home/games/GameInstructionsGate.tsx');
    window.sessionMounts=0;
    function Session(){window.sessionMounts++;return React.createElement('p',{id:'real-session'},'Sesión real montada')}
    const example=${custom ? `{
      edition:'Animales de prueba',question:'¿Tiene plumas?',answer:'Sí',rivalQuestion:'¿Puede volar?',
      wrongGuess:{optionId:'duck',question:'¿Es un pato?'},correctGuess:{optionId:'owl',question:'¿Es un búho?'},
      options:[['duck','Pato',true],['cat','Gato',false],['dog','Perro',false],['owl','Búho',true],['fish','Pez',false]].map(([id,label,matchesAnswer])=>({id,label,matchesAnswer,visual:React.createElement('span',null,label)}))
    }` : 'undefined'};
    createRoot(document.getElementById('root')).render(React.createElement(GameInstructionsGate,{kind:'${kind}',guessWhoExample:example},React.createElement(Session)));
  </script></body></html>`
}

async function main() {
  mkdirSync('.scratch', { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const [width, motion, kind] of [[1280, 'no-preference', 'GUESS_WHO'], [390, 'reduce', 'GUESS_WHO'], [320, 'reduce', 'GUESS_WHO_GROUP']]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: motion })
      const errors = []; page.on('pageerror', error => errors.push(error.message))
      await page.route('**/__guide-fixture', route => route.fulfill({ contentType: 'text/html', body: fixtureHtml(false, kind) }))
      await page.goto(base + '/__guide-fixture')
      const demo = page.locator('[data-guess-who-demo]')
      await demo.waitFor().catch(error => { console.error(errors); throw error })
      assert.equal(await page.evaluate(() => window.sessionMounts), 0)
      await page.waitForTimeout(1000)
      assert.equal(await demo.getByText('1 de 5', { exact: true }).count(), 1)
      assert.equal(await demo.getByRole('button', { name: 'Anterior', exact: true }).isDisabled(), true)
      await page.keyboard.press('Tab'); assert.equal(await page.getByRole('button', { name: 'Siguiente', exact: true }).evaluate(el => el === document.activeElement), true)
      await page.keyboard.press('Enter')
      await demo.getByText('¿La bandera tiene color rojo?', { exact: true }).waitFor()
      assert.equal(await demo.locator('[data-active-player="0"]').count(), 1)
      assert.equal(await demo.getByText('Sí', { exact: true }).count(), 1)
      assert.equal(await demo.getByText('No', { exact: true }).count(), 1)
      await demo.getByRole('button', { name: 'Siguiente' }).click()
      assert.equal(await demo.locator('[data-demo-discarded="true"]').count(), 3)
      for (const label of ['Finlandia', 'Suecia', 'Grecia']) assert.equal(await demo.getByRole('listitem', { name: `${label}, descartada`, exact: true }).count(), 1)
      await page.waitForTimeout(motion === 'reduce' ? 600 : 1200)
      assert.ok(Number(await demo.locator('[data-demo-discarded]').first().evaluate(el => getComputedStyle(el).opacity)) < 0.5)
      await page.screenshot({ path: `.scratch/guess-who-demo-discard-${width}.png` })
      await demo.getByRole('button', { name: 'Anterior' }).click()
      assert.equal(await demo.locator('[data-demo-discarded]').count(), 0)
      await demo.getByRole('button', { name: 'Siguiente' }).click()
      await demo.getByRole('button', { name: 'Siguiente' }).click()
      await demo.getByText('Ahora juega tu rival.', { exact: true }).waitFor()
      assert.equal(await demo.locator('[data-active-player="1"]').count(), 1)
      await demo.getByRole('button', { name: 'Siguiente' }).click()
      await demo.getByText('¿Es Canadá?', { exact: true }).waitFor()
      await demo.getByText('No es correcto. Pierdes el turno.', { exact: true }).waitFor()
      assert.equal(await demo.getByRole('listitem', { name: 'Canadá, seleccionada', exact: true }).count(), 1)
      await page.screenshot({ path: `.scratch/guess-who-demo-wrong-${width}.png` })
      await demo.getByRole('button', { name: 'Ver un acierto' }).click()
      await demo.getByText('¡Correcto! Descubriste la identidad oculta.', { exact: true }).waitFor()
      await demo.getByText('Pregunta → Escucha → Descarta → Cambia el turno → Adivina', { exact: true }).waitFor()
      assert.equal(await demo.locator('[data-active-player="0"]').count(), 1)
      assert.equal(await demo.getByRole('listitem', { name: 'Japón, seleccionada', exact: true }).count(), 1)
      assert.equal(await page.evaluate(() => window.sessionMounts), 0)
      assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth), true)
      await demo.getByRole('button', { name: '¡Entendido, vamos a jugar!' }).scrollIntoViewIfNeeded()
      await page.screenshot({ path: `.scratch/guess-who-demo-correct-${width}.png` })
      await demo.getByRole('button', { name: '¡Entendido, vamos a jugar!' }).click()
      await page.locator('#real-session').waitFor().catch(error => { console.error(errors); throw error })
      assert.equal(await page.evaluate(() => window.sessionMounts), 1)
      assert.deepEqual(errors, [])
      console.log(`PASS ${width}px ${kind}: cinco escenas, descarte, turnos, error/acierto, teclado y montaje único al continuar`)
      await page.close()
    }
    for (const close of ['Escape', 'backdrop']) {
      const page = await browser.newPage()
      await page.route('**/__guide-fixture', route => route.fulfill({ contentType: 'text/html', body: fixtureHtml(true) }))
      await page.goto(base + '/__guide-fixture')
      await page.getByText('Identidad Oculta · Ejemplo: Animales de prueba', { exact: true }).waitFor()
      await page.waitForTimeout(1000)
      assert.equal(await page.getByText('Canadá', { exact: true }).count(), 0)
      await page.getByRole('button', { name: 'Siguiente' }).click()
      await page.getByText('¿Tiene plumas?', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Siguiente' }).click()
      assert.equal(await page.locator('[data-demo-discarded]').count(), 3)
      assert.equal(await page.evaluate(() => window.sessionMounts), 0)
      if (close === 'Escape') await page.keyboard.press('Escape'); else await page.mouse.click(2, 2)
      await page.locator('#real-session').waitFor()
      assert.equal(await page.evaluate(() => window.sessionMounts), 1)
      console.log(`PASS edición configurable y continuación por ${close}`)
      await page.close()
    }
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
