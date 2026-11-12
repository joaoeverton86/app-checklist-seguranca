// Planejador local: não autentica, não chama rede e não aplica concessões.
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const uidValido = valor => typeof valor === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(valor);
function validarConcessao(valor) {
    const permitidas = new Set(['versao', 'admin', 'saude', 'interno', 'ver_todos', 'modulos', 'modulos_edicao']);
    if (!valor || typeof valor !== 'object' || Array.isArray(valor) || valor.versao !== 1 || Object.keys(valor).some(k => !permitidas.has(k))) throw Error('Concessão inválida.');
    for (const k of ['admin', 'saude', 'interno', 'ver_todos']) if (Object.hasOwn(valor, k) && typeof valor[k] !== 'boolean') throw Error('Flag de concessão inválida.');
    for (const k of ['modulos', 'modulos_edicao']) if (Object.hasOwn(valor, k) && (!Array.isArray(valor[k]) || valor[k].length > 50 || valor[k].some(m => typeof m !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(m)))) throw Error('Módulos da concessão inválidos.');
    if (valor.saude && (valor.admin || valor.interno || valor.modulos_edicao?.some(m => m !== 'saude'))) throw Error('Saúde não pode receber edição fora de seu módulo.');
}
function planejarAcessos(fotografia, propostas) {
    if (!Array.isArray(fotografia) || !Array.isArray(propostas) || fotografia.length > 200 || propostas.length > 200) throw Error('Entradas inválidas.');
    const contas = new Map(), escolhas = new Map();
    for (const c of fotografia) { if (!uidValido(c.auth_uid) || contas.has(c.auth_uid.toLowerCase())) throw Error('Identidade inválida ou repetida na fotografia.'); contas.set(c.auth_uid.toLowerCase(), c); }
    for (const p of propostas) { if (!uidValido(p.auth_uid) || escolhas.has(p.auth_uid.toLowerCase())) throw Error('Identidade inválida ou repetida na proposta.'); validarConcessao(p.concessao); escolhas.set(p.auth_uid.toLowerCase(), p); }
    const itens = [];
    for (const id of new Set([...contas.keys(), ...escolhas.keys()])) {
        const c = contas.get(id), p = escolhas.get(id), motivos = [];
        if (!p) { itens.push({ auth_uid: id, estado: 'sem_proposta', aprovado: false }); continue; }
        if (!c) motivos.push('Conta não encontrada na fotografia.');
        else {
            const internos = c.vinculos_internos || [], perfis = c.vinculos_painel || [];
            if (!Array.isArray(internos) || !Array.isArray(perfis)) throw Error('Vínculos inválidos.');
            if (c.email_confirmado !== true) motivos.push('Confirmação de e-mail pendente.');
            if (c.bloqueado_auth !== false) motivos.push('Conta bloqueada ou estado Auth não confirmado.');
            if (!Object.hasOwn(c, 'concessao_anexos')) motivos.push('Concessão atual não foi conferida na fotografia.');
            if (!internos.length && !perfis.length) motivos.push('Conta sem vínculo no painel.');
            if (internos.length > 1 || perfis.length > 1) motivos.push('Vínculo duplicado ou ambíguo.');
            if (internos.some(v => v.ativo !== true) || perfis.some(v => v.ativo !== true || v.perfil_ativo !== true)) motivos.push('Vínculo/perfil inativo ou atividade não confirmada.');
            if (c.concessao_anexos != null && !isDeepStrictEqual(c.concessao_anexos, p.concessao)) motivos.push('Já existe concessão diferente; não sobrescrever por este plano.');
        }
        itens.push({ auth_uid: id, rotulo: p.rotulo || 'Conta proposta', estado: motivos.length ? 'bloqueado' : c.concessao_anexos != null ? 'sem_alteracao' : 'elegivel_para_revisao', aprovado: false,
            motivos, concessao_proposta: structuredClone(p.concessao), exige_confirmacao_identidade: true, aplica_em_producao: false });
    }
    return { somente_planejamento: true, aprovado: false, altera_contas: false, itens };
}
module.exports = { planejarAcessos };
if (require.main === module) {
    try {
        const args = process.argv.slice(2), valores = {};
        for (let i = 0; i < args.length; i += 2) { if (!['--fotografia', '--propostas', '--saida'].includes(args[i]) || !args[i + 1] || valores[args[i]]) throw Error('Use --fotografia arquivo.json --propostas arquivo.json --saida arquivo.json. Não existe modo de aplicação.'); valores[args[i]] = args[i + 1]; }
        if (Object.keys(valores).length !== 3 || Object.values(valores).some(p => path.extname(p).toLowerCase() !== '.json')) throw Error('Informe três arquivos JSON.');
        const plano = planejarAcessos(JSON.parse(fs.readFileSync(valores['--fotografia'], 'utf8').replace(/^\uFEFF/, '')), JSON.parse(fs.readFileSync(valores['--propostas'], 'utf8').replace(/^\uFEFF/, '')));
        fs.writeFileSync(valores['--saida'], JSON.stringify(plano, null, 2) + '\n', { flag: 'wx' });
        console.log('Plano local salvo. Nenhuma conta alterada; aprovação e confirmação de identidade continuam pendentes.');
    } catch (erro) { console.error(erro.message); process.exitCode = 1; }
}
