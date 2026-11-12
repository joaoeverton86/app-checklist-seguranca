const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8T8AAAAASUVORK5CYII=', 'base64');
const id = 'arquivo_FICTICIO_123';
const upload = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=sessao_ficticia';
Object.assign(process.env,{SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'fixture',GOOGLE_CLIENT_SECRET:'segredo-ficticio'});
const uid='11111111-1111-4111-8111-111111111111';
const carregar = async nome => {
    const handler=(await import(pathToFileURL(path.resolve('api', nome+'.js')).href)).default;
    return async (req,res)=>{
        req.headers={authorization:'Bearer fixture',apikey:'fixture'};
        if(nome==='anexo-enviar-pedaco' && req.body?.uploadUrl===upload) {
            const {criarSessaoAnexo}=await import(pathToFileURL(path.resolve('lib/autorizacao-anexos.js')).href);
            req.body.sessionTicket=criarSessaoAnexo(uid,'acervo',upload,'pasta_ficticia').ticket;
        }
        return handler(req,res);
    };
};
function resposta() {
    return { headers:{}, codigo:0, setHeader(k,v){this.headers[k]=v;}, status(n){this.codigo=n;return this;},
        json(v){this.body=v;return this;}, send(v){this.body=v;return this;}, end(){return this;} };
}
function simular(t, fn) { const antes=global.fetch; global.fetch=async(entrada,op)=>{
    const u=new URL(String(entrada));
    if(u.hostname==='fixture.invalid') {
        if(u.pathname==='/auth/v1/user')return Response.json({id:uid,email:'fixture@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{anexos:{versao:1,admin:true}}});
        if(u.pathname.includes('painel_usuarios'))return Response.json([]);
        if(u.pathname.includes('colaboradores_checklist'))return Response.json([{id:'76',matricula:'76',ativo:true,nivel_acesso:'Admin'}]);
        throw Error('Consulta de Auth inesperada');
    }
    return fn(entrada,op);
}; t.after(()=>{global.fetch=antes;}); }
test('proxy recusa destinos privados e hosts arbitrários antes de buscar', async t => {
    const handler=await carregar('proxy-imagem'); let chamadas=0;
    simular(t,async()=>{chamadas++;return new Response(png,{headers:{'content-type':'image/png'}});});
    for(const url of ['http://169.254.169.254/latest/meta-data/','https://127.0.0.1/','https://[::1]/','https://example.invalid/foto','https://lh3.googleusercontent.com.example.invalid/d/'+id,'https://lh3.googleusercontent.com@127.0.0.1/d/'+id]) {
        const r=resposta(); await handler({method:'GET',query:{url}},r); assert.equal(r.codigo,400,url);
    }
    assert.equal(chamadas,0);
});
test('upload não envia bytes a destinos arbitrários',async t=>{
    const handler=await carregar('anexo-enviar-pedaco'); let chamadas=0;
    simular(t,async()=>{chamadas++;return Response.json({id});});
    for(const uploadUrl of ['http://169.254.169.254/','https://example.invalid/','https://www.googleapis.com/drive/v3/files?upload_id=x','https://www.googleapis.com:444/upload/drive/v3/files?uploadType=resumable&upload_id=x']) {
        const r=resposta(); await handler({method:'POST',body:{uploadUrl,chunkBase64:'AQ==',offset:0,tamanhoTotal:1}},r);assert.equal(r.codigo,400,uploadUrl);
    }
    assert.equal(chamadas,0);
});
test('proxy recusa parâmetros repetidos e IDs divergentes sem buscar',async t=>{
    const handler=await carregar('proxy-imagem'); let chamadas=0;
    simular(t,async()=>{chamadas++;throw Error('Não deve buscar');});
    for(const query of [{url:['https://lh3.googleusercontent.com/d/'+id]}, {drive_id:['x']},
        {url:'https://lh3.googleusercontent.com/d/'+id,drive_id:'outro_id'},
        {url:'https://qqtcwxvbjmybyzubocgd.supabase.co/storage/v1/object/public/b/f.png',drive_id:id},
        {drive_id:id,id:'outro_id'}]) {
        const r=resposta();await handler({method:'GET',query},r);assert.equal(r.codigo,400);
    }
    assert.equal(chamadas,0);
});
test('links Google legítimos e Storage deste projeto preservam imagens',async t=>{
    const handler=await carregar('proxy-imagem'); const chamadas=[];
    simular(t,async(url,op)=>{chamadas.push(String(url));assert.equal(op.redirect,'manual');assert.ok(op.signal instanceof AbortSignal);return new Response(png,{headers:{'content-type':'image/png'}});});
    for(const query of [{drive_id:id},{url:'https://drive.google.com/file/d/'+id+'/view'},
        {url:'https://drive.google.com/open?id='+id},{url:'https://lh3.googleusercontent.com/d/'+id+'=w1200',drive_id:id},
        {url:'https://qqtcwxvbjmybyzubocgd.supabase.co/storage/v1/object/public/fotos/a.png'},
        {url:'https://qqtcwxvbjmybyzubocgd.supabase.co/storage/v1/object/sign/fotos/a.png?token=ficticio'}]) {
        const r=resposta();await handler({method:'GET',query},r);assert.equal(r.codigo,200);assert.deepEqual(r.body,png);assert.equal(r.headers['Content-Type'],'image/png');assert.equal(r.headers['X-Content-Type-Options'],'nosniff');
    }
    assert.equal(chamadas.length,6); assert.equal(chamadas[1],'https://lh3.googleusercontent.com/d/'+id);
});
test('proxy bloqueia salto externo antes da segunda conexão',async t=>{
    const handler=await carregar('proxy-imagem');let chamadas=0;
    simular(t,async(url,op)=>{chamadas++;assert.equal(op.redirect,'manual');return new Response(null,{status:302,headers:{location:'http://169.254.169.254/privado'}});});
    const r=resposta();await handler({method:'GET',query:{drive_id:id}},r);assert.equal(r.codigo,400);assert.equal(chamadas,1);
});
test('proxy aceita salto relativo permitido e limita ciclos',async t=>{
    const handler=await carregar('proxy-imagem');let chamadas=0,ciclo=false;
    simular(t,async()=>{chamadas++;return !ciclo && chamadas===2 ? new Response(png,{headers:{'content-type':'image/png'}}) : new Response(null,{status:302,headers:{location:'/d/'+id}});});
    let r=resposta();await handler({method:'GET',query:{drive_id:id}},r);assert.equal(r.codigo,200);assert.equal(chamadas,2);
    ciclo=true;chamadas=0;r=resposta();await handler({method:'GET',query:{drive_id:id}},r);assert.equal(r.codigo,502);assert.equal(chamadas,4);
});
test('proxy rejeita HTML, SVG, MIME incorreto e imagem acima do tamanho anunciado',async t=>{
    const handler=await carregar('proxy-imagem');let op;
    simular(t,async()=>new Response(op.body,{headers:op.headers}));
    for(op of [{body:'<html>falha</html>',headers:{'content-type':'text/html'}},
        {body:'<svg/>',headers:{'content-type':'image/svg+xml'}},
        {body:'<html>disfarçado</html>',headers:{'content-type':'image/png'}},
        {body:png,headers:{'content-type':'image/png','content-length':String(21*1024*1024)}}]) {
        const r=resposta();await handler({method:'GET',query:{drive_id:id}},r);assert.equal(r.codigo,op.headers['content-length']?413:415);assert.equal(r.headers['Cache-Control'],'no-store');
    }
});
test('limite de imagem vale durante streaming mesmo com Content-Length falso',async t=>{
    const handler=await carregar('proxy-imagem');let cancelado=false,n=0;
    simular(t,async()=>new Response(new ReadableStream({pull(c){n++;c.enqueue(new Uint8Array(1024*1024));},cancel(){cancelado=true;}}),{headers:{'content-type':'image/png','content-length':'1'}}));
    const r=resposta();await handler({method:'GET',query:{drive_id:id}},r);assert.equal(r.codigo,413);assert.ok(cancelado);assert.ok(n<=23);
});
test('fallback OAuth não encaminha credencial em redirect nem permite cache público',async t=>{
    const handler=await carregar('proxy-imagem');const chaves=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN'];
    const antes=Object.fromEntries(chaves.map(k=>[k,process.env[k]]));chaves.forEach(k=>process.env[k]='ficticio');
    t.after(()=>{for(const k of chaves)if(antes[k]===undefined)delete process.env[k];else process.env[k]=antes[k];});
    let modo='sucesso',chamadas=[];
    simular(t,async(url,op)=>{
        url=String(url);chamadas.push(url);assert.equal(op.redirect,'manual');
        if(url.startsWith('https://lh3.')) {assert.equal(op.headers.Authorization,undefined);return new Response(null,{status:404});}
        if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'token-ficticio'});
        assert.ok(url.startsWith('https://www.googleapis.com/drive/v3/files/'));assert.equal(op.headers.Authorization,'Bearer token-ficticio');
        return modo==='sucesso'?new Response(png,{headers:{'content-type':'image/png'}}):new Response(null,{status:302,headers:{location:'https://example.invalid/roubar'}});
    });
    let r=resposta();await handler({method:'GET',query:{drive_id:id}},r);assert.equal(r.codigo,200);assert.equal(r.headers['Cache-Control'],'private, no-store');
    modo='redirect';chamadas=[];r=resposta();await handler({method:'GET',query:{drive_id:id}},r);assert.equal(r.codigo,502);assert.equal(chamadas.length,3);assert.ok(!JSON.stringify(r.body).includes('token-ficticio'));
});
test('upload valida base64, intervalos, tipos e tamanho antes da conexão',async t=>{
    const handler=await carregar('anexo-enviar-pedaco');let chamadas=0;
    simular(t,async()=>{chamadas++;throw Error('Não deve buscar');});
    const padrao={uploadUrl:upload,chunkBase64:'AQ==',offset:0,tamanhoTotal:1};
    for(const patch of [{chunkBase64:'!!'},{chunkBase64:'AR=='},{chunkBase64:''},{chunkBase64:[]},{offset:'0'},
        {offset:-1},{offset:1},{offset:NaN},{tamanhoTotal:Number.MAX_SAFE_INTEGER+1},{tamanhoTotal:0},
        {mimeType:'image/png\r\nX-Falso: sim'},{chunkBase64:Buffer.alloc(3*1024*1024+1).toString('base64')}]) {
        const r=resposta();await handler({method:'POST',body:{...padrao,...patch}},r);assert.equal(r.codigo,400,JSON.stringify(Object.keys(patch)));
    }
    assert.equal(chamadas,0);
});
test('upload preserva pedaço real de 2,5 MB, Content-Range, 308 e finalização',async t=>{
    const handler=await carregar('anexo-enviar-pedaco'),dados=Buffer.alloc(2.5*1024*1024,42);let n=0;
    simular(t,async(url,op)=>{n++;assert.equal(url,upload);assert.equal(op.redirect,'manual');assert.ok(op.signal instanceof AbortSignal);assert.deepEqual(op.body,dados);
        assert.equal(op.headers['Content-Length'],String(dados.length));assert.equal(op.headers['Content-Range'],n===1?'bytes 0-2621439/5242880':'bytes 2621440-5242879/5242880');
        return n===1?new Response(null,{status:308}):Response.json({id,webViewLink:'https://drive.google.com/file/d/'+id+'/view'},{status:201});
    });
    let r=resposta();await handler({method:'POST',body:{uploadUrl:upload,chunkBase64:dados.toString('base64'),offset:0,tamanhoTotal:dados.length*2}},r);assert.equal(r.codigo,200);assert.equal(r.body.completo,false);
    r=resposta();await handler({method:'POST',body:{uploadUrl:upload,chunkBase64:dados.toString('base64'),offset:dados.length,tamanhoTotal:dados.length*2}},r);assert.equal(r.codigo,200);assert.equal(r.body.id,id);assert.equal(r.body.completo,true);
});
test('upload não trata redirect 308 com Location como pedaço recebido',async t=>{
    const handler=await carregar('anexo-enviar-pedaco');let chamadas=0;
    simular(t,async()=>{chamadas++;return new Response(null,{status:308,headers:{location:'http://127.0.0.1/'}});});
    const r=resposta();await handler({method:'POST',body:{uploadUrl:upload,chunkBase64:'AQ==',offset:0,tamanhoTotal:1}},r);assert.equal(r.codigo,502);assert.equal(chamadas,1);
});
test('erros de rede e provedor não expõem URLs, tokens ou conteúdo remoto',async t=>{
    const handler=await carregar('anexo-enviar-pedaco');let modo='rede';
    simular(t,async()=>{if(modo==='rede')throw Error('TOKEN-PRIVADO upload_id=sigilo');return new Response('TOKEN-PRIVADO',{status:500});});
    for(modo of ['rede','provedor']) {const r=resposta();await handler({method:'POST',body:{uploadUrl:upload,chunkBase64:'AQ==',offset:0,tamanhoTotal:1}},r);assert.equal(r.codigo,502);assert.ok(!JSON.stringify(r.body).includes('TOKEN-PRIVADO'));}
});
test('métodos não permitidos e preflight não fazem chamadas externas',async t=>{
    let chamadas=0;simular(t,async()=>{chamadas++;throw Error('Não deve buscar');});
    for(const nome of ['proxy-imagem','anexo-enviar-pedaco']) {const handler=await carregar(nome);const r=resposta();await handler({method:'DELETE',query:{},body:{}},r);assert.equal(r.codigo,405);}
    const handler=await carregar('proxy-imagem'),r=resposta();await handler({method:'OPTIONS'},r);assert.equal(r.codigo,200);assert.equal(chamadas,0);
});
