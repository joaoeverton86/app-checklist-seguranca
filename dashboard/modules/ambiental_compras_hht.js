// ==============================================================================
// MODULO: ACERVO DRIVE, CALENDARIO HHT, MANIFESTO DE RESIDUOS E COMPRAS
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// de anexos novos em anexosDoRegistro/enviarAnexoSelecionado - ver bloco "MODAL DE
// ANEXOS" acima, que continua 100% intacto). Sem cache/estado persistido entre
// visitas de propósito - é sempre uma consulta ao vivo no Drive.
// ============================================
// ACERVO (DRIVE) - Navegação e Gestão de Documentos no Google Drive
// Suporta Treinamentos (SCAN), DDSMA (SCAN - DDS), Checklists SST e SMS_COP.
// Permite consulta e upload direto para pastas do Drive via Vercel Serverless / Google Drive API.
// ============================================
let acervoDriveCategoria = null;
let acervoDriveTrilha = [];
let acervoDriveItens = [];
let acervoDriveNextPageToken = null;
let acervoArquivosParaUpload = [];
let acervoPastaContextualAtiva = null;
let acervoDrivePastaUrlAtual = null;
let acervoDriveTermoBusca = '';


function resetAcervoDrive() {
    acervoDriveCategoria = null;
    acervoDriveTrilha = [];
    acervoDriveItens = [];
    acervoDriveNextPageToken = null;
    acervoPastaContextualAtiva = null;
    acervoDrivePastaUrlAtual = null;
    acervoDriveTermoBusca = '';
    const categoriasEl = document.getElementById('acervoDriveCategorias');
    const barraNav = document.getElementById('acervoDriveBarraNavegacao');
    const barraBusca = document.getElementById('acervoDriveBarraBusca');
    const statusItens = document.getElementById('acervoDriveStatusItens');
    const btnLinkExt = document.getElementById('acervoDriveBtnLinkPastaExterna');
    const listaEl = document.getElementById('acervoDriveLista');
    const carregarMaisWrap = document.getElementById('acervoDriveCarregarMaisWrap');
    const inpBusca = document.getElementById('acervoDriveBuscaInput');
    if (inpBusca) inpBusca.value = '';
    if (categoriasEl) categoriasEl.style.display = 'grid';
    if (barraNav) barraNav.style.display = 'none';
    if (barraBusca) barraBusca.style.display = 'none';
    if (statusItens) statusItens.style.display = 'none';
    if (btnLinkExt) btnLinkExt.style.display = 'none';
    if (listaEl) { listaEl.style.display = 'none'; listaEl.innerHTML = ''; }
    if (carregarMaisWrap) carregarMaisWrap.style.display = 'none';
    renderAcervoDriveTrilha();
    atualizarCardFotosDrive();
}

function recarregarAcervoDrive() {
    if (!acervoDriveCategoria) {
        resetAcervoDrive();
        return;
    }
    const nivelAtual = acervoDriveTrilha[acervoDriveTrilha.length - 1];
    carregarPastaAcervoDrive(nivelAtual ? nivelAtual.id : null, false);
}

function abrirCategoriaAcervoDrive(categoria) {
    if (categoria === 'fotos' || categoria === 'fotos_evidencias') {
        tratarCliqueCardFotosDrive();
        return;
    }
    acervoDriveCategoria = categoria;
    const nomes = {
        treinamentos: 'Treinamentos',
        dds: 'DDSMA',
        checklists: 'Checklists SST',
        sms_cop: 'SMS_COP (Geral)'
    };
    const nomeCategoria = nomes[categoria] || categoria;
    acervoDriveTrilha = [{ id: null, nome: 'Acervo (Drive)' }, { id: null, nome: nomeCategoria }];
    const categoriasEl = document.getElementById('acervoDriveCategorias');
    const barraNav = document.getElementById('acervoDriveBarraNavegacao');
    if (categoriasEl) categoriasEl.style.display = 'none';
    if (barraNav) barraNav.style.display = 'flex';
    carregarPastaAcervoDrive(null, false);
}

function abrirPastaAcervoDrive(pastaId, nome) {
    acervoDriveTrilha.push({ id: pastaId, nome });
    carregarPastaAcervoDrive(pastaId, false);
}

function voltarTrilhaAcervoDrive(indice) {
    if (indice === 0) { resetAcervoDrive(); return; }
    acervoDriveTrilha = acervoDriveTrilha.slice(0, indice + 1);
    const nivel = acervoDriveTrilha[indice];
    carregarPastaAcervoDrive(nivel.id, false);
}

function filtrarItensAcervoDrive() {
    const inp = document.getElementById('acervoDriveBuscaInput');
    acervoDriveTermoBusca = (inp ? inp.value : '').trim().toLowerCase();
    renderAcervoDriveLista();
}

function limparBuscaAcervoDrive() {
    const inp = document.getElementById('acervoDriveBuscaInput');
    if (inp) inp.value = '';
    acervoDriveTermoBusca = '';
    renderAcervoDriveLista();
}

async function carregarPastaAcervoDrive(pastaId, appendMode) {
    const listaEl = document.getElementById('acervoDriveLista');
    const carregarMaisWrap = document.getElementById('acervoDriveCarregarMaisWrap');
    const barraBusca = document.getElementById('acervoDriveBarraBusca');
    const statusItens = document.getElementById('acervoDriveStatusItens');
    const btnLinkExt = document.getElementById('acervoDriveBtnLinkPastaExterna');
    if (!listaEl) return;
    listaEl.style.display = 'block';
    renderAcervoDriveTrilha();

    // Guarda pasta contextual para uploads diretos
    const nivelAtual = acervoDriveTrilha[acervoDriveTrilha.length - 1];
    acervoPastaContextualAtiva = nivelAtual ? { id: nivelAtual.id, nome: nivelAtual.nome } : null;

    if (!appendMode) {
        acervoDriveItens = [];
        acervoDriveNextPageToken = null;
        listaEl.innerHTML = '<div class="db-list-empty" style="padding:24px; text-align:center;"><i class="fas fa-spinner fa-spin" style="margin-right:8px; color:#0284c7;"></i> Carregando arquivos do Google Drive...</div>';
        if (carregarMaisWrap) carregarMaisWrap.style.display = 'none';
    }
    try {
        const params = new URLSearchParams({ categoria: acervoDriveCategoria });
        if (pastaId) params.set('pastaId', pastaId);
        if (appendMode && acervoDriveNextPageToken) params.set('pageToken', acervoDriveNextPageToken);
        const resp = await fetch(`/api/anexos-drive-listar?${params.toString()}`);
        const dados = await resp.json();
        if (!resp.ok) throw new Error(dados.erro || `HTTP ${resp.status}`);

        const itensTratados = (dados.itens || []).map(item => {
            const ehPasta = item.mimeType === 'application/vnd.google-apps.folder';
            let previewUrl = '';
            let webViewLink = (item.webViewLink || '').trim();
            if (!ehPasta && item.id) {
                previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(item.id)}/preview`;
                if (!webViewLink) {
                    webViewLink = previewUrl;
                }
            } else if (ehPasta && item.id && !webViewLink) {
                webViewLink = `https://drive.google.com/drive/folders/${encodeURIComponent(item.id)}`;
            }
            return {
                ...item,
                previewUrl,
                webViewLink
            };
        });

        acervoDriveItens = appendMode ? acervoDriveItens.concat(itensTratados) : itensTratados;
        acervoDriveNextPageToken = dados.nextPageToken || null;
        acervoDrivePastaUrlAtual = dados.pastaUrl || null;

        // Atualiza link externo para o Google Drive
        if (btnLinkExt) {
            if (dados.pastaUrl) {
                btnLinkExt.href = dados.pastaUrl;
                btnLinkExt.style.display = 'inline-flex';
            } else {
                btnLinkExt.style.display = 'none';
            }
        }

        // Mostra busca e contador
        if (barraBusca) barraBusca.style.display = 'flex';
        if (statusItens) statusItens.style.display = 'flex';

        renderAcervoDriveLista();
        if (carregarMaisWrap) carregarMaisWrap.style.display = acervoDriveNextPageToken ? 'block' : 'none';
    } catch (err) {
        console.error('Erro ao listar acervo do Drive:', err);
        listaEl.innerHTML = `<div class="db-list-empty" style="padding:16px; color:var(--danger);"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i> ${escapeHTML(err.message)}</div>`;
        if (carregarMaisWrap) carregarMaisWrap.style.display = 'none';
    }
}

function carregarMaisAcervoDrive() {
    const nivelAtual = acervoDriveTrilha[acervoDriveTrilha.length - 1];
    carregarPastaAcervoDrive(nivelAtual ? nivelAtual.id : null, true);
}

function renderAcervoDriveTrilha() {
    const el = document.getElementById('acervoDriveTrilha');
    if (!el) return;
    if (acervoDriveTrilha.length === 0) {
        el.style.display = 'none';
        return;
    }
    el.style.display = 'block';
    el.innerHTML = acervoDriveTrilha.map((nivel, i) => {
        const separador = i > 0 ? ' <span style="color: var(--text-light); margin:0 4px;">›</span> ' : '';
        const ultimo = i === acervoDriveTrilha.length - 1;
        return separador + (ultimo
            ? `<strong style="color:var(--text);">${escapeHTML(nivel.nome)}</strong>`
            : `<a href="#" onclick="voltarTrilhaAcervoDrive(${i}); return false;" style="color: #0284c7; text-decoration:none; font-weight:600;">${escapeHTML(nivel.nome)}</a>`);
    }).join('');
}

function renderAcervoDriveLista() {
    const el = document.getElementById('acervoDriveLista');
    const contEl = document.getElementById('acervoDriveContadorItens');
    const infoPastaEl = document.getElementById('acervoDriveInfoPasta');
    if (!el) return;

    const nivelAtual = acervoDriveTrilha[acervoDriveTrilha.length - 1];
    if (infoPastaEl) {
        infoPastaEl.textContent = nivelAtual ? `Pasta: ${nivelAtual.nome}` : '';
    }

    if (acervoDriveItens.length === 0) {
        if (contEl) contEl.textContent = '0 itens';
        el.innerHTML = '<div class="db-list-empty" style="padding:24px; text-align:center; color:var(--text-light);"><i class="fas fa-folder-open" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6;"></i>Nenhum arquivo ou subpasta nesta pasta do Drive.</div>';
        return;
    }

    let itensExibidos = acervoDriveItens;
    if (acervoDriveTermoBusca) {
        itensExibidos = acervoDriveItens.filter(item => {
            const nome = (item.name || '').toLowerCase();
            return nome.includes(acervoDriveTermoBusca);
        });
    }

    if (contEl) {
        if (acervoDriveTermoBusca) {
            contEl.textContent = `Exibindo ${itensExibidos.length} de ${acervoDriveItens.length} itens`;
        } else {
            contEl.textContent = `${acervoDriveItens.length} item(ns) encontrado(s)`;
        }
    }

    if (itensExibidos.length === 0) {
        el.innerHTML = `<div class="db-list-empty" style="padding:20px; text-align:center; color:var(--text-light);"><i class="fas fa-search" style="font-size:20px; margin-bottom:6px; display:block; opacity:0.5;"></i>Nenhum item encontrado para "<strong>${escapeHTML(acervoDriveTermoBusca)}</strong>".</div>`;
        return;
    }

    el.innerHTML = itensExibidos.map(item => {
        const ehPasta = item.mimeType === 'application/vnd.google-apps.folder';
        const icone = ehPasta 
            ? '<i class="fas fa-folder" style="color:#f59e0b; margin-right:8px; font-size:18px;"></i>' 
            : '<i class="fas fa-file-pdf" style="color:#ef4444; margin-right:8px; font-size:18px;"></i>';

        // Extrai código de patrimônio amigável se for checklist padrão CKL_YYYY-MM-DD_PATR_EQUIP
        let badgePatrimonio = '';
        let badgeLegado = '';
        const matchCkl = (item.name || '').match(/^CKL_[^_]+_([A-Za-z0-9-]+)_(.+)\.pdf$/i);
        if (matchCkl) {
            badgePatrimonio = `<span class="acervo-badge-patr">${escapeHTML(matchCkl[1])}</span>`;
        }
        if (item.name && item.name.includes('(Legado)')) {
            badgeLegado = `<span class="acervo-badge-legado">Legado</span>`;
        }

        const detalhe = ehPasta 
            ? 'Pasta do Google Drive' 
            : `${formatarTamanhoArquivoAcervoDrive(item.size)} • Modificado em ${formatSimpleDate(item.modifiedTime)}`;

        if (ehPasta) {
            const nomePastaEsc = (item.name || '').replace(/'/g, "\\'");
            return `<div class="acervo-drive-item" onclick="abrirPastaAcervoDrive('${escapeHTML(item.id)}', '${escapeHTML(nomePastaEsc)}')">
                <div style="min-width:0; flex:1;">
                    <div class="db-list-item-title" style="font-weight:600; display:flex; align-items:center; flex-wrap:wrap; word-break:break-word; gap:4px;">
                        ${icone} ${badgePatrimonio}<span>${escapeHTML(item.name || '(sem nome)')}</span> ${badgeLegado}
                    </div>
                    <div class="acervo-file-meta">${detalhe}</div>
                </div>
                <div class="acervo-drive-acoes">
                    <span style="font-size:12px; color:var(--text-light);"><i class="fas fa-chevron-right"></i></span>
                </div>
            </div>`;
        }

        const linkDrive = item.webViewLink || (item.id ? `https://drive.google.com/file/d/${item.id}/preview` : '#');

        return `<div class="acervo-drive-item" onclick="visualizarArquivoAcervoDrive('${escapeHTML(item.id)}')">
            <div style="min-width:0; flex:1;">
                <div class="db-list-item-title" style="font-weight:600; display:flex; align-items:center; flex-wrap:wrap; word-break:break-word; gap:4px;">
                    ${icone} ${badgePatrimonio}<span>${escapeHTML(item.name || '(sem nome)')}</span> ${badgeLegado}
                </div>
                <div class="acervo-file-meta">${detalhe}</div>
            </div>
            <div class="acervo-drive-acoes" onclick="event.stopPropagation();">
                <button type="button" class="btn-visualizar-drive" onclick="visualizarArquivoAcervoDrive('${escapeHTML(item.id)}')" title="Visualizar documento dentro do painel">
                    <i class="fas fa-eye"></i> Visualizar
                </button>
                <a href="${escapeHTML(linkDrive)}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="btn-abrir-drive" 
                   title="Abrir arquivo diretamente no Google Drive (nova guia)">
                    Abrir ↗
                </a>
            </div>
        </div>`;
    }).join('');
}

function abrirItemAcervoDrive(id) {
    const item = acervoDriveItens.find(i => i.id === id);
    if (!item) return;
    if (item.mimeType === 'application/vnd.google-apps.folder') {
        abrirPastaAcervoDrive(item.id, item.name);
    } else {
        visualizarArquivoAcervoDrive(item.id);
    }
}

function visualizarArquivoAcervoDrive(id) {
    const item = acervoDriveItens.find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('modalPreviewDrivePdf');
    const iframe = document.getElementById('modalPreviewDriveIframe');
    const loading = document.getElementById('modalPreviewDriveLoading');
    const tituloEl = document.getElementById('modalPreviewDriveTitulo');
    const subtituloEl = document.getElementById('modalPreviewDriveSubtitulo');
    const linkExt = document.getElementById('modalPreviewDriveLinkExterno');

    const previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(item.id)}/preview`;
    const abrirUrl = item.webViewLink || previewUrl;

    if (!modal || !iframe) {
        // Fallback síncrono limpo via link temporário nativo (sem window.open suscetível a bloqueio)
        const a = document.createElement('a');
        a.href = abrirUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    if (tituloEl) tituloEl.textContent = item.name || 'Documento do Acervo';
    if (subtituloEl) {
        const meta = [
            formatarTamanhoArquivoAcervoDrive(item.size),
            item.modifiedTime ? `Modificado em ${formatSimpleDate(item.modifiedTime)}` : ''
        ].filter(Boolean).join(' • ');
        subtituloEl.textContent = meta || 'Google Drive — Visualização Segura';
    }

    if (linkExt) {
        linkExt.href = abrirUrl;
    }

    if (loading) loading.style.display = 'flex';
    iframe.src = previewUrl;
    modal.style.display = 'flex';
}

function fecharModalPreviewDrivePdf() {
    const modal = document.getElementById('modalPreviewDrivePdf');
    const iframe = document.getElementById('modalPreviewDriveIframe');
    if (iframe) iframe.src = 'about:blank';
    if (modal) modal.style.display = 'none';
}

// Fechamento via tecla ESC para acessibilidade e agilidade
document.addEventListener('keydown', function(evt) {
    if (evt.key === 'Escape' || evt.key === 'Esc') {
        const modal = document.getElementById('modalPreviewDrivePdf');
        if (modal && modal.style.display === 'flex') {
            fecharModalPreviewDrivePdf();
        }
    }
});

function formatarTamanhoArquivoAcervoDrive(bytes) {
    const n = parseInt(bytes, 10);
    if (!n || isNaN(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
}

// ============================================
// MÓDULO ACERVO DRIVE - ESTRUTURA HIERÁRQUICA DE FOTOS & INTEGRAÇÃO OPERACIONAL
// Convenção: [Raiz_Fotos] / [AAAA] / [AAAA-MM - NomeMes] / [Categoria] / [AAAA-MM-DD - Tema/Identificador]
// Categorias: 01_Treinamentos, 02_DDSMA, 03_Boas Praticas, 04_Nao Conformidades
// ============================================

function montarEstruturaPastaFotos(tipoOuCategoria, dataStr, temaStr) {
    let d = dataStr ? parseLocalDate(dataStr) : new Date();
    if (!d || isNaN(d.getTime())) d = new Date();

    const ano = String(d.getFullYear());
    const mesNum = d.getMonth() + 1;
    const mesStr = String(mesNum).padStart(2, '0');
    const diaStr = String(d.getDate()).padStart(2, '0');
    const dataIso = `${ano}-${mesStr}-${diaStr}`;
    const nomeMes = (typeof NOMES_MESES !== 'undefined' && NOMES_MESES[d.getMonth()]) ? NOMES_MESES[d.getMonth()] : 'Mes';
    const mesPasta = `${ano}-${mesStr} - ${nomeMes}`;

    let categoria = '01_Treinamentos';
    const catLow = String(tipoOuCategoria || '').toLowerCase();
    if (catLow.includes('dds')) {
        categoria = '02_DDSMA';
    } else if (catLow.includes('boa') || catLow.includes('pratica')) {
        categoria = '03_Boas Praticas';
    } else if (catLow.includes('nao_conf') || catLow.includes('desvio') || catLow.includes('nc') || catLow.includes('04_')) {
        categoria = '04_Nao Conformidades';
    } else if (catLow.includes('03_')) {
        categoria = '03_Boas Praticas';
    } else if (catLow.includes('02_')) {
        categoria = '02_DDSMA';
    } else {
        categoria = '01_Treinamentos';
    }

    const temaLimpo = String(temaStr || 'Geral')
        .replace(/[\/\\:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    const subpastaFinal = `${dataIso} - ${temaLimpo}`;

    const raizNome = 'SST - Fotos & Evidências';
    const caminhoCompleto = `${raizNome} / ${ano} / ${mesPasta} / ${categoria} / ${subpastaFinal}`;

    return {
        ano,
        mesNum,
        mesStr,
        diaStr,
        dataIso,
        nomeMes,
        mesPasta,
        categoria,
        temaLimpo,
        subpastaFinal,
        raizNome,
        caminhoCompleto
    };
}

const DEFAULT_DRIVE_GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzdCzGE9Jm77RauUe8iuo1p8il193F7Pd7HeLLbut0zToD8zhHtv2RBSAY86bQZGLtA/exec';

function getDriveGasWebhookUrl() {
    const fromSettings = (allChecklistItemSettings || []).find(s => 
        s.id === 'drive_gas_webhook_url' ||
        s.id === 'drive_config' || 
        s.id === 'drive_settings' || 
        s.key === 'drive_gas_webhook_url' ||
        s.drive_gas_webhook_url
    );
    let urlFromCustom = '';
    if (fromSettings?.custom_items && Array.isArray(fromSettings.custom_items) && fromSettings.custom_items.length > 0) {
        urlFromCustom = fromSettings.custom_items[0]?.url || fromSettings.custom_items[0]?.webhook_url || '';
    }
    return urlFromCustom ||
           fromSettings?.drive_gas_webhook_url || 
           fromSettings?.value || 
           localStorage.getItem('drive_gas_webhook_url') || 
           DEFAULT_DRIVE_GAS_WEBHOOK_URL;
}

const ID_DDSMA_LEGADO = '1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms';

function normalizarUrlGoogleDriveFolder(urlOuId) {
    if (!urlOuId) return '';
    const str = String(urlOuId).trim();
    if (!str) return '';
    if (str.startsWith('http://') || str.startsWith('https://')) return str;
    return `https://drive.google.com/drive/folders/${str}`;
}

function getDriveFolderFotosUrl(usarFallbackLegado = false) {
    // 1. Campo em tempo real do modal de configuração ("Pasta Raiz de Fotos & Evidências")
    const inpFolderFotos = document.getElementById('cfgDriveFolderFotosUrl');
    if (inpFolderFotos && inpFolderFotos.value && inpFolderFotos.value.trim()) {
        const val = inpFolderFotos.value.trim();
        if (!val.includes(ID_DDSMA_LEGADO) || usarFallbackLegado) {
            return normalizarUrlGoogleDriveFolder(val);
        }
    }

    // 2. Busca no localStorage (preferência do usuário salva no navegador)
    const local = localStorage.getItem('drive_folder_fotos_url') || localStorage.getItem('cfgDriveFolderFotosUrl');
    if (local && local.trim()) {
        const val = local.trim();
        if (!val.includes(ID_DDSMA_LEGADO) || usarFallbackLegado) {
            return normalizarUrlGoogleDriveFolder(val);
        }
    }

    // 3. Busca no cache sincronizado do Supabase (checklist_item_settings)
    const fromSettings = (allChecklistItemSettings || []).find(s => 
        s.id === 'drive_folder_fotos_url' || 
        s.id === 'drive_config' || 
        s.id === 'drive_settings' || 
        s.key === 'drive_folder_fotos_url'
    );
    if (fromSettings) {
        let urlSettings = '';
        if (Array.isArray(fromSettings.custom_items) && fromSettings.custom_items.length > 0) {
            const item = fromSettings.custom_items[0];
            urlSettings = item?.url || item?.drive_folder_fotos_url || '';
        } else if (fromSettings.custom_items && typeof fromSettings.custom_items === 'object') {
            urlSettings = fromSettings.custom_items.url || fromSettings.custom_items.drive_folder_fotos_url || '';
        }
        if (!urlSettings && fromSettings.drive_folder_fotos_url) urlSettings = fromSettings.drive_folder_fotos_url;
        if (!urlSettings && fromSettings.value) urlSettings = fromSettings.value;
        if (urlSettings && urlSettings.trim()) {
            const val = urlSettings.trim();
            if (!val.includes(ID_DDSMA_LEGADO) || usarFallbackLegado) {
                return normalizarUrlGoogleDriveFolder(val);
            }
        }
    }

    // 4. Atributo data-url configurado no próprio card
    const card = document.getElementById('cardAcervoFotosDrive');
    const dataUrl = card ? card.getAttribute('data-url') : null;
    if (dataUrl && dataUrl.trim()) {
        const val = dataUrl.trim();
        if (!val.includes(ID_DDSMA_LEGADO) || usarFallbackLegado) {
            return normalizarUrlGoogleDriveFolder(val);
        }
    }

    // 5. Se o usuário explicitamente pediu fallback legado, devolve o link do DDSMA; senão retorna vazio para exigir configuração da pasta exclusiva
    return usarFallbackLegado ? `https://drive.google.com/drive/folders/${ID_DDSMA_LEGADO}` : '';
}

function abrirPastaRaizFotosDrive(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const urlFotos = getDriveFolderFotosUrl(false);
    if (!urlFotos) {
        if (typeof mostrarFeedbackToast === 'function') {
            mostrarFeedbackToast('Por favor, informe a URL da pasta de Fotos e Evidências no campo abaixo.', 'info');
        }
        const inp = document.getElementById('cfgDriveFolderFotosUrl');
        if (inp) inp.focus();
        return;
    }
    const link = document.createElement('a');
    link.href = urlFotos;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
}

function tratarCliqueCardFotosDrive(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        // Evita disparar a navegação caso o clique tenha ocorrido na engrenagem de configuração
        if (e.target && typeof e.target.closest === 'function' && e.target.closest('.btn-config-card-fotos')) {
            return;
        }
    }

    const urlFotos = getDriveFolderFotosUrl(false);

    // Se a pasta exclusiva ainda não foi configurada ou ainda aponta para o repositório de DDSMA
    if (!urlFotos) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Pasta de Fotos & Evidências no Drive',
                html: `
                    <p style="font-size:13px; color:#475569; margin-bottom:12px; line-height:1.5;">
                        A pasta raiz exclusiva de <b>Fotos & Evidências</b> ainda não foi vinculada no Google Drive da obra (o link anterior pertencia ao acervo de DDSMA).
                    </p>
                    <div style="background:#f1f5f9; border-left:4px solid #0284c7; padding:10px 14px; text-align:left; font-size:12px; color:#334155; margin-bottom:14px; border-radius:4px; line-height:1.6;">
                        <b>Como ativar em 3 passos:</b><br/>
                        <b>1.</b> Acesse o Google Drive e crie uma nova pasta com o nome <b>"SST - Fotos & Evidências"</b>.<br/>
                        <b>2.</b> Copie o link dessa pasta no Drive.<br/>
                        <b>3.</b> Cole o link na engrenagem de configurações deste card.
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '⚙️ Configurar Link Agora',
                cancelButtonText: 'Criar no Google Drive ↗',
                confirmButtonColor: '#0284c7',
                cancelButtonColor: '#64748b'
            }).then((result) => {
                if (result.isConfirmed) {
                    abrirModalConfigGoogleDrive();
                    setTimeout(() => {
                        const inp = document.getElementById('cfgDriveFolderFotosUrl');
                        if (inp) {
                            if (inp.value.includes(ID_DDSMA_LEGADO)) inp.value = '';
                            inp.focus();
                        }
                    }, 300);
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    const linkDrive = document.createElement('a');
                    linkDrive.href = 'https://drive.google.com/drive/my-drive';
                    linkDrive.target = '_blank';
                    linkDrive.rel = 'noopener noreferrer';
                    linkDrive.click();
                }
            });
            return;
        } else {
            abrirModalConfigGoogleDrive();
            return;
        }
    }

    const link = document.createElement('a');
    link.href = urlFotos;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
}

function abrirConfiguracaoFotosDrive(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }
    abrirModalConfigGoogleDrive();
}

function atualizarCardFotosDrive() {
    const card = document.getElementById('cardAcervoFotosDrive');
    const url = getDriveFolderFotosUrl(false);
    if (card) {
        if (url) {
            card.setAttribute('data-url', url);
            card.setAttribute('title', `Abrir pasta raiz de Fotos e Evidências no Google Drive (${url})`);
        } else {
            card.removeAttribute('data-url');
            card.setAttribute('title', 'Clique para configurar ou vincular a pasta raiz de Fotos e Evidências no Google Drive');
        }
    }
    const linkModal = document.getElementById('cfgDriveLinkPastaFotos');
    if (linkModal) {
        if (url) {
            linkModal.href = url;
            linkModal.style.display = 'inline-flex';
        } else {
            linkModal.href = '#';
            linkModal.style.display = 'none';
        }
    }
    const inpFolderFotos = document.getElementById('cfgDriveFolderFotosUrl');
    if (inpFolderFotos && !inpFolderFotos.value && url) {
        inpFolderFotos.value = url;
    }
}

async function salvarConfiguracaoFotosDrive(folderFotosUrl) {
    const url = normalizarUrlGoogleDriveFolder(folderFotosUrl);
    const urlLimpa = (url && !url.includes(ID_DDSMA_LEGADO)) ? url : '';
    if (urlLimpa) {
        localStorage.setItem('drive_folder_fotos_url', urlLimpa);
    } else {
        localStorage.removeItem('drive_folder_fotos_url');
    }

    const payload = {
        id: 'drive_folder_fotos_url',
        categoria: 'acervo_drive',
        custom_items: [{ key: 'drive_folder_fotos_url', url: urlLimpa }],
        disabled_items: [],
        updated_at: new Date().toISOString()
    };

    try {
        await supabaseUpsert('checklist_item_settings', [payload]);
        const idx = (allChecklistItemSettings || []).findIndex(s => s.id === 'drive_folder_fotos_url');
        if (idx >= 0) {
            allChecklistItemSettings[idx] = { ...allChecklistItemSettings[idx], ...payload };
        } else {
            allChecklistItemSettings.push(payload);
        }
    } catch (err) {
        console.warn('Erro ao salvar drive_folder_fotos_url no Supabase:', err);
    }

    atualizarCardFotosDrive();
}

window.normalizarUrlGoogleDriveFolder = normalizarUrlGoogleDriveFolder;
window.getDriveFolderFotosUrl = getDriveFolderFotosUrl;
window.abrirPastaRaizFotosDrive = abrirPastaRaizFotosDrive;
window.tratarCliqueCardFotosDrive = tratarCliqueCardFotosDrive;
window.abrirConfiguracaoFotosDrive = abrirConfiguracaoFotosDrive;
window.atualizarCardFotosDrive = atualizarCardFotosDrive;
window.salvarConfiguracaoFotosDrive = salvarConfiguracaoFotosDrive;

function extrairIdPastaDrive(urlOuId) {
    if (!urlOuId) return '';
    const str = String(urlOuId).trim();
    const match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    return str;
}

async function abrirPastaFotosOperacional(tipoOuCategoria, dataStr, temaStr) {
    const info = montarEstruturaPastaFotos(tipoOuCategoria, dataStr, temaStr);
    const webhookUrl = getDriveGasWebhookUrl();
    const raizFotosUrl = getDriveFolderFotosUrl();
    const temSwal = (typeof Swal !== 'undefined');

    if (temSwal) {
        Swal.fire({
            title: 'Preparando pasta no Drive...',
            html: `
                <p style="font-size:12px; color:#64748b; margin-bottom:8px;">Verificando ou criando diretório na nuvem:</p>
                <div style="background:#f1f5f9; padding:8px 10px; border-radius:6px; font-size:11px; font-family:monospace; color:#0369a1; word-break:break-all; text-align:left;">
                    ${escapeHTML(info.caminhoCompleto)}
                </div>
            `,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    let urlDestino = null;

    if (webhookUrl) {
        try {
            const payload = {
                action: 'criar_pasta_fotos',
                rootFolderId: extrairIdPastaDrive(raizFotosUrl),
                ano: info.ano,
                mes: info.mesPasta,
                mesPasta: info.mesPasta,
                categoria: info.categoria,
                nomePastaFinal: info.subpastaFinal,
                subpasta: info.subpastaFinal,
                caminhoCompleto: info.caminhoCompleto,
                path: [info.ano, info.mesPasta, info.categoria, info.subpastaFinal]
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const resp = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const resJson = await resp.json().catch(() => null);
                if (resJson && (resJson.folderUrl || resJson.pastaUrl || resJson.url)) {
                    urlDestino = resJson.folderUrl || resJson.pastaUrl || resJson.url;
                }
            }
        } catch (err) {
            console.warn('Webhook do Google Drive offline ou com timeout, acionando fallback:', err);
        }
    }

    const finalUrl = urlDestino || raizFotosUrl;

    let copiado = false;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(info.caminhoCompleto);
            copiado = true;
        }
    } catch (_) {}

    if (temSwal) {
        Swal.fire({
            icon: urlDestino ? 'success' : 'info',
            title: urlDestino ? 'Pasta Pronta no Drive!' : 'Estrutura das Evidências Fotográficas',
            html: `
                <div style="font-size:12.5px; color:#475569; margin-bottom:10px; text-align:left;">
                    ${copiado 
                        ? '✅ <span style="color:#10b981; font-weight:600;">Caminho copiado para a área de transferência!</span>' 
                        : 'Diretório padronizado:'}
                </div>
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px; font-size:11px; font-family:monospace; color:#1e293b; margin-bottom:14px; word-break:break-all; text-align:left;">
                    ${escapeHTML(info.caminhoCompleto)}
                </div>
                <p style="font-size:11.5px; color:#64748b; margin-bottom:16px; text-align:left;">
                    ${urlDestino 
                        ? 'Clique abaixo para abrir a pasta específica no Google Drive:' 
                        : 'Navegue até a pasta no Drive ou utilize o caminho copiado:'}
                </p>
                <div style="text-align:center;">
                    <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="swal2-confirm swal2-styled" style="text-decoration:none; display:inline-block; padding:10px 22px; background:#0284c7; color:#ffffff; font-weight:700; border-radius:6px; box-shadow:0 2px 6px rgba(2,132,199,0.25);">
                        Abrir Pasta no Google Drive ↗
                    </a>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar'
        });
    } else {
        abrirModalConfirmacaoFotosDrive(info, finalUrl, copiado);
    }
}

function abrirModalConfirmacaoFotosDrive(info, url, copiado) {
    const modal = document.getElementById('modalPastaFotosDrive');
    if (!modal) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
    }
    const txtEl = document.getElementById('modalPastaFotosCaminhoTexto');
    const linkEl = document.getElementById('modalPastaFotosLinkDrive');
    const statusEl = document.getElementById('modalPastaFotosStatus');

    if (txtEl) txtEl.textContent = info.caminhoCompleto;
    if (linkEl) linkEl.href = url;
    if (statusEl) {
        statusEl.innerHTML = copiado 
            ? '✅ <strong>Caminho copiado para a área de transferência!</strong>' 
            : 'Navegue até a pasta ou cole o caminho no Google Drive.';
        statusEl.style.color = copiado ? 'var(--success)' : 'var(--text-light)';
    }

    modal.style.display = 'flex';
}

function fecharModalPastaFotosDrive() {
    const modal = document.getElementById('modalPastaFotosDrive');
    if (modal) modal.style.display = 'none';
}

function copiarCaminhoModalFotos() {
    const txtEl = document.getElementById('modalPastaFotosCaminhoTexto');
    if (txtEl && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txtEl.textContent.trim()).then(() => {
            const btn = document.getElementById('btnCopiarCaminhoFotos');
            if (btn) {
                const old = btn.textContent;
                btn.textContent = '✅ Copiado!';
                setTimeout(() => { btn.textContent = old; }, 2000);
            }
        });
    }
}

window.resetAcervoDrive = resetAcervoDrive;
window.recarregarAcervoDrive = recarregarAcervoDrive;
window.abrirCategoriaAcervoDrive = abrirCategoriaAcervoDrive;
window.abrirPastaAcervoDrive = abrirPastaAcervoDrive;
window.voltarTrilhaAcervoDrive = voltarTrilhaAcervoDrive;
window.filtrarItensAcervoDrive = filtrarItensAcervoDrive;
window.limparBuscaAcervoDrive = limparBuscaAcervoDrive;
window.abrirItemAcervoDrive = abrirItemAcervoDrive;
window.visualizarArquivoAcervoDrive = visualizarArquivoAcervoDrive;
window.fecharModalPreviewDrivePdf = fecharModalPreviewDrivePdf;
window.abrirPastaRaizFotosDrive = abrirPastaRaizFotosDrive;
window.abrirPastaFotosOperacional = abrirPastaFotosOperacional;
window.fecharModalPastaFotosDrive = fecharModalPastaFotosDrive;
window.copiarCaminhoModalFotos = copiarCaminhoModalFotos;
window.getDriveFolderFotosUrl = getDriveFolderFotosUrl;
window.getDriveGasWebhookUrl = getDriveGasWebhookUrl;

// ============================================
// MODAL DE UPLOAD DE ARQUIVOS PARA O ACERVO DRIVE
// ============================================
function abrirModalUploadAcervoDrive(isContextual = false) {
    const modal = document.getElementById('modalUploadAcervoDrive');
    if (!modal) return;
    acervoArquivosParaUpload = [];
    renderListaArquivosAcervo();

    const wrapContextual = document.getElementById('wrapAcervoDestinoContextual');
    const labelContextual = document.getElementById('labelAcervoPastaContextual');
    const chkTrocar = document.getElementById('chkAcervoTrocarDestino');
    const wrapCampos = document.getElementById('wrapAcervoDestinoCampos');
    const selCat = document.getElementById('selAcervoCategoriaDestino');
    const statusMsg = document.getElementById('acervoUploadStatusMsg');
    const wrapProg = document.getElementById('wrapAcervoProgresso');

    if (statusMsg) statusMsg.style.display = 'none';
    if (wrapProg) wrapProg.style.display = 'none';

    // Se o usuário está dentro de uma pasta e clicou "Subir Nesta Pasta"
    if (isContextual && acervoPastaContextualAtiva && acervoPastaContextualAtiva.id) {
        if (wrapContextual) wrapContextual.style.display = 'block';
        if (labelContextual) labelContextual.textContent = acervoPastaContextualAtiva.nome;
        if (chkTrocar) chkTrocar.checked = false;
        if (wrapCampos) wrapCampos.style.display = 'none';
    } else {
        if (wrapContextual) wrapContextual.style.display = 'none';
        if (wrapCampos) wrapCampos.style.display = 'grid';
        if (acervoDriveCategoria && selCat) selCat.value = acervoDriveCategoria;
    }

    modal.style.display = 'flex';
}

function abrirModalUploadAcervoDriveContextual() {
    abrirModalUploadAcervoDrive(true);
}

function fecharModalUploadAcervoDrive() {
    const modal = document.getElementById('modalUploadAcervoDrive');
    if (modal) modal.style.display = 'none';
    acervoArquivosParaUpload = [];
}

function toggleAcervoCustomDestino() {
    const chk = document.getElementById('chkAcervoTrocarDestino');
    const wrapCampos = document.getElementById('wrapAcervoDestinoCampos');
    if (wrapCampos) {
        wrapCampos.style.display = chk && chk.checked ? 'grid' : 'none';
    }
}

function aoSelecionarArquivosAcervo(evt) {
    const files = Array.from(evt.target.files || []);
    for (const f of files) {
        if (f.size > 25 * 1024 * 1024) {
            mostrarFeedbackToast(`O arquivo "${f.name}" excede 25 MB e foi ignorado.`, 'aviso');
            continue;
        }
        if (!acervoArquivosParaUpload.some(item => item.name === f.name && item.size === f.size)) {
            acervoArquivosParaUpload.push(f);
        }
    }
    renderListaArquivosAcervo();
    evt.target.value = '';
}

function removerArquivoUploadAcervo(index) {
    acervoArquivosParaUpload.splice(index, 1);
    renderListaArquivosAcervo();
}

function renderListaArquivosAcervo() {
    const wrap = document.getElementById('wrapAcervoArquivosSelecionados');
    const lista = document.getElementById('listaAcervoArquivos');
    if (!wrap || !lista) return;

    if (acervoArquivosParaUpload.length === 0) {
        wrap.style.display = 'none';
        lista.innerHTML = '';
        return;
    }

    wrap.style.display = 'block';
    lista.innerHTML = acervoArquivosParaUpload.map((f, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.03); border:1px solid var(--border); border-radius:6px; padding:6px 10px; font-size:12px;">
            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">
                📄 <strong>${escapeHTML(f.name)}</strong> <span style="color:var(--text-light); font-size:11px;">(${formatarTamanhoArquivoAcervoDrive(f.size)})</span>
            </div>
            <button type="button" class="db-clear-btn" style="padding:2px 6px; font-size:11px; color:var(--danger);" onclick="removerArquivoUploadAcervo(${i})">✕</button>
        </div>
    `).join('');
}

async function iniciarUploadArquivosAcervo() {
    if (acervoArquivosParaUpload.length === 0) {
        mostrarFeedbackToast('Selecione pelo menos um arquivo para enviar.', 'aviso');
        return;
    }

    const btnIniciar = document.getElementById('btnIniciarUploadAcervo');
    const btnCancelar = document.getElementById('btnCancelarUploadAcervo');
    const wrapProg = document.getElementById('wrapAcervoProgresso');
    const barraProg = document.getElementById('acervoProgressoBarra');
    const pctProg = document.getElementById('acervoProgressoPct');
    const txtProg = document.getElementById('acervoProgressoTexto');
    const statusMsg = document.getElementById('acervoUploadStatusMsg');

    if (btnIniciar) btnIniciar.disabled = true;
    if (btnCancelar) btnCancelar.disabled = true;
    if (wrapProg) wrapProg.style.display = 'block';
    if (statusMsg) statusMsg.style.display = 'none';

    // Determina pasta de destino
    const chkTrocar = document.getElementById('chkAcervoTrocarDestino');
    const wrapContextual = document.getElementById('wrapAcervoDestinoContextual');
    const usarContextual = wrapContextual && wrapContextual.style.display !== 'none' && !(chkTrocar && chkTrocar.checked);

    let categoriaAlvo = document.getElementById('selAcervoCategoriaDestino')?.value || 'checklists';
    let anoAlvo = document.getElementById('selAcervoAnoDestino')?.value || new Date().getFullYear().toString();
    let pastaDestinoId = null;

    if (usarContextual && acervoPastaContextualAtiva && acervoPastaContextualAtiva.id) {
        pastaDestinoId = acervoPastaContextualAtiva.id;
    }

    const totalArquivos = acervoArquivosParaUpload.length;
    let enviadosComSucesso = 0;
    let erros = [];

    for (let i = 0; i < totalArquivos; i++) {
        const file = acervoArquivosParaUpload[i];
        const pct = Math.round((i / totalArquivos) * 100);
        if (barraProg) barraProg.style.width = pct + '%';
        if (pctProg) pctProg.textContent = pct + '%';
        if (txtProg) txtProg.textContent = `Enviando "${file.name}" (${i + 1} de ${totalArquivos})...`;

        try {
            // 1. Inicia sessão de upload
            const iniciarResp = await fetch('/api/anexo-iniciar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tabela: categoriaAlvo,
                    registroChave: 'ACERVO_' + Date.now(),
                    nomeArquivo: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    ano: anoAlvo,
                    pastaRaiz: categoriaAlvo === 'checklists' ? 'Checklists SST' : (categoriaAlvo === 'sms_cop' ? 'SMS_COP' : undefined),
                    pastaDestinoId: pastaDestinoId
                })
            });

            const iniciarDados = await iniciarResp.json();
            if (!iniciarResp.ok) throw new Error(iniciarDados.erro || `HTTP ${iniciarResp.status}`);

            // 2. Transfere arquivo em pedaços com suporte a CORS
            const arquivo = await enviarArquivoEmPedacos(file, iniciarDados.uploadUrl, txtProg);

            // 3. Finaliza permissão pública do arquivo
            try {
                await fetch('/api/anexo-finalizar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ driveFileId: arquivo.id })
                });
            } catch (eFin) {
                console.warn('Aviso ao finalizar anexo:', eFin);
            }

            enviadosComSucesso++;
        } catch (err) {
            console.error(`Erro ao subir ${file.name}:`, err);
            erros.push(`${file.name}: ${err.message}`);
        }
    }

    if (barraProg) barraProg.style.width = '100%';
    if (pctProg) pctProg.textContent = '100%';
    if (btnIniciar) btnIniciar.disabled = false;
    if (btnCancelar) btnCancelar.disabled = false;

    if (statusMsg) {
        statusMsg.style.display = 'block';
        if (erros.length === 0) {
            statusMsg.style.background = 'rgba(16,185,129,0.1)';
            statusMsg.style.border = '1px solid #10b981';
            statusMsg.style.color = '#065f46';
            statusMsg.innerHTML = `<strong>✅ Sucesso!</strong> Todos os ${enviadosComSucesso} arquivo(s) foram enviados com sucesso para o Google Drive.`;
            acervoArquivosParaUpload = [];
            renderListaArquivosAcervo();
            setTimeout(() => {
                fecharModalUploadAcervoDrive();
                recarregarAcervoDrive();
            }, 1500);
        } else {
            statusMsg.style.background = 'rgba(239,68,68,0.1)';
            statusMsg.style.border = '1px solid #ef4444';
            statusMsg.style.color = '#991b1b';
            statusMsg.innerHTML = `<strong>⚠️ Concluído com avisos:</strong> ${enviadosComSucesso} enviados, ${erros.length} com falha.<br><small>${erros.join('<br>')}</small>`;
            recarregarAcervoDrive();
        }
    }
}


function showAcidentesSubtab(tab) {
    ['visao', 'registrar', 'hht', 'relatorio'].forEach(t => {
        const content = document.getElementById('acidentesSubtab-' + t);
        const btn = document.getElementById('acidentesSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderAcidentesPanel();
    if (tab === 'hht') renderDiasTrabalhadosConfig();
    // A aba de Relatório usa os números da Visão Geral (window.acidReportData) - por isso,
    // ao abrir ela, força um recálculo da Visão Geral, garantindo que o relatório nunca
    // fique desatualizado mesmo que o usuário nunca tenha aberto essa outra sub-aba antes.
    if (tab === 'relatorio') { renderAcidentesPanel(); renderAcidentesRelatorioChecklist(); }
}

// ============================================
// RELATÓRIO CONFIGURÁVEL DE ACIDENTABILIDADE - mesmo padrão já usado em Saúde, Efetivo e
// EPI: o usuário escolhe via checkbox quais KPIs/gráficos/lista entram no relatório antes
// de gerar. Os dados vêm de window.acidReportData (preenchido no fim de
// renderAcidentesPanel - nunca recalculado aqui).
// ============================================

function renderAcidentesRelatorioChecklist() {
    const el = document.getElementById('acidRelPeriodo');
    if (el && window.acidReportData) el.textContent = window.acidReportData.periodoLabel || '—';
}

function marcarTodosRelatorioAcidentes(valor) {
    ['relAcidChk_tfg', 'relAcidChk_tg', 'relAcidChk_taxaIncidencia', 'relAcidChk_diasSemCpt', 'relAcidChk_diasSemSpt',
     'relAcidChk_total', 'relAcidChk_outras', 'relAcidChk_graficoTfCategoria', 'relAcidChk_graficoTfTg',
     'relAcidChk_graficoTipologia', 'relAcidChk_graficoSetor', 'relAcidChk_graficoParteCorpo',
     'relAcidChk_graficoAgenteCausador', 'relAcidChk_listaHistorico'].forEach(id => {
        const chk = document.getElementById(id);
        if (chk) chk.checked = valor;
    });
}

function lerSelecaoRelatorioAcidentes() {
    return {
        tfg: document.getElementById('relAcidChk_tfg').checked,
        tg: document.getElementById('relAcidChk_tg').checked,
        taxaIncidencia: document.getElementById('relAcidChk_taxaIncidencia').checked,
        diasSemCpt: document.getElementById('relAcidChk_diasSemCpt').checked,
        diasSemSpt: document.getElementById('relAcidChk_diasSemSpt').checked,
        total: document.getElementById('relAcidChk_total').checked,
        outras: document.getElementById('relAcidChk_outras').checked,
        graficoTfCategoria: document.getElementById('relAcidChk_graficoTfCategoria').checked,
        graficoTfTg: document.getElementById('relAcidChk_graficoTfTg').checked,
        graficoTipologia: document.getElementById('relAcidChk_graficoTipologia').checked,
        graficoSetor: document.getElementById('relAcidChk_graficoSetor').checked,
        graficoParteCorpo: document.getElementById('relAcidChk_graficoParteCorpo').checked,
        graficoAgenteCausador: document.getElementById('relAcidChk_graficoAgenteCausador').checked,
        listaHistorico: document.getElementById('relAcidChk_listaHistorico').checked
    };
}

async function gerarExcelAcidentes() {
    const statusEl = document.getElementById('relatorioAcidentesStatus');
    const dados = window.acidReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioAcidentes();
    if (Object.values(marcados).every(v => !v)) {
        statusEl.textContent = '❌ Selecione pelo menos um item para gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const aoa = [];
    aoa.push([`RELATÓRIO DE ACIDENTABILIDADE — ${dados.periodoLabel}`]);
    aoa.push([`Gerado em ${new Date().toLocaleDateString('pt-BR')}`]);
    aoa.push([]);

    const kpisMarcados = dados.kpis.filter(k => marcados[k.key]);
    if (kpisMarcados.length > 0) {
        aoa.push(['INDICADORES (KPIs)']);
        aoa.push(['Indicador', 'Valor']);
        kpisMarcados.forEach(k => aoa.push([k.label, k.value]));
        aoa.push([]);
    }

    Object.entries(dados.graficos).forEach(([key, g]) => {
        if (!marcados[key]) return;
        aoa.push([g.titulo.toUpperCase()]);
        if (g.series) {
            aoa.push(['Categoria', ...g.series.map(s => s.nome)]);
            g.labels.forEach((label, i) => aoa.push([label, ...g.series.map(s => s.valores[i])]));
        } else {
            aoa.push(['Categoria', 'Valor']);
            g.labels.forEach((label, i) => aoa.push([label, g.valores[i]]));
        }
        aoa.push([]);
    });

    Object.entries(dados.listas).forEach(([key, l]) => {
        if (!marcados[key]) return;
        aoa.push([l.titulo.toUpperCase()]);
        aoa.push(l.colunas);
        if (l.linhas.length === 0) aoa.push(['Nenhum item nessa lista no momento']);
        else l.linhas.forEach(linha => aoa.push(linha));
        aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ACIDENTABILIDADE');

    const dataSlug = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RELATORIO_ACIDENTABILIDADE_${dataSlug}.xlsx`);

    statusEl.textContent = `✅ Excel gerado com ${Object.values(marcados).filter(Boolean).length} item(ns) selecionado(s).`;
    statusEl.style.color = 'var(--success)';
}

function gerarPdfAcidentes() {
    const statusEl = document.getElementById('relatorioAcidentesStatus');
    const dados = window.acidReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioAcidentes();
    if (Object.values(marcados).every(v => !v)) {
        statusEl.textContent = '❌ Selecione pelo menos um item para gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const kpisMarcados = dados.kpis.filter(k => marcados[k.key]);
    const kpisHtml = kpisMarcados.length === 0 ? '' : `
    <h3>Indicadores (KPIs)</h3>
    <table style="width:65%; margin-bottom:14px;">
        <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
        <tbody>${kpisMarcados.map(k => `<tr><td style="text-align:left;">${escapeHTML(k.label)}</td><td>${escapeHTML(String(k.value))}</td></tr>`).join('')}</tbody>
    </table>`;

    const graficosHtml = Object.entries(dados.graficos).filter(([key]) => marcados[key]).map(([key, g]) => {
        if (g.series) {
            return `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:85%; margin-bottom:14px;">
        <thead><tr><th>Categoria</th>${g.series.map(s => `<th>${escapeHTML(s.nome)}</th>`).join('')}</tr></thead>
        <tbody>${g.labels.map((label, i) => `<tr><td style="text-align:left;">${escapeHTML(String(label))}</td>${g.series.map(s => `<td>${escapeHTML(String(s.valores[i] ?? '—'))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
        }
        return `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:65%; margin-bottom:14px;">
        <thead><tr><th>Categoria</th><th>Valor</th></tr></thead>
        <tbody>${g.labels.map((label, i) => `<tr><td style="text-align:left;">${escapeHTML(String(label))}</td><td>${escapeHTML(String(g.valores[i]))}</td></tr>`).join('')}</tbody>
    </table>`;
    }).join('');

    const listasHtml = Object.entries(dados.listas).filter(([key]) => marcados[key]).map(([key, l]) => `
    <h3>${escapeHTML(l.titulo)}</h3>
    <table style="width:100%; margin-bottom:14px;">
        <thead><tr>${l.colunas.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead>
        <tbody>${l.linhas.length === 0
            ? `<tr><td colspan="${l.colunas.length}">Nenhum item nessa lista no momento</td></tr>`
            : l.linhas.map(linha => `<tr>${linha.map((v, i) => `<td${i === 0 ? ' style="text-align:left;"' : ''}>${escapeHTML(String(v))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Acidentabilidade</title>
<style>
    @page { size: portrait; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 16px; }
    .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:6px; gap:10px; }
    .cabecalho img { max-height:40px; }
    .cabecalho .titulo { font-weight:700; font-size:14px; text-align:center; flex:1; }
    .info-geracao { font-size:11px; color:#444; margin-bottom:10px; }
    h3 { font-size:12px; margin:18px 0 6px; }
    table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:10px; }
    th, td { border:1px solid #999; padding:5px 6px; text-align:center; }
    th { background:#d9d9d9; font-weight:700; }
    tbody tr:nth-child(even) { background:#f7f7f7; }
    .no-print { text-align:center; margin:16px 0; }
    .no-print button { padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; border-radius:8px; border:none; background:#4f46e5; color:#fff; }
    @media print { .no-print { display:none; } body { margin:0; } thead { display: table-header-group; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo">RELATÓRIO DE ACIDENTABILIDADE</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Período: ${escapeHTML(dados.periodoLabel)} — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>

    ${kpisHtml}
    ${graficosHtml}
    ${listasHtml}
</body></html>`;

    abrirDocumentoBlob(html);
    statusEl.textContent = `✅ Relatório gerado — abra a aba nova pra imprimir/salvar em PDF.`;
    statusEl.style.color = 'var(--success)';
}

// ============================================
// CALENDÁRIO OPERACIONAL & DIAS TRABALHADOS (HHT) - ARCOVERDE / PE
// Escala da Obra: Seg-Qui (07h às 17h, 1h almoço = 9h) | Sex (07h às 16h, 1h almoço = 8h)
// Feriados Nacionais, Estaduais (PE) e Municipais de Arcoverde (11/09 e 23/09)
// Suporte total a compensações de dias/pontes (ex: 23/09 trabalhado +9h e 25/09 folga compensada 0h)
// ============================================

const ACIDENTES_MES_INICIO_CONTRATO = { ano: 2024, mes: 6 }; // mes 0-indexado (6 = julho)
let calHhtAnoAtual = new Date().getFullYear();
let calHhtMesAtual = new Date().getMonth();
let calHhtCompensacoesCache = {}; // { 'YYYY-MM': { [dia]: { horas: number, motivo: string } } }

// Cálculo do Domingo de Páscoa (Algoritmo astronômico de Meeus/Jones/Butcher)
function calcularPascoa(ano) {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(ano, mes, dia);
}

// Catálogo oficial de feriados aplicáveis à obra em Arcoverde - PE
function getFeriadosArcoverdeAno(ano) {
    const pascoa = calcularPascoa(ano);
    const addDias = (d, n) => {
        const r = new Date(d);
        r.setDate(r.getDate() + n);
        return r;
    };
    const formatKey = d => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const feriados = {
        '01-01': { nome: 'Ano Novo (Confraternização Universal)', tipo: 'Nacional' },
        '03-06': { nome: 'Data Magna de Pernambuco', tipo: 'Estadual (PE)' },
        '04-21': { nome: 'Tiradentes', tipo: 'Nacional' },
        '05-01': { nome: 'Dia do Trabalho', tipo: 'Nacional' },
        '06-24': { nome: 'São João', tipo: 'Regional' },
        '09-07': { nome: 'Independência do Brasil', tipo: 'Nacional' },
        '09-11': { nome: 'Emancipação Política de Arcoverde (Lei nº 2.566/2020)', tipo: 'Municipal (Arcoverde)' },
        '09-23': { nome: 'Nossa Senhora do Livramento (Padroeira de Arcoverde)', tipo: 'Municipal (Arcoverde)' },
        '10-12': { nome: 'Nossa Senhora Aparecida', tipo: 'Nacional' },
        '11-02': { nome: 'Finados', tipo: 'Nacional' },
        '11-15': { nome: 'Proclamação da República', tipo: 'Nacional' },
        '11-20': { nome: 'Dia da Consciência Negra', tipo: 'Nacional' },
        '12-25': { nome: 'Natal', tipo: 'Nacional' },
        // Feriados móveis
        [formatKey(addDias(pascoa, -48))]: { nome: 'Carnaval (Segunda-feira)', tipo: 'Facultativo / Acordo' },
        [formatKey(addDias(pascoa, -47))]: { nome: 'Carnaval (Terça-feira)', tipo: 'Facultativo / Acordo' },
        [formatKey(addDias(pascoa, -2))]: { nome: 'Sexta-feira da Paixão', tipo: 'Nacional' },
        [formatKey(addDias(pascoa, 60))]: { nome: 'Corpus Christi', tipo: 'Municipal / Religioso' }
    };
    return feriados;
}

// Carregar compensações salvas em configuracoes_sistema para o mês
async function carregarCompensacoesMes(ano, mes) {
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    if (calHhtCompensacoesCache[key] !== undefined) return calHhtCompensacoesCache[key];

    try {
        const rows = await supabaseFetch('configuracoes_sistema', `?id=eq.cal_hht_${key}`);
        if (rows && rows.length > 0 && rows[0].valor) {
            calHhtCompensacoesCache[key] = rows[0].valor.compensacoes || {};
        } else {
            calHhtCompensacoesCache[key] = {};
        }
    } catch (e) {
        console.warn('Erro ao carregar compensações de calendário:', e);
        calHhtCompensacoesCache[key] = {};
    }
    return calHhtCompensacoesCache[key];
}

function popularSelectsMesAnoHht() {
    const selMes = document.getElementById('calHhtMes');
    const selAno = document.getElementById('calHhtAno');
    if (!selMes || !selAno) return;

    if (selMes.options.length === 0) {
        selMes.innerHTML = NOMES_MESES.map((nome, idx) => `<option value="${idx}">${nome}</option>`).join('');
    }
    selMes.value = calHhtMesAtual;

    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let a = ACIDENTES_MES_INICIO_CONTRATO.ano; a <= anoAtual + 1; a++) {
        anos.push(a);
    }
    if (selAno.options.length === 0) {
        selAno.innerHTML = anos.map(a => `<option value="${a}">${a}</option>`).join('');
    }
    selAno.value = calHhtAnoAtual;
}

function onMesAnoCalendarioHhtChange() {
    const selMes = document.getElementById('calHhtMes');
    const selAno = document.getElementById('calHhtAno');
    if (selMes) calHhtMesAtual = parseInt(selMes.value, 10);
    if (selAno) calHhtAnoAtual = parseInt(selAno.value, 10);
    renderCalendarioHht();
}

function mudarMesCalendarioHht(delta) {
    calHhtMesAtual += delta;
    if (calHhtMesAtual < 0) {
        calHhtMesAtual = 11;
        calHhtAnoAtual--;
    } else if (calHhtMesAtual > 11) {
        calHhtMesAtual = 0;
        calHhtAnoAtual++;
    }
    popularSelectsMesAnoHht();
    renderCalendarioHht();
}

function irParaMesAtualCalendarioHht() {
    const hoje = new Date();
    calHhtAnoAtual = hoje.getFullYear();
    calHhtMesAtual = hoje.getMonth();
    popularSelectsMesAnoHht();
    renderCalendarioHht();
}

function abrirMesNoCalendarioHht(ano, mesIndex0) {
    calHhtAnoAtual = ano;
    calHhtMesAtual = mesIndex0;
    popularSelectsMesAnoHht();
    renderCalendarioHht();
    document.getElementById('calHhtGrid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Renderizar o calendário operacional do mês atual com a escala e feriados
async function renderCalendarioHht() {
    popularSelectsMesAnoHht();
    const gridEl = document.getElementById('calHhtGrid');
    if (!gridEl) return;

    const ano = calHhtAnoAtual;
    const mes = calHhtMesAtual;
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;

    // Carrega compensações salvas se houver
    const compensacoes = await carregarCompensacoesMes(ano, mes);
    const feriadosAno = getFeriadosArcoverdeAno(ano);
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const totalDiasMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay(); // 0=Dom ... 6=Sab

    let totalDiasTrabalhados = 0;
    let totalHorasTrabalhadas = 0;
    const diasData = [];

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const dataObj = new Date(ano, mes, dia);
        const diaSemana = dataObj.getDay();
        const mmDd = `${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const feriado = feriadosAno[mmDd];

        // Regra Padrão da Escala da Obra:
        // Seg-Qui: 9h (07h às 17h, 1h almoço)
        // Sex: 8h (07h às 16h, 1h almoço)
        // Sáb/Dom: 0h (Folga)
        let horasPadrao = 0;
        let tipoPadrao = 'folga';

        if (diaSemana >= 1 && diaSemana <= 4) {
            horasPadrao = 9;
            tipoPadrao = 'seg_qui';
        } else if (diaSemana === 5) {
            horasPadrao = 8;
            tipoPadrao = 'sexta';
        }

        if (feriado) {
            horasPadrao = 0;
            tipoPadrao = 'feriado';
        }

        // Verifica se há compensação manual para o dia
        const comp = compensacoes[dia];
        let horasFinais = horasPadrao;
        let ehCompensado = false;
        let labelCompensado = '';

        if (comp !== undefined) {
            ehCompensado = true;
            horasFinais = comp.horas;
            labelCompensado = comp.motivo || (horasFinais > 0 ? 'Trabalho compensado' : 'Folga compensada');
        }

        if (horasFinais > 0) {
            totalDiasTrabalhados++;
            totalHorasTrabalhadas += horasFinais;
        }

        diasData.push({
            dia,
            diaSemana,
            feriado,
            tipoPadrao,
            horasPadrao,
            horasFinais,
            ehCompensado,
            labelCompensado
        });
    }

    // Efetivo e HHT do mês
    const headcount = headcountAsOf(new Date(ano, mes + 1, 0));
    const totalHht = headcount * totalHorasTrabalhadas;
    const mediaHorasDia = totalDiasTrabalhados > 0 ? (totalHorasTrabalhadas / totalDiasTrabalhados).toFixed(2) : '0';

    // Atualiza KPIs
    const elKpiDias = document.getElementById('calHhtKpiDias');
    const elKpiHoras = document.getElementById('calHhtKpiHoras');
    const elKpiMedia = document.getElementById('calHhtKpiMediaDia');
    const elKpiEfetivo = document.getElementById('calHhtKpiEfetivo');
    const elKpiTotalHht = document.getElementById('calHhtKpiTotalHht');

    if (elKpiDias) elKpiDias.textContent = `${totalDiasTrabalhados} dias`;
    if (elKpiHoras) elKpiHoras.textContent = `${totalHorasTrabalhadas} h`;
    if (elKpiMedia) elKpiMedia.textContent = `média ${mediaHorasDia} h/dia`;
    if (elKpiEfetivo) elKpiEfetivo.textContent = `${headcount}`;
    if (elKpiTotalHht) elKpiTotalHht.textContent = totalHht > 0 ? totalHht.toLocaleString('pt-BR') : '—';

    // Monta o grid de dias
    let htmlGrid = '';

    // Células vazias antes do primeiro dia
    for (let v = 0; v < diaSemanaInicio; v++) {
        htmlGrid += `<div style="min-height: 85px; background: rgba(0,0,0,0.02); opacity: 0.3;"></div>`;
    }

    // Células dos dias
    diasData.forEach(item => {
        let bg = 'var(--card)';
        let borda = 'var(--border)';
        let badgeBg = '#f1f5f9';
        let badgeColor = '#475569';
        let badgeTexto = 'Folga (0h)';
        let extraInfo = '';

        if (item.ehCompensado) {
            bg = '#faf5ff';
            borda = '#d8b4fe';
            badgeBg = '#f3e8ff';
            badgeColor = '#7e22ce';
            badgeTexto = item.horasFinais > 0 ? `Compensado (${item.horasFinais}h)` : 'Folga Compensada (0h)';
            if (item.feriado) extraInfo = `<div style="font-size: 9.5px; color: #dc2626; font-weight: 600; margin-top: 2px;">Feriado: ${escapeHTML(item.feriado.nome)}</div>`;
        } else if (item.feriado) {
            bg = '#fff7ed';
            borda = '#fed7aa';
            badgeBg = '#ffedd5';
            badgeColor = '#c2410c';
            badgeTexto = 'Feriado (0h)';
            extraInfo = `<div style="font-size: 9.5px; color: #c2410c; font-weight: 600; margin-top: 2px;" title="${escapeHTML(item.feriado.nome)}">${escapeHTML(item.feriado.nome)}</div>`;
        } else if (item.tipoPadrao === 'seg_qui') {
            bg = '#f8fafc';
            badgeBg = '#dbeafe';
            badgeColor = '#1d4ed8';
            badgeTexto = 'Trabalho (9h)';
        } else if (item.tipoPadrao === 'sexta') {
            bg = '#f8fafc';
            badgeBg = '#dcfce7';
            badgeColor = '#15803d';
            badgeTexto = 'Trabalho (8h)';
        } else {
            bg = '#f8fafc';
            badgeBg = '#f1f5f9';
            badgeColor = '#64748b';
            badgeTexto = 'Fim de Semana (0h)';
        }

        const hojeDia = (new Date().getFullYear() === ano && new Date().getMonth() === mes && new Date().getDate() === item.dia);

        htmlGrid += `
            <div onclick="toggleDiaCalendarioHht(${item.dia})"
                 title="Clique para alternar dia trabalhado / compensação de escala"
                 style="min-height: 85px; padding: 6px 8px; background: ${bg}; cursor: pointer; transition: all 0.15s ease; border: 1px solid ${hojeDia ? '#2563eb' : borda}; border-radius: 4px; display: flex; flex-direction: column; justify-content: space-between; user-select: none;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 13px; color: ${hojeDia ? '#2563eb' : 'var(--text)'};">${item.dia} ${hojeDia ? '📍' : ''}</span>
                    <span style="font-size: 9px; font-weight: 700; padding: 2px 4px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; white-space: nowrap;">${badgeTexto}</span>
                </div>
                ${extraInfo}
                <div style="font-size: 9.5px; color: var(--text-light); text-align: right; margin-top: 4px;">
                    ${item.horasFinais > 0 ? `<strong>${item.horasFinais}h</strong> úteis` : '—'}
                </div>
            </div>
        `;
    });

    // Células vazias para fechar a última semana
    const sobra = (diaSemanaInicio + totalDiasMes) % 7;
    if (sobra > 0) {
        for (let s = sobra; s < 7; s++) {
            htmlGrid += `<div style="min-height: 85px; background: rgba(0,0,0,0.02); opacity: 0.3;"></div>`;
        }
    }

    gridEl.innerHTML = htmlGrid;
}

// Alternar dia ao clicar no calendário (trabalhado vs folga/compensação)
async function toggleDiaCalendarioHht(dia) {
    const ano = calHhtAnoAtual;
    const mes = calHhtMesAtual;
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const compMap = await carregarCompensacoesMes(ano, mes);

    const dataObj = new Date(ano, mes, dia);
    const diaSemana = dataObj.getDay();
    const mmDd = `${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const feriado = getFeriadosArcoverdeAno(ano)[mmDd];

    // Calcula horas padrão daquele dia da semana
    let horasPadrao = 0;
    if (diaSemana >= 1 && diaSemana <= 4) horasPadrao = 9;
    else if (diaSemana === 5) horasPadrao = 8;
    if (feriado) horasPadrao = 0;

    const atual = compMap[dia];

    if (atual === undefined) {
        if (horasPadrao > 0) {
            // Era trabalhado -> vira folga compensada (0h)
            compMap[dia] = { horas: 0, motivo: 'Folga compensada / Troca' };
        } else {
            // Era folga ou feriado -> vira trabalhado
            const horasTrabalho = diaSemana === 5 ? 8 : (diaSemana === 6 ? 8 : 9);
            compMap[dia] = { horas: horasTrabalho, motivo: feriado ? `Trabalho em feriado (${feriado.nome})` : 'Trabalho compensado / Extra' };
        }
    } else {
        // Se já tinha compensação, remove para retornar ao padrão
        delete compMap[dia];
    }

    calHhtCompensacoesCache[key] = compMap;
    renderCalendarioHht();
}

// Resetar compensações para o padrão da escala
async function resetarCompensacoesMesAtual() {
    const ano = calHhtAnoAtual;
    const mes = calHhtMesAtual;
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    if (!confirm(`Deseja restaurar a escala padrão de ${NOMES_MESES[mes]}/${ano} (removendo as compensações manuais)?`)) return;

    calHhtCompensacoesCache[key] = {};
    renderCalendarioHht();
}

// Salvar calendário apurado no Supabase e recalcular indicadores
async function salvarCalendarioHhtMes() {
    const statusEl = document.getElementById('calHhtStatus');
    const ano = calHhtAnoAtual;
    const mes = calHhtMesAtual;
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;

    if (statusEl) {
        statusEl.textContent = '⏳ Salvando Mês e HHT...';
        statusEl.style.color = 'var(--text-light)';
    }

    try {
        const compMap = await carregarCompensacoesMes(ano, mes);
        const feriadosAno = getFeriadosArcoverdeAno(ano);
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();

        let totalDias = 0;
        let totalHoras = 0;

        for (let dia = 1; dia <= ultimoDia; dia++) {
            const dataObj = new Date(ano, mes, dia);
            const diaSemana = dataObj.getDay();
            const mmDd = `${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const feriado = feriadosAno[mmDd];

            let horas = 0;
            if (diaSemana >= 1 && diaSemana <= 4) horas = 9;
            else if (diaSemana === 5) horas = 8;
            if (feriado) horas = 0;

            if (compMap[dia] !== undefined) {
                horas = compMap[dia].horas;
            }

            if (horas > 0) {
                totalDias++;
                totalHoras += horas;
            }
        }

        const mediaHorasDia = totalDias > 0 ? parseFloat((totalHoras / totalDias).toFixed(2)) : 8;
        // Sanitização obrigatória para coluna INTEGER na tabela public.hht_dias_trabalhados
        const horasDiaInt = Math.round(Number(mediaHorasDia) || 8);

        // 1. Salva na tabela hht_dias_trabalhados com tipos inteiros estritos (evita erro 22P02 do PostgreSQL)
        const payloadHht = {
            id: key,
            ano: parseInt(ano, 10),
            mes: parseInt(mes, 10) + 1,
            dias_trabalhados: parseInt(totalDias, 10),
            horas_por_dia: horasDiaInt
        };
        await supabaseUpsert('hht_dias_trabalhados', [payloadHht]);

        // 2. Salva o detalhamento completo em configuracoes_sistema (preservando precisão decimal e total_horas)
        await supabaseUpsert('configuracoes_sistema', [{
            id: `cal_hht_${key}`,
            valor: {
                ano: parseInt(ano, 10),
                mes: parseInt(mes, 10) + 1,
                total_horas: totalHoras,
                dias_trabalhados: parseInt(totalDias, 10),
                horas_por_dia: horasDiaInt,
                media_horas_dia: mediaHorasDia,
                compensacoes: compMap
            },
            descricao: `Detalhamento de dias trabalhados e compensações para ${key}`,
            atualizado_em: new Date().toISOString(),
            atualizado_por: usuarioDashboardAtual ? (usuarioDashboardAtual.nome || usuarioDashboardAtual.matricula) : 'sistema'
        }]);

        // Atualiza cache em memória
        hhtDiasTrabalhadosMap[key] = {
            id: key,
            ano: parseInt(ano, 10),
            mes: parseInt(mes, 10) + 1,
            dias_trabalhados: parseInt(totalDias, 10),
            horas_por_dia: horasDiaInt,
            total_horas: totalHoras,
            media_horas_dia: mediaHorasDia
        };

        if (statusEl) {
            statusEl.textContent = `✅ Mês e HHT salvos com sucesso! (${totalDias} dias úteis, ${totalHoras}h apuradas)`;
            statusEl.style.color = 'var(--success)';
            setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4500);
        }

        // Atualiza a visualização do calendário, a tabela consolidada e recalcula indicadores de Acidentabilidade sem recarregar a página
        renderCalendarioHht();
        renderDiasTrabalhadosConfig();
        renderAcidentesPanel();

    } catch (err) {
        console.error('Erro ao salvar calendário HHT:', err);
        if (statusEl) {
            statusEl.textContent = '❌ Falha ao salvar: ' + (err.message || 'Erro inesperado');
            statusEl.style.color = 'var(--danger)';
        }
    }
}

// Renderiza a lista consolidada de meses históricos
function renderDiasTrabalhadosConfig() {
    const container = document.getElementById('diasTrabalhadosLista');
    if (!container) return;

    // Renderiza também o calendário interativo no topo
    renderCalendarioHht();

    const hoje = new Date();
    const linhas = [];
    let cursor = new Date(ACIDENTES_MES_INICIO_CONTRATO.ano, ACIDENTES_MES_INICIO_CONTRATO.mes, 1);
    const limite = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

    while (cursor <= limite) {
        const ano = cursor.getFullYear(), mes = cursor.getMonth();
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const config = hhtDiasTrabalhadosMap[key] || {};
        const headcount = headcountAsOf(new Date(ano, mes + 1, 0));
        const label = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const dias = config.dias_trabalhados ?? '';
        const horasDia = config.horas_por_dia ?? 8;
        const totalHoras = dias !== '' ? Math.round(dias * horasDia) : '';
        const hhtTotal = dias !== '' && headcount > 0 ? Math.round(headcount * dias * horasDia) : '';

        linhas.push({ key, ano, mes, label, headcount, dias, horas: horasDia, totalHoras, hhtTotal });
        cursor = new Date(ano, mes + 1, 1);
    }

    linhas.reverse();

    container.innerHTML = linhas.map(l => `
        <div style="display: grid; grid-template-columns: 1.3fr 0.7fr 0.6fr 0.6fr 0.8fr auto; gap: 8px; align-items: center; padding: 9px 12px; border-radius: 8px; background: var(--bg); font-size: 12px; border: 1px solid var(--border);">
            <div style="font-weight: 700; text-transform: capitalize; color: var(--text);">${escapeHTML(l.label)}</div>
            <div style="color: var(--text-light);">Efetivo: <strong>${l.headcount}</strong></div>
            <div style="color: #10b981; font-weight: 600;">${l.dias !== '' ? l.dias + ' dias' : '<span style="color:#94a3b8;">Não apurado</span>'}</div>
            <div style="color: #2563eb; font-weight: 600;">${l.totalHoras !== '' ? l.totalHoras + ' h' : '—'}</div>
            <div style="color: #047857; font-weight: 700;">${l.hhtTotal !== '' ? l.hhtTotal.toLocaleString('pt-BR') + ' HHT' : '—'}</div>
            <button class="db-clear-btn" style="padding: 5px 12px; font-size: 11.5px; white-space: nowrap; font-weight: 600;" onclick="abrirMesNoCalendarioHht(${l.ano}, ${l.mes})">🗓️ Ver no Calendário</button>
        </div>
    `).join('');
}

// ============================================
// GESTÃO AMBIENTAL - Fase 1: resíduos de refeições (estimativa por consumo de quentinha/
// copo descartável) + rastreabilidade de manutenção veicular terceirizada (preventivas +
// trocas de óleo, com litros usados quando informado pela terceira). Gatilho real: o
// cliente (Ministério da Integração) pediu a relação de todos os resíduos gerados e a
// empresa não tinha isso catalogado. Licenças/Condicionantes/Compromissos/Relatórios
// Gerenciais ficam pra uma fase futura, quando houver dado real do usuário pra basear -
// não fabricar uma estrutura de licenciamento ambiental genérica.
// ============================================

let allResiduosRefeicoes = [];
let allManutencaoVeicular = [];
let ambientalLoaded = false;
let ambientalFilter = 'mes';
let ambientalFiltroAno = '';
let ambientalFiltroMes = '';

let allCipaMembros = [];
let allCipaReunioes = [];
let allCipaPlanoAcao = [];
let cipaLoaded = false;

// Brigada de Incêndio (2026-09-21, texto da ABNT NBR 14276:2020 conferido em 2026-09-22 -
// ver claude/bloco-notas-melhorias.md). Reaproveita o treinamento já cadastrado em
// treinamentos_catalogo (id='15', NR-23) e o efetivo de colaboradores_efetivo - só o
// organograma (tabela brigada_membros) e os parâmetros de dimensionamento
// (BRIGADA_PARAMETROS, dentro de configuracoes_sistema) são dados novos.
// O "minimo_brigadistas" default por grau_risco (2/2/4) já reflete o piso real da norma
// (item 4.1.3): 2 brigadistas para risco baixo/médio, 4 para risco alto - ver
// BRIGADA_PISO_NORMATIVO_NBR14276, adiante neste arquivo. O "percentual_efetivo" continua
// sendo uma estimativa nossa (a norma não define percentual: ela soma o dimensionamento
// por área/tempo de resposta, itens 4.1.6 a 4.1.8, que exige estudo formal do profissional
// habilitado).
let allBrigadaMembros = [];
let brigadaLoaded = false;
let brigadaMatriculasPendentesTreinamento = [];
let BRIGADA_PARAMETROS = {
    grau_risco: 'medio',
    percentual_efetivo: 10,
    minimo_brigadistas: 2
};
const BRIGADA_CARGO_LABELS = {
    coordenador_geral: 'Coordenador Geral da Brigada',
    chefe_brigada: 'Chefe de Brigada',
    lider_area: 'Líder de Área/Turno',
    brigadista: 'Brigadista'
};
const BRIGADA_CARGO_ORDEM = { coordenador_geral: 0, chefe_brigada: 1, lider_area: 2, brigadista: 3 };

// Constantes documentadas na própria planilha do usuário (aba RESIDUOS, ESTIMATIVA_
// RESIDUOS_COP_RAMAL_DO_AGRESTE.xlsx) e conferidas batendo com os valores calculados lá:
// isopor limpo (8,9g) + resíduo orgânico que sobra dentro ao descartar (15g) = 23,9g por
// quentinha; copo descartável PP 200ml = 1,8g por unidade.
let RESIDUO_KG_POR_QUENTINHA = 0.0239;
let RESIDUO_KG_POR_COPO = 0.0018;
// Peso médio único por unidade de EPI usado sem contaminação (luva, bota, capacete etc. -
// varia muito entre tipos, então o usuário optou por uma média única em vez de detalhar por
// tipo) - decidido com o usuário em 2026-09-16, pensado pra cobrir desde item leve até
// botina/capacete.
let RESIDUO_KG_POR_EPI = 0.5;

function pesoResiduoRefeicoesKg(r) {
    return (r.quentinhas_qtd || 0) * RESIDUO_KG_POR_QUENTINHA + (r.copos_qtd || 0) * RESIDUO_KG_POR_COPO + (r.epi_qtd || 0) * RESIDUO_KG_POR_EPI;
}

async function loadAmbientalData() {
    try {
        const [residuos, manutencao] = await Promise.all([
            supabaseFetch('residuos_refeicoes', '?select=*'),
            supabaseFetch('manutencao_veicular', '?select=*')
        ]);
        allResiduosRefeicoes = residuos;
        allManutencaoVeicular = manutencao;
        // Precisa do efetivo (sugestão de quantidade) e dos dias trabalhados (já
        // configurados em Acidentabilidade) mesmo se o usuário nunca abriu essas páginas.
        if (allEfetivo.length === 0) {
            allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        }
        if (Object.keys(hhtDiasTrabalhadosMap).length === 0) {
            const diasTrabalhadosRows = await supabaseFetch('hht_dias_trabalhados', '?select=*');
            diasTrabalhadosRows.forEach(r => { hhtDiasTrabalhadosMap[r.id] = r; });
        }
        renderAmbientalPanel();
        renderResiduosRefeicoesConfig();
        renderManutencaoResumo();
        filterManutencaoLista();
        renderManifestoResiduosResumo();
    } catch (err) {
        console.error('Erro ao carregar dados de Gestão Ambiental:', err);
    }
}

function showAmbientalSubtab(tab) {
    ['visao', 'refeicoes', 'manutencao', 'manifesto'].forEach(t => {
        const content = document.getElementById('ambientalSubtab-' + t);
        const btn = document.getElementById('ambientalSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderAmbientalPanel();
    if (tab === 'refeicoes') renderResiduosRefeicoesConfig();
    if (tab === 'manutencao') { fecharFormManutencao(); renderManutencaoResumo(); filterManutencaoLista(); }
    if (tab === 'manifesto') renderManifestoResiduosResumo();
}

function popularFiltroAnoAmbiental() {
    const anos = new Set([new Date().getFullYear()]);
    allResiduosRefeicoes.forEach(r => anos.add(r.ano));
    allManutencaoVeicular.forEach(m => { if (m.data_servico) anos.add(parseLocalDate(m.data_servico).getFullYear()); });
    popularSelectAnos('ambFiltroAno', anos);
}

function getAmbientalDateRange() {
    const tituloEl = document.getElementById('ambPeriodoTitulo');
    if (ambientalFiltroAno) {
        const ano = parseInt(ambientalFiltroAno, 10);
        if (ambientalFiltroMes !== '') {
            const mes = parseInt(ambientalFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }

    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (ambientalFilter === 'trimestre') {
        inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        titulo = 'Últimos 3 meses';
    } else if (ambientalFilter === 'ano') {
        inicio = new Date(now.getFullYear(), 0, 1);
        titulo = `Ano ${now.getFullYear()} (até hoje)`;
    } else if (ambientalFilter === 'todos') {
        inicio = new Date(2000, 0, 1);
        titulo = 'Todo o histórico';
    } else {
        inicio = new Date(now.getFullYear(), now.getMonth(), 1);
        titulo = 'Este mês';
    }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setAmbientalFilter(filter) {
    ambientalFilter = filter;
    ambientalFiltroAno = '';
    ambientalFiltroMes = '';
    const anoSel = document.getElementById('ambFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('ambFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroAmbMes', 'btnFiltroAmbTrimestre', 'btnFiltroAmbAno', 'btnFiltroAmbTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroAmbMes', trimestre: 'btnFiltroAmbTrimestre', ano: 'btnFiltroAmbAno', todos: 'btnFiltroAmbTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderAmbientalPanel();
}

function onAmbientalFiltroAnoMesChange() {
    ambientalFiltroAno = document.getElementById('ambFiltroAno').value;
    ambientalFiltroMes = document.getElementById('ambFiltroMes').value;
    if (ambientalFiltroAno) {
        ['btnFiltroAmbMes', 'btnFiltroAmbTrimestre', 'btnFiltroAmbAno', 'btnFiltroAmbTodos'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
    }
    renderAmbientalPanel();
}

// Compartilhado entre a Visão Geral (KPI+gráfico) e a aba "Resíduos de Refeições": todo
// mês de contrato até o mês corrente, com quentinhas/copos/peso do dado JÁ SALVO quando
// existe, ou da sugestão (efetivo × dias trabalhados) quando ainda não foi confirmado -
// sem isso a Visão Geral e o gráfico paravam no último mês salvo (jan/2026) mesmo com
// meses mais recentes já tendo estimativa disponível na aba de detalhe, dando a
// impressão de que o gráfico estava "travado" no passado.
function calcularResiduosRefeicoesMensal() {
    const hoje = new Date();
    const linhas = [];
    let cursor = new Date(ACIDENTES_MES_INICIO_CONTRATO.ano, ACIDENTES_MES_INICIO_CONTRATO.mes, 1);
    const limite = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    while (cursor <= limite) {
        const ano = cursor.getFullYear(), mes = cursor.getMonth();
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const existente = allResiduosRefeicoes.find(r => r.id === key);
        const headcount = headcountAsOf(new Date(ano, mes + 1, 0));
        const diasTrabalhados = hhtDiasTrabalhadosMap[key]?.dias_trabalhados || null;
        const sugestao = diasTrabalhados ? headcount * diasTrabalhados : '';
        const label = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const quentinhas = existente ? existente.quentinhas_qtd : sugestao;
        const copos = existente ? existente.copos_qtd : sugestao;
        // EPI usado não tem uma fórmula de sugestão automática (não existe uma correlação
        // documentada tipo headcount × dias, diferente de quentinha/copo) - fica em branco até
        // o usuário lançar manualmente a quantidade do mês.
        const epi = existente ? existente.epi_qtd : '';
        const temValor = quentinhas !== '' || copos !== '' || epi !== '';
        const pesoKg = temValor ? Number(quentinhas || 0) * RESIDUO_KG_POR_QUENTINHA + Number(copos || 0) * RESIDUO_KG_POR_COPO + Number(epi || 0) * RESIDUO_KG_POR_EPI : null;
        linhas.push({ key, ano, mes: mes + 1, label, headcount, diasTrabalhados, quentinhas, copos, epi, pesoKg, salvo: !!existente });
        cursor = new Date(ano, mes + 1, 1);
    }
    return linhas;
}

function renderAmbientalPanel() {
    popularFiltroAnoAmbiental();
    const { inicio, fim } = getAmbientalDateRange();

    const residuosMensal = calcularResiduosRefeicoesMensal();
    const residuosPeriodo = residuosMensal.filter(r => {
        const d = new Date(r.ano, r.mes - 1, 1);
        return d >= new Date(inicio.getFullYear(), inicio.getMonth(), 1) && d <= fim;
    });
    const kgResiduos = residuosPeriodo.reduce((s, r) => s + (r.pesoKg || 0), 0);
    document.getElementById('kpiAmbResiduoRefeicoesKg').textContent = kgResiduos.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

    const manutPeriodo = allManutencaoVeicular.filter(m => {
        if (!m.data_servico) return false;
        const d = parseLocalDate(m.data_servico);
        return d >= inicio && d <= fim;
    });
    const trocasPeriodo = manutPeriodo.filter(m => m.tipo === 'troca_oleo');
    const litros = trocasPeriodo.reduce((s, m) => s + (Number(m.litros_oleo) || 0), 0);
    document.getElementById('kpiAmbLitrosOleo').textContent = litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    document.getElementById('kpiAmbTrocasOleo').textContent = trocasPeriodo.length;
    document.getElementById('kpiAmbTrocasSemLitros').textContent = trocasPeriodo.filter(m => m.litros_oleo === null || m.litros_oleo === undefined).length;

    renderGraficosAmbiental();
}

function renderGraficosAmbiental() {
    const mesesResiduos = calcularResiduosRefeicoesMensal();
    if (chartInstances.ambResiduos) chartInstances.ambResiduos.destroy();
    const ctxR = document.getElementById('chartAmbResiduosRefeicoes');
    if (ctxR) {
        chartInstances.ambResiduos = new Chart(ctxR, {
            type: 'bar',
            data: {
                labels: mesesResiduos.map(r => `${NOMES_MESES[r.mes - 1].slice(0, 3)}/${String(r.ano).slice(2)}`),
                datasets: [{ label: 'kg', data: mesesResiduos.map(r => Number((r.pesoKg || 0).toFixed(2))), backgroundColor: '#10b981', borderRadius: 6 }]
            },
            // autoSkip (padrão do Chart.js) some com rótulos do eixo de categoria antes de
            // deixar sobrepor - com "Todos" (26+ meses) isso escondia mês sim, mês não,
            // dando a impressão de que o gráfico tinha menos dados do que realmente tem
            // (mesma pegadinha já documentada nos gráficos horizontais deste painel).
            // autoSkip:false + rótulos inclinados mostra todo mês mesmo com histórico longo.
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 60 } }, y: { beginAtZero: true } }
            }
        });
    }

    const litrosPorMes = new Map();
    allManutencaoVeicular.filter(m => m.tipo === 'troca_oleo' && m.data_servico && m.litros_oleo).forEach(m => {
        const d = parseLocalDate(m.data_servico);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        litrosPorMes.set(key, (litrosPorMes.get(key) || 0) + Number(m.litros_oleo));
    });
    const chavesOrdenadas = Array.from(litrosPorMes.keys()).sort();
    if (chartInstances.ambLitrosOleo) chartInstances.ambLitrosOleo.destroy();
    const ctxO = document.getElementById('chartAmbLitrosOleo');
    if (ctxO) {
        chartInstances.ambLitrosOleo = new Chart(ctxO, {
            type: 'bar',
            data: {
                labels: chavesOrdenadas.map(k => { const [a, m] = k.split('-'); return `${NOMES_MESES[Number(m) - 1].slice(0, 3)}/${a.slice(2)}`; }),
                datasets: [{ label: 'Litros', data: chavesOrdenadas.map(k => Number(litrosPorMes.get(k).toFixed(1))), backgroundColor: '#f59e0b', borderRadius: 6 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 60 } }, y: { beginAtZero: true } }
            }
        });
    }
}

// Espelha renderDiasTrabalhadosConfig/salvarDiasTrabalhadoMes (Acidentabilidade) - mesmo
// período (início do contrato até o mês corrente), mesma UX de linha-por-mês editável.
// Sugestão de quantidade (quando o mês ainda não tem valor salvo) = efetivo × dias
// trabalhados daquele mês, já disponíveis via headcountAsOf/hhtDiasTrabalhadosMap - mas
// fica editável porque a planilha original do usuário tinha ajustes manuais mês a mês
// que essa conta simples não reproduz exatamente.
function renderResiduosRefeicoesConfig() {
    const container = document.getElementById('residuosRefeicoesLista');
    if (!container) return;

    const linhas = calcularResiduosRefeicoesMensal().reverse();

    container.innerHTML = linhas.map(l => {
        const pesoTexto = l.pesoKg != null ? `${l.pesoKg.toFixed(1)} kg` : '—';
        const pesoEstilo = l.salvo ? 'color: var(--text-light);' : 'color: var(--text-light); font-style: italic;';
        return `<div style="display: grid; grid-template-columns: 1fr 0.8fr 0.5fr 0.5fr 0.5fr 0.6fr auto auto; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 8px; background: var(--bg); font-size: 12.5px;">
            <div style="font-weight: 600; text-transform: capitalize;">${escapeHTML(l.label)}</div>
            <div style="color: var(--text-light);">Efetivo ${l.headcount} × ${l.diasTrabalhados ?? '—'} dias</div>
            <input type="number" min="0" step="1" placeholder="Quentinhas" value="${l.quentinhas}" id="residQuent_${l.key}"
                   style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box;">
            <input type="number" min="0" step="1" placeholder="Copos" value="${l.copos}" id="residCopos_${l.key}"
                   style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box;">
            <input type="number" min="0" step="1" placeholder="EPI" value="${l.epi}" id="residEpi_${l.key}" title="Unidades de EPI usado sem contaminação descartadas no mês"
                   style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box;">
            <div style="${pesoEstilo} text-align:right;" title="${l.salvo ? 'Valor salvo' : 'Estimativa não salva ainda'}">${pesoTexto}</div>
            <button class="db-apply-btn" style="padding: 6px 12px;" onclick="salvarResiduoRefeicaoMes('${l.key}', ${l.ano}, ${l.mes + 1})">💾</button>
            <button class="db-clear-btn" style="padding: 6px 10px; font-size: 11.5px;" onclick="abrirAnexoModal('residuos_refeicoes', '${l.key}', 'Manifesto MTR e Destinação de Resíduos — ${escapeHTML(l.label)}')">📎 MTR${labelContagemAnexos('residuos_refeicoes', l.key)}</button>
        </div>`;
    }).join('');
}

async function salvarResiduoRefeicaoMes(key, ano, mes) {
    const quentinhas = parseInt(document.getElementById(`residQuent_${key}`).value, 10);
    const copos = parseInt(document.getElementById(`residCopos_${key}`).value, 10);
    const epiInput = document.getElementById(`residEpi_${key}`).value;
    const epi = epiInput === '' ? 0 : parseInt(epiInput, 10);
    if (isNaN(quentinhas) || quentinhas < 0 || isNaN(copos) || copos < 0 || isNaN(epi) || epi < 0) {
        alert('Informe quantidades válidas de quentinhas, copos e EPI.');
        return;
    }
    try {
        const row = { id: key, ano, mes, quentinhas_qtd: quentinhas, copos_qtd: copos, epi_qtd: epi };
        await supabaseUpsert('residuos_refeicoes', [row]);
        const idx = allResiduosRefeicoes.findIndex(r => r.id === key);
        if (idx >= 0) allResiduosRefeicoes[idx] = { ...allResiduosRefeicoes[idx], ...row };
        else allResiduosRefeicoes.push(row);
        renderResiduosRefeicoesConfig();
        if (document.getElementById('ambientalSubtabBtn-visao')?.classList.contains('active')) renderAmbientalPanel();
        if (document.getElementById('ambientalSubtabBtn-manifesto')?.classList.contains('active')) renderManifestoResiduosResumo();
    } catch (err) {
        console.error('Erro ao salvar resíduo de refeições:', err);
        alert('Falha ao salvar: ' + err.message);
    }
}

// ============================================
// MANIFESTO DE RESÍDUOS (Meio Ambiente - Fase 2, 2026-09-16) - a fiscalização vem cobrando,
// todo mês desde o início do ano, a quantidade de resíduos gerados nas frentes de serviço. A
// empresa não tem cadastro no MTR (Manifesto de Transporte de Resíduos) oficial, então este
// documento supre essa exigência com a quantidade mensal apurada pelo próprio sistema, no
// formato da "Declaração de Transporte e Destinação de Resíduos" que o usuário já assina hoje.
//
// Pontos importantes decididos com o usuário em 2026-09-16 (feedback dele sobre a 1ª versão):
// 1. O documento só pode ser gerado com o mês já CONFIRMADO/SALVO na aba de lançamento (não a
//    partir de uma sugestão automática ainda não confirmada) - pra fiscalização, esses números
//    têm que ser tratados como reais, sem ressalva de incerteza no texto impresso.
// 2. O nome do motorista de cada etapa é digitado/confirmado na tela na hora de gerar cada
//    manifesto (não fica fixo no código) - o motorista pode variar de mês pra mês.
// 3. Existe uma assinatura de RECEBIMENTO (quem recebeu do lado de Arcoverde), além da
//    assinatura do Responsável Técnico.
// 4. A "Data do documento" é um campo editável (padrão: último dia do mês de referência), não
//    a data real em que o botão foi clicado - evita que o documento entregue que foi gerado
//    depois do mês a que se refere.
//
// Dados fixos de transporte/destinação abaixo (veículo, empresa, placa) foram confirmados com
// o usuário em 2026-09-16 (2 etapas: veículo próprio do Consórcio até Sertânia, depois a
// empresa Essencial Ambiental Ltda - contratada pela Prefeitura de Sertânia via Acordo de
// Cooperação - até Arcoverde). Se algum dia esses dados mudarem (novo veículo, nova empresa
// contratada pela Prefeitura etc.), é só pedir pra atualizar aqui.
// ============================================

const MANIFESTO_RESIDUOS_INFO = {
    origem: 'Frentes de Serviço e Manutenção Operacional do Ramal do Agreste (Distrito de Henrique Dias, Zona Rural do município de Sertânia-PE)',
    etapa1: {
        titulo: '1ª Etapa — Frente de Serviço → Sertânia-PE',
        descricao: 'Transporte com veículo próprio do Consórcio Operador do PISF — Ramal do Agreste.',
        veiculo: 'Caminhão Cabinado Mercedes-Benz', placa: 'JHU7E68',
        motoristaPadrao: 'José Cláudio da Silva'
    },
    etapa2: {
        titulo: '2ª Etapa — Sertânia-PE → Arcoverde-PE',
        descricao: 'Coleta e transporte por empresa contratada pela Prefeitura Municipal de Sertânia (CNPJ 11.358.116/0001-13), no âmbito do Acordo de Cooperação para Coleta de Resíduos Classe II-A Não Perigosos (Não Inerte) e Classe II-B Não Perigosos (Inerte).',
        empresa: 'Essencial Ambiental Ltda', cnpj: '46.523.739/0001-89', municipio: 'São José do Egito-PE',
        telefone: '(87) 99990-9440 / (87) 99996-0705', veiculo: 'Caminhão Compactador de Lixo',
        placa: 'QYP-0J72', motoristaPadrao: 'José Dimas Reis de Oliveira'
    },
    receptor: {
        empresa: 'Prefeitura Municipal de Arcoverde-PE', destino: 'Aterro Sanitário de Arcoverde-PE',
        telefone: '(87) 3821-9000', recebedorPadrao: 'Josiedson Silva'
    },
    baseLegal: 'Acordo de Cooperação firmado entre o Consórcio Operador do PISF — Ramal do Agreste (CNPJ 55.623.017/0001-97) e a Prefeitura Municipal de Sertânia (CNPJ 11.358.116/0001-13), com amparo na Lei Federal nº 8.666/1993 e alterações, Decreto Estadual nº 20.786/1998 e Lei Federal nº 8.080/1990.'
};

// Preenche o seletor de ano da aba Manifesto uma única vez (não repete se já populado).
function popularSelectAnoManifesto() {
    const sel = document.getElementById('manifestoAno');
    if (!sel || sel.options.length > 0) return;
    const anos = new Set([new Date().getFullYear()]);
    allResiduosRefeicoes.forEach(r => anos.add(r.ano));
    Array.from(anos).sort((a, b) => b - a).forEach(ano => {
        const opt = document.createElement('option');
        opt.value = ano; opt.textContent = ano;
        sel.appendChild(opt);
    });
    sel.value = new Date().getFullYear();
    const mesSel = document.getElementById('manifestoMes');
    if (mesSel) mesSel.value = new Date().getMonth();
}

// Preenche os campos de motorista/recebedor só se estiverem vazios (não apaga o que o usuário
// já digitou pra essa sessão). Já a "Data do documento" é sempre recalculada pro último dia do
// mês/ano escolhidos acima - pra nunca gerar um documento de um mês com a data de outro mês
// (o usuário ainda pode ajustar manualmente o dia antes de clicar em "Gerar", se precisar).
function preencherPadraoManifestoCampos() {
    const ano = parseInt(document.getElementById('manifestoAno').value, 10);
    const mes = parseInt(document.getElementById('manifestoMes').value, 10);
    const m1 = document.getElementById('manifestoMotorista1');
    const m2 = document.getElementById('manifestoMotorista2');
    const rec = document.getElementById('manifestoRecebedor');
    const dataDoc = document.getElementById('manifestoDataDocumento');
    if (m1 && !m1.value) m1.value = MANIFESTO_RESIDUOS_INFO.etapa1.motoristaPadrao;
    if (m2 && !m2.value) m2.value = MANIFESTO_RESIDUOS_INFO.etapa2.motoristaPadrao;
    if (rec && !rec.value) rec.value = MANIFESTO_RESIDUOS_INFO.receptor.recebedorPadrao;
    if (dataDoc && !isNaN(ano) && !isNaN(mes)) {
        const ultimoDia = new Date(ano, mes + 1, 0);
        const yyyy = ultimoDia.getFullYear();
        const mm = String(ultimoDia.getMonth() + 1).padStart(2, '0');
        const dd = String(ultimoDia.getDate()).padStart(2, '0');
        dataDoc.value = `${yyyy}-${mm}-${dd}`;
    }
}

// Mostra, na tela, o resumo do mês escolhido antes de gerar o documento - assim o usuário
// confere os números (e vê o aviso de "ainda não confirmado" quando for só sugestão) antes de
// imprimir algo pra levar à fiscalização. Esse aviso é só interno/na tela - o documento
// impresso (gerarManifestoResiduosMes) recusa gerar enquanto o mês não estiver salvo de
// verdade, então esse texto nunca aparece no papel.
function renderManifestoResiduosResumo() {
    popularSelectAnoManifesto();
    preencherPadraoManifestoCampos();
    const el = document.getElementById('manifestoResumo');
    if (!el) return;
    const ano = parseInt(document.getElementById('manifestoAno').value, 10);
    const mes = parseInt(document.getElementById('manifestoMes').value, 10);
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const linha = calcularResiduosRefeicoesMensal().find(l => l.key === key);
    if (!linha || linha.pesoKg == null) {
        el.innerHTML = `<span style="color: var(--text-light);">Nenhuma quantidade lançada para ${NOMES_MESES[mes]}/${ano} ainda — lance em "🍱 Resíduos (Refeições + EPI)" antes de gerar o manifesto.</span>`;
        return;
    }
    const epiQtd = Number(linha.epi || 0);
    const epiKg = epiQtd * RESIDUO_KG_POR_EPI;
    el.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
            <div><strong>Quentinhas:</strong> ${linha.quentinhas || 0} un.</div>
            <div><strong>Copos:</strong> ${linha.copos || 0} un.</div>
            <div><strong>EPI usado:</strong> ${epiQtd} un. (${epiKg.toFixed(1)} kg)</div>
            <div><strong>Total do mês:</strong> ${linha.pesoKg.toFixed(1)} kg</div>
        </div>
        ${!linha.salvo ? '<div style="margin-top:8px; color: var(--warning); font-style: italic;">⚠️ Esse valor ainda não foi confirmado/salvo — é uma sugestão automática (efetivo × dias trabalhados). Confirme (💾) em "🍱 Resíduos (Refeições + EPI)" antes de gerar o manifesto - o botão abaixo não gera o documento enquanto o mês não estiver salvo.</div>' : ''}`;
    const btnAnexos = document.getElementById('manifesto_btnAnexos');
    if (btnAnexos) {
        btnAnexos.textContent = `📎 Anexar MTR / Comprovante deste Mês${labelContagemAnexos('residuos_refeicoes', key)}`;
    }
}

// Gera o documento do mês escolhido, no mesmo padrão de blob+<a>+window.print() de todo
// documento deste sistema ("PDF" é o navegador quem gera, via "Salvar como PDF" na impressão).
// Só gera se o mês já estiver CONFIRMADO/SALVO (nunca a partir de sugestão automática) - pra
// fiscalização, os números têm que ser tratados como reais, sem ressalva de incerteza.
function gerarManifestoResiduosMes() {
    const ano = parseInt(document.getElementById('manifestoAno').value, 10);
    const mes = parseInt(document.getElementById('manifestoMes').value, 10);
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const linha = calcularResiduosRefeicoesMensal().find(l => l.key === key);
    if (!linha || !linha.salvo) {
        alert('Esse mês ainda não tem os valores confirmados/salvos em "Resíduos (Refeições + EPI)". Confirme (💾) as quantidades reais desse mês antes de gerar o manifesto — o documento não pode sair com um valor de sugestão automática ainda não confirmado.');
        return;
    }
    const epiQtd = Number(linha.epi || 0);
    const epiKg = epiQtd * RESIDUO_KG_POR_EPI;
    const quentinhasKg = (linha.quentinhas || 0) * RESIDUO_KG_POR_QUENTINHA;
    const coposKg = (linha.copos || 0) * RESIDUO_KG_POR_COPO;
    const nomeMes = NOMES_MESES[mes];
    const e1 = MANIFESTO_RESIDUOS_INFO.etapa1, e2 = MANIFESTO_RESIDUOS_INFO.etapa2, rcp = MANIFESTO_RESIDUOS_INFO.receptor;
    const motorista1 = (document.getElementById('manifestoMotorista1').value || '').trim() || e1.motoristaPadrao;
    const motorista2 = (document.getElementById('manifestoMotorista2').value || '').trim() || e2.motoristaPadrao;
    const recebedor = (document.getElementById('manifestoRecebedor').value || '').trim() || rcp.recebedorPadrao;
    const dataDocInput = document.getElementById('manifestoDataDocumento').value;
    const ultimoDiaMes = new Date(ano, mes + 1, 0);
    const dataDocumento = dataDocInput
        ? formatSimpleDate(dataDocInput)
        : formatSimpleDate(`${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDiaMes.getDate()).padStart(2, '0')}`);

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Manifesto de Resíduos - ${escapeHTML(nomeMes)}/${ano}</title>
<style>
    @page { size: portrait; margin: 16mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 14px; line-height: 1.5; }
    p { margin: 9px 0; }
    .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:14px; gap:10px; }
    .cabecalho img { max-height:44px; }
    .cabecalho .titulo { font-weight:700; font-size:15px; text-align:center; flex:1; }
    h3 { font-size: 12.5px; border-bottom: 1px solid #999; padding-bottom: 4px; margin: 18px 0 7px; }
    table { width:100%; border-collapse:collapse; font-size:11.5px; margin-top: 8px; }
    th, td { border:1px solid #999; padding:6px 9px; text-align:left; }
    th { background:#d9d9d9; font-weight:700; }
    .total-row td { font-weight: 700; background: #f0f0f0; }
    .assinaturas { display:flex; justify-content:space-between; gap:40px; margin-top:55px; }
    .assinatura-col { flex:1; text-align:center; }
    .assinatura-col .linha { border-top: 1px solid #000; margin: 0 0 4px; }
    .no-print { text-align:center; margin:16px 0; }
    .no-print button { padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; border-radius:8px; border:none; background:#4f46e5; color:#fff; }
    .no-print .aviso-cabecalho { max-width: 480px; margin: 10px auto 0; padding: 10px 14px; background: #fff8e1; border: 1px solid #f0c14b; border-radius: 8px; font-size: 12.5px; color: #664d03; text-align: left; }
    @media print { .no-print { display:none; } body { margin:0; } }
</style></head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
        <div class="aviso-cabecalho">⚠️ Na tela de impressão, clique em "Mais configurações" e DESMARQUE a opção "Cabeçalhos e rodapés" — sem isso, o navegador acrescenta sozinho a data/hora atual, o link e o número da página no topo/rodapé do PDF (isso não faz parte do documento, é só uma opção do navegador).</div>
    </div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo">MANIFESTO DE RESÍDUOS<br>${escapeHTML(nomeMes.toUpperCase())}/${ano}</div>
        <div style="width:45px;"></div>
    </div>

    <p><strong>Razão Social:</strong> ${escapeHTML(EMPRESA_INFO.razaoSocial)} — <strong>CNPJ:</strong> ${escapeHTML(EMPRESA_INFO.cnpj)}</p>
    <p><strong>Local de Origem dos Resíduos:</strong> ${escapeHTML(MANIFESTO_RESIDUOS_INFO.origem)}</p>
    <p><strong>Responsável Técnico:</strong> João Everton de Souza Limeira</p>

    <p style="text-align: justify; margin-top: 14px;">
        A empresa não possui cadastro próprio no Manifesto de Transporte de Resíduos (MTR) oficial. Este documento
        apresenta a quantidade de resíduos sólidos Classe II-A Não Perigosos (Não Inerte) e Classe II-B Não Perigosos
        (Inerte) gerados no período de referência acima, apurada com base nos registros do sistema de gestão de SMS
        do Consórcio.
    </p>

    <h3>QUANTIDADE DE RESÍDUOS NO PERÍODO</h3>
    <table>
        <thead><tr><th>Tipo de Resíduo</th><th>Quantidade</th><th>Peso (kg)</th></tr></thead>
        <tbody>
            <tr><td>Quentinhas de isopor com sobra de comida</td><td>${linha.quentinhas || 0} un.</td><td>${quentinhasKg.toFixed(1)}</td></tr>
            <tr><td>Copo descartável</td><td>${linha.copos || 0} un.</td><td>${coposKg.toFixed(1)}</td></tr>
            <tr><td>EPI usado (sem contaminação)</td><td>${epiQtd} un.</td><td>${epiKg.toFixed(1)}</td></tr>
            <tr class="total-row"><td colspan="2">TOTAL NO MÊS</td><td>${linha.pesoKg.toFixed(1)} kg</td></tr>
        </tbody>
    </table>
    <p style="font-size: 10.5px; color: #555; margin-top: 6px;">
        Memória de cálculo (peso por unidade): quentinha de isopor = 23,9 g; copo descartável PP 200ml = 1,8 g; EPI
        usado sem contaminação = 500 g (peso médio adotado pelo Consórcio).
    </p>

    <h3>TRANSPORTE E DESTINAÇÃO FINAL</h3>
    <p><strong>${escapeHTML(e1.titulo)}:</strong> ${escapeHTML(e1.descricao)} Veículo: ${escapeHTML(e1.veiculo)}, placa ${escapeHTML(e1.placa)}. Motorista: ${escapeHTML(motorista1)}.</p>
    <p><strong>${escapeHTML(e2.titulo)}:</strong> ${escapeHTML(e2.descricao)} Empresa: ${escapeHTML(e2.empresa)} (CNPJ ${escapeHTML(e2.cnpj)}), ${escapeHTML(e2.municipio)}, telefone ${escapeHTML(e2.telefone)}. Veículo: ${escapeHTML(e2.veiculo)}, placa ${escapeHTML(e2.placa)}. Motorista: ${escapeHTML(motorista2)}.</p>
    <p><strong>Destino Final:</strong> ${escapeHTML(rcp.destino)}, recebido por ${escapeHTML(rcp.empresa)} (telefone ${escapeHTML(rcp.telefone)}).</p>
    <p style="font-size: 10.5px; color: #555;">Base: ${escapeHTML(MANIFESTO_RESIDUOS_INFO.baseLegal)}</p>

    <p style="text-align: justify; margin-top: 14px;">
        Declaro, sob as penas da lei, que as informações acima refletem a geração de resíduos das frentes de
        serviço do Ramal do Agreste no período indicado, e que a destinação final segue o Acordo de Cooperação
        vigente com a Prefeitura Municipal de Sertânia.
    </p>

    <p style="margin-top: 18px;">Arcoverde-PE, ${dataDocumento}.</p>

    <div class="assinaturas">
        <div class="assinatura-col">
            <div class="linha"></div>
            João Everton de Souza Limeira<br>
            Responsável Técnico — Engenheiro de Segurança do Trabalho<br>
            Consórcio Operador do PISF — Ramal do Agreste
        </div>
        <div class="assinatura-col">
            <div class="linha"></div>
            ${escapeHTML(recebedor)}<br>
            Recebimento — ${escapeHTML(rcp.empresa)}<br>
            ${escapeHTML(rcp.destino)}
        </div>
    </div>
</body></html>`;

    abrirDocumentoBlob(html);
}

// ---- Manutenção Veicular (preventivas + trocas de óleo) ----

function renderManutencaoResumo() {
    const el = document.getElementById('manutencaoResumo');
    if (!el) return;
    const trocas = allManutencaoVeicular.filter(m => m.tipo === 'troca_oleo');
    const comLitros = trocas.filter(m => m.litros_oleo !== null && m.litros_oleo !== undefined).length;
    el.textContent = `${allManutencaoVeicular.length} registro(s) — ${trocas.length} troca(s) de óleo (${comLitros} com litros informado)`;
}

function filterManutencaoLista() {
    const container = document.getElementById('manutencaoLista');
    if (!container) return;
    const q = (document.getElementById('manutencaoSearchInput')?.value || '').toLowerCase().trim();
    const tipoFiltro = document.getElementById('manutencaoFiltroTipo')?.value || '';

    let linhas = allManutencaoVeicular.slice().sort((a, b) => (b.data_servico || '').localeCompare(a.data_servico || ''));
    if (tipoFiltro) linhas = linhas.filter(m => m.tipo === tipoFiltro);
    if (q) {
        linhas = linhas.filter(m =>
            (m.ativo || '').toLowerCase().includes(q) ||
            (m.modelo || '').toLowerCase().includes(q) ||
            (m.equipamento || '').toLowerCase().includes(q) ||
            (m.empresa || '').toLowerCase().includes(q)
        );
    }

    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum registro encontrado</div>';
        return;
    }
    container.innerHTML = linhas.map(m => {
        const tipoLabel = m.tipo === 'troca_oleo' ? '🛢️ Troca de Óleo' : '🔧 Preventiva';
        const litrosLabel = m.tipo === 'troca_oleo' ? (m.litros_oleo != null ? ` — ${m.litros_oleo}L` : ' — sem litros informado') : '';
        return `<div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px; cursor:pointer;" onclick="abrirFormManutencao('${escapeHTML(m.id)}')">
                <div class="db-list-item-title">${escapeHTML(m.ativo || '(sem identificação)')} — ${escapeHTML(m.equipamento || '')}</div>
                <div class="db-list-item-sub">${tipoLabel}${litrosLabel} — ${escapeHTML(m.empresa || '')} — ${formatSimpleDate(m.data_servico)}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
                <button class="db-clear-btn" style="padding:4px 8px; font-size:11.5px;" onclick="event.stopPropagation(); abrirAnexoModal('manutencao_veicular', '${escapeHTML(m.id)}', 'Manutenção — ${escapeHTML(m.ativo || m.equipamento || '')}')">📎 Anexo${labelContagemAnexos('manutencao_veicular', m.id)}</button>
            </div>
        </div>`;
    }).join('');
}

function onManutTipoChange() {
    const tipo = document.getElementById('manutForm_tipo').value;
    document.getElementById('manutForm_litrosWrap').style.display = tipo === 'troca_oleo' ? 'block' : 'none';
}

function abrirFormManutencao(id) {
    const form = document.getElementById('manutencaoFormCard');
    const title = document.getElementById('manutencaoFormTitle');
    const btnExcluir = document.getElementById('manutForm_btnExcluir');
    document.getElementById('manutencaoFormStatus').textContent = '';
    form.dataset.id = id || '';

    if (id) {
        const m = allManutencaoVeicular.find(x => x.id === id);
        if (!m) return;
        title.textContent = '✏️ Editar Registro de Manutenção';
        document.getElementById('manutForm_tipo').value = m.tipo;
        document.getElementById('manutForm_ativo').value = m.ativo || '';
        document.getElementById('manutForm_modelo').value = m.modelo || '';
        document.getElementById('manutForm_equipamento').value = m.equipamento || '';
        document.getElementById('manutForm_empresa').value = m.empresa || '';
        document.getElementById('manutForm_data').value = m.data_servico || '';
        document.getElementById('manutForm_litros').value = m.litros_oleo ?? '';
        document.getElementById('manutForm_descricao').value = m.descricao_servico || '';
        document.getElementById('manutForm_observacoes').value = m.observacoes || '';
        btnExcluir.style.display = 'inline-block';
        const btnAnexos = document.getElementById('manutForm_btnAnexos');
        if (btnAnexos) {
            btnAnexos.style.display = 'inline-block';
            btnAnexos.textContent = `📎 Anexos (Comprovante / O.S.)${labelContagemAnexos('manutencao_veicular', id)}`;
        }
    } else {
        title.textContent = '🔧 Novo Registro de Manutenção';
        document.getElementById('manutForm_tipo').value = 'troca_oleo';
        document.getElementById('manutForm_ativo').value = '';
        document.getElementById('manutForm_modelo').value = '';
        document.getElementById('manutForm_equipamento').value = '';
        document.getElementById('manutForm_empresa').value = '';
        document.getElementById('manutForm_data').value = '';
        document.getElementById('manutForm_litros').value = '';
        document.getElementById('manutForm_descricao').value = '';
        document.getElementById('manutForm_observacoes').value = '';
        btnExcluir.style.display = 'none';
        const btnAnexos = document.getElementById('manutForm_btnAnexos');
        if (btnAnexos) btnAnexos.style.display = 'none';
    }
    onManutTipoChange();
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormManutencao() {
    document.getElementById('manutencaoFormCard').style.display = 'none';
}

async function salvarManutencao() {
    const statusEl = document.getElementById('manutencaoFormStatus');
    const idAtual = document.getElementById('manutencaoFormCard').dataset.id;
    const tipo = document.getElementById('manutForm_tipo').value;
    const data = document.getElementById('manutForm_data').value;
    if (!data) {
        statusEl.textContent = '❌ Informe a data do serviço.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const id = idAtual || `${tipo === 'troca_oleo' ? 'OLEO' : 'PREV'}_${Date.now()}`;
    const litrosStr = document.getElementById('manutForm_litros').value;
    const row = {
        id,
        tipo,
        ativo: document.getElementById('manutForm_ativo').value.trim() || null,
        modelo: document.getElementById('manutForm_modelo').value.trim() || null,
        equipamento: document.getElementById('manutForm_equipamento').value.trim() || null,
        empresa: document.getElementById('manutForm_empresa').value.trim() || null,
        descricao_servico: document.getElementById('manutForm_descricao').value.trim() || null,
        data_servico: data,
        litros_oleo: tipo === 'troca_oleo' && litrosStr !== '' ? parseFloat(litrosStr) : null,
        observacoes: document.getElementById('manutForm_observacoes').value.trim() || null,
        origem: idAtual ? (allManutencaoVeicular.find(m => m.id === idAtual)?.origem || 'APP') : 'APP'
    };
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('manutencao_veicular', [row]);
        document.getElementById('manutencaoFormCard').dataset.id = id;
        const idx = allManutencaoVeicular.findIndex(m => m.id === id);
        if (idx >= 0) allManutencaoVeicular[idx] = { ...allManutencaoVeicular[idx], ...row };
        else allManutencaoVeicular.push(row);
        renderManutencaoResumo();
        filterManutencaoLista();
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormManutencao(), 900);
    } catch (err) {
        console.error('Erro ao salvar manutenção:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirManutencaoAtual() {
    const id = document.getElementById('manutencaoFormCard').dataset.id;
    if (!id) return;
    if (!confirm('Excluir este registro de manutenção? Essa ação não pode ser desfeita.')) return;
    const statusEl = document.getElementById('manutencaoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('manutencao_veicular', id);
        allManutencaoVeicular = allManutencaoVeicular.filter(m => m.id !== id);
        renderManutencaoResumo();
        filterManutencaoLista();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormManutencao(), 900);
    } catch (err) {
        console.error('Erro ao excluir manutenção:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Importação CSV (Configurações) ----

async function importarResiduosRefeicoesCSV() {
    const input = document.getElementById('residuosRefeicoesFileInput');
    const statusEl = document.getElementById('residuosRefeicoesImportStatus');
    if (!input.files || !input.files[0]) {
        statusEl.textContent = '❌ Selecione um arquivo CSV primeiro.';
        return;
    }
    statusEl.textContent = 'Lendo arquivo...';
    try {
        const file = input.files[0];
        const rawText = await file.text();
        const text = rawText.replace(/^﻿/, '');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
            statusEl.textContent = '❌ Arquivo vazio ou sem linhas de dados.';
            return;
        }
        const headers = lines[0].split(';').map(h => h.trim().toUpperCase());
        const idx = {};
        headers.forEach((h, i) => { idx[h] = i; });
        function col(parts, name) { const i = idx[name.toUpperCase()]; return i !== undefined ? (parts[i] || '').trim() : ''; }

        const linhas = [];
        let puladas = 0;
        for (let li = 1; li < lines.length; li++) {
            const parts = lines[li].split(';');
            const ano = parseInt(col(parts, 'ANO'), 10);
            const mes = parseInt(col(parts, 'MES'), 10);
            if (!ano || !mes || mes < 1 || mes > 12) { puladas++; continue; }
            linhas.push({
                id: `${ano}-${String(mes).padStart(2, '0')}`,
                ano, mes,
                quentinhas_qtd: parseInt(col(parts, 'QUENTINHAS_QTD'), 10) || 0,
                copos_qtd: parseInt(col(parts, 'COPOS_QTD'), 10) || 0
            });
        }
        statusEl.textContent = `Enviando ${linhas.length} mês(es)...`;
        await supabaseUpsert('residuos_refeicoes', linhas);
        allResiduosRefeicoes = await supabaseFetch('residuos_refeicoes', '?select=*');
        statusEl.textContent = `✅ Importação concluída! ${linhas.length} mês(es) importado(s)/atualizado(s). ${puladas} linha(s) pulada(s) por dado incompleto.`;
        renderResiduosRefeicoesConfig();
        if (document.getElementById('ambientalSubtabBtn-visao')?.classList.contains('active')) renderAmbientalPanel();
    } catch (err) {
        console.error('Erro ao importar resíduos de refeições:', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}

async function importarManutencaoCSV() {
    const input = document.getElementById('manutencaoFileInput');
    const statusEl = document.getElementById('manutencaoImportStatus');
    if (!input.files || !input.files[0]) {
        statusEl.textContent = '❌ Selecione um arquivo CSV primeiro.';
        return;
    }
    statusEl.textContent = 'Lendo arquivo...';
    try {
        const file = input.files[0];
        const rawText = await file.text();
        const text = rawText.replace(/^﻿/, '');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
            statusEl.textContent = '❌ Arquivo vazio ou sem linhas de dados.';
            return;
        }
        const headers = lines[0].split(';').map(h => h.trim().toUpperCase());
        const idx = {};
        headers.forEach((h, i) => { idx[h] = i; });
        function col(parts, name) { const i = idx[name.toUpperCase()]; return i !== undefined ? (parts[i] || '').trim() : ''; }

        // Chave determinística (tipo+ativo+data, com sufixo sequencial pra desempatar
        // duas entradas iguais no mesmo dia) - reenviar o mesmo CSV depois atualiza em
        // vez de duplicar, mesma lógica idempotente já usada nos outros importadores.
        const contagemChave = new Map();
        const linhas = [];
        let puladas = 0;
        for (let li = 1; li < lines.length; li++) {
            const parts = lines[li].split(';');
            const tipoRaw = col(parts, 'TIPO').toLowerCase();
            const tipo = tipoRaw === 'troca_oleo' ? 'troca_oleo' : (tipoRaw === 'preventiva' ? 'preventiva' : '');
            const dataServico = parseDataBR(col(parts, 'DATA_SERVICO'));
            if (!tipo || !dataServico) { puladas++; continue; }

            const ativo = col(parts, 'ATIVO');
            const chaveBase = `${tipo}_${(ativo || 'SEMATIVO').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}_${dataServico}`;
            const n = (contagemChave.get(chaveBase) || 0) + 1;
            contagemChave.set(chaveBase, n);

            const litrosStr = col(parts, 'LITROS_OLEO');
            linhas.push({
                id: n > 1 ? `${chaveBase}_${n}` : chaveBase,
                tipo,
                ativo: ativo || null,
                modelo: col(parts, 'MODELO') || null,
                equipamento: col(parts, 'EQUIPAMENTO') || null,
                empresa: col(parts, 'EMPRESA') || null,
                descricao_servico: col(parts, 'DESCRICAO_SERVICO') || null,
                data_servico: dataServico,
                litros_oleo: litrosStr !== '' ? parseFloat(litrosStr) : null,
                observacoes: col(parts, 'OBSERVACOES') || null,
                origem: 'APP'
            });
        }
        statusEl.textContent = `Enviando ${linhas.length} registro(s)...`;
        await supabaseUpsert('manutencao_veicular', linhas);
        allManutencaoVeicular = await supabaseFetch('manutencao_veicular', '?select=*');
        statusEl.textContent = `✅ Importação concluída! ${linhas.length} registro(s) importado(s)/atualizado(s). ${puladas} linha(s) pulada(s) por dado incompleto.`;
        renderManutencaoResumo();
        filterManutencaoLista();
        if (document.getElementById('ambientalSubtabBtn-visao')?.classList.contains('active')) renderAmbientalPanel();
    } catch (err) {
        console.error('Erro ao importar manutenção veicular:', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}

// ============================================
// CENTRAL DE BACKUP GERAL & RECUPERAÇÃO DE DADOS (DRP)
// Consórcio Operador do PISF Ramal do Agreste - Obra: Ramal do Agreste
// Exporta e restaura todas as bases operacionais e administrativas
// ============================================

const BACKUP_TABELAS_CONFIG = [
    { tabela: 'checklists', modulo: 'Checklists', label: 'Checklists de Inspeção' },
    { tabela: 'cadastros', modulo: 'Checklists', label: 'Equipamentos e Veículos' },
    { tabela: 'checklist_item_settings', modulo: 'Checklists', label: 'Configurações de Itens de Checklist' },
    { tabela: 'extintores', modulo: 'Extintores', label: 'Inventário de Extintores' },
    { tabela: 'inspecoes_extintores', modulo: 'Extintores', label: 'Inspeções de Extintores' },
    { tabela: 'relatos', modulo: 'Relatos', label: 'Relatos de Problemas' },
    { tabela: 'colaboradores_efetivo', modulo: 'Efetivo', label: 'Colaboradores (Efetivo)' },
    { tabela: 'ghe_catalogo', modulo: 'Efetivo', label: 'Grupos Homogêneos (GHE)' },
    { tabela: 'municipios_ada', modulo: 'Efetivo', label: 'Municípios ADA' },
    { tabela: 'historico_troca_funcao', modulo: 'Efetivo', label: 'Troca de Função' },
    { tabela: 'ordens_servico_entregas', modulo: 'Efetivo', label: 'Rastreabilidade de OS (NR-01)' },
    { tabela: 'treinamentos_catalogo', modulo: 'Treinamentos', label: 'Catálogo de Treinamentos' },
    { tabela: 'treinamentos_status', modulo: 'Treinamentos', label: 'Matriz Geral de Treinamentos' },
    { tabela: 'treinamentos_cronograma', modulo: 'Treinamentos', label: 'Cronograma de Treinamentos' },
    { tabela: 'treinamentos_convocados', modulo: 'Treinamentos', label: 'Convocados para Treinamentos' },
    { tabela: 'dds_realizados', modulo: 'DDSMA', label: 'DDS Realizados' },
    { tabela: 'dds_temas_cronograma', modulo: 'DDSMA', label: 'Temas de DDS' },
    { tabela: 'dds_frentes_config', modulo: 'DDSMA', label: 'Frentes de DDS' },
    { tabela: 'dds_historico_agregado', modulo: 'DDSMA', label: 'Histórico Agregado de DDS' },
    { tabela: 'dds_fechamento_semanal', modulo: 'DDSMA', label: 'Fechamento Semanal de DDS' },
    { tabela: 'dds_frentes_alias', modulo: 'DDSMA', label: 'Apelidos de Frentes de DDS' },
    { tabela: 'acidentes', modulo: 'Acidentes', label: 'Registros de Acidentes (CAT)' },
    { tabela: 'hht_dias_trabalhados', modulo: 'Acidentes', label: 'Cálculo de HHT' },
    { tabela: 'aso_exames', modulo: 'Saúde Ocupacional', label: 'Exames e ASO' },
    { tabela: 'atestados_ocupacionais', modulo: 'Saúde Ocupacional', label: 'Atestados Médicos' },
    { tabela: 'pressao_arterial', modulo: 'Saúde Ocupacional', label: 'Aferições de Pressão' },
    { tabela: 'epi_catalogo', modulo: 'EPI', label: 'Catálogo de EPIs' },
    { tabela: 'epi_estoque', modulo: 'EPI', label: 'Estoque de EPIs' },
    { tabela: 'epi_entradas', modulo: 'EPI', label: 'Entradas de EPIs' },
    { tabela: 'manutencao_veicular', modulo: 'Manutenção', label: 'Manutenção Veicular' },
    { tabela: 'residuos_refeicoes', modulo: 'Meio Ambiente', label: 'Controle de Resíduos' },
    { tabela: 'ergonomia_aep', modulo: 'Ergonomia', label: 'Avaliações Ergonômicas (NR-17)' },
    { tabela: 'periculosidade_analises', modulo: 'Periculosidade', label: 'Laudos de Periculosidade (NR-16)' },
    { tabela: 'pgr_plano_acao', modulo: 'Segurança', label: 'Plano de Ação (5W2H) - NR-01' },
    { tabela: 'cipa_reunioes', modulo: 'CIPA', label: 'Reuniões da CIPA' },
    { tabela: 'brigada_membros', modulo: 'Brigada', label: 'Brigadistas de Incêndio' },
    { tabela: 'anexos_sms', modulo: 'Documentos', label: 'Documentos e Anexos' },
    { tabela: 'colaboradores_checklist', modulo: 'Segurança', label: 'Usuários do App de Campo' },
    { tabela: 'painel_usuarios', modulo: 'Segurança', label: 'Usuários do Painel' },
    { tabela: 'painel_perfis', modulo: 'Segurança', label: 'Perfis de Acesso' },
    { tabela: 'configuracoes_sistema', modulo: 'Sistema', label: 'Configurações do Sistema' }
];

async function gerarBackupCompletoSistema(formato = 'json') {
    const wrap = document.getElementById('backupProgressWrap');
    const bar = document.getElementById('backupProgressBar');
    const label = document.getElementById('backupProgressLabel');
    const percent = document.getElementById('backupProgressPercent');
    const detail = document.getElementById('backupProgressDetail');
    const statusMsg = document.getElementById('backupStatusMensagem');
    const btnJson = document.getElementById('btnGerarBackupJson');
    const btnXlsx = document.getElementById('btnGerarBackupXlsx');

    if (btnJson) btnJson.disabled = true;
    if (btnXlsx) btnXlsx.disabled = true;
    if (wrap) wrap.style.display = 'block';
    if (statusMsg) statusMsg.textContent = '';

    const backupData = {};
    const totalTabelas = BACKUP_TABELAS_CONFIG.length;
    let totalRegistros = 0;
    let tabelasComDados = 0;

    try {
        for (let i = 0; i < totalTabelas; i++) {
            const cfg = BACKUP_TABELAS_CONFIG[i];
            const pct = Math.round(((i + 1) / totalTabelas) * 100);
            if (bar) bar.style.width = pct + '%';
            if (percent) percent.textContent = pct + '%';
            if (label) label.textContent = 'Lendo base: ' + cfg.label + ' (' + cfg.tabela + ')...';
            if (detail) detail.textContent = 'Tabela ' + (i + 1) + ' de ' + totalTabelas + ' (' + pct + '% concluído)';

            try {
                const rows = await supabaseFetch(cfg.tabela, '?select=*');
                backupData[cfg.tabela] = rows || [];
                const qtd = rows ? rows.length : 0;
                totalRegistros += qtd;
                if (qtd > 0) tabelasComDados++;
            } catch (err) {
                console.warn('Tabela ' + cfg.tabela + ' não pôde ser lida:', err.message);
                backupData[cfg.tabela] = [];
            }
        }

        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0];
        const horaFormatada = String(hoje.getHours()).padStart(2, '0') + String(hoje.getMinutes()).padStart(2, '0');
        const nomeBase = 'backup_cop_ramal_' + dataFormatada + '_' + horaFormatada;

        if (formato === 'json') {
            const payload = {
                versao_backup: '1.0',
                gerado_em: hoje.toISOString(),
                projeto: 'Consórcio Operador do PISF Ramal do Agreste - Gestão Integrada SST',
                obra: 'Ramal do Agreste',
                gerado_por: {
                    usuario: (typeof usuarioLogadoPainel !== 'undefined' && usuarioLogadoPainel) ? usuarioLogadoPainel.nome : 'Administrador',
                    matricula: (typeof usuarioLogadoPainel !== 'undefined' && usuarioLogadoPainel) ? usuarioLogadoPainel.matricula : '—',
                    email: (typeof usuarioLogadoPainel !== 'undefined' && usuarioLogadoPainel) ? usuarioLogadoPainel.email : '—'
                },
                estatisticas: {
                    total_tabelas_consultadas: totalTabelas,
                    total_tabelas_com_dados: tabelasComDados,
                    total_registros_exportados: totalRegistros
                },
                tabelas: backupData
            };

            const jsonStr = JSON.stringify(payload, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nomeBase + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (statusMsg) {
                statusMsg.style.color = '#15803d';
                statusMsg.textContent = '✅ Backup JSON gerado e baixado com sucesso! ' + totalRegistros.toLocaleString('pt-BR') + ' registros salvos em ' + tabelasComDados + ' tabelas.';
            }
        } else if (formato === 'xlsx') {
            if (typeof XLSX === 'undefined') {
                throw new Error('Biblioteca XLSX não carregada no navegador.');
            }

            const wb = XLSX.utils.book_new();
            for (const [tabela, rows] of Object.entries(backupData)) {
                if (!rows || rows.length === 0) continue;

                // Sanitizar objetos aninhados (ex: JSON items) para texto simples legível no Excel
                const sanitizedRows = rows.map(r => {
                    const rowClean = {};
                    for (const [k, v] of Object.entries(r)) {
                        if (v !== null && typeof v === 'object') {
                            rowClean[k] = JSON.stringify(v);
                        } else {
                            rowClean[k] = v;
                        }
                    }
                    return rowClean;
                });

                const ws = XLSX.utils.json_to_sheet(sanitizedRows);
                // Sheet names no Excel têm limite máximo de 31 caracteres
                const sheetName = tabela.slice(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }

            XLSX.writeFile(wb, nomeBase + '.xlsx');

            if (statusMsg) {
                statusMsg.style.color = '#15803d';
                statusMsg.textContent = '✅ Planilha Excel consolidada gerada com sucesso! ' + totalRegistros.toLocaleString('pt-BR') + ' registros em ' + tabelasComDados + ' abas.';
            }
        }
    } catch (err) {
        console.error('Erro ao gerar backup:', err);
        if (statusMsg) {
            statusMsg.style.color = '#dc2626';
            statusMsg.textContent = '❌ Erro ao gerar backup: ' + err.message;
        }
    } finally {
        if (btnJson) btnJson.disabled = false;
        if (btnXlsx) btnXlsx.disabled = false;
        setTimeout(() => {
            if (wrap) wrap.style.display = 'none';
        }, 3500);
    }
}

// --------------------------------------------
// RESTAURAÇÃO DE BACKUP
// --------------------------------------------
let backupParaRestaurarCarregado = null;

function aoSelecionarArquivoBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.tabelas && !data.checklists) {
                alert('O arquivo selecionado não parece ser um backup válido deste sistema (campo "tabelas" ausente).');
                return;
            }
            const tabelasMap = data.tabelas || data;
            backupParaRestaurarCarregado = {
                metadata: data,
                tabelas: tabelasMap
            };
            abrirModalRestaurarBackup(backupParaRestaurarCarregado);
        } catch (err) {
            alert('Erro ao ler o arquivo JSON de backup: ' + err.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function abrirModalRestaurarBackup(payload) {
    const modal = document.getElementById('modalRestaurarBackup');
    const infoCard = document.getElementById('restoreFileInfoCard');
    const listEl = document.getElementById('restoreTablesList');
    const statusEl = document.getElementById('restoreStatusMsg');
    const progWrap = document.getElementById('restoreProgressWrap');
    if (!modal || !infoCard || !listEl) return;

    if (statusEl) statusEl.textContent = '';
    if (progWrap) progWrap.style.display = 'none';

    const meta = payload.metadata || {};
    const geradoEm = meta.gerado_em ? new Date(meta.gerado_em).toLocaleString('pt-BR') : 'Data não informada';
    const autor = meta.gerado_por ? (meta.gerado_por.nome || meta.gerado_por.usuario || 'Usuário do sistema') : '—';
    const totalReg = meta.estatisticas?.total_registros_exportados || Object.values(payload.tabelas).reduce((acc, cur) => acc + (Array.isArray(cur) ? cur.length : 0), 0);

    infoCard.innerHTML = '<div style="font-weight:700; color:#0f172a; margin-bottom:4px; font-size:13.5px;">📄 Resumo do Arquivo de Backup</div>' +
        '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:6px;">' +
            '<div>📅 <strong>Gerado em:</strong> ' + escapeHTML(geradoEm) + '</div>' +
            '<div>👤 <strong>Autor:</strong> ' + escapeHTML(autor) + '</div>' +
            '<div>📊 <strong>Total de Registros:</strong> ' + totalReg.toLocaleString('pt-BR') + '</div>' +
            '<div>🏢 <strong>Projeto:</strong> ' + escapeHTML(meta.projeto || 'Ramal do Agreste') + '</div>' +
        '</div>';

    const entries = Object.entries(payload.tabelas).filter(([k, v]) => Array.isArray(v) && v.length > 0);
    if (entries.length === 0) {
        listEl.innerHTML = '<div style="padding:10px; color:#64748b; font-size:12px;">Nenhuma tabela com dados encontrada neste backup.</div>';
    } else {
        listEl.innerHTML = entries.map(([tabela, rows]) => {
            const cfg = BACKUP_TABELAS_CONFIG.find(c => c.tabela === tabela);
            const nomeExibicao = cfg ? (cfg.label + ' (' + tabela + ')') : tabela;
            return '<label style="display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:6px; background:#f8fafc; border:1px solid #e2e8f0; font-size:12px; cursor:pointer;">' +
                '<input type="checkbox" class="chk-restore-tabela" value="' + escapeHTML(tabela) + '" checked style="cursor:pointer;">' +
                '<span style="font-weight:600; color:#1e293b; flex:1;">' + escapeHTML(nomeExibicao) + '</span>' +
                '<span style="font-size:11px; font-weight:700; background:#e2e8f0; color:#475569; padding:1px 6px; border-radius:10px;">' + rows.length + '</span>' +
            '</label>';
        }).join('');
    }

    modal.style.display = 'flex';
}

function fecharModalRestaurarBackup() {
    const modal = document.getElementById('modalRestaurarBackup');
    if (modal) modal.style.display = 'none';
    backupParaRestaurarCarregado = null;
}

function toggleSelectAllTabelasRestore(selectAll) {
    document.querySelectorAll('.chk-restore-tabela').forEach(chk => {
        chk.checked = !!selectAll;
    });
}

async function executarRestauracaoBackup() {
    if (!backupParaRestaurarCarregado || !backupParaRestaurarCarregado.tabelas) {
        alert('Nenhum backup carregado para restaurar.');
        return;
    }

    const selecionadas = Array.from(document.querySelectorAll('.chk-restore-tabela:checked')).map(el => el.value);
    if (selecionadas.length === 0) {
        alert('Selecione pelo menos uma tabela para restaurar.');
        return;
    }

    const confirmacao = prompt(
        '⚠️ CONFIRMAÇÃO DE SEGURANÇA:\n\n' +
        'Você selecionou ' + selecionadas.length + ' tabela(s) para restauração no Supabase.\n' +
        'Os dados serão mesclados com a base ativa.\n\n' +
        'Para confirmar e iniciar, digite "RESTAURAR" abaixo:'
    );

    if (confirmacao !== 'RESTAURAR') {
        alert('Restauração cancelada. O texto digitado não confere com "RESTAURAR".');
        return;
    }

    const btnConfirmar = document.getElementById('btnConfirmarRestauracao');
    const progWrap = document.getElementById('restoreProgressWrap');
    const progBar = document.getElementById('restoreProgressBar');
    const progLabel = document.getElementById('restoreProgressLabel');
    const progPercent = document.getElementById('restoreProgressPercent');
    const statusMsg = document.getElementById('restoreStatusMsg');

    if (btnConfirmar) btnConfirmar.disabled = true;
    if (progWrap) progWrap.style.display = 'block';

    let totalLinhasRestauradas = 0;
    let tabelasProcessadas = 0;

    try {
        for (let i = 0; i < selecionadas.length; i++) {
            const tabela = selecionadas[i];
            const rows = backupParaRestaurarCarregado.tabelas[tabela] || [];
            const pct = Math.round(((i + 1) / selecionadas.length) * 100);

            if (progBar) progBar.style.width = pct + '%';
            if (progPercent) progPercent.textContent = pct + '%';
            if (progLabel) progLabel.textContent = 'Restaurando ' + tabela + ' (' + rows.length + ' registros)...';

            if (rows.length > 0) {
                // Enviar em lotes de 100 registros para evitar limite de payload
                const BATCH_SIZE = 100;
                for (let b = 0; b < rows.length; b += BATCH_SIZE) {
                    const batch = rows.slice(b, b + BATCH_SIZE);
                    try {
                        await supabaseUpsert(tabela, batch);
                    } catch (upsertErr) {
                        console.warn('Upsert padrão falhou para ' + tabela + ', tentando insert:', upsertErr.message);
                        await supabaseInsert(tabela, batch);
                    }
                }
                totalLinhasRestauradas += rows.length;
            }
            tabelasProcessadas++;
        }

        if (statusMsg) {
            statusMsg.style.color = '#15803d';
            statusMsg.textContent = '✅ Restauração finalizada com sucesso! ' + totalLinhasRestauradas.toLocaleString('pt-BR') + ' registros gravados em ' + tabelasProcessadas + ' tabelas.';
        }

        alert('✅ Restauração concluída com sucesso!\n\nForam gravados ' + totalLinhasRestauradas + ' registros em ' + tabelasProcessadas + ' tabelas.\nO sistema irá recarregar as visões.');

        fecharModalRestaurarBackup();
        if (typeof renderAll === 'function') renderAll();
        if (typeof loadTreinamentosData === 'function') loadTreinamentosData();
        if (typeof loadEfetivoData === 'function') loadEfetivoData();
    } catch (err) {
        console.error('Erro na restauração:', err);
        if (statusMsg) {
            statusMsg.style.color = '#dc2626';
            statusMsg.textContent = '❌ Erro durante a restauração: ' + err.message;
        }
        alert('❌ Erro durante a restauração: ' + err.message);
    } finally {
        if (btnConfirmar) btnConfirmar.disabled = false;
    }
}


// ============================================
// COMPRAS (Requisição Interna de Compras) - cadastro, histórico, baixa e prazo de
// entrega. Mesmo formulário de papel já usado pela empresa (COP - Consórcio Operador
// do PISF Ramal do Agreste): "Requisição Interna de Compras" (RM), cabeçalho fixo +
// lista de itens. id = número da RM (texto, ex: "003", "058") - nenhum PDF real tem a
// data de recebimento preenchida (o campo existe no papel mas nunca foi digitado), então
// rastrear prazo de entrega é uma capacidade nova, não algo herdado do histórico.
// ============================================
let allComprasRequisicoes = [];
let comprasLoaded = false;
let comprasFilter = 'mes';
let comprasFiltroAno = '';
let comprasFiltroMes = '';
let comprasStatusFiltro = '';
let comprasItensForm = [];
let comprasItemExpandidoId = null;

async function loadComprasData() {
    try {
        allComprasRequisicoes = await supabaseFetch('compras_requisicoes', '?select=*');
        renderComprasPanel();
        renderComprasHistoricoLista();
    } catch (err) {
        console.error('Erro ao carregar dados de Compras:', err);
    }
}

function showComprasSubtab(tab) {
    ['visao', 'nova', 'historico'].forEach(t => {
        const content = document.getElementById('comprasSubtab-' + t);
        const btn = document.getElementById('comprasSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderComprasPanel();
    if (tab === 'historico') renderComprasHistoricoLista();
}

function popularFiltroAnoCompras() {
    const anos = new Set([new Date().getFullYear()]);
    allComprasRequisicoes.forEach(c => { if (c.data_emissao) anos.add(parseLocalDate(c.data_emissao).getFullYear()); });
    popularSelectAnos('comprasFiltroAno', anos);
}

function getComprasDateRange() {
    const tituloEl = document.getElementById('comprasPeriodoTitulo');
    if (comprasFiltroAno) {
        const ano = parseInt(comprasFiltroAno, 10);
        if (comprasFiltroMes !== '') {
            const mes = parseInt(comprasFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }
    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (comprasFilter === 'trimestre') { inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1); titulo = 'Últimos 3 meses'; }
    else if (comprasFilter === 'ano') { inicio = new Date(now.getFullYear(), 0, 1); titulo = `Ano ${now.getFullYear()} (até hoje)`; }
    else if (comprasFilter === 'todos') { inicio = new Date(2000, 0, 1); titulo = 'Todo o histórico'; }
    else { inicio = new Date(now.getFullYear(), now.getMonth(), 1); titulo = 'Este mês'; }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setComprasFilter(filter) {
    comprasFilter = filter;
    comprasFiltroAno = '';
    comprasFiltroMes = '';
    const anoSel = document.getElementById('comprasFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('comprasFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroComprasMes', 'btnFiltroComprasTrimestre', 'btnFiltroComprasAno', 'btnFiltroComprasTodos'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    const map = { mes: 'btnFiltroComprasMes', trimestre: 'btnFiltroComprasTrimestre', ano: 'btnFiltroComprasAno', todos: 'btnFiltroComprasTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderComprasPanel();
}

function onComprasFiltroAnoMesChange() {
    comprasFiltroAno = document.getElementById('comprasFiltroAno').value;
    comprasFiltroMes = document.getElementById('comprasFiltroMes').value;
    if (comprasFiltroAno) {
        ['btnFiltroComprasMes', 'btnFiltroComprasTrimestre', 'btnFiltroComprasAno', 'btnFiltroComprasTodos'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    }
    renderComprasPanel();
}

// Dias corridos entre duas datas ISO - usado tanto pro tempo total de entrega (emissão
// -> recebimento) quanto pro "há quantos dias está pendente" da lista de aging.
function diasEntre(dataIniISO, dataFimISO) {
    const ini = parseLocalDate(dataIniISO);
    const fim = parseLocalDate(dataFimISO);
    return Math.round((fim.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24));
}

function resumoItensCompra(c) {
    const itens = Array.isArray(c.itens) ? c.itens : [];
    if (itens.length === 0) return c.aplicacao || 'Sem itens';
    const primeiro = itens[0].descricao || '';
    return itens.length > 1 ? `${primeiro} (+${itens.length - 1} ite${itens.length - 1 > 1 ? 'ns' : 'm'})` : primeiro;
}

// Sugere o próximo número de RM (sequencial) - mesmo padrão já usado pro código de EPI:
// olha o maior número já cadastrado e soma 1, ignorando ids não numéricos.
function proximoNumeroRM() {
    const numeros = allComprasRequisicoes.map(c => parseInt(c.id, 10)).filter(n => !isNaN(n));
    const maior = numeros.length > 0 ? Math.max(...numeros) : 0;
    return String(maior + 1).padStart(3, '0');
}

function renderComprasPanel() {
    popularFiltroAnoCompras();
    const { inicio, fim } = getComprasDateRange();
    const periodo = allComprasRequisicoes.filter(c => {
        if (!c.data_emissao) return false;
        const d = parseLocalDate(c.data_emissao);
        return d >= inicio && d <= fim;
    });

    document.getElementById('kpiComprasTotal').textContent = periodo.length;
    const pendentesGeral = allComprasRequisicoes.filter(c => c.status !== 'recebido');
    document.getElementById('kpiComprasPendentes').textContent = pendentesGeral.length;

    const recebidosNoPeriodo = periodo.filter(c => c.status === 'recebido' && c.data_recebimento);
    const tempoMedio = recebidosNoPeriodo.length > 0
        ? (recebidosNoPeriodo.reduce((sum, c) => sum + diasEntre(c.data_emissao, c.data_recebimento), 0) / recebidosNoPeriodo.length)
        : null;
    document.getElementById('kpiComprasTempoMedio').textContent = tempoMedio !== null ? tempoMedio.toFixed(1) : '—';

    const comDataSolicitada = recebidosNoPeriodo.filter(c => c.data_solicitada);
    const noPrazo = comDataSolicitada.filter(c => parseLocalDate(c.data_recebimento) <= parseLocalDate(c.data_solicitada));
    document.getElementById('kpiComprasNoPrazo').textContent = comDataSolicitada.length > 0
        ? `${Math.round(noPrazo.length / comDataSolicitada.length * 100)}%` : '—';

    // Lista de aging: pendentes de TODA a base (não só do período filtrado - o ponto de
    // uma lista de "mais antigas pendentes" é justamente olhar pra trás do período
    // corrente), ordenada da mais antiga pra mais nova.
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const pendentesOrdenadas = pendentesGeral.slice().sort((a, b) => (a.data_emissao || '').localeCompare(b.data_emissao || ''));
    const listEl = document.getElementById('listComprasPendentesAntigas');
    if (pendentesOrdenadas.length === 0) {
        listEl.innerHTML = '<div class="db-list-empty">✅ Nenhuma requisição pendente.</div>';
    } else {
        listEl.innerHTML = pendentesOrdenadas.slice(0, 30).map(c => {
            const diasAberta = diasEntre(c.data_emissao, hoje.toISOString().slice(0, 10));
            const cls = diasAberta > 30 ? 'db-item-danger' : diasAberta > 15 ? 'db-item-warning' : '';
            return `<div class="db-list-item ${cls}" style="cursor:pointer;" onclick="abrirDetalheCompraNaAba('${escapeHTML(c.id)}')">
                <div class="db-list-item-title">RM ${escapeHTML(c.id)} — ${escapeHTML(resumoItensCompra(c))}</div>
                <div class="db-list-item-sub">Emitida em ${formatSimpleDate(c.data_emissao)} — há ${diasAberta} dia(s) pendente</div>
            </div>`;
        }).join('');
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.comprasTempoEntrega) chartInstances.comprasTempoEntrega.destroy();
    if (chartInstances.comprasPrioridade) chartInstances.comprasPrioridade.destroy();

    // Tempo médio de entrega por mês - histórico completo (mês da emissão), mesmo
    // padrão dos outros gráficos "por mês" deste painel (âncora na 1ª requisição).
    const meses = [], temposPorMes = [];
    const now = new Date();
    const datasEmissao = allComprasRequisicoes.filter(c => c.data_emissao).map(c => parseLocalDate(c.data_emissao));
    const primeiraData = datasEmissao.length > 0 ? new Date(Math.min(...datasEmissao.map(d => d.getTime()))) : now;
    let cursorMes = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1);
    const limiteMes = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursorMes <= limiteMes) {
        const ano = cursorMes.getFullYear(), mes = cursorMes.getMonth();
        meses.push(cursorMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const ini = new Date(ano, mes, 1), fimMes = new Date(ano, mes + 1, 0);
        const recebidosMes = allComprasRequisicoes.filter(c => {
            if (c.status !== 'recebido' || !c.data_emissao || !c.data_recebimento) return false;
            const d = parseLocalDate(c.data_emissao);
            return d >= ini && d <= fimMes;
        });
        temposPorMes.push(recebidosMes.length > 0
            ? Number((recebidosMes.reduce((sum, c) => sum + diasEntre(c.data_emissao, c.data_recebimento), 0) / recebidosMes.length).toFixed(1))
            : null);
        cursorMes = new Date(ano, mes + 1, 1);
    }
    chartInstances.comprasTempoEntrega = new Chart(document.getElementById('chartComprasTempoEntrega'), {
        type: 'line',
        data: { labels: meses, datasets: [{ label: 'Dias', data: temposPorMes, borderColor: '#4f46e5', backgroundColor: '#4f46e5', tension: 0.3, spanGaps: true }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const prioridadeLabels = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };
    const prioridadeCounts = { baixa: 0, media: 0, alta: 0, urgente: 0 };
    periodo.forEach(c => { const p = c.prioridade || 'media'; if (prioridadeCounts[p] !== undefined) prioridadeCounts[p]++; });
    chartInstances.comprasPrioridade = new Chart(document.getElementById('chartComprasPrioridade'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(prioridadeCounts).map(k => prioridadeLabels[k]),
            datasets: [{ data: Object.values(prioridadeCounts), backgroundColor: ['#94a3b8', '#4f46e5', '#f59e0b', '#ef4444'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ---- Formulário "Nova Requisição" ----

function abrirFormNovaCompra() {
    document.getElementById('compraForm_id').value = '';
    document.getElementById('compraForm_numero').value = proximoNumeroRM();
    document.getElementById('compraForm_dataEmissao').value = new Date().toISOString().slice(0, 10);
    document.getElementById('compraForm_dataSolicitada').value = '';
    document.getElementById('compraForm_prioridade').value = 'media';
    document.getElementById('compraForm_local').value = 'ARCOVERDE - PE';
    document.getElementById('compraForm_setor').value = 'SMS';
    document.getElementById('compraForm_engResponsavel').value = 'JOÃO EVERTON DE SOUZA LIMEIRA';
    document.getElementById('compraForm_aplicacao').value = '';
    document.getElementById('compraFormTitle').textContent = '➕ Nova Requisição de Compra';
    document.getElementById('compraForm_btnImprimir').style.display = 'none';
    document.getElementById('compraFormStatus').textContent = '';
    comprasItensForm = [{ qtd: '', unid: 'UNID.', cor: '', tam: '', codigo: '', descricao: '', referencia: '', observacao: '' }];
    renderItensCompraForm();
}

function editarRequisicaoCompra(id) {
    const c = allComprasRequisicoes.find(x => x.id === id);
    if (!c) return;
    showComprasSubtab('nova');
    document.getElementById('compraForm_id').value = c.id;
    document.getElementById('compraForm_numero').value = c.id;
    document.getElementById('compraForm_dataEmissao').value = c.data_emissao || '';
    document.getElementById('compraForm_dataSolicitada').value = c.data_solicitada || '';
    document.getElementById('compraForm_prioridade').value = c.prioridade || 'media';
    document.getElementById('compraForm_local').value = c.depto_obra_local || '';
    document.getElementById('compraForm_setor').value = c.setor_solicitante || '';
    document.getElementById('compraForm_engResponsavel').value = c.eng_responsavel || '';
    document.getElementById('compraForm_aplicacao').value = c.aplicacao || '';
    document.getElementById('compraFormTitle').textContent = `✏️ Editando RM ${escapeHTML(c.id)}`;
    document.getElementById('compraForm_btnImprimir').style.display = 'inline-block';
    document.getElementById('compraFormStatus').textContent = '';
    comprasItensForm = Array.isArray(c.itens) && c.itens.length > 0
        ? c.itens.map(i => ({ ...i }))
        : [{ qtd: '', unid: 'UNID.', cor: '', tam: '', codigo: '', referencia: '', observacao: '', descricao: '' }];
    renderItensCompraForm();
    document.getElementById('compraFormTitle').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderItensCompraForm() {
    const container = document.getElementById('compraFormItensLista');
    if (!container) return;
    const campoEstilo = 'padding:6px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; width:100%; box-sizing:border-box;';
    container.innerHTML = comprasItensForm.map((item, i) => `
        <div style="display:grid; grid-template-columns: 60px 70px 90px 70px 110px 1fr 130px 32px; gap:6px; margin-bottom:6px; align-items:center;">
            <input type="number" min="0" placeholder="Qtd" value="${item.qtd ?? ''}" oninput="comprasItensForm[${i}].qtd=this.value" style="${campoEstilo}">
            <input type="text" placeholder="Unid." value="${escapeHTML(item.unid || '')}" oninput="comprasItensForm[${i}].unid=this.value" style="${campoEstilo}">
            <input type="text" placeholder="Cor" value="${escapeHTML(item.cor || '')}" oninput="comprasItensForm[${i}].cor=this.value" style="${campoEstilo}">
            <input type="text" placeholder="Tam." value="${escapeHTML(item.tam || '')}" oninput="comprasItensForm[${i}].tam=this.value" style="${campoEstilo}">
            <input type="text" placeholder="Código" value="${escapeHTML(item.codigo || '')}" oninput="comprasItensForm[${i}].codigo=this.value" style="${campoEstilo}">
            <input type="text" placeholder="Descrição do material" value="${escapeHTML(item.descricao || '')}" oninput="comprasItensForm[${i}].descricao=this.value" style="${campoEstilo}">
            <input type="text" placeholder="Observação" value="${escapeHTML(item.observacao || '')}" oninput="comprasItensForm[${i}].observacao=this.value" style="${campoEstilo}">
            <button onclick="removerItemCompraForm(${i})" title="Remover item" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:16px;">🗑️</button>
        </div>`).join('');
}

function adicionarItemCompraForm() {
    comprasItensForm.push({ qtd: '', unid: 'UNID.', cor: '', tam: '', codigo: '', descricao: '', referencia: '', observacao: '' });
    renderItensCompraForm();
}

function removerItemCompraForm(i) {
    comprasItensForm.splice(i, 1);
    if (comprasItensForm.length === 0) comprasItensForm.push({ qtd: '', unid: 'UNID.', cor: '', tam: '', codigo: '', descricao: '', referencia: '', observacao: '' });
    renderItensCompraForm();
}

async function salvarRequisicaoCompra() {
    const statusEl = document.getElementById('compraFormStatus');
    const numero = document.getElementById('compraForm_numero').value.trim();
    const dataEmissao = document.getElementById('compraForm_dataEmissao').value;
    if (!numero) { statusEl.textContent = '❌ Informe o número da RM.'; statusEl.style.color = 'var(--danger)'; return; }
    if (!dataEmissao) { statusEl.textContent = '❌ Informe a data de emissão.'; statusEl.style.color = 'var(--danger)'; return; }

    const editandoId = document.getElementById('compraForm_id').value;
    if (!editandoId && allComprasRequisicoes.some(c => c.id === numero)) {
        statusEl.textContent = `❌ Já existe uma RM ${numero} cadastrada - edite ela em vez de criar uma nova, ou use outro número.`;
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const itensValidos = comprasItensForm.filter(i => (i.descricao || '').trim());
    if (itensValidos.length === 0) { statusEl.textContent = '❌ Adicione ao menos um item com descrição.'; statusEl.style.color = 'var(--danger)'; return; }

    const existente = editandoId ? allComprasRequisicoes.find(c => c.id === editandoId) : null;
    const row = {
        id: numero,
        data_emissao: dataEmissao,
        data_solicitada: document.getElementById('compraForm_dataSolicitada').value || null,
        prioridade: document.getElementById('compraForm_prioridade').value,
        empresa: existente?.empresa || 'CONSÓRCIO OPERADOR DO PISF RAMAL DO AGRESTE',
        depto_obra_local: document.getElementById('compraForm_local').value.trim() || null,
        setor_solicitante: document.getElementById('compraForm_setor').value.trim() || null,
        eng_responsavel: document.getElementById('compraForm_engResponsavel').value.trim() || null,
        aplicacao: document.getElementById('compraForm_aplicacao').value.trim() || null,
        itens: itensValidos.map(i => ({
            qtd: i.qtd === '' || i.qtd === null || i.qtd === undefined ? null : Number(i.qtd),
            unid: i.unid || '', cor: i.cor || '', tam: i.tam || '', codigo: i.codigo || '',
            descricao: i.descricao || '', referencia: i.referencia || '', observacao: i.observacao || ''
        })),
        status: existente?.status || 'pendente',
        data_recebimento: existente?.data_recebimento || null,
        observacoes: existente?.observacoes || null,
        arquivo_origem: existente?.arquivo_origem || null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('compras_requisicoes', [row]);
        const idx = allComprasRequisicoes.findIndex(c => c.id === row.id);
        if (idx >= 0) allComprasRequisicoes[idx] = row; else allComprasRequisicoes.push(row);
        statusEl.textContent = '✅ Requisição salva.';
        statusEl.style.color = 'var(--success)';
        document.getElementById('compraForm_id').value = row.id;
        document.getElementById('compraForm_btnImprimir').style.display = 'inline-block';
        renderComprasHistoricoLista();
    } catch (err) {
        console.error('Erro ao salvar requisição de compra:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Histórico / baixa / exclusão ----

function setComprasStatusFiltro(status) {
    comprasStatusFiltro = status;
    ['btnFiltroComprasStatusTodos', 'btnFiltroComprasStatusPendente', 'btnFiltroComprasStatusRecebido'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    const map = { '': 'btnFiltroComprasStatusTodos', pendente: 'btnFiltroComprasStatusPendente', recebido: 'btnFiltroComprasStatusRecebido' };
    document.getElementById(map[status])?.classList.add('active');
    renderComprasHistoricoLista();
}

function limparBuscaComprasHistorico() {
    document.getElementById('buscaComprasHistorico').value = '';
    renderComprasHistoricoLista();
}

function abrirDetalheCompraNaAba(id) {
    comprasItemExpandidoId = id;
    showComprasSubtab('historico');
}

function toggleDetalheCompra(id) {
    comprasItemExpandidoId = comprasItemExpandidoId === id ? null : id;
    renderComprasHistoricoLista();
}

function renderComprasHistoricoLista() {
    const container = document.getElementById('listComprasHistorico');
    if (!container) return;
    const q = (document.getElementById('buscaComprasHistorico')?.value || '').toLowerCase().trim();

    let itens = allComprasRequisicoes.slice();
    if (comprasStatusFiltro) itens = itens.filter(c => (c.status || 'pendente') === comprasStatusFiltro);
    if (q.length >= 2) {
        itens = itens.filter(c => {
            const emItens = Array.isArray(c.itens) && c.itens.some(i => (i.descricao || '').toLowerCase().includes(q));
            return c.id.toLowerCase().includes(q) || (c.aplicacao || '').toLowerCase().includes(q) || emItens;
        });
    }
    itens.sort((a, b) => (b.data_emissao || '').localeCompare(a.data_emissao || ''));

    if (itens.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma requisição encontrada.</div>';
        return;
    }

    container.innerHTML = itens.slice(0, 300).map(c => {
        const recebido = c.status === 'recebido';
        const statusBadge = recebido
            ? '<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc;">✅ Recebido</span>'
            : '<span class="badge" style="background:#fff9e6; color:#b78a00; border:1px solid #ffe8a1;">⏳ Pendente</span>';
        const prazo = recebido && c.data_recebimento ? ` — entregue em ${diasEntre(c.data_emissao, c.data_recebimento)} dia(s)` : '';
        const expandido = comprasItemExpandidoId === c.id;
        const itensList = Array.isArray(c.itens) ? c.itens : [];
        const detalheHtml = expandido ? `
            <div style="flex-basis:100%; margin-top:8px; padding:10px; background:var(--bg); border-radius:8px; font-size:12px;">
                <div><b>Aplicação:</b> ${escapeHTML(c.aplicacao || '—')}</div>
                <div><b>Local:</b> ${escapeHTML(c.depto_obra_local || '—')} · <b>Setor:</b> ${escapeHTML(c.setor_solicitante || '—')} · <b>Eng. Resp.:</b> ${escapeHTML(c.eng_responsavel || '—')}</div>
                <div style="margin-top:6px;"><b>Itens (${itensList.length}):</b></div>
                <ul style="margin:4px 0 0; padding-left:18px;">
                    ${itensList.map(i => `<li>${i.qtd ?? ''} ${escapeHTML(i.unid || '')} — ${escapeHTML(i.descricao || '')}${i.cor ? ' · Cor: ' + escapeHTML(i.cor) : ''}${i.tam ? ' · Tam: ' + escapeHTML(i.tam) : ''}${i.observacao ? ' — <i>' + escapeHTML(i.observacao) + '</i>' : ''}</li>`).join('')}
                </ul>
            </div>` : '';
        return `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:220px; cursor:pointer;" onclick="toggleDetalheCompra('${escapeHTML(c.id)}')">
                <div class="db-list-item-title">RM ${escapeHTML(c.id)} — ${escapeHTML(resumoItensCompra(c))}</div>
                <div class="db-list-item-sub">Emitida em ${formatSimpleDate(c.data_emissao)}${prazo}</div>
            </div>
            ${statusBadge}
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${!recebido ? `<button class="db-apply-btn" onclick="darBaixaCompra('${escapeHTML(c.id)}')">✅ Dar Baixa</button>` : ''}
                <button class="db-clear-btn" onclick="imprimirRequisicaoCompra('${escapeHTML(c.id)}')">🖨️</button>
                <button class="db-clear-btn" onclick="editarRequisicaoCompra('${escapeHTML(c.id)}')">✏️</button>
                <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="excluirRequisicaoCompra('${escapeHTML(c.id)}')">🗑️</button>
            </div>
            ${detalheHtml}
        </div>`;
    }).join('');
}

async function darBaixaCompra(id) {
    const c = allComprasRequisicoes.find(x => x.id === id);
    if (!c) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const dataInformada = prompt(`Data de recebimento da RM ${id} (AAAA-MM-DD):`, hoje);
    if (!dataInformada) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInformada.trim())) {
        alert('Data inválida - use o formato AAAA-MM-DD.');
        return;
    }
    const row = { ...c, status: 'recebido', data_recebimento: dataInformada.trim() };
    try {
        await supabaseUpsert('compras_requisicoes', [row]);
        const idx = allComprasRequisicoes.findIndex(x => x.id === id);
        if (idx >= 0) allComprasRequisicoes[idx] = row;
        renderComprasHistoricoLista();
        if (document.getElementById('comprasSubtabBtn-visao')?.classList.contains('active')) renderComprasPanel();
    } catch (err) {
        console.error('Erro ao dar baixa na requisição de compra:', err);
        alert('❌ Falha ao dar baixa: ' + err.message);
    }
}

async function excluirRequisicaoCompra(id) {
    const c = allComprasRequisicoes.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Excluir a RM ${id} (${resumoItensCompra(c)})? Essa ação não pode ser desfeita.`)) return;
    try {
        await supabaseDelete('compras_requisicoes', id);
        allComprasRequisicoes = allComprasRequisicoes.filter(x => x.id !== id);
        renderComprasHistoricoLista();
        if (document.getElementById('comprasSubtabBtn-visao')?.classList.contains('active')) renderComprasPanel();
    } catch (err) {
        console.error('Erro ao excluir requisição de compra:', err);
        alert('❌ Falha ao excluir: ' + err.message);
    }
}

// ---- Impressão (mesmo layout do formulário de papel real) ----

function imprimirRequisicaoCompra(id) {
    const c = allComprasRequisicoes.find(x => x.id === id);
    if (!c) return;
    const itensList = Array.isArray(c.itens) ? c.itens : [];
    const PRIORIDADE_LABEL = { baixa: 'BAIXA', media: 'MÉDIA', alta: 'ALTA', urgente: 'URGENTE' };
    const marcado = p => (c.prioridade || 'media') === p ? '☑' : '☐';

    const MIN_LINHAS = 19;
    const linhasReais = itensList.map((it, i) => `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="text-align:center;">${it.qtd ?? ''}</td>
        <td style="text-align:center;">${escapeHTML(it.unid || '')}</td>
        <td style="text-align:center;">${escapeHTML(it.cor || '')}</td>
        <td style="text-align:center;">${escapeHTML(it.tam || '')}</td>
        <td>${escapeHTML(it.descricao || '')}</td>
        <td style="text-align:center;">${escapeHTML(it.referencia || '')}</td>
        <td>${escapeHTML(it.observacao || '')}</td>
    </tr>`);
    const linhasVazias = [];
    for (let i = itensList.length; i < MIN_LINHAS; i++) {
        linhasVazias.push(`<tr style="height:22px;"><td style="text-align:center;">${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`);
    }
    const linhasTabela = linhasReais.concat(linhasVazias).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Requisição de Compras - RM ${escapeHTML(c.id)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 20px; }
    .folha { max-width: 1050px; margin: 0 auto; border: 2px solid #000; }
    .cabecalho { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
    .cabecalho .logo { width: 140px; padding: 6px 10px; border-right: 2px solid #000; text-align: center; display:flex; align-items:center; justify-content:center; }
    .cabecalho .logo img { max-height: 42px; max-width: 100%; object-fit: contain; }
    .cabecalho .titulo { flex: 1; text-align: center; font-weight: 700; font-size: 14px; padding: 6px; display:flex; align-items:center; justify-content:center; }
    .cabecalho .campo-pequeno { width: 110px; padding: 5px; border-left: 2px solid #000; text-align: center; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .cabecalho .campo-pequeno b { font-size: 9px; }
    .linha { display: flex; border-bottom: 1px solid #000; }
    .campo { flex: 1; padding: 4px 10px; border-right: 1px solid #000; }
    .campo:last-child { border-right: none; }
    .campo b { margin-right: 4px; }
    .prioridade span { margin-right: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 3px 6px; font-size: 10.5px; }
    th { background: #e5e5e5; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } .folha { border: 2px solid #000; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div class="cabecalho">
            <div class="logo"><img src="${LOGO_COP_BASE64}" alt="COP"></div>
            <div class="titulo">REQUISIÇÃO INTERNA<br>DE COMPRAS</div>
            <div class="campo-pequeno"><b>DATA EMISSÃO</b>${formatSimpleDate(c.data_emissao)}</div>
            <div class="campo-pequeno"><b>DATA SOLICITADA</b>${c.data_solicitada ? formatSimpleDate(c.data_solicitada) : '—'}</div>
            <div class="campo-pequeno"><b>Nº DE CONTROLE</b>RM-${escapeHTML(c.id)}</div>
        </div>
        <div class="linha prioridade">
            <div class="campo" style="flex:3;">
                <b>CLASSIFICAÇÃO DE PRIORIDADE:</b>
                <span>${marcado('baixa')} BAIXA (20-30 dias)</span>
                <span>${marcado('media')} MÉDIA (10-20 dias)</span>
                <span>${marcado('alta')} ALTA (0-10 dias)</span>
                <span>${marcado('urgente')} URGENTE</span>
            </div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>EMPRESA:</b> ${escapeHTML(c.empresa || '')}</div>
            <div class="campo"><b>DEPTO/OBRA - LOCAL:</b> ${escapeHTML(c.depto_obra_local || '')}</div>
            <div class="campo"><b>SETOR:</b> ${escapeHTML(c.setor_solicitante || '')}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>ENG. RESPONSÁVEL:</b> ${escapeHTML(c.eng_responsavel || '')}</div>
            <div class="campo" style="flex:2;"><b>APLICAÇÃO:</b> ${escapeHTML(c.aplicacao || '')}</div>
        </div>
        <table>
            <thead>
                <tr><th style="width:30px;">ITEM</th><th style="width:45px;">QTD.</th><th style="width:55px;">UNID.</th><th style="width:55px;">COR</th><th style="width:45px;">TAM.</th><th>DESCRIÇÃO DO MATERIAL</th><th style="width:90px;">REFERÊNCIA</th><th style="width:150px;">OBSERVAÇÃO</th></tr>
            </thead>
            <tbody>${linhasTabela}</tbody>
        </table>
        <div class="linha" style="border-top:1px solid #000;">
            <div class="campo">ASSINATURA EMITENTE</div>
            <div class="campo">RESPONSÁVEL</div>
            <div class="campo">SUPRIMENTOS - RECEBIMENTO (DATA/VISTO)${c.status === 'recebido' && c.data_recebimento ? ': ' + formatSimpleDate(c.data_recebimento) : ''}</div>
            <div class="campo">KARDEX - DATA/VISTO</div>
        </div>
    </div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}
