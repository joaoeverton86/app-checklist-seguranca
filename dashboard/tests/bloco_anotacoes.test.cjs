const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(raiz, 'dashboard', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'dashboard', 'dashboard.css'), 'utf8');
const codigo = fs.readFileSync(path.join(raiz, 'dashboard', 'modules', 'bloco_anotacoes.js'), 'utf8');
const listaTestes = fs.readFileSync(path.join(raiz, 'scripts', 'test-local.cjs'), 'utf8');

function carregarCore() {
    const sandbox = {
        console,
        Date,
        Math,
        JSON,
        Object,
        Array,
        String,
        Number,
        Boolean,
        Map,
        Promise,
        encodeURIComponent,
        decodeURIComponent,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox, { filename: 'dashboard/modules/bloco_anotacoes.js' });
    return sandbox.BlocoAnotacoesCore;
}

function storageDe(mapa) {
    return {
        getItem(chave) { return mapa.has(chave) ? mapa.get(chave) : null; },
        setItem(chave, valor) { mapa.set(String(chave), String(valor)); },
        removeItem(chave) { mapa.delete(chave); }
    };
}

function nota(parcial) {
    return Object.assign({
        id: 'nota_base0001',
        titulo: 'Nota',
        conteudo: '',
        etiqueta: 'Geral',
        cor: 'azul',
        fixada: false,
        criado_em: '2026-11-24T10:00:00.000Z',
        atualizado_em: '2026-11-24T10:00:00.000Z',
        autor: 'Ana',
        atualizado_por: 'Ana'
    }, parcial);
}

function criarAmbiente(Core) {
    const mapa = new Map();
    const nuvem = new Map();
    let sessao = { nome: 'Ana', matricula: '10' };
    let agoraIso = '2026-11-24T10:00:00.000Z';
    let falhaFetch = false;
    let falhaUpsert = false;
    let upserts = 0;
    const ctrl = Core.criarControlador({
        storage: storageDe(mapa),
        getIdentidade() { return Core.resolverIdentidade({ sessao: sessao }); },
        supabaseFetch(tabela, consulta) {
            assert.equal(tabela, 'configuracoes_sistema');
            if (falhaFetch) return Promise.reject(new Error('falha fetch'));
            const encontrado = /id=eq\.([^&]+)/.exec(consulta || '');
            const id = encontrado ? decodeURIComponent(encontrado[1]) : '';
            if (!nuvem.has(id)) return Promise.resolve([]);
            return Promise.resolve([{ id: id, valor: nuvem.get(id) }]);
        },
        supabaseUpsert(tabela, linhas) {
            assert.equal(tabela, 'configuracoes_sistema');
            if (falhaUpsert) return Promise.reject(new Error('falha upsert'));
            upserts += 1;
            nuvem.set(linhas[0].id, linhas[0].valor);
            return Promise.resolve(true);
        },
        agora() { return agoraIso; }
    });
    return {
        ctrl,
        mapa,
        nuvem,
        upserts() { return upserts; },
        setSessao(valor) { sessao = valor; },
        setAgora(valor) { agoraIso = valor; },
        setFalhaFetch(valor) { falhaFetch = valor; },
        setFalhaUpsert(valor) { falhaUpsert = valor; }
    };
}

test('presença no topo, drawer, script e estilos do modo escuro', () => {
    const topbar = html.indexOf('<div class="db-topbar">');
    const sininho = html.indexOf('id="wrapCentralAlertas"');
    const botao = html.indexOf('id="btnBlocoAnotacoesTopo"');
    const banner = html.indexOf('id="bannerPendenciasDia"');
    const drawer = html.indexOf('id="blocoAnotacoesDrawer"');
    const script = html.indexOf('src="modules/bloco_anotacoes.js?v=1"');
    const nucleo = html.indexOf('src="dashboard.js');
    assert.ok(topbar !== -1 && topbar < sininho && sininho < botao && botao < banner);
    assert.ok(drawer !== -1 && script > drawer && script > nucleo);
    const trecho = html.slice(botao - 120, botao + 420);
    assert.match(trecho, /title="Bloco de Anotações"/);
    assert.match(trecho, /aria-label="Bloco de Anotações"/);
    assert.match(trecho, /aria-expanded="false"/);
    assert.match(trecho, /aria-controls="blocoAnotacoesDrawer"/);
    assert.match(trecho, /id="badgeBlocoAnotacoesQtd"/);
    assert.match(trecho, /fa-note-sticky/);
    assert.match(html, /dashboard\.css\?v=296/);
    assert.equal(html.includes('dashboard.css?v=295'), false);
    assert.match(css, /\.db-bloco-drawer\s*\{[^}]*position:\s*fixed/);
    assert.match(css, /@media \(max-width:\s*720px\)\s*\{\s*\.db-bloco-drawer\s*\{\s*width:\s*100vw;/);
    assert.match(css, /body\.dark-mode \.db-bloco-drawer/);
    assert.match(css, /\[data-theme="dark"\] \.db-bloco-drawer/);
    assert.ok(listaTestes.includes("'dashboard/tests/bloco_anotacoes.test.cjs'"));
    const exportados = [...codigo.matchAll(/window\.([A-Za-z0-9_]+)\s*=[^=]/g)].map((item) => item[1]).sort();
    assert.deepEqual(exportados, [
        'BlocoAnotacoesCore',
        'abrirBlocoAnotacoesDrawer',
        'fecharBlocoAnotacoesDrawer',
        'toggleBlocoAnotacoesDrawer'
    ]);
    assert.equal(codigo.includes('window.confirm'), false);
    assert.equal(codigo.includes('onclick='), false);
});

test('CRUD, cancelamento sem corromper e exclusão com tombstone', () => {
    const Core = carregarCore();
    const vazio = Core.criarEstadoVazio();
    const criada = Core.criarNota(vazio, {
        id: 'nota_abc12345',
        titulo: '  ',
        conteudo: 'Levar a pauta da CIPA',
        etiqueta: 'Reunião'
    }, '2026-11-24T10:00:00.000Z', 'Ana');
    assert.equal(criada.descartado, false);
    assert.equal(criada.nota.titulo, 'Nota sem título');
    assert.equal(criada.nota.etiqueta, 'Reunião');
    assert.equal(criada.nota.cor, 'roxo');
    assert.equal(vazio.notas.length, 0);

    const sessao = Core.iniciarEdicao(criada.estado, 'nota_abc12345');
    sessao.rascunho.titulo = '<script>quebrado</script>';
    sessao.rascunho.conteudo = 'alterado e ainda não salvo';
    const cancelada = Core.cancelarEdicao(sessao);
    assert.equal(cancelada.notas[0].titulo, 'Nota sem título');
    assert.equal(cancelada.notas[0].conteudo, 'Levar a pauta da CIPA');
    assert.equal(criada.estado.notas[0].titulo, 'Nota sem título');
    assert.equal(sessao.snapshot.notas[0].conteudo, 'Levar a pauta da CIPA');

    const salva = Core.confirmarEdicao(criada.estado, sessao, {
        titulo: 'Pauta CIPA',
        conteudo: 'Revisar desvios da semana',
        etiqueta: 'Pendência'
    }, '2026-11-24T11:00:00.000Z', 'Ana');
    assert.equal(salva.estado.notas[0].titulo, 'Pauta CIPA');
    assert.equal(salva.estado.notas[0].etiqueta, 'Pendência');
    assert.equal(salva.estado.notas[0].cor, 'ambar');
    assert.equal(salva.estado.notas[0].autor, 'Ana');
    assert.equal(criada.estado.notas[0].titulo, 'Nota sem título');

    const vazia = Core.confirmarEdicao(salva.estado, Core.iniciarEdicao(salva.estado, 'nota_abc12345'), {
        titulo: '   ',
        conteudo: '   '
    }, '2026-11-24T11:30:00.000Z', 'Ana');
    assert.equal(vazia.descartado, true);
    assert.equal(vazia.estado.notas[0].titulo, 'Pauta CIPA');

    const excluida = Core.excluirNota(salva.estado, 'nota_abc12345', '2026-11-24T12:00:00.000Z');
    assert.equal(excluida.notas.length, 0);
    assert.equal(excluida.excluidas.nota_abc12345, '2026-11-24T12:00:00.000Z');
    assert.equal(salva.estado.notas.length, 1);
});

test('fixar e ordenar: fixadas primeiro e, dentro do grupo, a mais recente', () => {
    const Core = carregarCore();
    const notas = [
        nota({ id: 'nota_a111', titulo: 'A', fixada: false, atualizado_em: '2026-11-24T10:00:00.000Z' }),
        nota({ id: 'nota_b222', titulo: 'B', etiqueta: 'Urgente', cor: 'vermelho', fixada: true, atualizado_em: '2026-11-24T08:00:00.000Z' }),
        nota({ id: 'nota_c333', titulo: 'C', etiqueta: 'Campo', cor: 'verde', fixada: true, atualizado_em: '2026-11-24T12:00:00.000Z' }),
        nota({ id: 'nota_d444', titulo: 'D', etiqueta: 'Ideia', cor: 'ciano', fixada: false, atualizado_em: '2026-11-24T15:00:00.000Z' })
    ];
    const ordem = Core.ordenarNotas(notas).map((item) => item.id);
    assert.deepEqual(ordem, ['nota_c333', 'nota_b222', 'nota_d444', 'nota_a111']);
    assert.deepEqual(Core.ordenarNotas(notas).map((item) => item.id), ordem);
    assert.deepEqual(notas.map((item) => item.id), ['nota_a111', 'nota_b222', 'nota_c333', 'nota_d444']);

    let estado = { versao: 1, atualizado_em: '2026-11-24T10:00:00.000Z', notas: [nota({ id: 'nota_a111', fixada: false }), nota({ id: 'nota_d444', fixada: false, atualizado_em: '2026-11-24T09:00:00.000Z' })], excluidas: {} };
    estado = Core.alternarFixacao(estado, 'nota_d444', '2026-11-24T16:00:00.000Z', 'Ana');
    assert.equal(estado.notas.find((item) => item.id === 'nota_d444').fixada, true);
    assert.equal(Core.ordenarNotas(estado.notas)[0].id, 'nota_d444');
    estado = Core.alternarFixacao(estado, 'nota_d444', '2026-11-24T17:00:00.000Z', 'Ana');
    assert.equal(estado.notas.find((item) => item.id === 'nota_d444').fixada, false);
});

test('busca por título, conteúdo e etiqueta, e filtro de etiqueta ou fixadas', () => {
    const Core = carregarCore();
    const notas = [
        nota({ id: 'nota_a111', titulo: 'Inspeção de talude', conteudo: 'verificar linha de vida', etiqueta: 'Campo', cor: 'verde', fixada: false }),
        nota({ id: 'nota_b222', titulo: 'Escala', conteudo: 'combinar com a enfermaria', etiqueta: 'Urgente', cor: 'vermelho', fixada: true }),
        nota({ id: 'nota_c333', titulo: 'Ideia de DDS', conteudo: 'tema de hidratação', etiqueta: 'Ideia', cor: 'ciano', fixada: false })
    ];
    assert.deepEqual(Core.filtrarNotas(notas, { busca: 'talude' }).map((item) => item.id), ['nota_a111']);
    assert.deepEqual(Core.filtrarNotas(notas, { busca: 'enfermaria' }).map((item) => item.id), ['nota_b222']);
    assert.deepEqual(Core.filtrarNotas(notas, { busca: 'reuniao' }).map((item) => item.id), []);
    assert.deepEqual(Core.filtrarNotas(notas, { busca: 'urgente' }).map((item) => item.id), ['nota_b222']);
    assert.deepEqual(Core.filtrarNotas(notas, { etiqueta: 'Ideia' }).map((item) => item.id), ['nota_c333']);
    assert.deepEqual(Core.filtrarNotas(notas, { somenteFixadas: true }).map((item) => item.id), ['nota_b222']);
    assert.deepEqual(Core.filtrarNotas(notas, { somenteFixadas: true, busca: 'talude' }).map((item) => item.id), []);
    assert.equal(Core.ETIQUETAS.length >= 6, true);
});

test('isolamento entre usuários, anônimo e equipe', async () => {
    const Core = carregarCore();
    const ana = Core.resolverIdentidade({ sessao: { nome: 'Ana', matricula: '10' } });
    const bruno = Core.resolverIdentidade({ sessao: { nome: 'Bruno', matricula: '20' } });
    const anon = Core.resolverIdentidade({ sessao: null, nome: '' });
    const malicioso = Core.resolverIdentidade({ nome: '<script>alert(1)</script>' });
    assert.notEqual(ana.chaveMinhas, bruno.chaveMinhas);
    assert.match(ana.chaveMinhas, /^bloco_notas_user_m_10_[0-9a-f]{8}$/);
    assert.equal(ana.chaveMinhas, Core.resolverIdentidade({ sessao: { nome: 'Ana', matricula: '10' } }).chaveMinhas);
    assert.equal(Core.chaveArmazenamento(ana, 'equipe'), Core.CHAVE_EQUIPE);
    assert.equal(Core.chaveArmazenamento(bruno, 'equipe'), Core.CHAVE_EQUIPE);
    assert.equal(Core.chaveArmazenamento(anon, 'minhas'), Core.CHAVE_ANONIMO);
    assert.notEqual(Core.chaveArmazenamento(anon, 'minhas'), Core.CHAVE_EQUIPE);
    assert.equal(anon.identificado, false);
    assert.equal(Core.podeSincronizarNuvem(anon), false);
    assert.equal(Core.podeSincronizarNuvem(ana), true);
    assert.equal(Core.podeGravarEscopo(anon, 'equipe'), false);
    assert.equal(Core.podeGravarEscopo(anon, 'minhas'), true);
    assert.equal(malicioso.chaveMinhas.includes('<'), false);
    assert.match(malicioso.chaveMinhas, /^bloco_notas_user_[a-z0-9_]+$/);

    const ambiente = criarAmbiente(Core);
    const salva = await ambiente.ctrl.salvarCampos('minhas', null, { titulo: 'Segredo da Ana', conteudo: 'não compartilhar' });
    assert.equal(salva.status, 'nuvem');
    assert.equal(Core.TEXTOS[salva.status], 'Salvo na nuvem');
    await ambiente.ctrl.salvarCampos('equipe', null, { titulo: 'Reunião SESMT', conteudo: 'pauta comum' });

    ambiente.setSessao({ nome: 'Bruno', matricula: '20' });
    assert.equal(ambiente.ctrl.aoTrocarUsuario(), true);
    assert.equal(ambiente.ctrl.chaveAtual('minhas'), bruno.chaveMinhas);
    assert.equal(ambiente.ctrl.estado('minhas').notas.length, 0);
    assert.equal(String(ambiente.mapa.get(bruno.chaveMinhas) || '').includes('Segredo da Ana'), false);
    assert.ok(String(ambiente.mapa.get(ana.chaveMinhas)).includes('Segredo da Ana'));
    await ambiente.ctrl.hidratar('equipe');
    assert.equal(ambiente.ctrl.estado('equipe').notas.some((item) => item.titulo === 'Reunião SESMT'), true);

    ambiente.setSessao(null);
    assert.equal(ambiente.ctrl.aoTrocarUsuario(), true);
    const upsertsAntes = ambiente.upserts();
    const equipeAntes = ambiente.mapa.get(Core.CHAVE_EQUIPE);
    const recusa = await ambiente.ctrl.salvarCampos('equipe', null, { titulo: 'Invasão', conteudo: 'não pode' });
    assert.equal(recusa.ok, false);
    assert.equal(recusa.motivo, 'sem-permissao');
    assert.equal(ambiente.mapa.get(Core.CHAVE_EQUIPE), equipeAntes);
    assert.equal(ambiente.upserts(), upsertsAntes);
    const local = await ambiente.ctrl.salvarCampos('minhas', null, { titulo: 'Recado local', conteudo: 'só neste navegador' });
    assert.equal(local.status, 'local-anonimo');
    assert.equal(Core.TEXTOS[local.status], 'Salvo localmente');
    assert.equal(ambiente.upserts(), upsertsAntes);
    assert.ok(String(ambiente.mapa.get(Core.CHAVE_ANONIMO)).includes('Recado local'));
    assert.equal(String(ambiente.nuvem.get(Core.CHAVE_ANONIMO) || '').includes('Recado local'), false);
});

test('merge nuvem + local e fallback quando a nuvem falha', async () => {
    const Core = carregarCore();
    const local = {
        versao: 1,
        atualizado_em: '2026-11-24T12:00:00.000Z',
        notas: [
            nota({ id: 'nota_local01', titulo: 'Versão nova do celular', conteudo: 'local', atualizado_em: '2026-11-24T12:00:00.000Z' }),
            nota({ id: 'nota_solocal', titulo: 'Criada offline', conteudo: 'ainda não subiu', atualizado_em: '2026-11-24T12:30:00.000Z' }),
            nota({ id: 'nota_apagada', titulo: 'Velha', conteudo: 'vai sair', atualizado_em: '2026-11-24T09:00:00.000Z' })
        ],
        excluidas: {}
    };
    const remoto = {
        versao: 1,
        atualizado_em: '2026-11-24T11:00:00.000Z',
        notas: [
            nota({ id: 'nota_local01', titulo: 'Versão antiga da nuvem', conteudo: 'remota', atualizado_em: '2026-11-24T11:00:00.000Z' }),
            nota({ id: 'nota_socloud', titulo: 'Criada no escritório', conteudo: 'outro dispositivo', atualizado_em: '2026-11-24T11:30:00.000Z' }),
            nota({ id: 'nota_renasc', titulo: 'Editada depois', conteudo: 'volta', atualizado_em: '2026-11-24T13:00:00.000Z' })
        ],
        excluidas: {
            nota_apagada: '2026-11-24T12:10:00.000Z',
            nota_renasc: '2026-11-24T10:00:00.000Z'
        }
    };
    const mesclado = Core.mesclarPayloads(local, remoto);
    const porId = Object.fromEntries(mesclado.notas.map((item) => [item.id, item]));
    assert.equal(porId.nota_local01.titulo, 'Versão nova do celular');
    assert.equal(porId.nota_solocal.titulo, 'Criada offline');
    assert.equal(porId.nota_socloud.titulo, 'Criada no escritório');
    assert.equal(porId.nota_renasc.titulo, 'Editada depois');
    assert.equal(porId.nota_apagada, undefined);
    assert.equal(mesclado.excluidas.nota_apagada, '2026-11-24T12:10:00.000Z');
    assert.equal(mesclado.excluidas.nota_renasc, undefined);
    assert.deepEqual(local.excluidas, {});

    const ambiente = criarAmbiente(Core);
    const chave = ambiente.ctrl.chaveAtual('minhas');
    ambiente.mapa.set(chave, JSON.stringify(local));
    ambiente.nuvem.set(chave, JSON.stringify(remoto));
    const foto = await ambiente.ctrl.hidratar('minhas');
    assert.equal(foto.estado.notas.some((item) => item.id === 'nota_solocal'), true);
    assert.equal(foto.estado.notas.some((item) => item.id === 'nota_apagada'), false);
    assert.ok(String(ambiente.nuvem.get(chave)).includes('Criada offline'));

    ambiente.setFalhaFetch(true);
    const aposFalha = await ambiente.ctrl.hidratar('minhas');
    assert.equal(aposFalha.status, 'falha');
    assert.equal(Core.TEXTOS.falha, 'Falha na nuvem - salvo localmente');
    assert.equal(aposFalha.estado.notas.some((item) => item.id === 'nota_solocal'), true);

    ambiente.setFalhaFetch(false);
    ambiente.setFalhaUpsert(true);
    ambiente.setAgora('2026-11-24T18:00:00.000Z');
    const offline = await ambiente.ctrl.salvarCampos('minhas', null, { id: 'nota_offline1', titulo: 'Sem rede', conteudo: 'fica no navegador' });
    assert.equal(offline.ok, true);
    assert.equal(offline.status, 'falha');
    assert.ok(String(ambiente.mapa.get(chave)).includes('Sem rede'));
});

test('escape de HTML contra XSS', () => {
    const Core = carregarCore();
    const ataque = '<script>alert(1)</script><img src=x onerror="alert(1)">';
    assert.equal(Core.escaparHtml(`"'<>&`), '&quot;&#39;&lt;&gt;&amp;');
    const htmlNotas = Core.renderizarLista([nota({
        id: 'nota_xss1234',
        titulo: ataque,
        conteudo: ataque,
        autor: ataque,
        atualizado_por: ataque,
        etiqueta: 'Geral'
    })], { escopo: 'equipe' });
    assert.equal(htmlNotas.includes(ataque), false);
    assert.ok(htmlNotas.includes(Core.escaparHtml(ataque)));
    assert.equal(/<\s*script/i.test(htmlNotas), false);
    assert.equal(/<\s*img/i.test(htmlNotas), false);
    assert.equal(/onclick\s*=/i.test(htmlNotas), false);

    const htmlEditor = Core.renderizarEditor({
        titulo: 'a" onmouseover="alert(1)',
        conteudo: ataque,
        etiqueta: 'Geral',
        cor: 'azul',
        fixada: false
    });
    assert.equal(htmlEditor.includes(ataque), false);
    assert.equal(htmlEditor.includes('value="a"'), false);
    assert.ok(htmlEditor.includes('value="a&quot; onmouseover=&quot;alert(1)"'));
    assert.equal(/<\s*script/i.test(htmlEditor), false);
});

function idDaConsulta(consulta) {
    const encontrado = /id=eq\.([^&]+)/.exec(consulta || '');
    return encontrado ? decodeURIComponent(encontrado[1]) : '';
}

function idsDasNotas(valor) {
    const estado = JSON.parse(String(valor || '{"notas":[]}'));
    return (estado.notas || []).map((item) => item.id).sort();
}

function controladorComNuvem(Core, nuvem, identidade) {
    const mapa = new Map();
    let agoraIso = '2026-11-24T10:00:00.000Z';
    const ctrl = Core.criarControlador({
        storage: storageDe(mapa),
        getIdentidade() { return identidade; },
        supabaseFetch(tabela, consulta) {
            assert.equal(tabela, 'configuracoes_sistema');
            const id = idDaConsulta(consulta);
            if (!nuvem.has(id)) return Promise.resolve([]);
            return Promise.resolve([{ id, valor: nuvem.get(id) }]);
        },
        supabaseUpsert(tabela, linhas) {
            assert.equal(tabela, 'configuracoes_sistema');
            nuvem.set(linhas[0].id, linhas[0].valor);
            return Promise.resolve(true);
        },
        agora() { return agoraIso; }
    });
    return {
        ctrl,
        mapa,
        setAgora(valor) { agoraIso = valor; }
    };
}

async function esperarCondicao(condicao) {
    for (let i = 0; i < 80; i += 1) {
        if (condicao()) return;
        await Promise.resolve();
    }
    assert.equal(condicao(), true);
}

function carregarEditor(opcoes) {
    const timers = [];
    let sequencia = 0;
    const sandbox = {
        console,
        Date,
        Math,
        JSON,
        Object,
        Array,
        String,
        Number,
        Boolean,
        Map,
        Promise,
        encodeURIComponent,
        decodeURIComponent,
        setTimeout(fn, ms) {
            sequencia += 1;
            const id = sequencia;
            timers.push({ id, fn, ms });
            return id;
        },
        clearTimeout(id) {
            const indice = timers.findIndex((item) => item.id === id);
            if (indice >= 0) timers.splice(indice, 1);
        },
        setInterval() { return 0; },
        clearInterval() {}
    };
    if (opcoes && opcoes.document) sandbox.document = opcoes.document;
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox, { filename: 'dashboard/modules/bloco_anotacoes.js' });
    return { Core: sandbox.BlocoAnotacoesCore, timers };
}

function statusDeTeste() {
    return {
        textContent: '',
        estado: '',
        setAttribute(nome, valor) {
            if (nome === 'data-estado') this.estado = valor;
        }
    };
}

function documentoComStatus(status) {
    return {
        getElementById(id) {
            return id === 'blocoAnotacoesStatus' ? status : null;
        }
    };
}

function notaDoValor(valor, id) {
    const estado = JSON.parse(String(valor || '{"notas":[]}'));
    return (estado.notas || []).find((item) => item.id === id) || null;
}

test('José e Jose geram chaves distintas e não compartilham notas', async () => {
    const Core = carregarCore();
    const jose = Core.resolverIdentidade({ nome: 'José' });
    const semAcento = Core.resolverIdentidade({ nome: 'Jose' });
    assert.notEqual(jose.chaveMinhas, semAcento.chaveMinhas);
    assert.equal(jose.chaveMinhas, Core.resolverIdentidade({ nome: 'José' }).chaveMinhas);
    assert.equal(semAcento.chaveMinhas, Core.resolverIdentidade({ nome: 'Jose' }).chaveMinhas);
    assert.match(jose.chaveMinhas, /^bloco_notas_user_n_jose_[0-9a-f]{8}$/);
    assert.match(semAcento.chaveMinhas, /^bloco_notas_user_n_jose_[0-9a-f]{8}$/);
    assert.equal(jose.chaveMinhas, Core.PREFIXO_USUARIO + 'n_jose_' + Core.hashFnv1a('n_José'));
    assert.equal(semAcento.chaveMinhas, Core.PREFIXO_USUARIO + 'n_jose_' + Core.hashFnv1a('n_Jose'));
    const pontuado = Core.resolverIdentidade({ nome: 'Ana!' });
    const liso = Core.resolverIdentidade({ nome: 'Ana' });
    assert.notEqual(pontuado.chaveMinhas, liso.chaveMinhas);

    const peloUid = Core.resolverIdentidade({
        sessao: { nome: 'José', matricula: '1', email: 'a@b.c', auth_user_id: 'uid-estavel' }
    });
    const mesmoUid = Core.resolverIdentidade({
        sessao: { nome: 'Jose', matricula: '2', email: 'c@d.e', auth_user_id: 'uid-estavel' }
    });
    assert.equal(peloUid.chaveMinhas, mesmoUid.chaveMinhas);
    const mail1 = Core.resolverIdentidade({ sessao: { nome: 'José', email: ' Ana@Exemplo.com ' } });
    const mail2 = Core.resolverIdentidade({ sessao: { nome: 'Jose', email: 'ana@exemplo.com' } });
    assert.equal(mail1.chaveMinhas, mail2.chaveMinhas);
    assert.notEqual(mail1.chaveMinhas, jose.chaveMinhas);

    const nuvem = new Map();
    const blocoJose = controladorComNuvem(Core, nuvem, jose);
    const blocoSemAcento = controladorComNuvem(Core, nuvem, semAcento);
    await blocoJose.ctrl.salvarCampos('minhas', 'nota_jose111', { titulo: 'Do José', conteudo: 'com acento' });
    await blocoSemAcento.ctrl.salvarCampos('minhas', 'nota_jose222', { titulo: 'Do Jose', conteudo: 'sem acento' });
    assert.equal(String(blocoJose.mapa.get(jose.chaveMinhas)).includes('Do José'), true);
    assert.equal(String(blocoJose.mapa.get(jose.chaveMinhas)).includes('Do Jose'), false);
    assert.equal(String(blocoSemAcento.mapa.get(semAcento.chaveMinhas)).includes('Do Jose'), true);
    assert.equal(String(blocoSemAcento.mapa.get(semAcento.chaveMinhas)).includes('Do José'), false);
    assert.notEqual(nuvem.get(jose.chaveMinhas), nuvem.get(semAcento.chaveMinhas));
});

test('duas sessões hidratadas preservam as notas A e B na nuvem', async () => {
    const Core = carregarCore();
    const nuvem = new Map();
    const ana = Core.resolverIdentidade({ sessao: { nome: 'Ana', matricula: '10' } });
    const bruno = Core.resolverIdentidade({ sessao: { nome: 'Bruno', matricula: '20' } });
    const sessao1 = controladorComNuvem(Core, nuvem, ana);
    const sessao2 = controladorComNuvem(Core, nuvem, bruno);
    await sessao1.ctrl.hidratar('equipe');
    await sessao2.ctrl.hidratar('equipe');
    sessao1.setAgora('2026-11-24T10:01:00.000Z');
    await sessao1.ctrl.salvarCampos('equipe', 'nota_aaaa1111', { titulo: 'Nota A', conteudo: 'da sessão 1' });
    sessao2.setAgora('2026-11-24T10:02:00.000Z');
    await sessao2.ctrl.salvarCampos('equipe', 'nota_bbbb2222', { titulo: 'Nota B', conteudo: 'da sessão 2' });
    assert.deepEqual(idsDasNotas(nuvem.get(Core.CHAVE_EQUIPE)), ['nota_aaaa1111', 'nota_bbbb2222']);

    const corrida = new Map();
    const lado1 = controladorComNuvem(Core, corrida, ana);
    const lado2 = controladorComNuvem(Core, corrida, bruno);
    await lado1.ctrl.hidratar('equipe');
    await lado2.ctrl.hidratar('equipe');
    lado1.setAgora('2026-11-24T11:01:00.000Z');
    lado2.setAgora('2026-11-24T11:02:00.000Z');
    await Promise.all([
        lado1.ctrl.salvarCampos('equipe', 'nota_cccc3333', { titulo: 'Nota C', conteudo: 'junto' }),
        lado2.ctrl.salvarCampos('equipe', 'nota_dddd4444', { titulo: 'Nota D', conteudo: 'junto' })
    ]);
    assert.deepEqual(idsDasNotas(corrida.get(Core.CHAVE_EQUIPE)), ['nota_cccc3333', 'nota_dddd4444']);

    const ambiente = criarAmbiente(Core);
    const chave = Core.CHAVE_EQUIPE;
    ambiente.nuvem.set(chave, JSON.stringify({
        versao: 1,
        atualizado_em: '2026-11-24T09:00:00.000Z',
        notas: [nota({ id: 'nota_cloud01', titulo: 'Nuvem', conteudo: 'preservar' })],
        excluidas: {}
    }));
    const nuvemAntes = ambiente.nuvem.get(chave);
    ambiente.setFalhaFetch(true);
    const upsertsAntes = ambiente.upserts();
    const local = await ambiente.ctrl.salvarCampos('equipe', 'nota_local99', { titulo: 'Local', conteudo: 'só neste navegador' });
    assert.equal(local.status, 'falha-sync');
    assert.equal(Core.TEXTOS['falha-sync'], 'Falha ao sincronizar — salvo localmente');
    assert.equal(ambiente.upserts(), upsertsAntes);
    assert.equal(ambiente.nuvem.get(chave), nuvemAntes);
    assert.equal(String(ambiente.mapa.get(chave)).includes('só neste navegador'), true);
});

test('Salvar durante um autosave lento grava o texto mais recente antes de fechar', async () => {
    const { Core, timers } = carregarEditor();
    const mapa = new Map();
    const nuvem = new Map();
    let chamadas = 0;
    let liberarPrimeiro = null;
    const ctrl = Core.criarControlador({
        storage: storageDe(mapa),
        getIdentidade() { return Core.resolverIdentidade({ sessao: { nome: 'Ana', matricula: '10' } }); },
        supabaseFetch(tabela, consulta) {
            assert.equal(tabela, 'configuracoes_sistema');
            const id = idDaConsulta(consulta);
            if (!nuvem.has(id)) return Promise.resolve([]);
            return Promise.resolve([{ id, valor: nuvem.get(id) }]);
        },
        supabaseUpsert(tabela, linhas) {
            assert.equal(tabela, 'configuracoes_sistema');
            chamadas += 1;
            const aplicar = () => nuvem.set(linhas[0].id, linhas[0].valor);
            if (chamadas === 1) {
                return new Promise((resolve) => {
                    liberarPrimeiro = () => {
                        aplicar();
                        resolve(true);
                    };
                });
            }
            aplicar();
            return Promise.resolve(true);
        },
        agora() { return '2026-11-24T10:00:00.000Z'; }
    });
    const ui = Core.testesUi;
    ui.preparar(ctrl, 'minhas');
    ui.abrirNova();
    ui.definirRascunho({ titulo: 'Visita', conteudo: 'texto antigo' });
    ui.agendarAutoSave();
    assert.equal(timers.length, 1);
    assert.equal(timers[0].ms, Core.AUTOSAVE_MS);
    const disparo = timers[0].fn;
    timers.splice(0, 1);
    disparo();
    ui.definirRascunho({ titulo: 'Visita', conteudo: 'texto mais recente' });
    ui.agendarAutoSave();
    assert.equal(timers.length, 1);
    ui.salvar(true);
    assert.equal(timers.length, 0);
    await esperarCondicao(() => chamadas >= 1);
    assert.notEqual(ui.lerEditor(), null);
    assert.equal(ui.lerEditor().conteudo, 'texto mais recente');
    liberarPrimeiro();
    await esperarCondicao(() => ui.lerEditor() === null && String(nuvem.get(ctrl.chaveAtual('minhas')) || '').includes('texto mais recente'));
    const final = JSON.parse(nuvem.get(ctrl.chaveAtual('minhas')));
    assert.equal(final.notas.some((item) => item.conteudo === 'texto mais recente'), true);
    assert.equal(final.notas.some((item) => item.conteudo === 'texto antigo'), false);
    assert.equal(String(mapa.get(ctrl.chaveAtual('minhas'))).includes('texto mais recente'), true);
});

test('trocar de nota com salvamento pendente não altera o editor aberto', async () => {
    const { Core } = carregarEditor();
    const mapa = new Map();
    const nuvem = new Map();
    let chamadas = 0;
    let liberarPrimeiro = null;
    const ctrl = Core.criarControlador({
        storage: storageDe(mapa),
        getIdentidade() { return Core.resolverIdentidade({ sessao: { nome: 'Ana', matricula: '10' } }); },
        supabaseFetch(tabela, consulta) {
            assert.equal(tabela, 'configuracoes_sistema');
            const id = idDaConsulta(consulta);
            if (!nuvem.has(id)) return Promise.resolve([]);
            return Promise.resolve([{ id, valor: nuvem.get(id) }]);
        },
        supabaseUpsert(tabela, linhas) {
            assert.equal(tabela, 'configuracoes_sistema');
            chamadas += 1;
            const aplicar = () => nuvem.set(linhas[0].id, linhas[0].valor);
            if (chamadas === 1) {
                return new Promise((resolve) => {
                    liberarPrimeiro = () => {
                        aplicar();
                        resolve(true);
                    };
                });
            }
            aplicar();
            return Promise.resolve(true);
        },
        agora() { return '2026-11-24T10:05:00.000Z'; }
    });
    const ui = Core.testesUi;
    ui.preparar(ctrl, 'minhas');
    ui.abrirNova();
    const notaA = ui.lerEditor();
    ui.definirRascunho({ titulo: 'Nota A', conteudo: 'conteudo A' });
    const pendente = ui.salvar(false);
    ui.abrirNova();
    const notaB = ui.lerEditor();
    ui.definirRascunho({ titulo: 'Nota B', conteudo: 'conteudo B' });
    assert.notEqual(notaA.notaId, notaB.notaId);
    assert.notEqual(notaA.token, ui.token());
    await esperarCondicao(() => chamadas >= 1);
    assert.equal(ui.lerEditor().notaId, notaB.notaId);
    assert.equal(ui.lerEditor().titulo, 'Nota B');
    assert.equal(ui.lerEditor().conteudo, 'conteudo B');
    liberarPrimeiro();
    await pendente;
    const editor = ui.lerEditor();
    assert.equal(editor.notaId, notaB.notaId);
    assert.equal(editor.titulo, 'Nota B');
    assert.equal(editor.conteudo, 'conteudo B');
    assert.equal(editor.token, ui.token());
    const guardado = JSON.parse(mapa.get(ctrl.chaveAtual('minhas')));
    const salvaA = guardado.notas.find((item) => item.id === notaA.notaId);
    assert.equal(salvaA.titulo, 'Nota A');
    assert.equal(salvaA.conteudo, 'conteudo A');
    assert.equal(guardado.notas.some((item) => item.id === notaB.notaId), false);
});

test('salvamento explicito de B espera o termino de A e persiste sem contaminar o editor', async () => {
    const status = statusDeTeste();
    const { Core } = carregarEditor({ document: documentoComStatus(status) });
    const mapa = new Map();
    const nuvem = new Map();
    let chamadas = 0;
    let upsertsB = 0;
    let liberarA = null;
    let liberarB = null;
    let editorQuandoBChegou = null;
    const ui = Core.testesUi;
    const ctrl = Core.criarControlador({
        storage: storageDe(mapa),
        getIdentidade() { return Core.resolverIdentidade({ sessao: { nome: 'Ana', matricula: '10' } }); },
        supabaseFetch(tabela, consulta) {
            assert.equal(tabela, 'configuracoes_sistema');
            const id = idDaConsulta(consulta);
            if (!nuvem.has(id)) return Promise.resolve([]);
            return Promise.resolve([{ id, valor: nuvem.get(id) }]);
        },
        supabaseUpsert(tabela, linhas) {
            assert.equal(tabela, 'configuracoes_sistema');
            chamadas += 1;
            const valor = linhas[0].valor;
            const aplicar = () => nuvem.set(linhas[0].id, valor);
            if (!String(valor).includes('conteudo B')) {
                if (!liberarA) {
                    return new Promise((resolve) => {
                        liberarA = () => {
                            aplicar();
                            resolve(true);
                        };
                    });
                }
                aplicar();
                return Promise.resolve(true);
            }
            upsertsB += 1;
            if (upsertsB === 1) {
                editorQuandoBChegou = ui.lerEditor();
                return new Promise((resolve) => {
                    liberarB = () => {
                        aplicar();
                        resolve(true);
                    };
                });
            }
            aplicar();
            return Promise.resolve(true);
        },
        agora() { return '2026-11-24T10:06:00.000Z'; }
    });
    ui.preparar(ctrl, 'minhas');
    ui.abrirNova();
    const notaA = ui.lerEditor();
    ui.definirRascunho({ titulo: 'Nota A', conteudo: 'conteudo A' });
    const pendenteA = ui.salvar(false);
    await esperarCondicao(() => typeof liberarA === 'function');
    ui.abrirNova();
    const notaB = ui.lerEditor();
    ui.definirRascunho({ titulo: 'Nota B', conteudo: 'conteudo B' });
    let resolveuB = false;
    const salvandoB = ui.salvar(true).then(() => { resolveuB = true; });
    assert.notEqual(notaA.notaId, notaB.notaId);
    assert.equal(ui.lerEditor().notaId, notaB.notaId);
    assert.equal(ui.lerEditor().titulo, 'Nota B');
    assert.equal(ui.lerEditor().conteudo, 'conteudo B');
    assert.equal(String(mapa.get(ctrl.chaveAtual('minhas')) || '').includes('conteudo B'), false);
    assert.equal(resolveuB, false);
    liberarA();
    await pendenteA;
    await esperarCondicao(() => typeof liberarB === 'function');
    assert.equal(resolveuB, false);
    assert.equal(editorQuandoBChegou.notaId, notaB.notaId);
    assert.equal(editorQuandoBChegou.titulo, 'Nota B');
    assert.equal(editorQuandoBChegou.conteudo, 'conteudo B');
    assert.equal(editorQuandoBChegou.persistido, false);
    assert.equal(editorQuandoBChegou.token, notaB.token);
    const durante = ui.lerEditor();
    assert.equal(durante.notaId, notaB.notaId);
    assert.equal(durante.titulo, 'Nota B');
    assert.equal(durante.conteudo, 'conteudo B');
    assert.equal(durante.persistido, false);
    assert.equal(durante.token, notaB.token);
    assert.equal(status.estado, 'salvando');
    assert.equal(String(mapa.get(ctrl.chaveAtual('minhas'))).includes('conteudo B'), true);
    assert.equal(String(nuvem.get(ctrl.chaveAtual('minhas')) || '').includes('conteudo B'), false);
    liberarB();
    await salvandoB;
    assert.equal(resolveuB, true);
    assert.equal(ui.lerEditor(), null);
    assert.equal(status.estado, 'nuvem');
    assert.equal(status.textContent, Core.TEXTOS.nuvem);
    assert.equal(ctrl.status('minhas'), 'nuvem');
    const chave = ctrl.chaveAtual('minhas');
    const localA = notaDoValor(mapa.get(chave), notaA.notaId);
    const localB = notaDoValor(mapa.get(chave), notaB.notaId);
    const nuvemA = notaDoValor(nuvem.get(chave), notaA.notaId);
    const nuvemB = notaDoValor(nuvem.get(chave), notaB.notaId);
    assert.equal(localA.titulo, 'Nota A');
    assert.equal(localA.conteudo, 'conteudo A');
    assert.equal(localB.titulo, 'Nota B');
    assert.equal(localB.conteudo, 'conteudo B');
    assert.equal(nuvemA.titulo, 'Nota A');
    assert.equal(nuvemA.conteudo, 'conteudo A');
    assert.equal(nuvemB.titulo, 'Nota B');
    assert.equal(nuvemB.conteudo, 'conteudo B');
    assert.notEqual(localA.id, localB.id);
});

test('trocar para C antes de B gravar persiste B e nao altera o editor de C', async () => {
    const { Core } = carregarEditor();
    const mapa = new Map();
    const nuvem = new Map();
    let chamadas = 0;
    let liberarA = null;
    const ctrl = Core.criarControlador({
        storage: storageDe(mapa),
        getIdentidade() { return Core.resolverIdentidade({ sessao: { nome: 'Ana', matricula: '10' } }); },
        supabaseFetch(tabela, consulta) {
            assert.equal(tabela, 'configuracoes_sistema');
            const id = idDaConsulta(consulta);
            if (!nuvem.has(id)) return Promise.resolve([]);
            return Promise.resolve([{ id, valor: nuvem.get(id) }]);
        },
        supabaseUpsert(tabela, linhas) {
            assert.equal(tabela, 'configuracoes_sistema');
            chamadas += 1;
            const aplicar = () => nuvem.set(linhas[0].id, linhas[0].valor);
            if (chamadas === 1) {
                return new Promise((resolve) => {
                    liberarA = () => {
                        aplicar();
                        resolve(true);
                    };
                });
            }
            aplicar();
            return Promise.resolve(true);
        },
        agora() { return '2026-11-24T10:07:00.000Z'; }
    });
    const ui = Core.testesUi;
    ui.preparar(ctrl, 'minhas');
    ui.abrirNova();
    const notaA = ui.lerEditor();
    ui.definirRascunho({ titulo: 'Nota A', conteudo: 'conteudo A' });
    ui.salvar(false);
    await esperarCondicao(() => chamadas >= 1);
    ui.abrirNova();
    const notaB = ui.lerEditor();
    ui.definirRascunho({ titulo: 'Nota B', conteudo: 'conteudo B' });
    const salvandoB = ui.salvar(true);
    ui.abrirNova();
    ui.definirRascunho({ titulo: 'Nota C', conteudo: 'conteudo C' });
    const notaC = ui.lerEditor();
    liberarA();
    await salvandoB;
    const editorC = ui.lerEditor();
    assert.equal(editorC.notaId, notaC.notaId);
    assert.equal(editorC.titulo, 'Nota C');
    assert.equal(editorC.conteudo, 'conteudo C');
    assert.equal(editorC.persistido, false);
    assert.equal(editorC.token, notaC.token);
    const chave = ctrl.chaveAtual('minhas');
    const localA = notaDoValor(mapa.get(chave), notaA.notaId);
    const localB = notaDoValor(mapa.get(chave), notaB.notaId);
    const nuvemA = notaDoValor(nuvem.get(chave), notaA.notaId);
    const nuvemB = notaDoValor(nuvem.get(chave), notaB.notaId);
    assert.equal(localA.conteudo, 'conteudo A');
    assert.equal(localB.conteudo, 'conteudo B');
    assert.equal(nuvemA.conteudo, 'conteudo A');
    assert.equal(nuvemB.conteudo, 'conteudo B');
    assert.equal(notaDoValor(mapa.get(chave), notaC.notaId), null);
    assert.equal(String(nuvem.get(chave) || '').includes('conteudo C'), false);
});
