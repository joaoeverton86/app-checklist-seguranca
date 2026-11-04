const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
test('cronograma: data realizada, reprogramação, escolha explícita e progresso', async () => {
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage();
 await page.setContent('<select id="relSmsMes"><option value="9">Outubro</option></select><input id="relSmsAno" value="2026">');
 await page.evaluate(()=>{
  window.escapeHTML=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  window.usuarioPodeGravarModulo=()=>true;window.consultas=[];
  window.supabaseFetch=async(t,q)=>{
   consultas.push([t,q]);
   if(t==='configuracoes_sistema')return [];
   if(t==='treinamentos_catalogo')return [{id:'nr1',nome:'Tema A'},{id:'nr2',nome:'Tema B'}];
   if(t==='treinamentos_cronograma')return [
    {id:'c1',treinamento_cod:'nr1',data_prevista:'2026-09-15',data_realizada:'2026-10-06'},
    {id:'c2',treinamento_cod:'nr2',data_prevista:'2026-10-06',data_realizada:'2026-10-06'},
    {id:'c3',treinamento_cod:'nr2',data_prevista:'2026-10-20',data_realizada:null}];
  };
 });
 await page.addScriptTag({path:'dashboard/modules/relatorio_sms_fotos.js'});
 await page.evaluate(()=>relSmsFotosAbrir());await page.evaluate(()=>relSmsFotosCronograma());
 assert.match(await page.locator('#relSmsFotosOpcoesCronograma').innerText(),/2 aplicações realizadas; 2 sem par/);
 assert.equal(await page.locator('#relSmsFotosOpcoesCronograma button').count(),2);
 assert.equal(await page.locator('[name="tema"]').inputValue(),'');
 await page.locator('#relSmsFotosOpcoesCronograma button').first().click();
 assert.equal(await page.locator('[name="data"]').inputValue(),'2026-10-06');
 await page.getByRole('button',{name:'Adicionar tema / data',exact:true}).click();
 assert.equal(await page.evaluate(()=>relSmsFotosEstado.doc.grupos[0].cronogramaId),'c1');
 assert.equal(await page.evaluate(()=>relSmsFotosEstado.doc.grupos[0].fotos.length),0);
 assert.match(await page.evaluate(()=>consultas.find(c=>c[0]==='treinamentos_cronograma')[1]),/data_realizada.gte/);
 } finally { await browser.close(); }
});
