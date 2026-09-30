// Vite local. Reutiliza Playwright mediante PLAYWRIGHT_MODULE sin instalar dependencias.
const assert = require('node:assert/strict')
const { mkdirSync } = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.DEMO_TEST_URL || 'http://127.0.0.1:5177'
const fixture = `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
const reactModule=await import('/node_modules/.vite/deps/react.js'); const React=reactModule.default??reactModule;
const domModule=await import('/node_modules/.vite/deps/react-dom_client.js'); const {createRoot}=domModule.default??domModule;
await import('/src/index.css'); const {MatchBoard}=await import('/src/components/home/games/MatchBoard.tsx');
const root=createRoot(document.getElementById('root'));
const cards=Array.from({length:6},(_,i)=>({cardId:String(i),label:'Opción '+i,imageUrl:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#bca0ef"/></svg>'),audioUrl:null,info:null}));
let discarded=[],turn=true,allowed=true; window.sent=[];
window.setTurn=value=>{turn=value;render()}; window.setAllowed=value=>{allowed=value;render()};
window.reset=()=>{discarded=[];turn=true;allowed=true;render()};
function render(){root.render(React.createElement(MatchBoard,{cards,self:{userId:'one',displayName:'Tú',discardedCardIds:discarded,secretCardId:'5'},opponent:{userId:'two',displayName:'Rival'},isMyTurn:turn,canAccuse:allowed&&turn&&discarded.length>=3,turnDeadline:null,turnDurationSeconds:30,onDiscard:id=>{discarded=[...discarded,id];render()},onAccuse:id=>window.sent.push(id),onPassTurn:()=>{turn=false;render()}}))};render();
</script></body></html>`

async function main(){
  mkdirSync('.scratch',{recursive:true})
  const browser=await chromium.launch({channel:'chrome',headless:true})
  try {
    for(const width of [1280,390,320]){
      const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'})
      const errors=[]; page.on('pageerror',error=>errors.push(error.message))
      await page.route('**/__accusation-fixture',route=>route.fulfill({contentType:'text/html',body:fixture}))
      await page.goto(base+'/__accusation-fixture')
      const guess=page.getByRole('button',{name:'¡Creo que es esta!',exact:true})
      await guess.waitFor(); assert.equal(await guess.isDisabled(),true)
      await page.waitForTimeout(1800) // Deja terminar el aviso de turno existente.
      const help=page.getByRole('button',{name:'¿Cómo puedo adivinar?',exact:true})
      await help.click(); await page.getByText(/Acusar es intentar adivinar/).waitFor()
      assert.deepEqual(await page.evaluate(()=>window.sent),[])
      await help.click()
      for(let i=0;i<3;i++){
        assert.equal(await guess.isDisabled(),true)
        await page.getByRole('button',{name:'Opción '+i,exact:true}).click()
      }
      assert.equal(await guess.isEnabled(),true)
      await page.getByText(/¡Ya puedes adivinar!/).waitFor()
      await guess.click()
      let dialog=page.getByRole('dialog')
      await dialog.waitFor()
      assert.equal(await dialog.getByRole('button',{name:'Sí, confirmar'}).isDisabled(),true)
      assert.equal(await dialog.getByRole('button',{name:'Opción 0',exact:true}).count(),0)
      await dialog.getByRole('button',{name:'Opción 3',exact:true}).click()
      assert.deepEqual(await page.evaluate(()=>window.sent),[])
      await dialog.getByText('¿Crees que Opción 3 es la identidad oculta?',{exact:true}).waitFor()
      await page.screenshot({path:'.scratch/guess-confirm-'+width+'.png'})
      await dialog.getByRole('button',{name:'Seguir pensando'}).click()
      assert.deepEqual(await page.evaluate(()=>window.sent),[])
      assert.equal(await guess.evaluate(el=>el===document.activeElement),true)
      await guess.click(); await page.keyboard.press('Shift+Tab')
      assert.equal(await dialog.getByRole('button',{name:'Seguir pensando'}).evaluate(el=>el===document.activeElement),true)
      await page.keyboard.press('Escape'); await guess.waitFor()
      await guess.click(); await dialog.getByRole('button',{name:'Opción 4',exact:true}).click()
      await dialog.getByRole('button',{name:'Sí, confirmar'}).click()
      assert.deepEqual(await page.evaluate(()=>window.sent),['4'])
      await guess.click(); await dialog.getByRole('button',{name:'Opción 3',exact:true}).click()
      await page.evaluate(()=>window.setTurn(false))
      await dialog.waitFor({state:'detached'}); assert.equal(await guess.isDisabled(),true)
      await page.evaluate(()=>window.setTurn(true)); await guess.click()
      assert.equal(await dialog.getByRole('button',{name:'Sí, confirmar'}).isDisabled(),true)
      await page.evaluate(()=>window.setAllowed(false)); await dialog.waitFor({state:'detached'})
      assert.deepEqual(await page.evaluate(()=>window.sent),['4'])
      await page.evaluate(()=>window.reset()); assert.equal(await guess.isDisabled(),true)
      assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true)
      await page.screenshot({path:'.scratch/guess-button-'+width+'.png'})
      assert.deepEqual(errors,[])
      console.log('PASS '+width+'px: umbral 0–3, ayuda, selección sin envío, confirmar, cancelar, teclado, cambio de turno y reinicio')
      await page.close()
    }
  } finally {await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
