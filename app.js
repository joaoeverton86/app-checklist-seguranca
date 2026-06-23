// ============================================
// APP.JS - Checklist Segurança do Trabalho
// ============================================

const APP_VERSION = 'v17';

let currentPage = 'pageHome';
let currentChecklist = null;
let currentEquipment = null;
let checklistData = {};
let signaturePad = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion && savedVersion !== APP_VERSION) {
        localStorage.setItem('app_version', APP_VERSION);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(r => r.unregister());
            });
        }
        caches.keys().then(names => {
            Promise.all(names.map(n => caches.delete(n))).then(() => {
                window.location.reload(true);
            });
        });
        return;
    }
    localStorage.setItem('app_version', APP_VERSION);
    
    initApp();
    initSignaturePad();
    initConnectionStatus();
    initDateDefaults();
    initCadastroSelects();
    loadRecentChecklists();
    loadTopRisks();
    renderEquipmentGrids();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                reg.update();
                console.log('SW registrado e atualizado');
            })
            .catch(err => console.log('SW erro:', err));
    }
});

function initApp() {
    console.log('App Checklist Segurança inicializado - ' + APP_VERSION);
}

function initDateDefaults() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('checklistDate');
    if (dateInput) dateInput.value = today;
    
    const issueDate = document.getElementById('issueDate');
    if (issueDate) {
        const now = new Date();
        issueDate.value = now.toISOString().slice(0, 16);
    }
}

function initConnectionStatus() {
    updateConnectionStatus();
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

function updateConnectionStatus() {
    const status = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    if (navigator.onLine) {
        status.className = 'connection-status online';
        text.textContent = '● Online - Dados serão sincronizados';
    } else {
        status.className = 'connection-status offline';
        text.textContent = '● Offline - Dados salvos localmente';
    }
}

// ============================================
// NAVEGAÇÃO
// ============================================

function showPage(pageId) {
    // Salvar dados do formulário antes de sair
    if (currentPage === 'pageChecklistForm') {
        saveFormData();
    }
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = {
        'pageHome': 'navHome',
        'pageCadastro': 'navCadastro',
        'pageNewChecklist': 'navNew',
        'pageChecklistForm': 'navNew',
        'pageReportIssue': 'navNew',
        'pageReports': 'navReports',
        'pageHistory': 'navHistory',
        'pageChecklistDetail': 'navHistory',
        'pageConfig': 'navConfig'
    };
    if (navMap[pageId]) {
        document.getElementById(navMap[pageId]).classList.add('active');
    }
    
    // Atualizar header
    const headerTitle = document.getElementById('headerTitle');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const backBtn = document.getElementById('backBtn');
    
    const titles = {
        'pageHome': ['Checklist Segurança', 'PISF RAMAL DO AGRESTE'],
        'pageCadastro': ['Gestão de Cadastros', 'Visualizar e gerenciar cadastros'],
        'pageNewChecklist': ['Novo Checklist', 'Selecione o tipo de equipamento'],
        'pageChecklistForm': ['Preencher Checklist', currentEquipment?.name || ''],
        'pageReportIssue': ['Reportar Problema', 'Para operadores e motoristas'],
        'pageReports': ['Relatórios', 'Análise de conformidades'],
        'pageHistory': ['Histórico', 'Checklists realizados'],
        'pageChecklistDetail': ['Detalhes do Checklist', ''],
        'pageConfig': ['Configurações', 'Cadastros e sincronização']
    };
    
    if (titles[pageId]) {
        headerTitle.textContent = titles[pageId][0];
        headerSubtitle.textContent = titles[pageId][1];
    }
    
    backBtn.style.display = pageId !== 'pageHome' ? 'block' : 'none';
    
    if (pageId === 'pageNewChecklist') {
        resetAllCategorySteps();
    }
    
    currentPage = pageId;
    
    // Carregar dados da página
    if (pageId === 'pageHome') {
        loadRecentChecklists();
        loadTopRisks();
    } else if (pageId === 'pageCadastro') {
        loadGestao();
    } else if (pageId === 'pageReports') {
        loadReports();
    } else if (pageId === 'pageHistory') {
        loadHistory();
    } else if (pageId === 'pageConfig') {
        loadConfigPage();
    }
}

function goBack() {
    if (currentPage === 'pageChecklistForm') {
        if (confirm('Deseja salvar o checklist antes de sair?')) {
            saveChecklist();
        } else {
            showPage('pageNewChecklist');
        }
    } else if (currentPage === 'pageChecklistDetail') {
        showPage('pageHistory');
    } else {
        showPage('pageHome');
    }
}

// ============================================
// RENDERIZAÇÃO DOS EQUIPAMENTOS
// ============================================

function renderEquipmentGrids() {
    // Nova interface com busca - não precisa mais renderizar grids
}

let currentSuggestions = {};
let selectedCategory = null;

async function showSuggestions(category) {
    const suggestions = document.getElementById('suggestions' + capitalize(category));
    
    const tipos = EQUIPMENT_TYPES[category] || [];
    
    currentSuggestions[category] = { tipos, cadastros: [] };
    selectedCategory = category;
    
    renderSuggestions(category, '', tipos);
    suggestions.classList.add('show');
}

async function filterEquipment(category, query) {
    const suggestions = document.getElementById('suggestions' + capitalize(category));
    
    const tipos = EQUIPMENT_TYPES[category] || [];
    
    if (!query.trim()) {
        currentSuggestions[category] = { tipos, cadastros: [] };
        renderSuggestions(category, '', tipos);
        suggestions.classList.add('show');
        return;
    }
    
    const queryLower = query.toLowerCase();
    
    const tiposFiltrados = tipos.filter(item => 
        item.name.toLowerCase().includes(queryLower) ||
        item.nr.toLowerCase().includes(queryLower)
    );
    
    currentSuggestions[category] = { tipos: tiposFiltrados, cadastros: [] };
    renderSuggestions(category, query, tiposFiltrados);
    suggestions.classList.add('show');
}

function renderSuggestions(category, query, tipos) {
    const suggestions = document.getElementById('suggestions' + capitalize(category));
    let html = '';
    
    if (tipos.length > 0) {
        tipos.forEach(item => {
            html += `
                <div class="suggestion-item" onclick="selectCategoryType('${category}', '${item.id}')">
                    <div class="item-info">
                        <div class="item-name">${item.icon} ${item.name}</div>
                        <div class="item-nr">${item.nr} • ${item.items.length} itens</div>
                    </div>
                    <span style="color: var(--text-light); font-size: 18px;">›</span>
                </div>
            `;
        });
    }
    
    if (!html) {
        html = '<div class="no-results">Nenhum tipo de equipamento encontrado</div>';
    }
    
    suggestions.innerHTML = html;
}

function startChecklistWithCadastro(category, equipmentId, patrimonio) {
    startChecklist(category, equipmentId);
    
    setTimeout(async () => {
        const cadastro = await getFromIndexedDB('cadastros', patrimonio);
        if (cadastro) {
            document.getElementById('checklistPatrimonio').value = cadastro.patrimonio || '';
            document.getElementById('checklistNome').value = cadastro.nome || '';
            document.getElementById('checklistEmpresa').value = cadastro.empresa || '';
        }
    }, 100);
}

function selectEquipment(category, equipmentId) {
    startChecklist(category, equipmentId);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Fechar sugestões ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        document.querySelectorAll('.suggestions-list').forEach(el => el.classList.remove('show'));
    }
});

// ============================================
// CADASTRO
// ============================================

function initCadastroSelects() {
    const tipoSelect = document.getElementById('cadastroTipo');
    const categoriaSelect = document.getElementById('cadastroCategoria');
    
    if (tipoSelect) {
        tipoSelect.addEventListener('change', () => {
            const tipo = tipoSelect.value;
            updateCategoriaOptions(tipo);
        });
    }
}

function updateCategoriaOptions(tipo) {
    const categoriaSelect = document.getElementById('cadastroCategoria');
    if (!categoriaSelect) return;
    
    categoriaSelect.innerHTML = '<option value="">Selecione...</option>';
    
    if (!tipo || !EQUIPMENT_TYPES[tipo]) return;
    
    EQUIPMENT_TYPES[tipo].forEach(eq => {
        const option = document.createElement('option');
        option.value = eq.id;
        option.textContent = `${eq.name} (${eq.nr})`;
        categoriaSelect.appendChild(option);
    });
}

async function saveCadastro() {
    const tipo = document.getElementById('cadastroTipo').value;
    const categoria = document.getElementById('cadastroCategoria').value;
    const nome = document.getElementById('cadastroNome').value.trim();
    const patrimonio = document.getElementById('cadastroPatrimonio').value.trim();
    const empresa = document.getElementById('cadastroEmpresa').value.trim();
    const setor = document.getElementById('cadastroSetor')?.value.trim() || '';
    const obs = document.getElementById('cadastroObs').value.trim();
    
    if (!tipo || !categoria || !nome || !patrimonio) {
        showToast('Preencha todos os campos obrigatórios');
        return;
    }
    
    const patrimonioNorm = patrimonio.trim().toUpperCase();
    
    const existing = await getFromIndexedDB('cadastros', patrimonioNorm);
    if (existing && existing.ativo !== false) {
        showToast('⚠️ Já existe equipamento com patrimônio "' + patrimonioNorm + '"');
        return;
    }
    
    if (existing && existing.ativo === false) {
        if (!confirm('Já existiu um item com patrimônio "' + patrimonioNorm + '" (desativado). Deseja reativar?')) {
            return;
        }
        existing.ativo = true;
        existing.nome = nome;
        existing.empresa = empresa;
        existing.setor = setor;
        existing.obs = obs;
        existing.equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria) || null;
        await saveToIndexedDB('cadastros', existing);
        showToast('Equipamento reativado!');
        
        document.getElementById('cadastroTipo').value = '';
        document.getElementById('cadastroCategoria').innerHTML = '<option value="">Selecione o tipo primeiro...</option>';
        document.getElementById('cadastroNome').value = '';
        document.getElementById('cadastroPatrimonio').value = '';
        document.getElementById('cadastroEmpresa').value = '';
        if (document.getElementById('cadastroSetor')) document.getElementById('cadastroSetor').value = '';
        document.getElementById('cadastroObs').value = '';
        
        setTimeout(() => showPage('pageCadastro'), 800);
        return;
    }
    
    const equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria);
    
    const cadastro = {
        id: patrimonio,
        tipo,
        categoria,
        nome,
        patrimonio,
        empresa,
        setor,
        obs,
        equipment: equipment ? { id: equipment.id, name: equipment.name, icon: equipment.icon, nr: equipment.nr } : null,
        timestamp: new Date().toISOString(),
        ativo: true,
        synced: false
    };
    
    await saveToIndexedDB('cadastros', cadastro);
    
    document.getElementById('cadastroTipo').value = '';
    document.getElementById('cadastroCategoria').innerHTML = '<option value="">Selecione o tipo primeiro...</option>';
    document.getElementById('cadastroNome').value = '';
    document.getElementById('cadastroPatrimonio').value = '';
    document.getElementById('cadastroEmpresa').value = '';
    if (document.getElementById('cadastroSetor')) document.getElementById('cadastroSetor').value = '';
    document.getElementById('cadastroObs').value = '';
    
    showToast('Equipamento cadastrado!');
    setTimeout(() => showPage('pageCadastro'), 800);
}

async function saveColaborador() {
    const nome = document.getElementById('colabNome').value.trim();
    const funcao = document.getElementById('colabFuncao').value;
    const setor = document.getElementById('colabSetor').value;
    const empresa = document.getElementById('colabEmpresa').value.trim();
    const matricula = document.getElementById('colabMatricula').value.trim();
    const aso = document.getElementById('colabASO').value;
    
    if (!nome || !funcao || !setor) {
        showToast('Preencha todos os campos obrigatórios');
        return;
    }
    
    const matriculaNorm = matricula ? matricula.trim().toUpperCase() : '';
    
    if (matriculaNorm) {
        const existing = await getFromIndexedDB('colaboradores', matriculaNorm);
        if (existing && existing.ativo !== false) {
            showToast('⚠️ Já existe colaborador com matrícula "' + matriculaNorm + '"');
            return;
        }
        if (existing && existing.ativo === false) {
            if (!confirm('Já existiu um colaborador com matrícula "' + matriculaNorm + '" (desativado). Deseja reativar?')) {
                return;
            }
            existing.ativo = true;
            existing.nome = nome;
            existing.funcao = funcao;
            existing.setor = setor;
            existing.empresa = empresa;
            existing.aso = aso;
            await saveToIndexedDB('colaboradores', existing);
            showToast('Colaborador reativado!');
            
            document.getElementById('colabNome').value = '';
            document.getElementById('colabFuncao').value = '';
            document.getElementById('colabSetor').value = '';
            document.getElementById('colabEmpresa').value = '';
            document.getElementById('colabMatricula').value = '';
            document.getElementById('colabASO').value = '';
            
            setTimeout(() => showPage('pageCadastro'), 800);
            return;
        }
    }
    
    const colaborador = {
        id: matricula || Date.now().toString(),
        nome,
        funcao,
        setor,
        empresa,
        matricula,
        aso,
        timestamp: new Date().toISOString(),
        ativo: true,
        synced: false
    };
    
    await saveToIndexedDB('colaboradores', colaborador);
    showToast('Colaborador cadastrado!');
    
    document.getElementById('colabNome').value = '';
    document.getElementById('colabFuncao').value = '';
    document.getElementById('colabSetor').value = '';
    document.getElementById('colabEmpresa').value = '';
    document.getElementById('colabMatricula').value = '';
    document.getElementById('colabASO').value = '';
    
    setTimeout(() => showPage('pageCadastro'), 800);
}

let gestaoTab = 'equipamentos';

function switchGestaoTab(tab) {
    gestaoTab = tab;
    document.getElementById('tabEquipamentos').className = tab === 'equipamentos' ? 'status-btn c selected' : 'status-btn na';
    document.getElementById('tabColaboradores').className = tab === 'colaboradores' ? 'status-btn nc selected' : 'status-btn na';
    document.getElementById('gestaoSearch').value = '';
    loadGestao();
}

async function loadGestao(search = '') {
    const container = document.getElementById('gestaoList');
    const countEl = document.getElementById('gestaoCount');
    const query = search.toLowerCase().trim();

    if (gestaoTab === 'equipamentos') {
        const cadastros = await getAllFromIndexedDB('cadastros');
        let items = cadastros.filter(c => c.ativo !== false);

        if (query) {
            items = items.filter(c =>
                (c.patrimonio && c.patrimonio.toLowerCase().includes(query)) ||
                (c.nome && c.nome.toLowerCase().includes(query)) ||
                (c.empresa && c.empresa.toLowerCase().includes(query)) ||
                (c.setor && c.setor.toLowerCase().includes(query))
            );
        }

        countEl.textContent = `${items.length} equipamento(s)`;

        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">🚜</div><div class="text">${query ? 'Nenhum resultado para "' + query + '"' : 'Nenhum equipamento cadastrado'}</div></div>`;
            return;
        }

        const funcoesNome = { TST: 'TST', motorista: 'Motorista', operador: 'Operador', mecanico: 'Mecânico', eletricista: 'Eletricista', pedreiro: 'Pedreiro', servente: 'Servente', encarregado_geral: 'Enc. Geral', engenheiro: 'Engenheiro', encarregado_transporte: 'Enc. Transporte', outro: 'Outro' };

        container.innerHTML = items.map(c => {
            const statusBadge = c.ultimoChecklist ?
                `<span style="font-size: 10px; padding: 2px 6px; border-radius: 8px; background: #d5f5e3; color: #1e8449;">✓ Verificado</span>` :
                `<span style="font-size: 10px; padding: 2px 6px; border-radius: 8px; background: #fadbd8; color: #c0392b;">⚠ Pendente</span>`;
            return `
                <div class="history-item" style="flex-wrap: wrap;">
                    <span class="history-icon">${c.equipment?.icon || '📦'}</span>
                    <div class="history-info">
                        <div class="history-title">${c.patrimonio} - ${c.nome}</div>
                        <div class="history-date">${c.empresa || 'Sem empresa'} • ${c.equipment?.nr || ''} ${c.setor ? '• ' + c.setor : ''}</div>
                        <div style="margin-top: 4px;">${statusBadge}</div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button onclick="editCadastro('${c.id}')" style="background: var(--primary); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">✏️</button>
                        <button onclick="deleteCadastro('${c.id}')" style="background: var(--danger); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    } else {
        const colaboradores = await getAllFromIndexedDB('colaboradores');
        let items = colaboradores.filter(c => c.ativo !== false);

        if (query) {
            items = items.filter(c =>
                (c.nome && c.nome.toLowerCase().includes(query)) ||
                (c.empresa && c.empresa.toLowerCase().includes(query)) ||
                (c.matricula && c.matricula.toLowerCase().includes(query))
            );
        }

        countEl.textContent = `${items.length} colaborador(es)`;

        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">👥</div><div class="text">${query ? 'Nenhum resultado para "' + query + '"' : 'Nenhum colaborador cadastrado'}</div></div>`;
            return;
        }

        const funcaoIcon = (f) => {
            if (!f) return '👤';
            const lower = f.toLowerCase();
            if (lower.includes('motorista')) return '🚛';
            if (lower.includes('operador')) return '🚜';
            if (lower.includes('mecân') || lower.includes('mecan')) return '🔧';
            if (lower.includes('elétr') || lower.includes('eletro')) return '⚡';
            if (lower.includes('pedreiro')) return '🔨';
            if (lower.includes('servente')) return '👷';
            if (lower.includes('engenheiro')) return '👷‍♂️';
            if (lower.includes('técnico') || lower.includes('tecnico') || lower.includes('tec.')) return '🦺';
            if (lower.includes('vigia')) return '🛡️';
            if (lower.includes('secret')) return '📋';
            if (lower.includes('admin') || lower.includes('aux. admin')) return '📁';
            if (lower.includes('leiturista')) return '📊';
            if (lower.includes('topograf')) return '📐';
            if (lower.includes('enfermeiro')) return '🏥';
            if (lower.includes('assistente social')) return '🤝';
            if (lower.includes('informática')) return '💻';
            if (lower.includes('almoxarifado')) return '📦';
            if (lower.includes('encarreg') || lower.includes('enc.')) return '👷';
            return '👤';
        };

        container.innerHTML = items.map(c => {
            const asoStatus = c.aso ? new Date(c.aso) < new Date() ?
                '<span style="color: var(--danger); font-size: 10px;">⚠ ASO Vencido</span>' :
                '<span style="color: var(--success); font-size: 10px;">✓ ASO OK</span>' : '';
            return `
                <div class="history-item" style="flex-wrap: wrap;">
                    <span class="history-icon">${funcaoIcon(c.funcao)}</span>
                    <div class="history-info">
                        <div class="history-title">${c.nome}</div>
                        <div class="history-date">${c.funcao || '—'} • ${c.setor || '—'}</div>
                        <div style="margin-top: 4px; font-size: 11px;">${c.empresa || ''} ${c.matricula ? '• Mat: ' + c.matricula : ''} ${asoStatus}</div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button onclick="editColaborador('${c.id}')" style="background: var(--primary); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">✏️</button>
                        <button onclick="deleteColaborador('${c.id}')" style="background: var(--danger); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    }
}

function filterGestao(query) {
    loadGestao(query);
}

async function editCadastro(id) {
    const cadastro = await getFromIndexedDB('cadastros', id);
    if (!cadastro) return;

    showPage('pageConfig');

    setTimeout(() => {
        document.getElementById('cadastroTipo').value = cadastro.tipo || '';
        updateCategoriaOptions(cadastro.tipo);
        setTimeout(() => {
            document.getElementById('cadastroCategoria').value = cadastro.categoria || '';
        }, 50);
        document.getElementById('cadastroNome').value = cadastro.nome || '';
        document.getElementById('cadastroPatrimonio').value = cadastro.patrimonio || '';
        document.getElementById('cadastroEmpresa').value = cadastro.empresa || '';
        document.getElementById('cadastroSetor').value = cadastro.setor || '';
        document.getElementById('cadastroObs').value = cadastro.obs || '';

        const btn = document.querySelector('#pageConfig .save-btn[onclick="saveCadastro()"]');
        if (btn) {
            btn.textContent = '💾 Atualizar Equipamento';
            btn.setAttribute('onclick', `saveCadastroEdit('${id}')`);
        }
    }, 100);
}

async function saveCadastroEdit(id) {
    const cadastro = await getFromIndexedDB('cadastros', id);
    if (!cadastro) return;

    cadastro.nome = document.getElementById('cadastroNome').value.trim();
    cadastro.patrimonio = document.getElementById('cadastroPatrimonio').value.trim();
    cadastro.empresa = document.getElementById('cadastroEmpresa').value.trim();
    cadastro.setor = document.getElementById('cadastroSetor').value.trim();
    cadastro.obs = document.getElementById('cadastroObs').value.trim();

    await saveToIndexedDB('cadastros', cadastro);
    showToast('Equipamento atualizado!');

    const btn = document.querySelector('#pageConfig .save-btn[onclick^="saveCadastroEdit"]');
    if (btn) {
        btn.textContent = '💾 Cadastrar Equipamento';
        btn.setAttribute('onclick', 'saveCadastro()');
    }

    document.getElementById('cadastroTipo').value = '';
    document.getElementById('cadastroCategoria').innerHTML = '<option value="">Selecione o tipo primeiro...</option>';
    document.getElementById('cadastroNome').value = '';
    document.getElementById('cadastroPatrimonio').value = '';
    document.getElementById('cadastroEmpresa').value = '';
    document.getElementById('cadastroSetor').value = '';
    document.getElementById('cadastroObs').value = '';
}

async function editColaborador(id) {
    const colab = await getFromIndexedDB('colaboradores', id);
    if (!colab) return;

    showPage('pageConfig');

    setTimeout(() => {
        document.getElementById('colabNome').value = colab.nome || '';
        document.getElementById('colabFuncao').value = colab.funcao || '';
        document.getElementById('colabSetor').value = colab.setor || '';
        document.getElementById('colabEmpresa').value = colab.empresa || '';
        document.getElementById('colabMatricula').value = colab.matricula || '';
        document.getElementById('colabASO').value = colab.aso || '';

        const btn = document.querySelector('#pageConfig .save-btn[onclick="saveColaborador()"]');
        if (btn) {
            btn.textContent = '💾 Atualizar Colaborador';
            btn.setAttribute('onclick', `saveColaboradorEdit('${id}')`);
        }
    }, 100);
}

async function saveColaboradorEdit(id) {
    const colab = await getFromIndexedDB('colaboradores', id);
    if (!colab) return;

    colab.nome = document.getElementById('colabNome').value.trim();
    colab.funcao = document.getElementById('colabFuncao').value;
    colab.setor = document.getElementById('colabSetor').value;
    colab.empresa = document.getElementById('colabEmpresa').value.trim();
    colab.matricula = document.getElementById('colabMatricula').value.trim();
    colab.aso = document.getElementById('colabASO').value;

    await saveToIndexedDB('colaboradores', colab);
    showToast('Colaborador atualizado!');

    const btn = document.querySelector('#pageConfig .save-btn[onclick^="saveColaboradorEdit"]');
    if (btn) {
        btn.textContent = '💾 Cadastrar Colaborador';
        btn.setAttribute('onclick', 'saveColaborador()');
    }

    document.getElementById('colabNome').value = '';
    document.getElementById('colabFuncao').value = '';
    document.getElementById('colabSetor').value = '';
    document.getElementById('colabEmpresa').value = '';
    document.getElementById('colabMatricula').value = '';
    document.getElementById('colabASO').value = '';
}

async function deleteCadastro(id) {
    if (!confirm('Deseja excluir este cadastro?')) return;
    const cadastro = await getFromIndexedDB('cadastros', id);
    if (cadastro) {
        cadastro.ativo = false;
        await saveToIndexedDB('cadastros', cadastro);
    }
    showToast('Cadastro excluído');
    loadGestao();
}

async function deleteColaborador(id) {
    if (!confirm('Deseja excluir este colaborador?')) return;
    const colab = await getFromIndexedDB('colaboradores', id);
    if (colab) {
        colab.ativo = false;
        await saveToIndexedDB('colaboradores', colab);
    }
    showToast('Colaborador excluído');
    loadCadastros();
}

async function getCadastrosByTipo(tipo) {
    const cadastros = await getAllFromIndexedDB('cadastros');
    return cadastros.filter(c => c.tipo && c.tipo.toLowerCase() === tipo.toLowerCase() && c.ativo !== false);
}

async function getAllCadastros() {
    return await getAllFromIndexedDB('cadastros');
}

async function getAllColaboradores() {
    return await getAllFromIndexedDB('colaboradores');
}

// ============================================
// CHECKLIST
// ============================================

function startChecklist(category, equipmentId) {
    const equipment = EQUIPMENT_TYPES[category].find(e => e.id === equipmentId);
    if (!equipment) return;
    
    currentEquipment = equipment;
    checklistData = {};
    
    // Inicializar dados do formulário
    document.getElementById('checklistDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('checklistPatrimonio').value = '';
    document.getElementById('checklistNome').value = equipment.name;
    document.getElementById('checklistEmpresa').value = '';
    document.getElementById('checklistOperador').value = '';
    document.getElementById('checklistObservacoes').value = '';
    
    // Carregar cadastros deste tipo
    loadCadastroSelect(category);
    
    clearSignature();
    renderChecklistItems(equipment);
    showPage('pageChecklistForm');
}

async function loadCadastroSelect(category) {
    const cadastros = await getCadastrosByTipo(category);
    const select = document.getElementById('checklistPatrimonio');
    
    select.innerHTML = '<option value="">Selecione um equipamento cadastrado...</option>';
    
    cadastros.forEach(c => {
        const option = document.createElement('option');
        option.value = c.patrimonio;
        option.textContent = `${c.patrimonio} - ${c.nome} (${c.empresa || 'Sem empresa'})`;
        option.dataset.nome = c.nome || '';
        option.dataset.empresa = c.empresa || '';
        select.appendChild(option);
    });
    
    if (cadastros.length === 0) {
        select.innerHTML = '<option value="">Nenhum equipamento cadastrado para este tipo</option>';
    }
}

function fillFromCadastro() {
    const select = document.getElementById('checklistPatrimonio');
    const option = select.options[select.selectedIndex];
    
    if (!select.value) {
        document.getElementById('checklistNome').value = currentEquipment?.name || '';
        document.getElementById('checklistEmpresa').value = '';
        return;
    }
    
    document.getElementById('checklistNome').value = option.dataset.nome || currentEquipment?.name || '';
    document.getElementById('checklistEmpresa').value = option.dataset.empresa || '';
}

function renderChecklistItems(equipment) {
    const container = document.getElementById('checklistItems');
    let currentSection = null;
    
    let html = '';
    equipment.items.forEach(item => {
        // Seção (apenas para veículos)
        if (item.section && item.section !== currentSection) {
            currentSection = item.section;
            html += `<div class="section-title" style="font-size: 14px; margin-top: 16px; color: ${currentSection === 'INTERDIÇÃO' ? 'var(--danger)' : 'var(--warning)'}">
                ${currentSection === 'INTERDIÇÃO' ? '🚫 ITENS DE INTERDIÇÃO' : '🔧 ITENS DE CORREÇÃO'}
            </div>`;
        }
        
        const riskClass = item.risk === 'high' ? 'badge-risk-high' : 
                         item.risk === 'medium' ? 'badge-risk-medium' : 'badge-risk-low';
        const riskText = item.risk === 'high' ? 'RISCO ALTO' : 
                        item.risk === 'medium' ? 'RISCO MÉDIO' : 'RISCO BAIXO';
        
        html += `
            <div class="checklist-item" id="item-${item.id}">
                <div class="item-header">
                    <span class="item-text">${item.text}</span>
                </div>
                <div class="item-meta">
                    <span class="badge badge-nr">${item.nr}</span>
                    <span class="badge ${riskClass}">${riskText}</span>
                </div>
                <div class="status-buttons">
                    <button class="status-btn c" onclick="setStatus('${item.id}', 'C', this)">✓ Conforme</button>
                    <button class="status-btn nc" onclick="setStatus('${item.id}', 'NC', this)">✗ Não Conforme</button>
                    <button class="status-btn na" onclick="setStatus('${item.id}', 'NA', this)">— N/A</button>
                </div>
                <div class="item-observation" id="obs-${item.id}">
                    <textarea placeholder="Observação sobre este item..." 
                              onchange="setObservation('${item.id}', this.value)"></textarea>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function setStatus(itemId, status, btn) {
    // Atualizar UI
    const item = btn.closest('.checklist-item');
    item.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    // Mostrar/esconder observação
    const obsDiv = document.getElementById(`obs-${itemId}`);
    if (status === 'NC') {
        obsDiv.classList.add('show');
    } else {
        obsDiv.classList.remove('show');
    }
    
    // Salvar dados
    if (!checklistData[itemId]) checklistData[itemId] = {};
    checklistData[itemId].status = status;
    
    updateProgress();
}

function setObservation(itemId, value) {
    if (!checklistData[itemId]) checklistData[itemId] = {};
    checklistData[itemId].observation = value;
}

function updateProgress() {
    if (!currentEquipment) return;
    const total = currentEquipment.items.length;
    const filled = Object.keys(checklistData).filter(k => checklistData[k].status).length;
    const pct = Math.round((filled / total) * 100);
    document.getElementById('progressFill').style.width = `${pct}%`;
}

let currentStatusChecklist = null;

function setStatusChecklist(status, btn) {
    // Atualizar UI
    btn.closest('.status-buttons').querySelectorAll('.status-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = 'white';
    });
    btn.classList.add('selected');
    btn.style.background = status === 'interditado' ? '#fadbd8' : 
                           status === 'liberado_restricao' ? '#fdebd0' : '#d5f5e3';
    
    currentStatusChecklist = status;
    
    // Mostrar prazo se interditado ou com restrição
    const prazoDiv = document.getElementById('prazoAdequacao');
    if (status === 'interditado' || status === 'liberado_restricao') {
        prazoDiv.style.display = 'block';
    } else {
        prazoDiv.style.display = 'none';
    }
}

function saveFormData() {
    checklistData._form = {
        date: document.getElementById('checklistDate').value,
        patrimonio: document.getElementById('checklistPatrimonio').value,
        nome: document.getElementById('checklistNome').value,
        empresa: document.getElementById('checklistEmpresa').value,
        operador: document.getElementById('checklistOperador').value,
        observacoes: document.getElementById('checklistObservacoes').value,
        responsavel: document.getElementById('checklistResponsavel')?.value || ''
    };
}

// ============================================
// ASSINATURA
// ============================================

function initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }
    
    function startDraw(e) {
        e.preventDefault();
        drawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
    }
    
    function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        lastX = pos.x;
        lastY = pos.y;
    }
    
    function stopDraw() { drawing = false; }
    
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);
}

function clearSignature() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getSignatureImage() {
    const canvas = document.getElementById('signatureCanvas');
    return canvas ? canvas.toDataURL() : null;
}

// ============================================
// SALVAR CHECKLIST
// ============================================

function saveChecklist() {
    saveFormData();
    
    const formData = checklistData._form || {};
    
    // Validações
    const patrimonioSelect = document.getElementById('checklistPatrimonio');
    if (!patrimonioSelect.value || patrimonioSelect.value === '') {
        showToast('Selecione um equipamento cadastrado');
        patrimonioSelect.focus();
        return;
    }
    
    // Verificar se pelo menos 1 item foi preenchido
    const items = Object.keys(checklistData).filter(k => k !== '_form');
    if (items.length === 0) {
        showToast('Preencha pelo menos 1 item de verificação');
        return;
    }
    
    // Verificar se status foi selecionado
    if (!currentStatusChecklist) {
        showToast('Selecione o status do equipamento');
        return;
    }
    
    // Calcular estatísticas
    let conformes = 0, naoConformes = 0, na = 0;
    items.forEach(k => {
        if (checklistData[k].status === 'C') conformes++;
        else if (checklistData[k].status === 'NC') naoConformes++;
        else if (checklistData[k].status === 'NA') na++;
    });
    
    // Se há não conformes e status não foi definido, sugerir interdição
    let statusFinal = currentStatusChecklist;
    if (naoConformes > 0 && !currentStatusChecklist) {
        statusFinal = 'liberado_restricao';
    } else if (naoConformes === 0) {
        statusFinal = 'liberado';
    }
    
    const prazo = document.getElementById('checklistPrazo')?.value || null;
    
    const checklist = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date: formData.date,
        patrimonio: formData.patrimonio,
        nome: formData.nome,
        empresa: formData.empresa,
        operador: formData.operador,
        observacoes: formData.observacoes,
        responsavel: formData.responsavel,
        statusChecklist: statusFinal,
        prazoAdequacao: prazo,
        equipment: {
            id: currentEquipment.id,
            name: currentEquipment.name,
            icon: currentEquipment.icon,
            nr: currentEquipment.nr
        },
        items: checklistData,
        stats: { conformes, naoConformes, na, total: items.length },
        signature: getSignatureImage(),
        synced: false
    };
    
    // Salvar no IndexedDB
    saveToIndexedDB('checklists', checklist);
    
    // Atualizar último checklist no cadastro
    updateCadastroLastChecklist(formData.patrimonio);
    
    showToast('Checklist salvo com sucesso!');
    
    // Voltar para home
    setTimeout(() => {
        currentStatusChecklist = null;
        showPage('pageHome');
    }, 1000);
}

async function updateCadastroLastChecklist(patrimonio) {
    const cadastro = await getFromIndexedDB('cadastros', patrimonio);
    if (cadastro) {
        cadastro.ultimoChecklist = new Date().toISOString();
        await saveToIndexedDB('cadastros', cadastro);
    }
}

// ============================================
// RELATO DE PROBLEMAS
// ============================================

function saveIssue() {
    const date = document.getElementById('issueDate').value;
    const type = document.getElementById('issueType').value;
    const identificacao = document.getElementById('issueIdentificacao').value;
    const description = document.getElementById('issueDescription').value;
    const reporter = document.getElementById('issueReporter').value;
    const role = document.getElementById('issueRole').value;
    
    if (!type || !description || !reporter) {
        showToast('Preencha todos os campos obrigatórios');
        return;
    }
    
    const issue = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date,
        type,
        identificacao,
        description,
        reporter,
        role,
        status: 'aberto',
        synced: false
    };
    
    saveToIndexedDB('issues', issue);
    showToast('Problema reportado com sucesso!');
    
    // Limpar formulário
    document.getElementById('issueType').value = '';
    document.getElementById('issueIdentificacao').value = '';
    document.getElementById('issueDescription').value = '';
    document.getElementById('issueReporter').value = '';
    document.getElementById('issueRole').value = '';
    
    setTimeout(() => showPage('pageHome'), 1000);
}

// ============================================
// INDEXEDDB
// ============================================

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ChecklistSeguranca', 3);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('checklists')) {
                db.createObjectStore('checklists', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('issues')) {
                db.createObjectStore('issues', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('cadastros')) {
                db.createObjectStore('cadastros', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('colaboradores')) {
                db.createObjectStore('colaboradores', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveToIndexedDB(storeName, data, skipSync = false) {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(data);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            resolve();
            if (!skipSync && navigator.onLine && getSyncUrl()) {
                syncToGoogleSheets(storeName, data);
            }
        };
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function getAllFromIndexedDB(storeName) {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getFromIndexedDB(storeName, id) {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(id);
    return new Promise((resolve, reject) => {
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function deleteFromIndexedDB(storeName, id) {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

// ============================================
// SINCRONIZAÇÃO COM GOOGLE SHEETS
// ============================================

function getSyncUrl() {
    return localStorage.getItem('sync_script_url') || '';
}

function setSyncUrl(url) {
    localStorage.setItem('sync_script_url', url);
}

async function syncToGoogleSheets(storeName, data) {
    const SCRIPT_URL = getSyncUrl();
    
    if (!SCRIPT_URL) {
        console.log('URL do Google Apps Script não configurada');
        return;
    }
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ store: storeName, data: data })
        });
        
        data.synced = true;
        await saveToIndexedDB(storeName, data, true);
        console.log('Sincronizado:', storeName, data.id);
    } catch (error) {
        console.log('Erro ao sincronizar:', error.message);
        adicionarFilaPendente(storeName, data);
    }
}

function adicionarFilaPendente(storeName, data) {
    const fila = JSON.parse(localStorage.getItem('sync_pending_queue') || '[]');
    const existe = fila.find(f => f.store === storeName && f.data.id === data.id);
    if (!existe) {
        fila.push({ store: storeName, data, tentativas: 0, criado: new Date().toISOString() });
        localStorage.setItem('sync_pending_queue', JSON.stringify(fila));
    }
}

async function processarFilaPendente() {
    const SCRIPT_URL = getSyncUrl();
    if (!SCRIPT_URL) return;
    
    const fila = JSON.parse(localStorage.getItem('sync_pending_queue') || '[]');
    if (fila.length === 0) return;
    
    const processar = [];
    const restante = [];
    
    for (const item of fila) {
        if (item.tentativas < 5) {
            processar.push(item);
        }
    }
    
    for (const item of processar) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ store: item.store, data: item.data })
            });
            item.data.synced = true;
            await saveToIndexedDB(item.store, item.data, true);
        } catch {
            item.tentativas++;
            restante.push(item);
        }
    }
    
    localStorage.setItem('sync_pending_queue', JSON.stringify(restante));
    
    if (processar.length > 0 && restante.length === 0) {
        showToast(`Sincronizados ${processar.length} item(ns)!`);
    }
}

function getSyncStatus() {
    const url = getSyncUrl();
    const fila = JSON.parse(localStorage.getItem('sync_pending_queue') || '[]');
    return { configurado: !!url, url, pendentes: fila.length };
}

// ============================================
// HISTÓRICO
// ============================================

async function loadHistory() {
    const checklists = await getAllFromIndexedDB('checklists');
    const container = document.getElementById('historyList');
    
    if (checklists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📝</div>
                <div class="text">Nenhum checklist no histórico</div>
            </div>`;
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    checklists.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = checklists.map(c => {
        const statusClass = c.stats.naoConformes > 0 ? 'status-alert' : 'status-ok';
        const statusText = c.stats.naoConformes > 0 ? 
            `${c.stats.naoConformes} NC` : 'Conforme';
        const date = new Date(c.date).toLocaleDateString('pt-BR');
        
        return `
            <div class="history-item" onclick="viewChecklist('${c.id}')">
                <div class="history-info">
                    <div class="history-title">${c.patrimonio || 'Sem patrimônio'}</div>
                    <div class="history-date">${c.nome || ''}</div>
                    <div class="history-date">${date} • ${c.empresa || ''}</div>
                </div>
                <span class="history-status ${statusClass}">${statusText}</span>
            </div>`;
    }).join('');
}

async function viewChecklist(id) {
    const checklist = await getFromIndexedDB('checklists', id);
    if (!checklist) return;
    
    const container = document.getElementById('checklistDetailContent');
    const date = new Date(checklist.date).toLocaleDateString('pt-BR');
    
    let itemsHtml = '';
    for (const [itemId, data] of Object.entries(checklist.items)) {
        if (itemId === '_form') continue;
        const item = checklist.equipment?.items?.find(i => i.id === itemId);
        const statusColor = data.status === 'C' ? 'var(--success)' : 
                           data.status === 'NC' ? 'var(--danger)' : 'var(--text-light)';
        const statusText = data.status === 'C' ? '✓ Conforme' : 
                          data.status === 'NC' ? '✗ Não Conforme' : '— N/A';
        
        itemsHtml += `
            <div style="padding: 10px; border-bottom: 1px solid var(--border);">
                <div style="font-size: 13px; font-weight: 500;">${item?.text || itemId}</div>
                <div style="font-size: 12px; color: ${statusColor}; font-weight: 600; margin-top: 4px;">${statusText}</div>
                ${data.observation ? `<div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">Obs: ${data.observation}</div>` : ''}
            </div>`;
    }
    
    container.innerHTML = `
        <div class="card">
            <div class="card-title"><span class="icon">${checklist.equipment?.icon || '📦'}</span> ${checklist.nome}</div>
            <div style="font-size: 13px; color: var(--text-light);">
                <div>📅 ${date}</div>
                <div>📋 Patrimônio: ${checklist.patrimonio}</div>
                <div>🏢 ${checklist.empresa || '—'}</div>
                <div>👤 ${checklist.operador || '—'}</div>
                <div style="margin-top: 8px;">
                    <span style="color: var(--success);">✓ ${checklist.stats.conformes} Conformes</span> • 
                    <span style="color: var(--danger);">✗ ${checklist.stats.naoConformes} Não Conformes</span> • 
                    <span style="color: var(--text-light);">— ${checklist.stats.na} N/A</span>
                </div>
            </div>
        </div>
        
        ${checklist.observacoes ? `
            <div class="card">
                <div class="card-title">📝 Observações</div>
                <p style="font-size: 13px;">${checklist.observacoes}</p>
            </div>` : ''}
        
        <div class="card">
            <div class="card-title">📋 Itens Verificados</div>
            ${itemsHtml}
        </div>
        
        ${checklist.signature ? `
            <div class="card">
                <div class="card-title">✍️ Assinatura TST</div>
                <img src="${checklist.signature}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px;">
            </div>` : ''}
        
        <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button class="save-btn" style="background: var(--danger);" onclick="deleteChecklist('${checklist.id}')">
                🗑️ Excluir
            </button>
            <button class="save-btn" style="background: var(--primary);" onclick="exportChecklist('${checklist.id}')">
                📥 Exportar
            </button>
        </div>
    `;
    
    showPage('pageChecklistDetail');
}

async function deleteChecklist(id) {
    if (!confirm('Tem certeza que deseja excluir este checklist?')) return;
    await deleteFromIndexedDB('checklists', id);
    showToast('Checklist excluído');
    showPage('pageHistory');
}

// ============================================
// RELATÓRIOS
// ============================================

// ============================================
// DETALHES DO STATUS
// ============================================

async function showStatusDetails(status) {
    const checklists = await getAllFromIndexedDB('checklists');
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    
    const checklistsMes = checklists.filter(c => 
        new Date(c.date) >= inicioMes && c.statusChecklist === status
    );
    
    const statusLabels = {
        interditado: { title: '🚫 Interditados', color: 'var(--danger)', bg: '#fadbd8' },
        liberado_restricao: { title: '⚠️ Liberados com Restrição', color: 'var(--warning)', bg: '#fdebd0' },
        liberado: { title: '✅ Liberados', color: 'var(--success)', bg: '#d5f5e3' }
    };
    
    const info = statusLabels[status];
    
    let html = `
        <div style="background: ${info.bg}; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
            <h3 style="color: ${info.color}; margin: 0;">${info.title}</h3>
            <p style="color: var(--text-light); margin: 4px 0 0;">${checklistsMes.length} checklist(s) este mês</p>
        </div>
    `;
    
    if (checklistsMes.length === 0) {
        html += `<div class="empty-state"><div class="icon">✅</div><div class="text">Nenhum checklist com este status</div></div>`;
    } else {
        checklistsMes.forEach(c => {
            const data = new Date(c.date).toLocaleDateString('pt-BR');
            
            // Itens não conformes
            let itensNC = [];
            for (const [itemId, itemData] of Object.entries(c.items)) {
                if (itemId === '_form') continue;
                if (itemData.status === 'NC') {
                    const itemNome = ITEM_NAMES[itemId] || itemId;
                    itensNC.push({ nome: itemNome, obs: itemData.observation || '' });
                }
            }
            
            html += `
                <div style="background: white; border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div style="font-weight: 600; font-size: 14px;">${c.equipment?.icon || '📦'} ${c.patrimonio}</div>
                            <div style="font-size: 12px; color: var(--text-light);">${c.nome} • ${data}</div>
                            <div style="font-size: 11px; color: var(--text-light);">${c.empresa || ''}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px;">
                                <span style="color: var(--success);">✓ ${c.stats.conformes}</span>
                                <span style="color: var(--danger); margin-left: 4px;">✗ ${c.stats.naoConformes}</span>
                            </div>
                        </div>
                    </div>
            `;
            
            if (itensNC.length > 0 && status !== 'liberado') {
                html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border);">`;
                html += `<div style="font-size: 11px; font-weight: 600; color: var(--danger); margin-bottom: 6px;">Itens Não Conformes:</div>`;
                itensNC.forEach(item => {
                    html += `<div style="font-size: 12px; margin-bottom: 4px;">
                        <span style="color: var(--danger);">✗</span> ${item.nome}
                        ${item.obs ? `<div style="font-size: 10px; color: var(--text-light); margin-left: 16px;">Obs: ${item.obs}</div>` : ''}
                    </div>`;
                });
                html += `</div>`;
            }
            
            if (c.observacoes) {
                html += `<div style="margin-top: 8px; font-size: 11px; color: var(--text-light);">
                    <strong>Obs:</strong> ${c.observacoes}
                </div>`;
            }
            
            html += `</div>`;
        });
    }
    
    html += `<button class="save-btn" style="background: var(--primary); margin-top: 16px;" onclick="closeModal()">Fechar</button>`;
    
    showModal(html);
}

function showModal(html) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = html;
    overlay.classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') {
        closeModal();
    }
});

async function loadReports() {
    // Atualizar título com mês/ano atual
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const agora = new Date();
    const tituloEl = document.getElementById('reportTitle');
    if (tituloEl) {
        tituloEl.textContent = `📊 Painel do Mês - ${meses[agora.getMonth()]} ${agora.getFullYear()}`;
    }
    
    const checklists = await getAllFromIndexedDB('checklists');
    const issues = await getAllFromIndexedDB('issues');
    const cadastros = await getAllFromIndexedDB('cadastros');
    
    // Filtrar apenas equipamentos ativos
    const equipamentosAtivos = cadastros.filter(c => c.ativo !== false && c.tipo !== 'colaborador');
    
    // Calcular checklists deste mês
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const checklistsMes = checklists.filter(c => new Date(c.date) >= inicioMes);
    
    // Equipamentos que já foram verificados este mês
    const patrimoniosVerificados = new Set(checklistsMes.map(c => c.patrimonio));
    const pendentes = equipamentosAtivos.filter(e => !patrimoniosVerificados.has(e.patrimonio));
    const realizados = equipamentosAtivos.filter(e => patrimoniosVerificados.has(e.patrimonio));
    
    // Totais
    let totalC = 0, totalNC = 0;
    const itemCounts = {};
    const typeCounts = {};
    const statusCounts = { interditado: 0, liberado_restricao: 0, liberado: 0 };
    
    checklistsMes.forEach(c => {
        totalC += c.stats.conformes;
        totalNC += c.stats.naoConformes;
        
        // Contar por tipo
        const type = c.equipment?.name || 'Desconhecido';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        
        // Contar status de interdição
        if (c.statusChecklist) {
            statusCounts[c.statusChecklist] = (statusCounts[c.statusChecklist] || 0) + 1;
        }
        
        // Contar não conformidades por item
        for (const [itemId, data] of Object.entries(c.items)) {
            if (itemId === '_form') continue;
            if (data.status === 'NC') {
                const itemName = ITEM_NAMES[itemId] || itemId;
                itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
            }
        }
    });
    
    // Atualizar resumo
    document.getElementById('totalEquipamentos').textContent = equipamentosAtivos.length;
    document.getElementById('totalRealizados').textContent = realizados.length;
    document.getElementById('totalPendentes').textContent = pendentes.length;
    
    // Status do mês
    document.getElementById('statusInterditados').textContent = statusCounts.interditado || 0;
    document.getElementById('statusRestricao').textContent = statusCounts.liberado_restricao || 0;
    document.getElementById('statusLiberados').textContent = statusCounts.liberado || 0;
    
    // Pendentes - lista
    const pendentesContainer = document.getElementById('pendentesList');
    if (pendentes.length === 0 && equipamentosAtivos.length > 0) {
        pendentesContainer.innerHTML = `<div style="padding: 12px; background: #d5f5e3; border-radius: 8px; text-align: center; color: #1e8449; font-weight: 600;">✓ Todos os equipamentos foram verificados este mês!</div>`;
    } else if (pendentes.length === 0) {
        pendentesContainer.innerHTML = `<div class="empty-state"><div class="text">Cadastre equipamentos primeiro</div></div>`;
    } else {
        pendentesContainer.innerHTML = pendentes.map(p => `
            <div class="risk-list-item" style="border-left-color: var(--warning); cursor: pointer; transition: transform 0.2s;" 
                 data-patrimonio="${p.patrimonio}"
                 onclick="startChecklistFromPending(this.dataset.patrimonio)"
                 onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'">
                <div class="risk-info">
                    <div class="risk-item-name">${p.equipment?.icon || '📦'} ${p.patrimonio} - ${p.nome}</div>
                    <div class="risk-count">${p.empresa || 'Sem empresa'}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="background: var(--warning); color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">PENDENTE</span>
                    <span style="color: var(--text-light); font-size: 18px;">›</span>
                </div>
            </div>
        `).join('');
    }
    
    // Itens com mais NC
    const sorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const riskContainer = document.getElementById('riskReportList');
    
    if (sorted.length === 0) {
        riskContainer.innerHTML = `
            <div class="empty-state">
                <div class="icon">✅</div>
                <div class="text">Nenhuma não conformidade registrada</div>
            </div>`;
    } else {
        riskContainer.innerHTML = sorted.map(([name, count]) => `
            <div class="risk-list-item">
                <div class="risk-info">
                    <div class="risk-item-name">${name}</div>
                    <div class="risk-count">${count} ocorrência${count > 1 ? 's' : ''}</div>
                </div>
                <span class="risk-badge">${count}</span>
            </div>
        `).join('');
    }
    
    // Checklists por tipo
    const typeContainer = document.getElementById('typeReportList');
    const typeSorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    typeContainer.innerHTML = typeSorted.map(([type, count]) => `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border);">
            <span style="font-size: 13px;">${type}</span>
            <span style="font-size: 13px; font-weight: 600;">${count}</span>
        </div>
    `).join('') || '<div class="empty-state"><div class="text">Nenhum registro</div></div>';
    
    // Relatos de problemas
    const issuesContainer = document.getElementById('issuesReportList');
    if (issues.length === 0) {
        issuesContainer.innerHTML = `
            <div class="empty-state">
                <div class="icon">✅</div>
                <div class="text">Nenhum relato de problema</div>
            </div>`;
    } else {
        issuesContainer.innerHTML = issues.slice(0, 10).map(i => `
            <div class="risk-list-item">
                <div class="risk-info">
                    <div class="risk-item-name">${CATEGORY_ICONS[i.type] || '📦'} ${i.description.substring(0, 50)}...</div>
                    <div class="risk-count">${i.reporter} • ${new Date(i.date).toLocaleDateString('pt-BR')}</div>
                </div>
            </div>
        `).join('');
    }
}

// ============================================
// HOME - DADOS RECENTES
// ============================================

async function loadRecentChecklists() {
    const checklists = await getAllFromIndexedDB('checklists');
    const container = document.getElementById('recentChecklists');
    
    if (checklists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📝</div>
                <div class="text">Nenhum checklist realizado</div>
            </div>`;
        return;
    }
    
    const recent = checklists
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    container.innerHTML = recent.map(c => {
        const date = new Date(c.date).toLocaleDateString('pt-BR');
        const statusClass = c.stats.naoConformes > 0 ? 'status-alert' : 'status-ok';
        const statusText = c.stats.naoConformes > 0 ? 
            `${c.stats.naoConformes} NC` : 'OK';
        
        return `
            <div class="history-item" onclick="viewChecklist('${c.id}')">
                <div class="history-info">
                    <div class="history-title">${c.patrimonio || 'Sem patrimônio'}</div>
                    <div class="history-date">${c.nome || ''}</div>
                    <div class="history-date">${date}</div>
                </div>
                <span class="history-status ${statusClass}">${statusText}</span>
            </div>`;
    }).join('');
}

async function loadTopRisks() {
    const checklists = await getAllFromIndexedDB('checklists');
    const container = document.getElementById('topRisks');
    
    const itemCounts = {};
    checklists.forEach(c => {
        for (const [itemId, data] of Object.entries(c.items)) {
            if (itemId === '_form') continue;
            if (data.status === 'NC') {
                const itemName = ITEM_NAMES[itemId] || itemId;
                itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
            }
        }
    });
    
    const sorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">✅</div>
                <div class="text">Nenhum registro de não conformidade</div>
            </div>`;
        return;
    }
    
    container.innerHTML = sorted.map(([name, count]) => `
        <div class="risk-list-item">
            <div class="risk-info">
                <div class="risk-item-name">${name}</div>
                <div class="risk-count">${count} ocorrência${count > 1 ? 's' : ''}</div>
            </div>
            <span class="risk-badge">${count}</span>
        </div>
    `).join('');
}

// ============================================
// EXPORTAÇÃO
// ============================================

async function exportToCSV() {
    const checklists = await getAllFromIndexedDB('checklists');
    const issues = await getAllFromIndexedDB('issues');
    
    if (checklists.length === 0 && issues.length === 0) {
        showToast('Nenhum dado para exportar');
        return;
    }
    
    // Exportar checklists
    if (checklists.length > 0) {
        let csv = 'Data;Patrimônio;Equipamento;Empresa;Operador;Conformes;Não Conformes;N/A\n';
        checklists.forEach(c => {
            csv += `${c.date};${c.patrimonio};${c.nome};${c.empresa};${c.operador};${c.stats.conformes};${c.stats.naoConformes};${c.stats.na}\n`;
        });
        
        // Exportar itens NC
        csv += '\n\nItens Não Conformes\n';
        csv += 'Data;Patrimônio;Item;Observação\n';
        checklists.forEach(c => {
            for (const [itemId, data] of Object.entries(c.items)) {
                if (itemId === '_form') continue;
                if (data.status === 'NC') {
                    const itemName = ITEM_NAMES[itemId] || itemId;
                    csv += `${c.date};${c.patrimonio};${itemName};${data.observation || ''}\n`;
                }
            }
        });
        
        downloadFile(csv, 'checklists.csv');
    }
    
    // Exportar relatos
    if (issues.length > 0) {
        let csv = 'Data;Tipo;Identificação;Descrição;Reportado por;Cargo;Status\n';
        issues.forEach(i => {
            csv += `${i.date};${i.type};${i.identificacao};${i.description};${i.reporter};${i.role};${i.status}\n`;
        });
        downloadFile(csv, 'relatos_problemas.csv');
    }
    
    showToast('Dados exportados com sucesso!');
}

async function exportChecklist(id) {
    const c = await getFromIndexedDB('checklists', id);
    if (!c) return;
    
    const date = new Date(c.date).toLocaleDateString('pt-BR');
    let csv = `CHECKLIST DE SEGURANÇA DO TRABALHO\n`;
    csv += `Data;${date}\n`;
    csv += `Equipamento;${c.nome}\n`;
    csv += `Patrimônio;${c.patrimonio}\n`;
    csv += `Empresa;${c.empresa}\n`;
    csv += `Operador;${c.operador}\n`;
    csv += `\nItem;Status;Observação\n`;
    
    for (const [itemId, data] of Object.entries(c.items)) {
        if (itemId === '_form') continue;
        const itemName = ITEM_NAMES[itemId] || itemId;
        const status = data.status === 'C' ? 'Conforme' : 
                      data.status === 'NC' ? 'Não Conforme' : 'N/A';
        csv += `${itemName};${status};${data.observation || ''}\n`;
    }
    
    csv += `\nConformes;${c.stats.conformes}\n`;
    csv += `Não Conformes;${c.stats.naoConformes}\n`;
    csv += `N/A;${c.stats.na}\n`;
    
    if (c.observacoes) csv += `\nObservações;${c.observacoes}\n`;
    
    downloadFile(csv, `checklist_${c.patrimonio}_${c.date}.csv`);
    showToast('Checklist exportado!');
}

function downloadFile(content, filename) {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// ============================================
// CONFIGURAÇÕES
// ============================================

function loadConfigPage() {
    const url = getSyncUrl();
    const urlInput = document.getElementById('syncUrlInput');
    if (urlInput) urlInput.value = url;
    
    const status = getSyncStatus();
    const statusCard = document.getElementById('syncStatusCard');
    const statusText = document.getElementById('syncStatusText');
    const statusDetail = document.getElementById('syncStatusDetail');
    
    if (status.configurado) {
        statusCard.style.background = '#d5f5e3';
        statusText.textContent = '✅ Configurado';
        statusText.style.color = '#1e8449';
        statusDetail.textContent = status.pendentes > 0 ? 
            `${status.pendentes} item(ns) pendente(s) de sincronização` : 
            'Sincronização ativa - todos os dados sincronizados';
    } else {
        statusCard.style.background = '#fadbd8';
        statusText.textContent = '⚠️ Não configurado';
        statusText.style.color = '#c0392b';
        statusDetail.textContent = 'Configure a URL do Google Apps Script para sincronizar';
    }

    const btnEqp = document.querySelector('#pageConfig .save-btn[onclick^="saveCadastro"]');
    if (btnEqp && !btnEqp.getAttribute('onclick').includes('Edit')) {
        btnEqp.textContent = '💾 Cadastrar Equipamento';
        btnEqp.setAttribute('onclick', 'saveCadastro()');
    }
    const btnColab = document.querySelector('#pageConfig .save-btn[onclick^="saveColaborador"]');
    if (btnColab && !btnColab.getAttribute('onclick').includes('Edit')) {
        btnColab.textContent = '💾 Cadastrar Colaborador';
        btnColab.setAttribute('onclick', 'saveColaborador()');
    }
}

function saveSyncUrl() {
    const url = document.getElementById('syncUrlInput').value.trim();
    if (!url) {
        showToast('Digite a URL do Google Apps Script');
        return;
    }
    setSyncUrl(url);
    showToast('URL salva com sucesso!');
    loadConfigPage();
}

async function testSync() {
    const url = getSyncUrl();
    if (!url) {
        showToast('Configure a URL primeiro');
        return;
    }
    
    showToast('Testando conexão...');
    
    try {
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                store: 'test', 
                data: { id: 'test_' + Date.now(), teste: true } 
            })
        });
        
        showModal(`
            <h3>✅ Conexão Testada</h3>
            <p style="font-size: 13px; margin: 12px 0; color: var(--text-light);">
                O dado foi enviado para o Google Sheets.
            </p>
            <p style="font-size: 12px; margin: 12px 0;">
                <strong>Verifique sua planilha:</strong><br>
                Abra a planilha no Google Sheets e veja se os dados estão aparecendo.
            </p>
            <p style="font-size: 11px; color: var(--text-light); margin-top: 12px;">
                Nota: Devido a limitações de segurança do navegador, não é possível 
                confirmar se o Google recebou os dados. Mas se o GET funciona, 
                o POST também funciona.
            </p>
            <button class="save-btn" style="background: var(--primary); margin-top: 16px;" onclick="closeModal()">Fechar</button>
        `);
    } catch (error) {
        showModal(`
            <h3>❌ Falha na Conexão</h3>
            <p style="font-size: 13px; margin: 12px 0;">
                Não foi possível enviar os dados:
            </p>
            <div style="background: #fadbd8; padding: 12px; border-radius: 8px; font-size: 12px; color: var(--danger);">
                ${error.message}
            </div>
            <button class="save-btn" style="background: var(--primary); margin-top: 16px;" onclick="closeModal()">Fechar</button>
        `);
    }
}

async function syncAllPending() {
    const status = getSyncStatus();
    if (!status.configurado) {
        showToast('Configure a URL do Google Sheets primeiro');
        return;
    }
    
    showToast('Sincronizando todos os dados...');
    
    const stores = ['checklists', 'issues', 'cadastros', 'colaboradores'];
    let total = 0;
    
    for (const store of stores) {
        const items = await getAllFromIndexedDB(store);
        const pendentes = items.filter(i => !i.synced && i.ativo !== false);
        pendentes.forEach(item => {
            syncToGoogleSheets(store, item);
            total++;
        });
    }
    
    await processarFilaPendente();
    
    if (total > 0) {
        showToast(`Sincronizando ${total} item(ns)...`);
    } else {
        showToast('Todos os dados já estão sincronizados!');
    }
}

async function clearAllData() {
    if (!confirm('Tem certeza? Isso vai apagar TODOS os dados do app (checklists, cadastros, relatos).')) return;
    if (!confirm('Esta ação é IRREVERSÍVEL. Confirma?')) return;
    
    const stores = ['checklists', 'issues', 'cadastros', 'colaboradores'];
    for (const store of stores) {
        const items = await getAllFromIndexedDB(store);
        for (const item of items) {
            await deleteFromIndexedDB(store, item.id);
        }
    }
    
    localStorage.removeItem('sync_pending_queue');
    
    showToast('Todos os dados foram apagados!');
    loadConfigPage();
}

async function clearAndReimport() {
    if (!confirm('Isso vai apagar todos os cadastros e baixar novamente da planilha. Checklists e relatos serão mantidos. Continuar?')) return;
    
    const items = await getAllFromIndexedDB('cadastros');
    for (const item of items) {
        await deleteFromIndexedDB('cadastros', item.id);
    }
    
    showToast('Cadastros apagados. Baixando da planilha...');
    await downloadFromSheets();
}

// ============================================
// BAIXAR DADOS DO GOOGLE SHEETS
// ============================================

async function downloadFromSheets() {
    const url = getSyncUrl();
    if (!url) {
        showToast('Configure a URL do Google Sheets primeiro');
        return;
    }
    
    const stores = {
        'Cadastros': 'cadastros',
        'Checklists': 'checklists',
        'Colaboradores': 'colaboradores',
        'Relatos': 'issues'
    };
    
    const summary = {};
    let totalImportados = 0;
    let erros = [];
    
    showToast('Iniciando download da planilha...');
    
    for (const [aba, storeName] of Object.entries(stores)) {
        try {
            showToast(`Baixando ${aba}...`);
            
            const response = await fetch(url + '?store=' + encodeURIComponent(aba));
            const result = await response.json();
            
            let count = 0;
            if (result.success && result.data) {
                for (const row of result.data) {
                    const id = row['ID'] || row['ID Checklist'] || '';
                    if (!id) continue;
                    
                    const existente = await getFromIndexedDB(storeName, id);
                    if (!existente) {
                        let item = converterParaApp(storeName, row);
                        if (item) {
                            item.synced = true;
                            await saveToIndexedDB(storeName, item, true);
                            count++;
                            totalImportados++;
                        }
                    }
                }
            }
            
            summary[aba] = count;
        } catch (error) {
            erros.push(aba + ': ' + error.message);
            summary[aba] = 0;
        }
    }
    
    showModal(`
        <h3>📥 Download Concluído</h3>
        <div style="margin: 16px 0;">
            ${Object.entries(summary).map(([aba, count]) => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
                    <span style="font-size: 13px;">${aba}</span>
                    <span style="font-size: 13px; font-weight: 600; color: ${count > 0 ? 'var(--success)' : 'var(--text-light)'};">${count} novo(s)</span>
                </div>
            `).join('')}
            <div style="display: flex; justify-content: space-between; padding: 8px 0; margin-top: 4px;">
                <span style="font-size: 14px; font-weight: 600;">Total</span>
                <span style="font-size: 14px; font-weight: 700; color: var(--primary);">${totalImportados} item(s)</span>
            </div>
        </div>
        ${erros.length > 0 ? `
            <div style="background: #fadbd8; padding: 10px; border-radius: 8px; font-size: 12px; color: var(--danger); margin-bottom: 12px;">
                Erros: ${erros.join('; ')}
            </div>
        ` : ''}
        <button class="save-btn" style="background: var(--primary);" onclick="closeModal()">Fechar</button>
    `);
    
    loadConfigPage();
}

function converterParaApp(storeName, row) {
    if (storeName === 'cadastros') {
        const tipoRaw = row['Tipo'] || '';
        const tipoLower = tipoRaw.toLowerCase();
        const categoriaRaw = row['Categoria'] || '';
        const categoriaLower = categoriaRaw.toLowerCase();
        
        const categoriaMap = {
            'trator esteira': 'trator_esteira',
            'trator pneu': 'trator_agricola',
            'retro': 'retroescavadeira',
            'retroescavadeira': 'retroescavadeira',
            'patrol': 'motoniveladora',
            'motoniveladora': 'motoniveladora',
            'escavadeira': 'escavadeira',
            'escavadeira hidráulica': 'escavadeira',
            'rolo': 'rolo',
            'rolo compactador': 'rolo',
            'bobcat': 'minicarregadeira',
            'mini-carregadeira': 'minicarregadeira',
            'pc': 'pcarregadeira',
            'pá carregadeira': 'pcarregadeira',
            'munck': 'caminhao_munk',
            'caminhão munck': 'caminhao_munk',
            'basulante': 'caminhao_basculante',
            'basculante': 'caminhao_basculante',
            'caminhão basculante': 'caminhao_basculante',
            'pipa': 'caminhao_pipa',
            'caminhão pipa': 'caminhao_pipa',
            'comboio': 'caminhao_comboio',
            'caminhão comboio': 'caminhao_comboio',
            'prancha': 'veiculos_leves',
            'caminhão prancha': 'veiculos_leves',
            'apoio': 'veiculos_leves',
            'caminhão apoio': 'veiculos_leves',
            'transporte': 'onibus',
            'ônibus': 'onibus',
            'teste': 'teste'
        };
        
        const categoriaFinal = categoriaMap[categoriaLower] || categoriaLower;
        
        let patrimonio = row['Patrimônio'] || '';
        if (!patrimonio || patrimonio.toLowerCase() === 'artec' || patrimonio.toLowerCase() === 'ar locações') {
            patrimonio = row['ID'] || '';
        }
        
        const nome = row['Nome'] || '';
        const empresa = row['Empresa'] || '';
        
        return {
            id: patrimonio || row['ID'] || '',
            tipo: tipoLower,
            categoria: categoriaFinal,
            nome: nome,
            patrimonio: patrimonio,
            empresa: empresa,
            setor: row['Setor'] || '',
            obs: row['Observações'] || '',
            equipment: null,
            timestamp: row['Data Hora Registro'] || new Date().toISOString(),
            ativo: true,
            synced: true
        };
    }
    
    if (storeName === 'colaboradores') {
        return {
            id: row['Matrícula'] || row['ID'] || '',
            nome: row['Nome'] || '',
            funcao: row['Função'] || '',
            setor: row['Setor'] || '',
            empresa: row['Empresa'] || '',
            matricula: row['Matrícula'] || '',
            aso: row['Validade ASO'] || '',
            timestamp: row['Data Hora Registro'] || new Date().toISOString(),
            ativo: true,
            synced: true
        };
    }
    
    if (storeName === 'issues') {
        return {
            id: row['ID'] || '',
            timestamp: row['Data Hora Registro'] || new Date().toISOString(),
            date: row['Data'] || '',
            type: row['Tipo'] || '',
            identificacao: row['Identificação'] || '',
            description: row['Descrição'] || '',
            reporter: row['Reportado por'] || '',
            role: row['Cargo'] || '',
            status: row['Status'] || 'aberto',
            synced: true
        };
    }
    
    if (storeName === 'checklists') {
        return {
            id: row['ID'] || '',
            timestamp: row['Data Hora Registro'] || new Date().toISOString(),
            date: row['Data'] || '',
            patrimonio: row['Patrimônio'] || '',
            nome: row['Equipamento'] || '',
            empresa: row['Empresa'] || '',
            operador: row['Operador'] || '',
            observacoes: row['Observações'] || '',
            statusChecklist: row['Status'] || '',
            prazoAdequacao: row['Prazo Adequação'] || '',
            stats: {
                conformes: parseInt(row['Conformes']) || 0,
                naoConformes: parseInt(row['Não Conformes']) || 0,
                na: parseInt(row['N/A']) || 0,
                total: 0
            },
            equipment: { name: row['Equipamento'] || '', nr: row['NR'] || '' },
            items: {},
            synced: true
        };
    }
    
    return null;
}

// ============================================
// UTILITÁRIOS
// ============================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// SERVICE WORKER - OFFLINE
// ============================================

// Sincronizar dados pendentes quando voltar online
window.addEventListener('online', async () => {
    console.log('Online - sincronizando dados pendentes...');
    
    const checklists = await getAllFromIndexedDB('checklists');
    const issues = await getAllFromIndexedDB('issues');
    const cadastros = await getAllFromIndexedDB('cadastros');
    const colaboradores = await getAllFromIndexedDB('colaboradores');
    
    let total = 0;
    
    const pendentesChecklists = checklists.filter(c => !c.synced);
    pendentesChecklists.forEach(c => { syncToGoogleSheets('checklists', c); total++; });
    
    const pendentesIssues = issues.filter(i => !i.synced);
    pendentesIssues.forEach(i => { syncToGoogleSheets('issues', i); total++; });
    
    const pendentesCadastros = cadastros.filter(c => !c.synced && c.ativo !== false);
    pendentesCadastros.forEach(c => { syncToGoogleSheets('cadastros', c); total++; });
    
    const pendentesColabs = colaboradores.filter(c => !c.synced && c.ativo !== false);
    pendentesColabs.forEach(c => { syncToGoogleSheets('colaboradores', c); total++; });
    
    await processarFilaPendente();
    
    if (total > 0) {
        showToast(`Sincronizando ${total} item(ns)...`);
    }
    
    updateConnectionStatus();
});

// ============================================
// FLUXO SIMPLIFICADO DE EQUIPAMENTOS
// ============================================

let selectedCategoryTypes = {};

function selectCategoryType(category, typeId) {
    const equipment = EQUIPMENT_TYPES[category].find(e => e.id === typeId);
    if (!equipment) return;
    
    selectedCategoryTypes[category] = equipment;
    
    document.getElementById('typeSearch' + capitalize(category)).style.display = 'none';
    
    const step2 = document.getElementById('cadastroSearch' + capitalize(category));
    step2.style.display = 'block';
    
    document.getElementById('selectedType' + capitalize(category)).textContent = 
        `${equipment.icon} ${equipment.name} (${equipment.nr})`;
    
    loadCadastroSuggestions(category);
    
    document.querySelectorAll('.suggestions-list').forEach(el => el.classList.remove('show'));
}

function resetCategoryStep(category) {
    selectedCategoryTypes[category] = null;
    
    document.getElementById('cadastroSearch' + capitalize(category)).style.display = 'none';
    
    const step1 = document.getElementById('typeSearch' + capitalize(category));
    step1.style.display = 'block';
    
    document.getElementById('search' + capitalize(category)).value = '';
    document.getElementById('cadastroInput' + capitalize(category)).value = '';
}

function resetAllCategorySteps() {
    ['maquinas', 'veiculos', 'ferramentas'].forEach(cat => {
        resetCategoryStep(cat);
    });
}

async function loadCadastroSuggestions(category) {
    const equipment = selectedCategoryTypes[category];
    const cadastros = await getCadastrosByTipo(category);
    const container = document.getElementById('cadastroList' + capitalize(category));
    
    const filtrados = cadastros.filter(c => {
        if (!equipment) return true;
        if (!c.categoria) return true;
        const cat = c.categoria.toLowerCase();
        const eqId = equipment.id.toLowerCase();
        return cat === eqId || cat.includes(eqId) || eqId.includes(cat);
    });
    
    if (filtrados.length === 0) {
        container.innerHTML = '<div style="font-size: 12px; color: var(--text-light); text-align: center; padding: 12px;">Nenhum equipamento cadastrado para este tipo</div>';
        return;
    }
    
    container.innerHTML = filtrados.map(c => `
        <div class="suggestion-item" onclick="selectCadastroFromSearch('${category}', '${c.patrimonio}')" 
             style="border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;">
            <div class="item-info">
                <div class="item-name" style="font-size: 13px;">${c.patrimonio} - ${c.nome}</div>
                <div class="item-nr" style="font-size: 11px;">${c.empresa || 'Sem empresa'} ${c.setor ? '• ' + c.setor : ''}</div>
            </div>
            <span style="color: var(--text-light); font-size: 18px;">›</span>
        </div>
    `).join('');
}

async function filterCadastros(category, query) {
    const equipment = selectedCategoryTypes[category];
    const cadastros = await getCadastrosByTipo(category);
    const container = document.getElementById('cadastroList' + capitalize(category));
    
    const filtradosBase = cadastros.filter(c => {
        if (!equipment) return true;
        if (!c.categoria) return true;
        const cat = c.categoria.toLowerCase();
        const eqId = equipment.id.toLowerCase();
        return cat === eqId || cat.includes(eqId) || eqId.includes(cat);
    });
    
    if (!query.trim()) {
        loadCadastroSuggestions(category);
        return;
    }
    
    const queryLower = query.toLowerCase();
    const filtered = filtradosBase.filter(item => 
        (item.patrimonio && item.patrimonio.toLowerCase().includes(queryLower)) ||
        (item.nome && item.nome.toLowerCase().includes(queryLower)) ||
        (item.empresa && item.empresa.toLowerCase().includes(queryLower))
    );
    
    if (filtered.length === 0) {
        container.innerHTML = `<div style="font-size: 12px; color: var(--text-light); text-align: center; padding: 12px;">
            Nenhum resultado para "${query}"<br>
            <span style="font-size: 11px;">Clique em "Iniciar Checklist" para usar este patrimônio</span>
        </div>`;
        return;
    }
    
    container.innerHTML = filtered.map(c => `
        <div class="suggestion-item" onclick="selectCadastroFromSearch('${category}', '${c.patrimonio}')" 
             style="border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;">
            <div class="item-info">
                <div class="item-name" style="font-size: 13px;">${c.patrimonio} - ${c.nome}</div>
                <div class="item-nr" style="font-size: 11px;">${c.empresa || 'Sem empresa'} ${c.setor ? '• ' + c.setor : ''}</div>
            </div>
            <span style="color: var(--text-light); font-size: 18px;">›</span>
        </div>
    `).join('');
}

function selectCadastroFromSearch(category, patrimonio) {
    const equipment = selectedCategoryTypes[category];
    if (!equipment) return;
    
    startChecklist(category, equipment.id);
    
    setTimeout(async () => {
        const cadastro = await getFromIndexedDB('cadastros', patrimonio);
        if (cadastro) {
            document.getElementById('checklistPatrimonio').value = cadastro.patrimonio || '';
            document.getElementById('checklistNome').value = cadastro.nome || '';
            document.getElementById('checklistEmpresa').value = cadastro.empresa || '';
        }
    }, 100);
}

function startChecklistWithTypeInput(category) {
    const equipment = selectedCategoryTypes[category];
    if (!equipment) return;
    
    startChecklist(category, equipment.id);
}

async function startChecklistFromPending(patrimonio) {
    const cadastro = await getFromIndexedDB('cadastros', patrimonio);
    if (!cadastro) {
        showToast('Equipamento não encontrado');
        return;
    }
    
    const tipo = cadastro.tipo;
    const categoria = cadastro.categoria;
    
    if (!tipo || !EQUIPMENT_TYPES[tipo]) {
        showToast('Tipo de equipamento inválido');
        return;
    }
    
    const equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria);
    if (!equipment) {
        showToast('Categoria de equipamento não encontrada');
        return;
    }
    
    currentEquipment = equipment;
    checklistData = {};
    
    document.getElementById('checklistDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('checklistPatrimonio').value = cadastro.patrimonio || '';
    document.getElementById('checklistNome').value = cadastro.nome || equipment.name;
    document.getElementById('checklistEmpresa').value = cadastro.empresa || '';
    document.getElementById('checklistOperador').value = '';
    document.getElementById('checklistObservacoes').value = '';
    
    loadCadastroSelect(tipo);
    clearSignature();
    renderChecklistItems(equipment);
    
    setTimeout(() => {
        document.getElementById('checklistPatrimonio').value = cadastro.patrimonio || '';
    }, 50);
    
    currentStatusChecklist = null;
    document.querySelectorAll('#pageChecklistForm .status-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = 'white';
    });
    document.getElementById('prazoAdequacao').style.display = 'none';
    
    showPage('pageChecklistForm');
}

// ============================================
// QR CODE SCANNER (Camera API nativa + fallback imagem)
// ============================================

let currentQRCategory = null;
let qrStream = null;
let qrAnimFrame = null;

function openQRScanner(category) {
    currentQRCategory = category;
    const overlay = document.getElementById('qrModalOverlay');
    overlay.classList.add('show');
    
    const statusEl = document.getElementById('qr-status');
    const readerEl = document.getElementById('qr-reader');
    readerEl.innerHTML = '<video id="qr-video" style="display: none; width: 100%; border-radius: 8px;" playsinline autoplay muted></video>';
    
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    if (hasMediaDevices) {
        statusEl.textContent = 'Solicitando acesso à câmera...';
        navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'environment' } } 
        }).then(stream => {
            qrStream = stream;
            const videoEl = document.getElementById('qr-video');
            videoEl.srcObject = stream;
            videoEl.style.display = 'block';
            videoEl.play();
            statusEl.textContent = 'Aponte para o QR Code';
            startQRDecode(videoEl);
        }).catch(err => {
            showQRFallback(statusEl, readerEl);
        });
    } else {
        showQRFallback(statusEl, readerEl);
    }
}

function showQRFallback(statusEl, readerEl) {
    statusEl.innerHTML = 'Câmera não disponível.<br>Selecione uma imagem com QR Code:';
    readerEl.innerHTML = `
        <div style="text-align: center; padding: 16px;">
            <input type="file" id="qrFileInput" accept="image/*" capture="environment" 
                   onchange="scanQRFromImage(this)" 
                   style="display: none;">
            <button onclick="document.getElementById('qrFileInput').click()" 
                    style="background: var(--primary); color: white; border: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; cursor: pointer; width: 100%;">
                📷 Tirar Foto ou Escolher da Galeria
            </button>
        </div>
    `;
}

function scanQRFromImage(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    document.getElementById('qr-status').textContent = 'Analisando imagem...';
    
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                onQRScanSuccess(code.data);
                return;
            }
        }
        
        document.getElementById('qr-status').textContent = 'QR Code não encontrado na imagem. Tente outra foto.';
    };
    
    img.src = URL.createObjectURL(file);
}

function startQRDecode(videoEl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    function decode() {
        if (!qrStream || videoEl.readyState < 2) {
            qrAnimFrame = requestAnimationFrame(decode);
            return;
        }
        
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (code) {
                onQRScanSuccess(code.data);
                return;
            }
        }
        
        qrAnimFrame = requestAnimationFrame(decode);
    }
    
    qrAnimFrame = requestAnimationFrame(decode);
}

function onQRScanSuccess(decodedText) {
    stopQRScanner();
    closeQRScanner();
    
    if (currentQRCategory === 'checklist') {
        selectPatrimonioByQR(decodedText);
    } else {
        const input = document.getElementById('cadastroInput' + capitalize(currentQRCategory));
        if (input) {
            input.value = decodedText;
            filterCadastros(currentQRCategory, decodedText);
        }
        searchAndSelectCadastro(currentQRCategory, decodedText);
    }
}

async function selectPatrimonioByQR(patrimonio) {
    const select = document.getElementById('checklistPatrimonio');
    const options = Array.from(select.options);
    const match = options.find(o => o.value.toLowerCase() === patrimonio.toLowerCase());
    
    if (match) {
        select.value = match.value;
        fillFromCadastro();
        showToast('Equipamento encontrado: ' + match.textContent);
    } else {
        showToast('Equipamento "' + patrimonio + '" não encontrado nos cadastrados');
    }
}

function stopQRScanner() {
    if (qrAnimFrame) {
        cancelAnimationFrame(qrAnimFrame);
        qrAnimFrame = null;
    }
    if (qrStream) {
        qrStream.getTracks().forEach(t => t.stop());
        qrStream = null;
    }
}

function closeQRScanner() {
    stopQRScanner();
    document.getElementById('qrModalOverlay').classList.remove('show');
}

async function searchAndSelectCadastro(category, query) {
    const cadastros = await getCadastrosByTipo(category);
    const match = cadastros.find(c => 
        c.patrimonio && c.patrimonio.toLowerCase() === query.toLowerCase()
    );
    
    if (match) {
        selectCadastroFromSearch(category, match.patrimonio);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'qrModalOverlay') {
        closeQRScanner();
    }
});