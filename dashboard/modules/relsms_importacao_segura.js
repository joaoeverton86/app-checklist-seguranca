/* Importação com revisão explícita. Não infere execução nem substitui seleção existente. */
function relSmsImportacaoNormalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function relSmsImportacaoLerNome(nome, mes, ano) {
    const texto = String(nome || '').trim();
    const iso = texto.match(/^\[?(\d{4})-(\d{2})-(\d{2})\]?(?:\s+|$)/);
    const br = !iso && texto.match(/^\[?(\d{2})[/.\-](\d{2})(?:[/.\-](\d{4}))?\]?(?:\s+|$)/);
    if (!iso && !br) return { erro: 'Data ausente ou formato não reconhecido.' };
    const a = Number(iso ? iso[1] : br[3] || ano);
    const m = Number(iso ? iso[2] : br[2]);
    const d = Number(iso ? iso[3] : br[1]);
    const data = `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const verificada = new Date(Date.UTC(a, m - 1, d));
    if (verificada.toISOString().slice(0, 10) !== data) return { erro: 'Data inválida.' };
    if (a !== ano || m !== mes + 1) return { erro: 'Pasta fora da competência selecionada.' };
    const tema = texto.slice((iso || br)[0].length).replace(/^[-—–:]\s*/, '').trim();
    if (!tema) return { erro: 'Tema ausente no nome da pasta.' };
    return { data, tema };
}

function relSmsImportacaoPlanejar(doc, subpastas, calendario, tipo) {
    if (!['treinamento', 'ddsma'].includes(tipo) || !Array.isArray(subpastas) || !Array.isArray(calendario)) throw new Error('Categoria ou resposta de consulta inválida.');
    const candidato = structuredClone(doc);
    const itens = [];
    const pendencias = [];
    const utilizados = new Set(doc.grupos.flatMap(g => g.fotos.map(f => f.id)));
    const alvos = new Set();
    const chave = g => `${g.tipo}|${g.data}|${relSmsImportacaoNormalizar(g.tema)}`;
    // Ordem da resposta do Drive não decide qual evidência vence.
    const pastas = subpastas.map(sub => ({ sub, lido: relSmsImportacaoLerNome(sub.pastaNome, doc.mes, doc.ano) }));
    const frequencias = new Map();
    const frequenciasAlvos = new Map();
    const corresponder = lido => calendario.filter(c => c.tipo === tipo && c.data === lido.data && (
        relSmsImportacaoNormalizar(c.tema) === relSmsImportacaoNormalizar(lido.tema) ||
        (c.codigo && relSmsImportacaoNormalizar(c.codigo + ' - ' + c.tema) === relSmsImportacaoNormalizar(lido.tema))
    ));
    for (const { lido } of pastas) {
        if (!lido.erro) {
            const k = lido.data + '|' + relSmsImportacaoNormalizar(lido.tema);
            frequencias.set(k, (frequencias.get(k) || 0) + 1);
            const unicos = [...new Map(corresponder(lido).map(c => [chave(c), c])).values()];
            if (unicos.length === 1) {
                const alvo = chave(unicos[0]);
                frequenciasAlvos.set(alvo, (frequenciasAlvos.get(alvo) || 0) + 1);
            }
        }
    }
    for (const { sub, lido } of pastas) {
        const pendente = motivo => pendencias.push({ pasta: String(sub.pastaNome || ''), motivo });
        if (lido.erro) { pendente(lido.erro); continue; }
        if (frequencias.get(lido.data + '|' + relSmsImportacaoNormalizar(lido.tema)) > 1) { pendente('Mais de uma pasta para o mesmo tema e data; escolha manualmente.'); continue; }
        const fotos = sub.fotos;
        if (!Array.isArray(fotos) || fotos.length !== 2) { pendente('São necessárias exatamente duas fotos por tema; nenhuma foi escolhida automaticamente.'); continue; }
        if (fotos.some(f => !/^[\w-]{10,150}$/.test(f.id || '') || (f.mimeType ? !/^image\/(jpeg|png|webp)$/.test(f.mimeType) : !/\.(jpe?g|png|webp)$/i.test(f.nome || '')))) { pendente('Há foto com formato ou identificador não suportado.'); continue; }
        if (fotos[0].id === fotos[1].id || fotos.some(f => utilizados.has(f.id))) { pendente('Foto repetida ou já selecionada em outro bloco.'); continue; }
        const correspondencias = corresponder(lido);
        const unicas = [...new Map(correspondencias.map(c => [relSmsImportacaoNormalizar(c.tema), c])).values()];
        if (unicas.length !== 1) { pendente('Tema/data sem correspondência única no calendário escolhido.'); continue; }
        const evento = unicas[0];
        const k = chave(evento);
        if (alvos.has(k) || frequenciasAlvos.get(k) > 1) { pendente('Duas pastas correspondem ao mesmo evento; escolha manualmente.'); continue; }
        alvos.add(k);
        const existentes = candidato.grupos.filter(g => chave(g) === k);
        if (existentes.length > 1 || existentes.some(g => g.fotos.length)) { pendente('O evento já possui fotos ou blocos duplicados; seleção preservada.'); continue; }
        const grupo = existentes[0] || { tipo, tema: evento.tema, data: evento.data, fotos: [] };
        grupo.fotos = fotos.map(f => ({ id: f.id, nome: String(f.nome).slice(0, 180) }));
        if (!existentes.length) candidato.grupos.push(grupo);
        grupo.fotos.forEach(f => utilizados.add(f.id));
        itens.push({ tema: grupo.tema, data: grupo.data, fotos: grupo.fotos, referencia: evento.referencia });
    }
    return { candidato, itens, pendencias };
}

async function relSmsImportacaoCalendario(tipo, mes, ano) {
    const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const inicio = prefixo + '-01';
    const fim = prefixo + '-' + new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    if (tipo === 'ddsma') {
        const rows = await supabaseFetch('dds_temas_cronograma', `?select=id,data,tema&data=gte.${inicio}&data=lte.${fim}`);
        return rows.map(r => ({ tipo, tema: r.tema, data: r.data, referencia: 'Data do calendário DDSMA; confirmar aplicação.' }));
    }
    const [rows, catalogo] = await Promise.all([
        supabaseFetch('treinamentos_cronograma', `?select=*&or=(and(data_prevista.gte.${inicio},data_prevista.lte.${fim}),and(data_realizada.gte.${inicio},data_realizada.lte.${fim}))`),
        supabaseFetch('treinamentos_catalogo', '?select=id,nome')
    ]);
    return rows.filter(r => !['cancelado', 'cancelada'].includes(String(r.status || '').toLowerCase())).map(r => ({
        tipo, tema: catalogo.find(c => String(c.id) === String(r.treinamento_cod))?.nome || r.treinamento_nome,
        codigo: String(r.treinamento_cod || ''), data: String(r.data_realizada || r.data_prevista || '').slice(0, 10),
        referencia: r.data_realizada ? 'Data realizada registrada no cronograma.' : 'Data prevista; confirmar aplicação.'
    }));
}

async function relSmsImportarFotosComPrevia() {
    const s = relSmsFotosEstado;
    if (!relSmsFotosPodeEditar()) return;
    if (s.editor || s.editando >= 0) { relSmsFotosMensagem('Aplique ou descarte o tema que está editando antes de importar.'); return; }
    const docInicial = s.doc;
    // O diálogo nativo torna inerte o conteúdo externo: as etapas da importação
    // precisam pertencer ao organizador para receber foco e cliques.
    const alvoDialogo = document.getElementById('relSmsFotosModal') || document.body;
    let tipo, link;
    if (typeof Swal !== 'undefined') {
        const r = await Swal.fire({ target: alvoDialogo, title: 'Consultar fotos da pasta do mês',
            html: '<label>Categoria<select id="rfImportTipo"><option value="treinamento">Treinamentos</option><option value="ddsma">DDSMA</option></select></label><label>Link da pasta do mês<input id="rfImportLink" type="url" class="swal2-input"></label><p>A consulta não altera compartilhamento. Confira tema, data e fotos na prévia antes de salvar.</p>',
            showCancelButton: true, confirmButtonText: 'Consultar prévia', cancelButtonText: 'Cancelar',
            preConfirm: () => ({ tipo: document.getElementById('rfImportTipo').value, link: document.getElementById('rfImportLink').value.trim() }) });
        if (!r.isConfirmed) return;
        ({ tipo, link } = r.value);
    } else {
        tipo = prompt('Categoria: treinamento ou ddsma', 'treinamento');
        if (!tipo) return;
        link = prompt('Link da pasta do mês no Drive:', '');
        if (!link) return;
    }
    const pastaId = relSmsFotosExtrairIdPasta(link);
    if (!['treinamento', 'ddsma'].includes(tipo) || !pastaId) { relSmsFotosMensagem('Informe a categoria e o link da pasta do mês.'); return; }
    const webhook = typeof getDriveGasWebhookUrl === 'function' ? getDriveGasWebhookUrl() : '';
    if (!webhook) { relSmsFotosMensagem('Configure a integração do Drive para consultar a pasta. O Word manual permanece disponível.'); return; }
    if (s.doc !== docInicial || !relSmsFotosPodeEditar()) return;
    s.busy = true;
    try {
        relSmsFotosMensagem('Consultando pasta e calendário para preparar a prévia…');
        // GET antigo é inofensivo. Não acionar POST de versão que altera permissões.
        const consultaVersao = await fetch(webhook, { signal: AbortSignal.timeout(15000) });
        if (!consultaVersao.ok) throw new Error('Não foi possível conferir a versão da integração do Drive.');
        const capacidade = await consultaVersao.json();
        if (capacidade.protocolo !== 'fotos-leitura-v292' || capacidade.somenteLeitura !== true) throw new Error('Atualize o Apps Script para a versão de consulta somente leitura antes de importar.');
        if (!capacidade.raizConfigurada) throw new Error('Configure FOTOS_ROOT_ID no Apps Script para identificar a raiz oficial de fotos.');
        const [resposta, calendario] = await Promise.all([
            fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'listarFotosSubpastas', pastaId }), signal: AbortSignal.timeout(60000) }),
            relSmsImportacaoCalendario(tipo, docInicial.mes, docInicial.ano)
        ]);
        if (!resposta.ok) throw new Error(`Falha na integração do Drive (HTTP ${resposta.status}).`);
        const dados = await resposta.json();
        if (dados.status !== 'sucesso' || dados.somenteLeitura !== true || !Array.isArray(dados.subpastas)) throw new Error(dados.message || 'Resposta de listagem inválida. Confira a versão do Apps Script.');
        const plano = relSmsImportacaoPlanejar(docInicial, dados.subpastas, calendario, tipo);
        relSmsFotosValidar(plano.candidato);
        const resumo = plano.itens.map(i => `${i.data.split('-').reverse().join('/')} — ${i.tema}: 2 fotos. ${i.referencia}`).join('\n');
        const pendencias = plano.pendencias.map(i => `${i.pasta}: ${i.motivo}`).join('\n');
        if (!plano.itens.length) { relSmsFotosMensagem('Nenhuma foto foi importada. ' + (pendencias || 'Não há pastas correspondentes ao calendário.')); return; }
        let confirmado;
        if (typeof Swal !== 'undefined') {
            const el = document.createElement('div'); el.style.cssText = 'text-align:left;white-space:pre-wrap;max-height:45vh;overflow:auto';
            el.textContent = resumo + (pendencias ? '\n\nNão serão importados:\n' + pendencias : '') + '\n\nImportar não comprova a realização. Confira as datas e fotos antes de fechar a seleção. Fotos existentes serão preservadas.';
            confirmado = (await Swal.fire({ target: alvoDialogo, title: 'Revisar importação', html: el, showCancelButton: true, confirmButtonText: 'Importar e salvar os itens conferidos', cancelButtonText: 'Cancelar' })).isConfirmed;
        } else confirmado = confirm(resumo + '\n\nPendências:\n' + pendencias + '\n\nSalvar somente os itens conferidos?');
        if (!confirmado || s.doc !== docInicial) return;
        s.doc = plano.candidato; s.dirty = true; s.sequencia++;
        s.busy = false;
        relSmsFotosRender();
        const salvo = await relSmsFotosSalvar(false);
        if (!salvo) return; // O salvamento mantém o trabalho na tela e apresenta a falha.
        relSmsFotosMensagem(`${plano.itens.length} tema(s) com duas fotos importados e confirmados no servidor. ${plano.pendencias.length} pasta(s) sem importar; confira-as manualmente.`);
    } catch (err) { relSmsFotosMensagem('Importação interrompida: ' + err.message + ' A seleção anterior foi preservada se o salvamento não chegou a iniciar.'); }
    finally { s.busy = false; }
}
