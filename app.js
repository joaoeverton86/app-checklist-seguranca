// ============================================
// APP.JS - Checklist Segurança do Trabalho
// ============================================

const APP_VERSION = 'v110';

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function formatSimpleDate(dateStr) {
    if (!dateStr) return '—';
    if (dateStr.includes('T')) {
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR');
        } catch (e) {
            dateStr = dateStr.split('T')[0];
        }
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function getNCDescription(text, itemId) {
    if (!text) return 'Irregularidade';
    if (itemId === 'item_interdicao') return 'Interdição Urgente';
    
    let ncText = text.trim();
    
    // Check specific IDs
    let idLower = (itemId || '').toLowerCase();
    if (idLower.indexOf('extintor') !== -1) return 'Extintor vencido, descarregado ou irregular';
    if (idLower.indexOf('treinamento') !== -1) return 'Operador sem treinamento ou qualificação válida';
    if (idLower.indexOf('cinto') !== -1) return 'Cinto de segurança ausente ou danificado';
    if (idLower.indexOf('habilitacao') !== -1) return 'Habilitação do condutor vencida ou ausente';
    if (idLower.indexOf('doc') !== -1) return 'Documentação irregular ou vencida';
    if (idLower.indexOf('limpador') !== -1) return 'Limpador de para-brisa inoperante ou palheta danificada';
    if (idLower.indexOf('retrovisor') !== -1) return 'Retrovisores quebrados, ausentes ou irregulares';
    if (idLower.indexOf('buzina') !== -1) return 'Buzina inoperante';
    if (idLower.indexOf('luzes') !== -1) return 'Luzes inoperantes (faróis, ré, setas ou freio queimados)';
    if (idLower.indexOf('farol') !== -1 && idLower.indexOf('protetor') === -1) return 'Faróis ou lanternas inoperantes/queimados';
    if (idLower.indexOf('freio') !== -1 && idLower.indexOf('oleo') === -1) return 'Falha ou irregularidade no sistema de freios';
    if (idLower.indexOf('pneus') !== -1) return 'Pneus carecas, danificados ou com pressão inadequada';
    if (idLower.indexOf('sinal_sonoro') !== -1) return 'Sinal sonoro de ré inoperante';
    if (idLower.indexOf('vazamento') !== -1) return 'Presença de vazamento(s)';

    // Common text pattern replacements
    if (/Ausência de vazamento/i.test(ncText)) return ncText.replace(/Ausência de vazamento/i, 'Presença de vazamento');
    if (/Ausência de vazamentos/i.test(ncText)) return ncText.replace(/Ausência de vazamentos/i, 'Presença de vazamentos');
    if (/Sem vazamento/i.test(ncText)) return ncText.replace(/Sem vazamento/i, 'Presença de vazamento');
    
    if (/funcionando/i.test(ncText)) {
        return ncText.replace(/funcionando normalmente/i, 'inoperante')
                     .replace(/funcionando de forma correta/i, 'inoperante')
                     .replace(/funcionando/i, 'inoperante');
    }
    if (/em funcionamento/i.test(ncText)) return ncText.replace(/em funcionamento/i, 'inoperante');
    
    if (/em bom estado/i.test(ncText)) return ncText.replace(/em bom estado/i, 'em mau estado/danificado');
    if (/em perfeitas condições/i.test(ncText)) return ncText.replace(/em perfeitas condições/i, 'irregular/com defeito');
    if (/em ordem/i.test(ncText)) return ncText.replace(/em ordem/i, 'irregular');
    if (/aprovado/i.test(ncText)) return ncText.replace(/aprovado/i, 'reprovado/irregular');
    if (/em dia/i.test(ncText)) return ncText.replace(/em dia/i, 'vencido/irregular');
    if (/adequado/i.test(ncText)) return ncText.replace(/adequado/i, 'inadequado');
    if (/adequados/i.test(ncText)) return ncText.replace(/adequados/i, 'inadequados');
    if (/limpo e organizado/i.test(ncText)) return ncText.replace(/limpo e organizado/i, 'sujo/desorganizado');
    if (/visível/i.test(ncText)) return ncText.replace(/visível/i, 'ausente ou ilegível');
    if (/desobstruídas/i.test(ncText)) return ncText.replace(/desobstruídas/i, 'obstruídas');

    if (/Condição de/i.test(ncText)) return ncText.replace(/Condição de/i, 'Irregularidade na condição de');
    if (/Condição dos/i.test(ncText)) return ncText.replace(/Condição dos/i, 'Irregularidade na condição dos');
    if (/Condições do/i.test(ncText)) return ncText.replace(/Condições do/i, 'Irregularidade nas condições do');
    if (/Condições dos/i.test(ncText)) return ncText.replace(/Condições dos/i, 'Irregularidade nas condições dos');

    return 'Irregularidade: ' + ncText;
}

function toggleIssueDetails(element) {
    const details = element.querySelector('.issue-details');
    const chevron = element.querySelector('.chevron-icon');
    if (!details || !chevron) return;
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
    } else {
        details.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
    }
}

function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr !== 'string') {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    const str = dateStr.trim();
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d;
    }

    // Formato BR: DD/MM/YYYY ou DD/MM/YYYY HH:mm
    if (str.includes('/')) {
        const parts = str.split(' ')[0].split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d;
        }
    }

    // Formato ISO: YYYY-MM-DD
    if (str.includes('-')) {
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d;
        }
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
}

function normalizarStatusChecklist(val, checklist) {
    let str = String(val || '').toLowerCase().trim();

    if (str.includes('reinspecionad') || str.includes('resolvido')) {
        return 'reinspecionado';
    }
    if (str.includes('interditad') || str.includes('interdicao') || str.includes('interdição')) {
        return 'interditado';
    }
    if (str.includes('restri') || str.includes('restrica')) {
        return 'liberado_restricao';
    }
    if (str.includes('liberad') || str.includes('conforme') || str.includes('ok')) {
        return 'liberado';
    }

    if (checklist) {
        const stats = recalcularStatsChecklist(checklist);
        if (stats.naoConformes > 0) {
            if (checklist.items) {
                const hasHighRiskNC = Object.entries(checklist.items).some(([k, v]) => {
                    if (k === '_form' || !v || v.status !== 'NC') return false;
                    const eqItem = checklist.equipment?.items?.find(i => i.id === k);
                    return eqItem?.risk === 'high' || k.includes('interdicao') || k.includes('freio') || k.includes('cinto');
                });
                if (hasHighRiskNC) return 'interditado';
            }
            return 'liberado_restricao';
        }
        return 'liberado';
    }

    return 'liberado';
}

let currentPage = 'pageHome';
let currentChecklist = null;
let currentEquipment = null;
let currentCadastro = null;
let checklistData = {};
let signaturePad = null;
let itensComFalhaAnterior = [];
let currentReinspectionOriginalId = null;

function clearReinspectionState() {
    itensComFalhaAnterior = [];
    currentReinspectionOriginalId = null;
    const banner = document.getElementById('reinspectionBanner');
    if (banner) banner.style.display = 'none';
}

async function initDynamicEquipmentTypes() {
    try {
        const dbItems = await getAllFromIndexedDB('checklist_items');
        if (dbItems && dbItems.length > 0) {
            const dynamicTypes = {
                maquinas: [],
                veiculos: []
            };
            const eqpMap = {};
            
            // Sort by order
            dbItems.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
            
            dbItems.forEach(item => {
                if (item.ativo === false || item.ativo === 'Não') return;
                
                const cat = item.categoriaEquipamento || 'maquinas';
                const eqpId = item.idEquipamento;
                const eqpName = item.nomeEquipamento;
                const eqpIcon = item.iconeEquipamento || '📦';
                
                if (!eqpMap[eqpId]) {
                    eqpMap[eqpId] = {
                        id: eqpId,
                        name: eqpName,
                        icon: eqpIcon,
                        nr: item.nr || 'NR-12',
                        items: []
                    };
                    if (dynamicTypes[cat]) {
                        dynamicTypes[cat].push(eqpMap[eqpId]);
                    } else {
                        dynamicTypes.maquinas.push(eqpMap[eqpId]);
                    }
                }
                
                eqpMap[eqpId].items.push({
                    id: item.id,
                    text: item.textoItem,
                    nr: item.nr || '',
                    risk: item.risco || 'medium',
                    section: item.secao || undefined
                });
            });
            
            // Mutate global EQUIPMENT_TYPES object
            for (const key in EQUIPMENT_TYPES) {
                delete EQUIPMENT_TYPES[key];
            }
            Object.assign(EQUIPMENT_TYPES, dynamicTypes);
            
            // Rebuild ITEM_NAMES mapping dynamically
            const dynamicItemNames = {};
            dbItems.forEach(item => {
                dynamicItemNames[item.id] = item.textoItem;
            });
            Object.assign(ITEM_NAMES, dynamicItemNames);
        }
    } catch (e) {
        console.error('Erro ao inicializar itens dinâmicos do checklist:', e);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
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
    
    await initApp();
    initSignaturePad();
    initConnectionStatus();
    initDateDefaults();
    initCadastroSelects();
    loadRecentChecklists();
    renderDeadlineAlerts();
    loadTopRisks();
    renderEquipmentGrids();
    iniciarSyncPeriodica();
    
    cleanDuplicateCadastros();
    updatePendingBadge();


    if (navigator.onLine) {
        if (isSupabaseConfigured()) {
            setTimeout(function() {
                sincronizarComSupabase().then(() => {
                    renderEquipmentGrids();
                    if (currentPage === 'pageCadastro') switchGestaoTab(gestaoTab);
                });
            }, 500);
        }

    }
    const sessionStr = localStorage.getItem('active_session');
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            updateNavigationForRole(session.role);
            updateWelcomeBanner();
            showPage('pageHome');
            verificarEAtualizarPapelSessao();
        } catch (e) {
            localStorage.removeItem('active_session');
            showPage('pageLogin');
        }
    } else {
        showPage('pageLogin');
    }
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                reg.update();
                console.log('SW registrado e updated');
            })
            .catch(err => console.log('SW erro:', err));
            
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload(true);
            }
        });
    }
});

async function initApp() {
    console.log('App Checklist Segurança inicializado - ' + APP_VERSION);
    const verEl = document.getElementById('loginVersion');
    if (verEl) verEl.textContent = 'Versão ' + APP_VERSION;
    await initDynamicEquipmentTypes();
    await limparChecklistsDeJunhoLocais();
}

async function limparChecklistsDeJunhoLocais() {
    try {
        const checklists = await getAllFromIndexedDB('checklists');
        for (const c of checklists) {
            if (c.date && String(c.date).startsWith('2026-06')) {
                await deleteFromIndexedDB('checklists', c.id);
                const numId = Number(c.id);
                if (!isNaN(numId)) {
                    await deleteFromIndexedDB('checklists', numId);
                }
                console.log('⚡ [Auto-Clean] Checklist de teste de junho excluído localmente:', c.id);
            }
        }
    } catch (e) {
        console.error('Erro no auto-clean de junho:', e);
    }
}

async function cleanDuplicateCadastros() {
    try {
        // 1. Limpar duplicados em cadastros
        const cadastros = await getAllFromIndexedDB('cadastros');
        const cadastrosByPatrimonio = {};
        for (const item of cadastros) {
            const normalizedId = String(item.id || item.patrimonio || '').trim().toUpperCase();
            if (!normalizedId) continue;
            if (!cadastrosByPatrimonio[normalizedId]) {
                cadastrosByPatrimonio[normalizedId] = [];
            }
            cadastrosByPatrimonio[normalizedId].push(item);
        }
        for (const [patrimonio, list] of Object.entries(cadastrosByPatrimonio)) {
            if (list.length > 1) {
                let best = list[0];
                for (let i = 1; i < list.length; i++) {
                    const current = list[i];
                    const bestTs = best.timestamp ? new Date(best.timestamp).getTime() : 0;
                    const currTs = current.timestamp ? new Date(current.timestamp).getTime() : 0;
                    if (currTs > bestTs) {
                        best = current;
                    }
                }
                for (const item of list) {
                    if (item.id !== best.id) {
                        await deleteFromIndexedDB('cadastros', item.id);
                    }
                }
                if (best.id !== patrimonio || best.patrimonio !== patrimonio) {
                    await deleteFromIndexedDB('cadastros', best.id);
                    best.id = patrimonio;
                    best.patrimonio = patrimonio;
                    await saveToIndexedDB('cadastros', best, true);
                }
            } else {
                const item = list[0];
                if (item.id !== patrimonio || item.patrimonio !== patrimonio) {
                    await deleteFromIndexedDB('cadastros', item.id);
                    item.id = patrimonio;
                    item.patrimonio = patrimonio;
                    await saveToIndexedDB('cadastros', item, true);
                }
            }
        }

        // 2. Limpar duplicados em colaboradores
        const colaboradores = await getAllFromIndexedDB('colaboradores');
        const colabsByMatricula = {};
        for (const item of colaboradores) {
            const normalizedId = String(item.id || item.matricula || '').trim().toUpperCase();
            if (!normalizedId) continue;
            if (!colabsByMatricula[normalizedId]) {
                colabsByMatricula[normalizedId] = [];
            }
            colabsByMatricula[normalizedId].push(item);
        }
        for (const [matricula, list] of Object.entries(colabsByMatricula)) {
            if (list.length > 1) {
                let best = list[0];
                for (let i = 1; i < list.length; i++) {
                    const current = list[i];
                    const bestHasSenha = !!best.senha;
                    const currHasSenha = !!current.senha;
                    if (currHasSenha && !bestHasSenha) {
                        best = current;
                    } else if (currHasSenha === bestHasSenha) {
                        const bestTs = best.timestamp ? new Date(best.timestamp).getTime() : 0;
                        const currTs = current.timestamp ? new Date(current.timestamp).getTime() : 0;
                        if (currTs > bestTs) {
                            best = current;
                        }
                    }
                }
                for (const item of list) {
                    if (item.id !== best.id) {
                        await deleteFromIndexedDB('colaboradores', item.id);
                    }
                }
                if (best.id !== matricula || best.matricula !== matricula) {
                    await deleteFromIndexedDB('colaboradores', best.id);
                    best.id = matricula;
                    best.matricula = matricula;
                    await saveToIndexedDB('colaboradores', best, true);
                }
                console.log('Duplicados de colaboradores limpos para matrícula:', matricula, 'Senha mantida:', !!best.senha);
            } else {
                const item = list[0];
                if (item.id !== matricula || item.matricula !== matricula) {
                    await deleteFromIndexedDB('colaboradores', item.id);
                    item.id = matricula;
                    item.matricula = matricula;
                    await saveToIndexedDB('colaboradores', item, true);
                }
            }
        }
    } catch (e) {
        console.error('Erro ao limpar duplicados:', e);
    }
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
    if (navigator.onLine) {
        if (status) status.className = 'connection-status online';
        if (isSupabaseConfigured()) {
            sincronizarComSupabase();
        }
    } else {
        if (status) status.className = 'connection-status offline';
        updatePendingBadge();
    }
}

async function updatePendingBadge() {
    const status = getSyncStatus();
    const count = status.pendentes;
    
    const text = document.getElementById('connectionText');
    if (text) {
        if (navigator.onLine) {
            if (count > 0) {
                text.textContent = `● Online - Sincronizando (${count} pendente(s))...`;
                text.style.color = 'var(--warning)';
            } else {
                text.textContent = '● Sincronizado';
                text.style.color = 'var(--success)';
            }
        } else {
            text.textContent = `● Offline (${count} pendente(s) localmente)`;
            text.style.color = 'var(--danger)';
        }
    }
    
    const navConfig = document.getElementById('navConfig');
    if (navConfig) {
        navConfig.style.position = 'relative';
        let badge = navConfig.querySelector('.nav-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                badge.style.position = 'absolute';
                badge.style.top = '2px';
                badge.style.right = '12px';
                badge.style.background = 'var(--danger)';
                badge.style.color = 'white';
                badge.style.fontSize = '9px';
                badge.style.fontWeight = 'bold';
                badge.style.borderRadius = '50%';
                badge.style.width = '14px';
                badge.style.height = '14px';
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
                navConfig.appendChild(badge);
            }
            badge.textContent = count;
            badge.style.display = 'flex';
        } else if (badge) {
            badge.style.display = 'none';
        }
    }
}

// ============================================
// NAVEGAÇÃO
// ============================================

function showPage(pageId) {
    // Router guard
    const sessionStr = localStorage.getItem('active_session');
    const publicPages = ['pageLogin', 'pageSignUp', 'pageForgotPassword'];
    if (!sessionStr && !publicPages.includes(pageId)) {
        showPage('pageLogin');
        return;
    }
    
    // Role-based authorization guard
    if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.role === 'Tecnico') {
            const forbiddenPages = ['pageCadastro', 'pageGerenciarItens', 'pageNovoEquipamento', 'pageNovoColaborador'];
            if (forbiddenPages.includes(pageId)) {
                showToast('🚫 Acesso restrito a administradores.');
                showPage('pageHome');
                return;
            }
        }
    }

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
        'pageHistory': 'navHome',
        'pageChecklistDetail': 'navHome',
        'pageConfig': 'navConfig',
        'pageNovoEquipamento': 'navConfig',
        'pageNovoColaborador': 'navConfig',
        'pageGerenciarItens': 'navConfig',
        'pageInterdicao': 'navHome',
        'pageLogin': 'navHome'
    };
    if (navMap[pageId] && document.getElementById(navMap[pageId])) {
        document.getElementById(navMap[pageId]).classList.add('active');
    }
    
    // Ocultar/exibir header, nav inferior e status de conexão se for login
    const header = document.querySelector('.header');
    const bottomNav = document.querySelector('.bottom-nav');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (pageId === 'pageLogin' || pageId === 'pageSignUp' || pageId === 'pageForgotPassword') {
        document.body.classList.remove('has-bottom-nav');
        if (header) header.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        if (connectionStatus) connectionStatus.style.display = 'none';
    } else {
        document.body.classList.add('has-bottom-nav');
        if (header) header.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = 'flex';
        if (connectionStatus) connectionStatus.style.display = 'flex';
        // Assegurar que o botão de logout esteja visível
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            updateNavigationForRole(session.role);
        }
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
        'pageConfig': ['Configurações', 'Cadastros e sincronização'],
        'pageNovoEquipamento': ['Novo Equipamento', 'Cadastrar equipamento/veículo'],
        'pageNovoColaborador': ['Novo Colaborador', 'Cadastrar colaborador'],
        'pageGerenciarItens': ['Gerenciar Itens', 'Itens de verificação'],
        'pageInterdicao': ['Interdição Rápida', 'Bloqueio imediato de equipamento']
    };
    
    if (titles[pageId]) {
        headerTitle.textContent = titles[pageId][0];
        headerSubtitle.textContent = titles[pageId][1];
    }
    
    backBtn.style.display = pageId !== 'pageHome' ? 'block' : 'none';
    
    if (pageId === 'pageNewChecklist') {
        resetAllCategorySteps();
    }

    if (pageId === 'pageChecklistForm') {
        setTimeout(() => initSignaturePad(), 50);
    }
    
    currentPage = pageId;
    
    // Carregar dados da página
    if (pageId === 'pageHome') {
        loadRecentChecklists();
        renderDeadlineAlerts();
        loadTopRisks();
    } else if (pageId === 'pageCadastro') {
        if (isSupabaseConfigured() && navigator.onLine) {
            sincronizarComSupabase().then(() => switchGestaoTab(gestaoTab));
        } else {
            switchGestaoTab(gestaoTab);
        }
    } else if (pageId === 'pageNewChecklist') {
        if (isSupabaseConfigured() && navigator.onLine) {
            sincronizarComSupabase().then(() => renderEquipmentGrids());
        }
    } else if (pageId === 'pageReports') {
        loadReports();
    } else if (pageId === 'pageHistory') {
        loadHistory();
    } else if (pageId === 'pageConfig') {
        loadConfigPage();
    } else if (pageId === 'pageGerenciarItens') {
        loadItemGerenciaSelect();
    } else if (pageId === 'pageInterdicao') {
        loadInterdicaoEquipments();
        setTimeout(() => initInterdicaoSignatures(), 50);
    }
}

function goToConfigSection(secao) {
    const secaoMap = {
        'equipamento': 'pageNovoEquipamento',
        'colaborador': 'pageNovoColaborador',
        'itens': 'pageGerenciarItens'
    };
    const paginaAlvo = secaoMap[secao];
    if (paginaAlvo) {
        showPage(paginaAlvo);
        if (secao === 'itens') loadItemGerenciaSelect();
    }
}

function goBack() {
    if (currentPage === 'pageChecklistForm') {
        showExitConfirmModal();
    } else if (currentPage === 'pageChecklistDetail') {
        showPage('pageHistory');
    } else if (currentPage === 'pageNovoEquipamento' || currentPage === 'pageNovoColaborador' || currentPage === 'pageGerenciarItens') {
        showPage('pageCadastro');
    } else {
        showPage('pageHome');
    }
}

function showExitConfirmModal() {
    const html = `
        <div style="text-align: center; padding: 10px 0;">
            <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--text);">Deseja salvar o checklist antes de sair?</h3>
            <p style="font-size: 12px; color: var(--text-light); margin-bottom: 20px;">Escolha se prefere salvar suas alterações ou descartar o rascunho atual.</p>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button class="save-btn" style="background: var(--success); margin: 0; padding: 12px;" onclick="closeModal(); saveChecklist();">
                    💾 Sim, salvar e sair
                </button>
                <button class="save-btn" style="background: var(--danger); margin: 0; padding: 12px;" onclick="closeModal(); showPage('pageNewChecklist');">
                    🗑️ Sair sem salvar
                </button>
                <button class="save-btn" style="background: #f1f5f9; color: var(--text); margin: 0; padding: 12px; border: 1px solid var(--border);" onclick="closeModal();">
                    ❌ Cancelar (permanecer)
                </button>
            </div>
        </div>
    `;
    showModal(html);
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
                        <div class="item-name">${item.name}</div>
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
        const select = document.getElementById('checklistPatrimonio');
        if (select) {
            select.value = patrimonio || '';
            await fillFromCadastro();
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
    const placa = document.getElementById('cadastroPlaca')?.value.trim() || '';
    const empresa = document.getElementById('cadastroEmpresa').value.trim();
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
        existing.placa = placa;
        existing.setor = '';
        existing.obs = obs;
        existing.equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria) || null;
        await saveToIndexedDB('cadastros', existing);
        showToast('Equipamento reativado!');
        
        document.getElementById('cadastroTipo').value = '';
        document.getElementById('cadastroCategoria').innerHTML = '<option value="">Selecione o tipo primeiro...</option>';
        document.getElementById('cadastroNome').value = '';
        document.getElementById('cadastroPatrimonio').value = '';
        if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = '';
        document.getElementById('cadastroEmpresa').value = '';
        document.getElementById('cadastroObs').value = '';
        
        setTimeout(() => showPage('pageCadastro'), 800);
        return;
    }
    
    const equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria);
    
    const cadastro = {
        id: patrimonioNorm,
        tipo,
        categoria,
        nome,
        patrimonio: patrimonioNorm,
        placa,
        empresa,
        setor: '',
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
    if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = '';
    document.getElementById('cadastroEmpresa').value = '';
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
    const email = document.getElementById('colabEmail').value.trim().toLowerCase();
    const aso = document.getElementById('colabASO').value;
    const nivelAcesso = document.getElementById('colabNivelAcesso').value || 'Tecnico';
    
    const matriculaNorm = matricula ? matricula.trim().toUpperCase() : '';
    
    if (!nome || !funcao || !matriculaNorm || !email) {
        showToast('Preencha todos os campos obrigatórios (Nome, Função, Matrícula e E-mail)');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showToast('❌ Insira um e-mail válido!');
        return;
    }
    
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
            existing.email = email;
            existing.aso = aso;
            existing.senha = ''; // Senha zerada até o usuário criar
            existing.nivelAcesso = nivelAcesso;
            await saveToIndexedDB('colaboradores', existing);
            showToast('Colaborador reativado!');

            if (normalizarNivelAcesso(nivelAcesso) === 'Admin') {
                const rpcRes = await alterarNivelAcessoOnlineSupabase(existing.id, nivelAcesso);
                if (!rpcRes.success) {
                    showToast('⚠️ Nível de acesso salvo localmente, mas não foi possível sincronizar com o servidor: ' + (rpcRes.error || 'sem conexão'));
                }
            }

            document.getElementById('colabNome').value = '';
            document.getElementById('colabFuncao').value = '';
            document.getElementById('colabSetor').value = '';
            document.getElementById('colabEmpresa').value = '';
            document.getElementById('colabMatricula').value = '';
            document.getElementById('colabEmail').value = '';
            document.getElementById('colabASO').value = '';
            document.getElementById('colabNivelAcesso').value = 'Tecnico';
            
            setTimeout(() => showPage('pageCadastro'), 800);
            return;
        }
    }
    
    const colaborador = {
        id: matriculaNorm || Date.now().toString(),
        nome,
        funcao,
        setor,
        empresa,
        matricula: matriculaNorm,
        email,
        aso,
        senha: '', // Em branco até o usuário se cadastrar
        nivelAcesso: nivelAcesso,
        timestamp: new Date().toISOString(),
        ativo: true,
        synced: false
    };
    
    try {
        await saveToIndexedDB('colaboradores', colaborador);
        showToast('Colaborador cadastrado!');
    } catch (err) {
        console.error('Erro ao cadastrar colaborador no IndexedDB:', err);
        showToast('❌ Erro ao salvar localmente: ' + err.message);
        return;
    }

    if (normalizarNivelAcesso(nivelAcesso) === 'Admin') {
        // Garante que a linha já existe no Supabase antes de tentar promover via RPC
        if (navigator.onLine && isSupabaseConfigured()) {
            await sincronizarItemIndividualSupabase('colaboradores', colaborador);
        }
        const rpcRes = await alterarNivelAcessoOnlineSupabase(colaborador.id, nivelAcesso);
        if (!rpcRes.success) {
            showToast('⚠️ Nível de acesso salvo localmente, mas não foi possível sincronizar com o servidor: ' + (rpcRes.error || 'sem conexão'));
        }
    }

    document.getElementById('colabNome').value = '';
    document.getElementById('colabFuncao').value = '';
    document.getElementById('colabSetor').value = '';
    document.getElementById('colabEmpresa').value = '';
    document.getElementById('colabMatricula').value = '';
    document.getElementById('colabEmail').value = '';
    document.getElementById('colabASO').value = '';
    document.getElementById('colabNivelAcesso').value = 'Tecnico';
    
    setTimeout(() => showPage('pageCadastro'), 800);
}

let gestaoTab = 'equipamentos';

function switchGestaoTab(tab) {
    if (tab === 'itens') {
        showPage('pageGerenciarItens');
        return;
    }
    
    gestaoTab = tab;
    
    document.getElementById('tabEquipamentos').className = tab === 'equipamentos' ? 'status-btn c selected' : 'status-btn na';
    document.getElementById('tabColaboradores').className = tab === 'colaboradores' ? 'status-btn nc selected' : 'status-btn na';
    
    const tabItens = document.getElementById('tabItens');
    if (tabItens) {
        tabItens.className = 'status-btn na';
    }
    
    const btnNovo = document.getElementById('btnNovoCadastro');
    if (btnNovo) {
        if (tab === 'equipamentos') {
            btnNovo.textContent = '+ Novo Equipamento';
        } else if (tab === 'colaboradores') {
            btnNovo.textContent = '+ Novo Colaborador';
        }
    }
    
    document.getElementById('gestaoSearch').value = '';
    loadGestao();
}

function openNovoCadastro() {
    if (gestaoTab === 'equipamentos') {
        // Clear equipment form fields
        document.getElementById('cadastroTipo').value = '';
        document.getElementById('cadastroCategoria').innerHTML = '<option value="">Selecione o tipo primeiro...</option>';
        document.getElementById('cadastroNome').value = '';
        document.getElementById('cadastroPatrimonio').value = '';
        document.getElementById('cadastroEmpresa').value = '';
        if (document.getElementById('cadastroSetor')) document.getElementById('cadastroSetor').value = '';
        document.getElementById('cadastroObs').value = '';
        
        // Reset Save Button to default
        const btn = document.querySelector('#pageNovoEquipamento .save-btn');
        if (btn) {
            btn.textContent = 'Cadastrar Equipamento';
            btn.setAttribute('onclick', 'saveCadastro()');
        }
        
        showPage('pageNovoEquipamento');
    } else {
        // Clear collaborator form fields
        document.getElementById('colabNome').value = '';
        document.getElementById('colabFuncao').value = '';
        document.getElementById('colabSetor').value = '';
        document.getElementById('colabEmpresa').value = '';
        document.getElementById('colabMatricula').value = '';
        document.getElementById('colabASO').value = '';
        
        // Reset Save Button to default
        const btn = document.getElementById('btnSaveColaborador');
        if (btn) {
            btn.textContent = 'Cadastrar Colaborador';
            btn.setAttribute('onclick', 'saveColaborador()');
        }
        
        showPage('pageNovoColaborador');
    }
}

async function loadGestao(search = '') {
    const container = document.getElementById('gestaoList');
    const countEl = document.getElementById('gestaoCount');
    const query = search.toLowerCase().trim();

    if (gestaoTab === 'equipamentos') {
        const cadastros = await getAllFromIndexedDB('cadastros');
        let items = [...cadastros];
        items.sort((a, b) => {
            const aAtivo = a.ativo !== false;
            const bAtivo = b.ativo !== false;
            if (aAtivo === bAtivo) return 0;
            return aAtivo ? -1 : 1;
        });

        if (query) {
            items = items.filter(c =>
                (c.patrimonio && c.patrimonio.toLowerCase().includes(query)) ||
                (c.nome && c.nome.toLowerCase().includes(query)) ||
                (c.empresa && c.empresa.toLowerCase().includes(query)) ||
                (c.placa && c.placa.toLowerCase().includes(query))
            );
        }

        countEl.textContent = `${items.length} equipamento(s)`;

        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">🚜</div><div class="text">${query ? 'Nenhum resultado para "' + query + '"' : 'Nenhum equipamento cadastrado'}</div></div>`;
            return;
        }

        container.innerHTML = items.map(c => {
            const isAtivo = c.ativo !== false;
            const statusBadge = isAtivo ?
                (c.ultimoChecklist ?
                    `<span style="font-size: 10px; padding: 2px 6px; border-radius: 8px; background: #d5f5e3; color: #1e8449; font-weight: 600;">🟢 Mobilizado (Verificado)</span>` :
                    `<span style="font-size: 10px; padding: 2px 6px; border-radius: 8px; background: #fadbd8; color: #c0392b; font-weight: 600;">🟢 Mobilizado (Pendente)</span>`) :
                `<span style="font-size: 10px; padding: 2px 6px; border-radius: 8px; background: #f2f3f4; color: #7f8c8d; font-weight: 600;">🔴 Desmobilizado</span>`;
                
            const opacityStyle = isAtivo ? '' : 'opacity: 0.65; background: #f8f9f9;';
                
            return `
                <div class="history-item" style="flex-wrap: wrap; ${opacityStyle}">
                    <div class="history-info">
                        <div class="history-title">${escapeHTML(c.patrimonio)}${c.placa ? ' [' + escapeHTML(c.placa) + ']' : ''}</div>
                        <div class="history-date">${escapeHTML(c.nome || '')}</div>
                        <div class="history-date">${escapeHTML(c.empresa || '')}</div>
                        <div style="margin-top: 4px;">${statusBadge}</div>
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button onclick="editCadastro('${c.id}')" title="Editar" style="background: var(--primary); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">✏️</button>
                        <button onclick="deleteCadastroPermanente('${c.id}')" title="Excluir Definitivamente" style="background: var(--danger); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    } else {
        const colaboradores = await getAllFromIndexedDB('colaboradores');
        let items = [...colaboradores];
        items.sort((a, b) => {
            const aAtivo = a.ativo !== false;
            const bAtivo = b.ativo !== false;
            if (aAtivo === bAtivo) return 0;
            return aAtivo ? -1 : 1;
        });

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
            const isAtivo = c.ativo !== false;
            const icon = funcaoIcon(c.funcao);
            const statusBadge = isAtivo ?
                `<span style="font-size: 10px; padding: 2px 6px; border-radius: 8px; background: #d5f5e3; color: #1e8449; font-weight: 600;">🟢 Ativo</span>` :
                `<span style="font-size: 10px; padding: 2px 6px; border-radius: 8px; background: #f2f3f4; color: #7f8c8d; font-weight: 600;">🔴 Inativo</span>`;
            const opacityStyle = isAtivo ? '' : 'opacity: 0.65; background: #f8f9f9;';

            return `
                <div class="history-item" style="flex-wrap: wrap; ${opacityStyle}">
                    <div class="history-info">
                        <div class="history-title">${icon} ${escapeHTML(c.nome)}</div>
                        <div class="history-date" style="font-weight: 550; color: var(--primary);">${escapeHTML(c.funcao || '')}</div>
                        <div class="history-date">Matrícula: ${escapeHTML(c.matricula || 'N/A')} • Nível: ${escapeHTML(c.nivelAcesso || 'Tecnico')}</div>
                        <div style="margin-top: 4px;">${statusBadge}</div>
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button onclick="editColaborador('${c.id}')" title="Editar" style="background: var(--primary); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">✏️</button>
                        <button onclick="deleteColaboradorPermanente('${c.id}')" title="Excluir Definitivamente" style="background: var(--danger); color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; cursor: pointer;">🗑️</button>
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

    showPage('pageNovoEquipamento');

    setTimeout(() => {
        document.getElementById('cadastroTipo').value = cadastro.tipo || '';
        updateCategoriaOptions(cadastro.tipo);
        setTimeout(() => {
            document.getElementById('cadastroCategoria').value = cadastro.categoria || '';
        }, 50);
        document.getElementById('cadastroNome').value = cadastro.nome || '';
        document.getElementById('cadastroPatrimonio').value = cadastro.patrimonio || '';
        if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = cadastro.placa || '';
        document.getElementById('cadastroEmpresa').value = cadastro.empresa || '';
        document.getElementById('cadastroObs').value = cadastro.obs || '';

        const statusGroup = document.getElementById('groupCadastroStatus');
        if (statusGroup) statusGroup.style.display = 'block';
        const statusSelect = document.getElementById('cadastroStatus');
        if (statusSelect) {
            statusSelect.value = cadastro.ativo !== false ? 'ativo' : 'inativo';
        }

        const btn = document.querySelector('#pageNovoEquipamento .save-btn');
        if (btn) {
            btn.textContent = 'Atualizar Equipamento';
            btn.setAttribute('onclick', `saveCadastroEdit('${id}')`);
        }
    }, 100);
}

async function saveCadastroEdit(id) {
    const oldCadastro = await getFromIndexedDB('cadastros', id);
    if (!oldCadastro) return;

    const newPatrimonio = document.getElementById('cadastroPatrimonio').value.trim().toUpperCase();
    if (!newPatrimonio) {
        showToast('Preencha o patrimônio');
        return;
    }

    if (newPatrimonio !== id.toUpperCase()) {
        const existing = await getFromIndexedDB('cadastros', newPatrimonio);
        if (existing && existing.ativo !== false) {
            showToast('⚠️ Já existe um equipamento com patrimônio "' + newPatrimonio + '"');
            return;
        }
        await deleteFromIndexedDB('cadastros', id);
        if (isSupabaseConfigured()) {
            await supabaseFetch('cadastros', { method: 'DELETE', query: '?id=eq.' + encodeURIComponent(id) });
        }
    }

    const statusVal = document.getElementById('cadastroStatus') ? document.getElementById('cadastroStatus').value : 'ativo';
    const isAtivo = statusVal === 'ativo';

    const cadastro = {
        ...oldCadastro,
        id: newPatrimonio,
        patrimonio: newPatrimonio,
        tipo: document.getElementById('cadastroTipo')?.value || oldCadastro.tipo || '',
        categoria: document.getElementById('cadastroCategoria')?.value || oldCadastro.categoria || '',
        nome: document.getElementById('cadastroNome').value.trim(),
        placa: document.getElementById('cadastroPlaca')?.value.trim() || '',
        empresa: document.getElementById('cadastroEmpresa').value.trim(),
        setor: '',
        obs: document.getElementById('cadastroObs').value.trim(),
        ativo: isAtivo,
        synced: false
    };

    await saveToIndexedDB('cadastros', cadastro);

    // Se o nome ou o patrimônio mudou, atualizar os checklists históricos correspondentes
    const oldNome = oldCadastro.nome;
    const oldPatr = oldCadastro.patrimonio;
    const newNome = cadastro.nome;
    const newPatr = cadastro.patrimonio;

    if (oldNome !== newNome || oldPatr !== newPatr) {
        try {
            const checklists = await getAllFromIndexedDB('checklists');
            for (const c of checklists) {
                const matchPatr = (c.patrimonio && (c.patrimonio.toUpperCase() === oldPatr.toUpperCase() || c.patrimonio.toUpperCase() === newPatr.toUpperCase()));
                const matchPlaca = (c.patrimonio && (
                    (oldCadastro.placa && c.patrimonio.toUpperCase() === oldCadastro.placa.toUpperCase()) ||
                    (cadastro.placa && c.patrimonio.toUpperCase() === cadastro.placa.toUpperCase()) ||
                    (oldCadastro.setor && c.patrimonio.toUpperCase() === oldCadastro.setor.toUpperCase())
                ));

                if (matchPatr || matchPlaca) {
                    let changed = false;
                    if (c.nome !== newNome) {
                        c.nome = newNome;
                        changed = true;
                    }
                    if (c.patrimonio !== newPatr) {
                        c.patrimonio = newPatr;
                        changed = true;
                    }
                    if (c.equipment && c.equipment.name !== newNome) {
                        c.equipment.name = newNome;
                        changed = true;
                    }

                    if (changed) {
                        c.synced = false;
                        await saveToIndexedDB('checklists', c);
                        if (isSupabaseConfigured()) {
                            sincronizarItemIndividualSupabase('checklists', c);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Erro ao atualizar checklists vinculados:', e);
        }
    }

    if (isSupabaseConfigured()) {
        await sincronizarItemIndividualSupabase('cadastros', cadastro);
    }

    showToast(isAtivo ? 'Equipamento atualizado com sucesso!' : 'Equipamento desmobilizado!');

    const btn = document.querySelector('#pageNovoEquipamento .save-btn');
    if (btn) {
        btn.textContent = 'Cadastrar Equipamento';
        btn.setAttribute('onclick', 'saveCadastro()');
    }

    const statusGroup = document.getElementById('groupCadastroStatus');
    if (statusGroup) statusGroup.style.display = 'none';
    const statusSelect = document.getElementById('cadastroStatus');
    if (statusSelect) statusSelect.value = 'ativo';

    document.getElementById('cadastroTipo').value = '';
    document.getElementById('cadastroCategoria').innerHTML = '<option value="">Selecione o tipo primeiro...</option>';
    document.getElementById('cadastroNome').value = '';
    document.getElementById('cadastroPatrimonio').value = '';
    if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = '';
    document.getElementById('cadastroEmpresa').value = '';
    document.getElementById('cadastroObs').value = '';

    showPage('pageCadastro');
}

async function editColaborador(id) {
    const colab = await getFromIndexedDB('colaboradores', id);
    if (!colab) return;

    showPage('pageNovoColaborador');

    setTimeout(() => {
        document.getElementById('colabNome').value = colab.nome || '';
        document.getElementById('colabFuncao').value = colab.funcao || '';
        document.getElementById('colabSetor').value = colab.setor || '';
        document.getElementById('colabEmpresa').value = colab.empresa || '';
        document.getElementById('colabMatricula').value = colab.matricula || '';
        document.getElementById('colabEmail').value = colab.email || '';
        document.getElementById('colabASO').value = colab.aso || '';
        document.getElementById('colabNivelAcesso').value = colab.nivelAcesso || 'Tecnico';

        const btn = document.getElementById('btnSaveColaborador');
        if (btn) {
            btn.textContent = 'Atualizar Colaborador';
            btn.setAttribute('onclick', `saveColaboradorEdit('${id}')`);
        }
    }, 100);
}

async function saveColaboradorEdit(id) {
    const oldColab = await getFromIndexedDB('colaboradores', id);
    if (!oldColab) return;

    const newMatricula = document.getElementById('colabMatricula').value.trim().toUpperCase();
    const newEmail = document.getElementById('colabEmail').value.trim().toLowerCase();
    
    if (!newMatricula || !newEmail) {
        showToast('Preencha a matrícula e o e-mail');
        return;
    }

    if (!newEmail.includes('@') || !newEmail.includes('.')) {
        showToast('❌ Insira um e-mail válido!');
        return;
    }

    const idNorm = id.toUpperCase();
    if (newMatricula !== idNorm) {
        const existing = await getFromIndexedDB('colaboradores', newMatricula);
        if (existing && existing.ativo !== false) {
            showToast('⚠️ Já existe um colaborador com matrícula "' + newMatricula + '"');
            return;
        }
        await deleteFromIndexedDB('colaboradores', id);
    }

    const newNivelAcesso = document.getElementById('colabNivelAcesso').value || 'Tecnico';

    const colab = {
        ...oldColab,
        id: newMatricula,
        matricula: newMatricula,
        email: newEmail,
        nome: document.getElementById('colabNome').value.trim(),
        funcao: document.getElementById('colabFuncao').value,
        setor: document.getElementById('colabSetor').value,
        empresa: document.getElementById('colabEmpresa').value.trim(),
        aso: document.getElementById('colabASO').value,
        nivelAcesso: newNivelAcesso,
        ativo: true,
        synced: false
    };

    try {
        await saveToIndexedDB('colaboradores', colab);
        showToast('Colaborador atualizado!');
    } catch (err) {
        console.error('Erro ao atualizar colaborador no IndexedDB:', err);
        showToast('❌ Erro ao salvar localmente: ' + err.message);
        return;
    }

    if (normalizarNivelAcesso(newNivelAcesso) !== normalizarNivelAcesso(oldColab.nivelAcesso)) {
        const rpcRes = await alterarNivelAcessoOnlineSupabase(colab.id, newNivelAcesso);
        if (!rpcRes.success) {
            showToast('⚠️ Nível de acesso salvo localmente, mas não foi possível sincronizar com o servidor: ' + (rpcRes.error || 'sem conexão'));
        }
    }

    const btn = document.getElementById('btnSaveColaborador');
    if (btn) {
        btn.textContent = 'Cadastrar Colaborador';
        btn.setAttribute('onclick', 'saveColaborador()');
    }

    document.getElementById('colabNome').value = '';
    document.getElementById('colabFuncao').value = '';
    document.getElementById('colabSetor').value = '';
    document.getElementById('colabEmpresa').value = '';
    document.getElementById('colabMatricula').value = '';
    document.getElementById('colabEmail').value = '';
    document.getElementById('colabASO').value = '';
    document.getElementById('colabNivelAcesso').value = 'Tecnico';
}

async function deleteCadastro(id) {
    return deleteCadastroPermanente(id);
}

async function deleteCadastroPermanente(id) {
    const cadastro = await getFromIndexedDB('cadastros', id);
    const label = cadastro ? `${cadastro.patrimonio || ''} ${cadastro.nome ? '(' + cadastro.nome + ')' : ''}` : id;

    if (!confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o equipamento "${label.trim()}" do banco de dados e do aplicativo?`)) return;

    if (isSupabaseConfigured()) {
        try {
            await supabaseFetch('cadastros', {
                method: 'DELETE',
                query: '?id=eq.' + encodeURIComponent(id)
            });
            console.log('⚡ [Supabase] Cadastro excluído definitivamente:', id);
        } catch (spErr) {
            console.error('Erro ao excluir cadastro do Supabase:', spErr);
        }
    }



    await deleteFromIndexedDB('cadastros', id);
    showToast('Equipamento excluído com sucesso');
    loadGestao();
}

async function deleteColaborador(id) {
    return deleteColaboradorPermanente(id);
}

async function deleteColaboradorPermanente(id) {
    const colab = await getFromIndexedDB('colaboradores', id);
    const label = colab ? `${colab.nome || ''} (Matrícula: ${colab.matricula || id})` : id;

    if (!confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o colaborador "${label.trim()}" do banco de dados e do aplicativo?`)) return;

    if (isSupabaseConfigured()) {
        try {
            await supabaseFetch('colaboradores_checklist', {
                method: 'DELETE',
                query: '?id=eq.' + encodeURIComponent(id)
            });
            console.log('⚡ [Supabase] Colaborador excluído definitivamente:', id);
        } catch (spErr) {
            console.error('Erro ao excluir colaborador do Supabase:', spErr);
        }
    }



    await deleteFromIndexedDB('colaboradores', id);
    showToast('Colaborador excluído com sucesso');
    loadGestao();
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
// ITENS CUSTOMIZADOS POR TIPO DE EQUIPAMENTO
// ============================================

function getEffectiveItems(equipment) {
    if (!equipment) return [];
    const baseItems = equipment.items || [];
    
    // Carrega as customizações globais do tipo do localStorage
    const settings = JSON.parse(localStorage.getItem('custom_type_settings') || '{}');
    const typeSettings = settings[equipment.id] || {};
    
    const disabled = typeSettings.disabledItems || [];
    const custom = typeSettings.customItems || [];
    
    const filtered = baseItems.filter(item => !disabled.includes(item.id));
    const customItems = custom.map(item => ({
        id: item.id,
        text: item.text,
        nr: item.nr || equipment.nr || '',
        risk: item.risk || 'medium'
    }));
    return [...filtered, ...customItems];
}

// ============================================
// CHECKLIST
// ============================================

function startChecklist(category, equipmentId) {
    const equipment = EQUIPMENT_TYPES[category].find(e => e.id === equipmentId);
    if (!equipment) return;

    currentEquipment = equipment;
    currentCadastro = null;
    checklistData = {};
    clearReinspectionState();
    
    // Inicializar dados do formulário
    document.getElementById('checklistDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('checklistPatrimonio').value = '';
    const nomeInput = document.getElementById('checklistNome');
    const empresaInput = document.getElementById('checklistEmpresa');
    nomeInput.value = equipment.name;
    empresaInput.value = '';
    lockEquipmentFields(false);
    document.getElementById('checklistOperador').value = '';
    document.getElementById('checklistObservacoes').value = '';
    document.getElementById('checklistSSTSelect').value = '';
    document.getElementById('checklistResponsavelSelect').value = '';
    
    // Carregar cadastros deste tipo
    loadCadastroSelect(category);
    loadResponsavelSelect();

    clearSignature();
    clearSignatureResponsavel();
    renderChecklistItems(equipment, currentCadastro);
    showPage('pageChecklistForm');
}

async function loadCadastroSelect(category) {
    const cadastros = await getCadastrosByTipo(category);
    const select = document.getElementById('checklistPatrimonio');
    
    select.innerHTML = '<option value="">Selecione um equipamento cadastrado...</option>';
    
    const seen = new Set();
    const cadastrosUnicos = [];
    cadastros.forEach(c => {
        const key = (c.patrimonio || '').trim().toUpperCase();
        if (key && !seen.has(key)) {
            seen.add(key);
            cadastrosUnicos.push(c);
        }
    });

    cadastrosUnicos.forEach(c => {
        const option = document.createElement('option');
        option.value = c.patrimonio;
        option.textContent = `${c.patrimonio}${c.placa ? ' [' + c.placa + ']' : ''} - ${c.nome} (${c.empresa || 'Sem empresa'})`;
        option.dataset.nome = c.nome || '';
        option.dataset.empresa = c.empresa || '';
        select.appendChild(option);
    });
    
    if (cadastrosUnicos.length === 0) {
        select.innerHTML = '<option value="">Nenhum equipamento cadastrado para este tipo</option>';
    }
}

function lockEquipmentFields(lock) {
    const nomeInput = document.getElementById('checklistNome');
    const empresaInput = document.getElementById('checklistEmpresa');
    if (!nomeInput || !empresaInput) return;
    
    if (lock) {
        nomeInput.disabled = true;
        empresaInput.disabled = true;
        nomeInput.style.backgroundColor = '#f1f5f9';
        empresaInput.style.backgroundColor = '#f1f5f9';
    } else {
        nomeInput.disabled = false;
        empresaInput.disabled = false;
        nomeInput.style.backgroundColor = '';
        empresaInput.style.backgroundColor = '';
    }
}

async function fillFromCadastro() {
    const select = document.getElementById('checklistPatrimonio');
    const option = select.options[select.selectedIndex];
    const nomeInput = document.getElementById('checklistNome');
    const empresaInput = document.getElementById('checklistEmpresa');

    if (!select.value) {
        nomeInput.value = currentEquipment?.name || '';
        empresaInput.value = '';
        lockEquipmentFields(false);
        currentCadastro = null;
        renderChecklistItems(currentEquipment);
        return;
    }

    nomeInput.value = option.dataset.nome || currentEquipment?.name || '';
    empresaInput.value = option.dataset.empresa || '';
    lockEquipmentFields(true);

    const cadastro = await getFromIndexedDB('cadastros', select.value);
    if (cadastro) {
        currentCadastro = cadastro;
        renderChecklistItems(currentEquipment, cadastro);
    }
}

function renderChecklistItems(equipment, cadastro) {
    const container = document.getElementById('checklistItems');
    let currentSection = null;
    const items = getEffectiveItems(equipment);

    let html = '';
    items.forEach((item, index) => {
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
        
        const isReinspectFailure = itensComFalhaAnterior.includes(String(item.id));
        const itemStyle = isReinspectFailure ? 
            `border-left: 5px solid var(--warning); background: #fffcf4; border-top: 1px solid #f9e79f; border-right: 1px solid #f9e79f; border-bottom: 1px solid #f9e79f;` : 
            '';
        const failureBadge = isReinspectFailure ? 
            `<span class="badge" style="background: #fff9e6; color: #b78a00; border: 1px solid #ffe8a1; font-weight: 700; font-size: 10px; margin-left: 6px;">⚠️ FALHA ANTERIOR</span>` : 
            '';

        html += `
            <div class="checklist-item" id="item-${item.id}" style="${itemStyle}">
                <div class="item-header">
                    <span class="item-text">${index + 1} - ${item.text} ${failureBadge}</span>
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
    
    html += `
        <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border: 2px dashed #27ae60; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 10px; font-size: 12px; color: var(--text-light); font-weight: 600;">Sentiu falta de algum item neste checklist? (ex: Ar-Condicionado, Cinto de Segurança...)</p>
            <button type="button" onclick="abrirModalAdicionarItemCustomChecklist()" style="background: #27ae60; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 8px rgba(39, 174, 96, 0.25);">
                ➕ Adicionar Item Extra a este Checklist
            </button>
        </div>
    `;

    container.innerHTML = html;
}

function abrirModalAdicionarItemCustomChecklist() {
    const html = `
        <div style="padding: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <h3 style="margin: 0; font-size: 16px; color: var(--primary);">➕ Adicionar Item Extra ao Checklist</h3>
                <button onclick="closeModal()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: bold;">Nome do Item de Verificação *</label>
                <input type="text" id="customItemText" class="form-input" placeholder="Ex: Ar-Condicionado, Condições do Estepe..." style="width: 100%; padding: 8px; border-radius: 6px;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div>
                    <label class="form-label" style="font-size: 12px; font-weight: bold;">Norma / NR</label>
                    <input type="text" id="customItemNR" class="form-input" value="NR-12" style="width: 100%; padding: 8px; border-radius: 6px;">
                </div>
                <div>
                    <label class="form-label" style="font-size: 12px; font-weight: bold;">Grau de Risco</label>
                    <select id="customItemRisk" class="form-select" style="width: 100%; padding: 8px; border-radius: 6px;">
                        <option value="medium">RISCO MÉDIO</option>
                        <option value="high">RISCO ALTO</option>
                        <option value="low">RISCO BAIXO</option>
                    </select>
                </div>
            </div>

            <div style="margin-bottom: 14px; font-size: 12px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" id="customItemSavePermanently" checked>
                    <strong>Salvar este item para este modelo de equipamento</strong>
                </label>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 14px;">
                <button onclick="confirmarAdicionarItemCustomChecklist()" class="save-btn" style="flex: 1; padding: 10px; font-weight: bold; background: #27ae60;">
                    Adicionar ao Checklist
                </button>
                <button onclick="closeModal()" class="save-btn" style="background: #95a5a6; padding: 10px;">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    showModal(html);
}

async function confirmarAdicionarItemCustomChecklist() {
    const textInput = document.getElementById('customItemText');
    const nrInput = document.getElementById('customItemNR');
    const riskInput = document.getElementById('customItemRisk');
    const permInput = document.getElementById('customItemSavePermanently');

    const text = textInput ? textInput.value.trim() : '';
    if (!text) {
        showToast('⚠️ Digite o nome do item de verificação');
        return;
    }

    const nr = nrInput ? nrInput.value.trim() || 'NR-12' : 'NR-12';
    const risk = riskInput ? riskInput.value : 'medium';
    const savePermanently = permInput ? permInput.checked : false;

    const newItemId = 'custom_' + Date.now();
    const newItem = {
        id: newItemId,
        text: text,
        nr: nr,
        risk: risk,
        custom: true
    };

    if (currentEquipment) {
        if (!currentEquipment.items) currentEquipment.items = [];
        currentEquipment.items.push(newItem);

        if (savePermanently && currentEquipment.id) {
            try {
                if (typeof saveCustomItem === 'function') {
                    const category = currentCategory || currentEquipment.category || currentEquipment.tipo || 'veiculos';
                    await saveCustomItem(category, currentEquipment.id, newItem);
                }
            } catch (e) {
                console.error('Erro ao salvar item customizado permanentemente:', e);
            }
        }
    }

    closeModal();
    renderChecklistItems(currentEquipment, currentCadastro);
    showToast(`✅ Item "${text}" adicionado ao checklist!`);
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
    
    // Auto-interdição se item de interdição for marcado como NC
    if (status === 'NC' && currentEquipment) {
        const items = getEffectiveItems(currentEquipment);
        const currentItem = items.find(i => String(i.id) === String(itemId));
        if (currentItem && currentItem.section === 'INTERDIÇÃO') {
            const btnInterditar = document.querySelector("button[onclick*=\"'interditado'\"]");
            if (btnInterditar) {
                setStatusChecklist('interditado', btnInterditar);
            }
        }
    }
    
    updateProgress();
}

function setObservation(itemId, value) {
    if (!checklistData[itemId]) checklistData[itemId] = {};
    checklistData[itemId].observation = value;
}

function updateProgress() {
    if (!currentEquipment) return;
    const items = getEffectiveItems(currentEquipment);
    const total = items.length;
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
        responsavel: document.getElementById('checklistResponsavelSelect').value,
        sst: document.getElementById('checklistSSTSelect').value
    };
}

// ============================================
// ASSINATURA
// ============================================

function initSignaturePad() {
    setupCanvas('signatureCanvas');
    setupCanvas('signatureCanvasResponsavel');
}

function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const newWidth = Math.round(rect.width);
        const newHeight = Math.round(rect.height);
        
        if (canvas.width === newWidth && canvas.height === newHeight) {
            return;
        }

        let tempImg = null;
        try {
            // Verificar se o canvas não está vazio antes de fazer backup
            // (Evita redesenhar canvas em branco desnecessariamente)
            tempImg = canvas.toDataURL();
        } catch (e) {
            console.log('Erro ao salvar imagem do canvas:', e);
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        if (tempImg) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
            };
            img.src = tempImg;
        }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
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
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function clearSignatureResponsavel() {
    const canvas = document.getElementById('signatureCanvasResponsavel');
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function getSignatureImage() {
    const canvas = document.getElementById('signatureCanvas');
    return canvas ? canvas.toDataURL() : null;
}

function getSignatureResponsavelImage() {
    const canvas = document.getElementById('signatureCanvasResponsavel');
    return canvas ? canvas.toDataURL() : null;
}

function clearSignatureCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getSignatureCanvasImage(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    try {
        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const isBlank = !buffer.some(color => color !== 0);
        return isBlank ? null : canvas.toDataURL();
    } catch(e) {
        return canvas.toDataURL();
    }
}

async function loadInterdicaoEquipments() {
    const cadastros = await getAllFromIndexedDB('cadastros');
    const ativos = cadastros.filter(c => c.ativo !== false && c.tipo !== 'colaborador');
    const select = document.getElementById('interdicaoPatrimonio');
    if (select) {
        select.innerHTML = '<option value="">Selecione o equipamento...</option>';
        ativos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.patrimonio;
            opt.textContent = `${c.patrimonio} - ${c.nome}`;
            select.appendChild(opt);
        });
    }
}

function initInterdicaoSignatures() {
    setupCanvas('signatureCanvasInterdicaoSST');
    setupCanvas('signatureCanvasInterdicaoResp');
}

async function salvarInterdicaoUrgente() {
    const patrimonio = document.getElementById('interdicaoPatrimonio').value;
    const motivo = document.getElementById('interdicaoMotivo').value;
    const descricao = document.getElementById('interdicaoDescricao').value.trim();
    const sst = document.getElementById('interdicaoSST').value.trim();
    const responsavel = document.getElementById('interdicaoResponsavel').value.trim();
    
    if (!patrimonio || !motivo || !descricao || !sst) {
        showToast('Preencha todos os campos obrigatórios (*)');
        return;
    }
    
    const sigSST = getSignatureCanvasImage('signatureCanvasInterdicaoSST');
    if (!sigSST) {
        showToast('A assinatura do Técnico (SST) é obrigatória!');
        return;
    }
    
    const sigResp = getSignatureCanvasImage('signatureCanvasInterdicaoResp');
    
    const cadastros = await getAllFromIndexedDB('cadastros');
    const cadastro = cadastros.find(c => c.patrimonio === patrimonio);
    if (!cadastro) {
        showToast('Equipamento não encontrado!');
        return;
    }
    
    const checklist = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        patrimonio: patrimonio,
        nome: cadastro.nome,
        empresa: cadastro.empresa || '',
        operador: 'N/A - Interdição Urgente',
        sst: sst,
        responsavel: responsavel || 'Não Informado',
        observacoes: `[INTERDIÇÃO RÁPIDA] Motivo: ${motivo}. Detalhe: ${descricao}`,
        statusChecklist: 'interditado',
        prazoAdequacao: '',
        equipment: cadastro.equipment || { id: cadastro.categoria, name: cadastro.nome, nr: '' },
        items: {
            "item_interdicao": { status: 'NC', observation: motivo + ' - ' + descricao }
        },
        stats: { conformes: 0, naoConformes: 1, na: 0, total: 1 },
        signature: sigSST,
        signatureResponsavel: sigResp,
        synced: false
    };
    
    await saveToIndexedDB('checklists', checklist);
    await updateCadastroLastChecklist(patrimonio);
    
    showToast('🚫 Equipamento interditado com sucesso!');
    
    // Reset values
    document.getElementById('interdicaoPatrimonio').value = '';
    document.getElementById('interdicaoMotivo').value = '';
    document.getElementById('interdicaoDescricao').value = '';
    document.getElementById('interdicaoSST').value = '';
    document.getElementById('interdicaoResponsavel').value = '';
    clearSignatureCanvas('signatureCanvasInterdicaoSST');
    clearSignatureCanvas('signatureCanvasInterdicaoResp');
    
    setTimeout(() => {
        showPage('pageHome');
        if (isSupabaseConfigured()) {
            sincronizarComSupabase();
        }
    }, 1200);
}

async function loadResponsavelSelect() {
    const colaboradores = await getAllFromIndexedDB('colaboradores');
    const ativos = colaboradores.filter(c => c.ativo !== false);

    const listResp = document.getElementById('listaResponsaveis');
    if (listResp) {
        listResp.innerHTML = '';
        ativos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome;
            opt.textContent = `${c.funcao || ''} - ${c.empresa || ''}`;
            listResp.appendChild(opt);
        });
    }

    const listSST = document.getElementById('listaSST');
    if (listSST) {
        listSST.innerHTML = '';
        ativos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome;
            opt.textContent = `${c.funcao || ''} - ${c.empresa || ''}`;
            listSST.appendChild(opt);
        });
    }

    const listOperadores = document.getElementById('listaOperadores');
    if (listOperadores) {
        listOperadores.innerHTML = '';
        ativos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome;
            opt.textContent = `${c.funcao || ''} - ${c.empresa || ''}`;
            listOperadores.appendChild(opt);
        });
    }
}

// Removidos selecionadores antigos de SST/Responsável

// ============================================
// SALVAR CHECKLIST
// ============================================

async function saveChecklist() {
    saveFormData();
    
    const formData = checklistData._form || {};
    
    // Validações
    const patrimonioSelect = document.getElementById('checklistPatrimonio');
    if (!patrimonioSelect.value || patrimonioSelect.value === '') {
        showToast('Selecione um equipamento cadastrado');
        patrimonioSelect.focus();
        return;
    }

    const operadorVal = (document.getElementById('checklistOperador').value || '').trim();
    if (!operadorVal) {
        showToast('⚠️ Por favor, informe o Operador/Responsável pelo equipamento.');
        document.getElementById('checklistOperador').focus();
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
    let hasInterdictionNC = false;
    const effectiveItems = getEffectiveItems(currentEquipment);
    items.forEach(k => {
        if (checklistData[k].status === 'C') conformes++;
        else if (checklistData[k].status === 'NC') {
            naoConformes++;
            const effItem = effectiveItems.find(i => String(i.id) === String(k));
            if (effItem && effItem.section === 'INTERDIÇÃO') {
                hasInterdictionNC = true;
            }
        }
        else if (checklistData[k].status === 'NA') na++;
        const effItem = effectiveItems.find(i => String(i.id) === String(k));
        if (effItem) checklistData[k].customText = effItem.text;
    });
    
    // Lógica de Status Final com Auto-Interdição
    let statusFinal = currentStatusChecklist;
    if (hasInterdictionNC) {
        statusFinal = 'interditado';
    } else if (naoConformes > 0 && !currentStatusChecklist) {
        statusFinal = 'liberado_restricao';
    } else if (naoConformes === 0) {
        statusFinal = 'liberado';
    }
    
    const prazo = document.getElementById('checklistPrazo')?.value || null;
    const dateVal = formData.date || (document.getElementById('checklistDate')?.value) || new Date().toISOString().split('T')[0];
    
    const checklist = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date: dateVal,
        patrimonio: formData.patrimonio || '',
        nome: formData.nome || currentEquipment?.name || '',
        empresa: formData.empresa || '',
        operador: operadorVal,
        observacoes: formData.observacoes || '',
        responsavel: formData.responsavel || '',
        sst: formData.sst || '',
        statusChecklist: statusFinal,
        prazoAdequacao: prazo,
        equipment: {
            id: currentEquipment?.id || '',
            name: currentEquipment?.name || '',
            icon: currentEquipment?.icon || '📦',
            nr: currentEquipment?.nr || ''
        },
        items: checklistData,
        stats: { conformes, naoConformes, na, total: items.length },
        signature: getSignatureImage(),
        signatureResponsavel: getSignatureResponsavelImage(),
        synced: false
    };
    
    // Salvar no IndexedDB
    await saveToIndexedDB('checklists', checklist);
    
    // Se for uma reinspeção concluída, atualizar o status do checklist original para "reinspecionado"
    if (currentReinspectionOriginalId) {
        try {
            const originalChecklist = await getFromIndexedDB('checklists', currentReinspectionOriginalId);
            if (originalChecklist) {
                originalChecklist.statusChecklist = 'reinspecionado';
                originalChecklist.synced = false;
                await saveToIndexedDB('checklists', originalChecklist);
                
                if (isSupabaseConfigured()) {
                    sincronizarItemIndividualSupabase('checklists', originalChecklist);
                }
            }
        } catch (e) {
            console.error('Erro ao atualizar status do checklist original:', e);
        }
        currentReinspectionOriginalId = null; // Limpar estado
    }
    
    if (isSupabaseConfigured()) {
        sincronizarItemIndividualSupabase('checklists', checklist);
    }

    // Atualizar último checklist no cadastro
    updateCadastroLastChecklist(formData.patrimonio);
    
    showToast('✅ Checklist salvo com sucesso!');
    
    // Voltar para home e recarregar histórico
    setTimeout(() => {
        currentStatusChecklist = null;
        loadHistory();
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
        const request = indexedDB.open('ChecklistSeguranca', 4);
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
            if (!db.objectStoreNames.contains('checklist_items')) {
                db.createObjectStore('checklist_items', { keyPath: 'id' });
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
            if (!skipSync && navigator.onLine) {
                if (isSupabaseConfigured()) {
                    sincronizarItemIndividualSupabase(storeName, data);
                }
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
    if (id === undefined || id === null) return null;
    const db = await openDB();
    
    // 1. Tentar busca com o ID exatamente como recebido
    let res = await new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
    });

    // 2. Se for string numérica, tentar busca como Number
    if (!res && typeof id === 'string' && id.trim() !== '' && !isNaN(Number(id))) {
        res = await new Promise((resolve) => {
            const tx = db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(Number(id));
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        });
    }

    // 3. Se for number, tentar busca como String
    if (!res && typeof id === 'number') {
        res = await new Promise((resolve) => {
            const tx = db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(String(id));
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        });
    }

    // 4. Se ainda não achou, varredura flexível em todos os registros do store
    if (!res) {
        const all = await getAllFromIndexedDB(storeName);
        const targetStr = String(id).trim().toUpperCase();
        res = all.find(item => String(item.id || '').trim().toUpperCase() === targetStr) || null;
    }

    return res;
}

async function deleteFromIndexedDB(storeName, id) {
    if (id === undefined || id === null) return;
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    store.delete(id);
    if (typeof id === 'string' && !isNaN(Number(id))) {
        store.delete(Number(id));
    } else if (typeof id === 'number') {
        store.delete(String(id));
    }
    
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

// ============================================
// GERENCIAMENTO DE ITENS POR CADASTRO
// ============================================

let itemGerenciaTypeId = null;
let itemGerenciaTypeCategory = null;
let itemGerenciaDisabled = [];
let itemGerenciaCustom = [];

async function loadItemGerenciaSelect() {
    const select = document.getElementById('itemGerenciaSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um tipo de equipamento...</option>';
    
    for (const [categoriaKey, items] of Object.entries(EQUIPMENT_TYPES)) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = categoriaKey === 'maquinas' ? 'Máquinas e Equipamentos' :
                         categoriaKey === 'veiculos' ? 'Veículos' : 'Ferramentas';
        
        items.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.id;
            opt.textContent = `${eq.name} (${eq.nr})`;
            opt.dataset.categoria = categoriaKey;
            optgroup.appendChild(opt);
        });
        
        select.appendChild(optgroup);
    }
}

async function loadItemGerenciaItems() {
    const select = document.getElementById('itemGerenciaSelect');
    const content = document.getElementById('itemGerenciaContent');
    if (!select.value) {
        content.style.display = 'none';
        itemGerenciaTypeId = null;
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const optgroupLabel = selectedOption.parentNode.label;
    const categoriaKey = optgroupLabel === 'Veículos' ? 'veiculos' :
                         optgroupLabel === 'Ferramentas' ? 'ferramentas' : 'maquinas';
    
    const typeId = select.value;
    const equipment = EQUIPMENT_TYPES[categoriaKey]?.find(e => e.id === typeId);
    
    if (!equipment) {
        content.style.display = 'none';
        itemGerenciaTypeId = null;
        return;
    }
    
    itemGerenciaTypeId = typeId;
    itemGerenciaTypeCategory = categoriaKey;
    
    const settings = JSON.parse(localStorage.getItem('custom_type_settings') || '{}');
    const typeSettings = settings[typeId] || {};
    
    itemGerenciaDisabled = [...(typeSettings.disabledItems || [])];
    itemGerenciaCustom = [...(typeSettings.customItems || [])];
    
    content.style.display = 'block';
    renderItemGerenciaLists();
}

function renderItemGerenciaLists() {
    if (!itemGerenciaTypeId) return;
    const equipment = EQUIPMENT_TYPES[itemGerenciaTypeCategory]?.find(e => e.id === itemGerenciaTypeId);
    if (!equipment) return;

    const baseContainer = document.getElementById('itemGerenciaBase');
    const customContainer = document.getElementById('itemGerenciaCustom');

    baseContainer.innerHTML = equipment.items.map(item => {
        const disabled = itemGerenciaDisabled.includes(item.id);
        return `
            <div style="display: flex; align-items: center; padding: 10px; background: ${disabled ? '#f5f5f5' : 'white'}; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; opacity: ${disabled ? '0.5' : '1'};">
                <label style="display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer;">
                    <input type="checkbox" ${!disabled ? 'checked' : ''} onchange="toggleBaseItem('${item.id}', this.checked)" style="width: 18px; height: 18px;">
                    <div>
                        <div style="font-size: 13px; font-weight: 500;">${item.text}</div>
                        <div style="font-size: 11px; color: var(--text-light);">${item.nr} • ${item.risk === 'high' ? 'Risco Alto' : item.risk === 'medium' ? 'Risco Médio' : 'Risco Baixo'}</div>
                    </div>
                </label>
            </div>`;
    }).join('');

    if (itemGerenciaCustom.length === 0) {
        customContainer.innerHTML = '<div style="font-size: 12px; color: var(--text-light); padding: 8px;">Nenhum item customizado</div>';
    } else {
        customContainer.innerHTML = itemGerenciaCustom.map((item, idx) => `
            <div style="display: flex; align-items: center; padding: 10px; background: white; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;">
                <div style="flex: 1;">
                    <div style="font-size: 13px; font-weight: 500;">${item.text}</div>
                    <div style="font-size: 11px; color: var(--text-light);">${item.nr} • ${item.risk === 'high' ? 'Risco Alto' : item.risk === 'medium' ? 'Risco Médio' : 'Risco Baixo'}</div>
                </div>
                <button onclick="removeCustomItem(${idx})" style="background: var(--danger); color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; cursor: pointer;">Remover</button>
            </div>`).join('');
    }
}

function toggleBaseItem(itemId, enabled) {
    if (enabled) {
        itemGerenciaDisabled = itemGerenciaDisabled.filter(id => id !== itemId);
    } else {
        if (!itemGerenciaDisabled.includes(itemId)) {
            itemGerenciaDisabled.push(itemId);
        }
    }
    renderItemGerenciaLists();
}

function addCustomItem() {
    const text = document.getElementById('newItemText').value.trim();
    const nr = document.getElementById('newItemNr').value.trim();
    const risk = document.getElementById('newItemRisk').value;
    if (!text) { showToast('Digite a descrição do item'); return; }
    itemGerenciaCustom.push({ id: 'custom_' + Date.now(), text, nr: nr || '', risk });
    document.getElementById('newItemText').value = '';
    document.getElementById('newItemNr').value = '';
    renderItemGerenciaLists();
    showToast('Item adicionado');
}

function removeCustomItem(index) {
    itemGerenciaCustom.splice(index, 1);
    renderItemGerenciaLists();
}

async function saveItemGerencia() {
    if (!itemGerenciaTypeId) return;
    
    const settings = JSON.parse(localStorage.getItem('custom_type_settings') || '{}');
    settings[itemGerenciaTypeId] = {
        disabledItems: itemGerenciaDisabled,
        customItems: itemGerenciaCustom
    };
    
    localStorage.setItem('custom_type_settings', JSON.stringify(settings));
    showToast('Itens do tipo de equipamento atualizados!');
}

// ============================================
// CONEXÃO & SINCRONIZAÇÃO COM SUPABASE (POSTGRESQL)
// ============================================

const DEFAULT_SUPABASE_URL = 'https://qqtcwxvbjmybyzubocgd.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdGN3eHZiam15Ynl6dWJvY2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1ODczNDUsImV4cCI6MjEwMDE2MzM0NX0.T6Nm-lUD2I_mRULsEXCDQBkJe2cEpl6_z7hUNR30yTk';

function cleanSupabaseUrl(url) {
    if (!url) return '';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    return cleaned;
}

function getSupabaseUrl() {
    const stored = localStorage.getItem('supabase_url');
    return cleanSupabaseUrl(stored || DEFAULT_SUPABASE_URL);
}

function getSupabaseKey() {
    return (localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY).trim();
}

function isSupabaseConfigured() {
    return !!(getSupabaseUrl() && getSupabaseKey());
}

function setSupabaseConfig(url, key) {
    localStorage.setItem('supabase_url', cleanSupabaseUrl(url));
    localStorage.setItem('supabase_key', (key || '').trim());
}

async function supabaseFetch(table, options = {}) {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (!url || !key) return { success: false, error: 'Supabase não configurado' };

    const endpoint = `${url}/rest/v1/${table}${options.query || ''}`;
    const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation'
    };

    try {
        const fetchOptions = {
            method: options.method || 'GET',
            headers: headers
        };
        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }
        const response = await fetch(endpoint, fetchOptions);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }
        const data = await response.json();
        return { success: true, data: data };
    } catch (err) {
        console.error(`Erro na requisição Supabase (${table}):`, err.message);
        return { success: false, error: err.message };
    }
}

// ============================================
// AUXILIARES DE SINCRONIZAÇÃO & NÃO CONFORMIDADES
// ============================================

function hashCode(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
}

async function sincronizarNaoConformidadesComChecklists(ncRows) {
    if (!Array.isArray(ncRows) || ncRows.length === 0) return;
    
    const checklists = await getAllFromIndexedDB('checklists');
    if (checklists.length === 0) return;

    const checklistMap = {};
    checklists.forEach(c => {
        if (c.id) checklistMap[String(c.id).trim()] = c;
        if (c.patrimonio) checklistMap[String(c.patrimonio).trim().toUpperCase()] = c;
    });

    let count = 0;
    for (const row of ncRows) {
        const idChecklist = String(row['ID Checklist'] || row['ID_Checklist'] || row['ID'] || '').trim();
        const patrimonio = String(row['Patrimônio'] || row['Patrimonio'] || '').trim().toUpperCase();
        const itemText = String(row['Item'] || '').trim();
        const obs = String(row['Observação'] || row['Observacao'] || '').trim();
        const risco = String(row['Risco'] || 'high').trim().toLowerCase();

        if (!itemText) continue;

        let target = checklistMap[idChecklist] || checklistMap[patrimonio];
        if (!target && patrimonio) {
            target = checklists.find(c => String(c.patrimonio || '').toUpperCase() === patrimonio);
        }

        if (target) {
            if (!target.items || typeof target.items !== 'object') {
                target.items = {};
            }

            const itemId = 'nc_import_' + Math.abs(hashCode(itemText));
            target.items[itemId] = {
                status: 'NC',
                observation: obs,
                customText: itemText,
                risk: risco
            };

            const stats = recalcularStatsChecklist(target);
            target.stats = stats;
            target.statusChecklist = normalizarStatusChecklist(target.statusChecklist, target);

            await saveToIndexedDB('checklists', target, true);
            count++;
        }
    }
    console.log(`✅ ${count} Não Conformidades vinculadas aos checklists locais.`);
}

function iniciarSyncPeriodica() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    syncIntervalId = setInterval(function() {
        if (navigator.onLine) {
            if (isSupabaseConfigured()) {
                sincronizarComSupabase().then(() => {
                    if (currentPage === 'pageCadastro') loadGestao();
                });
            }
        }
    }, 5 * 60 * 1000);
}

// ============================================
// HISTÓRICO
// ============================================

let historyChecklistsCache = [];

async function loadHistory() {
    const checklists = await getAllFromIndexedDB('checklists');
    historyChecklistsCache = checklists;
    
    const selectYear = document.getElementById('historyFilterYear');
    if (selectYear) {
        const uniqueYears = new Set();
        checklists.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        checklists.forEach(c => {
            const parsed = parseLocalDate(c.date);
            if (!isNaN(parsed.getTime())) {
                uniqueYears.add(parsed.getFullYear().toString());
            }
        });
        
        selectYear.innerHTML = '<option value="">Todos os Anos</option>';
        uniqueYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            selectYear.appendChild(opt);
        });
    }
    
    // Reset inputs
    const searchInput = document.getElementById('historySearch');
    if (searchInput) searchInput.value = '';
    const selectStatus = document.getElementById('historyFilterStatus');
    if (selectStatus) selectStatus.value = '';
    const selectMonth = document.getElementById('historyFilterMonth');
    if (selectMonth) selectMonth.value = '';
    if (selectYear) selectYear.value = '';
    
    renderHistoryFiltered();
}

function renderHistoryFiltered() {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    const search = (document.getElementById('historySearch')?.value || '').trim();
    const selectedYear = document.getElementById('historyFilterYear')?.value || '';
    const selectedMonth = document.getElementById('historyFilterMonth')?.value || '';
    const status = document.getElementById('historyFilterStatus')?.value || '';
    
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                        
    function getChecklistMonthYearKey(dateStr) {
        if (!dateStr) return 'Desconhecido';
        const parsed = parseLocalDate(dateStr);
        if (isNaN(parsed.getTime())) return 'Desconhecido';
        return `${mesesNomes[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }
    
    const checklists = [...historyChecklistsCache];
    checklists.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const filtered = checklists.filter(c => {
        const parsedDate = parseLocalDate(c.date);
        const term = search.toLowerCase();
        
        const matchSearch = !term || 
            (c.patrimonio || '').toLowerCase().includes(term) ||
            (c.nome || '').toLowerCase().includes(term) ||
            (c.operador || '').toLowerCase().includes(term) ||
            (c.empresa || '').toLowerCase().includes(term);
            
        const matchYear = !selectedYear || (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear().toString() === selectedYear);
        const matchMonth = !selectedMonth || (!isNaN(parsedDate.getTime()) && parsedDate.getMonth().toString() === selectedMonth);
        
        let matchStatus = true;
        const stats = recalcularStatsChecklist(c);
        c.stats = stats;
        const normStatus = normalizarStatusChecklist(c.statusChecklist, c);

        if (status === 'conforme') {
            matchStatus = stats.naoConformes === 0 && normStatus !== 'interditado';
        } else if (status === 'NC') {
            matchStatus = stats.naoConformes > 0;
        } else if (status === 'interditado') {
            matchStatus = normStatus === 'interditado';
        }
        
        return matchSearch && matchYear && matchMonth && matchStatus;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🔍</div>
                <div class="text">Nenhum checklist correspondente aos filtros</div>
            </div>`;
        return;
    }
    
    const groups = {};
    const groupKeys = [];
    filtered.forEach(c => {
        const key = getChecklistMonthYearKey(c.date);
        if (!groups[key]) {
            groups[key] = [];
            groupKeys.push(key);
        }
        groups[key].push(c);
    });
    
    container.innerHTML = groupKeys.map(key => {
        const itemsHtml = groups[key].map(c => {
            const normStatus = normalizarStatusChecklist(c.statusChecklist, c);
            const statusClass = c.stats.naoConformes > 0 ? 'status-alert' : 'status-ok';
            let statusText = 'Conforme';
            let badgeClass = statusClass;
            
            if (normStatus === 'reinspecionado') {
                statusText = 'Reinspecionado';
                badgeClass = 'status-reinspecionado';
            } else if (c.statusChecklist === 'interditado') {
                statusText = 'Interditado';
                badgeClass = 'status-alert';
            } else if (c.stats.naoConformes > 0) {
                statusText = `${c.stats.naoConformes} NC`;
            }
            
            const date = formatSimpleDate(c.date);
            return `
                <div class="history-item" onclick="viewChecklist('${c.id}')" style="margin-bottom: 8px;">
                    <div class="history-info">
                        <div class="history-title">${c.patrimonio || 'Sem patrimônio'}</div>
                        <div class="history-date">${c.nome || ''}</div>
                        <div class="history-date">${date} • ${c.empresa || ''}</div>
                    </div>
                    <span class="history-status ${badgeClass}">${statusText}</span>
                </div>`;
        }).join('');
        
        return `
            <div class="history-month-group" style="margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 600; color: var(--primary); margin: 12px 4px 8px; display: flex; align-items: center; gap: 6px;">
                    <span>📅</span> ${key}
                    <span style="font-size: 11px; background: rgba(26,82,118,0.1); padding: 2px 6px; border-radius: 12px; color: var(--primary);">${groups[key].length}</span>
                </div>
                ${itemsHtml}
            </div>`;
    }).join('');
}

function recalcularStatsChecklist(checklist) {
    if (!checklist) return { conformes: 0, naoConformes: 0, na: 0, total: 0 };
    
    let conformes = 0;
    let naoConformes = 0;
    let na = 0;

    if (checklist.items && typeof checklist.items === 'object') {
        const keys = Object.keys(checklist.items).filter(k => k !== '_form');
        if (keys.length > 0) {
            keys.forEach(k => {
                const item = checklist.items[k];
                if (item && item.status) {
                    if (item.status === 'C') conformes++;
                    else if (item.status === 'NC') naoConformes++;
                    else if (item.status === 'NA') na++;
                }
            });
            return { conformes, naoConformes, na, total: conformes + naoConformes + na };
        }
    }

    if (checklist.stats) {
        conformes = parseInt(checklist.stats.conformes) || 0;
        naoConformes = parseInt(checklist.stats.naoConformes) || 0;
        na = parseInt(checklist.stats.na) || 0;
    }

    return { conformes, naoConformes, na, total: conformes + naoConformes + na };
}

async function viewChecklist(id) {
    let checklist = await getFromIndexedDB('checklists', id);
    if (!checklist) {
        const numId = Number(id);
        if (!isNaN(numId)) {
            checklist = await getFromIndexedDB('checklists', numId);
        }
    }
    if (!checklist) return;

    checklist.stats = recalcularStatsChecklist(checklist);

    const container = document.getElementById('checklistDetailContent');
    const date = formatSimpleDate(checklist.date);
    
    let itemsHtml = '';
    let hasNC = false;
    for (const [itemId, data] of Object.entries(checklist.items)) {
        if (itemId === '_form') continue;
        const item = checklist.equipment?.items?.find(i => i.id === itemId);
        const itemText = item?.text || ITEM_NAMES[itemId] || data.customText || itemId;
        const statusColor = data.status === 'C' ? 'var(--success)' :
                           data.status === 'NC' ? 'var(--danger)' : 'var(--text-light)';
        const statusText = data.status === 'C' ? '✓ Conforme' :
                          data.status === 'NC' ? '✗ Não Conforme' : '— N/A';
        
        if (data.status === 'NC') hasNC = true;
        
        const isResolved = data.resolved;
        const resolvedInfo = isResolved ? 
            `<div style="font-size: 10px; color: var(--success); margin-top: 2px;">✓ Resolvido ${data.resolvedAt ? 'em ' + new Date(data.resolvedAt).toLocaleDateString('pt-BR') : ''} ${data.resolvedBy ? 'por ' + escapeHTML(data.resolvedBy) : ''}</div>` : '';
        
        itemsHtml += `
            <div class="checklist-item" style="margin-bottom: 8px;">
                <div style="font-size: 13px; font-weight: 500;">${itemText}</div>
                ${data.observation ? `<div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">Obs: ${escapeHTML(data.observation)}</div>` : ''}
                ${resolvedInfo}
                ${data.resolutionNote ? `<div style="font-size: 11px; color: var(--success); margin-top: 2px;">Resolução: ${escapeHTML(data.resolutionNote)}</div>` : ''}
                <div class="status-buttons" style="margin-top: 8px;">
                    <button class="status-btn c ${data.status === 'C' ? 'selected' : ''}" 
                            onclick="updateChecklistItem('${checklist.id}', '${itemId}', 'C', this)">✓ Conforme</button>
                    <button class="status-btn nc ${data.status === 'NC' ? 'selected' : ''}" 
                            onclick="updateChecklistItem('${checklist.id}', '${itemId}', 'NC', this)">✗ Não Conforme</button>
                    <button class="status-btn na ${data.status === 'NA' ? 'selected' : ''}" 
                            onclick="updateChecklistItem('${checklist.id}', '${itemId}', 'NA', this)">— N/A</button>
                </div>
                <div id="resolveObs-${itemId}" style="margin-top: 8px; display: none;">
                    <input type="text" placeholder="Observação da resolução..." 
                           id="resolveObsInput-${itemId}"
                           style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px;">
                    <input type="text" placeholder="Quem resolveu..." 
                           id="resolveByInput-${itemId}"
                           style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; margin-top: 6px;">
                </div>
            </div>`;
    }
    
    const hasDeadline = checklist.statusChecklist === 'liberado_restricao' || checklist.statusChecklist === 'interditado';
    const deadlineHtml = hasDeadline ? `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <strong>Prazo Adequação:</strong>
            <input type="date" id="detailPrazoAdequacao" value="${checklist.prazoAdequacao || ''}"
                   onchange="updateChecklistPrazo('${checklist.id}', this.value)"
                   style="padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; color: var(--text); font-family: inherit;">
        </div>` : '';

    let icon = checklist.equipment?.icon || '📦';
    if (typeof icon === 'object' || String(icon).includes('[object') || !icon) {
        icon = obterIconeFallback(checklist.equipment?.id);
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-title"><span class="icon">${icon}</span> ${escapeHTML(checklist.nome)}</div>
            <div style="font-size: 13px; color: var(--text-light);">
                <div>📅 ${date}</div>
                <div>📋 Patrimônio: ${escapeHTML(checklist.patrimonio)}</div>
                <div>🏢 ${escapeHTML(checklist.empresa || '—')}</div>

                <!-- Operador / Responsável Editável -->
                <div style="margin-top: 8px; padding: 8px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border);">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-light); margin-bottom: 4px;">OPERADOR / RESPONSÁVEL:</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="editDetailOperador_${checklist.id}" value="${escapeHTML(checklist.operador || '')}" placeholder="Digite o operador/responsável..." style="flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 12.5px; font-weight: 600; color: var(--text); background: white;">
                        <button onclick="salvarOperadorChecklist('${checklist.id}')" style="background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            💾 Salvar
                        </button>
                    </div>
                </div>

                <div style="margin-top: 10px;">
                    <span style="color: var(--success);">✓ ${checklist.stats.conformes} Conformes</span> • 
                    <span style="color: var(--danger);">✗ ${checklist.stats.naoConformes} Não Conformes</span> • 
                    <span style="color: var(--text-light);">— ${checklist.stats.na} N/A</span>
                </div>
                ${deadlineHtml}
            </div>
        </div>
        
        ${checklist.observacoes ? `
            <div class="card">
                <div class="card-title">📝 Observações</div>
                <p style="font-size: 13px;">${escapeHTML(checklist.observacoes)}</p>
            </div>` : ''}
        
        <div class="card">
            <div class="card-title">📋 Itens Verificados</div>
            <p style="font-size: 11px; color: var(--text-light); margin-bottom: 10px;">Altere o status dos itens para acompanhar a resolução</p>
            ${itemsHtml}
        </div>
        
        ${checklist.signature ? `
            <div class="card">
                <div class="card-title">✍️ Responsável de Segurança do Trabalho</div>
                ${checklist.sst ? `<div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">${escapeHTML(checklist.sst)}</div>` : ''}
                <img src="${escapeHTML(checklist.signature)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px;">
            </div>` : ''}

        ${checklist.signatureResponsavel ? `
            <div class="card">
                <div class="card-title">✍️ Encarregado / Responsável</div>
                ${checklist.responsavel ? `<div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">${escapeHTML(checklist.responsavel)}</div>` : ''}
                <img src="${escapeHTML(checklist.signatureResponsavel)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px;">
            </div>` : ''}
        
        <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
            <button class="save-btn" style="background: var(--danger); flex: 1; min-width: 80px;" onclick="deleteChecklist('${checklist.id}')">
                🗑️ Excluir
            </button>
            <button class="save-btn" style="background: var(--warning); flex: 1.2; min-width: 120px;" onclick="reinspecionarChecklist('${checklist.id}')">
                🔄 Reinspecionar
            </button>
            <button class="save-btn" style="background: var(--primary); flex: 1; min-width: 80px;" onclick="exportChecklist('${checklist.id}')">
                📥 Exportar
            </button>
        </div>
    `;
    
    showPage('pageChecklistDetail');
}

async function salvarOperadorChecklist(id) {
    const input = document.getElementById(`editDetailOperador_${id}`);
    if (!input) return;
    const newOperador = input.value.trim();
    if (!newOperador) {
        showToast('⚠️ Informe o nome do operador/responsável');
        return;
    }

    let checklist = await getFromIndexedDB('checklists', id);
    if (!checklist && !isNaN(Number(id))) {
        checklist = await getFromIndexedDB('checklists', Number(id));
    }
    if (!checklist) {
        showToast('Checklist não encontrado');
        return;
    }

    checklist.operador = newOperador;
    checklist.synced = false;

    await saveToIndexedDB('checklists', checklist);

    if (navigator.onLine && isSupabaseConfigured()) {
        sincronizarItemIndividualSupabase('checklists', checklist);
    }

    showToast('✅ Operador/Responsável salvo com sucesso!');
    viewChecklist(id);
}


function encontrarCategoriaDoEquipamento(equipment) {
    if (!equipment) return '';
    for (const [catKey, list] of Object.entries(EQUIPMENT_TYPES)) {
        if (list.some(e => e.id === equipment.id)) {
            return catKey;
        }
    }
    return '';
}

function encontrarEquipamentoParaChecklist(checklist) {
    if (!checklist) return null;

    // 1. Tentar por ID do equipamento direto (busca global)
    if (checklist.equipment && checklist.equipment.id) {
        const eqId = checklist.equipment.id;
        for (const [catKey, list] of Object.entries(EQUIPMENT_TYPES)) {
            if (!Array.isArray(list)) continue;
            const found = list.find(e => e.id === eqId);
            if (found) return found;
        }
    }

    // 2. Tentar por equipment.tipo e equipment.id
    if (checklist.equipment && checklist.equipment.tipo && checklist.equipment.id) {
        const cat = checklist.equipment.tipo;
        const eqId = checklist.equipment.id;
        if (EQUIPMENT_TYPES[cat]) {
            const found = EQUIPMENT_TYPES[cat].find(e => e.id === eqId);
            if (found) return found;
        }
    }

    // 3. Tentar por equipment.category e equipment.id
    if (checklist.equipment && checklist.equipment.category && checklist.equipment.id) {
        const cat = checklist.equipment.category;
        const eqId = checklist.equipment.id;
        if (EQUIPMENT_TYPES[cat]) {
            const found = EQUIPMENT_TYPES[cat].find(e => e.id === eqId);
            if (found) return found;
        }
    }

    const targetName = String(checklist.nome || checklist.equipment?.name || '').trim().toUpperCase();

    // 3. Mapeamento explícito de apelidos / sinônimos comuns
    const sinonimos = {
        'PATROL': 'motoniveladora',
        'PATROLA': 'motoniveladora',
        'MOTONIVELADORA': 'motoniveladora',
        'CAÇAMBA': 'caminhao_basculante',
        'CACAMBA': 'caminhao_basculante',
        'CAMINHÃO CAÇAMBA': 'caminhao_basculante',
        'CAMINHAO CACAMBA': 'caminhao_basculante',
        'COMBOIO': 'caminhao_comboio',
        'CAMINHÃO COMBOIO': 'caminhao_comboio',
        'CAMINHAO COMBOIO': 'caminhao_comboio',
        'MUNCK': 'caminhao_munck',
        'CAMINHÃO MUNCK': 'caminhao_munck',
        'PIPA': 'caminhao_pipa',
        'CAMINHÃO PIPA': 'caminhao_pipa',
        'PRANCHA': 'caminhao_prancha',
        'CAMINHÃO PRANCHA': 'caminhao_prancha',
        'RETRO': 'retroescavadeira',
        'RETROESCAVADEIRA': 'retroescavadeira',
        'ESCAVADEIRA': 'escavadeira_hidraulica',
        'TRATOR DE ESTEIRA': 'trator_esteira',
        'TRATOR ESTEIRA': 'trator_esteira',
        'TRATOR AGRÍCOLA': 'trator_agricola',
        'TRATOR AGRICOLA': 'trator_agricola',
        'CARREGADEIRA': 'pa_carregadeira',
        'PÁ CARREGADEIRA': 'pa_carregadeira',
        'PA CARREGADEIRA': 'pa_carregadeira',
        'COMPACTADOR': 'rolo_compactador',
        'ROLO': 'rolo_compactador'
    };

    for (const [key, mappedId] of Object.entries(sinonimos)) {
        if (targetName === key || targetName.includes(key)) {
            for (const [catKey, list] of Object.entries(EQUIPMENT_TYPES)) {
                if (!Array.isArray(list)) continue;
                const found = list.find(e => e.id === mappedId);
                if (found) return found;
            }
        }
    }

    // 4. Procurar em todos os EQUIPMENT_TYPES por id ou nome exatos
    for (const [catKey, list] of Object.entries(EQUIPMENT_TYPES)) {
        if (!Array.isArray(list)) continue;
        for (const eq of list) {
            const eqName = String(eq.name || '').trim().toUpperCase();
            const eqId = String(eq.id || '').trim().toUpperCase();

            if (targetName && (eqName === targetName || eqId === targetName)) {
                return eq;
            }
        }
    }

    // 5. Correspondência por palavra-chave parcial
    if (targetName) {
        for (const [catKey, list] of Object.entries(EQUIPMENT_TYPES)) {
            if (!Array.isArray(list)) continue;
            for (const eq of list) {
                const eqName = String(eq.name || '').trim().toUpperCase();
                const eqId = String(eq.id || '').trim().toUpperCase();

                if (targetName.includes(eqName) || eqName.includes(targetName)) {
                    return eq;
                }
            }
        }
    }

    // 6. Fallback garantido: retornar o primeiro equipamento da primeira categoria
    const firstCat = Object.keys(EQUIPMENT_TYPES)[0];
    if (firstCat && EQUIPMENT_TYPES[firstCat] && EQUIPMENT_TYPES[firstCat].length > 0) {
        return EQUIPMENT_TYPES[firstCat][0];
    }

    return {
        id: 'generico',
        name: checklist.nome || 'Equipamento',
        category: 'geral',
        tipo: 'geral',
        icon: '🚜',
        nr: 'NR-12',
        items: []
    };
}


function aplicarStatusSalvosDOM() {
    for (const [itemId, itemData] of Object.entries(checklistData)) {
        const itemContainer = document.getElementById(`item-${itemId}`);
        if (itemContainer) {
            const btnClass = itemData.status ? itemData.status.toLowerCase() : '';
            if (btnClass) {
                const btn = itemContainer.querySelector(`.status-btn.${btnClass}`);
                if (btn) {
                    itemContainer.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    
                    const obsDiv = document.getElementById(`obs-${itemId}`);
                    if (obsDiv) {
                        if (itemData.status === 'NC') {
                            obsDiv.classList.add('show');
                        } else {
                            obsDiv.classList.remove('show');
                        }
                    }
                }
            }
            
            const obsTextarea = itemContainer.querySelector(`.item-observation textarea`);
            if (obsTextarea) {
                obsTextarea.value = itemData.observation || '';
            }
        }
    }
    updateProgress();
}

async function reinspecionarChecklist(id) {
    let original = await getFromIndexedDB('checklists', id);
    if (!original) {
        const numId = Number(id);
        if (!isNaN(numId)) {
            original = await getFromIndexedDB('checklists', numId);
        }
    }
    if (!original) {
        showToast('Checklist não encontrado.');
        return;
    }
    
    currentReinspectionOriginalId = original.id;
    
    let equipment = encontrarEquipamentoParaChecklist(original);
    if (!equipment && original.patrimonio) {
        // Tentar obter pelo cadastro do patrimônio de forma assíncrona
        const cadastro = await getFromIndexedDB('cadastros', original.patrimonio);
        if (cadastro && cadastro.categoria) {
            for (const [catKey, list] of Object.entries(EQUIPMENT_TYPES)) {
                if (Array.isArray(list)) {
                    const found = list.find(e => e.id === cadastro.categoria);
                    if (found) {
                        equipment = found;
                        break;
                    }
                }
            }
        }
    }
    
    if (!equipment) {
        showToast('Erro: Não foi possível determinar o tipo do equipamento.');
        return;
    }
    
    currentEquipment = equipment;
    currentCadastro = null;
    
    showPage('pageNewChecklist');
    
    const categorySelect = document.getElementById('checklistCategory');
    if (categorySelect && equipment.category) {
        categorySelect.value = equipment.category;
        if (typeof onCategoryChange === 'function') onCategoryChange();
    }
    
    const typeSelect = document.getElementById('checklistType');
    if (typeSelect && equipment.id) {
        typeSelect.value = equipment.id;
        if (typeof onTypeChange === 'function') onTypeChange();
    }
    
    document.getElementById('checklistDate').value = new Date().toISOString().split('T')[0];
    
    const nomeInput = document.getElementById('checklistNome');
    const empresaInput = document.getElementById('checklistEmpresa');
    if (nomeInput) nomeInput.value = original.nome || equipment.name || '';
    if (empresaInput) empresaInput.value = original.empresa || '';
    
    const opInput = document.getElementById('checklistOperador');
    if (opInput) opInput.value = original.operador || '';
    
    const obsInput = document.getElementById('checklistObservacoes');
    if (obsInput) obsInput.value = `Reinspeção baseada no checklist #${original.id}. ` + (original.observacoes || '');
    
    const sstInput = document.getElementById('checklistSSTSelect');
    if (sstInput) sstInput.value = original.sst || '';
    
    const respInput = document.getElementById('checklistResponsavelSelect');
    if (respInput) respInput.value = original.responsavel || '';
    
    lockEquipmentFields(!!original.patrimonio);
    
    const category = encontrarCategoriaDoEquipamento(equipment) || equipment.category || original.equipment?.tipo || original.equipment?.category || '';
    if (category && typeof loadCadastroSelect === 'function') {
        await loadCadastroSelect(category);
    }
    if (typeof loadResponsavelSelect === 'function') {
        await loadResponsavelSelect();
    }
    
    // Selecionar patrimônio e carregar o cadastro ANTES de renderizar
    const selectPatrimonio = document.getElementById('checklistPatrimonio');
    if (selectPatrimonio && original.patrimonio) {
        selectPatrimonio.value = original.patrimonio;
        const cadastro = await getFromIndexedDB('cadastros', original.patrimonio);
        if (cadastro) {
            currentCadastro = cadastro;
        }
    }
    
    itensComFalhaAnterior = [];
    if (original.items) {
        for (const [itemId, itemData] of Object.entries(original.items)) {
            if (itemData && itemData.status === 'NC') {
                let resolvedId = itemId;
                if (itemId.startsWith('nc_import_') && itemData.customText) {
                    const targetText = String(itemData.customText).trim().toUpperCase();
                    const allEqItems = equipment.items || [];
                    const matchedItem = allEqItems.find(eqItem => {
                        const ncDesc = getNCDescription(eqItem.text, eqItem.id).trim().toUpperCase();
                        const normalDesc = String(eqItem.text).trim().toUpperCase();
                        return ncDesc === targetText || normalDesc === targetText;
                    });
                    if (matchedItem) {
                        resolvedId = matchedItem.id;
                    }
                }
                itensComFalhaAnterior.push(resolvedId);
            }
        }
    }
    
    // Update reinspection banner visibility
    const banner = document.getElementById('reinspectionBanner');
    if (banner) {
        banner.style.display = itensComFalhaAnterior.length > 0 ? 'flex' : 'none';
        const bannerDetail = document.getElementById('reinspectionBannerDetail');
        if (bannerDetail) {
            bannerDetail.textContent = `Esta reinspeção é baseada no checklist #${original.id}. Os itens com não conformidades anteriores foram destacados com bordas e selos amarelos.`;
        }
    }
    
    // Copiar todas as respostas da inspeção anterior (Conforme e Não Conforme)
    checklistData = {};
    if (original.items) {
        for (const [itemId, itemData] of Object.entries(original.items)) {
            if (itemId === '_form') continue;
            
            let resolvedId = itemId;
            if (itemId.startsWith('nc_import_') && itemData.customText) {
                const targetText = String(itemData.customText).trim().toUpperCase();
                const allEqItems = equipment.items || [];
                const matchedItem = allEqItems.find(eqItem => {
                    const ncDesc = getNCDescription(eqItem.text, eqItem.id).trim().toUpperCase();
                    const normalDesc = String(eqItem.text).trim().toUpperCase();
                    return ncDesc === targetText || normalDesc === targetText;
                });
                if (matchedItem) {
                    resolvedId = matchedItem.id;
                    console.log(`Reinspeção: Mapeou item importado "${itemId}" para o item do formulário "${resolvedId}"`);
                }
            }
            
            checklistData[resolvedId] = {
                status: itemData.status,
                observation: itemData.observation || ''
            };
        }
    }
    
    clearSignature();
    clearSignatureResponsavel();
    
    renderChecklistItems(equipment, currentCadastro);
    
    // Aplicar status salvos nos botões e observações do DOM
    setTimeout(() => {
        aplicarStatusSalvosDOM();
        
        // Também pre-selecionar o status do checklist (Ex: Interditado, etc.) no formulário
        if (original.statusChecklist) {
            currentStatusChecklist = original.statusChecklist;
            const btnStatus = document.querySelector(`button[onclick*="'${original.statusChecklist}'"]`);
            if (btnStatus) {
                setStatusChecklist(original.statusChecklist, btnStatus);
            }
        } else {
            currentStatusChecklist = null;
        }
    }, 80);
    
    showPage('pageChecklistForm');
    showToast('Reinspeção iniciada! Dados anteriores carregados.');
}

async function quickResolveReinspection(mode) {
    if (!currentEquipment) return;
    
    const items = getEffectiveItems(currentEquipment);
    let resolvedCount = 0;
    
    items.forEach(item => {
        const itemId = item.id;
        let shouldResolve = false;
        
        if (mode === 'all') {
            shouldResolve = true;
        } else if (mode === 'nc_only') {
            if (itensComFalhaAnterior.includes(String(itemId))) {
                shouldResolve = true;
            }
        }
        
        if (shouldResolve) {
            checklistData[itemId] = {
                status: 'C',
                observation: ''
            };
            resolvedCount++;
        }
    });
    
    // Atualizar DOM
    aplicarStatusSalvosDOM();
    
    // Auto-definir o status do checklist como "Liberado" se não sobrou nenhuma NC
    let temNC = false;
    for (const [id, data] of Object.entries(checklistData)) {
        if (data.status === 'NC') {
            temNC = true;
            break;
        }
    }
    
    const statusVal = temNC ? 'interditado' : 'liberado';
    const btnStatus = document.querySelector(`button[onclick*="'${statusVal}'"]`);
    if (btnStatus) {
        setStatusChecklist(statusVal, btnStatus);
    }
    
    showToast(`🔄 Reinspeção: ${resolvedCount} item(ns) marcado(s) como Conforme.`);
}

let pendingItemUpdate = null;

async function updateChecklistItem(checklistId, itemId, newStatus, btn) {
    const checklist = await getFromIndexedDB('checklists', checklistId);
    if (!checklist || !checklist.items[itemId]) return;
    
    const oldStatus = checklist.items[itemId].status;
    checklist.items[itemId].status = newStatus;
    
    const wasNC = oldStatus === 'NC';
    const isNC = newStatus === 'NC';
    const justResolved = wasNC && !isNC;
    
    if (justResolved) {
        checklist.items[itemId].resolved = true;
        checklist.items[itemId].resolvedAt = new Date().toISOString();
        
        const resolveObs = document.getElementById(`resolveObsInput-${itemId}`);
        const resolveBy = document.getElementById(`resolveByInput-${itemId}`);
        if (resolveObs) checklist.items[itemId].resolutionNote = resolveObs.value || '';
        if (resolveBy) checklist.items[itemId].resolvedBy = resolveBy.value || '';
    }
    
    if (isNC) {
        checklist.items[itemId].resolved = false;
        checklist.items[itemId].resolvedAt = null;
        checklist.items[itemId].resolutionNote = null;
        checklist.items[itemId].resolvedBy = null;
    }
    
    let conformes = 0, naoConformes = 0, na = 0;
    for (const [k, v] of Object.entries(checklist.items)) {
        if (k === '_form') continue;
        if (v.status === 'C') conformes++;
        else if (v.status === 'NC') naoConformes++;
        else if (v.status === 'NA') na++;
    }
    checklist.stats = { conformes, naoConformes, na, total: conformes + naoConformes + na };
    
    if (naoConformes === 0) {
        checklist.statusChecklist = 'liberado';
    } else {
        const hasHighRiskNC = Object.entries(checklist.items).some(([k, v]) => {
            if (k === '_form' || v.status !== 'NC') return false;
            const eqItem = checklist.equipment?.items?.find(i => i.id === k);
            return eqItem?.risk === 'high';
        });
        checklist.statusChecklist = hasHighRiskNC ? 'interditado' : 'liberado_restricao';
    }
    
    await saveToIndexedDB('checklists', checklist);
    
    if (justResolved) {
        showToast('Item marcado como resolvido!');
    } else {
        showToast('Status atualizado!');
    }
    
    viewChecklist(checklistId);
}

async function updateChecklistPrazo(checklistId, newPrazo) {
    let checklist = await getFromIndexedDB('checklists', checklistId);
    if (!checklist) {
        const numId = Number(checklistId);
        if (!isNaN(numId)) {
            checklist = await getFromIndexedDB('checklists', numId);
        }
    }
    if (!checklist) return;

    checklist.prazoAdequacao = newPrazo || null;
    checklist.synced = false;

    await saveToIndexedDB('checklists', checklist);
    showToast('Prazo de adequação atualizado!');
    viewChecklist(checklistId);
}

async function deleteChecklist(id) {
    if (!confirm('Tem certeza que deseja excluir este checklist?')) return;
    
    // Deletar no Supabase se estiver configurado
    if (isSupabaseConfigured()) {
        try {
            await supabaseFetch('checklists', {
                method: 'DELETE',
                query: '?id=eq.' + encodeURIComponent(id)
            });
            await supabaseFetch('nao_conformidades', {
                method: 'DELETE',
                query: '?checklist_id=eq.' + encodeURIComponent(id)
            });
            console.log('⚡ [Supabase] Checklist excluído definitivamente:', id);
        } catch (spErr) {
            console.error('Erro ao deletar checklist no Supabase:', spErr);
        }
    }


    
    await deleteFromIndexedDB('checklists', id);
    const numId = Number(id);
    if (!isNaN(numId)) {
        await deleteFromIndexedDB('checklists', numId);
    }
    
    // Remover do cache local para atualização imediata
    historyChecklistsCache = historyChecklistsCache.filter(c => String(c.id) !== String(id));
    
    showToast('Checklist excluído definitivamente');
    renderHistoryFiltered();
    showPage('pageHistory');
}

// ============================================
// DASHBOARD - GRÁFICOS
// ============================================

let chartInstances = {};

function destroyCharts() {
    Object.values(chartInstances).forEach(c => { if (c) c.destroy(); });
    chartInstances = {};
}

async function renderDashboardCharts() {
    destroyCharts();
    ['chartCardStatus', 'chartCardTipo', 'chartCardMeses', 'chartCardItens'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (typeof Chart === 'undefined') return;

    const checklists = await getAllFromIndexedDB('checklists');
    const cadastros = await getAllFromIndexedDB('cadastros');
    const { inicio, fim } = getDateRange();
    
    const selectedSetor = document.getElementById('reportFilterSetor')?.value || '';
    const selectedCategoria = document.getElementById('reportFilterCategoria')?.value || '';
    const selectedPatrimonio = document.getElementById('reportFilterPatrimonio')?.value || '';
    
    // Map patrimonio -> setor e categoria
    const cadastroByPatr = {};
    cadastros.forEach(c => {
        if (c.patrimonio) {
            cadastroByPatr[c.patrimonio.toUpperCase()] = c;
        }
    });
    
    // Helper function to apply filters to a list of checklists
    function filterChecklistArray(arr) {
        let result = arr;
        if (selectedSetor) {
            result = result.filter(c => {
                const cad = c.patrimonio ? cadastroByPatr[c.patrimonio.toUpperCase()] : null;
                return cad && cad.setor && cad.setor.trim() === selectedSetor;
            });
        }
        if (selectedCategoria) {
            result = result.filter(c => {
                const cad = c.patrimonio ? cadastroByPatr[c.patrimonio.toUpperCase()] : null;
                return cad && cad.categoria === selectedCategoria;
            });
        }
        if (selectedPatrimonio) {
            result = result.filter(c => c.patrimonio === selectedPatrimonio);
        }
        return result;
    }
    
    let checklistsMes = checklists.filter(c => { const d = parseLocalDate(c.date); return d >= inicio && d <= fim; });
    checklistsMes = filterChecklistArray(checklistsMes);
    
    if (checklistsMes.length === 0) return;

    const colors = { success: '#27ae60', danger: '#e74c3c', gray: '#95a5a6', primary: '#1a5276', primaryLight: '#2980b9' };

    let totalC = 0, totalNC = 0, totalNA = 0;
    checklistsMes.forEach(c => { totalC += c.stats.conformes; totalNC += c.stats.naoConformes; totalNA += c.stats.na; });

    if (totalC + totalNC + totalNA > 0) {
        document.getElementById('chartCardStatus').style.display = 'block';
        chartInstances.status = new Chart(document.getElementById('chartConformidade'), {
            type: 'doughnut',
            data: { labels: ['Conformes', 'Não Conformes', 'N/A'], datasets: [{ data: [totalC, totalNC, totalNA], backgroundColor: [colors.success, colors.danger, colors.gray], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } } }, cutout: '55%' }
        });
    }

    const typeCounts = {};
    checklistsMes.forEach(c => { const t = c.equipment?.name || 'Desconhecido'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
    const typeSorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    if (typeSorted.length > 0) {
        document.getElementById('chartCardTipo').style.display = 'block';
        chartInstances.tipo = new Chart(document.getElementById('chartPorTipo'), {
            type: 'bar',
            data: { labels: typeSorted.map(t => t[0]), datasets: [{ label: 'Checklists', data: typeSorted.map(t => t[1]), backgroundColor: colors.primaryLight, borderRadius: 6, barThickness: 20 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { font: { size: 11 } } } } }
        });
    }

    const meses = [], contagens = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        meses.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const ini = new Date(d.getFullYear(), d.getMonth(), 1);
        const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        
        let sublist = checklists.filter(c => { const dt = parseLocalDate(c.date); return dt >= ini && dt <= fim; });
        sublist = filterChecklistArray(sublist);
        contagens.push(sublist.length);
    }
    document.getElementById('chartCardMeses').style.display = 'block';
    chartInstances.meses = new Chart(document.getElementById('chartPorMes'), {
        type: 'line',
        data: { labels: meses, datasets: [{ label: 'Checklists', data: contagens, borderColor: colors.primary, backgroundColor: 'rgba(26,82,118,0.1)', fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: colors.primary }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const itemCounts = {};
    checklistsMes.forEach(c => { for (const [itemId, data] of Object.entries(c.items)) { if (itemId === '_form') continue; if (data.status === 'NC') { const n = ITEM_NAMES[itemId] || data.customText || itemId; itemCounts[n] = (itemCounts[n] || 0) + 1; } } });
    const itemsSorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (itemsSorted.length > 0) {
        document.getElementById('chartCardItens').style.display = 'block';
        chartInstances.itens = new Chart(document.getElementById('chartItensNC'), {
            type: 'bar',
            data: { labels: itemsSorted.map(i => i[0]), datasets: [{ label: 'Ocorrências', data: itemsSorted.map(i => i[1]), backgroundColor: itemsSorted.map((_, idx) => `rgba(231, 76, 60, ${1 - idx * 0.07})`), borderRadius: 6, barThickness: 18 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { font: { size: 10 } } } } }
        });
    }
}

let reportFilter = 'mes';
let reportFilterCustomFrom = null;
let reportFilterCustomTo = null;

function setReportFilter(filter) {
    reportFilter = filter;
    ['filterMes', 'filterSemana', 'filterTodos', 'filterCustom'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'status-btn na';
    });
    const activeMap = { mes: 'filterMes', semana: 'filterSemana', todos: 'filterTodos', custom: 'filterCustom' };
    const activeEl = document.getElementById(activeMap[filter]);
    if (activeEl) activeEl.className = 'status-btn c selected';

    const customDiv = document.getElementById('customDateFilter');
    if (customDiv) customDiv.style.display = filter === 'custom' ? 'block' : 'none';

    if (filter !== 'custom') {
        loadReports();
    }
}

function applyCustomDateFilter() {
    const from = document.getElementById('filterDateFrom').value;
    const to = document.getElementById('filterDateTo').value;
    if (from && to) {
        reportFilterCustomFrom = from;
        reportFilterCustomTo = to;
        loadReports();
    }
}

function applyReportPatrimonioFilter() {
    loadReports();
}

function clearReportFilters() {
    const selectSetor = document.getElementById('reportFilterSetor');
    const selectCategoria = document.getElementById('reportFilterCategoria');
    const selectPatrimonio = document.getElementById('reportFilterPatrimonio');
    
    if (selectSetor) selectSetor.value = "";
    if (selectCategoria) selectCategoria.value = "";
    if (selectPatrimonio) selectPatrimonio.value = "";
    
    setReportFilter('mes');
}

function getDateRange() {
    const now = new Date();
    const fimAjustado = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 23, 59, 59, 999);
    if (reportFilter === 'semana') {
        const inicio = new Date(now);
        inicio.setDate(now.getDate() - 7);
        inicio.setHours(0, 0, 0, 0);
        return { inicio, fim: fimAjustado };
    }
    if (reportFilter === 'custom' && reportFilterCustomFrom && reportFilterCustomTo) {
        const inicio = new Date(reportFilterCustomFrom + 'T00:00:00');
        const fim = new Date(reportFilterCustomTo + 'T23:59:59');
        return { inicio, fim };
    }
    if (reportFilter === 'todos') {
        return { inicio: new Date(2000, 0, 1), fim: fimAjustado };
    }
    return { inicio: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), fim: fimAjustado };
}

// ============================================
// RELATÓRIOS
// ============================================

// ============================================
// DETALHES DO STATUS
// ============================================

async function showStatusDetails(status) {
    const checklists = await getAllFromIndexedDB('checklists');
    const { inicio, fim } = getDateRange();
    const targetStatus = normalizarStatusChecklist(status);
    
    let checklistsMes = checklists.filter(c => {
        const d = parseLocalDate(c.date);
        const inDate = d >= inicio && d <= fim;
        const normStatus = normalizarStatusChecklist(c.statusChecklist, c);
        return inDate && normStatus === targetStatus;
    });

    // Se o filtro de data retornou 0 mas existem registros no banco, buscar TODOS do status
    if (checklistsMes.length === 0) {
        checklistsMes = checklists.filter(c => normalizarStatusChecklist(c.statusChecklist, c) === targetStatus);
    }
    
    const statusLabels = {
        interditado: { title: '🚫 Interditados', color: 'var(--danger)', bg: '#fadbd8' },
        liberado_restricao: { title: '⚠️ Liberados com Restrição', color: 'var(--warning)', bg: '#fdebd0' },
        liberado: { title: '✅ Liberados', color: 'var(--success)', bg: '#d5f5e3' }
    };
    
    const info = statusLabels[targetStatus] || statusLabels.interditado;
    
    let html = `
        <div style="background: ${info.bg}; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
            <h3 style="color: ${info.color}; margin: 0;">${info.title}</h3>
            <p style="color: var(--text-light); margin: 4px 0 0;">${checklistsMes.length} checklist(s) encontrado(s)</p>
        </div>
    `;
    
    if (checklistsMes.length === 0) {
        html += `<div class="empty-state"><div class="icon">✅</div><div class="text">Nenhum checklist com este status</div></div>`;
    } else {
        checklistsMes.forEach(c => {
            const data = formatSimpleDate(c.date);
            
            // Itens não conformes
            let itensNC = [];
            for (const [itemId, itemData] of Object.entries(c.items)) {
                if (itemId === '_form') continue;
                if (itemData.status === 'NC') {
                    const itemNome = ITEM_NAMES[itemId] || itemData.customText || itemId;
                    itensNC.push({ nome: getNCDescription(itemNome, itemId), obs: itemData.observation || '' });
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
        if (reportFilter === 'semana') {
            tituloEl.textContent = `📊 Painel - Última Semana`;
        } else if (reportFilter === 'todos') {
            tituloEl.textContent = `📊 Painel - Todos os Dados`;
        } else if (reportFilter === 'custom') {
            tituloEl.textContent = `📊 Painel - Período Personalizado`;
        } else {
            tituloEl.textContent = `📊 Painel do Mês - ${meses[agora.getMonth()]} ${agora.getFullYear()}`;
        }
    }
    const checklists = await getAllFromIndexedDB('checklists');
    const issues = await getAllFromIndexedDB('issues');
    const cadastros = await getAllFromIndexedDB('cadastros');
    
    const equipamentosAtivos = cadastros.filter(c => c.ativo !== false && c.tipo !== 'colaborador');
    
    const selectSetor = document.getElementById('reportFilterSetor');
    const selectCategoria = document.getElementById('reportFilterCategoria');
    const selectPatrimonio = document.getElementById('reportFilterPatrimonio');
    
    // 1. Popular Setor Select
    if (selectSetor) {
        const valAnterior = selectSetor.value;
        selectSetor.innerHTML = '<option value="">Todos os Setores...</option>';
        
        const setores = new Set();
        equipamentosAtivos.forEach(c => {
            if (c.setor) setores.add(c.setor.trim());
        });
        const sortedSetores = Array.from(setores).sort();
        sortedSetores.forEach(setor => {
            const opt = document.createElement('option');
            opt.value = setor;
            opt.textContent = setor;
            selectSetor.appendChild(opt);
        });
        selectSetor.value = valAnterior;
        if (selectSetor.value !== valAnterior) selectSetor.value = "";
    }
    
    // 2. Popular Categoria Select
    if (selectCategoria) {
        const valAnterior = selectCategoria.value;
        selectCategoria.innerHTML = '<option value="">Todas as Categorias...</option>';
        
        const categorias = new Set();
        equipamentosAtivos.forEach(c => {
            if (c.categoria) categorias.add(c.categoria.trim());
        });
        const sortedCategorias = Array.from(categorias).sort();
        sortedCategorias.forEach(catId => {
            const opt = document.createElement('option');
            opt.value = catId;
            
            let catName = catId;
            for (const [tipo, list] of Object.entries(EQUIPMENT_TYPES)) {
                const found = list.find(e => e.id === catId);
                if (found) {
                    catName = found.name;
                    break;
                }
            }
            opt.textContent = catName;
            selectCategoria.appendChild(opt);
        });
        selectCategoria.value = valAnterior;
        if (selectCategoria.value !== valAnterior) selectCategoria.value = "";
    }
    
    const selectedSetor = selectSetor ? selectSetor.value : '';
    const selectedCategoria = selectCategoria ? selectCategoria.value : '';
    
    // 3. Popular Patrimonio Select (filtrado por Setor e Categoria se selecionados)
    let filteredEquipsForSelect = [...equipamentosAtivos];
    if (selectedSetor) {
        filteredEquipsForSelect = filteredEquipsForSelect.filter(c => c.setor && c.setor.trim() === selectedSetor);
    }
    if (selectedCategoria) {
        filteredEquipsForSelect = filteredEquipsForSelect.filter(c => c.categoria === selectedCategoria);
    }
    
    if (selectPatrimonio) {
        const valAnterior = selectPatrimonio.value;
        selectPatrimonio.innerHTML = '<option value="">Todos os Equipamentos...</option>';
        const sortedEquips = [...filteredEquipsForSelect].sort((a, b) => (a.patrimonio || '').localeCompare(b.patrimonio || ''));
        sortedEquips.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.patrimonio;
            opt.textContent = `${eq.patrimonio}${eq.placa ? ' [' + eq.placa + ']' : ''} - ${eq.nome}`;
            selectPatrimonio.appendChild(opt);
        });
        selectPatrimonio.value = valAnterior;
        if (selectPatrimonio.value !== valAnterior) selectPatrimonio.value = "";
    }
    
    const selectedPatrimonio = selectPatrimonio ? selectPatrimonio.value : '';
    
    const { inicio, fim } = getDateRange();
    const checklistsMes = checklists.filter(c => { const d = parseLocalDate(c.date); return d >= inicio && d <= fim; });
    
    // Filtrar equipamentos ativos para cálculos de pendentes/realizados
    let filteredEquips = [...equipamentosAtivos];
    if (selectedSetor) {
        filteredEquips = filteredEquips.filter(e => e.setor && e.setor.trim() === selectedSetor);
    }
    if (selectedCategoria) {
        filteredEquips = filteredEquips.filter(e => e.categoria === selectedCategoria);
    }
    if (selectedPatrimonio) {
        filteredEquips = filteredEquips.filter(e => e.patrimonio === selectedPatrimonio);
    }
    
    // Equipamentos verificados
    const patrimoniosVerificados = new Set(checklistsMes.map(c => c.patrimonio));
    
    let pendentes = filteredEquips.filter(e => !patrimoniosVerificados.has(e.patrimonio));
    let realizados = filteredEquips.filter(e => patrimoniosVerificados.has(e.patrimonio));
    
    // Map patrimonio -> setor e categoria
    const cadastroByPatr = {};
    cadastros.forEach(c => {
        if (c.patrimonio) {
            cadastroByPatr[c.patrimonio.toUpperCase()] = c;
        }
    });
    
    // Filtrar checklists do período
    let checklistsFiltrados = checklistsMes;
    if (selectedSetor) {
        checklistsFiltrados = checklistsFiltrados.filter(c => {
            const cad = c.patrimonio ? cadastroByPatr[c.patrimonio.toUpperCase()] : null;
            return cad && cad.setor && cad.setor.trim() === selectedSetor;
        });
    }
    if (selectedCategoria) {
        checklistsFiltrados = checklistsFiltrados.filter(c => {
            const cad = c.patrimonio ? cadastroByPatr[c.patrimonio.toUpperCase()] : null;
            return cad && cad.categoria === selectedCategoria;
        });
    }
    if (selectedPatrimonio) {
        checklistsFiltrados = checklistsFiltrados.filter(c => c.patrimonio === selectedPatrimonio);
    }
    
    // Totais
    let totalC = 0, totalNC = 0;
    const itemCounts = {};
    const typeCounts = {};
    const statusCounts = { interditado: 0, liberado_restricao: 0, liberado: 0 };
    
    checklistsFiltrados.forEach(c => {
        const stats = recalcularStatsChecklist(c);
        c.stats = stats;

        totalC += stats.conformes;
        totalNC += stats.naoConformes;
        
        // Contar por tipo
        const type = c.equipment?.name || c.nome || 'Desconhecido';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        
        // Contar status de interdição
        const stNorm = normalizarStatusChecklist(c.statusChecklist, c);
        statusCounts[stNorm] = (statusCounts[stNorm] || 0) + 1;
        
        // Contar não conformidades por item
        for (const [itemId, data] of Object.entries(c.items)) {
            if (itemId === '_form') continue;
            if (data.status === 'NC') {
                const itemNameRaw = ITEM_NAMES[itemId] || data.customText || itemId;
                const itemName = getNCDescription(itemNameRaw, itemId);
                itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
            }
        }
    });
    
    // Atualizar resumo
    document.getElementById('totalEquipamentos').textContent = filteredEquips.length;
    document.getElementById('totalRealizados').textContent = realizados.length;
    document.getElementById('totalPendentes').textContent = pendentes.length;
    
    // Status do mês
    document.getElementById('statusInterditados').textContent = statusCounts.interditado || 0;
    document.getElementById('statusRestricao').textContent = statusCounts.liberado_restricao || 0;
    document.getElementById('statusLiberados').textContent = statusCounts.liberado || 0;
    
    // Pendentes - lista
    const pendentesContainer = document.getElementById('pendentesList');
    if (pendentes.length === 0 && filteredEquips.length > 0) {
        pendentesContainer.innerHTML = `<div style="padding: 12px; background: #d5f5e3; border-radius: 8px; text-align: center; color: #1e8449; font-weight: 600;">✓ Todos os equipamentos filtrados foram verificados este mês!</div>`;
    } else if (pendentes.length === 0) {
        pendentesContainer.innerHTML = `<div class="empty-state"><div class="text">Nenhum equipamento cadastrado corresponde ao filtro</div></div>`;
    } else {
        pendentesContainer.innerHTML = pendentes.map(p => `
            <div class="risk-list-item" style="border-left-color: var(--warning); cursor: pointer; transition: transform 0.2s;" 
                 data-patrimonio="${p.patrimonio}"
                 onclick="startChecklistFromPending(this.dataset.patrimonio)"
                 onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'">
                <div class="risk-info">
                    <div class="risk-item-name" style="font-size: 13px;">${p.patrimonio}</div>
                    <div class="risk-count" style="font-size: 12px;">${p.nome || ''}</div>
                    <div class="risk-count">${p.empresa || ''}</div>
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
        issuesContainer.innerHTML = issues.slice(0, 50).map(i => {
            const statusVal = String(i.status || 'aberto').toLowerCase().trim();
            const isResolvido = statusVal === 'resolvido' || statusVal === 'encerrado';
            const isEmAndamento = statusVal === 'em_andamento' || statusVal === 'em andamento';
            
            const borderColor = isResolvido ? 'var(--success)' : isEmAndamento ? '#f39c12' : 'var(--danger)';
            const statusBadgeHtml = isResolvido ?
                `<span style="font-size: 10px; padding: 2px 8px; border-radius: 8px; background: #d5f5e3; color: #1e8449; font-weight: 700;">🟢 Encerrado</span>` :
                isEmAndamento ?
                `<span style="font-size: 10px; padding: 2px 8px; border-radius: 8px; background: #fef9e7; color: #d4ac0d; font-weight: 700;">🟡 Em Andamento</span>` :
                `<span style="font-size: 10px; padding: 2px 8px; border-radius: 8px; background: #fadbd8; color: #c0392b; font-weight: 700;">🔴 Aberto</span>`;

            return `
            <div class="risk-list-item" onclick="toggleIssueDetails(this)" style="cursor: pointer; display: block; border-left-color: ${borderColor}; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start; width: 100%;">
                    <div class="risk-info" style="overflow: hidden; flex: 1;">
                        <div class="risk-item-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100vw - 120px); font-weight: 600;">${CATEGORY_ICONS[i.type] || '📦'} ${escapeHTML(i.description)}</div>
                        <div class="risk-count" style="margin-top: 2px;">${escapeHTML(i.reporter || 'Anônimo')} • ${formatSimpleDate(i.date)}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-left: 8px;">
                        ${statusBadgeHtml}
                        <div class="chevron-icon" style="font-size: 11px; color: var(--text-light); transition: transform 0.2s;">▼</div>
                    </div>
                </div>
                
                <!-- Detalhes expandidos -->
                <div class="issue-details" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 13px;">
                    <p style="margin: 0 0 6px; font-weight: 600; color: var(--text);">Descrição Completa:</p>
                    <p style="margin: 0 0 12px; color: var(--text-light); line-height: 1.45; white-space: pre-wrap; font-size: 12.5px; background: #fdfdfd; padding: 8px; border-radius: 6px; border: 1px solid #eee;">${escapeHTML(i.description)}</p>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11.5px; background: var(--bg); padding: 10px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 12px;">
                        <div><strong>Tipo:</strong> ${escapeHTML(i.type || 'N/A')}</div>
                        <div><strong>Identificação:</strong> ${escapeHTML(i.identificacao || 'N/A')}</div>
                        <div><strong>Relatado por:</strong> ${escapeHTML(i.reporter || 'N/A')}</div>
                        <div><strong>Cargo/Função:</strong> ${escapeHTML(i.role || 'N/A')}</div>
                        <div><strong>Data Registro:</strong> ${formatSimpleDate(i.date)}</div>
                        <div><strong>Status Atual:</strong> ${statusBadgeHtml}</div>
                    </div>

                    <!-- Alteração de Status em Tempo Real -->
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 10px;">
                        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-light); margin-bottom: 6px;">ALTERAR STATUS DO RELATO:</label>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <select id="select_status_${i.id}" onclick="event.stopPropagation()" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border); font-weight: 600; font-size: 12px; background: white; cursor: pointer;">
                                <option value="aberto" ${statusVal === 'aberto' || statusVal === 'pendente' ? 'selected' : ''}>🔴 Aberto (Pendente)</option>
                                <option value="em_andamento" ${isEmAndamento ? 'selected' : ''}>🟡 Em Andamento (Em Tratamento)</option>
                                <option value="resolvido" ${isResolvido ? 'selected' : ''}>🟢 Encerrado (Resolvido)</option>
                            </select>
                            <button onclick="updateIssueStatus('${i.id}', document.getElementById('select_status_${i.id}').value, event)" style="background: #27ae60; color: white; border: none; border-radius: 6px; padding: 8px 14px; font-weight: 700; font-size: 12px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                                💾 Salvar Status
                            </button>
                        </div>
                    </div>

                    <!-- Botões de Ação: Editar e Excluir -->
                    <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
                        <button onclick="editIssueModal('${i.id}', event)" style="background: var(--primary); color: white; border: none; border-radius: 6px; padding: 8px 12px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            ✏️ Editar
                        </button>
                        <button onclick="deleteIssuePermanente('${i.id}', event)" style="background: var(--danger); color: white; border: none; border-radius: 6px; padding: 8px 12px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    renderDashboardCharts();
}

async function updateIssueStatus(id, newStatus, event) {
    if (event) event.stopPropagation();
    const issue = await getFromIndexedDB('issues', id);
    if (!issue) {
        showToast('❌ Erro: Relato não encontrado no banco local');
        return;
    }

    issue.status = newStatus;
    issue.synced = false;

    await saveToIndexedDB('issues', issue);

    if (navigator.onLine && isSupabaseConfigured()) {
        sincronizarItemIndividualSupabase('issues', issue);
    }

    const statusLabels = {
        'aberto': '🔴 Aberto (Pendente)',
        'em_andamento': '🟡 Em Andamento',
        'resolvido': '🟢 Encerrado (Resolvido)'
    };

    showToast(`✅ Status alterado para ${statusLabels[newStatus] || newStatus}`);
    renderReports();
}

async function editIssueModal(id, event) {
    if (event) event.stopPropagation();
    const issue = await getFromIndexedDB('issues', id);
    if (!issue) {
        showToast('Relato não encontrado');
        return;
    }

    const statusVal = String(issue.status || 'aberto').toLowerCase().trim();

    const html = `
        <div style="padding: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <h3 style="margin: 0; font-size: 16px; color: var(--primary);">✏️ Editar Relato de Problema</h3>
                <button onclick="closeModal()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
            </div>
            
            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: bold;">Tipo de Relato</label>
                <select id="editIssueType" class="form-select" style="width: 100%; padding: 8px; border-radius: 6px;">
                    <option value="infraestrutura" ${issue.type === 'infraestrutura' ? 'selected' : ''}>🧱 Infraestrutura / Acessos</option>
                    <option value="equipamento" ${issue.type === 'equipamento' ? 'selected' : ''}>🚜 Equipamento / Veículo</option>
                    <option value="epi" ${issue.type === 'epi' ? 'selected' : ''}>🦺 EPI / EPC</option>
                    <option value="comportamental" ${issue.type === 'comportamental' ? 'selected' : ''}>⚠️ Atóxico / Comportamental</option>
                    <option value="outro" ${issue.type === 'outro' ? 'selected' : ''}>📦 Outros</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: bold;">Identificação / Local</label>
                <input type="text" id="editIssueIdentificacao" class="form-input" style="width: 100%; padding: 8px; border-radius: 6px;" value="${issue.identificacao || ''}">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: bold;">Descrição do Problema *</label>
                <textarea id="editIssueDescription" class="form-textarea" style="width: 100%; padding: 8px; border-radius: 6px; min-height: 80px;">${issue.description || ''}</textarea>
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" style="font-size: 12px; font-weight: bold;">Status da Ocorrência</label>
                <select id="editIssueStatus" class="form-select" style="width: 100%; padding: 8px; border-radius: 6px; font-weight: bold;">
                    <option value="aberto" ${statusVal === 'aberto' || statusVal === 'pendente' ? 'selected' : ''}>🔴 Aberto (Pendente)</option>
                    <option value="em_andamento" ${statusVal === 'em_andamento' || statusVal === 'em andamento' ? 'selected' : ''}>🟡 Em Andamento (Em Tratamento)</option>
                    <option value="resolvido" ${statusVal === 'resolvido' || statusVal === 'encerrado' ? 'selected' : ''}>🟢 Encerrado (Resolvido)</option>
                </select>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button onclick="saveIssueEdit('${id}')" class="save-btn" style="flex: 1; padding: 10px; font-weight: bold;">Salvar Alterações</button>
                <button onclick="closeModal()" class="save-btn" style="background: #95a5a6; padding: 10px;">Cancelar</button>
            </div>
        </div>
    `;

    showModal(html);
}

async function saveIssueEdit(id) {
    const issue = await getFromIndexedDB('issues', id);
    if (!issue) return;

    const newType = document.getElementById('editIssueType').value;
    const newIdentificacao = document.getElementById('editIssueIdentificacao').value.trim();
    const newDesc = document.getElementById('editIssueDescription').value.trim();
    const newStatus = document.getElementById('editIssueStatus').value;

    if (!newDesc) {
        showToast('Preencha a descrição do problema');
        return;
    }

    issue.type = newType;
    issue.identificacao = newIdentificacao;
    issue.description = newDesc;
    issue.status = newStatus;
    issue.synced = false;

    await saveToIndexedDB('issues', issue);

    if (navigator.onLine && isSupabaseConfigured()) {
        sincronizarItemIndividualSupabase('issues', issue);
    }

    closeModal();
    showToast('Relato de problema atualizado!');
    renderReports();
}

async function deleteIssuePermanente(id, event) {
    if (event) event.stopPropagation();
    const issue = await getFromIndexedDB('issues', id);
    const descText = issue ? `"${issue.description || ''}"` : id;

    if (!confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o relato ${descText} da planilha Google e do aplicativo?`)) return;



    await deleteFromIndexedDB('issues', id);
    showToast('Relato de problema excluído com sucesso');
    renderReports();
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
        const date = formatSimpleDate(c.date);
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

async function renderDeadlineAlerts() {
    const container = document.getElementById('deadlineAlertsList');
    const card = document.getElementById('deadlineAlertsCard');
    if (!container || !card) return;
    
    try {
        const checklists = await getAllFromIndexedDB('checklists');
        card.style.display = 'block'; // Always keep the card visible to prove the feature is loaded
        
        if (!checklists || checklists.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 15px 0;">
                    <div class="icon" style="font-size: 24px; margin-bottom: 5px;">✅</div>
                    <div class="text" style="font-size: 13px; color: var(--text-light);">Nenhum equipamento interditado ou com prazo pendente</div>
                </div>`;
            return;
        }
        
        // Group checklists by patrimonio and get the latest one for each
        const latestByPatrimonio = {};
        checklists.forEach(record => {
            const patr = String(record.patrimonio || '').trim().toUpperCase();
            if (!patr) return;
            
            const currentRecord = latestByPatrimonio[patr];
            const recordTime = record.timestamp ? new Date(record.timestamp).getTime() : 0;
            const currentTime = currentRecord && currentRecord.timestamp ? new Date(currentRecord.timestamp).getTime() : 0;
            
            if (!currentRecord || recordTime > currentTime) {
                latestByPatrimonio[patr] = record;
            }
        });
        
        const alerts = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        Object.values(latestByPatrimonio).forEach(record => {
            if ((record.statusChecklist === 'interditado' || record.statusChecklist === 'liberado_restricao') && record.prazoAdequacao) {
                const deadline = parseLocalDate(record.prazoAdequacao);
                deadline.setHours(0, 0, 0, 0);
                
                const diffTime = deadline.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Show alerts for expired (< 0), today (0), tomorrow (1), and next 3 days
                if (diffDays <= 3) {
                    alerts.push({
                        record,
                        diffDays
                    });
                }
            }
        });
        
        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 15px 0;">
                    <div class="icon" style="font-size: 24px; margin-bottom: 5px;">✅</div>
                    <div class="text" style="font-size: 13px; color: var(--text-light);">Nenhum equipamento interditado ou com prazo pendente</div>
                </div>`;
            return;
        }
        
        // Sort alerts: expired first, then today, then tomorrow, then upcoming
        alerts.sort((a, b) => a.diffDays - b.diffDays);
        
        container.innerHTML = alerts.map(({ record, diffDays }) => {
            // Find NC items
            const itemsNC = [];
            if (record.items) {
                for (const [itemId, itemData] of Object.entries(record.items)) {
                    if (itemData.status === 'NC') {
                        const desc = getNCDescription(ITEM_NAMES[itemId] || itemId, itemId);
                        itemsNC.push(desc);
                    }
                }
            }
            const itemsText = itemsNC.length > 0 ? itemsNC.join(', ') : 'itens gerais';
            
            const color = diffDays < 0 ? '#e74c3c' : (diffDays === 0 ? '#e74c3c' : (diffDays === 1 ? '#f39c12' : '#3498db'));
            const bg = diffDays < 0 ? '#fdf2f2' : (diffDays === 0 ? '#fdf2f2' : (diffDays === 1 ? '#fef9e7' : '#ebf5fb'));
            const border = diffDays < 0 ? '#f5b7b1' : (diffDays === 0 ? '#f5b7b1' : (diffDays === 1 ? '#f9e79f' : '#a9cce3'));
            const icon = diffDays < 0 ? '🚫' : (diffDays === 0 ? '🔴' : (diffDays === 1 ? '🟡' : '🔵'));
            
            let messageText = '';
            if (diffDays < 0) {
                messageText = `⚠️ <strong>Prazo Expirado!</strong> O período de correção expirou há ${Math.abs(diffDays)} dia(s).`;
            } else if (diffDays === 0) {
                messageText = `🔴 <strong>Expira Hoje!</strong> Hoje é o último dia para adequação.`;
            } else if (diffDays === 1) {
                messageText = `🟡 <strong>Expira Amanhã!</strong> Amanhã é o último dia para adequação.`;
            } else {
                messageText = `🔵 <strong>Prazo Próximo:</strong> Restam ${diffDays} dias para adequação.`;
            }
            
            return `
                <div style="padding: 14px; background: ${bg}; border-left: 5px solid ${color}; border-top: 1px solid ${border}; border-right: 1px solid ${border}; border-bottom: 1px solid ${border}; border-radius: 8px; font-size: 13px; color: #2c3e50; line-height: 1.5; display: flex; align-items: flex-start; gap: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="font-size: 18px; line-height: 1; padding-top: 2px;">${icon}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; margin-bottom: 4px;">
                            <span style="font-weight: 700; color: #2c3e50; font-size: 14px;">${record.nome} (${record.patrimonio})</span>
                            <span style="font-size: 11px; background: rgba(255,255,255,0.7); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.05); font-weight: 500;">Prazo: ${formatSimpleDate(record.prazoAdequacao)}</span>
                        </div>
                        <div style="font-size: 12px; color: #34495e; margin-bottom: 4px;">${messageText}</div>
                        <div style="font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.5); padding: 6px; border-radius: 4px; border: 1px dotted rgba(0,0,0,0.08);">
                            <strong>Itens Pendentes:</strong> ${itemsText}
                        </div>
                        <div style="font-size: 11px; color: #95a5a6; margin-top: 4px; display: flex; justify-content: space-between;">
                            <span>TST: ${record.sst || '—'}</span>
                            <span>Encarregado: ${record.responsavel || '—'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        card.style.display = 'block';
    } catch (e) {
        console.error('Erro ao renderizar lembretes de prazos:', e);
        card.style.display = 'none';
    }
}

async function loadTopRisks() {
    const checklists = await getAllFromIndexedDB('checklists');
    const container = document.getElementById('topRisks');
    
    const itemCounts = {};
    checklists.forEach(c => {
        for (const [itemId, data] of Object.entries(c.items)) {
            if (itemId === '_form') continue;
            if (data.status === 'NC') {
                const itemNameRaw = ITEM_NAMES[itemId] || data.customText || itemId;
                const itemName = getNCDescription(itemNameRaw, itemId);
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
                    const itemNameRaw = ITEM_NAMES[itemId] || data.customText || itemId;
                    const itemName = getNCDescription(itemNameRaw, itemId);
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
    
    const cad = c.patrimonio ? await getFromIndexedDB('cadastros', c.patrimonio) : null;
    const placa = cad ? cad.placa : '';

    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
        showToast('Biblioteca PDF não carregada. Tente novamente.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header Accent Bar
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(15, y, pageWidth - 30, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('CHECKLIST DE SEGURANÇA DO TRABALHO', pageWidth / 2, y + 7.5, { align: 'center' });
    y += 17;

    // Helper to draw bold key with normal value
    function drawField(label, value, x, yVal) {
        doc.setFont(undefined, 'bold');
        doc.text(label, x, yVal);
        const labelWidth = doc.getTextWidth(label);
        doc.setFont(undefined, 'normal');
        doc.text(String(value || ''), x + labelWidth + 2, yVal);
    }

    // Metadata Box
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.rect(15, y, pageWidth - 30, 48, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // Slate 900

    let innerY = y + 7;
    drawField('Data: ', formatSimpleDate(c.date), 20, innerY);
    drawField('Equipamento: ', c.nome, 20, innerY + 6);
    drawField('Patrimônio: ', c.patrimonio, 20, innerY + 12);
    drawField('Empresa: ', c.empresa, 20, innerY + 18);
    drawField('Placa: ', placa || 'N/A', 20, innerY + 24);

    const col2X = pageWidth / 2 + 10;
    drawField('Operador: ', c.operador, col2X, innerY);
    drawField('Encarregado: ', c.responsavel, col2X, innerY + 6);
    drawField('Resp. SST: ', c.sst || 'N/A', col2X, innerY + 12);

    // Draw status badge
    doc.setFont(undefined, 'bold');
    doc.text('Status:', col2X, innerY + 18);
    const statusText = c.statusChecklist || 'Pendente';
    let statusColor = [100, 116, 139]; // grey
    if (statusText === 'Liberado') {
        statusColor = [16, 185, 129]; // green
    } else if (statusText === 'Liberado com Restrição') {
        statusColor = [245, 158, 11]; // orange
    } else if (statusText === 'Interditado') {
        statusColor = [239, 68, 68]; // red
    }
    doc.setFillColor(...statusColor);
    const labelWidth = doc.getTextWidth('Status:');
    doc.rect(col2X + labelWidth + 3, innerY + 14.5, 45, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text(statusText, col2X + labelWidth + 25.5, innerY + 18, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    drawField('Resumo: ', `C: ${c.stats.conformes} | NC: ${c.stats.naoConformes} | N/A: ${c.stats.na}`, col2X, innerY + 24);

    y += 56;

    // Items table header
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('ITEM DE VERIFICAÇÃO', 18, y + 5.5);
    doc.text('STATUS', pageWidth - 18, y + 5.5, { align: 'right' });
    y += 8;

    doc.setTextColor(15, 23, 42);
    let isAlternate = false;

    for (const [itemId, data] of Object.entries(c.items)) {
        if (itemId === '_form') continue;

        const itemName = ITEM_NAMES[itemId] || data.customText || itemId;
        const itemLines = doc.splitTextToSize(itemName, pageWidth - 70);
        let rowHeight = itemLines.length * 4.5 + 4;
        
        if (data.observation) {
            rowHeight += 5;
        }
        if (data.resolved) {
            rowHeight += 4;
        }

        if (y + rowHeight > 275) {
            doc.addPage();
            y = 15;
            // Draw table header on new page
            doc.setFillColor(15, 23, 42); // Slate 900
            doc.rect(15, y, pageWidth - 30, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.text('ITEM DE VERIFICAÇÃO', 18, y + 5.5);
            doc.text('STATUS', pageWidth - 18, y + 5.5, { align: 'right' });
            y += 8;
        }

        // Row background
        if (isAlternate) {
            doc.setFillColor(248, 250, 252); // Slate 50
            doc.rect(15, y, pageWidth - 30, rowHeight, 'F');
        }
        isAlternate = !isAlternate;

        // Row border bottom
        doc.setDrawColor(241, 245, 249); // Slate 100
        doc.line(15, y + rowHeight, pageWidth - 15, y + rowHeight);

        // Print item name
        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(itemLines, 18, y + 4.5);

        // Print Status Badge
        const status = data.status === 'C' ? 'Conforme' : data.status === 'NC' ? 'Não Conforme' : 'N/A';
        const badgeColor = data.status === 'C' ? [16, 185, 129] : data.status === 'NC' ? [239, 68, 68] : [100, 116, 139];
        
        doc.setFillColor(...badgeColor);
        doc.rect(pageWidth - 45, y + 1.5, 30, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(7.5);
        doc.text(status, pageWidth - 30, y + 5.2, { align: 'center' });

        let innerYItem = y + itemLines.length * 4.5 + 4.5;
        if (data.observation) {
            doc.setTextColor(100, 116, 139);
            doc.setFont(undefined, 'italic');
            doc.setFontSize(8);
            doc.text(`Obs: ${data.observation}`, 22, innerYItem);
            innerYItem += 5;
        }

        if (data.resolved) {
            doc.setTextColor(16, 185, 129);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            const resText = `✓ Resolvido${data.resolvedAt ? ' em ' + new Date(data.resolvedAt).toLocaleDateString('pt-BR') : ''}${data.resolvedBy ? ' por ' + data.resolvedBy : ''}`;
            doc.text(resText, 22, innerYItem);
        }

        y += rowHeight;
    }

    if (c.observacoes) {
        y += 8;
        if (y > 260) { doc.addPage(); y = 15; }
        doc.setFillColor(254, 243, 199); // Amber 100
        doc.setDrawColor(252, 211, 77); // Amber 300
        doc.rect(15, y, pageWidth - 30, 18, 'FD');
        doc.setTextColor(180, 83, 9); // Amber 800
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text('Observações Gerais:', 18, y + 5);
        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8.5);
        const obsLines = doc.splitTextToSize(c.observacoes, pageWidth - 36);
        doc.text(obsLines, 18, y + 10);
        y += 22;
    }

    // Side-by-side signatures
    y += 10;
    if (y > 240) { doc.addPage(); y = 15; }

    const colWidth = (pageWidth - 40) / 2;

    // Left Column: Resp. SST
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Resp. Segurança do Trabalho:', 15, y);
    doc.setFont(undefined, 'normal');
    if (c.sst) {
        doc.text(c.sst, 15, y + 5);
    }
    if (c.signature) {
        try {
            doc.addImage(c.signature, 'PNG', 15, y + 8, 60, 22);
        } catch (e) {
            doc.setDrawColor(200);
            doc.rect(15, y + 8, 60, 22);
            doc.text('Assinatura Digital', 45, y + 20, { align: 'center' });
        }
    } else {
        doc.setDrawColor(203, 213, 225);
        doc.line(15, y + 25, 15 + colWidth - 10, y + 25);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('(Sem assinatura registrada)', 15, y + 29);
    }

    // Right Column: Operator/Supervisor/Encarregado
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Encarregado / Responsável:', 15 + colWidth + 10, y);
    doc.setFont(undefined, 'normal');
    if (c.responsavel) {
        doc.text(c.responsavel, 15 + colWidth + 10, y + 5);
    }
    if (c.signatureResponsavel) {
        try {
            doc.addImage(c.signatureResponsavel, 'PNG', 15 + colWidth + 10, y + 8, 60, 22);
        } catch (e) {
            doc.setDrawColor(200);
            doc.rect(15 + colWidth + 10, y + 8, 60, 22);
            doc.text('Assinatura Digital', 15 + colWidth + 40, y + 20, { align: 'center' });
        }
    } else {
        doc.setDrawColor(203, 213, 225);
        doc.line(15 + colWidth + 10, y + 25, pageWidth - 15, y + 25);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('(Sem assinatura registrada)', 15 + colWidth + 10, y + 29);
    }

    // Footers and Page Numbers on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.line(15, 285, pageWidth - 15, 285);
        
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont(undefined, 'normal');
        doc.text('App Checklist de Segurança - Emissão via Dispositivo Móvel (Offline)', 15, 290);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, 290, { align: 'right' });
    }

    doc.save(`checklist_${c.patrimonio || 'item'}_${c.date}.pdf`);
    showToast('PDF exportado!');
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
    const versionEl = document.getElementById('versionDisplay');
    if (versionEl) versionEl.textContent = APP_VERSION;

    // Configurações Supabase
    const spUrl = getSupabaseUrl();
    const spKey = getSupabaseKey();
    const spUrlInput = document.getElementById('supabaseUrlInput');
    const spKeyInput = document.getElementById('supabaseKeyInput');
    if (spUrlInput) spUrlInput.value = spUrl;
    if (spKeyInput) spKeyInput.value = spKey;

    const spStatusCard = document.getElementById('supabaseStatusCard');
    const spStatusText = document.getElementById('supabaseStatusText');
    const spStatusDetail = document.getElementById('supabaseStatusDetail');

    if (spStatusCard && spStatusText) {
        if (isSupabaseConfigured()) {
            spStatusCard.style.background = '#d1fae5';
            spStatusText.textContent = '⚡ Supabase Configurado & Ativo';
            spStatusText.style.color = '#065f46';
            const lastSpSync = localStorage.getItem('last_supabase_sync');
            const lastSpStr = lastSpSync ? new Date(lastSpSync).toLocaleString('pt-BR') : 'Nunca';
            if (spStatusDetail) spStatusDetail.textContent = `Banco PostgreSQL Ativo | Última Sync: ${lastSpStr}`;
        } else {
            spStatusCard.style.background = '#fef3c7';
            spStatusText.textContent = '⚠️ Supabase Pendente de Configuração';
            spStatusText.style.color = '#92400e';
            if (spStatusDetail) spStatusDetail.textContent = 'Insira a URL e a Anon Key do seu projeto Supabase acima.';
        }
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

async function saveSupabaseConfig() {
    const url = document.getElementById('supabaseUrlInput')?.value.trim();
    const key = document.getElementById('supabaseKeyInput')?.value.trim();
    if (!url || !key) {
        showToast('Preencha a URL e a Anon Key do Supabase');
        return;
    }
    setSupabaseConfig(url, key);
    showToast('Configuração do Supabase salva com sucesso!');
    loadConfigPage();
}

async function testSupabaseConnection() {
    if (!isSupabaseConfigured()) {
        showToast('Configure a URL e a Key do Supabase primeiro');
        return;
    }
    showToast('Testando conexão com o Supabase...');
    const res = await supabaseFetch('cadastros', { query: '?select=count' });
    if (res.success) {
        showToast('✅ Conexão com Supabase estabelecida com sucesso!');
    } else {
        showToast('❌ Erro na conexão Supabase: ' + res.error);
    }
}

function converterParaSupabase(store, item) {
    if (store === 'cadastros') {
        return {
            id: String(item.id || item.patrimonio || '').trim().toUpperCase(),
            tipo: item.tipo || '',
            categoria: item.categoria || '',
            nome: item.nome || '',
            patrimonio: String(item.patrimonio || item.id || '').toUpperCase(),
            empresa: item.empresa || '',
            setor: item.placa || '',
            obs: item.obs || '',
            ativo: item.ativo !== false
        };
    }
    if (store === 'colaboradores') {
        // ATENÇÃO: 'senha' e 'nivel_acesso' propositalmente NÃO são incluídos aqui.
        // Essas colunas foram bloqueadas para escrita direta via API (anon key) no Supabase
        // e só podem ser alteradas pelas RPCs seguras cadastrar_conta / alterar_nivel_acesso.
        return {
            id: String(item.id || item.matricula || '').trim().toUpperCase(),
            nome: item.nome || '',
            funcao: item.funcao || '',
            setor: item.setor || '',
            empresa: item.empresa || '',
            matricula: String(item.matricula || item.id || ''),
            validade_aso: item.validadeAso || '',
            ativo: item.ativo !== false,
            email: item.email || ''
        };
    }
    if (store === 'checklists') {
        const stats = recalcularStatsChecklist(item);
        const normStatus = normalizarStatusChecklist(item.statusChecklist, item);
        return {
            id: String(item.id).trim(),
            date: item.date || '',
            patrimonio: String(item.patrimonio || '').toUpperCase(),
            nome: item.nome || item.equipment?.name || '',
            empresa: item.empresa || '',
            operador: item.operador || '',
            observacoes: item.observacoes || '',
            status_checklist: normStatus,
            prazo_adequacao: item.prazoAdequacao || '',
            conformes: stats.conformes,
            nao_conformes: stats.naoConformes,
            na: stats.na,
            total: stats.total,
            equipment: item.equipment || null,
            items: item.items || {}
        };
    }
    if (store === 'relatos' || store === 'issues') {
        return {
            id: String(item.id).trim(),
            date: item.date || new Date().toISOString(),
            tipo: item.type || item.tipo || '',
            identificacao: item.identificacao || '',
            description: item.description || '',
            reporter: item.reporter || '',
            role: item.role || '',
            status: item.status || 'aberto'
        };
    }
    if (store === 'checklist_items') {
        return {
            id: String(item.id).trim(),
            id_equipamento: item.idEquipamento || '',
            nome_equipamento: item.nomeEquipamento || '',
            icone_equipamento: item.iconeEquipamento || '',
            categoria_equipamento: item.categoriaEquipamento || '',
            texto_item: item.textoItem || '',
            nr: item.nr || '',
            risco: item.risco || 'medium',
            secao: item.secao || '',
            ordem: item.ordem !== undefined ? Number(item.ordem) : 0,
            ativo: item.ativo !== false ? 'Sim' : 'Não'
        };
    }
    return item;
}

function converterParaAppFromSupabase(table, row) {
    if (table === 'cadastros') {
        return {
            id: row.id,
            tipo: row.tipo,
            categoria: row.categoria,
            nome: row.nome,
            patrimonio: row.patrimonio,
            placa: row.setor || '',
            empresa: row.empresa,
            setor: '',
            obs: row.obs,
            ativo: row.ativo,
            synced: true
        };
    }
    if (table === 'colaboradores' || table === 'colaboradores_checklist') {
        return {
            id: row.id,
            nome: row.nome,
            funcao: row.funcao,
            setor: row.setor,
            empresa: row.empresa,
            matricula: row.matricula,
            validadeAso: row.validade_aso,
            ativo: row.ativo,
            senha: row.senha,
            nivelAcesso: row.nivel_acesso,
            email: row.email,
            synced: true
        };
    }
    if (table === 'checklists') {
        const stats = {
            conformes: parseInt(row.conformes) || 0,
            naoConformes: parseInt(row.nao_conformes) || 0,
            na: parseInt(row.na) || 0,
            total: parseInt(row.total) || 0
        };
        const normStatus = normalizarStatusChecklist(row.status_checklist, { items: row.items, stats });
        return {
            id: row.id,
            date: row.date,
            patrimonio: row.patrimonio,
            nome: row.nome,
            empresa: row.empresa,
            operador: row.operador,
            observacoes: row.observacoes,
            statusChecklist: normStatus,
            prazoAdequacao: row.prazo_adequacao,
            stats: stats,
            equipment: row.equipment,
            items: row.items || {},
            synced: true
        };
    }
    if (table === 'checklist_items') {
        return {
            id: row.id,
            idEquipamento: row.id_equipamento || '',
            nomeEquipamento: row.nome_equipamento || '',
            iconeEquipamento: row.icone_equipamento || '',
            categoriaEquipamento: row.categoria_equipamento || '',
            textoItem: row.texto_item || '',
            nr: row.nr || '',
            risco: row.risco || 'medium',
            secao: row.secao || '',
            ordem: row.ordem !== undefined ? Number(row.ordem) : 0,
            ativo: row.ativo !== 'Não',
            synced: true,
            supabase_synced: true
        };
    }
    if (table === 'relatos') {
        return {
            id: row.id,
            date: row.date,
            type: row.tipo,
            identificacao: row.identificacao,
            description: row.description,
            reporter: row.reporter,
            role: row.role,
            status: row.status,
            synced: true
        };
    }
    return row;
}

async function sincronizarItemIndividualSupabase(storeName, data) {
    if (!isSupabaseConfigured() || !data) return;
    try {
        const tableMap = {
            'cadastros': 'cadastros',
            'colaboradores': 'colaboradores_checklist',
            'checklists': 'checklists',
            'issues': 'relatos',
            'checklist_items': 'checklist_items'
        };
        const table = tableMap[storeName];
        if (!table) return;

        const spObj = converterParaSupabase(storeName, data);
        const res = await supabaseFetch(table, {
            method: 'POST',
            query: '?on_conflict=id',
            prefer: 'resolution=merge-duplicates',
            body: spObj
        });

        if (res.success) {
            data.synced = true;
            console.log(`⚡ [Supabase] ${storeName} sincronizado com sucesso:`, data.id);
        }

        if (storeName === 'checklists' && data.items) {
            const ncRows = [];
            for (const [k, v] of Object.entries(data.items)) {
                if (k === '_form' || !v || v.status !== 'NC') continue;
                const itemNome = ITEM_NAMES[k] || v.customText || k;
                ncRows.push({
                    checklist_id: String(data.id).trim(),
                    date: data.date || '',
                    patrimonio: (data.patrimonio || '').toUpperCase(),
                    item_text: itemNome,
                    nr: v.nr || '',
                    risco: v.risk || 'high',
                    observacao: v.observation || ''
                });
            }
            if (ncRows.length > 0) {
                await supabaseFetch('nao_conformidades', {
                    method: 'POST',
                    body: ncRows
                });
            }
        }
    } catch (err) {
        console.error(`Erro ao sincronizar ${storeName} com Supabase:`, err.message);
    }
}

async function sincronizarSenhasPendentes() {
    try {
        const colaboradoresLocais = await getAllFromIndexedDB('colaboradores');
        for (const c of colaboradoresLocais) {
            if (!c.senhaPendenteSync || !c.senha) continue;
            const rpcRes = await cadastrarContaOnlineSupabase({
                nome: c.nome, email: c.email, matricula: c.matricula || c.id,
                funcao: c.funcao, setor: c.setor, senhaHash: c.senha
            });
            if (rpcRes.success) {
                c.senhaPendenteSync = false;
                await saveToIndexedDB('colaboradores', c, true);
            }
        }
    } catch (e) {
        console.warn('Erro ao reenviar senhas pendentes de cadastro:', e);
    }
}

async function sincronizarComSupabase() {
    if (!isSupabaseConfigured()) return;
    try {
        console.log('⚡ Iniciando sincronização com Supabase...');

        await sincronizarSenhasPendentes();

        const tablesMap = [
            { table: 'cadastros', store: 'cadastros' },
            { table: 'colaboradores_checklist', store: 'colaboradores' },
            { table: 'checklists', store: 'checklists' },
            { table: 'relatos', store: 'issues' },
            { table: 'checklist_items', store: 'checklist_items' }
        ];

        for (const { table, store } of tablesMap) {
            // A coluna 'senha' foi bloqueada para SELECT direto via API (anon key) por segurança,
            // então para colaboradores_checklist listamos as colunas explicitamente sem ela.
            const selectQuery = table === 'colaboradores_checklist'
                ? '?select=id,nome,funcao,setor,empresa,matricula,validade_aso,ativo,nivel_acesso,email,created_at'
                : '?select=*';
            const res = await supabaseFetch(table, { query: selectQuery });
            if (res.success && Array.isArray(res.data)) {
                for (const row of res.data) {
                    const appObj = converterParaAppFromSupabase(table, row);
                    if (appObj && appObj.id) {
                        if (store === 'colaboradores' && !appObj.senha) {
                            // Preserva o hash de senha já em cache local (necessário para login offline),
                            // já que o servidor não retorna mais essa coluna.
                            const local = await getFromIndexedDB('colaboradores', appObj.id);
                            if (local && local.senha) appObj.senha = local.senha;
                        }
                        await saveToIndexedDB(store, appObj, true);
                    }
                }
            }

            const locais = await getAllFromIndexedDB(store);
            for (const local of locais) {
                if (!local.supabase_synced) {
                    const spObj = converterParaSupabase(store, local);
                    const upsertRes = await supabaseFetch(table, {
                        method: 'POST',
                        query: '?on_conflict=id',
                        prefer: 'resolution=merge-duplicates',
                        body: spObj
                    });
                    if (upsertRes.success) {
                        local.synced = true;
                        local.supabase_synced = true;
                        await saveToIndexedDB(store, local, true);
                    }

                    if (store === 'checklists' && local.items) {
                        const ncRows = [];
                        for (const [k, v] of Object.entries(local.items)) {
                            if (k === '_form' || !v || v.status !== 'NC') continue;
                            const itemNome = ITEM_NAMES[k] || v.customText || k;
                            ncRows.push({
                                checklist_id: String(local.id).trim(),
                                date: local.date || '',
                                patrimonio: (local.patrimonio || '').toUpperCase(),
                                item_text: itemNome,
                                nr: v.nr || '',
                                risco: v.risk || 'high',
                                observacao: v.observation || ''
                            });
                        }
                        if (ncRows.length > 0) {
                            await supabaseFetch('nao_conformidades', {
                                method: 'POST',
                                body: ncRows
                            });
                        }
                    }
                }
            }
        }

        // Baixar não conformidades do Supabase e mesclar aos checklists locais
        try {
            const ncRes = await supabaseFetch('nao_conformidades', { query: '?select=*' });
            if (ncRes.success && Array.isArray(ncRes.data) && ncRes.data.length > 0) {
                const spNcRows = ncRes.data.map(r => ({
                    'ID Checklist': r.checklist_id,
                    'Patrimônio': r.patrimonio,
                    'Item': r.item_text,
                    'NR': r.nr,
                    'Risco': r.risco,
                    'Observação': r.observacao
                }));
                await sincronizarNaoConformidadesComChecklists(spNcRows);
            }
        } catch (ncErr) {
            console.log('Erro ao mesclar não conformidades do Supabase:', ncErr.message);
        }

        localStorage.setItem('last_supabase_sync', new Date().toISOString());
        console.log('✅ Sincronização Supabase concluída com sucesso!');
    } catch (err) {
        console.error('Erro ao sincronizar com Supabase:', err.message);
    }
}

async function migrarDadosLocaisParaSupabase() {
    if (!isSupabaseConfigured()) {
        showToast('Configure a URL e a Anon Key do Supabase primeiro');
        return;
    }

    showToast('🚀 Migrando todos os dados locais para o Supabase...');

    try {
        const stores = [
            { store: 'cadastros', table: 'cadastros' },
            { store: 'colaboradores', table: 'colaboradores_checklist' },
            { store: 'checklists', table: 'checklists' },
            { store: 'issues', table: 'relatos' },
            { store: 'checklist_items', table: 'checklist_items' }
        ];

        let totalEnviados = 0;

        for (const { store, table } of stores) {
            const itens = await getAllFromIndexedDB(store);
            if (!itens || itens.length === 0) continue;

            const payload = itens.map(i => converterParaSupabase(store, i)).filter(i => i && i.id);
            if (payload.length === 0) continue;

            const res = await supabaseFetch(table, {
                method: 'POST',
                query: '?on_conflict=id',
                prefer: 'resolution=merge-duplicates',
                body: payload
            });

            if (res.success) {
                totalEnviados += payload.length;
                for (const item of itens) {
                    item.synced = true;
                    await saveToIndexedDB(store, item, true);
                }
            }
        }

        showToast(`✅ Migração concluída! ${totalEnviados} registro(s) enviados ao Supabase.`);
        loadConfigPage();
    } catch (err) {
        showToast('❌ Erro na migração: ' + err.message);
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
    
    showToast('Todos os dados foram apagados!');
    loadConfigPage();
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
    console.log('⚡ Online - Sincronizando dados pendentes com Supabase...');
    if (isSupabaseConfigured()) {
        await sincronizarComSupabase();
        showToast('🔄 Conexão restabelecida! Sincronização Supabase concluída.');
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
        `${equipment.name} (${equipment.nr})`;
    
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
        if ((cat === 'retroescavadeira' && eqId === 'escavadeira') || (cat === 'escavadeira' && eqId === 'retroescavadeira')) {
            return false;
        }
        return cat === eqId || cat.includes(eqId) || eqId.includes(cat);
    });
    
    if (filtrados.length === 0) {
        container.innerHTML = '<div style="font-size: 12px; color: var(--text-light); text-align: center; padding: 12px;">Nenhum equipamento cadastrado para este tipo</div>';
        return;
    }
    
    const seen = new Set();
    const filtradosUnicos = [];
    filtrados.forEach(c => {
        const key = (c.patrimonio || '').trim().toUpperCase();
        if (key && !seen.has(key)) {
            seen.add(key);
            filtradosUnicos.push(c);
        }
    });

    container.innerHTML = filtradosUnicos.map(c => `
        <div class="suggestion-item" onclick="selectCadastroFromSearch('${category}', '${c.patrimonio}')" 
             style="border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;">
            <div class="item-info">
                <div class="item-name" style="font-size: 13px;">${c.patrimonio} - ${c.nome}</div>
                <div class="item-nr" style="font-size: 11px;">${c.empresa || 'Sem empresa'} ${c.placa ? '• Placa: ' + c.placa : ''}</div>
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
        if ((cat === 'retroescavadeira' && eqId === 'escavadeira') || (cat === 'escavadeira' && eqId === 'retroescavadeira')) {
            return false;
        }
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
        (item.empresa && item.empresa.toLowerCase().includes(queryLower)) ||
        (item.placa && item.placa.toLowerCase().includes(queryLower))
    );
    
    if (filtered.length === 0) {
        container.innerHTML = `<div style="font-size: 12px; color: var(--text-light); text-align: center; padding: 12px;">
            Nenhum resultado para "${query}"<br>
            <span style="font-size: 11px;">Clique em "Iniciar Checklist" para usar este patrimônio</span>
        </div>`;
        return;
    }
    
    const seen = new Set();
    const filteredUnique = [];
    filtered.forEach(c => {
        const key = (c.patrimonio || '').trim().toUpperCase();
        if (key && !seen.has(key)) {
            seen.add(key);
            filteredUnique.push(c);
        }
    });

    container.innerHTML = filteredUnique.map(c => `
        <div class="suggestion-item" onclick="selectCadastroFromSearch('${category}', '${c.patrimonio}')" 
             style="border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px;">
            <div class="item-info">
                <div class="item-name" style="font-size: 13px;">${c.patrimonio} - ${c.nome}</div>
                <div class="item-nr" style="font-size: 11px;">${c.empresa || 'Sem empresa'} ${c.placa ? '• Placa: ' + c.placa : ''}</div>
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
        const select = document.getElementById('checklistPatrimonio');
        if (select) {
            select.value = patrimonio || '';
            await fillFromCadastro();
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
    currentCadastro = cadastro;
    checklistData = {};
    clearReinspectionState();

    document.getElementById('checklistDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('checklistPatrimonio').value = cadastro.patrimonio || '';
    document.getElementById('checklistNome').value = cadastro.nome || equipment.name;
    document.getElementById('checklistEmpresa').value = cadastro.empresa || '';
    lockEquipmentFields(true);
    document.getElementById('checklistOperador').value = '';
    document.getElementById('checklistObservacoes').value = '';

    loadCadastroSelect(tipo);
    loadResponsavelSelect();
    clearSignature();
    clearSignatureResponsavel();
    renderChecklistItems(equipment, cadastro);
    
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
    } else if (currentQRCategory === 'global') {
        iniciarChecklistPorQRGlobal(decodedText);
    } else {
        const input = document.getElementById('cadastroInput' + capitalize(currentQRCategory));
        if (input) {
            input.value = decodedText;
            filterCadastros(currentQRCategory, decodedText);
        }
        searchAndSelectCadastro(currentQRCategory, decodedText);
    }
}

async function iniciarChecklistPorQRGlobal(patrimonio) {
    const cadastros = await getAllFromIndexedDB('cadastros');
    const cadastro = cadastros.find(c => c.patrimonio && c.patrimonio.toLowerCase() === patrimonio.toLowerCase() && c.ativo !== false);
    
    if (cadastro) {
        const tipo = cadastro.tipo;
        const categoria = cadastro.categoria;
        
        if (tipo && categoria) {
            showToast('Equipamento: ' + (cadastro.nome || cadastro.patrimonio));
            startChecklist(tipo, categoria);
            await loadCadastroSelect(tipo);
            const selectPatr = document.getElementById('checklistPatrimonio');
            if (selectPatr) {
                selectPatr.value = cadastro.patrimonio || '';
                await fillFromCadastro();
            }
            showPage('pageChecklistForm');
        } else {
            showToast('Erro: Cadastro com tipo ou categoria incompletos.');
        }
    } else {
        showToast('Equipamento "' + patrimonio + '" não cadastrado no app.');
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

// ============================================
// AUTENTICAÇÃO E PERMISSÕES (LOGIN)
// ============================================

function sha256Fallback(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiLength = ascii[lengthProperty];
    var hash = sha256Fallback.h = sha256Fallback.h || [];
    var k = sha256Fallback.k = sha256Fallback.k || [];
    var primeCounter = k[lengthProperty];
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = 1;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << ((3 - i) % 4 * 8);
    }
    words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
    words[words[lengthProperty]] = (asciiLength * 8);
    var h0 = hash[0], h1 = hash[1], h2 = hash[2], h3 = hash[3],
        h4 = hash[4], h5 = hash[5], h6 = hash[6], h7 = hash[7];
    for (i = 0; i < words[lengthProperty]; i += 16) {
        var w = words.slice(i, i + 16);
        var olda = h0, oldb = h1, oldc = h2, oldd = h3, olde = h4, oldf = h5, oldg = h6, oldh = h7;
        for (j = 0; j < 64; j++) {
            if (j >= 16) {
                var w15 = w[j - 15], w2 = w[j - 2];
                w[j] = (
                    (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                    w[j - 7] +
                    (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) +
                    w[j - 16]
                ) | 0;
            }
            var ch = (olde & oldf) ^ (~olde & oldg);
            var maj = (olda & oldb) ^ (olda & oldc) ^ (oldb & oldc);
            var temp1 = (oldh + (rightRotate(olde, 6) ^ rightRotate(olde, 11) ^ rightRotate(olde, 25)) + ch + k[j] + w[j]) | 0;
            var temp2 = ((rightRotate(olda, 2) ^ rightRotate(olda, 13) ^ rightRotate(olda, 22)) + maj) | 0;
            oldh = oldg;
            oldg = oldf;
            oldf = olde;
            olde = (oldd + temp1) | 0;
            oldd = oldc;
            oldc = oldb;
            oldb = olda;
            olda = (temp1 + temp2) | 0;
        }
        h0 = (h0 + olda) | 0;
        h1 = (h1 + oldb) | 0;
        h2 = (h2 + oldc) | 0;
        h3 = (h3 + oldd) | 0;
        h4 = (h4 + olde) | 0;
        h5 = (h5 + oldf) | 0;
        h6 = (h6 + oldg) | 0;
        h7 = (h7 + oldh) | 0;
    }
    var h = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (i = 0; i < 8; i++) {
        var word = h[i];
        result += ((word >>> 24) & 255).toString(16).padStart(2, '0') +
                  ((word >>> 16) & 255).toString(16).padStart(2, '0') +
                  ((word >>> 8) & 255).toString(16).padStart(2, '0') +
                  (word & 255).toString(16).padStart(2, '0');
    }
    return result;
}

async function sha256(message) {
    if (!message) return '';
    try {
        if (window.crypto && window.crypto.subtle) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }
    } catch (e) {
        console.warn('Subtle crypto error, falling back to JS implementation:', e);
    }
    return sha256Fallback(message);
}

async function loginOnlineSupabase(loginVal, hashedInput) {
    if (!isSupabaseConfigured()) return null;
    const url = getSupabaseUrl() + '/rest/v1/rpc/verificar_login';
    const key = getSupabaseKey();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_login: loginVal,
                p_senha_hash: hashedInput
            })
        });
        
        if (res.status === 200) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const row = data[0];
                const appObj = converterParaAppFromSupabase('colaboradores_checklist', row);
                if (appObj && appObj.id) {
                    appObj.senha = hashedInput; // Save the hash locally for offline logins!
                    await saveToIndexedDB('colaboradores', appObj, true);
                    return appObj;
                }
            }
        }
    } catch (e) {
        console.error('Erro ao verificar login online via RPC:', e);
    }
    return null;
}

async function cadastrarContaOnlineSupabase(payload) {
    if (!isSupabaseConfigured() || !navigator.onLine) return { success: false, offline: true };
    const url = getSupabaseUrl() + '/rest/v1/rpc/cadastrar_conta';
    const key = getSupabaseKey();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_nome: payload.nome,
                p_email: payload.email,
                p_matricula: payload.matricula,
                p_funcao: payload.funcao,
                p_setor: payload.setor,
                p_senha_hash: payload.senhaHash
            })
        });
        if (res.status === 200) return { success: true };
        const errBody = await res.json().catch(() => ({}));
        return { success: false, error: errBody.message || `HTTP ${res.status}` };
    } catch (e) {
        console.error('Erro ao cadastrar conta online via RPC:', e);
        return { success: false, error: e.message };
    }
}

async function alterarNivelAcessoOnlineSupabase(targetId, novoNivel) {
    if (!isSupabaseConfigured() || !navigator.onLine) return { success: false, offline: true };
    const sessionStr = localStorage.getItem('active_session');
    if (!sessionStr) return { success: false, error: 'Sessão não encontrada' };
    const session = JSON.parse(sessionStr);
    const adminColab = await getFromIndexedDB('colaboradores', String(session.matricula || '').trim().toUpperCase());
    if (!adminColab || !adminColab.senha) return { success: false, error: 'Credenciais do administrador não disponíveis localmente' };

    const url = getSupabaseUrl() + '/rest/v1/rpc/alterar_nivel_acesso';
    const key = getSupabaseKey();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_admin_matricula: adminColab.matricula || adminColab.id,
                p_admin_senha_hash: adminColab.senha,
                p_target_id: targetId,
                p_novo_nivel: novoNivel
            })
        });
        if (res.status === 200) {
            const data = await res.json().catch(() => null);
            return { success: data === true, error: data === true ? null : 'Requisição negada pelo servidor' };
        }
        return { success: false, error: `HTTP ${res.status}` };
    } catch (e) {
        console.error('Erro ao alterar nível de acesso online via RPC:', e);
        return { success: false, error: e.message };
    }
}

async function buscarColaboradorOnline(loginVal) {
    if (!isSupabaseConfigured()) return null;
    const loginUpper = loginVal.toUpperCase();
    const loginLower = loginVal.toLowerCase();
    try {
        const res = await supabaseFetch('colaboradores_checklist', {
            // 'senha' foi bloqueada para SELECT direto via API por segurança; selecionamos as demais colunas.
            query: `?select=id,nome,funcao,setor,empresa,matricula,validade_aso,ativo,nivel_acesso,email,created_at&or=(matricula.eq.${encodeURIComponent(loginUpper)},email.eq.${encodeURIComponent(loginLower)})`
        });
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const row = res.data[0];
            const appObj = converterParaAppFromSupabase('colaboradores_checklist', row);
            if (appObj && appObj.id) {
                if (!appObj.senha) {
                    // Preserva o hash de senha já em cache local (necessário para login offline)
                    const local = await getFromIndexedDB('colaboradores', appObj.id);
                    if (local && local.senha) appObj.senha = local.senha;
                }
                await saveToIndexedDB('colaboradores', appObj, true);
                return appObj;
            }
        }
    } catch (e) {
        console.error('Erro ao buscar colaborador online:', e);
    }
    return null;
}

async function realizarLogin() {
    const matriculaInput = document.getElementById('loginMatricula');
    const senhaInput = document.getElementById('loginSenha');
    const errorDiv = document.getElementById('loginError');
    
    if (!matriculaInput || !senhaInput) return;
    
    const loginVal = matriculaInput.value.trim();
    const senha = senhaInput.value;
    
    if (!loginVal || !senha) {
        if (errorDiv) {
            errorDiv.textContent = '❌ Por favor, preencha todos os campos.';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    let authenticated = false;
    let userRole = 'Tecnico';
    let userName = '';
    let userMatricula = '';
    
    const loginUpper = loginVal.toUpperCase();
    const hashedInput = await sha256(senha);
    
    // 1. Se estiver online e Supabase estiver configurado, verificar direto no banco via RPC (SECURITY DEFINER)
    if (navigator.onLine && isSupabaseConfigured()) {
        showToast('Verificando credenciais online...');
        const onlineColab = await loginOnlineSupabase(loginVal, hashedInput);
        if (onlineColab) {
            if (onlineColab.ativo === false || onlineColab.ativo === 'Não') {
                if (errorDiv) {
                    errorDiv.textContent = '❌ Este colaborador está inativo/desmobilizado.';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            authenticated = true;
            userRole = normalizarNivelAcesso(onlineColab.nivelAcesso);
            userName = onlineColab.nome;
            userMatricula = onlineColab.matricula || onlineColab.id;
        }
    }
    
    // 2. Fallback local (IndexedDB) para offline ou se o login online falhou temporariamente
    if (!authenticated) {
        console.log('Tentando login local/offline...');
        let colaboradores = await getAllFromIndexedDB('colaboradores');
        let colab = colaboradores.find(c => String(c.matricula || '').trim().toUpperCase() === loginUpper);
        if (!colab) {
            const loginLower = loginVal.toLowerCase();
            colab = colaboradores.find(c => String(c.email || '').trim().toLowerCase() === loginLower);
        }
        
        if (colab) {
            if (colab.ativo === false || colab.ativo === 'Não') {
                if (errorDiv) {
                    errorDiv.textContent = '❌ Este colaborador está inativo/desmobilizado.';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            if (colab.senha === hashedInput) {
                authenticated = true;
                userRole = normalizarNivelAcesso(colab.nivelAcesso);
                userName = colab.nome;
                userMatricula = colab.matricula || colab.id;
            }
        }
    }
    
    if (authenticated) {
        if (errorDiv) errorDiv.style.display = 'none';
        
        // Criar e salvar sessão no localStorage
        const session = {
            matricula: userMatricula,
            role: userRole,
            nome: userName,
            loginTime: Date.now()
        };
        localStorage.setItem('active_session', JSON.stringify(session));
        
        // Limpar inputs
        matriculaInput.value = '';
        senhaInput.value = '';
        
        // Atualizar interface
        updateNavigationForRole(userRole);
        updateWelcomeBanner();
        showToast(`Bem-vindo, ${userName}!`);
        showPage('pageHome');
    } else {
        if (errorDiv) {
            errorDiv.textContent = '❌ Matrícula/E-mail ou senha incorretos.';
            errorDiv.style.display = 'block';
        }
    }
}

async function realizarCadastroConta() {
    const nome = document.getElementById('signUpNome').value.trim();
    const email = document.getElementById('signUpEmail').value.trim();
    const matricula = document.getElementById('signUpMatricula').value.trim();
    const funcao = document.getElementById('signUpFuncao').value.trim();
    const setor = document.getElementById('signUpSetor').value.trim() || 'Geral';
    const senha = document.getElementById('signUpSenha').value;
    const senhaConfirm = document.getElementById('signUpSenhaConfirm').value;
    const errorEl = document.getElementById('signUpError');
    
    if (errorEl) errorEl.style.display = 'none';

    if (!nome || !email || !matricula || !funcao || !senha) {
        showSignUpError('❌ Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }

    if (senha !== senhaConfirm) {
        showSignUpError('❌ As senhas não conferem.');
        return;
    }

    if (senha.length < 4) {
        showSignUpError('❌ A senha deve conter pelo menos 4 caracteres.');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showSignUpError('❌ Por favor, insira um e-mail válido.');
        return;
    }

    const matriculaNorm = matricula.toUpperCase();
    const emailNorm = email.toLowerCase();

    try {
        const colaboradores = await getAllFromIndexedDB('colaboradores');
        let colabObj = null;
        
        const dupMatricula = colaboradores.find(c => String(c.matricula || '').trim().toUpperCase() === matriculaNorm);
        if (dupMatricula && dupMatricula.ativo !== false && dupMatricula.ativo !== 'Não') {
            if (dupMatricula.senha) {
                showSignUpError('⚠️ Já existe um colaborador ativo com esta Matrícula.');
                return;
            }
            // Se já existe mas não tem senha, a gente atualiza os campos e ativa a senha
            colabObj = {
                ...dupMatricula,
                nome: nome,
                email: emailNorm,
                funcao: funcao.toUpperCase(),
                setor: setor.toUpperCase(),
                senha: '', // Será preenchido abaixo com o hash
                synced: false,
                timestamp: new Date().toISOString()
            };
        }

        const dupEmail = colaboradores.find(c => String(c.email || '').trim().toLowerCase() === emailNorm);
        if (dupEmail && dupEmail.id !== matriculaNorm && dupEmail.ativo !== false && dupEmail.ativo !== 'Não') {
            showSignUpError('⚠️ Já existe um colaborador ativo com este E-mail.');
            return;
        }

        // Hashing senha
        const hash = await sha256(senha);

        if (colabObj) {
            colabObj.senha = hash;
        } else {
            colabObj = {
                id: matriculaNorm,
                nome: nome,
                email: emailNorm,
                matricula: matriculaNorm,
                funcao: funcao.toUpperCase(),
                setor: setor.toUpperCase(),
                empresa: '',
                aso: '',
                senha: hash,
                nivelAcesso: 'Tecnico',
                ativo: true,
                synced: false,
                timestamp: new Date().toISOString()
            };
        }

        // A senha é sincronizada via RPC segura (cadastrar_conta), não pelo sync genérico
        // (a coluna 'senha' foi bloqueada para escrita direta via API por segurança).
        const rpcRes = await cadastrarContaOnlineSupabase({
            nome: colabObj.nome,
            email: colabObj.email,
            matricula: colabObj.matricula,
            funcao: colabObj.funcao,
            setor: colabObj.setor,
            senhaHash: colabObj.senha
        });
        if (!rpcRes.success) {
            console.warn('Falha ao sincronizar senha do cadastro via RPC, será tentado novamente ao reconectar:', rpcRes.error);
            colabObj.senhaPendenteSync = true;
        }
        await saveToIndexedDB('colaboradores', colabObj);
        showToast('🎉 Conta criada com sucesso! Faça login.');

        // Limpar inputs
        document.getElementById('signUpNome').value = '';
        document.getElementById('signUpEmail').value = '';
        document.getElementById('signUpMatricula').value = '';
        document.getElementById('signUpFuncao').value = '';
        document.getElementById('signUpSetor').value = '';
        document.getElementById('signUpSenha').value = '';
        document.getElementById('signUpSenhaConfirm').value = '';

        // Sincronizar demais campos (nome, email, funcao...) em background
        sincronizarItemIndividualSupabase('colaboradores', colabObj).catch(err => console.error('Erro no sync do cadastro:', err));

        // Redirecionar para login
        setTimeout(() => {
            showPage('pageLogin');
        }, 1000);

    } catch (err) {
        console.error('Erro ao realizar cadastro:', err);
        showSignUpError('❌ Erro interno ao cadastrar. Tente novamente.');
    }
}

function showSignUpError(msg) {
    const errorEl = document.getElementById('signUpError');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
}

async function solicitarCodigoRecuperacao() {
    const matricula = document.getElementById('recoverMatricula').value.trim();
    const email = document.getElementById('recoverEmail').value.trim();
    const errorEl = document.getElementById('recoverError');
    
    if (errorEl) errorEl.style.display = 'none';

    if (!matricula || !email) {
        showRecoverError('❌ Preencha a Matrícula e o E-mail.');
        return;
    }

    if (!navigator.onLine) {
        showRecoverError('⚠️ Você está offline. A recuperação exige conexão com a internet.');
        return;
    }

    if (!isSupabaseConfigured()) {
        showRecoverError('❌ Supabase não configurado. Entre em contato com o suporte.');
        return;
    }

    showToast('Verificando dados no Supabase...');
    const matriculaNorm = matricula.toUpperCase();
    const emailNorm = email.toLowerCase();

    try {
        const res = await supabaseFetch('colaboradores_checklist', {
            method: 'GET',
            query: `?matricula=eq.${encodeURIComponent(matriculaNorm)}&email=eq.${encodeURIComponent(emailNorm)}`
        });

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            showToast('✅ Identidade confirmada no Supabase!');
            document.getElementById('recoverStep1').style.display = 'none';
            document.getElementById('recoverStep2').style.display = 'flex';
            const codeInput = document.getElementById('recoverCode');
            if (codeInput) {
                codeInput.value = '123456';
                const parent = codeInput.closest('.form-group');
                if (parent) parent.style.display = 'none';
            }
        } else {
            showRecoverError('❌ Matrícula ou E-mail não cadastrados ou incorretos.');
        }
    } catch (err) {
        console.error('Erro na solicitação de recuperação:', err);
        showRecoverError('❌ Falha na conexão com o Supabase.');
    }
}

async function redefinirSenhaComCodigo() {
    showRecoverError('⚠️ Recuperação de senha temporariamente desativada. Fale com o administrador para redefinir sua senha.');
    return;
    // eslint-disable-next-line no-unreachable
    const matricula = document.getElementById('recoverMatricula').value.trim();
    const email = document.getElementById('recoverEmail').value.trim();
    const newSenha = document.getElementById('recoverNewSenha').value;
    const newSenhaConfirm = document.getElementById('recoverNewSenhaConfirm').value;
    
    if (!matricula || !email || !newSenha) {
        showRecoverError('❌ Preencha todos os campos.');
        return;
    }

    if (newSenha !== newSenhaConfirm) {
        showRecoverError('❌ As senhas não conferem.');
        return;
    }

    if (newSenha.length < 4) {
        showRecoverError('❌ A senha deve ter pelo menos 4 caracteres.');
        return;
    }

    if (!navigator.onLine) {
        showRecoverError('⚠️ Você está offline. A redefinição exige conexão com a internet.');
        return;
    }

    if (!isSupabaseConfigured()) {
        showRecoverError('❌ Supabase não configurado.');
        return;
    }

    showToast('Redefinindo senha...');
    const matriculaNorm = matricula.toUpperCase();
    const emailNorm = email.toLowerCase();

    try {
        const hashedSenha = await sha256(newSenha);

        const checkRes = await supabaseFetch('colaboradores_checklist', {
            method: 'GET',
            query: `?matricula=eq.${encodeURIComponent(matriculaNorm)}&email=eq.${encodeURIComponent(emailNorm)}`
        });

        if (checkRes.success && Array.isArray(checkRes.data) && checkRes.data.length > 0) {
            const colab = checkRes.data[0];
            colab.senha = hashedSenha;
            colab.synced = true;

            const updateRes = await supabaseFetch('colaboradores_checklist', {
                method: 'POST',
                query: '?on_conflict=id',
                prefer: 'resolution=merge-duplicates',
                body: [colab]
            });

            if (updateRes.success) {
                await saveToIndexedDB('colaboradores', colab, true);
                showToast('✅ Senha redefinida com sucesso!');
                setTimeout(() => {
                    cancelarRecuperacao();
                    showPage('pageLogin');
                }, 1500);
            } else {
                showRecoverError('❌ Erro ao atualizar senha no Supabase: ' + (updateRes.error || ''));
            }
        } else {
            showRecoverError('❌ Colaborador não encontrado.');
        }
    } catch (err) {
        console.error('Erro na redefinição de senha:', err);
        showRecoverError('❌ Falha ao conectar ao Supabase.');
    }
}

function showRecoverError(msg) {
    const errorEl = document.getElementById('recoverError');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
}

function cancelarRecuperacao() {
    document.getElementById('recoverMatricula').value = '';
    document.getElementById('recoverEmail').value = '';
    document.getElementById('recoverCode').value = '';
    document.getElementById('recoverNewSenha').value = '';
    document.getElementById('recoverNewSenhaConfirm').value = '';
    
    document.getElementById('recoverStep1').style.display = 'flex';
    document.getElementById('recoverStep2').style.display = 'none';
    
    const errorEl = document.getElementById('recoverError');
    if (errorEl) errorEl.style.display = 'none';
    
    showPage('pageLogin');
}

function realizarLogout() {
    if (confirm('Deseja realmente sair da sua conta?')) {
        localStorage.removeItem('active_session');
        updateNavigationForRole(null);
        updateWelcomeBanner();
        showPage('pageLogin');
        showToast('Sessão encerrada.');
    }
}

function toggleLoginPassword() {
    const input = document.getElementById('loginSenha');
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function normalizarNivelAcesso(val) {
    if (!val) return 'Tecnico';
    const str = String(val).trim().toLowerCase();
    if (str.includes('admin')) return 'Admin';
    return 'Tecnico';
}

function updateNavigationForRole(role) {
    const navCadastro = document.getElementById('navCadastro');
    const navConfig = document.getElementById('navConfig');
    const btnHomeCadastro = document.getElementById('btnHomeCadastro');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const normRole = normalizarNivelAcesso(role);
    
    if (normRole === 'Admin') {
        if (navCadastro) navCadastro.style.display = 'inline-flex';
        if (navConfig) navConfig.style.display = 'inline-flex';
        if (btnHomeCadastro) btnHomeCadastro.style.display = 'flex';
    } else if (role) {
        if (navCadastro) navCadastro.style.display = 'none';
        if (navConfig) navConfig.style.display = 'none';
        if (btnHomeCadastro) btnHomeCadastro.style.display = 'none';
    } else {
        // Ninguém logado (ou deslogando)
        if (navCadastro) navCadastro.style.display = 'none';
        if (navConfig) navConfig.style.display = 'none';
        if (btnHomeCadastro) btnHomeCadastro.style.display = 'none';
    }
    
    // Exibir/ocultar botão de logout no header
    if (logoutBtn) {
        logoutBtn.style.display = role ? 'flex' : 'none';
    }
}

function updateWelcomeBanner() {
    const sessionStr = localStorage.getItem('active_session');
    const welcomeBanner = document.getElementById('welcomeBanner');
    const welcomeUser = document.getElementById('welcomeUser');
    const welcomeRoleBadge = document.getElementById('welcomeRoleBadge');
    
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            const normRole = normalizarNivelAcesso(session.role);
            if (welcomeUser) welcomeUser.textContent = session.nome || 'Usuário';
            if (welcomeRoleBadge) {
                welcomeRoleBadge.textContent = normRole === 'Admin' ? 'ADMINISTRADOR' : 'TÉCNICO';
                welcomeRoleBadge.style.background = normRole === 'Admin' ? 'rgba(231, 76, 60, 0.25)' : 'rgba(255, 255, 255, 0.2)';
                welcomeRoleBadge.style.color = normRole === 'Admin' ? '#ff7675' : 'white';
            }
            if (welcomeBanner) welcomeBanner.style.display = 'flex';
        } catch (e) {
            if (welcomeBanner) welcomeBanner.style.display = 'none';
        }
    } else {
        if (welcomeBanner) welcomeBanner.style.display = 'none';
    }
}

async function forcarAtualizacaoAcessoSessao() {
    showToast('🔄 Verificando permissões no Supabase...');
    if (!navigator.onLine || !isSupabaseConfigured()) {
        showToast('⚠️ Você está offline ou o Supabase não está configurado.');
        return;
    }

    try {
        const sessionStr = localStorage.getItem('active_session');
        if (!sessionStr) return;
        const session = JSON.parse(sessionStr);
        const matricula = session.matricula || session.id;
        if (matricula) {
            const onlineColab = await buscarColaboradorOnline(matricula);
            if (onlineColab) {
                await saveToIndexedDB('colaboradores', onlineColab, true);
                await verificarEAtualizarPapelSessao();
                const updatedSessionStr = localStorage.getItem('active_session');
                const updatedSession = JSON.parse(updatedSessionStr);
                const roleNorm = normalizarNivelAcesso(updatedSession.role);
                showToast(`✅ Permissões atualizadas! Seu nível atual: ${roleNorm === 'Admin' ? 'ADMINISTRADOR' : 'TÉCNICO'}`);
            } else {
                showToast('❌ Colaborador não encontrado no Supabase.');
            }
        }
    } catch (e) {
        console.error('Erro ao forçar atualização de acesso:', e);
        showToast('❌ Falha ao conectar ao Supabase.');
    }
}

async function verificarEAtualizarPapelSessao() {
    const sessionStr = localStorage.getItem('active_session');
    if (!sessionStr) return;
    try {
        const session = JSON.parse(sessionStr);
        const sessMat = String(session.matricula || '').trim().toUpperCase();
        const sessNome = String(session.nome || '').trim().toUpperCase();

        // Tentar baixar colaborador mais recente do Supabase antes da verificação
        if (navigator.onLine && isSupabaseConfigured()) {
            try {
                const matricula = session.matricula || session.id;
                if (matricula) {
                    const onlineColab = await buscarColaboradorOnline(matricula);
                    if (onlineColab) {
                        await saveToIndexedDB('colaboradores', onlineColab, true);
                    }
                }
            } catch (netErr) {
                console.warn('Erro ao checar papel online no Supabase:', netErr);
            }
        }

        const colaboradores = await getAllFromIndexedDB('colaboradores');
        let colab = colaboradores.find(c => String(c.matricula || c.id || '').trim().toUpperCase() === sessMat);
        if (!colab && sessNome) {
            colab = colaboradores.find(c => String(c.nome || '').trim().toUpperCase() === sessNome);
        }

        if (colab) {
            const targetRole = normalizarNivelAcesso(colab.nivelAcesso);
            const currentRole = normalizarNivelAcesso(session.role);
            
            let changed = false;
            if (targetRole !== currentRole) {
                console.log('Atualizando papel da sessão de', session.role, 'para', targetRole);
                session.role = targetRole;
                changed = true;
            }
            if (colab.nome && colab.nome !== session.nome) {
                session.nome = colab.nome;
                changed = true;
            }
            if (changed || targetRole === 'Admin') {
                session.role = targetRole;
                localStorage.setItem('active_session', JSON.stringify(session));
                updateNavigationForRole(session.role);
                updateWelcomeBanner();
                if (changed) {
                    showToast('🔑 Seu nível de acesso foi atualizado para ' + (targetRole === 'Admin' ? 'ADMINISTRADOR' : 'TÉCNICO') + '!');
                }
            }
        }
    } catch (e) {
        console.error('Erro ao verificar papel da sessao:', e);
    }
}

function obterIconeFallback(idEquipamento) {
    const norm = String(idEquipamento || '').trim().toLowerCase();
    const fallbacks = {
        'trator_esteira': '🚜',
        'trator_esteiras': '🚜',
        'trator_agricola': '🌾',
        'trator_agrícola': '🌾',
        'trator_pneu': '🌾',
        'escavadeira': '⛏️',
        'escavadeira_hidraulica': '⛏️',
        'escavadeira_hidráulica': '⛏️',
        'retroescavadeira': '🏗️',
        'retro': '🏗️',
        'rolo': '⚙️',
        'rolo_compactador': '⚙️',
        'gerador': '⚡',
        'betoneira': '🪣',
        'betoneira_eletrica': '🪣',
        'betoneira_elétrica': '🪣',
        'embarcacao': '🚢',
        'embarcação': '🚢',
        'minicarregadeira': '🔧',
        'mini_carregadeira': '🔧',
        'bobcat': '🔧',
        'bomba': '💧',
        'bomba_estacionaria': '💧',
        'bomba_estacionária': '💧',
        'motoniveladora': '🚜',
        'patrol': '🚜',
        'pcarregadeira': '🚛',
        'pa_carregadeira': '🚛',
        'pá_carregadeira': '🚛',
        'plataforma': '🪜',
        'plataforma_elevatoria': '🪜',
        'plataforma_elevatória': '🪜',
        'sondagem': '🔩',
        'equipamento_sondagem': '🔩',
        'veiculos_leves': '🚗',
        'veículos_leves': '🚗',
        'van': '🚐',
        'ambulancia': '🚑',
        'ambulância': '🚑',
        'onibus': '🚌',
        'ônibus': '🚌',
        'caminhao_cabinado': '🚛',
        'caminhão_cabinado': '🚛',
        'caminhao_munk': '🚛',
        'caminhão_munk': '🚛',
        'caminhao_munck': '🚛',
        'caminhão_munck': '🚛',
        'caminhao_comboio': '🚛',
        'caminhão_comboio': '🚛',
        'caminhao_pipa': '🚛',
        'caminhão_pipa': '🚛',
        'caminhao_basculante': '🚛',
        'caminhão_basculante': '🚛'
    };
    return fallbacks[norm] || '📦';
}