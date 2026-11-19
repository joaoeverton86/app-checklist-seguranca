const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const painelDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(painelDir, 'index.html'), 'utf8');
const coreCode = fs.readFileSync(path.join(painelDir, 'dashboard.js'), 'utf8');
const epiCode = fs.readFileSync(path.join(painelDir, 'modules', 'epi_estoque.js'), 'utf8');
const aprCode = fs.readFileSync(path.join(painelDir, 'modules', 'apr_cipa.js'), 'utf8');
const iaCode = fs.readFileSync(path.join(painelDir, 'modules', 'ia_aprendizado.js'), 'utf8');

// 1. Verificações estáticas e de hierarquia real de DOM em dashboard/index.html
assert.match(html, /id="navIaAprendizado"/, 'Botão navIaAprendizado deve existir na sidebar');
assert.match(html, /<section class="db-page" id="page-ia_aprendizado"><\/section>/, 'Seção page-ia_aprendizado deve ser irmã fechada');
assert.match(html, /modules\/ia_aprendizado\.js\?v=\d+/, 'Script ia_aprendizado.js deve estar no HTML');
assert.match(coreCode, /ia_aprendizado:\s*'navIaAprendizado'/, 'Rota ia_aprendizado deve constar no dashboard.js');
assert.match(epiCode, /ia_aprendizado:\s*'navIaAprendizado'/, 'Rota ia_aprendizado deve constar no epi_estoque.js');

assert.doesNotMatch(iaCode, /engmed/i, 'Zero menção à clínica externa Engmed');
assert.doesNotMatch(iaCode, /window\.open\s*\(/, 'Proibido usar window.open');
assert.doesNotMatch(iaCode, /configuracoes_sistema/, 'Proibido usar configuracoes_sistema');
assert.doesNotMatch(iaCode, /5\s*metros|dist[aâ]ncia m[ií]nima obrigat[oó]ria de 5/i, 'Proibido impor 5 metros como regra fixa');
assert.doesNotMatch(iaCode, /generativelanguage\.googleapis\.com|api\.groq\.com/, 'Sem conector/chave de API de LLM no navegador');

// Verifica balanceamento de tags <div> dentro de #page-treinamentos para provar que as 12 subabas são irmãs e não aninhadas
function verificarHierarquiaSubabasTreinamentos(htmlCompleto) {
    const iniTrein = htmlCompleto.indexOf('id="page-treinamentos"');
    const fimTrein = htmlCompleto.indexOf('</section>', iniTrein);
    assert.ok(iniTrein > 0 && fimTrein > iniTrein, 'Seção #page-treinamentos deve estar delimitada por </section>');
    const trecho = htmlCompleto.slice(iniTrein, fimTrein);

    const dozeSubabas = [
        'visao', 'lancar', 'cronograma', 'equipes', 'registro', 'kits',
        'historico', 'catalogo', 'relatorio', 'pat', 'regras', 'gaps'
    ];
    const profundidades = {};
    let depth = 0;
    const tagRegex = /<\/?div\b[^>]*>/gi;
    let m;
    while ((m = tagRegex.exec(trecho)) !== null) {
        const tag = m[0];
        if (tag.startsWith('</')) {
            depth--;
        } else {
            const subMatch = tag.match(/\bid="treinSubtab-([a-z]+)"/);
            if (subMatch) {
                profundidades[subMatch[1]] = depth;
            }
            if (!tag.endsWith('/>')) depth++;
        }
    }
    assert.equal(depth, 0, 'Todas as tags <div> dentro de #page-treinamentos devem fechar perfeitamente (depth === 0)');
    const nivelEsperado = profundidades.visao;
    for (const sub of dozeSubabas) {
        assert.equal(
            profundidades[sub],
            nivelEsperado,
            `Subaba treinSubtab-${sub} deve ser irmã no mesmo nível DOM (${nivelEsperado}), mas estava em ${profundidades[sub]}`
        );
    }
}
verificarHierarquiaSubabasTreinamentos(html);

function criarAmbienteTeste(sessaoInicial, storageCompartilhado) {
    const storage = storageCompartilhado || new Map();
    const elementos = new Map();
    const checkboxesEpi = [
        { value: 'Capacete com Jugular', checked: false },
        { value: 'Perneira 3 Talas', checked: false }
    ];

    function el(id) {
        if (!elementos.has(id)) {
            elementos.set(id, {
                id,
                value: '',
                checked: false,
                innerHTML: '',
                textContent: '',
                style: { display: 'block' },
                dataset: {},
                classList: {
                    classes: new Set(),
                    add(c) { this.classes.add(c); },
                    remove(c) { this.classes.delete(c); },
                    toggle(c, force) {
                        if (force === undefined) {
                            if (this.classes.has(c)) this.classes.delete(c);
                            else this.classes.add(c);
                        } else if (force) this.classes.add(c);
                        else this.classes.delete(c);
                    },
                    contains(c) { return this.classes.has(c); }
                }
            });
        }
        return elementos.get(id);
    }

    el('page-ia_aprendizado');
    el('page-apr');
    el('aprForm_id');
    el('aprForm_numero');
    el('aprForm_dataEmissao');
    el('aprForm_validadeDias');
    el('aprForm_validadeAte');
    el('aprForm_ptNumero');
    el('aprForm_empresa');
    el('aprForm_setor').value = 'SMS';
    el('aprForm_local').value = 'ARCOVERDE - PE';
    el('aprForm_responsavel');
    el('aprForm_titulo');
    el('aprForm_descricaoAtividade');
    el('aprForm_outrosCheck');
    el('aprForm_outrosTexto');
    el('aprForm_luvaTipo');
    el('aprForm_extintorTipo');
    el('aprForm_rotaFuga');
    el('aprForm_pontoEncontro');
    el('aprForm_kitSocorros');
    el('aprForm_socorrista');
    el('aprForm_contatoAmbulatorio');
    el('aprForm_contatoBombeiros');
    el('aprForm_elaborador');
    el('aprForm_supervisor');
    el('aprForm_responsavelArea');
    el('aprFormTitle');
    el('aprForm_btnImprimir');
    el('aprForm_btnAnexos');
    el('aprFormStatus');
    el('aprFormRiscosLista');
    el('aprFormEquipeContainer');

    const contexto = vm.createContext({
        window: null,
        document: {
            getElementById: id => el(id),
            querySelectorAll: sel => (sel.includes('aprEpiBasicoCheckbox') ? checkboxesEpi : [])
        },
        localStorage: {
            getItem: k => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v))
        },
        TextEncoder,
        SUPER_ADMIN_MATRICULAS: ['76'],
        sessaoAtual: sessaoInicial || { uid: 'uid_joao_76', matricula: '76', nome: 'João Everton', tipo: 'interno', ver_todos: true },
        permissaoModulo: { ia_aprendizado: true, apr: true },
        permissaoGravacao: { ia_aprendizado: true, apr: true },
        sessaoDashboardAtual: () => contexto.sessaoAtual,
        moduloPermitidoPainel: mod => contexto.permissaoModulo[mod] !== false,
        usuarioPodeGravarModulo: mod => !!contexto.permissaoGravacao[mod],
        escapeHTML: v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
        allAprRegistros: [],
        allEfetivo: [],
        aprRiscosForm: [],
        paginasAbertas: [],
        impressoes: [],
        alertas: [],
        confirmacaoResposta: true,
        bloquearEdicaoSeNaoAutorizado: () => false,
        supabaseUpsert: async () => {},
        renderAprPanel: () => {},
        registrarAprAudit: async () => {},
        resumoAlteracoesApr: () => '',
        showDbPage: p => contexto.paginasAbertas.push(p),
        showAprSubtab: () => {},
        abrirDocumentoHtmlParaImpressao: (docHtml, docTitulo) => {
            contexto.impressoes.push({ html: docHtml, titulo: docTitulo });
        },
        alert: msg => contexto.alertas.push(msg),
        confirm: () => contexto.confirmacaoResposta,
        parseLocalDate: s => {
            const p = String(s || '').split('-').map(Number);
            return new Date(p[0] || 2026, (p[1] || 1) - 1, p[2] || 1);
        },
        formatDateISO: d => d.toISOString().slice(0, 10),
        Date, Math, JSON, Array, Object, Set, Map, RegExp, Error, Number, String, Boolean, parseInt
    });
    contexto.window = contexto;

    // Carrega as funções reais da APR (rowRiscoVazio, proximoNumeroApr, onAprDataOuValidadeChange, renderEquipeAprPreview, renderRiscosAprForm, abrirFormNovaApr)
    const funcoesReaisApr = [
        'nivelRiscoApr',
        'proximoNumeroApr',
        'onAprDataOuValidadeChange',
        'rowRiscoVazio',
        'renderEquipeAprPreview',
        'renderRiscosAprForm',
        'abrirFormNovaApr'
    ].map(nome => {
        const m = aprCode.match(new RegExp('function ' + nome + '\\([^]*?\\n\\}'));
        assert.ok(m, 'Função real da APR não encontrada: ' + nome);
        return m[0];
    }).join('\n');

    const ancorasApr = aprCode.slice(aprCode.indexOf('var APR_ANCORAS_P ='), aprCode.indexOf('// Status calculado ao vivo'));
    const salvarAprReal = aprCode.slice(aprCode.indexOf('async function salvarApr()'), aprCode.indexOf('// Resumo em texto das principais diferenças'));
    vm.runInContext('var aprRiscosForm = [];\n' + ancorasApr + '\n' + funcoesReaisApr + '\n' + salvarAprReal, contexto);
    vm.runInContext(iaCode, contexto);
    return { contexto, el, checkboxesEpi, storage };
}

const { contexto: w, el, checkboxesEpi, storage } = criarAmbienteTeste();

// 2. Base inicia vazia (sem sementes pré-aprovadas)
w.renderIaAprendizadoPanel();
assert.match(el('page-ia_aprendizado').innerHTML, /Nenhum cenário cadastrado neste dispositivo/);

// 3. Controle de Papéis: Sem Acesso, Leitor, Editor e Validador
w.permissaoModulo.ia_aprendizado = false;
assert.equal(w.obterPapelUsuarioIa(), 'sem_acesso');
w.permissaoModulo.ia_aprendizado = true;

w.permissaoGravacao.ia_aprendizado = false;
assert.equal(w.obterPapelUsuarioIa(), 'leitor');
assert.throws(() => w.salvarContextoOperacional({ cargo_equipe: 'Teste' }), /Permissão negada/);

// Editor (matrícula 150) cria rascunho e ajusta, mas NÃO aprova nem revoga
w.permissaoGravacao.ia_aprendizado = true;
w.sessaoAtual = { uid: 'uid_editor_150', matricula: '150', nome: 'Técnico Editor', tipo: 'interno' };
assert.equal(w.obterPapelUsuarioIa(), 'editor');

const rascunhoEstudo = w.carregarRascunhoEstudoOpcional();
assert.equal(rascunhoEstudo.status_cenario, 'RASCUNHO_NAO_APROVADO');
const diag = w.executarVarreduraRiscosOcultos({});
assert.ok(diag.totalLacunas >= 4);

w.selecionarAbaIaAprendizado('fila');
const sugId = el('page-ia_aprendizado').innerHTML.match(/descartarSugestaoIaUI\('([^']+)'\)/)[1];
const sugAjustada = w.ajustarSugestaoIa(sugId, {
    passo_tarefa: 'Limpeza manual em talude enrocado',
    perigo_fonte: 'Animais peçonhentos nas frestas das rochas'
}, 1);
assert.equal(sugAjustada.status, 'AJUSTADO');
assert.throws(() => w.aprovarSugestaoIa(sugId), /Validador Técnico/);
assert.throws(() => w.enviarRiscosAprovadosParaApr('acrescentar'), /Nenhuma regra ativa e aprovada/);

// 4. Concorrência real entre DUAS ABAS compartilhando o mesmo localStorage!
w.sessaoAtual = { uid: 'uid_joao_76', matricula: '76', nome: 'João Everton', tipo: 'interno' };
const abaB = criarAmbienteTeste({ uid: 'uid_joao_76', matricula: '76', nome: 'João Everton', tipo: 'interno' }, storage);

const cenarioCriado = w.salvarContextoOperacional({ cargo_equipe: 'Equipe A - Versão 1', frente_servico: 'Canal' });
assert.equal(cenarioCriado.versao, 1);

// Aba B carrega a versão 1
abaB.contexto.renderIaAprendizadoPanel();
// Aba A salva a versão 2
const cenarioV2 = w.salvarContextoOperacional({ id: cenarioCriado.id, cargo_equipe: 'Equipe A - Versão 2', versaoEsperada: 1 });
assert.equal(cenarioV2.versao, 2);

// Aba B tenta salvar enviando versaoEsperada: 1 -> deve detectar no storage que já está na versão 2 e bloquear!
assert.throws(() => abaB.contexto.salvarContextoOperacional({
    id: cenarioCriado.id,
    cargo_equipe: 'Edição atrasada da Aba B',
    versaoEsperada: 1
}), /Conflito de edição concorrente/);

// 5. Reprodução e bloqueio dos 6 achados das sondas do Codex:

// 5.1. Sonda Falha de Salvamento no localStorage: deve lançar erro E reverter memória!
{
    const envQuota = criarAmbienteTeste();
    envQuota.contexto.renderIaAprendizadoPanel();
    envQuota.contexto.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.throws(() => envQuota.contexto.salvarContextoOperacional({ cargo_equipe: 'Não salvo' }), /Falha ao gravar no armazenamento local/);
    envQuota.contexto.renderIaAprendizadoPanel();
    assert.match(envQuota.el('page-ia_aprendizado').innerHTML, /Nenhum cenário cadastrado/, 'Memória deve ser revertida se o localStorage falhar');
}

// 5.2. Sonda Dados Pessoais em Gatilhos + UTF-8 Byte Limit
{
    const envPii = criarAmbienteTeste();
    envPii.contexto.renderIaAprendizadoPanel();
    envPii.contexto.importarRespostaIaParaFila(JSON.stringify([{
        passo_tarefa: 'Limpeza',
        perigo_fonte: 'Pedras',
        gatilhos: ['123.456.789-00', 'pessoa@example.com', '(87) 99999-8888']
    }]), null);
    const dadosSalvos = JSON.parse([...envPii.storage.values()][0]);
    const idSug = dadosSalvos.sugestoesFila[0].id;
    envPii.contexto.aprovarSugestaoIa(idSug);
    const pacote = envPii.contexto.gerarPacotePromptRag({});
    assert.equal(pacote.includes('pessoa@example.com'), false, 'E-mail em gatilhos nunca deve vazar para o pacote externo');
    assert.equal(pacote.includes('123.456.789-00'), false, 'CPF em gatilhos nunca deve vazar para o pacote externo');
    assert.equal(pacote.includes('99999-8888'), false, 'Telefone em gatilhos nunca deve vazar para o pacote externo');

    // Teste de limite UTF-8 multibyte (7.000 caracteres de 3 bytes = 21.000 bytes > 20.480 bytes, embora .length seja só 7.000!)
    assert.throws(() => envPii.contexto.importarExemploDeTextoOuJson('⚡'.repeat(7000), 'multibyte.txt'), /bytes UTF-8/);
}

// 5.3. Sonda Regra Revogada e Ajuste de Sugestão Aprovada: nunca devem entrar na APR
{
    const envRev = criarAmbienteTeste();
    envRev.contexto.renderIaAprendizadoPanel();
    envRev.contexto.importarRespostaIaParaFila(JSON.stringify([{
        passo_tarefa: 'Limpeza',
        perigo_fonte: 'Pedras',
        gatilhos: ['pedra_solta']
    }]), null);
    const getSaved = () => JSON.parse([...envRev.storage.values()][0]);
    const idSug = getSaved().sugestoesFila[0].id;
    envRev.contexto.aprovarSugestaoIa(idSug);
    const idRegra = getSaved().regrasAprendidas[0].id;

    // Aprovar duas vezes a mesma sugestão é idempotente (não cria 2 regras duplicadas)
    envRev.contexto.aprovarSugestaoIa(idSug);
    assert.equal(getSaved().regrasAprendidas.length, 1, 'Aprovação repetida não deve duplicar regra');

    // Revogar regra bloqueia imediatamente a transferência da sugestão vinculada
    envRev.contexto.revogarRegraAprendida(idRegra, 'Revogada na auditoria');
    assert.equal(getSaved().sugestoesFila[0].status, 'REVOGADO');
    assert.throws(() => envRev.contexto.enviarRiscosAprovadosParaApr('acrescentar'), /Nenhuma regra ativa e aprovada/);
}

// 5.4. Sonda Detecção de Rascunho com apenas aprForm_local preenchido
{
    const envLoc = criarAmbienteTeste();
    envLoc.contexto.renderIaAprendizadoPanel();
    envLoc.contexto.importarRespostaIaParaFila(JSON.stringify([{
        passo_tarefa: 'Limpeza',
        perigo_fonte: 'Pedras',
        gatilhos: ['pedra']
    }]), null);
    const idSug = JSON.parse([...envLoc.storage.values()][0]).sugestoesFila[0].id;
    envLoc.contexto.aprovarSugestaoIa(idSug);

    envLoc.el('aprForm_local').value = 'Preenchimento do engenheiro';
    envLoc.contexto.confirmacaoResposta = false;
    const resNova = envLoc.contexto.enviarRiscosAprovadosParaApr('nova');
    assert.equal(resNova.cancelado, true, 'Deve detectar aprForm_local alterado e cancelar quando confirm=false');
    assert.equal(envLoc.el('aprForm_local').value, 'Preenchimento do engenheiro', 'Não deve limpar aprForm_local ao cancelar');
}

// 5.5. Sonda Preservação de Linha Parcial (só com medidas_prevencao e p_puro) + Incorporação só após salvar APR
{
    const envParc = criarAmbienteTeste();
    envParc.contexto.renderIaAprendizadoPanel();
    envParc.contexto.importarRespostaIaParaFila(JSON.stringify([{
        passo_tarefa: 'Limpeza de canaleta',
        perigo_fonte: 'Pedras soltas',
        epis_sugeridos: ['Perneira 3 Talas'],
        gatilhos: ['canaleta']
    }]), null);
    const getSaved = () => JSON.parse([...envParc.storage.values()][0]);
    const idSug = getSaved().sugestoesFila[0].id;
    envParc.contexto.aprovarSugestaoIa(idSug);

    envParc.contexto.aprRiscosForm = [{
        passo_tarefa: '',
        perigo_fonte: '',
        medidas_prevencao: 'Nota importante do engenheiro',
        p_puro: 4
    }];
    const resEnv = envParc.contexto.enviarRiscosAprovadosParaApr('acrescentar');
    assert.equal(resEnv.linhasInjetadas, 1);
    assert.equal(envParc.contexto.aprRiscosForm.some(x => x.medidas_prevencao === 'Nota importante do engenheiro'), true, 'Linha parcial com nota do engenheiro deve ser preservada!');
    assert.equal(envParc.el('aprFormRiscosLista').innerHTML.includes('Nota importante do engenheiro'), true, 'renderRiscosAprForm real deve renderizar a linha parcial preservada');

    // Antes de salvar a APR, o status deve continuar APROVADO (com status_transferencia EM_RASCUNHO_APR), nunca INCORPORADO_APR!
    assert.equal(getSaved().sugestoesFila[0].status, 'APROVADO');
    assert.equal(getSaved().sugestoesFila[0].status_transferencia, 'EM_RASCUNHO_APR');

    // Somente após confirmar o salvamento da APR com ID real o status passa a INCORPORADO_APR
    const confirmados = envParc.contexto.confirmarIncorporacaoAprSalva('APR-2026-077');
    assert.equal(confirmados, 1);
    assert.equal(getSaved().sugestoesFila[0].status, 'INCORPORADO_APR');
    assert.equal(getSaved().sugestoesFila[0].incorporado_apr_id, 'APR-2026-077');
}

// 5.6. Isolamento entre Cenários na Transferência (não misturar sugestões de cenários diferentes)
{
    const envIso = criarAmbienteTeste();
    const cen1 = envIso.contexto.salvarContextoOperacional({ cargo_equipe: 'Cenário Civil', frente_servico: 'Frente 1' });
    const cen2 = envIso.contexto.salvarContextoOperacional({ cargo_equipe: 'Cenário Elétrica', frente_servico: 'Subestação' });

    envIso.contexto.importarRespostaIaParaFila(JSON.stringify([{
        passo_tarefa: 'Roço no canal',
        perigo_fonte: 'Foice',
        gatilhos: ['foice']
    }]), cen1.id);
    envIso.contexto.importarRespostaIaParaFila(JSON.stringify([{
        passo_tarefa: 'Manobra em painel QGBT',
        perigo_fonte: 'Arco elétrico',
        gatilhos: ['qgbt']
    }]), cen2.id);

    const getSaved = () => JSON.parse([...envIso.storage.values()][0]);
    for (const s of getSaved().sugestoesFila) {
        envIso.contexto.aprovarSugestaoIa(s.id);
    }

    // Seleciona apenas o Cenário Civil (cen1) e envia para APR: o risco do Cenário Elétrica (cen2) NÃO pode entrar!
    envIso.contexto.selecionarContextoIaAprendizado(cen1.id);
    const res = envIso.contexto.enviarRiscosAprovadosParaApr('acrescentar');
    assert.equal(res.linhasInjetadas, 1);
    assert.equal(envIso.contexto.aprRiscosForm.length, 1);
    assert.equal(envIso.contexto.aprRiscosForm[0].passo_tarefa, 'Roço no canal');
}

// 6. Reprodução das 3 sondas da Reauditoria 10:35 (salvarApr real bloqueado, QuotaExceededError em 'nova', e sugestão sem contexto em outro cenário) + Rollback de lote parcial
async function testarReauditoria1035() {
    // 6.1. salvarApr real bloqueado com aprForm_id='APR_ANTIGA' e status='✅ APR salva.' não pode marcar INCORPORADO_APR
    const e = criarAmbienteTeste();
    e.contexto.renderIaAprendizadoPanel();
    e.contexto.importarRespostaIaParaFila(JSON.stringify([{ passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras' }]), null);
    const getE = () => JSON.parse([...e.storage.values()][0]);
    e.contexto.aprovarSugestaoIa(getE().sugestoesFila[0].id);
    e.contexto.enviarRiscosAprovadosParaApr('acrescentar');
    e.el('aprForm_id').value = 'APR_ANTIGA';
    e.el('aprFormStatus').textContent = '✅ APR salva.';
    e.contexto.bloquearEdicaoSeNaoAutorizado = () => true;
    await e.contexto.salvarApr();
    assert.equal(getE().sugestoesFila[0].status, 'APROVADO', 'salvarApr bloqueado não pode promover a INCORPORADO_APR');
    assert.equal(getE().sugestoesFila[0].incorporado_apr_id, undefined);

    // Quando salvarApr real é autorizado e realmente persiste em allAprRegistros, aí sim marca INCORPORADO_APR com o ID real salvo!
    e.contexto.bloquearEdicaoSeNaoAutorizado = () => false;
    e.el('aprForm_id').value = '';
    e.el('aprForm_numero').value = 'APR-2026-100';
    e.el('aprForm_dataEmissao').value = '2026-11-17';
    e.el('aprForm_titulo').value = 'APR Oficial Validada';
    await e.contexto.salvarApr();
    assert.equal(getE().sugestoesFila[0].status, 'INCORPORADO_APR');
    assert.equal(getE().sugestoesFila[0].incorporado_apr_id, 'APR-2026-100');

    // 6.2. QuotaExceededError no modo 'nova' não pode apagar o título nem o rascunho da APR!
    const f = criarAmbienteTeste();
    f.contexto.renderIaAprendizadoPanel();
    f.contexto.importarRespostaIaParaFila(JSON.stringify([{ passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras' }]), null);
    const getF = () => JSON.parse([...f.storage.values()][0]);
    f.contexto.aprovarSugestaoIa(getF().sugestoesFila[0].id);
    f.el('aprForm_titulo').value = 'RASCUNHO IMPORTANTE';
    f.contexto.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.throws(() => f.contexto.enviarRiscosAprovadosParaApr('nova'), /QuotaExceededError/);
    assert.equal(f.el('aprForm_titulo').value, 'RASCUNHO IMPORTANTE', 'Título do rascunho deve permanecer intacto após QuotaExceededError');
    assert.equal(f.contexto.aprRiscosForm.length, 0);

    // 6.3. Sugestão sem contexto (null) não entra automaticamente quando outro cenário é selecionado
    const g = criarAmbienteTeste();
    g.contexto.renderIaAprendizadoPanel();
    g.contexto.importarRespostaIaParaFila(JSON.stringify([{ passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras' }]), null);
    const getG = () => JSON.parse([...g.storage.values()][0]);
    g.contexto.aprovarSugestaoIa(getG().sugestoesFila[0].id);
    g.contexto.salvarContextoOperacional({ cargo_equipe: 'OUTRO CENARIO' });
    const resOutro = g.contexto.enviarRiscosAprovadosParaApr('acrescentar');
    assert.equal(resOutro.linhasInjetadas, 0, 'Sugestão sem contexto não deve entrar automaticamente em OUTRO CENARIO');

    // 6.4. Lote com item #1 válido e item #2 inválido reverte memória (sem deixar item #1 parcial)
    const h = criarAmbienteTeste();
    h.contexto.renderIaAprendizadoPanel();
    assert.throws(() => h.contexto.importarRespostaIaParaFila(JSON.stringify([
        { passo_tarefa: 'Item 1 válido', perigo_fonte: 'Perigo 1' },
        { passo_tarefa: 'Item 2 inválido', perigo_fonte: '', campo_proibido: 123 }
    ]), null), /Campo não permitido/);
    h.contexto.selecionarAbaIaAprendizado('fila');
    assert.doesNotMatch(h.el('page-ia_aprendizado').innerHTML, /Item 1 válido/, 'Item 1 não pode ficar órfão em memória quando o item 2 falha');

    // 7. Reauditoria 11:11 — Fluxo completo de UI: Editar Cenário Existente + Ajustar Sugestão antes de Aprovar
    const u = criarAmbienteTeste({ uid: 'uid_editor_150', matricula: '150', nome: 'Técnico Editor', tipo: 'interno' });
    u.contexto.renderIaAprendizadoPanel();

    // 7.1. Importa/cria cenário completo com fases, ferramentas, perigos, EPIs, GHE e diretrizes
    const cenCompleto = u.contexto.importarExemploDeTextoOuJson(JSON.stringify({
        codigo_cenario: 'CEN-TALUDE-01',
        cargo_equipe: 'Servente - Equipe Civil',
        ghe_codigo: 'GHE-04',
        frente_servico: 'Taludes Enrocados e Drenagem',
        fonte_procedimento: 'PR-SST-018 Rev.02',
        rotina_detalhada: 'Roço manual e limpeza de drenagem.',
        fases_operacionais: {
            DESLOCAMENTO_ACESSO: 'Acesso por berma com caminhão cabine',
            VIVENCIA_APOIO: 'Tenda ancorada e banheiro químico nivelado',
            EXECUCAO_FERRAMENTAS: 'Uso de chibanca, foice e estrovenga',
            AMBIENTE_INTERFERENCIAS: 'Blocos de rocha soltos e fauna peçonhenta',
            EMERGENCIA_RESGATE: 'Rádio VHF canal 3 e veículo de prontidão'
        },
        ferramentas_reais: ['Chibanca', 'Foice', 'Estrovenga'],
        perigos_observados: ['Pedras soltas no talude', 'Animais peçonhentos nas frestas'],
        epis_validados: ['Perneira 3 Talas', 'Capacete com Jugular'],
        regras_engenheiro: 'Manter distanciamento seguro entre operadores de ferramentas de corte.'
    }), 'talude.json');

    u.contexto.renderIaAprendizadoPanel();
    assert.match(u.el('page-ia_aprendizado').innerHTML, /✏️ Editar Cenário/, 'Card de cenário deve exibir botão ✏️ Editar Cenário');

    // Abre modal de edição na UI e popula os elementos do formulário no DOM simulado
    u.contexto.abrirModalNovoContextoIa(cenCompleto.id);
    assert.equal(u.el('boxModalContextoIa').style.display, 'block');
    assert.match(u.el('boxModalContextoIa').innerHTML, /formCtx_ferramentas/);
    assert.match(u.el('boxModalContextoIa').innerHTML, /formCtx_fase_DESLOCAMENTO_ACESSO/);

    // Simula os elementos filhos criados no modal com os valores preenchidos pelo abrirModalNovoContextoIa
    u.el('formCtx_id').value = cenCompleto.id;
    u.el('formCtx_versao').value = String(cenCompleto.versao);
    u.el('formCtx_cargo').value = 'Servente - Equipe Civil (Revisado na UI)';
    u.el('formCtx_ghe').value = 'GHE-04';
    u.el('formCtx_frente').value = 'Taludes Enrocados e Drenagem';
    u.el('formCtx_fonte').value = 'PR-SST-018 Rev.03';
    u.el('formCtx_rotina').value = 'Roço manual e limpeza de drenagem com inspeção prévia.';
    u.el('formCtx_fase_DESLOCAMENTO_ACESSO').value = 'Acesso por berma com caminhão cabine';
    u.el('formCtx_fase_VIVENCIA_APOIO').value = 'Tenda ancorada e banheiro químico nivelado';
    u.el('formCtx_fase_EXECUCAO_FERRAMENTAS').value = 'Uso de chibanca, foice e estrovenga';
    u.el('formCtx_fase_AMBIENTE_INTERFERENCIAS').value = 'Blocos de rocha soltos e fauna peçonhenta';
    u.el('formCtx_fase_EMERGENCIA_RESGATE').value = 'Rádio VHF canal 3 e veículo de prontidão';
    u.el('formCtx_ferramentas').value = 'Chibanca, Foice, Estrovenga, Rastelo';
    u.el('formCtx_perigos').value = 'Pedras soltas no talude\nAnimais peçonhentos nas frestas';
    u.el('formCtx_epis').value = 'Perneira 3 Talas, Capacete com Jugular';
    u.el('formCtx_regras').value = 'Manter distanciamento seguro entre operadores de ferramentas de corte.';

    // Testa cancelar antes de salvar: fecha o modal sem mutar a versão
    u.contexto.fecharModalContextoIaUI();
    assert.equal(u.el('boxModalContextoIa').style.display, 'none');
    const getSavedU = () => JSON.parse([...u.storage.values()][0]);
    assert.equal(getSavedU().contextos[0].versao, 1, 'Cancelar modal não deve alterar versão do cenário');

    // Agora reabre e salva pela UI (salvarContextoIaFormUI)
    u.contexto.abrirModalNovoContextoIa(cenCompleto.id);
    u.contexto.salvarContextoIaFormUI();
    const cenSalvo = getSavedU().contextos[0];
    assert.equal(cenSalvo.versao, 2);
    assert.equal(cenSalvo.cargo_equipe, 'Servente - Equipe Civil (Revisado na UI)');
    assert.equal(cenSalvo.ghe_codigo, 'GHE-04');
    assert.equal(cenSalvo.fonte_procedimento, 'PR-SST-018 Rev.03');
    assert.deepEqual(Array.from(cenSalvo.ferramentas_reais), ['Chibanca', 'Foice', 'Estrovenga', 'Rastelo']);
    assert.deepEqual(Array.from(cenSalvo.perigos_observados), ['Pedras soltas no talude', 'Animais peçonhentos nas frestas']);
    assert.deepEqual(Array.from(cenSalvo.epis_validados), ['Perneira 3 Talas', 'Capacete com Jugular']);
    assert.equal(cenSalvo.fases_operacionais.DESLOCAMENTO_ACESSO, 'Acesso por berma com caminhão cabine');
    assert.equal(cenSalvo.regras_engenheiro, 'Manter distanciamento seguro entre operadores de ferramentas de corte.');

    // Testa também chamada parcial direta a salvarContextoOperacional({ id, cargo_equipe }): preserva todos os campos!
    u.contexto.salvarContextoOperacional({ id: cenCompleto.id, cargo_equipe: 'Servente - Equipe Civil (Final)', versaoEsperada: 2 });
    const cenAposParcial = getSavedU().contextos[0];
    assert.equal(cenAposParcial.versao, 3);
    assert.equal(cenAposParcial.ghe_codigo, 'GHE-04');
    assert.deepEqual(Array.from(cenAposParcial.ferramentas_reais), ['Chibanca', 'Foice', 'Estrovenga', 'Rastelo']);
    assert.equal(cenAposParcial.fases_operacionais.VIVENCIA_APOIO, 'Tenda ancorada e banheiro químico nivelado');

    // 7.2. Ajustar sugestão na UI (abrirAjusteSugestaoIaUI + salvarAjusteSugestaoIaUI) como editor e depois aprovar como validador
    u.contexto.executarVarreduraRiscosOcultos({});
    u.contexto.selecionarAbaIaAprendizado('fila');
    const htmlFila = u.el('page-ia_aprendizado').innerHTML;
    assert.match(htmlFila, /✏️ Ajustar Sugestão/, 'Card da fila deve exibir botão ✏️ Ajustar Sugestão para editor/validador');
    assert.match(htmlFila, /Evento de Risco:/, 'Card da fila deve exibir Evento de Risco');
    assert.match(htmlFila, /Danos Prováveis:/, 'Card da fila deve exibir Danos Prováveis');

    const idSugAlvo = getSavedU().sugestoesFila[0].id;
    u.contexto.abrirAjusteSugestaoIaUI(idSugAlvo);
    assert.equal(u.el('boxAjusteSugestao_' + idSugAlvo).style.display, 'block');
    assert.match(u.el('boxAjusteSugestao_' + idSugAlvo).innerHTML, new RegExp('ajSug_evento_' + idSugAlvo));

    // Testa cancelar ajuste sem mutar
    u.contexto.cancelarAjusteSugestaoIaUI(idSugAlvo);
    assert.equal(u.el('boxAjusteSugestao_' + idSugAlvo).style.display, 'none');
    assert.equal(getSavedU().sugestoesFila[0].status, 'RASCUNHO');

    // Reabre e salva ajuste pela UI
    u.contexto.abrirAjusteSugestaoIaUI(idSugAlvo);
    u.el('ajSug_versao_' + idSugAlvo).value = '1';
    u.el('ajSug_passo_' + idSugAlvo).value = 'Roço manual de talude enrocado';
    u.el('ajSug_perigo_' + idSugAlvo).value = 'Impacto de estrovenga em rocha oculta';
    u.el('ajSug_evento_' + idSugAlvo).value = 'Ricochete ou desvio da lâmina';
    u.el('ajSug_danos_' + idSugAlvo).value = 'Lesão cortante em membros inferiores';
    u.el('ajSug_medidas_' + idSugAlvo).value = 'Inspeção prévia visual da área, uso de perneira 3 talas e distanciamento seguro.';
    u.el('ajSug_fonte_' + idSugAlvo).value = 'PR-SST-018 / NR-18';
    u.el('ajSug_evidencia_' + idSugAlvo).value = 'Vistoria técnica no talude';
    u.el('ajSug_hipotese_' + idSugAlvo).value = 'Bloco de rocha encoberto por vegetação';
    u.el('ajSug_pergunta_' + idSugAlvo).value = 'Foi realizada varredura visual antes do corte?';
    u.el('ajSug_epis_' + idSugAlvo).value = 'Perneira 3 Talas, Botina de Segurança';
    u.el('ajSug_gatilhos_' + idSugAlvo).value = 'estrovenga, talude';
    u.el('ajSug_responsavel_' + idSugAlvo).value = 'Encarregado Civil';

    u.contexto.salvarAjusteSugestaoIaUI(idSugAlvo);
    const sugAposAjusteUI = getSavedU().sugestoesFila.find(s => s.id === idSugAlvo);
    assert.equal(sugAposAjusteUI.status, 'AJUSTADO', 'Salvar ajuste na UI deve manter status AJUSTADO sem aprovar automaticamente');
    assert.equal(sugAposAjusteUI.versao, 2);
    assert.equal(sugAposAjusteUI.acao_proposta.evento_risco, 'Ricochete ou desvio da lâmina');
    assert.equal(sugAposAjusteUI.acao_proposta.danos_provaveis, 'Lesão cortante em membros inferiores');
    assert.deepEqual(Array.from(sugAposAjusteUI.acao_proposta.epis_sugeridos), ['Perneira 3 Talas', 'Botina de Segurança']);

    // Como editor, tentar aprovar é bloqueado; quando habilitado como validador técnico (validador_ia_sst: true), aprova pela UI
    u.contexto.aprovarSugestaoIaUI(idSugAlvo, 2);
    assert.equal(getSavedU().sugestoesFila.find(s => s.id === idSugAlvo).status, 'AJUSTADO', 'Editor não pode aprovar sugestão');
    u.contexto.sessaoAtual.validador_ia_sst = true;
    u.contexto.aprovarSugestaoIaUI(idSugAlvo, 2);
    const sugAprovadaUI = getSavedU().sugestoesFila.find(s => s.id === idSugAlvo);
    assert.equal(sugAprovadaUI.status, 'APROVADO');
    assert.equal(sugAprovadaUI.versao, 3);

    // 8. Reprodução exata do caso operacional relatado por João (APR Nº 006 — CIVIL - MANUTENÇÃO (ESTRUTURAS)):
    // Verifica que os 4 perigos geram Passos da Tarefa, Eventos, Danos e Medidas DISTINTOS e específicos por perigo (zero repetição genérica)
    const m = criarAmbienteTeste();
    const cenCivil = m.contexto.salvarContextoOperacional({
        cargo_equipe: 'CIVIL - MANUTENÇÃO (ESTRUTURAS)',
        frente_servico: 'Estruturas',
        rotina_detalhada: 'Realização de manutenções nas infra-estruturas da obra (Canaletas de Drenagem, Bueiros e Caixas Coletoras, Pontos de Captação e Redes Locais)',
        perigos_observados: [
            'Movimentação de materiais',
            'Contato com Cimento',
            'Risco de Queda',
            'Risco de Choque elétrico'
        ],
        regras_engenheiro: 'Manter isolamento e sinalização ativa no entorno das valas e vias de acesso; inspecionar previamente o terreno quanto à estabilidade de taludes e animais peçonhentos; garantir o aterramento e a proteção das partes móveis da betoneira; utilizar todos os EPIs obrigatórios (incluindo perneira de segurança e máscara PFF2 no manuseio de cimento) e manter pausas para hidratação.'
    });

    m.contexto.executarVarreduraRiscosOcultos({});
    const getSavedM = () => JSON.parse([...m.storage.values()][0]);
    const filaCivil = getSavedM().sugestoesFila;
    assert.equal(filaCivil.length, 4);
    for (const s of filaCivil) {
        m.contexto.aprovarSugestaoIa(s.id);
    }

    const resAprCivil = m.contexto.enviarRiscosAprovadosParaApr('nova');
    assert.equal(resAprCivil.linhasInjetadas, 4);
    const riscosGerados = m.contexto.aprRiscosForm;
    assert.equal(riscosGerados.length, 4);

    // Nenhum risco pode ter o passo genérico repetido "Atividade de CIVIL - MANUTENÇÃO (ESTRUTURAS) em Estruturas"
    const passosUnicos = new Set(riscosGerados.map(r => r.passo_tarefa));
    assert.equal(passosUnicos.size, 4, 'Todos os 4 riscos devem ter Passos da Tarefa distintos e específicos');
    for (const r of riscosGerados) {
        assert.doesNotMatch(r.passo_tarefa, /^Atividade de /i, 'Não deve repetir Passo genérico Atividade de...');
        assert.notEqual(r.danos_provaveis, 'A avaliar pela Engenharia na APR', 'Danos prováveis devem ser específicos por perigo');
        assert.doesNotMatch(r.evento_risco, /^Exposi[cç][aã]o ou falha de barreira associada a:/i, 'Evento de risco deve ser específico por perigo');
    }

    // As medidas de prevenção também devem ser direcionadas por perigo (não repetir o mesmo texto inteiro nas 4 linhas)
    const medidasUnicas = new Set(riscosGerados.map(r => r.medidas_prevencao));
    assert.equal(medidasUnicas.size, 4, 'Cada risco deve receber medidas de prevenção específicas ao seu perigo');
    const riscoCimento = riscosGerados.find(r => /cimento/i.test(r.perigo_fonte));
    const riscoChoque = riscosGerados.find(r => /choque/i.test(r.perigo_fonte));
    assert.match(riscoCimento.medidas_prevencao, /PFF2|cimento/i);
    assert.doesNotMatch(riscoCimento.medidas_prevencao, /betoneira/i, 'Linha de Contato com Cimento não deve repetir cláusula de betoneira');
    assert.match(riscoChoque.medidas_prevencao, /aterramento|betoneira/i);

    // Testa também a migração/refino em tempo real de linhas legadas já abertas na APR preservando P×S preenchidos pelo usuário!
    m.contexto.aprRiscosForm = [
        {
            passo_tarefa: 'Atividade de CIVIL - MANUTENÇÃO (ESTRUTURAS) em Estruturas',
            perigo_fonte: 'Movimentação de materiais',
            evento_risco: 'Exposição ou falha de barreira associada a: Movimentação de materiais',
            danos_provaveis: 'A avaliar pela Engenharia na APR',
            p_puro: 3, s_puro: 3,
            medidas_prevencao: 'Texto repetido legado',
            p_residual: 1, s_residual: 2,
            responsavel: 'Definir na APR'
        }
    ];
    const resRefino = m.contexto.acionarAssistenteIaNaAprAtual();
    assert.equal(resRefino.refinados, 1);
    assert.match(m.contexto.aprRiscosForm[0].passo_tarefa, /Transporte manual/i);
    assert.equal(m.contexto.aprRiscosForm[0].p_puro, 3, 'Deve preservar P puro já preenchido pelo usuário');
    assert.equal(m.contexto.aprRiscosForm[0].s_residual, 2, 'Deve preservar S residual já preenchido pelo usuário');

    // 9. Consenso v3 (Usabilidade Aba 2, Modo 2 com Copiar + Prévia + Descarte P/S, Comparação APR em 4 blocos e Backup sem auto-aprovação)
    const v3 = criarAmbienteTeste();
    v3.contexto.allAprRegistros = [{
        id: '006',
        titulo: 'CIVIL - MANUTENÇÃO (ESTRUTURAS)',
        data_emissao: '2026-11-17',
        descricao_atividade: 'Manutenção em canaletas e bueiros',
        riscos: [
            { passo_tarefa: 'Acesso', perigo_fonte: 'Contato com Cimento', medidas_prevencao: 'Usar EPI', p_puro: '', s_puro: '', p_residual: '', s_residual: '' }
        ]
    }];

    // 9.1. Estado vazio na Aba 2: não fabrica riscos de frase solta, explica motivoZero, não mostra botão "Ir para a Aba 3", e inclui descrição no pacote do Modo 2
    v3.contexto.selecionarAbaIaAprendizado('analise');
    assert.match(v3.el('page-ia_aprendizado').innerHTML, /Nenhum cenário cadastrado neste navegador/);
    assert.match(v3.el('page-ia_aprendizado').innerHTML, /Copiar Pedido para IA/);
    assert.doesNotMatch(v3.el('page-ia_aprendizado').innerHTML, /100% Free/i);

    v3.el('inputTextoExtraAnaliseIa').value = 'Manutenção em bueiro com betoneira e vala';
    v3.contexto.atualizarTextoLivreAnaliseIaUI(v3.el('inputTextoExtraAnaliseIa').value);
    assert.match(v3.el('textareaPromptRagGerado').value, /Manutenção em bueiro com betoneira e vala/);

    v3.contexto.executarVarreduraIaUI();
    const htmlVazioAposScan = v3.el('page-ia_aprendizado').innerHTML;
    assert.match(htmlVazioAposScan, /Resultado: 0 rascunhos gerados/);
    assert.match(htmlVazioAposScan, /Nenhum cenário cadastrado na Aba 1/);
    assert.doesNotMatch(htmlVazioAposScan, /Ir para a Aba 3 revisar e aprovar/, 'Com 0 rascunhos gerados não deve exibir botão para Aba 3');

    // 9.2. Iniciar rascunho de cenário direto da descrição na Aba 2 sem sair dela
    v3.contexto.criarRascunhoCenarioDaDescricaoUI();
    const getSavedV3 = () => JSON.parse([...v3.storage.values()][0]);
    assert.equal(getSavedV3().contextos.length, 1);
    assert.equal(getSavedV3().contextos[0].status_cenario, 'RASCUNHO_NAO_APROVADO');
    assert.match(getSavedV3().contextos[0].rotina_detalhada, /betoneira/);

    // 9.3. Comparação com APR existente: seletor mostra número/título/data, separa em 4 blocos e preserva APR original
    v3.contexto.salvarContextoOperacional({
        id: getSavedV3().contextos[0].id,
        versaoEsperada: 1,
        cargo_equipe: 'Civil Estruturas',
        perigos_observados: ['Contato com Cimento', 'Risco de Choque elétrico']
    });
    v3.contexto.selecionarAprAuditoriaIa('006');
    assert.match(v3.el('page-ia_aprendizado').innerHTML, /APR Nº 006 — CIVIL - MANUTENÇÃO \(ESTRUTURAS\) \(Emissão: 2026-11-17\)/);
    v3.contexto.executarVarreduraIaUI();
    const htmlCompApr = v3.el('page-ia_aprendizado').innerHTML;
    assert.match(htmlCompApr, /1\. Perigos possivelmente ausentes/);
    assert.match(htmlCompApr, /2\. Medidas genéricas ou P×S incompleto na APR/);
    assert.match(htmlCompApr, /3\. Informações para confirmar em campo/);
    assert.match(htmlCompApr, /4\. Itens já contemplados na APR/);
    assert.match(htmlCompApr, /Ir para a Aba 3 revisar e aprovar/);
    assert.equal(v3.contexto.allAprRegistros[0].riscos.length, 1, 'Comparação não deve alterar a APR original');

    // 9.4. Modo 2: extrai lista cercada por texto livre (sem ```json), descarta P/S da IA e exige prévia antes de gravar na Aba 3
    const qtdFilaAntesPrevia = getSavedV3().sugestoesFila.length;
    v3.el('textareaRespostaIaImportar').value = 'Claro! Aqui estão os riscos sugeridos para sua revisão:\n' +
        JSON.stringify([{
            passo_tarefa: 'Acesso à borda da vala',
            perigo_fonte: 'Desmoronamento lateral',
            evento_risco: 'Soterramento parcial',
            danos_provaveis: 'Fraturas',
            medidas_prevencao: 'Implantar escoramento e manter bota-fora afastado.',
            p_puro: 4,
            s_puro: 5,
            p_residual: 1,
            s_residual: 2
        }]) + '\nEspero que ajude na elaboração da APR.';
    v3.contexto.preVisualizarRespostaIaUI();
    assert.equal(getSavedV3().sugestoesFila.length, qtdFilaAntesPrevia, 'Pré-visualizar NÃO deve gravar na fila antes da confirmação');
    assert.match(v3.el('page-ia_aprendizado').innerHTML, /Prévia dos Riscos Reconhecidos/);
    assert.match(v3.el('page-ia_aprendizado').innerHTML, /4 nota\(s\) de P\/S enviada\(s\) pela IA foram ignoradas/);

    v3.contexto.confirmarImportacaoPreviaIaUI();
    assert.equal(getSavedV3().sugestoesFila.length, qtdFilaAntesPrevia + 1);
    const sugImportadaV3 = getSavedV3().sugestoesFila[0];
    assert.equal(sugImportadaV3.status, 'RASCUNHO');
    assert.equal(sugImportadaV3.acao_proposta.p_puro, '');
    assert.equal(sugImportadaV3.acao_proposta.s_puro, '');
    assert.equal(sugImportadaV3.acao_proposta.p_residual, '');
    assert.equal(sugImportadaV3.acao_proposta.s_residual, '');

    // Helper para simular download de arquivo no ambiente VM
    function habilitarDownloadMock(envObj, downloadsRegistrados) {
        envObj.contexto.Blob = function (parts) { this.parts = parts; };
        envObj.contexto.URL = {
            createObjectURL: (blob) => 'blob:mock/' + String(blob.parts.join('').length),
            revokeObjectURL: () => {}
        };
        envObj.contexto.document.body = {
            appendChild: () => {},
            removeChild: () => {}
        };
        envObj.contexto.document.createElement = (tag) => {
            const elMock = { tagName: tag, href: '', download: '', click() { downloadsRegistrados.push({ nome: this.download, href: this.href }); } };
            return elMock;
        };
    }

    // 9.5. Backup e Restauração: só registra data quando download é iniciado, detecta alterações posteriores, gera cópia de segurança e NUNCA auto-aprova regras externas
    v3.contexto.aprovarSugestaoIa(sugImportadaV3.id);

    // Sem suporte a download: NÃO deve marcar ultimoBackupEm nem limpar alteracoesAposBackup!
    const bkpSemDownload = v3.contexto.exportarBackupCadernoIaUI();
    assert.equal(bkpSemDownload, null, 'Sem capacidade de download não deve confirmar exportação');
    assert.equal(getSavedV3().ultimoBackupEm, '', 'Falha de download não pode preencher ultimoBackupEm');
    assert.equal(getSavedV3().alteracoesAposBackup, true, 'Falha de download não pode limpar flag de alterações pendentes');

    // Com suporte a download: inicia download, preenche data e limpa flag
    const downloadsV3 = [];
    habilitarDownloadMock(v3, downloadsV3);
    const bkpExportado = v3.contexto.exportarBackupCadernoIaUI();
    assert.ok(bkpExportado && bkpExportado.json && bkpExportado.baixado === true);
    assert.equal(downloadsV3.length, 1);
    assert.equal(getSavedV3().alteracoesAposBackup, false, 'Logo após backup baixado não há alterações pendentes');
    assert.ok(getSavedV3().ultimoBackupEm);

    // Nova alteração após backup aciona aviso de alterações posteriores
    v3.contexto.salvarContextoOperacional({ cargo_equipe: 'Equipe Pós-Backup', frente_servico: 'Canal' });
    assert.equal(getSavedV3().alteracoesAposBackup, true);

    // Restaura esse backup em outro navegador limpo (modo substituir) -> regra aprovada no arquivo externo NÃO entra como regra ativa!
    const v3NovoPc = criarAmbienteTeste();
    v3NovoPc.contexto.salvarContextoOperacional({ cargo_equipe: 'Cenário Antigo Local', frente_servico: 'Frente X' });
    const previaBkp = v3NovoPc.contexto.analisarBackupCadernoLocal(bkpExportado.json);
    assert.equal(previaBkp.resumo.totalContextos, 1);
    assert.equal(previaBkp.resumo.totalRegras, 1);

    const resRest = v3NovoPc.contexto.aplicarRestauracaoBackupLocal(bkpExportado.json, 'substituir');
    assert.ok(resRest.copiaSegurancaAntes && resRest.copiaSegurancaAntes.json.includes('Cenário Antigo Local'), 'Modo substituir deve gerar cópia de segurança do estado anterior');
    const savedNovoPc = JSON.parse([...v3NovoPc.storage.values()][0]);
    assert.equal(savedNovoPc.regrasAprendidas.length, 0, 'Backup externo NÃO pode auto-aprovar regras na biblioteca ativa');
    assert.ok(savedNovoPc.sugestoesFila.length >= 1 && savedNovoPc.sugestoesFila.every(s => s.status === 'RASCUNHO'), 'Itens do backup devem entrar como RASCUNHO aguardando revalidação na Aba 3');

    // 10. Testes Adversos da Auditoria Codex v3-1436 (Bloqueios 1, 2, 3, 4 e Lacuna Mesclar)
    // 10.1. Bloqueio 1: Backup com objeto inválido, array misto ou versão desconhecida é recusado SEM esvaziar caderno em Substituir
    const adv1 = criarAmbienteTeste();
    adv1.contexto.salvarContextoOperacional({ cargo_equipe: 'Caderno Existente Protegido', rotina_detalhada: 'Conteúdo essencial' });
    const getSavedAdv1 = () => JSON.parse([...adv1.storage.values()][0]);

    const backupObjInvalido = JSON.stringify({ formato: 'ia_aprendizado_backup_v1', contextos: [{}] });
    assert.throws(() => adv1.contexto.analisarBackupCadernoLocal(backupObjInvalido), /sem Cargo \/ Equipe/i);
    assert.throws(() => adv1.contexto.aplicarRestauracaoBackupLocal(backupObjInvalido, 'substituir'), /sem Cargo \/ Equipe/i);
    assert.equal(getSavedAdv1().contextos.length, 1, 'Backup inválido não pode esvaziar o caderno existente');

    const backupArrayMisto = JSON.stringify({ formato: 'ia_aprendizado_backup_v1', contextos: [{ cargo_equipe: 'OK' }, 'invalido'] });
    assert.throws(() => adv1.contexto.analisarBackupCadernoLocal(backupArrayMisto), /não é um objeto válido/i);
    assert.throws(() => adv1.contexto.aplicarRestauracaoBackupLocal(backupArrayMisto, 'substituir'), /não é um objeto válido/i);
    assert.equal(getSavedAdv1().contextos.length, 1);

    const backupVersaoDesconhecida = JSON.stringify({ formato: 'ia_aprendizado_backup_v99', contextos: [{ cargo_equipe: 'Futuro' }] });
    assert.throws(() => adv1.contexto.analisarBackupCadernoLocal(backupVersaoDesconhecida), /Formato ou versão de backup não reconhecido/i);
    assert.equal(getSavedAdv1().contextos.length, 1);

    // 10.2. Bloqueio 2: Round-trip integral sem truncamento silencioso (rotina 6000 chars, 45 ferramentas, 45 perigos, regras longas) e JSON compacto
    const adv2 = criarAmbienteTeste();
    const rotinaLonga = 'R'.repeat(6000);
    const regrasLongas = 'D'.repeat(4000);
    const ferramentas45 = Array.from({ length: 45 }, (_, i) => 'Ferramenta ' + (i + 1));
    const perigos45 = Array.from({ length: 45 }, (_, i) => 'Perigo ' + (i + 1));
    adv2.contexto.salvarContextoOperacional({
        cargo_equipe: 'Cenário Extenso Round-Trip',
        frente_servico: 'Canal Principal',
        fonte_procedimento: 'P'.repeat(400),
        rotina_detalhada: rotinaLonga,
        ferramentas_reais: ferramentas45,
        perigos_observados: perigos45,
        regras_engenheiro: regrasLongas
    });
    const bkpLongo = adv2.contexto.gerarBackupCadernoLocal();
    assert.doesNotMatch(bkpLongo.json, /\n  /, 'Backup exportado deve ser compacto para não inflar além do teto de 200 KB');
    const adv2Destino = criarAmbienteTeste();
    adv2Destino.contexto.aplicarRestauracaoBackupLocal(bkpLongo.json, 'mesclar');
    const savedAdv2Dest = JSON.parse([...adv2Destino.storage.values()][0]);
    assert.equal(savedAdv2Dest.contextos[0].rotina_detalhada.length, 6000, 'Rotina longa não pode ser truncada silenciosamente');
    assert.equal(savedAdv2Dest.contextos[0].regras_engenheiro.length, 4000, 'Diretrizes longas não podem ser truncadas silenciosamente');
    assert.equal(savedAdv2Dest.contextos[0].fonte_procedimento.length, 400, 'Fonte documental não pode ser truncada silenciosamente');
    assert.equal(savedAdv2Dest.contextos[0].ferramentas_reais.length, 45, 'Lista de ferramentas não pode ser cortada em 40');
    assert.equal(savedAdv2Dest.contextos[0].perigos_observados.length, 45, 'Lista de perigos não pode ser cortada em 40');

    // 10.3. Lacuna Mesclar: Conflito de mesma identidade com conteúdo diferente exige escolha explícita (manter_existente, restaurar_copia, substituir_versao)
    const adv3 = criarAmbienteTeste();
    adv3.contexto.salvarContextoOperacional({ cargo_equipe: 'Versao1', frente_servico: 'F', rotina_detalhada: '' });
    const getSavedAdv3 = () => JSON.parse([...adv3.storage.values()][0]);
    const bkpConflitoObj = JSON.parse(adv3.contexto.gerarBackupCadernoLocal().json);
    bkpConflitoObj.contextos[0].rotina_detalhada = 'Atualizacao feita em outro computador';
    const bkpConflitoJson = JSON.stringify(bkpConflitoObj);

    const previaConflito = adv3.contexto.analisarBackupCadernoLocal(bkpConflitoJson);
    assert.equal(previaConflito.conflitosContexto.length, 1);
    assert.ok(previaConflito.conflitosContexto[0].camposDiferentes.includes('rotina_detalhada'));
    assert.throws(() => adv3.contexto.aplicarRestauracaoBackupLocal(bkpConflitoJson, 'mesclar'), /Conflito de versão detectado/i, 'Sem política explícita não deve descartar alteração do backup silenciosamente');

    // Política manter_existente
    const resManter = adv3.contexto.aplicarRestauracaoBackupLocal(bkpConflitoJson, 'mesclar', { politicaConflito: 'manter_existente' });
    assert.equal(resManter.contextosMantidosExistentes, 1);
    assert.equal(getSavedAdv3().contextos[0].rotina_detalhada, '');

    // Política restaurar_copia
    const resCopia = adv3.contexto.aplicarRestauracaoBackupLocal(bkpConflitoJson, 'mesclar', { politicaConflito: 'restaurar_copia' });
    assert.equal(resCopia.contextosCopiados, 1);
    assert.equal(getSavedAdv3().contextos.length, 2);
    assert.equal(getSavedAdv3().contextos[1].rotina_detalhada, 'Atualizacao feita em outro computador');

    // Política substituir_versao
    const adv3Sub = criarAmbienteTeste();
    adv3Sub.contexto.salvarContextoOperacional({ cargo_equipe: 'Versao1', frente_servico: 'F', rotina_detalhada: 'Antiga' });
    const resSubVer = adv3Sub.contexto.aplicarRestauracaoBackupLocal(bkpConflitoJson, 'mesclar', { politicaConflito: 'substituir_versao' });
    assert.equal(resSubVer.contextosAtualizados, 1);
    const savedAdv3Sub = JSON.parse([...adv3Sub.storage.values()][0]);
    assert.equal(savedAdv3Sub.contextos[0].rotina_detalhada, 'Atualizacao feita em outro computador');
    assert.equal(savedAdv3Sub.contextos[0].versao, 2);

    // 10.4. Capacidade (40 cenários e 80 sugestões): sem descarte silencioso ao mesclar
    const advCap = criarAmbienteTeste();
    for (let i = 1; i <= 40; i++) {
        advCap.contexto.salvarContextoOperacional({ cargo_equipe: 'Cenário Limite ' + i, frente_servico: 'F' + i });
    }
    const bkpExtraCtx = JSON.stringify({ formato: 'ia_aprendizado_backup_v1', contextos: [{ cargo_equipe: 'Cenário 41', frente_servico: 'F41' }] });
    const prevCapCtx = advCap.contexto.analisarBackupCadernoLocal(bkpExtraCtx);
    assert.equal(prevCapCtx.resumo.excedenteContextosMesclar, 1);
    assert.throws(() => advCap.contexto.aplicarRestauracaoBackupLocal(bkpExtraCtx, 'mesclar'), /Capacidade excedida.*41.*40/i);

    const advCapFila = criarAmbienteTeste();
    for (let i = 0; i < 4; i++) {
        const lote20 = Array.from({ length: 20 }, (_, j) => ({ passo_tarefa: 'Passo ' + i + '_' + j, perigo_fonte: 'Perigo ' + i + '_' + j }));
        advCapFila.contexto.importarRespostaIaParaFila(JSON.stringify(lote20), null);
    }
    const bkpExtraFila = JSON.stringify({
        formato: 'ia_aprendizado_backup_v1',
        sugestoesFila: [{ status: 'RASCUNHO', acao_proposta: { passo_tarefa: 'Passo 81', perigo_fonte: 'Perigo 81' } }]
    });
    const prevCapFila = advCapFila.contexto.analisarBackupCadernoLocal(bkpExtraFila);
    assert.equal(prevCapFila.resumo.excedenteFilaMesclar, 1);
    assert.throws(() => advCapFila.contexto.aplicarRestauracaoBackupLocal(bkpExtraFila, 'mesclar'), /Capacidade excedida.*81.*80/i);

    // 10.5. Bloqueio 3: Cópia de segurança disparada ANTES de substituir + falha de download ou cancelamento aborta sem apagar caderno
    const advSub = criarAmbienteTeste();
    advSub.contexto.salvarContextoOperacional({ cargo_equipe: 'Caderno Original Intocavel', frente_servico: 'Sede' });
    const getSavedAdvSub = () => JSON.parse([...advSub.storage.values()][0]);
    const bkpNovoSub = JSON.stringify({ formato: 'ia_aprendizado_backup_v1', contextos: [{ cargo_equipe: 'Caderno Novo Backup', frente_servico: 'Obra' }] });

    // 10.5a. Sem suporte a download -> aborta substituição e mantém caderno original
    advSub.el('textareaBackupIa').value = bkpNovoSub;
    advSub.contexto.preVisualizarBackupIaUI();
    advSub.contexto.confirmarRestauracaoBackupIaUI('substituir');
    assert.equal(getSavedAdvSub().contextos[0].cargo_equipe, 'Caderno Original Intocavel', 'Falha de download da cópia de segurança deve abortar substituição');

    // 10.5b. Com download OK mas confirm() = false -> aborta substituição e mantém caderno original
    const downloadsSub = [];
    habilitarDownloadMock(advSub, downloadsSub);
    advSub.contexto.confirm = () => false;
    advSub.contexto.confirmarRestauracaoBackupIaUI('substituir');
    assert.equal(downloadsSub.length, 1, 'Download da cópia de segurança deve ocorrer antes da confirmação final');
    assert.equal(getSavedAdvSub().contextos[0].cargo_equipe, 'Caderno Original Intocavel', 'Cancelar confirmação após download deve manter caderno original intacto');

    // 10.5c. Com download OK e confirm() = true -> download da cópia ocorre ANTES da mutação no storage
    const ordemEventosSub = [];
    advSub.contexto.document.createElement = () => ({
        href: '',
        download: '',
        click() {
            const atualNoClick = JSON.parse([...advSub.storage.values()][0]);
            ordemEventosSub.push('download_antes:' + atualNoClick.contextos[0].cargo_equipe);
        }
    });
    advSub.contexto.confirm = () => {
        const atualNoConfirm = JSON.parse([...advSub.storage.values()][0]);
        ordemEventosSub.push('confirm_antes:' + atualNoConfirm.contextos[0].cargo_equipe);
        return true;
    };
    advSub.contexto.confirmarRestauracaoBackupIaUI('substituir');
    assert.deepEqual(ordemEventosSub, [
        'download_antes:Caderno Original Intocavel',
        'confirm_antes:Caderno Original Intocavel'
    ], 'Cópia de segurança e confirmação devem ocorrer estritamente ANTES de substituir o caderno');
    assert.equal(getSavedAdvSub().contextos[0].cargo_equipe, 'Caderno Novo Backup');

    // 10.6. Rollback em falha de localStorage (QuotaExceededError) durante restauração
    const advQuota = criarAmbienteTeste();
    advQuota.contexto.salvarContextoOperacional({ cargo_equipe: 'Preservado Em Quota', frente_servico: 'A' });
    const setItemOrigQuota = advQuota.contexto.localStorage.setItem;
    advQuota.contexto.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.throws(() => advQuota.contexto.aplicarRestauracaoBackupLocal(bkpNovoSub, 'substituir'), /QuotaExceededError/);
    advQuota.contexto.localStorage.setItem = setItemOrigQuota;
    assert.equal(JSON.parse([...advQuota.storage.values()][0]).contextos[0].cargo_equipe, 'Preservado Em Quota');

    // 10.7. Bloqueio 4: Permissão revogada entre prévia e confirmação bloqueia gravação
    const advPerm = criarAmbienteTeste();
    advPerm.contexto.renderIaAprendizadoPanel();
    advPerm.el('textareaRespostaIaImportar').value = 'Aqui estão: [{"passo_tarefa":"Limpeza","perigo_fonte":"Pedras"}]';
    advPerm.contexto.preVisualizarRespostaIaUI();
    advPerm.contexto.permissaoGravacao.ia_aprendizado = false;
    advPerm.contexto.confirmarImportacaoPreviaIaUI();
    const savedAdvPerm = advPerm.storage.size ? JSON.parse([...advPerm.storage.values()][0]) : { sugestoesFila: [] };
    assert.equal(advPerm.contexto.obterPapelUsuarioIa(), 'leitor');
    assert.equal(savedAdvPerm.sugestoesFila.length, 0, 'Permissão revogada entre prévia e confirmação não pode gravar itens na fila');

    // 10.8. Troca de conta com prévia pendente bloqueia confirmação na conta nova
    const advConta = criarAmbienteTeste();
    advConta.contexto.renderIaAprendizadoPanel();
    advConta.el('textareaRespostaIaImportar').value = '[{"passo_tarefa":"Escavação","perigo_fonte":"Talude"}]';
    advConta.contexto.preVisualizarRespostaIaUI();
    // Troca de usuário para outra matrícula
    advConta.contexto.sessaoAtual.matricula = '999';
    advConta.contexto.sessaoAtual.email = 'outro@obra.local';
    advConta.contexto.confirmarImportacaoPreviaIaUI();
    const chaveOutro = 'sst_ia_apr_local_v2_999';
    assert.equal(advConta.storage.has(chaveOutro), false, 'Prévia gerada na conta A não pode ser gravada na conta B após troca de sessão');

    // 10.9. Sincronização entre duas abas antes de gerar backup
    const storageBkpSync = new Map();
    const abaBkp1 = criarAmbienteTeste(null, storageBkpSync);
    const abaBkp2 = criarAmbienteTeste(null, storageBkpSync);
    abaBkp1.contexto.salvarContextoOperacional({ cargo_equipe: 'Cenário Aba 1', frente_servico: 'F1' });
    abaBkp2.contexto.salvarContextoOperacional({ cargo_equipe: 'Cenário Aba 2', frente_servico: 'F2' });
    const bkpSync = abaBkp1.contexto.gerarBackupCadernoLocal();
    const bkpSyncParsed = JSON.parse(bkpSync.json);
    assert.equal(bkpSyncParsed.contextos.length, 2, 'Backup gerado na Aba 1 deve sincronizar antes do storage e incluir alteração da Aba 2');

    // 10.10. Ajustes da revisão Grok: residual igual à pura NÃO é erro (somente residual > pura) e falha de cópia avisa Ctrl+C
    const alertasResidualIgual = v3.contexto.auditarMedidasFracasApr({
        riscos: [
            { passo_tarefa: 'Escavação com escoramento', perigo_fonte: 'Talude', medidas_prevencao: 'Implantar escoramento metálico e escada de acesso fixa.', p_puro: 3, s_puro: 3, p_residual: 3, s_residual: 3 },
            { passo_tarefa: 'Içamento crítico', perigo_fonte: 'Queda de carga', medidas_prevencao: 'Isolar raio de giro e inspecionar cintas antes do içamento.', p_puro: 3, s_puro: 3, p_residual: 4, s_residual: 3 }
        ]
    });
    assert.equal(alertasResidualIgual.length, 1, 'Residual igual à pura (3x3 vs 3x3) não deve gerar alerta; somente residual > pura');
    assert.match(alertasResidualIgual[0].motivo, /superior à pura/i);

    v3.el('statusCopiaPromptIa').textContent = '';
    v3.contexto.copiarPacotePromptIaUI();
    assert.match(v3.el('statusCopiaPromptIa').textContent, /Ctrl\+C/i, 'Quando o navegador recusa cópia, não deve afirmar Pedido copiado');

    // 10.11. Reauditoria Codex v3/15:09: preservar riscos distintos com mesma etapa/perigo mas eventos/medidas diferentes
    // 10.11a. Ida/volta 2->2 (mesmo passo/perigo, eventos e medidas diferentes)
    const advDup = criarAmbienteTeste();
    advDup.contexto.importarRespostaIaParaFila(JSON.stringify([
        { passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras', evento_risco: 'Projecao', medidas_prevencao: 'Controle A' },
        { passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras', evento_risco: 'Queda', medidas_prevencao: 'Controle B' }
    ]), null);
    const bkpDoisDistintos = advDup.contexto.gerarBackupCadernoLocal();
    const advDupDest = criarAmbienteTeste();
    const prevDoisDistintos = advDupDest.contexto.analisarBackupCadernoLocal(bkpDoisDistintos.json);
    assert.equal(prevDoisDistintos.resumo.totalItensRevalidacao, 2, 'Prévia deve preservar ambos os riscos distintos com mesma etapa/perigo');
    assert.equal(prevDoisDistintos.resumo.itensDuplicadosNoArquivo, 0);
    advDupDest.contexto.aplicarRestauracaoBackupLocal(bkpDoisDistintos.json, 'substituir');
    const savedDoisDistintos = JSON.parse([...advDupDest.storage.values()][0]);
    assert.equal(savedDoisDistintos.sugestoesFila.length, 2, 'Restauração deve manter 2->2 sem fundir Controle A e Controle B');
    const controlesRest = savedDoisDistintos.sugestoesFila.map(s => s.acao_proposta.medidas_prevencao).sort();
    assert.deepEqual(controlesRest, ['Controle A', 'Controle B']);

    // 10.11b. Duplicata integral 2->1 explicitamente informada na prévia
    const bkpDupIntegral = JSON.stringify({
        formato: 'ia_aprendizado_backup_v1',
        sugestoesFila: [
            { id: 's1', status: 'RASCUNHO', contexto_id: null, fase_operacional: 'EXECUCAO_FERRAMENTAS', acao_proposta: { passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras', evento_risco: 'Projecao', medidas_prevencao: 'Controle A' } },
            { id: 's2', status: 'RASCUNHO', contexto_id: null, fase_operacional: 'EXECUCAO_FERRAMENTAS', acao_proposta: { passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras', evento_risco: 'Projecao', medidas_prevencao: 'Controle A' } }
        ]
    });
    const prevDupIntegral = advDupDest.contexto.analisarBackupCadernoLocal(bkpDupIntegral);
    assert.equal(prevDupIntegral.resumo.totalItensRevalidacao, 1, 'Duplicata integral 2->1 deve resultar em 1 item');
    assert.equal(prevDupIntegral.resumo.itensDuplicadosNoArquivo, 1, 'Prévia deve informar explicitamente 1 duplicata integral unificada');

    // 10.11c. Merge em caderno com mesmo passo/perigo (e até mesmo ID) mas medida diferente preserva ambos
    const advMergeDiff = criarAmbienteTeste();
    advMergeDiff.contexto.importarRespostaIaParaFila(JSON.stringify([
        { passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras', evento_risco: 'Projecao', medidas_prevencao: 'Controle A' }
    ]), null);
    const idExistenteMerge = JSON.parse([...advMergeDiff.storage.values()][0]).sugestoesFila[0].id;
    const bkpMesmoIdMedidaDiff = JSON.stringify({
        formato: 'ia_aprendizado_backup_v1',
        sugestoesFila: [
            { id: idExistenteMerge, status: 'RASCUNHO', contexto_id: null, fase_operacional: 'EXECUCAO_FERRAMENTAS', acao_proposta: { passo_tarefa: 'Limpeza', perigo_fonte: 'Pedras', evento_risco: 'Queda', medidas_prevencao: 'Controle B' } }
        ]
    });
    const prevMergeDiff = advMergeDiff.contexto.analisarBackupCadernoLocal(bkpMesmoIdMedidaDiff);
    assert.equal(prevMergeDiff.resumo.filaDuplicados, 0, 'Medida diferente com mesmo passo/perigo/ID não é duplicata integral');
    assert.equal(prevMergeDiff.resumo.itensMesmoPassoPerigoConteudoDiferente, 1, 'Prévia deve destacar item com mesma etapa/perigo e conteúdo distinto');
    advMergeDiff.contexto.aplicarRestauracaoBackupLocal(bkpMesmoIdMedidaDiff, 'mesclar');
    const filaAposMergeDiff = JSON.parse([...advMergeDiff.storage.values()][0]).sugestoesFila;
    assert.equal(filaAposMergeDiff.length, 2, 'Merge deve preservar Controle A e Controle B sem sobrescrever');
    assert.deepEqual(filaAposMergeDiff.map(s => s.acao_proposta.medidas_prevencao).sort(), ['Controle A', 'Controle B']);

    // 10.11d. Capacidade reavaliada considerando itens distintos (79 + 2 = 81 > 80 -> bloqueia sem cortar)
    const advCapDiff = criarAmbienteTeste();
    for (let i = 0; i < 3; i++) {
        const lote20 = Array.from({ length: 20 }, (_, j) => ({ passo_tarefa: 'Etapa ' + i + '_' + j, perigo_fonte: 'Perigo ' + i + '_' + j }));
        advCapDiff.contexto.importarRespostaIaParaFila(JSON.stringify(lote20), null);
    }
    const lote19 = Array.from({ length: 19 }, (_, j) => ({ passo_tarefa: 'Etapa 3_' + j, perigo_fonte: 'Perigo 3_' + j }));
    advCapDiff.contexto.importarRespostaIaParaFila(JSON.stringify(lote19), null);
    assert.equal(JSON.parse([...advCapDiff.storage.values()][0]).sugestoesFila.length, 79);
    const prevCapDiff = advCapDiff.contexto.analisarBackupCadernoLocal(bkpDoisDistintos.json);
    assert.equal(prevCapDiff.resumo.excedenteFilaMesclar, 1, '79 + 2 distintos = 81 (excedente 1)');
    assert.throws(() => advCapDiff.contexto.aplicarRestauracaoBackupLocal(bkpDoisDistintos.json, 'mesclar'), /Capacidade excedida.*81.*80/i);
    assert.equal(JSON.parse([...advCapDiff.storage.values()][0]).sugestoesFila.length, 79, 'Bloqueio por capacidade preserva os 79 itens intactos');
}

testarReauditoria1035().then(() => {
    console.log('✅ ia_aprendizado_apr.test.cjs: todos os bloqueios e sondas da auditoria Codex + Grok corrigidos e aprovados!');
}).catch(err => {
    console.error(err);
    process.exit(1);
});
