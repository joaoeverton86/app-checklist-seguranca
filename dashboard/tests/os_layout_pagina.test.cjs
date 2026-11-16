const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nomes=['os-layout-confortavel','os-layout-intermediario','os-layout-compacto'];
const fontes=['dashboard/dashboard.js','dashboard/modules/treinamentos_ddsma.js'];
const extrair=s=>s.match(/function ajustarLayoutOsParaUmaPagina\([^]*?\n\}/)[0];
function ambiente(src,alturas,loading=false,expandido=0){
 const eventos={},classes=new Set(['folha-os']),folha={style:{removeProperty:()=>{},setProperty:()=>{}},children:[],classList:{contains:c=>classes.has(c),add:(...cs)=>cs.forEach(c=>classes.add(c)),remove:(...cs)=>cs.forEach(c=>classes.delete(c))},
  getBoundingClientRect:()=>({height:expandido&&classes.has('os-layout-distribuido')?expandido:(alturas[nomes.find(n=>classes.has(n))]??2000)}),
  ownerDocument:{readyState:loading?'loading':'complete',addEventListener:(n,f)=>eventos[n]=f,defaultView:{addEventListener:(n,f)=>eventos[n]=f}}};
 const c=vm.createContext({});vm.runInContext(extrair(src),c);c.ajustarLayoutOsParaUmaPagina(folha);return{eventos,classes,folha};
}
for(const arquivo of fontes){const src=fs.readFileSync(arquivo,'utf8');
 test(arquivo+': escolhe confortável quando cabe e distribui a altura',()=>{const {classes}=ambiente(src,{[nomes[0]]:850});assert(classes.has(nomes[0]));assert(classes.has('os-layout-distribuido'));});
 test(arquivo+': usa intermediário ou compacto somente quando necessário',()=>{for(const alvo of [1,2]){const alturas=Object.fromEntries(nomes.map((n,i)=>[n,i<alvo?1300:1030]));const {classes}=ambiente(src,alturas);assert(classes.has(nomes[alvo]));assert(classes.has('os-layout-distribuido'));}});
 test(arquivo+': excesso real preserva fluxo e não força altura ou oculta texto',()=>{const {classes}=ambiente(src,Object.fromEntries(nomes.map(n=>[n,1800])));assert(classes.has(nomes[2]));assert(!classes.has('os-layout-distribuido'));});
 test(arquivo+': cancela distribuição se o espaçamento acrescido ultrapassar a altura segura',()=>{const {classes}=ambiente(src,{[nomes[0]]:850},false,1100);assert(classes.has(nomes[0]));assert(!classes.has('os-layout-distribuido'));});
 test(arquivo+': espera DOM e reavalia cada impressão após alteração de conteúdo',()=>{const alturas={[nomes[0]]:850,[nomes[1]]:950,[nomes[2]]:1000};const {classes,eventos}=ambiente(src,alturas,true);assert(!classes.has(nomes[0]));eventos.DOMContentLoaded();assert(classes.has(nomes[0]));alturas[nomes[0]]=1300;eventos.beforeprint();assert(classes.has(nomes[1]));});
 test(arquivo+': gerador incorpora o ajuste dentro de cada OS, inclusive em lote/kit',()=>{const construtor=src.match(/function construirFolhaOrdemServico\([^]*?\n\}/)[0];assert.match(construtor,/os-layout-ajustavel/);assert.match(construtor,/ajustarLayoutOsParaUmaPagina\.toString\(\)/);assert.match(src,/alturaUtil = Math.floor\(277/);assert.doesNotMatch(src.match(/\.folha-os\.os-layout-distribuido[^}]*\}/)[0],/overflow|clip|max-height/);});
}
test('helper idêntico nas duas cópias',()=>assert.equal(...fontes.map(p=>extrair(fs.readFileSync(p,'utf8')))));
