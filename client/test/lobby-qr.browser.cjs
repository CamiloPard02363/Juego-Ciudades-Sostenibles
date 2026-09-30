// Vite en :5180. Decodifica el SVG renderizado, sin red ni cámara.
const assert = require('node:assert/strict')
const { mkdirSync } = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.QR_TEST_URL || 'http://127.0.0.1:5180'
const paths = ['/quien-es/sala/ABC234','/quien-es/torneo/ABC234','/domino/sala/ABC234','/escaleras-serpientes/sala/ABC234','/dual-quest/sala/ABC234']
const html = path => `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
const r=await import('/node_modules/.vite/deps/react.js'); const React=r.default??r;
const d=await import('/node_modules/.vite/deps/react-dom_client.js'); const {createRoot}=d.default??d;
await import('/src/index.css'); const {MultiplayerLobby}=await import('/src/components/home/games/MultiplayerLobby.tsx');
window.exits=0;window.ready=0;window.copied=null;
Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text}},configurable:true});
const root=createRoot(document.getElementById('root'));
window.renderLobby=(roomPath,code)=>root.render(React.createElement(MultiplayerLobby,{room:{code,gameTitle:'Invita a un amigo',players:[{userId:'a',displayName:'Ana',isSelf:true}]},roomPath,maxPlayers:2,isHost:true,connecting:false,error:null,turnDurationSeconds:30,onReady:()=>window.ready++,onExit:()=>window.exits++,messages:[],onSend:()=>{}}));
window.renderLobby(${JSON.stringify(path)},'ABC234');
</script></body></html>`
async function decode(page){
  return page.getByRole('img',{name:/Escanea para unirte/}).evaluate(async svg=>{
    const image=new Image(); image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await image.decode(); const canvas=document.createElement('canvas'); canvas.width=canvas.height=144;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,144,144);
    const data=ctx.getImageData(0,0,144,144);
    return window.jsQR(data.data,144,144)?.data;
  })
}
async function main(){
  mkdirSync('.scratch',{recursive:true}); const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const [index,path] of paths.entries()){
      const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/__qr-fixture',route=>route.fulfill({contentType:'text/html',body:html(path)}));
      await page.goto(base+'/__qr-fixture'); await page.getByRole('img',{name:/Escanea para unirte/}).waitFor();
      await page.addScriptTag({path:require.resolve('jsqr')});
      assert.equal(await decode(page),base+path);
      await page.getByRole('button',{name:'Copiar enlace',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.copied),await decode(page));
      await page.getByRole('button',{name:'Copiar código',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.copied),'ABC234');
      for(const width of [1280,390,320]){
        await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
        const qr=page.getByRole('img',{name:/Escanea para unirte/});await qr.scrollIntoViewIfNeeded();
        const box=await qr.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);
        assert.equal(await decode(page),base+path);
        if(index===0)await page.screenshot({path:'.scratch/lobby-qr-'+width+'.png'});
      }
      await page.evaluate(p=>window.renderLobby(p.replace('ABC234','XYZ789'),'XYZ789'),path);
      await page.getByRole('img',{name:'Escanea para unirte a la sala XYZ789'}).waitFor();
      assert.equal(await decode(page),base+path.replace('ABC234','XYZ789'));
      assert.equal(await page.evaluate(()=>window.exits+window.ready),0);
      assert.deepEqual(errors,[]);
      console.log('PASS QR decodificado, enlace/código conservados, cambio de sala y móvil: '+path);
      await page.close();
    }
  } finally {await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
