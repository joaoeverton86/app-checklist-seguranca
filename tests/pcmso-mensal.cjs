const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('dashboard/dashboard.js', 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function pcmsoDataValida'), source.indexOf('function renderConsultaMensalPcmso')), context);
const exame = (nome, data, extra = {}) => ({ nome, data_exame: data, ...extra });
const registro = (matricula, exames_detalhe, extra = {}) => ({ matricula, exames_detalhe, ...extra });
const dados = [
 registro('ficticio-1', [exame('Hemograma', '2026-10-01'), exame('Glicose', '2026-10-31', {data_vencimento: '2026-11-30'})]),
 registro('ficticio-1', [exame('Hemograma', '2026-10-01')]),
 registro('ficticio-desligado', [exame('Hemograma', '2026-10-15')], {status: 'desligado'}),
 registro('ficticio-2', [exame('Hemograma', '2026-11-05', {status: 'agendado'})]),
 registro('ficticio-3', [exame('Hemograma', '2026-11-06', {status: 'cancelado'})]),
 registro('ficticio-4', [exame('Hemograma', '2026-11-07', {status: 'remarcado'})]),
 registro('ficticio-5', [exame('Hemograma', '2026-02-30')]),
 registro('ficticio-6', [exame('Hemograma', '')]),
 registro('ficticio-7', [])
];
let r = context.calcularConsultaMensalPcmso(dados, '2026-10', '');
assert.equal(r.pessoas, 2); assert.equal(r.realizados.length, 3);
r = context.calcularConsultaMensalPcmso(dados, '2026-10', 'glicose');
assert.equal(r.pessoas, 1); assert.equal(r.realizados.length, 1);
r = context.calcularConsultaMensalPcmso(dados, '2026-11', '', new Set(['ficticio-1']), '2026-11-10');
assert.equal(r.realizados.length, 0); assert.equal(r.pessoasPrevistas, 1);
assert.equal(context.calcularConsultaMensalPcmso(dados, '2027-01', '').pessoas, 0);
assert.equal(context.pcmsoDataValida('2026-02-30'), false);
assert.equal(source.includes("const registrarComoPsico = exameCfg.id === 'psicossocial'"), true);
assert.equal(source.includes('modal._examePcmso = ehMatriz ? null : { ...exameCfg }'), true);
console.log('PCMSO: contagens com dados fictícios aprovadas. Vínculo de exame conferido estaticamente; fluxo visual não testado.');
// Regressão: formato efetivamente gravado pelo formulário de ASO, sem data/resultado em cada item.
const asoLegado = [{matricula:'ficticio-legado',nome_colaborador:'Pessoa fictícia',tipo_aso:'periodico',data_exame:'2026-10-22',resultado:'apto',exames_detalhe:[
 {nome:'Hemograma',periodicidade:12,data_vencimento:'2027-10-22'},
 {nome:'Glicose',periodicidade:12,data_vencimento:'2027-10-22'},
 {nome:'Audiometria',periodicidade:12,data_vencimento:'2027-10-22'},
 {nome:'Acuidade visual',periodicidade:12,data_vencimento:'2027-10-22'}
]}];
r = context.calcularConsultaMensalPcmso(asoLegado, '2026-10', '');
assert.equal(r.pessoas, 1); assert.equal(r.realizados.length, 4); assert.equal(r.invalidos, 0);
assert.equal(context.calcularConsultaMensalPcmso(asoLegado, '2026-10', 'glicose').realizados.length, 1);
assert.equal(context.calcularConsultaMensalPcmso(asoLegado, '2026-11', '').pessoas, 0);
assert.equal(context.calcularConsultaMensalPcmso([{...asoLegado[0],status:'agendado'}], '2026-10', '').pessoas, 0);
assert.equal(context.calcularConsultaMensalPcmso([{...asoLegado[0],status:'cancelado'}], '2026-10', '').pessoas, 0);
assert.equal(context.calcularConsultaMensalPcmso([{...asoLegado[0],status:'remarcado'}], '2026-10', '').pessoas, 0);
assert.equal(context.calcularConsultaMensalPcmso([{...asoLegado[0],resultado:null}], '2026-10', '').pessoas, 0);
assert.equal(context.calcularConsultaMensalPcmso([{...asoLegado[0],exames_detalhe:[{nome:'Hemograma',data_exame:'2026-11-01'}]}], '2026-10', '').pessoas, 0);
console.log('Regressão ASO com realização no atendimento: 1 pessoa / 4 procedimentos; filtro específico e precedência da data individual aprovados.');
// Vencimentos operacionais: mesma regra de vínculo ativo usada pelo painel.
const espree = require('espree');
const ativoNode = espree.parse(source, {ecmaVersion:2022,range:true}).body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'colaboradorEstaAtivo');
vm.runInContext(source.slice(...ativoNode.range), context);
const efetivo = [
 {id:'ativo',status:'ATIVO'},
 {id:'demitido-com-status-antigo',status:'ATIVO',dt_demissao:'2026-07-29'},
 {id:'demitido',status:'DEMITIDO',dt_admissao:'2024-01-01'},
 {id:'inativo',status:'Inativo',dt_admissao:'2024-01-01'}
];
const vinculos = new Set(efetivo.filter(context.colaboradorEstaAtivo).map(e => String(e.id).trim()));
const historico = [...efetivo.map(e=>e.id),'sem-cadastro'].map(id => registro(id, [
 exame('Hemograma','2026-10-01',{data_vencimento:'2026-11-01'}),
 exame('Glicose','2026-10-01',{data_vencimento:'2026-11-01'})
]));
r = context.calcularConsultaMensalPcmso(historico, '2026-11','',vinculos,'2026-10-31');
assert.equal(r.pessoasPrevistas,1);assert.equal(r.previstos.length,2);
assert.equal(r.previstos.every(e=>e.matricula==='ativo'),true);
assert.equal(context.calcularConsultaMensalPcmso(historico,'2026-11','hemograma',vinculos,'2026-10-31').previstos.length,1);
r = context.calcularConsultaMensalPcmso(historico,'2026-10','',vinculos);
assert.equal(r.pessoas,5);assert.equal(r.realizados.length,10);
assert.equal(context.calcularConsultaMensalPcmso(historico,'2026-11','',new Set()).pessoasPrevistas,0);
assert.equal(context.calcularConsultaMensalPcmso(historico,'2026-11','').pessoasPrevistas,0);
console.log('Vencimentos: desligados/inativos/sem cadastro excluídos, inclusive status ATIVO com demissão; histórico preservado e pessoas distintas conferidas.');
// Regressão da tela: outubro já passou; novembro separa ontem, hoje e amanhã.
const datasLimite = [
 registro('ontem',[exame('Hemograma','2025-11-09',{data_vencimento:'2026-11-09'})]),
 registro('hoje',[exame('Hemograma','2025-11-10',{data_vencimento:'2026-11-10'})]),
 registro('amanha',[exame('Hemograma','2025-11-11',{data_vencimento:'2026-11-11'})]),
 registro('outubro',[exame('Hemograma','2025-10-02',{data_vencimento:'2026-10-02'})]),
 registro('renovado',[exame('Hemograma','2025-10-07',{data_vencimento:'2026-10-07'}),exame('Hemograma','2026-10-22',{data_vencimento:'2027-10-22'})])
];
const ativosLimite = new Set(datasLimite.map(a=>a.matricula));
r=context.calcularConsultaMensalPcmso(datasLimite,'2026-10','',ativosLimite,'2026-11-10');
assert.equal(r.pessoasVencidas,1);assert.equal(r.pessoasPrevistas,0);assert.equal(r.vencidos[0].matricula,'outubro');
r=context.calcularConsultaMensalPcmso(datasLimite,'2026-11','',ativosLimite,'2026-11-10');
assert.equal(r.pessoasVencidas,1);assert.equal(r.pessoasPrevistas,2);
assert.equal(r.vencidos[0].matricula,'ontem');
assert.equal(r.previstos.every(l=>l.data>='2026-11-10'),true);
assert.equal(r.vencidos.every(l=>l.data<'2026-11-10'),true);
const elementos = {consultaMensalPcmso:{dataset:{inicializado:'true'}},pcmsoTipo:{value:''},pcmsoPeriodo:{value:'2026-10'},pcmsoMensalResultado:{}};
context.document={getElementById:id=>elementos[id]};
context.allAsoExames=datasLimite;
context.allEfetivo=datasLimite.map(a=>({id:a.matricula,status:'ATIVO'}));
context.escapeHTML=v=>String(v);context.formatSimpleDate=v=>v;
const nativeDate=Date;
context.Date=class extends nativeDate {constructor(...args){super(...(args.length?args:['2026-11-10T15:00:00Z']));}};
vm.runInContext(source.slice(source.indexOf('function renderConsultaMensalPcmso')),context);
context.renderConsultaMensalPcmso();
assert.match(elementos.pcmsoMensalResultado.innerHTML,/Colaboradores ativos com exames vencidos: 1/);
assert.match(elementos.pcmsoMensalResultado.innerHTML,/Colaboradores ativos com exames a vencer \(inclui hoje\): 0/);
assert.match(elementos.pcmsoMensalResultado.innerHTML,/<th>Vencimento<\/th>/);
console.log('Classificação e HTML: outubro passado somente em vencidos; ontem/hoje/amanhã e renovação posterior aprovados com data fixa de São Paulo.');
