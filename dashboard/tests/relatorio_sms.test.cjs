const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('dashboard/modules/relatorio_sms_nc.js', 'utf8');
function func(nome) {
 const inicio = src.indexOf('function ' + nome + '(');
 const fim = src.indexOf('\nfunction ', inicio + 1);
 return src.slice(inicio, fim < 0 ? undefined : fim);
}
function contexto() {
 const coletor = func('coletarDadosCompletosRelatorioMensalSms');
 const c = { Date, console, Number, Math, Map, Set, NOMES_MESES: Array(12).fill('Outubro'), NIVEIS_RISCO_ORDEM: [],
  parseLocalDate: x => new Date(String(x).slice(0,10) + 'T12:00:00'), toISODateLocal: d => d.toISOString().slice(0,10),
  headcountAsOf: () => 0, semanasUteisDoMes: () => [1,2,3,4], hhtDiasTrabalhadosMap: {},
  colaboradorEstaAtivo: () => true, todosRiscosGhe: () => [], diasSemAcidente: () => 0,
  montarLinhasRelatorioMensal: () => ({totais:{hht:{geral:0,dds:0},participantes:{geral:0}},categorias:[]}), montarQuadrosMaoDeObra: () => ({}), coletarDadosMeioAmbienteRelSms: () => ({}), coletarDadosFase4RelSms: () => ({}),
  fmtPct: x => String(x), statusApr: () => ({}), nivelRiscoApr: () => ({}), calcularStatusAsoColaborador: () => ({status:'sem_registro'}) };
 for (const nome of new Set(coletor.match(/\ball[A-Z]\w*/g))) c[nome] = [];
 vm.createContext(c);
 for(const nome of ['relSmsHhtCompetencia','relSmsPercentual','relSmsDiasAtestadoNaCompetencia','coletarDadosCompletosRelatorioMensalSms']) vm.runInContext(func(nome), c);
 return c;
}
test('mês vazio não presume conformidade, inspeção ou HHT atual', () => {
 const c=contexto(), d=c.coletarDadosCompletosRelatorioMensalSms(9,2026);
 assert.equal(d.checklists.taxaConformidade,null); assert.equal(d.extintores.inspecionados,0);
 assert.equal(d.extintores.totalAtivos,0); assert.equal(d.extintores.percConformidade,null);
 assert.equal(d.hht.hhtMes,0); assert.match(d.kpisRapidos.checklistsConformePct,/Sem base/);
});
test('resultado clínico ausente ou desconhecido permanece separado de aptos', () => {
 const c=contexto();c.allAsoExames=[null,'','pendente','apto','inapto','apto com restrição'].map(resultado=>({data_exame:'2026-10-10',resultado}));
 const d=c.coletarDadosCompletosRelatorioMensalSms(9,2026);
 assert.equal(d.saude.aptos,1);assert.equal(d.saude.inaptos,1);assert.equal(d.saude.restricoes,1);assert.equal(d.saude.semResultado,3);
});
test('atestados: mês/ano, bissexto, duração, sobreposição e intervalo ausente', () => {
 const c=contexto(), dias=c.relSmsDiasAtestadoNaCompetencia;
 assert.equal(dias({data_inicio:'2026-09-30',data_fim:'2026-10-02'},9,2026),2);
 assert.equal(dias({data_inicio:'2026-10-30',dias_afastamento:5},9,2026),2);
 assert.equal(dias({data_inicio:'2026-12-31',dias_afastamento:3},0,2027),2);
 assert.equal(dias({data_inicio:'2024-02-28',dias_afastamento:3},1,2024),2);
 assert.equal(dias({data_inicio:'2026-10-01'},9,2026),null);
 c.allAtestadosOcupacionais=[{data_inicio:'2026-09-30',data_fim:'2026-10-02'},{data_inicio:'2026-10-01',dias_afastamento:2}];
 assert.equal(c.coletarDadosCompletosRelatorioMensalSms(9,2026).saude.diasAfastamento,4);
});
test('HHT: zero explícito, estimativa mensal e soma anual usam mesma regra', () => {
 const c=contexto();c.headcountAsOf=()=>10;c.hhtDiasTrabalhadosMap={'2026-01':{dias_trabalhados:0,horas_por_dia:8},'2026-02':{dias_trabalhados:10,horas_por_dia:6}};
 assert.equal(c.relSmsHhtCompetencia(2026,0).valor,0);assert.equal(c.relSmsHhtCompetencia(2026,0).estimado,false);
 const d=c.coletarDadosCompletosRelatorioMensalSms(2,2026);
 assert.equal(d.hht.hhtMes,1600);assert.equal(d.hht.hhtAcumuladoAno,2200);assert.equal(d.hht.hhtEstimado,true);
});
test('HTML completo: base vazia e modo executivo ocultam atrasos sem declarar zero', () => {
 const c=contexto(); c.document={getElementById:()=>null};c.escapeHTML=x=>String(x ?? '');
 c.gerarBarraCabecalhoInstitucionalRelSmsHtml=()=>'';c.gerarCabecalhoPadraoRelSmsHtml=()=>'<header>AMOSTRA DE TESTE</header>';
 for(const n of ['gerarGraficoBarrasRiscosSVG','gerarGraficoBarrasHHTSVG','gerarGraficoDonutADASVG','gerarGraficoStatusASOSVG']) c[n]=()=>'';c.EMPRESA_INFO={};c.r2=x=>Number(x||0).toFixed(2);c.montarQuadrosMaoDeObra=()=>({linhasQuadro2:[],totalFuncionarios:0,pctAda:0,totalAda:0});c.obterLogoCopBase64RelSms=()=>'';c.formatSimpleDate=x=>x || '—';c.RESIDUO_KG_POR_EPI=0.5;c.RESIDUO_KG_POR_QUENTINHA=0.0239;c.RESIDUO_KG_POR_COPO=0.0018;
 c.coletarDadosMeioAmbienteRelSms=()=>({linhaResiduos:{pesoKg:0},residuosConfirmados:false,manutRegistrosMes:0});
 c.montarLinhasRelatorioMensal=()=>({totais:{percHhtEfetivo:0,hht:{geral:0,dds:0,integracao:0,seguranca:0,adicionais:0},participantes:{geral:0,dds:0,integracao:0,seguranca:0,adicionais:0}},categorias:[]});
 for(const n of ['sanitizarCelulaTabelaRelSms','relSmsTabelaGenericaHtml','construirHtmlDossieOficialRelSms'])vm.runInContext(func(n),c);
 const d=c.coletarDadosCompletosRelatorioMensalSms(9,2026);d.pgr.atrasadas=7;
 const html=c.construirHtmlDossieOficialRelSms(d,true);
 assert(!html.includes('Ações em Atraso frente ao Cronograma'));
 assert(!html.includes('null%'));assert(!html.includes('undefined'));
 assert(html.includes('Sem base de cálculo'));assert(!html.includes('37/37'));
});
