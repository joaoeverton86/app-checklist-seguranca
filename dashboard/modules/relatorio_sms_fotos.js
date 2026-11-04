/* Seleção editorial mensal. Banco: somente metadados; arquivos permanecem no Drive.
 * Nenhuma consulta/listagem/download ocorre ao carregar este script.
 */
var relSmsFotosEstado = { doc: null, row: null, dirty: false, editor: null, busy: false, gerando: false, grupo: -1, editando: -1, trilha: [], token: null, itens: [], sequencia: 0 };
var RELSMS_FOTOS_MAX = 80;

function relSmsFotosChave(mes, ano) {
    if (!Number.isInteger(mes) || mes < 0 || mes > 11 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) throw new Error('Mês ou ano inválido.');
    return `relsms_fotos_${ano}-${String(mes + 1).padStart(2, '0')}`;
}
function relSmsFotosId(valor) {
    const texto = String(valor || '').trim();
    if (/^[\w-]{10,150}$/.test(texto)) return texto;
    let url;
    try { url = new URL(texto); } catch { throw new Error('Cole o link de um arquivo do Google Drive.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.pathname.includes('/folders/')) throw new Error('Informe o link de uma foto, não o de uma pasta.');
    const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
    if (!id || !/^[\w-]{10,150}$/.test(id)) throw new Error('Link de arquivo do Drive inválido.');
    return id;
}
function relSmsFotosValidar(doc, fechado = false) {
    relSmsFotosChave(doc.mes, doc.ano);
    if (doc.versao !== 1 || !['rascunho', 'fechado'].includes(doc.status) || !Array.isArray(doc.grupos) || doc.grupos.length > 40) throw new Error('Seleção mensal inválida ou com mais de 40 temas.');
    if (!Number.isInteger(doc.limiteDdsma) || doc.limiteDdsma < 2 || doc.limiteDdsma > 24) throw new Error('A amostra DDSMA deve ter limite entre 2 e 24 fotos.');
    const ids = new Set(); const temas = new Set(); let total = 0; let dds = 0;
    const prefixo = `${doc.ano}-${String(doc.mes + 1).padStart(2, '0')}-`;
    doc.grupos.forEach(g => {
        if (!['treinamento', 'ddsma'].includes(g.tipo) || typeof g.tema !== 'string' || !g.tema.trim() || g.tema.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(g.data) || !g.data.startsWith(prefixo)) throw new Error('Informe categoria, tema e data do mês selecionado.');
        const d = new Date(g.data + 'T12:00:00Z');
        if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== g.data) throw new Error('Data de aplicação inválida.');
        const temaChave = `${g.tipo}|${g.tema.trim().toLocaleLowerCase('pt-BR')}|${g.data}`;
        if (temas.has(temaChave)) throw new Error('Este tema e data já estão na seleção. Edite o bloco existente.');
        temas.add(temaChave);
        if (!Array.isArray(g.fotos) || g.fotos.length > 2 || (fechado && (g.tipo === 'treinamento' ? g.fotos.length !== 2 : g.fotos.length < 1))) throw new Error('No fechamento, cada treinamento precisa de 2 fotos; cada amostra DDSMA, de 1 ou 2.');
        g.fotos.forEach(f => {
            if (typeof f.id !== 'string' || relSmsFotosId(f.id) !== f.id || ids.has(f.id) || typeof f.nome !== 'string' || f.nome.length > 180) throw new Error('Foto inválida ou repetida na seleção do mês.');
            ids.add(f.id); total++;
            if (g.tipo === 'ddsma') dds++;
        });
    });
    if (total > RELSMS_FOTOS_MAX || dds > doc.limiteDdsma) throw new Error(`Limite: ${RELSMS_FOTOS_MAX} fotos no mês e ${doc.limiteDdsma} fotos DDSMA.`);
    if (fechado && !total) throw new Error('Selecione ao menos uma foto antes de fechar.');
    if (new TextEncoder().encode(JSON.stringify(doc)).length > 65536) throw new Error('Seleção excedeu o limite de 64 KB de metadados.');
    return { total, dds };
}
async function relSmsFotosLer(mes, ano) {
    const id = relSmsFotosChave(mes, ano);
    const rows = await supabaseFetch('configuracoes_sistema', `?select=id,valor,atualizado_em&id=eq.${id}&limit=1`);
    if (!Array.isArray(rows)) throw new Error('Não foi possível consultar a seleção mensal de fotos.');
    if (!rows.length) return null;
    const valor = typeof rows[0].valor === 'string' ? JSON.parse(rows[0].valor) : rows[0].valor;
    relSmsFotosValidar(valor, valor.status === 'fechado');
    if (valor.mes !== mes || valor.ano !== ano) throw new Error('Seleção pertence a outra competência.');
    return { ...rows[0], valor };
}
function relSmsFotosMensagem(texto) {
    const el = document.getElementById('relSmsFotosMensagem');
    if (el) el.textContent = texto;
}
function relSmsFotosPodeEditar() {
    return usuarioPodeGravarModulo('relatoriosms') && relSmsFotosEstado.doc?.status === 'rascunho' && !relSmsFotosEstado.busy;
}
function relSmsFotosFecharJanela() {
    if (relSmsFotosEstado.busy) return;
    if ((relSmsFotosEstado.dirty || relSmsFotosEstado.editor) && !confirm('Descartar as alterações ainda não salvas nesta seleção?')) return;
    relSmsFotosEstado.dirty = false;
    relSmsFotosEstado.editor = null;
    relSmsFotosEstado.sequencia++;
    document.getElementById('relSmsFotosModal')?.close();
}
async function relSmsFotosAbrir() {
    let el = document.getElementById('relSmsFotosModal');
    if (el?.open) return;
    if (!el) {
        el = document.createElement('dialog'); el.id = 'relSmsFotosModal';
        el.setAttribute('aria-label', 'Seleção de fotos do relatório mensal');
        el.style.cssText = 'width:min(1050px,96vw);max-height:92vh;overflow:auto;border:1px solid #94a3b8;border-radius:12px;padding:20px;background:var(--card,#fff);color:var(--text,#172033);font:14px/1.5 Arial,sans-serif;';
        el.addEventListener('cancel', e => { e.preventDefault(); relSmsFotosFecharJanela(); });
        document.body.appendChild(el);
    }
    el.innerHTML = '<p role="status">Carregando a seleção deste mês…</p>'; el.showModal();
    relSmsFotosEstado.busy = true;
    try {
        const mes = Number(document.getElementById('relSmsMes').value);
        const ano = Number(document.getElementById('relSmsAno').value);
        const row = await relSmsFotosLer(mes, ano);
        Object.assign(relSmsFotosEstado, { row, doc: row ? structuredClone(row.valor) : { versao: 1, mes, ano, status: 'rascunho', limiteDdsma: 12, grupos: [] }, dirty: false, editor: null, grupo: -1, editando: -1, trilha: [], itens: [], token: null });
        relSmsFotosEstado.busy = false;
        relSmsFotosRender();
    } catch (err) {
        el.innerHTML = '<p id="relSmsFotosMensagem" role="alert"></p><button type="button" onclick="relSmsFotosFecharJanela()">Fechar</button>';
        relSmsFotosMensagem(err.message);
    } finally { relSmsFotosEstado.busy = false; }
}
function relSmsFotosRender() {
    const s = relSmsFotosEstado; const d = s.doc;
    const e = v => escapeHTML(String(v || ''));
    const pode = relSmsFotosPodeEditar();
    const contagem = relSmsFotosValidar(d);
    document.getElementById('relSmsFotosModal').innerHTML = `
    <style>#relSmsFotosModal button{padding:7px 10px;border:1px solid #94a3b8;border-radius:6px;background:#f1f5f9;color:#172033;cursor:pointer}#relSmsFotosModal button:disabled{opacity:.5;cursor:default}#relSmsFotosModal input,#relSmsFotosModal select{padding:7px;border:1px solid #94a3b8;border-radius:5px;font:inherit;max-width:100%;box-sizing:border-box}#relSmsFotosModal label{display:block}#relSmsFotosModal .rf-item{border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:10px 0;break-inside:avoid}#relSmsFotosModal .rf-acoes{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}#relSmsFotosModal .rf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}</style>
    <h2 style="margin:0;">Fotos do relatório — ${String(d.mes + 1).padStart(2, '0')}/${d.ano}</h2>
    <p><strong>${d.status === 'fechado' ? 'Seleção fechada para o relatório' : 'Seleção em preparação'}</strong> · ${contagem.total}/${RELSMS_FOTOS_MAX} fotos · DDSMA ${contagem.dds}/${d.limiteDdsma} · ${s.dirty ? 'Alterações ainda não salvas' : 'Sem alterações pendentes'}</p>
    <p>Ao longo do mês, separe 2 fotos por tema/data de treinamento e uma amostra escolhida de DDSMA. As fotos ficam no Drive; aqui são guardadas apenas suas referências. A ordem abaixo é respeitada dentro de cada categoria.</p>
    ${!usuarioPodeGravarModulo('relatoriosms') ? '<p>Seu perfil permite apenas consulta. A edição requer permissão no módulo Relatório Mensal SMS.</p>' : ''}
    <div class="rf-acoes">${pode ? `<button type="button" onclick="relSmsFotosSalvar(false)">Salvar progresso</button><button type="button" onclick="relSmsFotosSalvar(true)">Fechar seleção para o relatório</button>` : ''}
    ${d.status === 'fechado' && usuarioPodeGravarModulo('relatoriosms') ? '<button type="button" onclick="relSmsFotosReabrir()">Reabrir seleção para ajustes</button>' : ''}
    <button type="button" onclick="relSmsFotosFecharJanela()">Fechar janela</button></div>
    <p id="relSmsFotosMensagem" role="status"></p>
    ${pode ? `<form id="relSmsFotosNovo"><div class="rf-grid"><label>Categoria<select name="tipo"><option value="treinamento">Treinamento</option><option value="ddsma">DDSMA — amostra</option></select></label><label>Tema aplicado<input name="tema" required maxlength="200" list="relSmsFotosTemas"></label><label>Data de aplicação<input name="data" type="date" required min="${d.ano}-${String(d.mes + 1).padStart(2, '0')}-01" max="${new Date(d.ano, d.mes + 1, 0).toISOString().slice(0, 10)}"></label></div><div class="rf-acoes"><button type="submit">Adicionar tema / data</button><button type="button" onclick="relSmsFotosCronograma()">Consultar temas do cronograma</button></div><datalist id="relSmsFotosTemas"></datalist></form>
    <label>Máximo de fotos DDSMA neste relatório (2 a 24)<input id="relSmsFotosLimite" type="number" min="2" max="24" value="${d.limiteDdsma}" onchange="relSmsFotosAlterarLimite(this.value)"></label>` : ''}
    <div>${d.grupos.map((g, i) => `<article class="rf-item"><strong>${g.tipo === 'treinamento' ? 'Treinamento' : 'DDSMA'} — ${e(g.tema)}</strong><br>Aplicado em ${e(g.data.split('-').reverse().join('/'))} · ${g.fotos.length}/2 fotos
    <div class="rf-acoes">${pode ? `<button type="button" onclick="relSmsFotosMover(${i},-1)">↑</button><button type="button" onclick="relSmsFotosMover(${i},1)">↓</button><button type="button" onclick="relSmsFotosEditarTema(${i})">Editar tema / data</button><button type="button" onclick="relSmsFotosExcluir(${i})">Retirar tema</button><button type="button" onclick="relSmsFotosSelecionarGrupo(${i})">Escolher fotos no Drive / colar link</button>` : ''}</div>
    ${g.fotos.map((f, j) => `<div style="padding:6px;border-top:1px solid #e2e8f0;">${j + 1}. ${e(f.nome || 'Foto selecionada')} <a href="https://drive.google.com/file/d/${e(f.id)}/view" target="_blank" rel="noopener noreferrer">Ver no Drive</a> ${pode ? `<button type="button" onclick="relSmsFotosRetirar(${i},${j})">Retirar</button>${g.fotos.length === 2 ? `<button type="button" onclick="relSmsFotosTrocar(${i})">Trocar posição</button>` : ''}` : ''}</div>`).join('')}</article>`).join('') || '<p>Nenhum tema selecionado. Comece adicionando um tema e a data em que foi aplicado.</p>'}</div>
    <div id="relSmsFotosSeletor"></div>`;
    document.getElementById('relSmsFotosNovo')?.addEventListener('submit', event => {
        event.preventDefault(); if (!relSmsFotosPodeEditar()) return;
        const form = event.currentTarget;
        const grupo = { tipo: form.elements.tipo.value, tema: form.elements.tema.value.trim(), data: form.elements.data.value, fotos: s.editando >= 0 ? d.grupos[s.editando].fotos : [] };
        const candidato = structuredClone(d);
        if (s.editando >= 0) candidato.grupos[s.editando] = grupo; else candidato.grupos.push(grupo);
        try { relSmsFotosValidar(candidato); s.doc = candidato; s.editando = -1; s.editor = null; s.dirty = true; relSmsFotosRender(); }
        catch (err) { relSmsFotosMensagem(err.message); }
    });
    if (pode && s.editando >= 0) {
        const form = document.getElementById('relSmsFotosNovo'); const g = d.grupos[s.editando];
        form.elements.tipo.value = g.tipo; form.elements.tema.value = g.tema; form.elements.data.value = g.data;
        form.querySelector('[type="submit"]').textContent = 'Aplicar alteração de tema / data';
    }
    const editorForm = document.getElementById('relSmsFotosNovo');
    if (editorForm) {
        if (s.editor) for (const nome of ['tipo', 'tema', 'data']) editorForm.elements[nome].value = s.editor[nome];
        editorForm.addEventListener('input', () => {
            s.editor = Object.fromEntries(['tipo', 'tema', 'data'].map(nome => [nome, editorForm.elements[nome].value]));
        });
        const limpar = document.createElement('button'); limpar.type = 'button'; limpar.textContent = 'Limpar formulário';
        limpar.addEventListener('click', () => {
            if (s.editor && !confirm('Descartar o tema ainda não aplicado no formulário?')) return;
            s.editor = null; s.editando = -1; relSmsFotosRender();
        });
        editorForm.querySelector('.rf-acoes').appendChild(limpar);
    }
}
function relSmsFotosAlterarLimite(valor) {
    if (!relSmsFotosPodeEditar()) return;
    const d = relSmsFotosEstado.doc; const novo = Number(valor);
    try { relSmsFotosValidar({ ...d, limiteDdsma: novo }); d.limiteDdsma = novo; relSmsFotosEstado.dirty = true; relSmsFotosRender(); }
    catch (err) { relSmsFotosMensagem(err.message); document.getElementById('relSmsFotosLimite').value = d.limiteDdsma; }
}
function relSmsFotosMover(i, delta) {
    if (!relSmsFotosPodeEditar()) return;
    if (relSmsFotosEstado.editor || relSmsFotosEstado.editando >= 0) { relSmsFotosMensagem('Aplique o tema em edição antes de alterar a ordem.'); return; }
    const grupos = relSmsFotosEstado.doc.grupos; const j = i + delta;
    if (j < 0 || j >= grupos.length) return;
    [grupos[i], grupos[j]] = [grupos[j], grupos[i]]; relSmsFotosEstado.dirty = true; relSmsFotosEstado.sequencia++; relSmsFotosRender();
}
function relSmsFotosEditarTema(i) {
    if (!relSmsFotosPodeEditar()) return;
    if (relSmsFotosEstado.editor && !confirm('Descartar o tema ainda não aplicado no formulário?')) return;
    relSmsFotosEstado.editor = null;
    relSmsFotosEstado.editando = i; relSmsFotosRender();
    document.querySelector('#relSmsFotosNovo [name="tema"]').focus();
}
function relSmsFotosExcluir(i) {
    if (!relSmsFotosPodeEditar() || !confirm('Retirar este tema da seleção? Os arquivos no Drive serão preservados.')) return;
    relSmsFotosEstado.doc.grupos.splice(i, 1); relSmsFotosEstado.editando = -1; relSmsFotosEstado.dirty = true; relSmsFotosEstado.sequencia++; relSmsFotosRender();
}
function relSmsFotosRetirar(i, j) {
    if (!relSmsFotosPodeEditar()) return;
    relSmsFotosEstado.doc.grupos[i].fotos.splice(j, 1); relSmsFotosEstado.dirty = true; relSmsFotosRender();
}
function relSmsFotosTrocar(i) {
    if (!relSmsFotosPodeEditar()) return;
    relSmsFotosEstado.doc.grupos[i].fotos.reverse(); relSmsFotosEstado.dirty = true; relSmsFotosRender();
}
async function relSmsFotosCronograma() {
    if (!relSmsFotosPodeEditar()) return;
    const d = relSmsFotosEstado.doc;
    const inicio = `${d.ano}-${String(d.mes + 1).padStart(2, '0')}-01`;
    const fim = `${d.ano}-${String(d.mes + 1).padStart(2, '0')}-${new Date(d.ano, d.mes + 1, 0).getDate()}`;
    try {
        const [rows, catalogo] = await Promise.all([
            supabaseFetch('treinamentos_cronograma', `?select=treinamento_cod,data_prevista,data_realizada&data_prevista=gte.${inicio}&data_prevista=lte.${fim}&limit=100`),
            supabaseFetch('treinamentos_catalogo', '?select=id,nome&limit=500')
        ]);
        if (relSmsFotosEstado.doc !== d) return;
        const temas = rows.map(r => catalogo.find(c => String(c.id) === String(r.treinamento_cod))?.nome).filter(Boolean);
        document.getElementById('relSmsFotosTemas').innerHTML = [...new Set(temas)].map(t => `<option value="${escapeHTML(t)}"></option>`).join('');
        relSmsFotosMensagem('Temas disponíveis no campo Tema aplicado. Confirme a data real de aplicação; previsão não comprova execução.');
    } catch (err) { relSmsFotosMensagem('Não foi possível consultar o cronograma: ' + err.message); }
}
async function relSmsFotosSalvar(fechar) {
    if (!relSmsFotosPodeEditar()) return;
    if (relSmsFotosEstado.editor || relSmsFotosEstado.editando >= 0) { relSmsFotosMensagem('Aplique primeiro o tema/data que está preenchendo no formulário.'); return; }
    const s = relSmsFotosEstado; const snapshot = structuredClone(s.doc);
    snapshot.status = fechar ? 'fechado' : 'rascunho';
    try {
        relSmsFotosValidar(snapshot, fechar);
        s.busy = true;
        document.getElementById('relSmsFotosModal').querySelectorAll('button,input,select').forEach(el => { el.disabled = true; });
        relSmsFotosMensagem('Salvando seleção no servidor…');
        const id = relSmsFotosChave(snapshot.mes, snapshot.ano);
        const payload = { valor: snapshot, descricao: 'Seleção mensal de fotos SMS — somente referências Drive', atualizado_em: new Date().toISOString() };
        if (s.row) {
            const filtro = `id=eq.${id}&atualizado_em=${s.row.atualizado_em ? 'eq.' + encodeURIComponent(s.row.atualizado_em) : 'is.null'}`;
            const gravados = await supabasePatch('configuracoes_sistema', filtro, payload);
            if (!Array.isArray(gravados) || gravados.length !== 1) throw new Error('Outra pessoa alterou esta seleção ou sua conta não pode gravar. Seu trabalho continua na tela; reabra para consultar a versão salva.');
        } else { await supabaseInsert('configuracoes_sistema', [{ id, ...payload }]); }
        s.row = { id, ...payload }; // mantém identidade/versão mesmo se a confirmação falhar
        const confirmado = await relSmsFotosLer(snapshot.mes, snapshot.ano);
        // JSONB pode reordenar chaves; confirme todos os campos pelo conteúdo canônico.
        const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
        if (!confirmado || canon(confirmado.valor) !== canon(snapshot)) throw new Error('Não foi possível confirmar a seleção salva. Confira no servidor antes de repetir.');
        Object.assign(s, { row: confirmado, doc: structuredClone(confirmado.valor), dirty: false, busy: false });
        relSmsFotosRender(); relSmsFotosMensagem(fechar ? 'Seleção fechada. Ao gerar Word ou impressão, estas fotos serão incluídas.' : 'Progresso salvo. Você pode continuar em outro dia ou computador.');
    } catch (err) { relSmsFotosMensagem('Falha ao salvar: ' + err.message); }
    finally {
        s.busy = false;
        document.getElementById('relSmsFotosModal')?.querySelectorAll('button,input,select').forEach(el => { el.disabled = false; });
    }
}
async function relSmsFotosReabrir() {
    const s = relSmsFotosEstado;
    if (!usuarioPodeGravarModulo('relatoriosms') || s.busy || !confirm('Reabrir a seleção para ajustes? Será necessário fechá-la novamente antes de gerar o relatório.')) return;
    // O salvamento valida a mesma versão remota; reabrir não apaga fotos.
    s.doc.status = 'rascunho'; s.dirty = true;
    await relSmsFotosSalvar(false);
}
function relSmsFotosSelecionarGrupo(i) {
    if (!relSmsFotosPodeEditar()) return;
    const s = relSmsFotosEstado; s.grupo = i; s.trilha = []; s.token = null; s.itens = []; s.sequencia++;
    relSmsFotosRenderSeletor();
}
function relSmsFotosRenderSeletor() {
    const s = relSmsFotosEstado; const g = s.doc.grupos[s.grupo]; if (!g) return;
    const e = v => escapeHTML(String(v || ''));
    document.getElementById('relSmsFotosSeletor').innerHTML = `<div class="rf-item"><h3>Fotos para ${e(g.tema)}</h3>
        <p>Envie as fotos do WhatsApp para a pasta do tema no Drive. Depois escolha os arquivos aqui. Nenhuma foto é enviada ao banco.</p>
        <form id="relSmsFotosLink"><label>Link do arquivo no Google Drive<input name="link" type="url" required placeholder="https://drive.google.com/file/d/…/view" style="width:100%;"></label><button type="submit">Adicionar foto pelo link</button></form>
        <div class="rf-acoes"><button type="button" onclick="relSmsFotosListar(null)">Navegar nas pastas de fotos</button>${s.trilha.length ? '<button type="button" onclick="relSmsFotosVoltar()">Voltar uma pasta</button>' : ''}
        <a href="${e(typeof getDriveFolderFotosUrl === 'function' ? getDriveFolderFotosUrl() : 'https://drive.google.com/') }" target="_blank" rel="noopener noreferrer">Abrir acervo no Drive</a></div>
        <p>${s.trilha.map(t => e(t.nome)).join(' / ')}</p>
        <div id="relSmsFotosArquivos">${s.itens.map((f, i) => `<div style="padding:7px;border-top:1px solid #cbd5e1;"><button type="button" onclick="relSmsFotosEscolherArquivo(${i})">${f.mimeType === 'application/vnd.google-apps.folder' ? '📁 Abrir pasta' : '＋ Selecionar foto'}</button> ${e(f.name)}</div>`).join('')}</div>
        ${s.token ? '<button type="button" onclick="relSmsFotosListarPagina()">Próximos 30 arquivos</button>' : ''}</div>`;
    document.getElementById('relSmsFotosLink').addEventListener('submit', event => {
        event.preventDefault(); const input = event.currentTarget.elements.link;
        try { relSmsFotosAdicionar(s.grupo, { id: relSmsFotosId(input.value), nome: 'Foto do Drive' }); }
        catch (err) { relSmsFotosMensagem(err.message); }
    });
}
async function relSmsFotosListar(pastaId, pageToken = null) {
    const s = relSmsFotosEstado; if (!relSmsFotosPodeEditar()) return;
    const seq = ++s.sequencia;
    const alvo = pastaId || s.trilha.at(-1)?.id || '';
    const q = new URLSearchParams({ categoria: 'fotos' });
    if (alvo) q.set('pastaId', alvo); if (pageToken) q.set('pageToken', pageToken);
    relSmsFotosMensagem('Consultando somente esta pasta do Drive…');
    try {
        const r = await fetch('/api/anexos-drive-listar?' + q, { signal: AbortSignal.timeout(15000) });
        const dados = await r.json();
        if (seq !== s.sequencia || !document.getElementById('relSmsFotosModal').open) return;
        if (!r.ok) throw new Error(dados.erro || 'Falha ao listar pasta.');
        if (!Array.isArray(dados.itens)) throw new Error('Listagem inválida.');
        s.itens = dados.itens.filter(f => /^[\w-]{10,150}$/.test(f.id) && (f.mimeType === 'application/vnd.google-apps.folder' || /^image\/(jpeg|png|webp)$/.test(f.mimeType)));
        s.token = dados.nextPageToken || null;
        relSmsFotosRenderSeletor(); relSmsFotosMensagem('Escolha apenas as fotos que entrarão no relatório. Você também pode colar o link de um arquivo.');
    } catch (err) { if (seq === s.sequencia) relSmsFotosMensagem('Drive: ' + err.message + ' Use o link do arquivo como alternativa.'); }
}
function relSmsFotosListarPagina() { relSmsFotosListar(relSmsFotosEstado.trilha.at(-1)?.id || null, relSmsFotosEstado.token); }
function relSmsFotosVoltar() { relSmsFotosEstado.trilha.pop(); relSmsFotosListar(relSmsFotosEstado.trilha.at(-1)?.id || null); }
function relSmsFotosEscolherArquivo(i) {
    const s = relSmsFotosEstado; if (!relSmsFotosPodeEditar()) return;
    const f = s.itens[i]; if (!f) return;
    if (f.mimeType === 'application/vnd.google-apps.folder') { s.trilha.push({ id: f.id, nome: f.name }); relSmsFotosListar(f.id); }
    else { try { relSmsFotosAdicionar(s.grupo, { id: f.id, nome: String(f.name).slice(0, 180) }); } catch (err) { relSmsFotosMensagem(err.message); } }
}
function relSmsFotosAdicionar(i, foto) {
    if (!relSmsFotosPodeEditar()) return;
    const copia = structuredClone(relSmsFotosEstado.doc); copia.grupos[i].fotos.push(foto); relSmsFotosValidar(copia);
    relSmsFotosEstado.doc = copia; relSmsFotosEstado.dirty = true; relSmsFotosEstado.sequencia++; relSmsFotosRender();
    if (copia.grupos[i].fotos.length < 2) relSmsFotosRenderSeletor();
    relSmsFotosMensagem('Foto selecionada. Use Salvar progresso para guardá-la para outro dia.');
}
window.addEventListener('beforeunload', event => { if (relSmsFotosEstado.dirty || relSmsFotosEstado.editor || relSmsFotosEstado.busy) { event.preventDefault(); event.returnValue = ''; } });

// Exportação: download apenas das selecionadas, no máximo 2 simultâneas, sem cache global.
async function relSmsFotosImagem(id) {
    relSmsFotosId(id);
    const url = `/api/proxy-imagem?url=${encodeURIComponent('https://lh3.googleusercontent.com/d/' + id + '=w1200')}&drive_id=${encodeURIComponent(id)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok || !/^image\/(jpeg|png|webp)/i.test(r.headers.get('content-type') || '')) throw new Error('Foto indisponível ou formato não suportado.');
    const max = 8 * 1024 * 1024;
    if (Number(r.headers.get('content-length')) > max) { await r.body?.cancel(); throw new Error('Foto acima de 8 MB. Reduza a imagem no Drive.'); }
    const reader = r.body.getReader(); const partes = []; let bytes = 0;
    try {
        while (true) { const item = await reader.read(); if (item.done) break; bytes += item.value.byteLength; if (bytes > max) throw new Error('Foto acima de 8 MB.'); partes.push(item.value); }
    } catch (err) { await reader.cancel(); throw err; } finally { reader.releaseLock(); }
    const bitmap = await createImageBitmap(new Blob(partes));
    try {
        if (bitmap.width * bitmap.height > 40000000) throw new Error('Resolução de foto excessiva. Reduza a imagem no Drive.');
        const escala = Math.min(1, 1000 / bitmap.width, 700 / bitmap.height);
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * escala)); canvas.height = Math.max(1, Math.round(bitmap.height * escala));
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .78));
        if (!blob || blob.size > 600000) throw new Error('Foto muito pesada após otimização.');
        const buffer = await blob.arrayBuffer();
        const dataUrl = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(blob); });
        const escalaDoc = Math.min(280 / canvas.width, 190 / canvas.height);
        return { buffer, dataUrl, width: Math.round(canvas.width * escalaDoc), height: Math.round(canvas.height * escalaDoc) };
    } finally { bitmap.close(); }
}
async function relSmsFotosPreparar(mes, ano, progresso = () => {}) {
    if (relSmsFotosEstado.dirty || relSmsFotosEstado.editor) throw new Error('Salve e feche a seleção de fotos antes de gerar o relatório.');
    const row = await relSmsFotosLer(mes, ano);
    if (!row) return null; // preserva relatórios legados sem seleção editorial
    if (row.valor.status !== 'fechado') throw new Error('As fotos deste mês estão em preparação. Use Organizar fotos do mês e Fechar seleção para o relatório.');
    const doc = structuredClone(row.valor); const refs = doc.grupos.flatMap(g => g.fotos);
    const carregadas = new Map(); let indice = 0; let concluidas = 0; let bytes = 0; let erro = null;
    const worker = async () => {
        while (!erro && indice < refs.length) {
            const f = refs[indice++];
            try {
                const img = await relSmsFotosImagem(f.id); bytes += img.buffer.byteLength;
                if (bytes > 16 * 1024 * 1024) throw new Error('As fotos otimizadas excedem 16 MB. Reduza a seleção.');
                carregadas.set(f.id, img); progresso(++concluidas, refs.length);
            } catch (err) { erro = new Error(`Não foi possível incluir ${f.nome || f.id}: ${err.message} O relatório não foi fechado com fotos faltantes.`); }
        }
    };
    await Promise.all([worker(), worker()]); if (erro) throw erro;
    doc.grupos.forEach(g => { g.fotos = g.fotos.map(f => ({ ...f, img: carregadas.get(f.id) })); });
    return doc;
}
function relSmsFotosDocx(selecao) {
    const out = [relSmsH1('9. Registros Fotográficos (Treinamentos e DDSMA)')];
    for (const tipo of ['treinamento', 'ddsma']) {
        out.push(relSmsH2(tipo === 'treinamento' ? '9.1. Treinamentos — duas fotos por tema' : '9.2. DDSMA — amostra selecionada'));
        const grupos = selecao.grupos.filter(g => g.tipo === tipo);
        if (!grupos.length) out.push(relSmsNota('Nenhuma foto selecionada nesta categoria.'));
        grupos.forEach(g => {
            const cells = g.fotos.map(f => new docx.TableCell({ width: { size: 4680, type: docx.WidthType.DXA }, children: [
                new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.ImageRun({ type: 'jpg', data: f.img.buffer, transformation: { width: f.img.width, height: f.img.height } })] }),
                new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 160 }, children: [new docx.TextRun({ text: `${g.tema} — Aplicado em ${g.data.split('-').reverse().join('/')}`, size: 18 })] })
            ] }));
            if (cells.length === 1) cells.push(new docx.TableCell({ width: { size: 4680, type: docx.WidthType.DXA }, children: [new docx.Paragraph('')] }));
            out.push(new docx.Table({ width: { size: 9360, type: docx.WidthType.DXA }, columnWidths: [4680, 4680], rows: [new docx.TableRow({ cantSplit: true, children: cells })] }));
            out.push(new docx.Paragraph({ spacing: { after: 120 }, children: [] }));
        });
    }
    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] })); return out;
}
function relSmsFotosPaginasHtml(selecao) {
    const e = v => escapeHTML(String(v || '')); const paginas = [];
    for (const tipo of ['treinamento', 'ddsma']) {
        const grupos = selecao.grupos.filter(g => g.tipo === tipo);
        for (let i = 0; i < grupos.length; i += 2) {
            paginas.push(`<div class="pagina-relatorio">${gerarCabecalhoPadraoRelSmsHtml(selecao.mes, selecao.ano, '9. Registros Fotográficos')}
            <h2 class="rel-h1">${tipo === 'treinamento' ? '9.1. Treinamentos' : '9.2. DDSMA — amostra selecionada'}</h2>
            ${grupos.slice(i, i + 2).map(g => `<div style="break-inside:avoid;margin:12px 0 20px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${g.fotos.map(f => `<figure style="margin:0;text-align:center;"><img src="${f.img.dataUrl}" alt="${e(g.tema)}" style="width:100%;height:48mm;object-fit:contain;background:#fff;"><figcaption style="font:10px/1.4 Arial;margin-top:6px;overflow-wrap:anywhere;">${e(g.tema)}<br>Aplicado em ${e(g.data.split('-').reverse().join('/'))}</figcaption></figure>`).join('')}</div></div>`).join('')}</div>`);
        }
    }
    return paginas.join('');
}
function relSmsFotosInserirHtml(html, selecao) {
    if (!selecao) return html;
    const inicio = html.indexOf('<!-- PÁGINA 11: SEÇÃO 9');
    const fim = html.indexOf('<!-- PÁGINA 12: SEÇÃO 10', inicio);
    if (inicio < 0 || fim < 0) throw new Error('Não foi possível localizar a seção fotográfica no modelo de impressão.');
    return html.slice(0, inicio) + relSmsFotosPaginasHtml(selecao) + html.slice(fim);
}
