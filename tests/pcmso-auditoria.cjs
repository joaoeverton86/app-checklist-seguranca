const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('dashboard/dashboard.js', 'utf8');
const blocos = [...source.matchAll(/if \(idx >= 0\) \{\s*examesDetalhe\[idx\] = \{ \.\.\.examesDetalhe\[idx\], \.\.\.itemExame \};\s*\} else \{\s*examesDetalhe\.push\(itemExame\);\s*\}/g)];
assert.equal(blocos.length, 4, 'Quatro pontos devem atualizar índice existente');
for (const [bloco] of blocos) {
 const itens = [{nome:'Exame fictício', data_exame:'2026-10-01', campo_legado:'preservado'}, {nome:'Outro exame'}];
 const c = {idx:0, examesDetalhe:itens, itemExame:{nome:'Exame fictício',data_exame:'2026-11-01'}};
 vm.runInNewContext(bloco, c); vm.runInNewContext(bloco,c);
 assert.equal(itens.length,2); assert.equal(itens[0].data_exame,'2026-11-01'); assert.equal(itens[0].campo_legado,'preservado'); assert.equal(itens[1].nome,'Outro exame');
 c.idx=-1; vm.runInNewContext(bloco,c); assert.equal(itens.length,3);
}
const elementos = {modalRegistrarPsicoRapido:{_opcoesExamePcmso:[{id:'complementar',nomeExame:'Hemograma',profissionalPadrao:'Laboratório'},{id:'psicossocial',nomeExame:'Avaliação Psicossocial'}],querySelector:()=>elementos.titulo},titulo:{},modalPsico_profissional:{},modalPsico_obs:{},modalPsico_statusMsg:{}};
const contexto = {document:{getElementById:id=>elementos[id] || null}};
vm.createContext(contexto);
vm.runInContext(source.slice(source.indexOf('function selecionarExameRegistroPcmso'),source.indexOf('function abrirModalRegistrarPsicoRapido')),contexto);
contexto.selecionarExameRegistroPcmso('0'); assert.equal(elementos.modalRegistrarPsicoRapido._examePcmso.nomeExame,'Hemograma'); assert.equal(elementos.titulo.textContent,'Registrar Hemograma');
contexto.selecionarExameRegistroPcmso('1'); assert.equal(elementos.modalRegistrarPsicoRapido._examePcmso.id,'psicossocial');
contexto.selecionarExameRegistroPcmso(''); assert.equal(elementos.modalRegistrarPsicoRapido._examePcmso,null);
let abriu=0, focou=0;
contexto.obterCapacidadeMutiraoPsico=()=>null; contexto.abrirModalReprogramarDataMutirao=()=>abriu++;
elementos.reprogPsico_vagas={focus:()=>focou++};
vm.runInContext(source.slice(source.indexOf('function selecionarPrimeirosPendentesPsico'),source.indexOf('function limparSelecaoConvocacaoPsicoMain')),contexto);
contexto.selecionarPrimeirosPendentesPsico(); assert.equal(abriu,1);assert.equal(focou,1);
elementos.psicoBannerMutiraoContainer={};contexto.obterDataMutiraoPsico=()=>'';contexto.pcmsoDataValida=()=>false;
vm.runInContext(source.slice(source.indexOf('function renderBannerMutiraoPsico'),source.indexOf('function renderTextoGruposObrigatoriosPsico')),contexto);
contexto.renderBannerMutiraoPsico();
assert.match(elementos.psicoBannerMutiraoContainer.innerHTML,/abrirModalReprogramarDataMutirao/);assert.match(elementos.psicoBannerMutiraoContainer.innerHTML,/abrirModalBaixaLoteMutirao/);
assert.doesNotMatch(source.slice(source.indexOf('function abrirModalPsicossocial'),source.indexOf('function selecionarExameRegistroPcmso')),/\bprompt\(/);
console.log('Auditoria PCMSO: quatro atualizações idempotentes, seleção visual, convite à configuração e ações do banner aprovados em simulação local.');
