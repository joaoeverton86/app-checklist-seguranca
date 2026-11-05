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

test('fotos: extração de ID da pasta do Drive e presença do botão de importação automática sem link', async () => {
 const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage();
  await page.setContent('<select id="relSmsMes"><option value="9">Outubro</option></select><input id="relSmsAno" value="2026">');
  await page.evaluate(() => {
   window.escapeHTML = v => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
   window.usuarioPodeGravarModulo = () => true;
   window.supabaseFetch = async () => [];
  });
  await page.addScriptTag({ path: 'dashboard/modules/relatorio_sms_fotos.js' });

  // Testa extração de ID da pasta
  const idExtraido1 = await page.evaluate(() => window.relSmsFotosExtrairIdPasta('https://drive.google.com/drive/folders/17JUzOnAcvYJfVVbjZhvwPxC7hSlB1o_m?usp=drive_link'));
  assert.equal(idExtraido1, '17JUzOnAcvYJfVVbjZhvwPxC7hSlB1o_m');

  const idExtraido2 = await page.evaluate(() => window.relSmsFotosExtrairIdPasta('17JUzOnAcvYJfVVbjZhvwPxC7hSlB1o_m'));
  assert.equal(idExtraido2, '17JUzOnAcvYJfVVbjZhvwPxC7hSlB1o_m');

  // Abre a janela de fotos e confere a presença do botão de importação automática sem colar link
  await page.evaluate(() => relSmsFotosAbrir());
  const botaoTexto = await page.locator('#relSmsFotosModal button').allInnerTexts();
  const temBotaoAuto = botaoTexto.some(t => t.includes('Puxar fotos da pasta do Drive'));
  assert.equal(temBotaoAuto, true, 'O botão de puxar fotos automaticamente DEVE estar visível no modal');
 } finally {
  await browser.close();
 }
});

test('auto-fechamento: relSmsFotosPreparar auto-fecha seleção com status rascunho sem travar homologação', async () => {
 const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage();
  let patchChamado = null;
  await page.setContent('<select id="relSmsMes"><option value="9">Outubro</option></select><input id="relSmsAno" value="2026">');
  await page.evaluate(() => {
   window.escapeHTML = v => String(v);
   window.usuarioPodeGravarModulo = () => true;
   window.patchesRegistrados = [];
   window.supabaseFetch = async (t, q) => {
    if (t === 'configuracoes_sistema') {
     return [{
      id: 'relsms_fotos_2026-10',
      valor: {
       versao: 1,
       mes: 9,
       ano: 2026,
       status: 'rascunho',
       limiteDdsma: 12,
       grupos: [
        { tipo: 'treinamento', tema: 'Trabalho em Altura NR-35', data: '2026-10-06', fotos: [{ id: '1bX9876543210zyxwvutsrqponmlkjihg', nome: 'foto1.jpg' }] },
        { tipo: 'ddsma', tema: 'DDS Diálogo de Segurança', data: '2026-10-06', fotos: [{ id: '1cY9876543210zyxwvutsrqponmlkjihg', nome: 'foto2.jpg' }] }
       ]
      },
      atualizado_em: '2026-11-04T12:00:00Z'
     }];
    }
    return [];
   };
   window.supabasePatch = async (t, f, payload) => {
    window.patchesRegistrados.push({ tabela: t, filtro: f, payload });
    return [payload];
   };
  });
  await page.addScriptTag({ path: 'dashboard/modules/relatorio_sms_fotos.js' });

  // Executa relSmsFotosPreparar diretamente (como ocorre na homologação)
  const docPreparado = await page.evaluate(async () => {
   return await window.relSmsFotosPreparar(9, 2026);
  });

  assert.ok(docPreparado, 'O documento preparado de fotos não deve ser nulo');
  assert.equal(docPreparado.status, 'fechado', 'O status retornado DEVE ser fechado');
  assert.equal(docPreparado.grupos.length, 2, 'Deve conter os 2 grupos');

  const patches = await page.evaluate(() => window.patchesRegistrados);
  assert.equal(patches.length, 1, 'Deve ter gravado o fechamento no Supabase');
  assert.equal(patches[0].tabela, 'configuracoes_sistema');
  assert.equal(patches[0].payload.valor.status, 'fechado');
 } finally {
  await browser.close();
 }
});
