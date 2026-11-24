const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const painelDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(painelDir, 'index.html'), 'utf8');
const mapaCode = fs.readFileSync(path.join(painelDir, 'modules', 'ia_mapa_mental.js'), 'utf8');
const iaCode = fs.readFileSync(path.join(painelDir, 'modules', 'ia_aprendizado.js'), 'utf8');
const aprCode = fs.readFileSync(path.join(painelDir, 'modules', 'apr_cipa.js'), 'utf8');

function criarAmbienteMapa(sessaoInicial, opcoesEnv) {
    opcoesEnv = opcoesEnv || {};
    const storage = opcoesEnv.storage || new Map();
    const elementos = new Map();
    const gheCatalogo = opcoesEnv.allGheCatalogo || [
        { id: 'GHE-07', nome: 'Roçagem e Manutenção Civil', cargos: ['Servente', 'Encarregado de Campo'] },
        { id: 'GHE-02', nome: 'Transporte e Apoio', cargos: ['Motorista de Veículo pesado'] }
    ];
    const gheSnapshotInicial = JSON.stringify(gheCatalogo);

    function el(id) {
        if (!elementos.has(id)) {
            elementos.set(id, {
                id,
                value: '',
                checked: false,
                innerHTML: '',
                textContent: '',
                style: { display: 'block' },
                click() {},
                select() {}
            });
        }
        return elementos.get(id);
    }

    el('page-ia_aprendizado');
    const blobs = [];
    const downloads = [];
    const impressoes = [];
    const alertas = [];

    const contexto = vm.createContext({
        window: null,
        document: {
            body: {
                appendChild(node) { contexto._ultimoLink = node; },
                removeChild() {}
            },
            createElement(tag) {
                return {
                    tagName: String(tag).toUpperCase(),
                    href: '',
                    download: '',
                    click() {
                        downloads.push({ href: this.href, download: this.download });
                    }
                };
            },
            getElementById: id => el(id),
            querySelectorAll: sel => {
                if (sel && sel.includes('mmRamoEtapaCb')) return contexto._cbEtapas || [];
                if (sel && sel.includes('mmRamoFuncaoCb')) return contexto._cbFuncoes || [];
                if (sel && sel.includes('mmRamoFerramentaCb')) return contexto._cbFerramentas || [];
                if (sel && sel.includes('mmRecFuncaoCb')) return contexto._cbRecFuncoes || [];
                if (sel && sel.includes('mmRecEtapaCb')) return contexto._cbRecEtapas || [];
                return [];
            },
            execCommand: () => false
        },
        localStorage: {
            getItem: k => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => {
                if (contexto._forcarErroQuota) {
                    throw new Error('QuotaExceededError');
                }
                storage.set(k, String(v));
            }
        },
        Blob: function FakeBlob(partes, opts) {
            this.conteudo = partes.join('');
            this.type = opts && opts.type ? opts.type : '';
            blobs.push(this.conteudo);
        },
        URL: {
            createObjectURL: blob => 'blob:teste/' + blobs.length + ':' + blob.conteudo.length,
            revokeObjectURL: () => {}
        },
        setTimeout: fn => fn(),
        TextEncoder,
        SUPER_ADMIN_MATRICULAS: ['76'],
        sessaoAtual: sessaoInicial === undefined
            ? { uid: 'uid_joao_76', matricula: '76', nome: 'João Everton', tipo: 'interno', ver_todos: true }
            : sessaoInicial,
        permissaoModulo: { ia_aprendizado: true, apr: true },
        permissaoGravacao: { ia_aprendizado: true, apr: true },
        sessaoDashboardAtual: () => contexto.sessaoAtual,
        moduloPermitidoPainel: mod => contexto.permissaoModulo[mod] !== false,
        usuarioPodeGravarModulo: mod => !!contexto.permissaoGravacao[mod],
        escapeHTML: v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
        allGheCatalogo: gheCatalogo,
        allEfetivo: [],
        allAprRegistros: [],
        aprRiscosForm: [],
        abrirDocumentoHtmlParaImpressao: (docHtml, docTitulo) => {
            impressoes.push({ html: docHtml, titulo: docTitulo });
        },
        alert: msg => alertas.push(msg),
        confirm: () => (contexto._confirmRet !== undefined ? contexto._confirmRet : true),
        prompt: () => (contexto._promptRet !== undefined ? contexto._promptRet : ''),
        Date, Math, JSON, Array, Object, Set, Map, RegExp, Error, Number, String, Boolean, parseInt
    });
    contexto.window = contexto;

    // Carrega funções mínimas do legado (para testar integração das 4 abas e isolamento total do backup v1)
    vm.runInContext(mapaCode, contexto);
    vm.runInContext(iaCode, contexto);

    return {
        w: contexto,
        el,
        storage,
        blobs,
        downloads,
        impressoes,
        alertas,
        gheSnapshotInicial
    };
}

test('1. Verificações estáticas, cache-buster e restrições de governança', () => {
    assert.match(html, /modules\/ia_mapa_mental\.js\?v=2/, 'ia_mapa_mental.js?v=2 deve estar carregado no HTML');
    assert.match(html, /modules\/ia_aprendizado\.js\?v=5/, 'ia_aprendizado.js?v=5 deve estar atualizado no HTML');
    assert.match(html, /modules\/apr_cipa\.js\?v=297/, 'apr_cipa.js?v=297 acompanha o campo de risco novo da APR');
    const posMapa = html.indexOf('modules/ia_mapa_mental.js?v=2');
    const posIa = html.indexOf('modules/ia_aprendizado.js?v=5');
    assert.ok(posMapa > 0 && posIa > posMapa, 'ia_mapa_mental.js deve carregar antes de ia_aprendizado.js');

    assert.doesNotMatch(mapaCode, /window\.open\s*\(/, 'Proibido usar window.open');
    assert.doesNotMatch(mapaCode, /configuracoes_sistema/, 'Proibido usar configuracoes_sistema');
    assert.doesNotMatch(mapaCode, /engmed/i, 'Proibido citar clínica externa');
    assert.doesNotMatch(mapaCode, /generativelanguage\.googleapis\.com|api\.groq\.com|api\.openai\.com/, 'Sem URLs de API de LLM');
    assert.doesNotMatch(mapaCode, /5\s*metros|dist[aâ]ncia m[ií]nima obrigat[oó]ria de 5/i, 'Sem distância fixa de 5 metros');
    assert.doesNotMatch(mapaCode, /\b(aprRiscosForm|allAprRegistros|episParaMarcar|aprEpiBasicoCheckbox|aprEpiEspecificoCheckbox)\b/, 'Fase 1 Opção A não pode ler/escrever campos da APR oficial');
    assert.doesNotMatch(aprCode, /ia_mapa_mental|sst_ia_mapa_mental_v1/, 'APR oficial permanece totalmente isolada do novo Mapa Mental na Fase 1');
    assert.doesNotMatch(mapaCode, /construirPropostaTecnicaPorPerigo/, 'Não pode disparar preenchimento automático por palavra-chave');
    assert.doesNotMatch(mapaCode, /ctx_rascunho_servente_civil|Remoção de vegetação Regenerada/i, 'Sem semente hardcoded do exemplo do Roço');
});

test('2. Isolamento completo do módulo legado e navegação entre as 4 abas', () => {
    const env = criarAmbienteMapa();
    const { w, storage, el } = env;

    // Cria um cenário legado na Aba 1
    const ctxLegado = w.salvarContextoOperacional({ cargo_equipe: 'Eletricista', frente_servico: 'Subestação' });
    assert.equal(ctxLegado.cargo_equipe, 'Eletricista');

    // Cria mapa no novo módulo adicional
    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Atividade Fictícia de Teste',
        funcoes_texto: 'Operador A\nAuxiliar B'
    });
    assert.equal(mapa.status_mapa, 'RASCUNHO_MAPA');

    // Chaves de armazenamento são totalmente independentes
    const chaves = Array.from(storage.keys());
    assert.ok(chaves.some(k => k.startsWith('sst_ia_apr_local_v2_')));
    assert.ok(chaves.some(k => k.startsWith('sst_ia_mapa_mental_v1_')));

    // Legado permanece intocado
    const legSalvo = JSON.parse(storage.get('sst_ia_apr_local_v2_interno_uid_joao_76_76'));
    assert.equal(legSalvo.contextos.length, 1);
    assert.equal(legSalvo.regrasAprendidas.length, 0);
    assert.equal(legSalvo.sugestoesFila.length, 0);

    // Alterna entre todas as 4 abas da UI sem erro e renderiza o mapa na aba "mapa"
    w.renderIaAprendizadoPanel();
    assert.match(el('page-ia_aprendizado').innerHTML, /btnTabIa-mapa/);
    w.selecionarAbaIaAprendizado('mapa');
    assert.match(el('page-ia_aprendizado').innerHTML, /Atividade Fictícia de Teste/);
    w.selecionarAbaIaAprendizado('exemplos');
    assert.match(el('page-ia_aprendizado').innerHTML, /Eletricista/);
    w.selecionarAbaIaAprendizado('analise');
    w.selecionarAbaIaAprendizado('fila');
});

test('3. Controle de papéis, concorrência entre abas, cota 200 KB e rollback de QuotaExceededError', () => {
    // Sem sessão
    const envSem = criarAmbienteMapa(null);
    assert.equal(envSem.w.obterPapelMapaMentalIa(), 'sem_sessao');
    assert.throws(() => envSem.w.criarOuAtualizarMapaMental({ atividade: 'Teste' }), /Permissão negada/);

    // Leitor somente leitura
    const envLeitor = criarAmbienteMapa({ uid: 'u2', matricula: '200', tipo: 'painel_externo', somente_leitura: true });
    envLeitor.w.permissaoGravacao.ia_aprendizado = false;
    assert.equal(envLeitor.w.obterPapelMapaMentalIa(), 'leitor');
    assert.throws(() => envLeitor.w.criarOuAtualizarMapaMental({ atividade: 'Teste' }), /Permissão negada/);

    // Concorrência entre duas abas compartilhando o mesmo localStorage
    const sharedStorage = new Map();
    const abaA = criarAmbienteMapa(undefined, { storage: sharedStorage });
    const abaB = criarAmbienteMapa(undefined, { storage: sharedStorage });

    const mapaA = abaA.w.criarOuAtualizarMapaMental({ atividade: 'Roço em Canal Teste' });
    assert.equal(mapaA.versao, 1);
    abaA.w.criarOuAtualizarMapaMental({ id: mapaA.id, versaoEsperada: 1, atividade: 'Roço em Canal Teste v2' });
    assert.throws(
        () => abaB.w.criarOuAtualizarMapaMental({ id: mapaA.id, versaoEsperada: 1, atividade: 'Sobrescrita antiga' }),
        /Conflito de edição concorrente/
    );

    // Rollback integral em QuotaExceededError
    abaA.w._forcarErroQuota = true;
    assert.throws(
        () => abaA.w.salvarFuncaoMapa(mapaA.id, { nome: 'Função Não Salva' }),
        /Falha ao gravar no armazenamento local/
    );
    abaA.w._forcarErroQuota = false;
    assert.equal(abaA.w.obterEstadoMapaMentalIa().mapas[0].funcoes.length, 0);

    // Estouro > 200 KB UTF-8 revertido sem truncamento silencioso
    assert.throws(
        () => abaA.w.criarOuAtualizarMapaMental({ atividade: 'Texto gigante', observacoes_gerais: '⚡'.repeat(70000) }),
        /excedeu o limite de 200 KB UTF-8/
    );
    assert.equal(abaA.w.obterEstadoMapaMentalIa().mapas.length, 1);
});

test('4. Premissa operacional de João (APR única com funções distintas), GHE somente leitura, EPIs e Tabela', () => {
    const env = criarAmbienteMapa();
    const { w, el, gheSnapshotInicial } = env;

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Roço de Vegetação Teste',
        apr_referencia_texto: 'APR única equipe mista',
        funcoes_texto: 'Servente\nEncarregado de Campo\nMotorista de Veículo pesado',
        ferramentas_texto: 'Foice\nChibanca',
        etapas_texto: 'Deslocamento para frente de serviço\nLimpeza no talude',
        epis_obrigatorios_texto: 'Capacete\nPerneira',
        epis_eventuais_texto: 'Cinto de Segurança tipo paraquedista + talabarte',
        perigos_texto: 'Trânsito de veículos\nPedras soltas\nPedras soltas\nCorte e perfuração'
    });

    // Preserva textos exatos como NAO_AVALIADO e sem preencher evento/danos/medidas automaticamente
    assert.equal(mapa.funcoes.length, 3);
    assert.equal(mapa.perigos.length, 4);
    assert.ok(mapa.perigos.every(p => p.status === 'NAO_AVALIADO' && p.evento_risco === '' && p.danos_provaveis === ''));
    assert.ok(mapa.perigos.every(p => !p.medidas_nr01.eliminacao_substituicao && !p.medidas_nr01.epi_complementar));

    // EPI obrigatório vs EPI eventual com status_condicao PENDENTE != NAO_APLICAVEL
    const epiObrig = mapa.epis.find(e => e.nome === 'Capacete');
    const epiEv = mapa.epis.find(e => e.categoria === 'EVENTUAL');
    assert.equal(epiObrig.status, 'NAO_AVALIADO');
    assert.equal(epiEv.status_condicao, 'PENDENTE');
    assert.notEqual(epiEv.status_condicao, 'NAO_APLICAVEL');

    // GHE consultado somente leitura (catálogo global permanece intacto)
    const fnServente = mapa.funcoes.find(f => f.nome === 'Servente');
    const fnMotorista = mapa.funcoes.find(f => f.nome.includes('Motorista'));
    const fnEncarregado = mapa.funcoes.find(f => f.nome.includes('Encarregado'));
    assert.match(fnServente.ghe_ref_leitura, /GHE-07/);
    assert.match(fnMotorista.ghe_ref_leitura, /GHE-02/);
    assert.equal(JSON.stringify(w.allGheCatalogo), gheSnapshotInicial, 'Catálogo GHE global nunca pode ser modificado');

    // Reordenação de etapas
    const etapaDesloc = mapa.etapas[0];
    const etapaLimpeza = mapa.etapas[1];
    const etReord = w.reordenarEtapaMapa(mapa.id, etapaLimpeza.id, 'subir');
    assert.equal(etReord[0].id, etapaLimpeza.id);
    assert.equal(etReord[0].ordem, 1);
    w.reordenarEtapaMapa(mapa.id, etapaLimpeza.id, 'descer');

    // Vincula riscos distintos por função (Motorista só no deslocamento; Servente no corte/pedras)
    const perTransito = mapa.perigos.find(p => p.perigo_fonte === 'Trânsito de veículos');
    const perCorte = mapa.perigos.find(p => p.perigo_fonte === 'Corte e perfuração');
    w.salvarPerigoMapa(mapa.id, {
        id: perTransito.id,
        perigo_fonte: perTransito.perigo_fonte,
        etapa_ids: [etapaDesloc.id],
        funcao_ids: [fnMotorista.id, fnServente.id, fnEncarregado.id]
    });
    w.salvarPerigoMapa(mapa.id, {
        id: perCorte.id,
        perigo_fonte: perCorte.perigo_fonte,
        etapa_ids: [etapaLimpeza.id],
        funcao_ids: [fnServente.id],
        evento_risco: 'Contato com lâmina de foice durante golpe'
    });

    // Visão Tabela filtrada por Motorista exibe Trânsito e NÃO mistura Corte e perfuração do Servente
    w.selecionarAbaIaAprendizado('mapa');
    w.alternarModoVisaoMapaIaUI('tabela');
    w.filtrarTabelaMapaFuncaoUI(fnMotorista.id);
    const htmlTabelaMot = el('page-ia_aprendizado').innerHTML;
    const matchTbody = htmlTabelaMot.match(/<tbody>([\s\S]*?)<\/tbody>/);
    assert.ok(matchTbody, 'Tabela de vínculos deve renderizar tbody');
    assert.match(matchTbody[1], /Trânsito de veículos/);
    assert.doesNotMatch(matchTbody[1], /Corte e perfuração/);

    // Cancelar formulário não altera dados
    w.abrirFormMapaMentalIaUI(mapa.id);
    el('mmForm_atividade').value = 'ATIVIDADE QUE SERÁ CANCELADA';
    w.fecharFormMapaMentalIaUI();
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].atividade, 'Roço de Vegetação Teste');

    // Recarga a partir do localStorage mantém tudo íntegro
    const envRecarregado = criarAmbienteMapa(undefined, { storage: env.storage });
    const mapaRec = envRecarregado.w.obterEstadoMapaMentalIa().mapas[0];
    assert.equal(mapaRec.funcoes.length, 3);
    assert.equal(mapaRec.perigos.find(p => p.perigo_fonte === 'Corte e perfuração').funcao_ids[0], fnServente.id);
});

test('5. Revisão crítica local sob demanda + decisões rastreáveis de incluir e retirar', () => {
    const env = criarAmbienteMapa();
    const { w } = env;

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Roço em Enrocamento',
        funcoes_texto: 'Servente\nMotorista',
        etapas_texto: 'Deslocamento\nLimpeza no talude',
        epis_eventuais_texto: 'Cinto de Segurança tipo paraquedista',
        perigos_texto: 'Pedras soltas\nPedras soltas\nCorte e perfuração'
    });

    // Solicitação de terceiro querendo RETIRAR item do Servente sem justificativa
    const perCorte = mapa.perigos.find(p => p.perigo_fonte === 'Corte e perfuração');
    const solRetirar = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perCorte.id,
        origem: 'SOLICITACAO_TERCEIRO',
        solicitante_papel: 'Encarregado',
        titulo: 'Retirar risco de corte da APR'
    });

    // Análise crítica local sob demanda detecta repetição, mistura fonte/evento, falta PAE, falta condição EPI e crítica à retirada
    const rev1 = w.executarRevisaoLocalMapa(mapa.id);
    assert.ok(rev1.totalGeradas >= 6);
    const titulos = rev1.geradas.map(r => r.titulo).join(' | ');
    assert.match(titulos, /repetição/i);
    assert.match(titulos, /mistura entre Perigo\/Fonte e Evento/i);
    assert.match(titulos, /PAE/i);
    assert.match(titulos, /EPI eventual/i);
    assert.match(titulos, /fundamentação técnica/i);

    // Idempotência: rodar de novo não duplica recomendações pendentes iguais
    const rev2 = w.executarRevisaoLocalMapa(mapa.id);
    assert.equal(rev2.totalGeradas, 0);

    // Rejeitar retirada preserva o item intacto
    const decRej = w.decidirRecomendacaoMapa(mapa.id, solRetirar.id, 'REJEITAR', { nota: 'Aplica-se ao Servente no roço' });
    assert.equal(decRej.status_decisao, 'REJEITADA');
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perCorte.id).status, 'NAO_AVALIADO');

    // Aceitar retirada global da duplicata exige confirmação explícita com funções atingidas e marca NAO_APLICAVEL rastreável
    const recDup = rev1.geradas.find(r => r.tipo === 'RETIRAR' && r.chave_dedup.startsWith('dup_perigo_'));
    assert.ok(recDup);
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, recDup.id, 'ACEITAR', { nota: 'Sem confirmação global' }),
        /Confirmação obrigatória para retirada global/
    );
    const decDupOk = w.decidirRecomendacaoMapa(mapa.id, recDup.id, 'ACEITAR', {
        nota: 'Duplicata consolidada',
        confirmarRetiradaGlobal: true
    });
    assert.ok(decDupOk.snapshot_antes && decDupOk.snapshot_depois);
    assert.equal(decDupOk.valor_anterior, 'NAO_AVALIADO');
    assert.equal(decDupOk.valor_aplicado, 'NAO_APLICAVEL');
    const perDup = w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === recDup.alvo_item_id);
    assert.ok(perDup, 'Item retirado deve permanecer rastreável no histórico');
    assert.equal(perDup.status, 'NAO_APLICAVEL');

    // Aceitar inclusão de PAE cria etapa com status NAO_AVALIADO
    const recPae = rev1.geradas.find(r => r.chave_dedup === 'lembrete_fase5_pae');
    assert.ok(recPae);
    w.decidirRecomendacaoMapa(mapa.id, recPae.id, 'ACEITAR');
    assert.ok(w.obterEstadoMapaMentalIa().mapas[0].etapas.some(e => e.nome.includes('PAE') && e.status === 'NAO_AVALIADO'));

    // Proteção contra sobrescrita silenciosa em item CONFIRMADO
    w.alterarStatusItemMapa(mapa.id, 'PERIGO', perCorte.id, 'CONFIRMADO');
    const recMistura = rev1.geradas.find(r => r.chave_dedup === 'fonte_vs_evento_' + perCorte.id);
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, recMistura.id, 'EDITAR_E_ACEITAR', { textoEditado: 'Ferramenta manual cortante' }),
        /Confirme explicitamente a sobrescrita/
    );
    w.decidirRecomendacaoMapa(mapa.id, recMistura.id, 'EDITAR_E_ACEITAR', {
        textoEditado: 'Ferramenta manual cortante',
        confirmarSobrescrita: true
    });
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perCorte.id).perigo_fonte, 'Ferramenta manual cortante');
});

test('6. Pacote externo sanitizado, prévia e importação segura sem P/S', () => {
    const env = criarAmbienteMapa();
    const { w } = env;
    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Limpeza de Drenagem',
        observacoes_gerais: 'Contato joao@example.com CPF 123.456.789-00 tel 87 99999-8888',
        etapas_texto: 'Inspeção inicial',
        funcoes_texto: 'Servente'
    });

    const pacote = w.gerarPacoteCriticaExternaMapa(mapa.id);
    assert.equal(pacote.includes('joao@example.com'), false);
    assert.equal(pacote.includes('123.456.789-00'), false);
    assert.equal(pacote.includes('99999-8888'), false);
    assert.match(pacote, /NUNCA inclua notas p_puro, s_puro/);

    // Bloqueia URL / script e tamanho > 20 KB
    assert.throws(
        () => w.analisarRetornoCriticaExternaMapa('[{"titulo":"Teste","descricao_proposta":"Ver https://evil.example"}]', mapa.id),
        /URLs externas não são permitidas/
    );
    assert.throws(
        () => w.analisarRetornoCriticaExternaMapa('⚡'.repeat(7000), mapa.id),
        /excede o teto de 20 KB/
    );

    // Extrai JSON cercado por texto livre, descarta P/S e NÃO grava na prévia
    const respostaLivre = 'Segue minha análise técnica:\n```json\n[{"tipo":"INCLUIR","alvo_ramo":"PERIGO","titulo":"Incluir verificação de enxurrada","descricao_proposta":"Água acumulada em canaleta","justificativa":"Risco sazonal","etapas_sugeridas":["Inspeção inicial"],"funcoes_sugeridas":["Servente"],"p_puro":4,"s_puro":5,"p_residual":2,"s_residual":4}]\n```\nEspero ter ajudado.';
    const previa = w.analisarRetornoCriticaExternaMapa(respostaLivre, mapa.id);
    assert.equal(previa.notasDescartadas, 4);
    assert.equal(previa.itens[0].etapa_ids_sugeridas.length, 1);
    assert.equal(previa.itens[0].funcao_ids_sugeridas.length, 1);
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].recomendacoes.length, 0, 'Prévia nunca grava antes da confirmação');

    // Revalidação de permissão na confirmação (leitor após revogação falha)
    w.permissaoGravacao.ia_aprendizado = false;
    assert.throws(() => w.confirmarImportacaoCriticaExternaMapa(previa), /Permissão negada/);

    w.permissaoGravacao.ia_aprendizado = true;
    const imp = w.confirmarImportacaoCriticaExternaMapa(previa);
    assert.equal(imp.totalImportadas, 1);
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].recomendacoes[0].origem, 'IA_EXTERNA');
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].recomendacoes[0].status_decisao, 'PENDENTE');
});

test('7. Backup próprio ia_mapa_mental_backup_v1, round-trip sem cortes e rejeição cruzada com v1 legado', () => {
    const env = criarAmbienteMapa();
    const { w, el, downloads } = env;

    const obsLonga = 'Observação extensa.'.repeat(350); // ~6650 chars sem espaço final
    w.criarOuAtualizarMapaMental({
        atividade: 'Atividade Backup Integral',
        observacoes_gerais: obsLonga,
        perigos_texto: 'Pedra solta no enrocamento'
    });

    const bkpMapa = w.gerarBackupMapasLocais();
    assert.equal(bkpMapa.formato, 'ia_mapa_mental_backup_v1');

    // Rejeição cruzada: backup do mapa NÃO entra na Aba 1 legado, e backup v1 legado NÃO entra no Mapa
    assert.throws(
        () => w.analisarBackupCadernoLocal(bkpMapa.json),
        /Esperado: "ia_aprendizado_backup_v1"/
    );
    const bkpLegado = w.gerarBackupCadernoLocal();
    assert.throws(
        () => w.analisarBackupMapasLocais(bkpLegado.json),
        /backup da Aba 1/
    );

    // Backup inválido não apaga mapas atuais
    assert.throws(() => w.analisarBackupMapasLocais('{"formato":"ia_mapa_mental_backup_v1","versao_esquema":1,"mapas":[]}'), /não contém mapas/);
    assert.equal(w.obterEstadoMapaMentalIa().mapas.length, 1);

    // Exportar sem download não atualiza ultimoBackupEm; com download atualiza
    w.registrarBackupMapaExportado(bkpMapa.geradoEm);
    assert.equal(w.obterEstadoMapaMentalIa().ultimoBackupEm, bkpMapa.geradoEm);

    // Modo substituir exige cópia prévia e preserva 100% do texto longo (sem cortes)
    const previa = w.analisarBackupMapasLocais(bkpMapa.json);
    assert.throws(() => w.aplicarRestauracaoBackupMapas(previa, { modo: 'substituir' }), /cópia de segurança prévia/);
    const resSub = w.aplicarRestauracaoBackupMapas(previa, { modo: 'substituir', backupPrevioConfirmado: true });
    assert.equal(resSub.totalMapasAtuais, 1);
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].observacoes_gerais.length, obsLonga.length);

    // Modo mesclar com conflito exige política explícita
    w.criarOuAtualizarMapaMental({ id: w.obterEstadoMapaMentalIa().mapas[0].id, atividade: 'Atividade Backup Integral', observacoes_gerais: 'Alterada localmente' });
    const previaConflito = w.analisarBackupMapasLocais(bkpMapa.json);
    assert.equal(previaConflito.resumo.conflitos, 1);
    assert.throws(() => w.aplicarRestauracaoBackupMapas(previaConflito, { modo: 'mesclar' }), /política de conflito/i);
    const resCopia = w.aplicarRestauracaoBackupMapas(previaConflito, { modo: 'mesclar', politicaConflito: 'restaurar_copia' });
    assert.equal(resCopia.totalMapasAtuais, 2);

    // Download via UI em substituir dispara cópia antes e aborta se download falhar ou se perfil virar leitor
    w.exportarBackupMapasIaUI();
    assert.ok(downloads.length >= 1);

    el('mmTextareaBackupJson').value = bkpMapa.json;
    w.preVisualizarBackupMapasIaUI();
    const createUrlOriginal = w.URL.createObjectURL;
    w.URL.createObjectURL = undefined;
    const qtdAntesFalha = w.obterEstadoMapaMentalIa().mapas.length;
    assert.equal(w.confirmarRestauracaoBackupMapasIaUI('substituir'), null);
    assert.equal(w.obterEstadoMapaMentalIa().mapas.length, qtdAntesFalha, 'Falha no download da cópia prévia deve preservar os mapas');
    w.URL.createObjectURL = createUrlOriginal;

    w.permissaoGravacao.ia_aprendizado = false;
    const downloadsAntesLeitor = downloads.length;
    assert.equal(w.confirmarRestauracaoBackupMapasIaUI('substituir'), null);
    assert.equal(downloads.length, downloadsAntesLeitor, 'Perfil leitor não pode disparar download/substituição');
    assert.equal(w.obterEstadoMapaMentalIa().mapas.length, qtdAntesFalha);
});

test('8. Impressão segura via abrirDocumentoHtmlParaImpressao com escape HTML e bloqueio de script', () => {
    const env = criarAmbienteMapa();
    const { w, impressoes } = env;

    assert.throws(
        () => w.criarOuAtualizarMapaMental({ atividade: 'Atividade <script>alert(1)</script>' }),
        /script ou instrução executável/
    );

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Atividade <b>Roço</b> & "Teste"',
        funcoes_texto: 'Servente',
        perigos_texto: 'Perigo <div class="x">Pedra</div>'
    });
    const htmlImp = w.imprimirMapaMentalIa(mapa.id);
    assert.equal(impressoes.length, 1);
    assert.doesNotMatch(htmlImp, /<b>Roço<\/b>/);
    assert.doesNotMatch(htmlImp, /<div class="x">/);
    assert.match(htmlImp, /&lt;b&gt;Roço&lt;\/b&gt;/);
    assert.match(htmlImp, /&lt;div class=&quot;x&quot;&gt;Pedra&lt;\/div&gt;/);
});

test('9. Proteção de equipe mista contra retirada global indevida e isolamento das regras legadas', () => {
    const env = criarAmbienteMapa();
    const { w, storage } = env;

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Serviço com Equipe Mista Teste',
        funcoes_texto: 'Servente\nEncarregado\nMotorista',
        etapas_texto: 'Deslocamento\nExecução manual',
        epis_obrigatorios_texto: 'Perneira 3 talas'
    });
    const fnServente = mapa.funcoes.find(f => f.nome === 'Servente');
    const fnMotorista = mapa.funcoes.find(f => f.nome === 'Motorista');
    const etExec = mapa.etapas.find(e => e.nome === 'Execução manual');
    const epiPerneira = mapa.epis[0];

    // Vincula Perneira exclusivamente ao Servente
    w.salvarEpiMapa(mapa.id, {
        id: epiPerneira.id,
        nome: epiPerneira.nome,
        categoria: 'OBRIGATORIO',
        funcao_ids: [fnServente.id],
        etapa_ids: [etExec.id]
    });

    // Cria perigo compartilhado [Servente, Motorista]
    const perComp = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Ruído ou tráfego próximo à área',
        funcao_ids: [fnServente.id, fnMotorista.id],
        etapa_ids: [etExec.id]
    });

    // Caso A: Pedido para RETIRAR Perneira alegando que Motorista não usa
    const solRetServente = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'EPI',
        alvo_item_id: epiPerneira.id,
        origem: 'SOLICITACAO_TERCEIRO',
        titulo: 'Retirar perneira — Motorista não utiliza',
        justificativa: 'Motorista fica no veículo',
        funcao_ids_sugeridas: [fnMotorista.id],
        etapa_ids_sugeridas: [etExec.id]
    });

    const rev = w.executarRevisaoLocalMapa(mapa.id);
    assert.ok(rev.geradas.some(r => r.chave_dedup === 'prot_mista_' + solRetServente.id), 'Deve alertar que Servente continua exposto');

    // Tentar aceitar a retirada global deve ser bloqueado pela proteção de equipe mista
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, solRetServente.id, 'ACEITAR'),
        /Proteção de equipe mista/
    );
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].epis[0].status, 'NAO_AVALIADO', 'Perneira do Servente permanece intacta');

    // Rejeitar com justificativa rastreável
    w.decidirRecomendacaoMapa(mapa.id, solRetServente.id, 'REJEITAR', { nota: 'Obrigatório para Servente na roçada; não se estende ao Motorista' });
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].epis[0].status, 'NAO_AVALIADO');

    // Caso B: Pedido para RETIRAR risco compartilhado apenas para Motorista -> desvincula só Motorista, mantendo Servente
    const solRetComp = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perComp.id,
        origem: 'SOLICITACAO_TERCEIRO',
        titulo: 'Remover vínculo do Motorista neste perigo',
        justificativa: 'Motorista permanece em ponto seguro',
        funcao_ids_sugeridas: [fnMotorista.id],
        etapa_ids_sugeridas: [etExec.id]
    });
    w.decidirRecomendacaoMapa(mapa.id, solRetComp.id, 'ACEITAR');
    const perDepois = w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perComp.id);
    assert.equal(perDepois.status, 'NAO_AVALIADO', 'Não deve marcar NAO_APLICAVEL globalmente');
    assert.deepEqual(perDepois.funcao_ids, [fnServente.id], 'Deve manter Servente protegido e remover só Motorista');

    // Aceitar recomendação no mapa nunca cria regra aprovada no módulo legado ia_aprendizado.js
    const legRaw = storage.get('sst_ia_apr_local_v2_interno_uid_joao_76_76');
    if (legRaw) {
        assert.equal(JSON.parse(legRaw).regrasAprendidas.length, 0);
    }
});

test('10. Troca de conta isolada, navegação visual do mapa, preservação de rascunho e EPI eventual inline', () => {
    const sharedStorage = new Map();
    const env = criarAmbienteMapa({ uid: 'contaA', matricula: '101', tipo: 'interno' }, { storage: sharedStorage });
    const { w, el } = env;

    const mapaA = w.criarOuAtualizarMapaMental({
        atividade: 'Mapa Exclusivo Conta A',
        funcoes_texto: 'Servente\nMotorista',
        etapas_texto: 'Etapa 1',
        epis_eventuais_texto: 'Cinto paraquedista'
    });
    const perA = w.salvarPerigoMapa(mapaA.id, {
        perigo_fonte: 'Ferramenta cortante',
        evento_risco: 'Contato com lâmina',
        danos_provaveis: 'Ferimento cortante',
        medidas_nr01: { administrativo_organizacao: 'Distanciamento seguro entre trabalhadores' }
    });

    // Troca de conta A -> conta B -> conta A sem vazamento entre contas
    w.sessaoAtual = { uid: 'contaB', matricula: '202', tipo: 'interno' };
    assert.equal(w.obterEstadoMapaMentalIa().mapas.length, 0, 'Conta B não pode ver mapas da Conta A');
    w.criarOuAtualizarMapaMental({ atividade: 'Mapa Exclusivo Conta B' });

    w.sessaoAtual = { uid: 'contaA', matricula: '101', tipo: 'interno' };
    const estadoA = w.obterEstadoMapaMentalIa();
    assert.equal(estadoA.mapas.length, 1);
    assert.equal(estadoA.mapas[0].atividade, 'Mapa Exclusivo Conta A');

    // Navegação visual: focar perigo exibe os 3 quadros à esquerda; colapsar/expandir ramo; preservar rascunhos
    w.selecionarAbaIaAprendizado('mapa');
    w.focarPerigoMapaIaUI(perA.id);
    const htmlMapa = el('page-ia_aprendizado').innerHTML;
    assert.match(htmlMapa, /mmCanvasMapaVisual/);
    assert.match(htmlMapa, /mmQuadrosEsquerdaPerigo/);
    assert.match(htmlMapa, /Contato com lâmina/);
    assert.match(htmlMapa, /Distanciamento seguro entre trabalhadores/);

    w.atualizarRascunhoImportCriticaMapaIaUI('[{"tipo":"PERGUNTA"}]');
    w.alternarRamoMapaIaUI('FERRAMENTAS');
    assert.equal(w.obterEstadoMapaMentalIa().ramosRecolhidos.FERRAMENTAS, true);
    assert.equal(w.obterEstadoMapaMentalIa().textoImportCriticaDraft, '[{"tipo":"PERGUNTA"}]', 'Rascunho de texto deve sobreviver à re-renderização');

    // Alteração inline da condição de EPI eventual (PENDENTE -> APLICAVEL)
    const epiEv = w.obterEstadoMapaMentalIa().mapas[0].epis[0];
    w.alterarCondicaoEpiMapaIaUI(epiEv.id, 'APLICAVEL');
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].epis[0].status_condicao, 'APLICAVEL');

    // Editor de decisão inline sem prompt/confirm nativos
    const rec = w.registrarRecomendacaoMapa(mapaA.id, {
        tipo: 'INCLUIR',
        alvo_ramo: 'FERRAMENTA',
        titulo: 'Incluir bainha de proteção'
    });
    w.abrirEditorDecisaoRecMapaIaUI(rec.id, 'EDITAR_E_ACEITAR');
    el('mmDecRec_texto').value = 'Bainha rígida de proteção para transporte';
    el('mmDecRec_nota').value = 'Validado em campo';
    w.confirmarEditorDecisaoRecMapaIaUI();
    const ferrs = w.obterEstadoMapaMentalIa().mapas[0].ferramentas;
    assert.ok(ferrs.some(f => f.nome === 'Bainha rígida de proteção para transporte' && f.status === 'NAO_AVALIADO'));

    // Regressão: trocar ramo da recomendação preserva tipo RETIRAR, campos e checkboxes preenchidos
    w.abrirFormRecomendacaoMapaIaUI();
    el('mmRec_tipo').value = 'RETIRAR';
    el('mmRec_solic').value = 'Encarregado';
    el('mmRec_titulo').value = 'Retirar perneira para motorista';
    el('mmRec_desc').value = 'Manter apenas servente';
    el('mmRec_just').value = 'Motorista atua na cabine';
    w._cbRecFuncoes = [{ value: mapaA.funcoes[1].id }];
    w._cbRecEtapas = [{ value: mapaA.etapas[0].id }];
    w.atualizarRamoFormRecomendacaoMapaIaUI('EPI');
    const htmlFormRec = el('page-ia_aprendizado').innerHTML;
    assert.match(htmlFormRec, /<option value="RETIRAR" selected>/);
    assert.match(htmlFormRec, /<option value="EPI" selected>/);
    assert.match(htmlFormRec, /value="Retirar perneira para motorista"/);
    assert.match(htmlFormRec, /Motorista atua na cabine/);
    assert.match(htmlFormRec, new RegExp(`class="mmRecFuncaoCb" value="${mapaA.funcoes[1].id}" checked`));
});

test('11. P1-A: Contrato de IDs no prompt, bloqueio de alvo ausente/inexistente/ambíguo e remoção após prévia', () => {
    const env = criarAmbienteMapa();
    const { w } = env;

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Roço Manual em Canal',
        funcoes_texto: 'Servente\nMotorista',
        etapas_texto: 'Deslocamento\nLimpeza no talude'
    });
    const fnServ = mapa.funcoes.find(f => f.nome === 'Servente');
    const fnMot = mapa.funcoes.find(f => f.nome === 'Motorista');
    const etTalude = mapa.etapas.find(e => e.nome === 'Limpeza no talude');

    const epiPern = w.salvarEpiMapa(mapa.id, {
        nome: 'Perneira',
        categoria: 'OBRIGATORIO',
        funcao_ids: [fnServ.id],
        etapa_ids: [etTalude.id]
    });
    w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Corte e perfuração',
        funcao_ids: [fnServ.id],
        etapa_ids: [etTalude.id]
    });
    const perPed1 = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Pedras soltas',
        funcao_ids: [fnServ.id],
        etapa_ids: [etTalude.id]
    });
    w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Pedras soltas',
        funcao_ids: [fnMot.id],
        etapa_ids: [etTalude.id]
    });
    w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'EPI',
        alvo_item_id: epiPern.id,
        origem: 'SOLICITACAO_TERCEIRO',
        titulo: 'Retirar perneira para motorista',
        funcao_ids_sugeridas: [fnMot.id],
        etapa_ids_sugeridas: [etTalude.id]
    });

    // Prompt exporta IDs estáveis, etapas dos EPIs, escopo das solicitações pendentes e regras completas JSON
    const prompt = w.gerarPacoteCriticaExternaMapa(mapa.id);
    assert.match(prompt, new RegExp(`\\[id: ${fnServ.id}\\]`));
    assert.match(prompt, new RegExp(`\\[id: ${etTalude.id}\\]`));
    assert.match(prompt, new RegExp(`\\[id: ${epiPern.id}\\].*Etapas: Limpeza no talude`));
    assert.match(prompt, /Etapas citadas: Limpeza no talude.*Funções citadas: Motorista/);
    assert.match(prompt, /"alvo_item_id"/);
    assert.match(prompt, /"campo_alvo"/);
    assert.match(prompt, /"escopo_retirada"/);

    // Resposta JSON usando exclusivamente o ID extraído do prompt funciona ponta a ponta
    const matchPer = prompt.match(/- P1 \[id: (per_[^\]]+)\] \[NAO_AVALIADO\] Perigo\/Fonte: Corte e perfuração/);
    assert.ok(matchPer, 'Prompt precisa expor ID estável do perigo P1');
    const idP1Extraido = matchPer[1];

    const previaOk = w.analisarRetornoCriticaExternaMapa(JSON.stringify([{
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: idP1Extraido,
        campo_alvo: 'medidas_nr01.engenharia_epc',
        titulo: 'Incluir barreira no EPC',
        descricao_proposta: 'Instalar barreira física',
        justificativa: 'Proteger frente vizinha',
        funcoes_sugeridas: ['Servente'],
        etapas_sugeridas: ['Limpeza no talude']
    }]), mapa.id);
    assert.equal(previaOk.totalComPendencias, 0);
    assert.equal(previaOk.itens[0].alvo_status, 'RESOLVIDO');
    assert.equal(previaOk.itens[0].campo_alvo_status, 'VALIDO');

    const impOk = w.confirmarImportacaoCriticaExternaMapa(previaOk);
    w.decidirRecomendacaoMapa(mapa.id, impOk.recomendacoes[0].id, 'ACEITAR');
    const perP1Final = w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === idP1Extraido);
    assert.equal(perP1Final.medidas_nr01.engenharia_epc, 'Instalar barreira física');
    assert.equal(perP1Final.perigo_fonte, 'Corte e perfuração', 'Não deve renomear perigo_fonte');

    // AJUSTAR PERIGO sem alvo, RETIRAR sem alvo e alvo inexistente são bloqueados sem gravar observações gerais
    const previaSemAlvo = w.analisarRetornoCriticaExternaMapa(JSON.stringify([
        {
            tipo: 'AJUSTAR',
            alvo_ramo: 'PERIGO',
            campo_alvo: 'medidas_nr01.engenharia_epc',
            titulo: 'Ajuste sem alvo',
            descricao_proposta: 'Instalar barreira sem alvo'
        },
        {
            tipo: 'RETIRAR',
            alvo_ramo: 'PERIGO',
            titulo: 'Retirada sem alvo',
            descricao_proposta: 'Remover perigo indefinido'
        },
        {
            tipo: 'RETIRAR',
            alvo_ramo: 'PERIGO',
            alvo_item_id: 'per_inexistente_999',
            titulo: 'Retirada alvo inexistente',
            descricao_proposta: 'Remover inexistente'
        },
        {
            tipo: 'AJUSTAR',
            alvo_ramo: 'PERIGO',
            alvo_item_id: 'Pedras soltas',
            campo_alvo: 'evento_risco',
            titulo: 'Ajuste com alvo ambíguo',
            descricao_proposta: 'Rolamento de bloco'
        }
    ]), mapa.id);
    assert.equal(previaSemAlvo.totalComPendencias, 4);
    assert.equal(previaSemAlvo.itens[0].alvo_status, 'AUSENTE');
    assert.equal(previaSemAlvo.itens[1].alvo_status, 'AUSENTE');
    assert.equal(previaSemAlvo.itens[2].alvo_status, 'INEXISTENTE');
    assert.equal(previaSemAlvo.itens[3].alvo_status, 'AMBIGUO');
    assert.equal(previaSemAlvo.itens[3].alvo_candidatos_ambiguos.length, 2);

    const impPends = w.confirmarImportacaoCriticaExternaMapa(previaSemAlvo);
    const recAjSemAlvo = impPends.recomendacoes.find(r => r.titulo === 'Ajuste sem alvo');
    const recRetSemAlvo = impPends.recomendacoes.find(r => r.titulo === 'Retirada sem alvo');
    const recInex = impPends.recomendacoes.find(r => r.titulo === 'Retirada alvo inexistente');
    const recAmbiguo = impPends.recomendacoes.find(r => r.titulo === 'Ajuste com alvo ambíguo');
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recAjSemAlvo.id, 'ACEITAR'), /Alvo ausente/);
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].observacoes_gerais, '', 'AJUSTAR PERIGO sem alvo não pode vazar para observacoes_gerais');
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recRetSemAlvo.id, 'ACEITAR'), /Alvo ausente/);
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recInex.id, 'ACEITAR'), /Alvo inexistente/);
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recAmbiguo.id, 'ACEITAR'), /Alvo ambíguo/);

    // Rejeitar recomendação com alvo ausente continua funcionando normalmente
    const rejSemAlvo = w.decidirRecomendacaoMapa(mapa.id, recAjSemAlvo.id, 'REJEITAR', { nota: 'Faltou ID do alvo' });
    assert.equal(rejSemAlvo.status_decisao, 'REJEITADA');

    // Alvo removido APÓS prévia bloqueia confirmação; alvo removido APÓS importação bloqueia ACEITAR mas permite REJEITAR
    const previaPreRemocao = w.analisarRetornoCriticaExternaMapa(JSON.stringify([{
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perPed1.id,
        campo_alvo: 'evento_risco',
        titulo: 'Ajustar evento de pedras',
        descricao_proposta: 'Rolamento de pedra'
    }]), mapa.id);
    const impPreRemocao = w.confirmarImportacaoCriticaExternaMapa(previaPreRemocao);

    const previaParaBloquear = w.analisarRetornoCriticaExternaMapa(JSON.stringify([{
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perPed1.id,
        titulo: 'Retirar pedra removida',
        funcoes_sugeridas: ['Servente']
    }]), mapa.id);
    w.removerItemMapa(mapa.id, 'PERIGO', perPed1.id);

    assert.throws(
        () => w.confirmarImportacaoCriticaExternaMapa(previaParaBloquear),
        /removido após a prévia/
    );
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, impPreRemocao.recomendacoes[0].id, 'ACEITAR'),
        /Alvo inexistente ou removido/
    );
    const rejRemovido = w.decidirRecomendacaoMapa(mapa.id, impPreRemocao.recomendacoes[0].id, 'REJEITAR', { nota: 'Item já excluído' });
    assert.equal(rejRemovido.status_decisao, 'REJEITADA');
});

test('12. P1-B: Campos explícitos em AJUSTAR, rejeição de desconhecido e rastreabilidade antes/depois + backup', () => {
    const env = criarAmbienteMapa();
    const { w } = env;

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Corte em Talude',
        funcoes_texto: 'Servente',
        epis_obrigatorios_texto: 'Capacete',
        epis_eventuais_texto: 'Cinto paraquedista'
    });
    const per = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Trabalho com lâmina de foice',
        evento_risco: 'Evento original',
        danos_provaveis: 'Dano original',
        medidas_nr01: {
            eliminacao_substituicao: 'Eliminação original',
            engenharia_epc: 'EPC original',
            administrativo_organizacao: 'Adm original',
            epi_complementar: 'EPI original'
        }
    });
    const epiObrig = mapa.epis.find(e => e.categoria === 'OBRIGATORIO');
    const epiEvent = mapa.epis.find(e => e.categoria === 'EVENTUAL');

    // Ajustar medida EPC e evento/dano altera SOMENTE o campo alvo e preserva snapshot antes/depois + perigo_fonte
    const recEpc = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: per.id,
        campo_alvo: 'medidas_nr01.engenharia_epc',
        titulo: 'Atualizar EPC',
        descricao_proposta: 'Instalar barreira rígida'
    });
    const decEpc = w.decidirRecomendacaoMapa(mapa.id, recEpc.id, 'ACEITAR', { nota: 'Aprovado SST' });
    assert.equal(decEpc.valor_anterior, 'EPC original');
    assert.equal(decEpc.valor_aplicado, 'Instalar barreira rígida');
    assert.equal(decEpc.snapshot_antes.medidas_nr01.engenharia_epc, 'EPC original');
    assert.equal(decEpc.snapshot_depois.medidas_nr01.engenharia_epc, 'Instalar barreira rígida');

    const perPosEpc = w.obterEstadoMapaMentalIa().mapas[0].perigos[0];
    assert.equal(perPosEpc.perigo_fonte, 'Trabalho com lâmina de foice');
    assert.equal(perPosEpc.evento_risco, 'Evento original');
    assert.equal(perPosEpc.danos_provaveis, 'Dano original');
    assert.equal(perPosEpc.medidas_nr01.eliminacao_substituicao, 'Eliminação original');
    assert.equal(perPosEpc.medidas_nr01.administrativo_organizacao, 'Adm original');
    assert.equal(perPosEpc.medidas_nr01.epi_complementar, 'EPI original');

    // EDITAR_E_ACEITAR em evento_risco + ajuste em danos_provaveis + EPI eventual condicao_uso
    const recEv = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: per.id,
        campo_alvo: 'evento_risco',
        titulo: 'Precisar evento',
        descricao_proposta: 'Proposta bruta'
    });
    const decEv = w.decidirRecomendacaoMapa(mapa.id, recEv.id, 'EDITAR_E_ACEITAR', {
        textoEditado: 'Contato acidental com lâmina em movimento',
        nota: 'Editado pelo engenheiro'
    });
    assert.equal(decEv.valor_anterior, 'Evento original');
    assert.equal(decEv.valor_aplicado, 'Contato acidental com lâmina em movimento');
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].perigos[0].perigo_fonte, 'Trabalho com lâmina de foice');

    const recCondEv = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'EPI',
        alvo_item_id: epiEvent.id,
        campo_alvo: 'condicao_uso',
        titulo: 'Condição cinto',
        descricao_proposta: 'Talude > 2m sem guarda-corpo'
    });
    w.decidirRecomendacaoMapa(mapa.id, recCondEv.id, 'ACEITAR');
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].epis.find(e => e.id === epiEvent.id).condicao_uso, 'Talude > 2m sem guarda-corpo');

    // Rejeita condicao_uso em EPI obrigatório, campo desconhecido e campo ausente (sem renomear perigo/EPI)
    const recCondObrig = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'EPI',
        alvo_item_id: epiObrig.id,
        campo_alvo: 'condicao_uso',
        titulo: 'Condição inválida',
        descricao_proposta: 'Texto qualquer'
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recCondObrig.id, 'ACEITAR'), /somente a EPI EVENTUAL/);
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].epis.find(e => e.id === epiObrig.id).nome, 'Capacete');

    const recCampoDesc = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: per.id,
        campo_alvo: 'campo_inexistente_xyz',
        titulo: 'Campo desconhecido',
        descricao_proposta: 'Não pode renomear perigo'
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recCampoDesc.id, 'ACEITAR'), /Campo alvo desconhecido/);

    const recCampoVazio = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: per.id,
        titulo: 'Sem campo_alvo',
        descricao_proposta: 'Não pode renomear perigo'
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recCampoVazio.id, 'ACEITAR'), /Campo alvo obrigatório/);
    w.decidirRecomendacaoMapa(mapa.id, recCampoVazio.id, 'REJEITAR', { nota: 'Sem campo alvo' });
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].perigos[0].perigo_fonte, 'Trabalho com lâmina de foice');

    // Snapshots antes/depois sobrevivem ao backup & restauração
    const bkp = w.gerarBackupMapasLocais();
    const prevBkp = w.analisarBackupMapasLocais(bkp.json);
    w.aplicarRestauracaoBackupMapas(prevBkp, 'substituir');
    const recEpcRestaurada = w.obterEstadoMapaMentalIa().mapas[0].recomendacoes.find(r => r.id === recEpc.id);
    assert.equal(recEpcRestaurada.valor_anterior, 'EPC original');
    assert.equal(recEpcRestaurada.valor_aplicado, 'Instalar barreira rígida');
    assert.equal(recEpcRestaurada.snapshot_antes.medidas_nr01.engenharia_epc, 'EPC original');
    assert.equal(recEpcRestaurada.snapshot_depois.medidas_nr01.engenharia_epc, 'Instalar barreira rígida');
});

test('13. P1-C: Escopo não resolvido bloqueia retirada global + mistura/vazio + filtro visual sem vazar cadeia', () => {
    const env = criarAmbienteMapa();
    const { w, el } = env;

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Roço Misto',
        funcoes_texto: 'Servente\nMotorista\nEncarregado',
        etapas_texto: 'Deslocamento\nRoçagem'
    });
    const fnServ = mapa.funcoes.find(f => f.nome === 'Servente');
    const fnMot = mapa.funcoes.find(f => f.nome === 'Motorista');
    const fnEnc = mapa.funcoes.find(f => f.nome === 'Encarregado');
    const etExec = mapa.etapas.find(e => e.nome === 'Roçagem');

    const perServ = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Corte com lâmina de foice',
        evento_risco: 'Contato com foice do Servente',
        funcao_ids: [fnServ.id],
        etapa_ids: [etExec.id]
    });
    w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Condução em rodovia',
        evento_risco: 'Colisão exclusiva do Motorista',
        funcao_ids: [fnMot.id]
    });
    const perComp = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Atropelamento em frente',
        funcao_ids: [fnServ.id, fnMot.id],
        etapa_ids: [etExec.id]
    });

    // Caso 1: Reprodução exata Codex — função desconhecida ("Motorista pesado") nunca vira lista vazia/retirada global
    const prevDesconhecida = w.analisarRetornoCriticaExternaMapa(JSON.stringify([{
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perServ.id,
        titulo: 'Retirar corte para Motorista pesado',
        funcoes_sugeridas: ['Motorista pesado']
    }]), mapa.id);
    assert.deepEqual(Array.from(prevDesconhecida.itens[0].funcao_ids_sugeridas), []);
    assert.deepEqual(Array.from(prevDesconhecida.itens[0].funcoes_nao_resolvidas), ['Motorista pesado']);
    const recDesc = w.confirmarImportacaoCriticaExternaMapa(prevDesconhecida).recomendacoes[0];
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, recDesc.id, 'ACEITAR', { confirmarRetiradaGlobal: true }),
        /Escopo de funções não resolvido/
    );
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perServ.id).status, 'NAO_AVALIADO');

    // Caso 2: Etapa desconhecida preservada e bloqueada até resolução manual explícita
    const prevEtapaDesc = w.analisarRetornoCriticaExternaMapa(JSON.stringify([{
        tipo: 'INCLUIR',
        alvo_ramo: 'PERIGO',
        titulo: 'Incluir risco de insolação',
        descricao_proposta: 'Exposição solar em talude',
        funcoes_sugeridas: ['Servente'],
        etapas_sugeridas: ['Etapa Inexistente X']
    }]), mapa.id);
    assert.deepEqual(Array.from(prevEtapaDesc.itens[0].etapas_nao_resolvidas), ['Etapa Inexistente X']);
    const recEtDesc = w.confirmarImportacaoCriticaExternaMapa(prevEtapaDesc).recomendacoes[0];
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recEtDesc.id, 'ACEITAR'), /Escopo de etapas não resolvido/);
    const recEtResolvida = w.atualizarEscopoAlvoRecomendacaoMapa(mapa.id, recEtDesc.id, {
        etapa_ids: [etExec.id]
    });
    assert.deepEqual(Array.from(recEtResolvida.etapas_originais_nao_resolvidas), ['Etapa Inexistente X']);
    w.decidirRecomendacaoMapa(mapa.id, recEtDesc.id, 'ACEITAR');

    // Caso 3: Mistura de função válida ("Motorista") + inválida ("Motorista pesado") no perigo compartilhado [Servente, Motorista]
    const prevMista = w.analisarRetornoCriticaExternaMapa(JSON.stringify([{
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perComp.id,
        titulo: 'Desvincular motorista da frente',
        funcoes_sugeridas: ['Motorista', 'Motorista pesado']
    }]), mapa.id);
    assert.deepEqual(Array.from(prevMista.itens[0].funcao_ids_sugeridas), [fnMot.id]);
    assert.deepEqual(Array.from(prevMista.itens[0].funcoes_nao_resolvidas), ['Motorista pesado']);
    const recMista = w.confirmarImportacaoCriticaExternaMapa(prevMista).recomendacoes[0];
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, recMista.id, 'ACEITAR'), /Escopo de funções não resolvido/);

    w.atualizarEscopoAlvoRecomendacaoMapa(mapa.id, recMista.id, {
        funcao_ids: [fnMot.id],
        limparFuncoesNaoResolvidas: true
    });
    const decMista = w.decidirRecomendacaoMapa(mapa.id, recMista.id, 'ACEITAR');
    assert.deepEqual(Array.from(decMista.funcoes_originais_nao_resolvidas), ['Motorista pesado']);
    const perCompDepois = w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perComp.id);
    assert.equal(perCompDepois.status, 'NAO_AVALIADO');
    assert.deepEqual(Array.from(perCompDepois.funcao_ids), [fnServ.id]);

    // Caso 4: Lista vazia exige confirmação explícita listando as funções atingidas antes de marcar NAO_APLICAVEL
    const prevVazia = w.analisarRetornoCriticaExternaMapa(JSON.stringify([{
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perServ.id,
        titulo: 'Retirar sem especificar funções',
        funcoes_sugeridas: []
    }]), mapa.id);
    const recVazia = w.confirmarImportacaoCriticaExternaMapa(prevVazia).recomendacoes[0];
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, recVazia.id, 'ACEITAR'),
        /Confirmação obrigatória para retirada global.*Servente/
    );
    w.decidirRecomendacaoMapa(mapa.id, recVazia.id, 'ACEITAR', { confirmarRetiradaGlobal: true });
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perServ.id).status, 'NAO_APLICAVEL');

    // Caso 5: Filtro visual em renderVisaoMapaHtml não vaza cadeia do perigo focado de outra função
    w.selecionarAbaIaAprendizado('mapa');
    w.focarPerigoMapaIaUI(perServ.id);
    const extrairCanvasVisual = fullHtml => {
        const ini = fullHtml.indexOf('id="mmCanvasMapaVisual"');
        const fim = fullHtml.indexOf('⚖️ Avaliação Crítica');
        assert.ok(ini !== -1 && fim > ini);
        return fullHtml.slice(ini, fim);
    };

    w.filtrarMapaPorFuncaoUI(fnMot.id);
    const canvasMot = extrairCanvasVisual(el('page-ia_aprendizado').innerHTML);
    assert.match(canvasMot, /Condução em rodovia/);
    assert.match(canvasMot, /Colisão exclusiva do Motorista/);
    assert.equal(canvasMot.includes('Contato com foice do Servente'), false, 'Cadeia do Servente não pode aparecer com filtro no Motorista');

    w.filtrarMapaPorFuncaoUI(fnEnc.id);
    const canvasEnc = extrairCanvasVisual(el('page-ia_aprendizado').innerHTML);
    assert.match(canvasEnc, /Nenhum perigo vinculado ao filtro atual de função\/etapa/);
    assert.equal(canvasEnc.includes('Colisão exclusiva do Motorista'), false);
    assert.equal(canvasEnc.includes('Contato com foice do Servente'), false);
});

test('14. Regressivo Codex: escopo combinado (função x etapa) em RETIRAR e AJUSTAR + UI de impacto efetivo', () => {
    const env = criarAmbienteMapa();
    const { w, el } = env;

    const mapa = w.criarOuAtualizarMapaMental({
        atividade: 'Roço em Frente Mista A/B',
        funcoes_texto: 'Servente\nMotorista',
        etapas_texto: 'Etapa A\nEtapa B'
    });
    const fnServ = mapa.funcoes.find(f => f.nome === 'Servente');
    const fnMot = mapa.funcoes.find(f => f.nome === 'Motorista');
    const etA = mapa.etapas.find(e => e.nome === 'Etapa A');
    const etB = mapa.etapas.find(e => e.nome === 'Etapa B');

    const perAB = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Ruído e circulação na frente A/B',
        funcao_ids: [fnServ.id, fnMot.id],
        etapa_ids: [etA.id, etB.id],
        medidas_nr01: { engenharia_epc: 'Coneamento inicial' }
    });
    const perB = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Queda de barreira apenas na B',
        funcao_ids: [fnServ.id, fnMot.id],
        etapa_ids: [etB.id]
    });
    const perSemEt = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Perigo sem etapas avaliadas',
        funcao_ids: [fnServ.id, fnMot.id],
        etapa_ids: []
    });
    const perServAB = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Corte restrito ao Servente em A/B',
        funcao_ids: [fnServ.id],
        etapa_ids: [etA.id, etB.id]
    });

    // 1. Caso exato Codex: RETIRAR PARCIAL_FUNCOES citando [Motorista] + [Etapa A] em item [Servente, Motorista] x [A, B]
    const retComb = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perAB.id,
        escopo_retirada: 'PARCIAL_FUNCOES',
        titulo: 'Retirar Motorista apenas na Etapa A',
        funcao_ids_sugeridas: [fnMot.id],
        etapa_ids_sugeridas: [etA.id]
    });
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, retComb.id, 'ACEITAR'),
        /Bloqueio de escopo combinado.*Etapa B/
    );
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, retComb.id, 'ACEITAR', { confirmarRetiradaGlobal: true }),
        /Bloqueio de escopo combinado.*Etapa B/
    );
    const pAbIntacto = w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perAB.id);
    assert.deepEqual(Array.from(pAbIntacto.funcao_ids), [fnServ.id, fnMot.id]);
    assert.deepEqual(Array.from(pAbIntacto.etapa_ids), [etA.id, etB.id]);

    // UI exibe Etapas citadas e Impacto efetivo ao aceitar com orientação para separar por etapa
    w.selecionarAbaIaAprendizado('mapa');
    const htmlPainel = el('page-ia_aprendizado').innerHTML;
    assert.match(htmlPainel, /Etapas citadas:/);
    assert.match(htmlPainel, /Etapa A/);
    assert.match(htmlPainel, /Impacto efetivo ao aceitar:/);
    assert.match(htmlPainel, /Separe o item por etapa antes de decidir/);

    // 2. Pedido para etapa não vinculada (P_B em [B], pedido cita [A]) -> bloqueado
    const retEtNaoVinc = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perB.id,
        escopo_retirada: 'PARCIAL_FUNCOES',
        titulo: 'Retirar na Etapa A que não pertence ao item B',
        funcao_ids_sugeridas: [fnMot.id],
        etapa_ids_sugeridas: [etA.id]
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, retEtNaoVinc.id, 'ACEITAR'), /Etapa não vinculada/);

    // 3. Item sem etapa avaliada (etapa_ids=[]) + pedido citando etapa [A] -> bloqueado
    const retSemEt = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perSemEt.id,
        escopo_retirada: 'PARCIAL_FUNCOES',
        titulo: 'Retirar em item sem etapa avaliada',
        funcao_ids_sugeridas: [fnMot.id],
        etapa_ids_sugeridas: [etA.id]
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, retSemEt.id, 'ACEITAR'), /não possui etapas vinculadas/);

    // 4. Subconjunto de etapas cobrindo 100% das funções vinculadas ([Servente] x [A, B], pedido [Servente] + [A]) -> desvincula só Etapa A
    const retEtServ = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perServAB.id,
        escopo_retirada: 'PARCIAL_FUNCOES',
        titulo: 'Servente não usa foice na Etapa A',
        funcao_ids_sugeridas: [fnServ.id],
        etapa_ids_sugeridas: [etA.id]
    });
    const decEtServ = w.decidirRecomendacaoMapa(mapa.id, retEtServ.id, 'ACEITAR', { nota: 'Deslocamento sem lâmina exposta' });
    const perServDepois = w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perServAB.id);
    assert.equal(perServDepois.status, 'NAO_AVALIADO');
    assert.deepEqual(Array.from(perServDepois.funcao_ids), [fnServ.id]);
    assert.deepEqual(Array.from(perServDepois.etapa_ids), [etB.id]);
    assert.ok(decEtServ.snapshot_antes && decEtServ.snapshot_depois);
    assert.match(decEtServ.valor_aplicado, /Etapa B/);

    // 5. Subconjunto de etapas sem função em item multi-função -> bloqueado
    const retSubSemFn = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perAB.id,
        escopo_retirada: 'PARCIAL_FUNCOES',
        titulo: 'Retirar Etapa A sem informar funções',
        funcao_ids_sugeridas: [],
        etapa_ids_sugeridas: [etA.id]
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, retSubSemFn.id, 'ACEITAR'), /subconjunto de etapa sem função/);

    // 6. Redução por função SEM restrição de etapas (etapa_ids_sugeridas=[]) continua funcionando corretamente e preserva etapa_ids
    const retSoFn = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perAB.id,
        escopo_retirada: 'PARCIAL_FUNCOES',
        titulo: 'Remover Motorista de todo o perigo A/B',
        funcao_ids_sugeridas: [fnMot.id],
        etapa_ids_sugeridas: []
    });
    const decSoFn = w.decidirRecomendacaoMapa(mapa.id, retSoFn.id, 'ACEITAR');
    const perAbPosFn = w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perAB.id);
    assert.equal(perAbPosFn.status, 'NAO_AVALIADO');
    assert.deepEqual(Array.from(perAbPosFn.funcao_ids), [fnServ.id]);
    assert.deepEqual(Array.from(perAbPosFn.etapa_ids), [etA.id, etB.id]);
    assert.match(decSoFn.valor_aplicado, /etapas: Etapa A, Etapa B/);

    // 7. AJUSTAR em item compartilhado: etapa incompatível bloqueia sempre; ajuste compartilhado exige confirmação explícita
    const perCompAj = w.salvarPerigoMapa(mapa.id, {
        perigo_fonte: 'Movimentação de carga A/B',
        funcao_ids: [fnServ.id, fnMot.id],
        etapa_ids: [etA.id, etB.id],
        medidas_nr01: { engenharia_epc: 'Isolamento original' }
    });
    const ajEtIncomp = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perB.id,
        campo_alvo: 'evento_risco',
        titulo: 'Ajustar B citando A',
        descricao_proposta: 'Texto indevido',
        funcao_ids_sugeridas: [fnMot.id],
        etapa_ids_sugeridas: [etA.id]
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, ajEtIncomp.id, 'ACEITAR'), /escopo incompatível/);

    const ajCompSemEscopo = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perCompAj.id,
        campo_alvo: 'medidas_nr01.engenharia_epc',
        titulo: 'Ajustar EPC compartilhado sem escopo',
        descricao_proposta: 'Barreira para toda equipe'
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, ajCompSemEscopo.id, 'ACEITAR'), /item compartilhado/);

    const ajCompRestrito = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'AJUSTAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perCompAj.id,
        campo_alvo: 'medidas_nr01.engenharia_epc',
        titulo: 'Ajustar EPC pensando só no Motorista na Etapa A',
        descricao_proposta: 'Sinalização reforçada A/B',
        funcao_ids_sugeridas: [fnMot.id],
        etapa_ids_sugeridas: [etA.id]
    });
    assert.throws(() => w.decidirRecomendacaoMapa(mapa.id, ajCompRestrito.id, 'ACEITAR'), /item compartilhado/);
    const decAjOk = w.decidirRecomendacaoMapa(mapa.id, ajCompRestrito.id, 'ACEITAR', { confirmarAjusteCompartilhado: true });
    assert.equal(decAjOk.valor_anterior, 'Isolamento original');
    assert.equal(decAjOk.valor_aplicado, 'Sinalização reforçada A/B');

    // 8. Retirada global exige confirmarRetiradaGlobal citando funções E etapas atingidas
    const retGlobalPerm = w.registrarRecomendacaoMapa(mapa.id, {
        tipo: 'RETIRAR',
        alvo_ramo: 'PERIGO',
        alvo_item_id: perB.id,
        escopo_retirada: 'GLOBAL',
        titulo: 'Atividade B cancelada'
    });
    assert.throws(
        () => w.decidirRecomendacaoMapa(mapa.id, retGlobalPerm.id, 'ACEITAR'),
        /funções \[Servente, Motorista\].*etapas \[Etapa B\]/
    );
    w.decidirRecomendacaoMapa(mapa.id, retGlobalPerm.id, 'ACEITAR', { confirmarRetiradaGlobal: true });
    assert.equal(w.obterEstadoMapaMentalIa().mapas[0].perigos.find(p => p.id === perB.id).status, 'NAO_APLICAVEL');
});
