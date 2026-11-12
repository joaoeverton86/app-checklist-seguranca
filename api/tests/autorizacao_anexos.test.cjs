const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
Object.assign(process.env,{SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'fixture',GOOGLE_CLIENT_ID:'fixture',
    GOOGLE_CLIENT_SECRET:'segredo-ficticio',GOOGLE_REFRESH_TOKEN:'fixture',GOOGLE_DRIVE_FOTOS_ROOT_ID:'fotos_root_123'});
const uid='11111111-1111-4111-8111-111111111111',upload='https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture';
const mod=async p=>import(pathToFileURL(path.resolve(p)).href);
const headers={authorization:'Bearer fixture',apikey:'fixture'};
async function ambiente(t,tipo='admin') {
    const estado={tipo,uid,chamadas:[],metadata:null,metaPatch:{},semPastas:false,userPatch:{}};
    const anterior=global.fetch;t.after(()=>global.fetch=anterior);
    global.fetch=async(entrada,op={})=>{
        const u=new URL(String(entrada)),metodo=op.method||'GET';estado.chamadas.push({host:u.hostname,path:u.pathname,metodo,body:op.body,media:u.searchParams.get('alt')==='media'});
        if(u.hostname==='fixture.invalid') {
            if(u.pathname==='/auth/v1/user')return op.headers.Authorization==='Bearer expirado'?Response.json({erro:'inválido'},{status:401}):Response.json({id:estado.uid,email:'fixture@example.invalid',email_confirmed_at:'2026-01-01',
                app_metadata:{anexos:{versao:1,admin:estado.tipo==='admin',saude:estado.tipo==='saude',interno:estado.tipo==='tecnico',ver_todos:estado.tipo==='leitor',modulos:['treinamentos'],modulos_edicao:estado.tipo==='editor'?['treinamentos']:[]}},...estado.userPatch});
            if(u.pathname.includes('colaboradores_checklist'))return Response.json(['admin','saude','tecnico'].includes(estado.tipo)?[{id:estado.tipo==='admin'?'76':estado.tipo==='saude'?'98':'40',matricula:estado.tipo==='admin'?'76':estado.tipo==='saude'?'98':'40',nivel_acesso:estado.tipo==='admin'?'Admin':'Tecnico',ativo:true}]:[]);
            if(u.pathname.includes('painel_usuarios'))return Response.json(estado.tipo==='admin'||estado.tipo==='tecnico'?[]:[{ativo:estado.tipo!=='inativo',perfil_id:estado.tipo==='saude'?'modulo_saude':estado.tipo,
                painel_perfis:{ativo:estado.tipo!=='perfil_inativo',ver_todos:estado.tipo==='leitor'||estado.tipo==='saude',modulos:['treinamentos'],modulos_edicao:estado.tipo==='editor'?['treinamentos']:[]}}]);
            if(u.pathname.includes('anexos_sms'))return Response.json(estado.anexos||[]);
            throw Error('Consulta de banco inesperada');
        }
        if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'token-ficticio'});
        if(u.hostname==='lh3.googleusercontent.com')return new Response(null,{status:404});
        if(u.hostname!=='www.googleapis.com')throw Error('Destino não previsto na fixture');
        if(u.pathname.includes('/upload/')) {
            if(metodo==='POST'){estado.metadata=JSON.parse(op.body);return new Response(null,{status:200,headers:{location:upload}});}
            return Response.json({id:'arquivo_ficticio_123',webViewLink:'https://drive.google.com/file/d/arquivo_ficticio_123/view'});
        }
        if(u.pathname.endsWith('/permissions'))return metodo==='GET'?Response.json({permissions:estado.pastaPublica?[{type:'anyone'}]:[{type:'user'}]}):Response.json({id:'permissao_ficticia'});
        if(u.pathname.endsWith('/about'))return Response.json({user:{emailAddress:'fixture@example.invalid'}});
        if(u.pathname.endsWith('/files')) {
            if(metodo==='POST')return Response.json({id:'pasta_criada_123'});
            const q=u.searchParams.get('q')||'',nome=q.match(/name='([^']+)'/),pai=q.match(/and '([^']+)' in parents/);
            return Response.json({files:nome&&!estado.semPastas?[{id:'pasta_'+nome[1].replace(/\W/g,'_'),name:nome[1],parents:[pai?.[1]||'root']}]:[]});
        }
        const id=u.pathname.split('/').at(-1);
        if(id==='fora_123')return Response.json({id,name:'Fora',mimeType:'application/vnd.google-apps.folder',parents:[]});
        if(id==='arquivo_ficticio_123')return Response.json({id,mimeType:'application/pdf',parents:estado.metadata?.parents||['pasta_2026'],appProperties:estado.metadata?.appProperties||{},...estado.metaPatch});
        return Response.json({id,name:'Pasta',mimeType:'application/vnd.google-apps.folder',parents:[]});
    };
    const chamar=async(nome,body={},query={},h=headers)=>{
        const handler=(await mod('api/'+nome+'.js')).default;
        const r={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.codigo=n;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;},end(){}};
        await handler({method:['proxy-imagem','anexos-drive-listar'].includes(nome)?'GET':'POST',headers:h,body,query},r);return r;
    };
    const iniciar=async(tabela='acervo',extra={})=>chamar('anexo-iniciar',{tabela,nomeArquivo:'fixture.pdf',mimeType:'application/pdf',ano:'2026',mes:'11',...extra});
    const google=()=>estado.chamadas.filter(c=>c.host!=='fixture.invalid');
    const mutacoes=()=>google().filter(c=>c.host==='www.googleapis.com'&&c.metodo!=='GET');
    return {estado,chamar,iniciar,google,mutacoes};
}
test('cinco endpoints recusam pedido sem identidade antes de usar Google',async t=>{
    const a=await ambiente(t);
    for(const nome of ['anexo-iniciar','anexo-finalizar','anexo-enviar-pedaco','anexos-drive-listar','proxy-imagem']) {
        const r=await a.chamar(nome,{nomeArquivo:'fixture.pdf',driveFileId:'arquivo_ficticio_123',uploadUrl:upload,chunkBase64:'AQ==',offset:0,tamanhoTotal:1},{categoria:'fotos',drive_id:'arquivo_ficticio_123'},{});
        assert.equal(r.codigo,401,nome);
    }
    assert.equal(a.estado.chamadas.length,0);
});
test('token inválido, usuário anônimo ou e-mail não confirmado não chegam ao Google',async t=>{
    const a=await ambiente(t);let r=await a.chamar('anexo-iniciar',{nomeArquivo:'fixture.pdf'}, {},{...headers,authorization:'Bearer expirado'});assert.equal(r.codigo,401);
    for(const patch of [{is_anonymous:true},{email_confirmed_at:null}]){a.estado.userPatch=patch;r=await a.iniciar();assert.equal(r.codigo,401);}
    assert.equal(a.google().length,0);
});
test('conta/perfil desativado e leitor não criam pastas ou uploads',async t=>{
    const a=await ambiente(t);
    for(const tipo of ['inativo','perfil_inativo','leitor']){a.estado.tipo=tipo;assert.equal((await a.iniciar()).codigo,403,tipo);}
    assert.equal(a.google().length,0);
});
test('Saúde só inicia anexos do módulo e recebe sessão restrita',async t=>{
    const a=await ambiente(t,'saude');assert.equal((await a.iniciar('acervo')).codigo,403);
    const r=await a.iniciar('aso_exames');assert.equal(r.codigo,200);assert.equal(r.body.compartilhamentoPublicoPermitido,false);assert.ok(r.body.sessionTicket);
    assert.equal(a.estado.metadata.appProperties.checklist_uid,uid);assert.equal(a.estado.metadata.appProperties.checklist_tabela,'aso_exames');
    const fim=await a.chamar('anexo-finalizar',{driveFileId:'arquivo_ficticio_123',sessionTicket:r.body.sessionTicket,confirmarCompartilhamento:true});assert.equal(fim.codigo,403);
    assert.equal(a.estado.chamadas.filter(c=>c.path.endsWith('/permissions')&&c.metodo==='POST').length,0);
});
test('bloqueio de compartilhamento de Saúde também vale para administrador',async t=>{
    const a=await ambiente(t);const r=await a.iniciar('atestados_ocupacionais');assert.equal(r.codigo,200);
    assert.equal((await a.chamar('anexo-finalizar',{driveFileId:'arquivo_ficticio_123',sessionTicket:r.body.sessionTicket,confirmarCompartilhamento:true})).codigo,403);
    assert.equal(a.estado.chamadas.filter(c=>c.path.endsWith('/permissions')&&c.metodo==='POST').length,0);
});
test('editor tem escrita apenas no módulo concedido; técnico mantém regra interna',async t=>{
    const a=await ambiente(t,'editor');assert.equal((await a.iniciar('treinamentos_realizados')).codigo,200);assert.equal((await a.iniciar('dds_realizados')).codigo,403);
    a.estado.tipo='tecnico';assert.equal((await a.iniciar('dds_realizados')).codigo,200);
});
test('pasta arbitrária e raiz customizada não são autorizadas para editor',async t=>{
    const a=await ambiente(t,'editor');assert.equal((await a.iniciar('treinamentos_realizados',{pastaRaiz:'Particular'})).codigo,403);
    assert.equal((await a.iniciar('treinamentos_realizados',{pastaDestinoId:'fora_123'})).codigo,403);
    assert.equal(a.mutacoes().length,0);
});
test('infoOnly não cria pastas mesmo quando a hierarquia ainda não existe',async t=>{
    const a=await ambiente(t);a.estado.semPastas=true;const r=await a.iniciar('checklists',{infoOnly:true});assert.equal(r.codigo,200);assert.equal(r.body.pastaDestinoId,null);assert.equal(a.mutacoes().length,0);
});
test('sessão assinada valida chunk e recusa outra URL, outra conta e revogação',async t=>{
    const a=await ambiente(t),r=await a.iniciar();assert.equal(r.codigo,200);const ticket=r.body.sessionTicket;
    const body={uploadUrl:upload,sessionTicket:ticket,chunkBase64:'AQ==',offset:0,tamanhoTotal:1};
    assert.equal((await a.chamar('anexo-enviar-pedaco',body)).codigo,200);
    assert.equal((await a.chamar('anexo-enviar-pedaco',{...body,uploadUrl:upload.replace('upload_id=fixture','upload_id=outro')})).codigo,403);
    a.estado.uid='22222222-2222-4222-8222-222222222222';assert.equal((await a.chamar('anexo-enviar-pedaco',body)).codigo,403);
    a.estado.uid=uid;a.estado.tipo='leitor';assert.equal((await a.chamar('anexo-enviar-pedaco',body)).codigo,403);
});
test('sessão ausente, forjada ou expirada não envia bytes',async t=>{
    const a=await ambiente(t),{criarSessaoAnexo}=await mod('lib/autorizacao-anexos.js');
    const vencido=criarSessaoAnexo(uid,'acervo',upload,'pasta_123','nonce',Date.now()-2*60*60*1000).ticket;
    for(const sessionTicket of [undefined,'falso.falso',vencido]) {
        const r=await a.chamar('anexo-enviar-pedaco',{uploadUrl:upload,sessionTicket,chunkBase64:'AQ==',offset:0,tamanhoTotal:1});assert.equal(r.codigo,403);
    }
    assert.equal(a.mutacoes().length,0);
});
test('finalização exige confirmação e vínculo do arquivo, pasta, UID, nonce e tabela',async t=>{
    const a=await ambiente(t),r=await a.iniciar();const body={driveFileId:'arquivo_ficticio_123',sessionTicket:r.body.sessionTicket,confirmarCompartilhamento:true};
    assert.equal((await a.chamar('anexo-finalizar',{...body,confirmarCompartilhamento:false})).codigo,400);
    for(const patch of [{parents:['fora_123']},{appProperties:{}},{appProperties:{...a.estado.metadata.appProperties,checklist_uid:'outro'}},
        {appProperties:{...a.estado.metadata.appProperties,checklist_nonce:'outro'}},{appProperties:{...a.estado.metadata.appProperties,checklist_tabela:'aso_exames'}},{mimeType:'application/vnd.google-apps.folder'}]) {
        a.estado.metaPatch=patch;assert.equal((await a.chamar('anexo-finalizar',body)).codigo,403);
    }
    assert.equal(a.estado.chamadas.filter(c=>c.path.endsWith('/permissions')).length,0);
    a.estado.metaPatch={};assert.equal((await a.chamar('anexo-finalizar',body)).codigo,200);assert.equal(a.estado.chamadas.filter(c=>c.path.endsWith('/permissions')).length,1);
});
test('listagem permite leitura de perfil e bloqueia categoria sem acesso',async t=>{
    const a=await ambiente(t,'editor');assert.equal((await a.chamar('anexos-drive-listar',{}, {categoria:'treinamentos'})).codigo,200);
    assert.equal((await a.chamar('anexos-drive-listar',{}, {categoria:'fotos'})).codigo,403);
});
test('proxy não usa OAuth privado para arquivo sem vínculo autorizado',async t=>{
    const a=await ambiente(t,'leitor');const r=await a.chamar('proxy-imagem',{}, {drive_id:'arquivo_ficticio_123'});assert.equal(r.codigo,403);
    assert.equal(a.estado.chamadas.filter(c=>c.path==='/drive/v3/files/arquivo_ficticio_123' && c.metodo==='GET').length,1);
    assert.equal(a.estado.chamadas.filter(c=>c.media).length,0);
});
test('teto administrativo impede promoção por tabelas e ignora user_metadata',async t=>{
    const a=await ambiente(t,'admin');
    // Mesmo a linha 76/nível Admin no banco não pode conceder um poder ausente no Auth.
    a.estado.userPatch={app_metadata:{anexos:{versao:1,modulos:['treinamentos'],modulos_edicao:[]}},user_metadata:{anexos:{versao:1,admin:true}}};
    assert.equal((await a.iniciar()).codigo,403);assert.equal(a.google().length,0);
    a.estado.userPatch={app_metadata:{},user_metadata:{anexos:{versao:1,admin:true}}};
    assert.equal((await a.iniciar()).codigo,403);assert.equal(a.google().length,0);
    a.estado.tipo='saude';a.estado.userPatch={app_metadata:{anexos:{versao:1,modulos:[],modulos_edicao:[]}}};
    assert.equal((await a.iniciar('aso_exames')).codigo,403);assert.equal(a.google().length,0);
});
test('pasta pública herdada bloqueia Saúde antes do início do upload',async t=>{
    const a=await ambiente(t,'saude');a.estado.pastaPublica=true;
    assert.equal((await a.iniciar('aso_exames')).codigo,403);
    assert.equal(a.estado.chamadas.filter(c=>c.path.includes('/upload/')).length,0);
    assert.equal(a.mutacoes().length,0);
});
test('destino null é ausência de seleção contextual e não rejeita upload normal',async t=>{
    const a=await ambiente(t);assert.equal((await a.iniciar('acervo',{pastaDestinoId:null})).codigo,200);
});
test('referência forjada em anexos_sms não autoriza arquivo privado fora da raiz',async t=>{
    const a=await ambiente(t,'leitor');a.estado.anexos=[{tabela_origem:'treinamentos_realizados'}];
    assert.equal((await a.chamar('proxy-imagem',{}, {drive_id:'arquivo_ficticio_123'})).codigo,403);
    assert.equal(a.estado.chamadas.filter(c=>c.media).length,0);
});
test('revogação da concessão Auth invalida ticket existente sem depender do JWT antigo',async t=>{
    const a=await ambiente(t),r=await a.iniciar();const n=a.google().length;
    a.estado.userPatch={app_metadata:{anexos:null}};
    assert.equal((await a.chamar('anexo-enviar-pedaco',{uploadUrl:upload,sessionTicket:r.body.sessionTicket,chunkBase64:'AQ==',offset:0,tamanhoTotal:1})).codigo,403);
    assert.equal(a.google().length,n);
});
