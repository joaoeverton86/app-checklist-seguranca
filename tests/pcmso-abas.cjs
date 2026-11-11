const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),espree=require('espree');
const paths=['dashboard/dashboard.js','dashboard/modules/saude_psicossocial.js'];
const tabs=['visao','aso','atestado','pressao','previsao','recomendacoes','consulta-mensal','relatorio'];
for(const path of paths) {
 const source=fs.readFileSync(path,'utf8');
 const ast=espree.parse(source,{ecmaVersion:2022,range:true});
 const get=nome=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===nome);return source.slice(...n.range);};
 const elementos={}; let mensal=0,recomendacoes=0;
 for(const t of tabs){elementos['saudeSubtab-'+t]={style:{}};elementos['saudeSubtabBtn-'+t]={classList:{toggle:(_,valor)=>{elementos['saudeSubtabBtn-'+t].ativo=valor;}}};}
 const c={document:{getElementById:id=>elementos[id]},popularSaudeColabDatalists:()=>{},renderConsultaMensalPcmso:()=>mensal++,renderRecomendacaoPsicossocial:()=>recomendacoes++};
 vm.createContext(c);vm.runInContext(get('showSaudeSubtab'),c);
 c.showSaudeSubtab('consulta-mensal'); assert.equal(mensal,1);assert.equal(elementos['saudeSubtab-consulta-mensal'].style.display,'block');assert.equal(elementos['saudeSubtab-recomendacoes'].style.display,'none');
 c.showSaudeSubtab('recomendacoes');assert.equal(recomendacoes,1);assert.equal(elementos['saudeSubtab-consulta-mensal'].style.display,'none');assert.equal(elementos['saudeSubtabBtn-consulta-mensal'].ativo,false);
 assert.doesNotMatch(get('renderRecomendacaoPsicossocial'),/renderConsultaMensalPcmso\(/);
 assert.match(get('salvarAso'),/data_exame: data/);
}
const html=fs.readFileSync('dashboard/index.html','utf8');assert.equal((html.match(/id="consultaMensalPcmso"/g)||[]).length,1);
console.log('Aba mensal independente: navegação e ocultação aprovadas nos dois arquivos; contêiner único.');
