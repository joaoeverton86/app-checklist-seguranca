const HOSTS_GOOGLE = new Set(['lh3.googleusercontent.com','lh4.googleusercontent.com','lh5.googleusercontent.com',
    'lh6.googleusercontent.com','drive.google.com','drive.usercontent.google.com']);
export const MAX_IMAGEM = 20 * 1024 * 1024;
export const MAX_PEDACO = 3 * 1024 * 1024;
export const falhaRemota = (status,message) => Object.assign(new Error(message),{status});
export function idDriveValido(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(id); }
function urlHttps(valor) {
    if (typeof valor !== 'string' || !valor || valor.length > 8192) throw falhaRemota(400,'URL inválida.');
    let url;
    try { url = new URL(valor); } catch { throw falhaRemota(400,'URL inválida.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
        throw falhaRemota(400,'Use HTTPS sem credenciais, porta alternativa ou fragmento.');
    }
    return url;
}
export function validarUrlImagem(valor) {
    const url = urlHttps(valor);
    const storage = url.hostname === 'qqtcwxvbjmybyzubocgd.supabase.co'
        && /^\/storage\/v1\/(?:object|render\/image)\/(?:public|sign)\/.+/.test(url.pathname);
    if (!storage && !HOSTS_GOOGLE.has(url.hostname)) throw falhaRemota(400,'Destino de imagem não permitido.');
    return url;
}
export function resolverImagem(query = {}) {
    const informado = query.drive_id ?? query.id;
    if (query.drive_id !== undefined && query.id !== undefined && query.drive_id !== query.id) throw falhaRemota(400,'Identificadores do Drive divergentes.');
    if (informado !== undefined && !idDriveValido(informado)) throw falhaRemota(400,'Identificador do Drive inválido.');
    if (!query.url && !informado) throw falhaRemota(400,'Parâmetro url ou drive_id é obrigatório.');
    let url = validarUrlImagem(query.url ?? ('https://lh3.googleusercontent.com/d/' + informado));
    const caminho = url.pathname.match(/^\/(?:file\/)?d\/([A-Za-z0-9_-]+)(?:[=/]|$)/);
    const candidato = HOSTS_GOOGLE.has(url.hostname) ? caminho?.[1]
        || (['drive.google.com','drive.usercontent.google.com'].includes(url.hostname) ? url.searchParams.get('id') : null) : null;
    const fileId = idDriveValido(candidato) ? candidato : null;
    if (informado && fileId !== informado) throw falhaRemota(400,'URL e identificador do Drive não correspondem.');
    if (url.hostname === 'drive.google.com' && fileId) url = new URL('https://lh3.googleusercontent.com/d/' + fileId);
    return {url,fileId};
}
export function validarUrlUpload(valor) {
    const url = urlHttps(valor);
    if (!['www.googleapis.com','content.googleapis.com'].includes(url.hostname) || url.pathname !== '/upload/drive/v3/files'
        || url.searchParams.getAll('uploadType').length !== 1 || url.searchParams.get('uploadType') !== 'resumable'
        || url.searchParams.getAll('upload_id').length !== 1 || !url.searchParams.get('upload_id')?.trim()) {
        throw falhaRemota(400,'Sessão de upload do Drive inválida.');
    }
    return url;
}
export async function buscarImagem(urlInicial,signal) {
    let url = validarUrlImagem(String(urlInicial));
    for (let saltos=0; saltos<=3; saltos++) {
        const resposta = await fetch(url.href,{redirect:'manual',signal,headers:{Accept:'image/*'}});
        if (![301,302,303,307,308].includes(resposta.status)) return resposta;
        await resposta.body?.cancel();
        const destino = resposta.headers.get('location');
        if (!destino || saltos === 3) throw falhaRemota(502,'Redirecionamento de imagem inválido ou excessivo.');
        // Conferir cada destino ANTES da próxima conexão; nunca seguir automaticamente.
        url = validarUrlImagem(new URL(destino,url).href);
    }
}
export async function lerImagemLimitada(resposta) {
    const tipo = (resposta.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!['image/png','image/jpeg','image/gif','image/webp','image/avif','image/bmp','image/tiff'].includes(tipo)) {
        await resposta.body?.cancel(); throw falhaRemota(415,'O destino não retornou uma imagem compatível.');
    }
    if (Number(resposta.headers.get('content-length')) > MAX_IMAGEM) {
        await resposta.body?.cancel(); throw falhaRemota(413,'Imagem acima do limite de 20 MB.');
    }
    if (!resposta.body) throw falhaRemota(502,'Imagem sem conteúdo.');
    const leitor = resposta.body.getReader(), partes = []; let tamanho=0;
    try {
        while (true) {
            const item = await leitor.read(); if (item.done) break;
            tamanho += item.value.byteLength;
            if (tamanho > MAX_IMAGEM) throw falhaRemota(413,'Imagem acima do limite de 20 MB.');
            partes.push(Buffer.from(item.value));
        }
    } catch (erro) { await leitor.cancel().catch(()=>{}); throw erro; }
    finally { leitor.releaseLock(); }
    const buffer = Buffer.concat(partes), inicio = buffer.subarray(0,16), texto = inicio.toString('ascii');
    const valido = tipo === 'image/png' ? inicio.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))
        : tipo === 'image/jpeg' ? inicio[0] === 255 && inicio[1] === 216 && inicio[2] === 255
        : tipo === 'image/gif' ? /^GIF8[79]a/.test(texto)
        : tipo === 'image/webp' ? texto.startsWith('RIFF') && texto.slice(8,12) === 'WEBP'
        : tipo === 'image/avif' ? texto.slice(4,8) === 'ftyp' && ['avif','avis'].includes(texto.slice(8,12))
        : tipo === 'image/bmp' ? texto.startsWith('BM')
        : inicio.subarray(0,4).equals(Buffer.from('49492a00','hex')) || inicio.subarray(0,4).equals(Buffer.from('4d4d002a','hex'));
    if (!valido) throw falhaRemota(415,'Conteúdo incompatível com o tipo de imagem.');
    return {buffer,tipo};
}
