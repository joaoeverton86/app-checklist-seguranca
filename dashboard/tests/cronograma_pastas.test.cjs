const { test } = require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');
test('tela de pastas: prévia, cancelar, criar, trocar destino, erro e consulta',async()=>{
 const b=await chromium.launch({headless:true});try{
 const p=await b.newPage({viewport:{width:1100,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));let requests=[];let failure=false;
 await p.route('https://fixture.invalid/**',async route=>{
  if(!route.request().url().endsWith('/api/cronograma-pastas'))return route.fulfill({contentType:'text/html',body:'<select id="relSmsMes"><option value="9">Outubro</option></select><input id="relSmsAno" value="2026">'});
  const data=route.request().postDataJSON();requests.push(data);if(failure)return route.fulfill({status:409,json:{erro:'Cronograma alterado. Consulte novamente.'}});
  return route.fulfill({json:{assinatura:'sig1',itens:[{nome:'06.10.2026 — IgE - Abelhas',situacao:data.confirmar?'criada':'criar',id:data.confirmar?'fixture_folder_123':null}]}});
 });
 await p.goto('https://fixture.invalid/');await p.evaluate(()=>{window.usuarioPodeGravarModulo=()=>true;window.authTokenDashboard=async()=> 'fake';window.SUPABASE_KEY='fake';});
 await p.addScriptTag({path:'dashboard/modules/cronograma_pastas.js'});await p.evaluate(()=>cronogramaPastasAbrir());
 await p.locator('#cronogramaPastasDestino').fill('https://drive.google.com/drive/folders/month_fixture_123');
 await p.getByRole('button',{name:'Conferir pastas previstas',exact:true}).click();await p.getByText('A criar — 06.10.2026 — IgE - Abelhas').waitFor();
 assert.equal(requests.length,1);assert.equal(requests[0].confirmar,false);
 p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'Confirmar criação das pastas',exact:true}).click();assert.equal(requests.length,1);
 p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Confirmar criação das pastas',exact:true}).click();await p.getByRole('link',{name:'Abrir pasta',exact:true}).waitFor();assert.equal(requests[1].assinatura,'sig1');assert.equal(await p.locator('#cronogramaPastasCriar').isDisabled(),true);
 await p.getByRole('button',{name:'Conferir pastas previstas',exact:true}).click();await p.locator('#cronogramaPastasCriar:not([disabled])').waitFor();
 await p.locator('#cronogramaPastasDestino').fill('https://drive.google.com/drive/folders/another_fixture_123');assert.equal(await p.locator('#cronogramaPastasCriar').isDisabled(),true);
 failure=true;await p.getByRole('button',{name:'Conferir pastas previstas',exact:true}).click();await p.getByText('Cronograma alterado. Consulte novamente.').waitFor();assert.equal(await p.locator('#cronogramaPastasConsultar').isEnabled(),true);
 failure=false;await p.getByRole('button',{name:'Conferir pastas previstas',exact:true}).click();await p.locator('#cronogramaPastasCriar:not([disabled])').waitFor();
 await p.screenshot({path:'scratch/sms-melhorias/cronograma-pastas-previa.png'});
 await p.getByRole('button',{name:'Fechar',exact:true}).click();assert.equal(await p.locator('#cronogramaPastasModal').evaluate(e=>e.open),false);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
test('fotos: origem DDSMA, período editável e destinos separados por categoria',async()=>{
 const b=await chromium.launch({headless:true});try{
 const p=await b.newPage();const pedidos=[];
 await p.route('https://fixture.invalid/**',async r=>{
  if(r.request().url().endsWith('/api/cronograma-pastas')){const body=r.request().postDataJSON();pedidos.push(body);return r.fulfill({json:{assinatura:'sig',itens:[]}});}
  return r.fulfill({contentType:'text/html',body:'<input id="ddsCalendarioFiltroAno" value="2027"><input id="ddsCalendarioFiltroMes" value="0"><input id="cronoFiltroAno" value="2026"><input id="cronoFiltroMes" value="9">'});
 });
 await p.goto('https://fixture.invalid/');await p.evaluate(()=>{window.usuarioPodeGravarModulo=()=>true;window.authTokenDashboard=async()=> 'fake';window.SUPABASE_KEY='fake';localStorage.setItem('cronograma_pastas_2027_0_ddsma','https://drive.google.com/drive/folders/scan_legacy_123');});
 await p.addScriptTag({path:'dashboard/modules/cronograma_pastas.js'});await p.evaluate(()=>cronogramaPastasAbrir('ddsma'));
 assert.equal(await p.locator('#cronogramaPastasFonte').inputValue(),'ddsma');assert.equal(await p.locator('#cronogramaPastasAno').inputValue(),'2027');assert.equal(await p.locator('#cronogramaPastasMes').inputValue(),'0');
 assert.equal(await p.locator('#cronogramaPastasDestino').inputValue(),'','não importar destino legado de escaneados');
 await p.locator('#cronogramaPastasDestino').fill('https://drive.google.com/drive/folders/photos_ddsma_123');await p.locator('#cronogramaPastasConsultar').click();await p.getByText('Nenhum tema previsto nesta competência e calendário.').waitFor();
 assert.equal(pedidos[0].fonte,'ddsma');assert.equal(pedidos[0].ano,2027);assert.equal(pedidos[0].mes,0);
 await p.selectOption('#cronogramaPastasFonte','treinamentos');assert.equal(await p.locator('#cronogramaPastasDestino').inputValue(),'');
 await p.selectOption('#cronogramaPastasFonte','ddsma');assert.match(await p.locator('#cronogramaPastasDestino').inputValue(),/photos_ddsma/);
 await p.selectOption('#cronogramaPastasMes','1');assert.equal(await p.locator('#cronogramaPastasDestino').inputValue(),'');assert.equal(await p.locator('#cronogramaPastasCriar').isDisabled(),true);
 await p.locator('#cronogramaPastasFechar').click();await p.evaluate(()=>{usuarioPodeGravarModulo=m=>m==='ddsma';cronogramaPastasAbrir('ddsma');});
 assert.equal(await p.locator('#cronogramaPastasFonte option[value="treinamentos"]').evaluate(el=>el.disabled),true);
 }finally{await b.close();}
});
test('entradas de fotos são distintas dos botões existentes de escaneados',()=>{
 const html=require('node:fs').readFileSync('dashboard/index.html','utf8');
 assert.match(html,/onclick="sincronizarPastasDriveCronograma\(\)"/);
 assert.match(html,/onclick="cronogramaPastasAbrir\('treinamentos'\)"/);
 assert.match(html,/onclick="cronogramaPastasAbrir\('ddsma'\)"/);
 assert.match(html,/modules\/cronograma_pastas.js\?v=288/);
});
