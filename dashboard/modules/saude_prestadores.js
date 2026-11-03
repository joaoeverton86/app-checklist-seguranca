/* Cadastro administrativo de prestadores de Saúde, separado do Documento-Base.
 * Uma linha de configuracoes_sistema por estabelecimento/médico, sem dados clínicos.
 * A seleção prepara o formulário de ASO; não reescreve exames históricos.
 */
var saudePrestadores = { rows: [], coordenador: {}, carregando: false, salvando: false, editando: null, foco: null };

function saudePrestadorValor(row) {
    const valor = typeof row.valor === 'string' ? JSON.parse(row.valor) : row.valor;
    if (!valor || !['clinica', 'medico'].includes(valor.tipo) || typeof valor.nome !== 'string') {
        throw new Error('Cadastro de prestador inválido. Nenhum registro foi substituído.');
    }
    return { ...valor, id: row.id, atualizado_em: row.atualizado_em || null };
}

async function saudeCarregarPrestadores() {
    const [rows, docs] = await Promise.all([
        supabaseFetch('configuracoes_sistema', '?select=id,valor,atualizado_em&id=like.saude_prestador_*&order=id&limit=1000'),
        supabaseFetch('configuracoes_sistema', '?select=valor&id=eq.pcmso_documento_base&limit=1')
    ]);
    if (!Array.isArray(rows) || rows.length >= 1000 || !Array.isArray(docs)) {
        throw new Error('Não foi possível carregar o cadastro completo. Tente novamente.');
    }
    let doc = docs[0]?.valor;
    if (typeof doc === 'string') doc = JSON.parse(doc);
    if (!docs.length && typeof obterPcmsoDocBaseDefaults === 'function') doc = obterPcmsoDocBaseDefaults();
    const novos = rows.map(saudePrestadorValor);
    saudePrestadores.rows = novos;
    saudePrestadores.coordenador = doc?.medico_coordenador || {};
}

function saudePrestadoresStatus(texto) {
    const el = document.getElementById('saudePrestadoresStatus');
    if (el) el.textContent = texto;
}

function saudePrestadoresModal() {
    let el = document.getElementById('saudePrestadoresModal');
    if (el) return el;
    el = document.createElement('dialog');
    el.id = 'saudePrestadoresModal';
    el.setAttribute('aria-label', 'Clínicas parceiras e médicos examinadores');
    el.style.cssText = 'width:min(920px,95vw);max-height:90vh;overflow:auto;border:1px solid var(--border,#cbd5e1);border-radius:12px;padding:20px;background:var(--card,#fff);color:var(--text,#0f172a);font:14px/1.45 Arial,sans-serif;';
    el.addEventListener('cancel', event => {
        event.preventDefault();
        saudeFecharPrestadores();
    });
    document.body.appendChild(el);
    return el;
}

function saudeFecharPrestadores() {
    if (saudePrestadores.salvando || saudePrestadores.carregando) return;
    const form = document.getElementById('saudePrestadorForm');
    if (form?.dataset.alterado === 'sim' && !confirm('Descartar as alterações não salvas deste cadastro?')) return;
    saudePrestadoresModal().close();
    saudePrestadores.foco?.focus();
}

async function saudeAbrirPrestadores(modo = 'cadastro') {
    const modal = saudePrestadoresModal();
    if (modal.open) return;
    saudePrestadores.foco = document.activeElement;
    saudePrestadores.carregando = true;
    modal.innerHTML = '<p role="status">Carregando clínicas, médicos e coordenador do PCMSO…</p>';
    modal.showModal();
    try {
        await saudeCarregarPrestadores();
        saudePrestadores.carregando = false;
        if (modo === 'modelo') saudeRenderPreparacaoAso();
        else saudeRenderCadastroPrestadores();
    } catch (err) {
        saudePrestadores.carregando = false;
        modal.innerHTML = '<p role="alert" id="saudePrestadoresStatus"></p><button type="button" onclick="saudeFecharPrestadores()">Fechar</button>';
        saudePrestadoresStatus('Falha ao carregar: ' + err.message);
    }
}

function saudeRenderCadastroPrestadores() {
    const e = valor => escapeHTML(String(valor || ''));
    const pode = usuarioPodeGravarModulo('saude');
    saudePrestadores.editando = null;
    saudePrestadoresModal().innerHTML = `
        <style>#saudePrestadoresModal button{padding:7px 12px;border:1px solid #94a3b8;border-radius:6px;cursor:pointer;background:#f1f5f9;color:#0f172a}#saudePrestadoresModal th,#saudePrestadoresModal td{text-align:left;padding:8px;border-bottom:1px solid #cbd5e1;overflow-wrap:anywhere}#saudePrestadoresModal th{background:#e9f0f3;color:#172033}#saudePrestadoresModal input,#saudePrestadoresModal select{font:inherit}#saudePrestadoresModal h2{font-size:20px;margin:0 0 12px}</style>
        <h2>Clínicas parceiras e médicos examinadores</h2>
        <p>Coordenador do PCMSO: <strong>${e(saudePrestadores.coordenador.nome || 'Não informado')}</strong> — ${e(saudePrestadores.coordenador.crm)}.
        O coordenador é mantido no Documento-Base do PCMSO. O examinador é escolhido separadamente para cada formulário.</p>
        <p>Cadastros compartilhados no painel. Não inclua informações clínicas ou de pacientes. Um médico pode atender em várias clínicas.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${pode ? '<button type="button" onclick="saudeEditarPrestador(\'clinica\')">+ Estabelecimento</button><button type="button" onclick="saudeEditarPrestador(\'medico\')">+ Médico examinador</button>' : '<span>Consulta: seu perfil não permite alterar cadastros.</span>'}
        <button type="button" onclick="saudeFecharPrestadores()">Fechar</button></div>
        <div id="saudePrestadoresStatus" role="status" style="margin:10px 0;"></div>
        <div id="saudePrestadorEditor"></div>
        <table style="width:100%;margin-top:12px;border-collapse:collapse;"><thead><tr><th>Tipo / Nome</th><th>Identificação / vínculo</th><th>Situação</th><th>Ação</th></tr></thead>
        <tbody>${saudePrestadores.rows.map((p, i) => `<tr><td>${p.tipo === 'clinica' ? 'Estabelecimento' : 'Médico'}<br><strong>${e(p.nome)}</strong></td>
        <td>${p.tipo === 'clinica' ? e(p.cnpj) : e([p.crm, p.uf].filter(Boolean).join(' / '))}<br>${p.tipo === 'medico' ? e((p.clinicas || []).map(id => saudePrestadores.rows.find(c => c.id === id)?.nome || 'Estabelecimento indisponível').join('; ')) : e(p.cidade)}</td>
        <td>${p.ativo === false ? 'Inativo' : 'Ativo'}</td><td>${pode ? `<button type="button" onclick="saudeEditarPrestador('',${i})">Editar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum prestador cadastrado. Cadastre somente dados confirmados.</td></tr>'}</tbody></table>`;
}

function saudeEditarPrestador(tipo, indice) {
    if (!usuarioPodeGravarModulo('saude') || saudePrestadores.salvando) return;
    const formAnterior = document.getElementById('saudePrestadorForm');
    if (formAnterior?.dataset.alterado === 'sim' && !confirm('Descartar as alterações não salvas?')) return;
    const p = indice === undefined ? { tipo, ativo: true, clinicas: [] } : saudePrestadores.rows[indice];
    if (!p) return;
    saudePrestadores.editando = p;
    const e = valor => escapeHTML(String(valor || ''));
    const campo = (id, label, obrigatorio = false) => `<label style="display:block;margin:8px 0;">${label}${obrigatorio ? ' *' : ''}<input name="${id}" value="${e(p[id])}" ${obrigatorio ? 'required' : ''} maxlength="${id === 'endereco' ? 250 : 150}" style="display:block;width:100%;padding:6px;box-sizing:border-box;"></label>`;
    document.getElementById('saudePrestadorEditor').innerHTML = `<form id="saudePrestadorForm" style="border:1px solid var(--border);padding:12px;margin-top:12px;">
        <h3>${p.id ? 'Editar' : 'Novo'} ${p.tipo === 'clinica' ? 'estabelecimento' : 'médico examinador'}</h3>
        ${campo('nome', p.tipo === 'clinica' ? 'Razão social / nome do estabelecimento' : 'Nome completo', true)}
        ${p.tipo === 'clinica' ? campo('cnpj', 'CNPJ (opcional)') + campo('cidade', 'Cidade / UF') : campo('crm', 'Número do CRM', true) + campo('uf', 'UF do CRM', true) + campo('rqe', 'RQE, quando houver')}
        ${campo('contato', 'Contato profissional (telefone / e-mail)')}${campo('endereco', 'Endereço profissional')}
        ${p.tipo === 'medico' ? `<label>Estabelecimentos em que atende (Ctrl/Cmd para selecionar vários)<select name="clinicas" multiple size="4" style="display:block;width:100%;">${saudePrestadores.rows.filter(c => c.tipo === 'clinica').map(c => `<option value="${e(c.id)}" ${(p.clinicas || []).includes(c.id) ? 'selected' : ''}>${e(c.nome)}${c.ativo === false ? ' (inativo)' : ''}</option>`).join('')}</select></label>` : ''}
        <label style="display:block;margin:10px 0;"><input type="checkbox" name="ativo" ${p.ativo !== false ? 'checked' : ''}> Ativo para novos formulários</label>
        <button type="submit">Salvar cadastro</button> <button type="button" onclick="saudeCancelarPrestador()">Cancelar</button>
        </form>`;
    const form = document.getElementById('saudePrestadorForm');
    form.addEventListener('input', () => { form.dataset.alterado = 'sim'; });
    form.addEventListener('change', () => { form.dataset.alterado = 'sim'; });
    form.addEventListener('submit', event => { event.preventDefault(); saudeSalvarPrestador(); });
    form.elements.nome.focus();
}

function saudeCancelarPrestador() {
    if (saudePrestadores.salvando) return;
    const form = document.getElementById('saudePrestadorForm');
    if (form?.dataset.alterado === 'sim' && !confirm('Descartar as alterações não salvas?')) return;
    saudePrestadores.editando = null;
    document.getElementById('saudePrestadorEditor').innerHTML = '';
}

function saudeValidarPrestador(p, rows) {
    if (!p.nome.trim()) throw new Error('Informe o nome.');
    if (p.tipo === 'medico') {
        const ufs = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
        if (!/^\d{1,8}$/.test(p.crm) || !ufs.includes(p.uf)) throw new Error('Informe o número do CRM e uma UF válida.');
        if (rows.some(r => r.id !== p.id && r.tipo === 'medico' && r.crm === p.crm && r.uf === p.uf)) throw new Error('Já existe médico com esse CRM/UF. Edite o cadastro existente.');
        if (p.clinicas.some(id => !rows.some(c => c.tipo === 'clinica' && c.id === id))) throw new Error('Vínculo com estabelecimento inválido.');
    } else if (p.cnpj) {
        const normalizar = valor => valor.replace(/[^a-z0-9]/gi, '').toUpperCase();
        const cnpj = normalizar(p.cnpj);
        if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) throw new Error('Confira o formato do CNPJ (14 posições) ou deixe em branco.');
        if (rows.some(r => r.id !== p.id && r.tipo === 'clinica' && normalizar(r.cnpj || '') === cnpj)) throw new Error('Já existe estabelecimento com esse CNPJ.');
    }
}

async function saudeSalvarPrestador() {
    if (saudePrestadores.salvando || !usuarioPodeGravarModulo('saude')) return;
    const form = document.getElementById('saudePrestadorForm');
    if (!form?.reportValidity()) return;
    const anterior = saudePrestadores.editando;
    if (!anterior) return;
    const ler = nome => form.elements[nome]?.value.trim() || '';
    const p = {
        tipo: anterior.tipo, nome: ler('nome'), contato: ler('contato'), endereco: ler('endereco'), ativo: form.elements.ativo.checked,
        ...(anterior.tipo === 'clinica' ? { cnpj: ler('cnpj'), cidade: ler('cidade') } : {
            crm: ler('crm'), uf: ler('uf').toUpperCase(), rqe: ler('rqe'),
            clinicas: Array.from(form.elements.clinicas.selectedOptions, o => o.value)
        })
    };
    try {
        saudeValidarPrestador({ ...p, id: anterior.id }, saudePrestadores.rows);
        saudePrestadores.salvando = true;
        form.querySelectorAll('input,select,button').forEach(el => { el.disabled = true; });
        saudePrestadoresStatus('Salvando cadastro no servidor…');
        // Reutilizar a identidade em nova tentativa evita duplicar um INSERT cuja resposta se perdeu.
        if (!anterior.id && !anterior.novoId) anterior.novoId = 'saude_prestador_' + crypto.randomUUID();
        const id = anterior.id || anterior.novoId;
        const payload = { valor: p, descricao: 'Cadastro administrativo de prestadores de Saúde Ocupacional', atualizado_em: new Date().toISOString() };
        if (anterior.id) {
            const filtro = `id=eq.${encodeURIComponent(id)}&atualizado_em=${anterior.atualizado_em ? 'eq.' + encodeURIComponent(anterior.atualizado_em) : 'is.null'}`;
            const alterados = await supabasePatch('configuracoes_sistema', filtro, payload);
            if (!Array.isArray(alterados) || alterados.length !== 1) throw new Error('Cadastro alterado por outra pessoa ou sem permissão. Feche e reabra para atualizar; seu formulário foi preservado.');
        } else {
            await supabaseInsert('configuracoes_sistema', [{ id, ...payload }]);
        }
        const verificacao = await supabaseFetch('configuracoes_sistema', `?select=id,valor,atualizado_em&id=eq.${encodeURIComponent(id)}&limit=1`);
        if (!Array.isArray(verificacao) || !verificacao[0]) throw new Error('Gravação enviada, mas não foi possível confirmar a leitura. Reabra o cadastro antes de repetir.');
        const confirmado = saudePrestadorValor(verificacao[0]);
        if (JSON.stringify(verificacao[0].valor) !== JSON.stringify(p)) {
            // Aceita valor serializado pelo servidor; não assume ordem das chaves JSONB.
            if (Object.keys(p).some(k => JSON.stringify(confirmado[k]) !== JSON.stringify(p[k]))) throw new Error('A leitura do cadastro divergiu. Reabra para conferir antes de repetir.');
        }
        const i = saudePrestadores.rows.findIndex(r => r.id === id);
        if (i >= 0) saudePrestadores.rows[i] = confirmado;
        else saudePrestadores.rows.push(confirmado);
        saudeRenderCadastroPrestadores();
        saudePrestadoresStatus('Cadastro salvo e leitura confirmada no servidor.');
    } catch (err) {
        saudePrestadoresStatus('Não foi possível concluir: ' + err.message);
    } finally {
        saudePrestadores.salvando = false;
        form.querySelectorAll('input,select,button').forEach(el => { el.disabled = false; });
    }
}

async function saudePrepararAsoParceiro() {
    const selecao = buscarColaboradorPorInput('asoForm_matricula');
    if (!selecao.colab) {
        document.getElementById('asoFormStatus').textContent = 'Selecione um colaborador antes de escolher o prestador.';
        return;
    }
    await saudeAbrirPrestadores('modelo');
}

function saudeRenderPreparacaoAso() {
    const e = valor => escapeHTML(String(valor || ''));
    saudePrestadoresModal().innerHTML = `<h2>Preparar ASO com prestador parceiro</h2>
        <p>Coordenador do PCMSO: <strong>${e(saudePrestadores.coordenador.nome || 'Não informado')}</strong> — ${e(saudePrestadores.coordenador.crm)}.</p>
        <p>Escolha quem realizará o atendimento. Esta seleção preenche somente a prévia do formulário; não altera o registro de exame salvo. Confira e complete os dados antes da assinatura médica.</p>
        <label>Estabelecimento<select id="saudeAsoClinica" style="display:block;width:100%;padding:8px;" onchange="saudeAtualizarExaminadores()"><option value="">Selecione…</option>
        ${saudePrestadores.rows.filter(p => p.tipo === 'clinica' && p.ativo !== false).map(p => `<option value="${e(p.id)}">${e(p.nome)}</option>`).join('')}</select></label>
        <label>Médico examinador<select id="saudeAsoExaminador" style="display:block;width:100%;padding:8px;margin-bottom:12px;"></select></label>
        <div id="saudePrestadoresStatus" role="status"></div>
        <button type="button" onclick="saudeGerarAsoParceiro()">Abrir formulário para conferência</button>
        <button type="button" onclick="saudeFecharPrestadores()">Cancelar</button>`;
    saudeAtualizarExaminadores();
}

function saudeAtualizarExaminadores() {
    const clinicaId = document.getElementById('saudeAsoClinica').value;
    document.getElementById('saudeAsoExaminador').innerHTML = '<option value="">Selecione…</option>' + saudePrestadores.rows
        .filter(p => p.tipo === 'medico' && p.ativo !== false && clinicaId && (p.clinicas || []).includes(clinicaId))
        .map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)} — CRM ${escapeHTML(p.crm)} / ${escapeHTML(p.uf)}</option>`).join('');
}

function saudeGerarAsoParceiro() {
    const clinicaId = document.getElementById('saudeAsoClinica').value;
    const medicoId = document.getElementById('saudeAsoExaminador').value;
    const clinica = saudePrestadores.rows.find(p => p.id === clinicaId && p.tipo === 'clinica' && p.ativo !== false);
    const medico = saudePrestadores.rows.find(p => p.id === medicoId && p.tipo === 'medico' && p.ativo !== false && (p.clinicas || []).includes(clinicaId));
    const { colab, matricula } = buscarColaboradorPorInput('asoForm_matricula');
    if (!clinica || !medico || !colab) {
        saudePrestadoresStatus('Selecione um estabelecimento, um examinador vinculado e um colaborador válido.');
        return;
    }
    const html = gerarHtmlModeloAsoCop(EMPRESA_INFO, { ...colab, matricula }, document.getElementById('asoForm_tipo').value, {
        coordenador: saudePrestadores.coordenador, clinica, examinador: medico
    });
    abrirDocumentoHtmlParaImpressao(html, 'Modelo ASO COP — prestador parceiro');
}
