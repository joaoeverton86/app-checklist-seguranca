const {test}=require('node:test');const assert=require('node:assert/strict');
const modulo=import(require('node:url').pathToFileURL(require('node:path').resolve('api/cronograma-pastas.js')).href);
function ambiente(){
 const oldFetch=global.fetch;const keys=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GOOGLE_DRIVE_FOTOS_ROOT_ID','SUPABASE_URL','SUPABASE_ANON_KEY'];const antigo=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{GOOGLE_CLIENT_ID:'fake',GOOGLE_CLIENT_SECRET:'fake',GOOGLE_REFRESH_TOKEN:'fake',GOOGLE_DRIVE_FOTOS_ROOT_ID:'root_123456789',SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'fake'});
 const state={write:0,driveWrites:0,readOnly:false,fora:false,ids:0,fail:false,concessao:{versao:1,admin:true},confirmado:true,anonimo:false,inativo:false,duplicado:false,perfil:null,googleCalls:0,reservas:new Map(),pastas:new Map(),rows:[{id:'dds1',data:'2026-10-06',tema:'IgE - Abelhas'}]};
 const resposta=(status,obj)=>({ok:status>=200&&status<300,status,json:async()=>obj});
 global.fetch=async(url,op={})=>{
  assert.equal(op.redirect,'error','Chamadas credenciadas não devem seguir redirecionamentos');
  const u=new URL(String(url)),p=u.pathname;const body=op.body&&typeof op.body==='string'?JSON.parse(op.body):null;
  if(p==='/auth/v1/user')return resposta(200,{id:'u1',email:'fixture@example.invalid',email_confirmed_at:state.confirmado?'2026-11-01':null,is_anonymous:state.anonimo,app_metadata:{anexos:state.concessao},user_metadata:{anexos:{versao:1,admin:true}}});
  if(p.includes('painel_usuarios'))return resposta(200,state.perfil?[state.perfil]:[]);
  if(p.includes('colaboradores_checklist')){const interno={id:'76',matricula:'76',nivel_acesso:'Admin',ativo:!state.inativo};return resposta(200,state.readOnly?[]:state.duplicado?[interno,{...interno,id:'77'}]:[interno]);}
  if(p.includes('dds_temas_cronograma'))return resposta(200,state.rows);
  if(p.includes('treinamentos_cronograma'))return resposta(200,state.rows.map(r=>({...r,data_prevista:r.data,treinamento_cod:'t1'})));
  if(p.includes('treinamentos_catalogo'))return resposta(200,[{id:'t1',nome:'IgE - Abelhas'}]);
  if(p.includes('configuracoes_sistema')){
   if(op.method==='POST'){state.write++;if(state.reservas.has(body.id))return resposta(409,{});state.reservas.set(body.id,body);return resposta(201,{});}
   const id=u.searchParams.get('id').slice(3);return resposta(200,state.reservas.has(id)?[state.reservas.get(id)]:[]);
  }
  if(u.hostname==='oauth2.googleapis.com'){state.googleCalls++;return resposta(200,{access_token:'fake'});}
  if(p.endsWith('/files/generateIds'))return resposta(200,{ids:['generated_id_'+(++state.ids)]});
  if(p.endsWith('/files/month_123456789'))return resposta(200,{id:'month_123456789',name:'10_OUTUBRO_2026',mimeType:'application/vnd.google-apps.folder',parents:state.fora?[]:['root_123456789']});
  if(p.endsWith('/files')&&op.method==='POST'){
   if(state.fail){state.fail=false;return resposta(503,{});}state.driveWrites++;
   if(state.pastas.has(body.id))return resposta(409,{});state.pastas.set(body.id,body);return resposta(200,{id:body.id});
  }
  if(p.endsWith('/files'))return resposta(200,{files:[...state.pastas.values()]});
  if(p.includes('/files/generated_id_'))return state.pastas.has(p.split('/').at(-1))?resposta(200,state.pastas.get(p.split('/').at(-1))):resposta(404,{});
  throw Error('Requisição não simulada: '+u.hostname+p);
 };
 return {state,restaurar:()=>{global.fetch=oldFetch;for(const k of keys){if(antigo[k]===undefined)delete process.env[k];else process.env[k]=antigo[k];}}};
}
async function chamar(body={},headers={authorization:'Bearer fake'}){const {default:handler}=await modulo;const r={setHeader(){},status(n){this.codigo=n;return this;},json(obj){this.body=obj;return this;}};await handler({method:'POST',headers,body:{mes:9,ano:2026,fonte:'ddsma',pastaId:'month_123456789',...body}},r);return r;}
test('prévia não grava; criação repete sem duplicar e mantém calendário',async()=>{const a=ambiente();try{const p=await chamar();assert.equal(p.codigo,200);assert.equal(p.body.itens[0].nome,'06.10.2026 — IgE - Abelhas');assert.equal(a.state.write,0);assert.equal(a.state.driveWrites,0);const r=await chamar({confirmar:true,assinatura:p.body.assinatura});assert.equal(r.codigo,200);assert.equal(a.state.driveWrites,1);const p2=await chamar();assert.equal(p2.body.itens[0].situacao,'existente');await chamar({confirmar:true,assinatura:p2.body.assinatura});assert.equal(a.state.driveWrites,1);assert.equal(a.state.rows[0].status,undefined);}finally{a.restaurar();}});
test('bloqueia conta sem autenticação, perfil somente leitura e pasta fora da raiz',async()=>{const a=ambiente();try{assert.equal((await chamar({},{})).codigo,401);a.state.readOnly=true;assert.equal((await chamar()).codigo,403);a.state.readOnly=false;a.state.fora=true;assert.equal((await chamar()).codigo,403);assert.equal(a.state.driveWrites,0);}finally{a.restaurar();}});
test('cronograma alterado exige nova prévia; formatos legados reutilizados',async()=>{const a=ambiente();try{const p=await chamar();a.state.rows[0].tema='Novo tema';assert.equal((await chamar({confirmar:true,assinatura:p.body.assinatura})).codigo,409);a.state.rows[0].tema='IgE - Abelhas';a.state.pastas.set('legado',{id:'legado',name:'06.10.2026 - IgE - Abelhas'});const r=await chamar();assert.equal(r.body.itens[0].id,'legado');assert.equal(a.state.driveWrites,0);}finally{a.restaurar();}});
test('falha parcial retoma usando a reserva do mesmo ID',async()=>{const a=ambiente();try{const p=await chamar();a.state.fail=true;assert.equal((await chamar({confirmar:true,assinatura:p.body.assinatura})).codigo,502);assert.equal(a.state.reservas.size,1);const r=await chamar({confirmar:true,assinatura:p.body.assinatura});assert.equal(r.codigo,200);assert.equal(a.state.ids,1);assert.equal(a.state.pastas.size,1);}finally{a.restaurar();}});
test('dois pedidos concorrentes compartilham a mesma reserva',async()=>{const a=ambiente();try{const p=await chamar();const [a1,a2]=await Promise.all([chamar({confirmar:true,assinatura:p.body.assinatura}),chamar({confirmar:true,assinatura:p.body.assinatura})]);assert.equal(a1.codigo,200);assert.equal(a2.codigo,200);assert.equal(a.state.pastas.size,1);assert.equal(a.state.reservas.size,1);}finally{a.restaurar();}});
test('treinamentos agrupa turmas do mesmo tema/data, ignora cancelados',async()=>{const a=ambiente();try{a.state.rows.push({...a.state.rows[0],id:'dds2'},{id:'cancelado',data:'2026-10-07',tema:'Cancelado',status:'cancelado'});const p=await chamar({fonte:'treinamentos'});assert.equal(p.codigo,200);assert.equal(p.body.itens.length,1);assert.equal(p.body.itens[0].eventos.length,2);}finally{a.restaurar();}});
test('duplicidade prévia e competência inválida bloqueiam sem criar pastas',async()=>{const a=ambiente();try{assert.equal((await chamar({mes:12})).codigo,400);a.state.pastas.set('pasta1',{id:'pasta1',name:'06.10.2026 — IgE - Abelhas'});a.state.pastas.set('pasta2',{id:'pasta2',name:'06.10.2026 - IgE - Abelhas'});assert.equal((await chamar()).codigo,409);assert.equal(a.state.driveWrites,0);}finally{a.restaurar();}});

test('Admin legado e user_metadata não autorizam sem concessão protegida',async()=>{
 const a=ambiente();try{a.state.concessao=null;assert.equal((await chamar()).codigo,403);assert.equal((await chamar({confirmar:true,assinatura:'forjada'})).codigo,403);assert.equal(a.state.googleCalls,0);assert.equal(a.state.write,0);assert.equal(a.state.driveWrites,0);}finally{a.restaurar();}
});
test('e-mail pendente e conta anônima são recusados antes do Google',async()=>{
 const a=ambiente();try{a.state.confirmado=false;assert.equal((await chamar()).codigo,401);a.state.confirmado=true;a.state.anonimo=true;assert.equal((await chamar()).codigo,401);assert.equal(a.state.googleCalls,0);}finally{a.restaurar();}
});
test('Saúde não recebe criação de pastas de outros módulos',async()=>{
 const a=ambiente();try{a.state.concessao={versao:1,saude:true};assert.equal((await chamar()).codigo,403);assert.equal(a.state.googleCalls,0);}finally{a.restaurar();}
});
test('concessão de leitura não vira edição por linha Admin',async()=>{
 const a=ambiente();try{a.state.concessao={versao:1,ver_todos:true};assert.equal((await chamar()).codigo,403);assert.equal(a.state.googleCalls,0);}finally{a.restaurar();}
});
test('vínculo desativado ou ambíguo restringe mesmo concessão administrativa',async()=>{
 const a=ambiente();try{a.state.inativo=true;assert.equal((await chamar()).codigo,403);a.state.inativo=false;a.state.duplicado=true;assert.equal((await chamar()).codigo,403);assert.equal(a.state.googleCalls,0);}finally{a.restaurar();}
});
test('revogação depois da prévia bloqueia confirmação sem reserva ou pasta',async()=>{
 const a=ambiente();try{const p=await chamar();assert.equal(p.codigo,200);const chamadas=a.state.googleCalls;a.state.concessao=null;assert.equal((await chamar({confirmar:true,assinatura:p.body.assinatura})).codigo,403);assert.equal(a.state.googleCalls,chamadas);assert.equal(a.state.write,0);assert.equal(a.state.driveWrites,0);}finally{a.restaurar();}
});
test('editor autorizado usa somente o calendário concedido',async()=>{
 const a=ambiente();try{a.state.concessao={versao:1,modulos:['ddsma'],modulos_edicao:['ddsma']};a.state.perfil={ativo:true,perfil_id:'editor_ddsma',painel_perfis:{ativo:true,modulos:['ddsma'],modulos_edicao:['ddsma']}};assert.equal((await chamar()).codigo,200);const chamadas=a.state.googleCalls;assert.equal((await chamar({fonte:'treinamentos'})).codigo,403);assert.equal(a.state.googleCalls,chamadas);}finally{a.restaurar();}
});
