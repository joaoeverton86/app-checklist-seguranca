import { falhaRemota, idDriveValido } from './urls-remotas.js';
import { exigirModulo, moduloTabela } from './autorizacao-anexos.js';
export async function tokenGoogle() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) throw falhaRemota(503,'Integração com o Drive indisponível.');
    const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,
            client_secret:process.env.GOOGLE_CLIENT_SECRET,refresh_token:process.env.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'}).toString()});
    const dados=await r.json();
    if (!r.ok || typeof dados.access_token!=='string' || !dados.access_token) throw falhaRemota(503,'Não foi possível confirmar a integração com o Drive.');
    return dados.access_token;
}
export async function metadadosDrive(id,token) {
    if (!idDriveValido(id)) throw falhaRemota(400,'Identificador do Drive inválido.');
    const url=new URL('https://www.googleapis.com/drive/v3/files/'+id);
    url.searchParams.set('fields','id,name,parents,appProperties,mimeType,trashed');
    url.searchParams.set('supportsAllDrives','true');
    const r=await fetch(url,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
    if (!r.ok) throw falhaRemota(r.status===404?404:502,'Arquivo ou pasta indisponível no Drive.');
    const meta=await r.json();
    if (!meta || meta.id!==id || meta.trashed===true) throw falhaRemota(403,'Arquivo ou pasta indisponível.');
    return meta;
}
export async function descendenteDaPasta(id,raiz,token) {
    const vistos=new Set();let atual=id;
    for(let n=0;n<10;n++) {
        if (atual===raiz) return true;
        if (vistos.has(atual)) return false;vistos.add(atual);
        const meta=await metadadosDrive(atual,token);
        if (meta.mimeType!=='application/vnd.google-apps.folder' || !Array.isArray(meta.parents) || meta.parents.length!==1) return false;
        atual=meta.parents[0];
    }
    return false;
}
export async function exigirPastaRestrita(id,token) {
    let pageToken;
    for (let pagina=0;pagina<10;pagina++) {
        const url=new URL('https://www.googleapis.com/drive/v3/files/'+id+'/permissions');
        url.searchParams.set('fields','nextPageToken,permissions(type)');url.searchParams.set('supportsAllDrives','true');
        url.searchParams.set('pageSize','100');if(pageToken)url.searchParams.set('pageToken',pageToken);
        const r=await fetch(url,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
        if(!r.ok)throw falhaRemota(503,'Não foi possível conferir a privacidade da pasta de Saúde.');
        const dados=await r.json();
        if(!Array.isArray(dados.permissions))throw falhaRemota(503,'Não foi possível conferir a privacidade da pasta de Saúde.');
        if(dados.permissions.some(p=>p.type==='anyone'))throw falhaRemota(403,'A pasta de Saúde possui acesso público. Corrija a pasta antes de enviar o arquivo.');
        if(!dados.nextPageToken)return;pageToken=dados.nextPageToken;
    }
    throw falhaRemota(503,'Não foi possível concluir a conferência de privacidade da pasta.');
}
export async function autorizarImagemPrivada(fileId,acesso,token) {
    // Administrador do painel já tem acesso integral ao acervo conectado.
    if (acesso.admin) return;
    const meta=await metadadosDrive(fileId,token),props=meta.appProperties;
    // A tabela de anexos legada também pode ser gravável. Uma referência ali
    // não autoriza ler qualquer arquivo privado da conta Google conectada.
    if (props?.checklist_uid && props?.checklist_nonce && props?.checklist_tabela) {
        exigirModulo(acesso,moduloTabela(props.checklist_tabela),false);return;
    }
    exigirModulo(acesso,'relatoriosms',false);
    // Fotos editoriais podem ser legadas e não possuir uma linha em anexos_sms.
    // Nesse caso exigir descendência da raiz de fotos configurada no servidor.
    let raiz=process.env.GOOGLE_DRIVE_FOTOS_ROOT_ID;
    if(!raiz) {
        const url=new URL('https://www.googleapis.com/drive/v3/files');
        url.searchParams.set('q',"name='SST - Fotos & Evidências' and mimeType='application/vnd.google-apps.folder' and trashed=false");
        url.searchParams.set('fields','files(id)');url.searchParams.set('pageSize','2');
        const r=await fetch(url,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
        if(!r.ok)throw falhaRemota(503,'Não foi possível conferir a raiz do acervo de fotos.');
        const dados=await r.json();
        if(!Array.isArray(dados.files) || dados.files.length!==1)throw falhaRemota(403,'Raiz de fotos ausente ou ambígua.');
        raiz=dados.files[0].id;
    }
    if (!idDriveValido(raiz)) throw falhaRemota(403,'Imagem sem vínculo autorizado com o acervo.');
    for(const pai of meta.parents || []) if (await descendenteDaPasta(pai,raiz,token)) return;
    throw falhaRemota(403,'Imagem fora do acervo autorizado.');
}
