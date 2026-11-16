const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const funcoes=['obterConteudoProgramaticoCertificado','validarConteudoProgramaticoCertificado','construirFolhaCertificado','gerarCertificadoIndividual','gerarCertificadosTurma','executarEmissaoCertificadoModal','gerarKitCompletoIntegracao','gerarKitCompletoTurmaKits'];
function extrair(src,nome){const m=src.match(new RegExp('(?:async )?function '+nome+'\\([^]*?\\n\\}'));assert(m,nome);return m[0];}
function ambiente(arquivo){
 const src=fs.readFileSync(arquivo,'utf8'),els={},efeitos={aberturas:[],emissoes:[],patches:[],alertas:[],foco:0};
 const ctx={codigo:'CURSO-TESTE',data:'2026-11-16',campos:{tipo_capacitacao:'inicial'},colaboradores:[{matricula:'FIX1',nome:'Pessoa Fictícia',funcao:'Função Fictícia'}]};
 const cat={id:ctx.codigo,nome:'Treinamento de Segurança do Trabalho',conteudo_programatico:''};
 const sandbox={document:{getElementById:id=>els[id]||null},console,allTreinamentosCatalogo:[cat],allEfetivo:[{id:'FIX1'}],
  contextoRegistroPadrao:()=>ctx,contextoKits:()=>ctx,certModalCtxAtual:ctx,certModalMatriculaAtual:'FIX1',
  alert:s=>efeitos.alertas.push(s),garantirDocumentosControleCarregados:async()=>{},
  abrirDocumentoHtmlParaImpressao:html=>efeitos.aberturas.push(html),registrarEmissaoDocumento:(...args)=>efeitos.emissoes.push(args),supabasePatch:async(...args)=>efeitos.patches.push(args),
  obterDocumentosMarcadosNoKit:()=>({certificado:true}),obterMetadadosNormativosKits:()=>({anuenciaExigida:false}),
  ehCursoNr10:()=>false,codigoRevisaoDocumento:()=>null,obterTituloECargaSessao:()=>({titulo:cat.nome,cargaHoraria:4}),formatarPeriodoTreinamento:()=>({extenso:'em 16/11/2026',emissao:'16/11/2026'}),
  escapeHTML:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),formatSimpleDate:s=>s,
  EMPRESA_INFO:{razaoSocial:'Empresa Fictícia',cnpj:'FICTICIO'},LOGO_COP_BASE64:'',DOC_INDIVIDUAL_CSS:'',REGISTRO_TREINAMENTO_CSS:'',
  construirFolhaOrdemServico:()=>'<p>OS</p>',construirFolhaRegistroTreinamento:()=>'<p>Lista</p>',
  construirFolhaAnuencia:()=>'',construirFolhaDeclaracaoIntegracao:()=>'',construirFolhaTermoRecusa:()=>'',blocoAssinatura:html=>html,
  fecharModalEmissaoCertificado:()=>{sandbox.certModalCtxAtual=null;els.modalEmissaoCertificado.style.display='none';}};
 const c=vm.createContext(sandbox);vm.runInContext(funcoes.map(n=>extrair(src,n)).join('\n'),c);
 for(const id of ['modalEmissaoCertificado','certModalStatusMsg','certModalConteudoProgramatico','kitsForm_conteudoProgramatico','certModalSalvarCatalogo','certModalAlvoSelect']) els[id]={value:'',checked:false,style:{display:'none'},focus:()=>efeitos.foco++};
 els.modalEmissaoCertificado.style.display='flex';els.certModalSalvarCatalogo.checked=true;
 return {c,ctx,cat,els,efeitos};
}
const fontes=['dashboard/dashboard.js','dashboard/modules/treinamentos_ddsma.js'];
test('núcleo e módulo compartilham resolvedor, validador e defesa no construtor',()=>{
 const [a,b]=fontes.map(p=>fs.readFileSync(p,'utf8'));
 for(const n of funcoes.slice(0,2)) assert.equal(extrair(a,n),extrair(b,n));
 // O módulo preserva agenda multiperíodo, ausente da cópia legada do núcleo.
 for(const src of [a,b]) assert.match(extrair(src,'construirFolhaCertificado'), /if \(!conteudo\) throw new Error/);
});
for(const fonte of fontes){
 test(fonte+': vazio, espaços e caracteres invisíveis não produzem folha nem assumem programa por título/código',()=>{
  const {c,ctx,cat}=ambiente(fonte);
  for(const valor of ['', ' \n\t\u00a0', '\u200b\ufeff']){
   cat.conteudo_programatico=valor;
   for(const codigo of ['CURSO-TESTE','1','10']) assert.throws(()=>c.construirFolhaCertificado(ctx.colaboradores[0],{},cat,codigo,ctx.campos,ctx.data),/conteúdo programático/);
  }
 });
 test(fonte+': nenhuma emissão individual, turma ou kit com certificado vazio',async()=>{
  const {c,ctx,efeitos}=ambiente(fonte);
  await c.gerarCertificadoIndividual('FIX1',ctx);await c.gerarCertificadosTurma(ctx);
  await c.gerarKitCompletoIntegracao('FIX1',ctx);await c.gerarKitCompletoTurmaKits();
  assert.equal(efeitos.alertas.length,4);assert.equal(efeitos.aberturas.length,0);assert.equal(efeitos.emissoes.length,0);assert.equal(efeitos.patches.length,0);
 });
 test(fonte+': modal vazio fica aberto, orienta e não grava catálogo/aproveitamento',async()=>{
  const {c,cat,els,efeitos}=ambiente(fonte);cat.conteudo_programatico='Programa já cadastrado';
  for(const valor of ['', ' \n ', '\u200b']){els.certModalConteudoProgramatico.value=valor;await c.executarEmissaoCertificadoModal();}
  assert.equal(els.modalEmissaoCertificado.style.display,'flex');assert(c.certModalCtxAtual);
  assert.equal(efeitos.aberturas.length,0);assert.equal(efeitos.patches.length,0);assert.equal(efeitos.emissoes.length,0);
  assert.match(els.certModalStatusMsg.textContent,/preencha o conteúdo/);assert.equal(efeitos.foco,3);
 });
 test(fonte+': catálogo, sessão e edição preenchidos aparecem no documento com texto escapado',async()=>{
  const {c,ctx,cat,efeitos}=ambiente(fonte);cat.conteudo_programatico='1. Programa fictício do catálogo';
  await c.gerarCertificadoIndividual('FIX1',ctx);assert.match(efeitos.aberturas[0],/Programa fictício do catálogo/);
  ctx.campos.conteudo_programatico_custom='2. Programa fictício da sessão';await c.gerarCertificadosTurma(ctx);assert.match(efeitos.aberturas[1],/Programa fictício da sessão/);
  await c.gerarCertificadoIndividual('FIX1',ctx,{conteudoProgramatico:'3. Conteúdo digitado <script>não executar</script>'});
  assert.match(efeitos.aberturas[2],/Conteúdo digitado &lt;script&gt;/);
  assert.match(efeitos.aberturas[2],/Conteúdo Programático Ministrado/);
 });
 test(fonte+': kits sem certificado continuam emitindo lista mesmo sem programa cadastrado',async()=>{
  const {c,ctx,efeitos}=ambiente(fonte);c.obterDocumentosMarcadosNoKit=()=>({lista:true,certificado:false});
  await c.gerarKitCompletoIntegracao('FIX1',ctx);await c.gerarKitCompletoTurmaKits();
  assert.equal(efeitos.aberturas.length,2);assert.equal(efeitos.alertas.length,0);
 });
}
