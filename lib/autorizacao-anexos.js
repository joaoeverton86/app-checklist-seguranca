import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { falhaRemota, idDriveValido, validarUrlUpload } from './urls-remotas.js';

export const MODULOS_TABELAS = Object.freeze({
    acervo:'acervodrive',sms_cop:'acervodrive',documentos:'documentos',checklists:'checklists',
    dds_realizados:'ddsma',dds:'ddsma',treinamentos_realizados:'treinamentos',treinamentos:'treinamentos',
    cipa_reunioes:'cipa',cipa_processos_eleitorais:'cipa',epi_entregas:'epi',extintores_inspecoes:'extintores',
    extintores_catalogo:'extintores',brigada_treinados:'brigada',brigada_membros:'brigada',apr_registros:'apr',
    saude_ambulatorio:'saude',atestados_ocupacionais:'saude',aso_exames:'saude',residuos_manifestos:'ambiental',
    residuos_refeicoes:'ambiental',manutencao_veicular:'ambiental',relatorios_mensais:'relatoriosms',
    ordens_servico:'efetivo',ordens_servico_entregas:'efetivo',colaboradores_efetivo_os:'efetivo'
});
export const MODULOS_CATEGORIAS = Object.freeze({treinamentos:'treinamentos',dds:'ddsma',checklists:'checklists',
    fotos:'relatoriosms',sms_cop:'acervodrive',documentos:'documentos'});
export function moduloTabela(tabela) {
    if (typeof tabela !== 'string' || !Object.hasOwn(MODULOS_TABELAS,tabela)) throw falhaRemota(400,'Finalidade do anexo inválida.');
    return MODULOS_TABELAS[tabela];
}
export async function autenticarAnexos(req) {
    const authorization=req.headers?.authorization, apikey=process.env.SUPABASE_ANON_KEY || req.headers?.apikey;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization) || typeof apikey !== 'string' || !apikey) {
        throw falhaRemota(401,'Entre com seu e-mail e senha do painel para acessar os anexos.');
    }
    const base=process.env.SUPABASE_URL || 'https://qqtcwxvbjmybyzubocgd.supabase.co';
    const origem=new URL(base);
    if (origem.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(origem.hostname)) throw falhaRemota(503,'Configuração de autenticação indisponível.');
    const banco=async caminho=>{
        const r=await fetch(new URL(caminho,origem),{headers:{apikey,Authorization:authorization},redirect:'error',signal:AbortSignal.timeout(15000)});
        if (!r.ok) throw falhaRemota([401,403].includes(r.status)?r.status:502,'Não foi possível confirmar o acesso ao painel.');
        return r.json();
    };
    const user=await banco('/auth/v1/user');
    if (!user?.id || !user.email || !user.email_confirmed_at || user.is_anonymous) throw falhaRemota(401,'É necessário login confirmado por e-mail.');
    // Teto de autorização protegido pelo Auth Admin. Nunca usar user_metadata,
    // role do navegador ou nível de acesso de uma tabela com escrita legada ampla.
    const concessao=user.app_metadata?.anexos;
    if (!concessao || concessao.versao!==1 || typeof concessao!=='object' || Array.isArray(concessao)) {
        throw falhaRemota(403,'Conta ainda não habilitada para anexos. Solicite a liberação ao responsável pelo painel.');
    }
    const [usuarios,internos]=await Promise.all([
        banco('/rest/v1/painel_usuarios?select=ativo,perfil_id,painel_perfis(ativo,ver_todos,modulos,modulos_edicao)&auth_user_id=eq.'+encodeURIComponent(user.id)),
        banco('/rest/v1/colaboradores_checklist?select=id,matricula,ativo,nivel_acesso,funcao&auth_user_id=eq.'+encodeURIComponent(user.id))
    ]);
    if (!Array.isArray(usuarios) || !Array.isArray(internos) || usuarios.length>1 || internos.length>1) throw falhaRemota(403,'Vínculo de acesso ao painel inválido.');
    const pu=usuarios[0],colab=internos[0],perfil=pu?.painel_perfis;
    if (pu?.ativo===false || (pu && (!perfil || perfil.ativo===false)) || colab?.ativo===false) throw falhaRemota(403,'Conta ou perfil desativado.');
    if (!pu && !colab) throw falhaRemota(403,'Conta sem vínculo com o painel.');
    const saude=concessao.saude===true || pu?.perfil_id==='modulo_saude' || String(colab?.matricula || colab?.id)==='98' || /ENFERMEIR/i.test(colab?.funcao || '');
    const admin=!saude && concessao.admin===true;
    return {uid:user.id,admin,saude,perfil,interno:!!colab && concessao.interno===true,concessao,banco};
}
export function exigirModulo(acesso,modulo,escrita=false) {
    if (acesso.admin) return;
    if (escrita && acesso.saude) {
        const teto=acesso.concessao;
        if (modulo==='saude' && (teto?.saude===true || teto?.admin===true || acesso.interno
            || (Array.isArray(teto?.modulos_edicao) && teto.modulos_edicao.includes('saude')))) return;
        throw falhaRemota(403,'Este perfil pode alterar somente anexos de Saúde.');
    }
    const perfil=acesso.perfil;
    const teto=acesso.concessao;
    const dentroDoTeto=escrita ? acesso.interno || (Array.isArray(teto?.modulos_edicao) && teto.modulos_edicao.includes(modulo))
        : acesso.interno || teto?.saude===true || teto?.ver_todos===true || (Array.isArray(teto?.modulos) && teto.modulos.includes(modulo));
    if (!dentroDoTeto) throw falhaRemota(403,'Esta operação excede a autorização de anexos da conta.');
    const permitido=escrita ? (perfil ? perfil.modulos_edicao?.includes(modulo) : acesso.interno)
        : acesso.saude || perfil?.ver_todos===true || perfil?.modulos?.includes(modulo) || (!perfil && acesso.interno);
    if (!permitido) throw falhaRemota(403,'Seu perfil não permite esta operação com anexos.');
}
function chaveAssinatura() {
    const segredo=process.env.ANEXOS_SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    if (!segredo) throw falhaRemota(503,'Integração de anexos indisponível.');
    return createHmac('sha256',segredo).update('app-checklist/anexos/sessao/v1').digest();
}
export function criarSessaoAnexo(uid,tabela,uploadUrl,pastaId,nonce=randomUUID(),agora=Date.now()) {
    validarUrlUpload(uploadUrl);moduloTabela(tabela);
    if (!idDriveValido(pastaId)) throw falhaRemota(502,'Pasta de envio inválida.');
    const dados={v:1,uid,tabela,uploadUrl,pastaId,nonce,exp:agora+60*60*1000};
    return {dados,ticket:assinar(dados)};
}
function assinar(dados) {
    const payload=Buffer.from(JSON.stringify(dados)).toString('base64url');
    return payload+'.'+createHmac('sha256',chaveAssinatura()).update(payload).digest('base64url');
}
export function validarSessaoAnexo(ticket,uid,agora=Date.now()) {
    if (typeof ticket!=='string' || ticket.length>16000) throw falhaRemota(403,'Sessão de envio ausente ou inválida.');
    const partes=ticket.split('.');
    if (partes.length!==2 || !/^[\w-]+$/.test(partes[0]) || !/^[\w-]{43}$/.test(partes[1])) throw falhaRemota(403,'Sessão de envio inválida.');
    const esperada=createHmac('sha256',chaveAssinatura()).update(partes[0]).digest();
    const recebida=Buffer.from(partes[1],'base64url');
    if (recebida.length!==esperada.length || !timingSafeEqual(recebida,esperada)) throw falhaRemota(403,'Sessão de envio inválida.');
    let dados;try { dados=JSON.parse(Buffer.from(partes[0],'base64url').toString()); } catch { throw falhaRemota(403,'Sessão de envio inválida.'); }
    if (dados.v!==1 || dados.uid!==uid || !Number.isSafeInteger(dados.exp) || dados.exp<=agora || dados.exp>agora+60*60*1000
        || !idDriveValido(dados.pastaId) || typeof dados.nonce!=='string') throw falhaRemota(403,'Sessão de envio expirada ou de outra conta.');
    moduloTabela(dados.tabela);validarUrlUpload(dados.uploadUrl);
    return dados;
}
export function responderErroAnexo(res,erro) {
    return res.status(erro.status || 502).json({erro:erro.status ? erro.message : 'Não foi possível concluir a operação de anexo.'});
}
