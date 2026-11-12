const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),espree=require('espree');
const fonte=fs.readFileSync('dashboard/dashboard.js','utf8'),ast=espree.parse(fonte,{ecmaVersion:2022,range:true});
const nomes=['limparSessoesApiAnexos','fetchApiAnexos','realizarLogoutDashboard','fazerUploadArquivoAoGoogleDrive'];
const funcoes=nomes.map(nome=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===nome);assert.ok(n,nome);return fonte.slice(...n.range);}).join('\n');
const upload='https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture';
function ambiente() {
    const s={uid:'UID-A',auth:true,podePublico:true,confirmar:true,prompts:0,chamadas:[],status:200,rede:false,appsScript:0};
    const c=vm.createContext({Map,Headers,Response,Date,console:{warn(){},error(){}},SUPABASE_KEY:'fixture',
        sessoesApiAnexos:new Map(),sessaoApiAnexosUid:null,versaoSessaoApiAnexos:0,
        sbAuth:{auth:{getUser:async()=>{if(s.authErro)throw Error('Auth indisponível');return{data:{user:s.auth?{id:s.uid}:null},error:s.auth?null:{name:'AuthSessionMissingError'}};},
            getSession:async()=>({data:{session:s.auth?{access_token:'token-'+s.uid,user:{id:s.uid}}:null}}),signOut:async()=>{s.auth=false;}}},
        confirm:()=>{s.prompts++;return s.confirmar;},localStorage:{removeItem(){}},pararAutoRefresh(){},aplicarVisibilidadeLoginDashboard(){},
        getDriveRootFolder:()=> 'Checklists SST',formatarPastaMesChecklist:()=> '11 - NOVEMBRO',
        getDriveScriptUrl:()=>{s.appsScript++;return 'https://apps-script.fixture.invalid';},fileToBase64:async()=> 'AQ==',
        fetch:async(url,op)=>{
            s.chamadas.push({url,headers:op.headers,body:op.body});if(s.espera)await s.espera;
            if(s.rede)throw Error('Conexão perdida');if(s.status!==200)return Response.json({erro:'Operação recusada'},{status:s.status});
            if(url==='/api/anexo-iniciar')return Response.json({uploadUrl:upload,sessionTicket:'ticket-assinado',compartilhamentoPublicoPermitido:s.podePublico});
            if(url==='/api/anexo-enviar-pedaco')return Response.json({completo:true,id:'ARQUIVO-A'});
            return Response.json({ok:true});
        }
    });
    vm.runInContext(funcoes,c);return {s,c};
}
async function enviar(c) {
    await c.fetchApiAnexos('/api/anexo-iniciar',{method:'POST',body:'{}'});
    await c.fetchApiAnexos('/api/anexo-enviar-pedaco',{method:'POST',body:JSON.stringify({uploadUrl:upload,chunkBase64:'AQ==',offset:0,tamanhoTotal:1})});
}
test('pastas usam a API fixa autenticada e recusam URL externa sem transmitir token',async()=>{
    const {c,s}=ambiente();
    await c.fetchApiAnexos('/api/pastas-drive',{method:'POST',body:JSON.stringify({action:'diagnostico'})});
    assert.equal(s.chamadas.length,1);
    assert.equal(s.chamadas[0].headers.get('Authorization'),'Bearer token-UID-A');
    await assert.rejects(()=>c.fetchApiAnexos('https://attacker.invalid/pastas-drive'),/Destino/);
    assert.equal(s.chamadas.length,1);
    assert.equal(s.appsScript,0);
});
test('Auth ausente ou em erro não chama API e limpa tickets antigos',async()=>{
    for(const modo of ['ausente','erro']) {const {c,s}=ambiente();c.sessoesApiAnexos.set('antigo',{});s.auth=modo!=='ausente';s.authErro=modo==='erro';
        await assert.rejects(c.fetchApiAnexos('/api/anexo-iniciar'),e=>e.bloquearFallback===true);assert.equal(s.chamadas.length,0);assert.equal(c.sessoesApiAnexos.size,0);}
});
test('envio transmite identidade e ticket sem persistência no armazenamento',async()=>{
    const {c,s}=ambiente();await enviar(c);const pedido=s.chamadas[1];
    assert.equal(pedido.headers.get('Authorization'),'Bearer token-UID-A');assert.equal(pedido.headers.get('apikey'),'fixture');assert.equal(JSON.parse(pedido.body).sessionTicket,'ticket-assinado');
    assert.ok(c.sessoesApiAnexos.has('UID-A:id:ARQUIVO-A'));
});
test('Saúde permanece restrita sem prompt ou POST de compartilhamento',async()=>{
    const {c,s}=ambiente();s.podePublico=false;await enviar(c);const r=await c.fetchApiAnexos('/api/anexo-finalizar',{method:'POST',body:'{"driveFileId":"ARQUIVO-A"}'});
    assert.equal((await r.json()).restrito,true);assert.equal(s.prompts,0);assert.equal(s.chamadas.length,2);
});
test('cancelar compartilhamento preserva privado; confirmar envia decisão explícita',async()=>{
    for(const confirmar of [false,true]) {const {c,s}=ambiente();await enviar(c);s.confirmar=confirmar;
        const r=await c.fetchApiAnexos('/api/anexo-finalizar',{method:'POST',body:'{"driveFileId":"ARQUIVO-A"}'});assert.equal(r.status,200);assert.equal(s.prompts,1);
        assert.equal(s.chamadas.length,confirmar?3:2);if(confirmar){const body=JSON.parse(s.chamadas[2].body);assert.equal(body.confirmarCompartilhamento,true);assert.equal(body.sessionTicket,'ticket-assinado');}}
});
test('troca de conta não reutiliza ticket ou arquivo da conta anterior',async()=>{
    const {c,s}=ambiente();await enviar(c);s.uid='UID-B';
    await assert.rejects(c.fetchApiAnexos('/api/anexo-finalizar',{method:'POST',body:'{"driveFileId":"ARQUIVO-A"}'}));assert.equal(s.chamadas.length,2);assert.equal(c.sessoesApiAnexos.size,0);
});
test('logout confirmado limpa tickets mesmo antes da conclusão do signOut',async()=>{
    const {c,s}=ambiente();await enviar(c);await c.realizarLogoutDashboard();assert.equal(c.sessoesApiAnexos.size,0);assert.equal(c.sessaoApiAnexosUid,null);assert.equal(s.auth,false);
});
test('resposta atrasada após logout não repovoa o cache e não repete requisição',async()=>{
    const {c,s}=ambiente();let liberar;s.espera=new Promise(r=>liberar=r);
    const pedido=c.fetchApiAnexos('/api/anexo-iniciar',{method:'POST',body:'{}'});
    while(!s.chamadas.length)await new Promise(r=>setImmediate(r));
    await c.realizarLogoutDashboard();liberar();await assert.rejects(pedido,e=>e.bloquearFallback===true);assert.equal(c.sessoesApiAnexos.size,0);assert.equal(s.chamadas.length,1);
});
test('negação, falha HTTP e transporte não contornam a API por Apps Script',async()=>{
    for(const modo of [401,403,500,'rede','auth']) {
        const {c,s}=ambiente();s.status=typeof modo==='number'?modo:200;s.rede=modo==='rede';s.authErro=modo==='auth';
        await assert.rejects(c.fazerUploadArquivoAoGoogleDrive({name:'fixture.pdf',type:'application/pdf'},{dataIso:'2026-11-12'}),e=>e.bloquearFallback===true);
        assert.equal(s.appsScript,0);assert.ok(s.chamadas.length<=1);
    }
});
test('destino externo não recebe Bearer e sessão desconhecida não é enviada',async()=>{
    const {c,s}=ambiente();await assert.rejects(c.fetchApiAnexos('https://example.invalid/api/anexo-iniciar'));
    await assert.rejects(c.fetchApiAnexos('/api/anexo-enviar-pedaco',{method:'POST',body:JSON.stringify({uploadUrl:upload})}));assert.equal(s.chamadas.length,0);
});
