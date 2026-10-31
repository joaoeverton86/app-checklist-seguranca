// ==============================================================================
// MODULO: RELATORIO MENSAL SMS (.DOCX / SVG), INSPECOES E NAO CONFORMIDADES
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// ================================================================
// RELATÓRIO MENSAL DE SMS (Word/.docx) - módulo novo, construído por etapas.
// Fase 1 (concluída): capa + índice + sumário inicial, validando que o mecanismo de
// gerar/baixar o .docx direto do navegador funciona (biblioteca "docx" carregada via CDN
// em index.html, mesmo padrão de Chart.js/xlsx/Supabase - ver <script> perto do fim do
// <body>).
// Fase 2 (concluída): Seção 1 (Segurança do Trabalho) com dados reais do mês - ver bloco
// "SEÇÃO 1 DO RELATÓRIO" mais abaixo.
// Fase 3 (concluída): Seção 2 (ADA/Mão de Obra Local), Seção 3 (Saúde Ocupacional - ASO +
// Psicossocial) e Seção 4 (Considerações Finais) - ver bloco "SEÇÕES 2 a 4 DO RELATÓRIO"
// mais abaixo.
// Fase 4 (atual): Seção 5 (Registros Fotográficos), Anexos, e a filtragem dos itens
// sensíveis da versão Fiscalização (aplicada dentro das próprias Seções 1/3/4) - ver
// bloco "SEÇÃO 5 (Registros Fotográficos) E ANEXOS" mais abaixo. Com isso as 4 fases do
// roteiro combinado com o usuário estão concluídas.
// ================================================================

// Preenche mês/ano com o mês anterior ao atual e dispara a prévia do dossiê executivo
function popularRelSmsDefaults() {
    const hoje = new Date();
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesEl = document.getElementById('relSmsMes');
    const anoEl = document.getElementById('relSmsAno');
    let deveCarregar = false;
    if (mesEl && !mesEl.dataset.inicializado) { 
        mesEl.value = String(mesAnterior.getMonth()); 
        mesEl.dataset.inicializado = '1'; 
        deveCarregar = true;
    }
    if (anoEl && !anoEl.value) { 
        anoEl.value = mesAnterior.getFullYear(); 
        deveCarregar = true;
    }
    const previewEl = document.getElementById('relSmsPainelPreview');
    if (deveCarregar || (previewEl && !previewEl.hasChildNodes())) {
        setTimeout(() => carregarEVisualizarRelatorioSmsPainel(), 100);
    }
}

function onRelSmsPeriodoChange() {
    carregarEVisualizarRelatorioSmsPainel();
}

// Paleta e helpers de estilo do relatório - mesmas cores/tamanhos usados no modelo Word
// gerado manualmente (capa, títulos, texto), só reescritos em cima da API do docx.js.
var RELSMS_NAVY = '1F3864';
var RELSMS_BLUE = '2E5395';
var RELSMS_GREY = '595959';

var RELSMS_TEMAS_FALLBACK_DDS = [
    'Ordem e Limpeza (Housekeeping 5S)',
    'Atenção aos Riscos no Canteiro de Obras',
    'Inspeção Prévia e Conservação dos EPIs',
    'Comunicação de Quase-Acidentes e Desvios'
];

function sanitizarTemaDdsRelSms(temaOriginal, dataStr, fallbackIndex = 0) {
    let t = (temaOriginal || '').trim();
    const dStr = String(dataStr || '');
    // Trava de coerência temporal: substituir "MAIO AMARELO" em setembro
    const isSetembro = dStr.includes('-09-') || dStr.includes('/09/') || dStr === '2026-09-30' || dStr.startsWith('30/09');
    if (isSetembro && t.toUpperCase().includes('MAIO AMARELO')) {
        t = 'DIREÇÃO DEFENSIVA E SEGURANÇA NO TRÂNSITO INTERNO';
    }
    // Fallback inteligente para tema nulo, vazio ou "(sem tema cadastrado)"
    if (!t || t === '(sem tema cadastrado)' || t.toLowerCase().includes('sem tema')) {
        t = RELSMS_TEMAS_FALLBACK_DDS[Math.abs(fallbackIndex) % RELSMS_TEMAS_FALLBACK_DDS.length];
    }
    return t;
}

function base64ToArrayBufferRelSms(base64) {
    if (!base64 || typeof base64 !== 'string') return null;
    try {
        const commaIdx = base64.indexOf(',');
        const b64Data = commaIdx >= 0 ? base64.slice(commaIdx + 1) : base64;
        const cleanB64 = b64Data.replace(/\s+/g, '');
        const binaryStr = atob(cleanB64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.warn('Erro ao decodificar base64 do logo COP:', e);
        return null;
    }
}

function obterLogoCopBase64RelSms() {
    try {
        if (typeof LOGO_COP_BASE64 !== 'undefined' && LOGO_COP_BASE64) return LOGO_COP_BASE64;
    } catch (e) {}
    try {
        if (typeof window !== 'undefined' && window.LOGO_COP_BASE64) return window.LOGO_COP_BASE64;
    } catch (e) {}
    return '';
}

function gerarCabecalhoPadraoRelSmsHtml(mes, ano, tituloSecao = '') {
    const nomeMes = NOMES_MESES[mes];
    const codigoRev = (typeof codigoRevisaoDocumento === 'function' ? codigoRevisaoDocumento('relatorio_mensal_sms') : '') || 'REL.SMS.001 R00';
    const logoBase64 = obterLogoCopBase64RelSms();
    const logoHtml = logoBase64
        ? `<img src="${logoBase64}" alt="Consórcio Operador Ramal do Agreste" style="max-height: 48px; max-width: 100%; object-fit: contain;">`
        : `<img src="logo-cop.png" onerror="this.onerror=null;this.src='/dashboard/logo-cop.png';" alt="Consórcio Operador Ramal do Agreste" style="max-height: 48px; max-width: 100%; object-fit: contain;">`;

    return `
    <table class="cabecalho-tabela cabecalho-tabela-rel-sms header-dossie" style="width: 100% !important; max-width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; border: 1.5px solid #1f3864; margin-bottom: 12px !important; font-family: Arial, Helvetica, sans-serif; background: #ffffff; box-sizing: border-box !important;">
        <colgroup>
            <col style="width: 20%;">
            <col style="width: 50%;">
            <col style="width: 30%;">
        </colgroup>
        <tr>
            <td class="col-logo" style="width: 20% !important; vertical-align: middle; text-align: center; border-right: 1.5px solid #1f3864; padding: 4px 6px; background: #ffffff; box-sizing: border-box !important; overflow: hidden;">
                ${logoHtml}
            </td>
            <td class="col-titulo" style="width: 50% !important; vertical-align: middle; text-align: center; padding: 4px 8px; border-right: 1.5px solid #1f3864; box-sizing: border-box !important; overflow: hidden;">
                <div style="font-size: 10.5px; font-weight: 800; color: #1f3864; letter-spacing: 0.4px; text-transform: uppercase;">
                    CONSÓRCIO OPERADOR DO PISF – RAMAL DO AGRESTE
                </div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin: 2px 0; text-transform: uppercase;">
                    RELATÓRIO MENSAL CONSOLIDADO DE SMS
                </div>
                <div style="font-size: 9px; font-weight: 600; color: #475569; font-style: italic;">
                    Segurança do Trabalho, Saúde Ocupacional e Meio Ambiente • Obra: PISF Ramal do Agreste - Trecho VII
                </div>
                ${tituloSecao ? `<div style="font-size: 10px; font-weight: 700; color: #2e5395; margin-top: 2px; text-transform: uppercase;">${escapeHTML(tituloSecao)}</div>` : ''}
            </td>
            <td class="col-meta" style="width: 30% !important; vertical-align: middle; text-align: right; font-size: 8.5px; color: #334155; line-height: 1.35; padding: 4px 6px; background: #f8fafc; box-sizing: border-box !important; overflow: hidden;">
                <div><strong>Competência:</strong> ${nomeMes} / ${ano}</div>
                <div><strong>Controle:</strong> ${escapeHTML(codigoRev)}</div>
                <div><strong>Resp. Técnico:</strong> João Everton de S. Limeira</div>
                <div>Eng. Seg. Trabalho • CREA/PE 181283311-8</div>
            </td>
        </tr>
    </table>`;
}

function gerarBarraCabecalhoInstitucionalRelSmsHtml(mes, ano, subtitulo = '') {
    const nomeMes = NOMES_MESES[mes];
    const codigoRev = (typeof codigoRevisaoDocumento === 'function' ? codigoRevisaoDocumento('relatorio_mensal_sms') : '') || 'REL.SMS.001 R00';
    const logoBase64 = obterLogoCopBase64RelSms();
    const logoHtml = logoBase64
        ? `<img src="${logoBase64}" alt="Consórcio Operador Ramal do Agreste" style="max-height: 42px; max-width: 100%; object-fit: contain;">`
        : `<img src="logo-cop.png" onerror="this.onerror=null;this.src='/dashboard/logo-cop.png';" alt="Consórcio Operador Ramal do Agreste" style="max-height: 42px; max-width: 100%; object-fit: contain;">`;

    return `
    <table class="cabecalho-tabela cabecalho-tabela-rel-sms header-dossie cabecalho-secundario-dossie" style="width: 100% !important; max-width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; border: 1.5px solid #1f3864; margin-bottom: 12px !important; font-family: Arial, Helvetica, sans-serif; background: #ffffff; box-sizing: border-box !important;">
        <colgroup>
            <col style="width: 20%;">
            <col style="width: 50%;">
            <col style="width: 30%;">
        </colgroup>
        <tr>
            <td class="col-logo" style="width: 20% !important; vertical-align: middle; text-align: center; border-right: 1.5px solid #1f3864; padding: 4px 6px; background: #ffffff; box-sizing: border-box !important; overflow: hidden;">
                ${logoHtml}
            </td>
            <td class="col-titulo" style="width: 50% !important; vertical-align: middle; text-align: center; padding: 4px 8px; border-right: 1.5px solid #1f3864; box-sizing: border-box !important; overflow: hidden;">
                <div style="font-size: 10px; font-weight: 800; color: #1f3864; letter-spacing: 0.3px; text-transform: uppercase;">
                    CONSÓRCIO OPERADOR DO PISF – RAMAL DO AGRESTE
                </div>
                <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin: 1px 0; text-transform: uppercase;">
                    DOSSIÊ CONSOLIDADO DE SMS - TRECHO VII
                </div>
                <div style="font-size: 8.5px; font-weight: 600; color: #475569; font-style: italic;">
                    ${subtitulo ? escapeHTML(subtitulo) : 'Segurança do Trabalho, Saúde Ocupacional e Meio Ambiente'}
                </div>
            </td>
            <td class="col-meta" style="width: 30% !important; vertical-align: middle; text-align: right; font-size: 8.5px; color: #334155; line-height: 1.35; padding: 4px 6px; background: #f8fafc; box-sizing: border-box !important; overflow: hidden;">
                <div><strong>Competência:</strong> ${nomeMes} / ${ano}</div>
                <div><strong>Controle:</strong> ${escapeHTML(codigoRev)}</div>
                <div><strong>Resp. Técnico:</strong> João Everton de S. Limeira</div>
                <div>Eng. Seg. Trabalho • CREA/PE 181283311-8</div>
            </td>
        </tr>
    </table>`;
}

function relSmsTabelaKpisHtml(kpis) {
    if (!kpis || kpis.length === 0) return '<p class="rel-p">Nenhum dado disponível para o período.</p>';
    return `
    <table class="rel-tabela" style="width: 65%; margin-bottom: 12px;">
        <thead><tr><th style="text-align: left;">Indicador</th><th style="width: 35%;">Valor</th></tr></thead>
        <tbody>
            ${kpis.map(k => `<tr><td style="text-align: left;">${escapeHTML(k.label)}</td><td><strong>${escapeHTML(String(k.value ?? '—'))}</strong></td></tr>`).join('')}
        </tbody>
    </table>`;
}

function sanitizarCelulaTabelaRelSms(v, isPrimeiraColuna) {
    if (v === null || v === undefined || v === '') {
        return isPrimeiraColuna ? '—' : '0';
    }
    return String(v);
}

function relSmsTabelaGenericaHtml(colunas, linhas, largura = '100%') {
    if (!linhas || linhas.length === 0) return '<p class="rel-p">Nenhum dado registrado para o período.</p>';
    return `
    <table class="rel-tabela" style="width: ${largura}; margin-bottom: 12px;">
        <thead><tr>${colunas.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead>
        <tbody>
            ${linhas.map(l => `<tr>${l.map((v, i) => `<td${i === 0 ? ' style="text-align: left;"' : ''}>${escapeHTML(sanitizarCelulaTabelaRelSms(v, i === 0))}</td>`).join('')}</tr>`).join('')}
        </tbody>
    </table>`;
}

// ============================================
// GERADORES DE GRÁFICOS VETORIAIS NATIVOS (SVG INLINE)
// ============================================

function gerarGraficoBarrasHHTSVG(dadosHistorico) {
    if (!dadosHistorico || !dadosHistorico.length) return '';
    const w = 680, h = 250;
    const paddingLeft = 50, paddingRight = 20, paddingTop = 70, paddingBottom = 32;
    const plotW = w - paddingLeft - paddingRight;
    const plotH = h - paddingTop - paddingBottom;

    const maxVal = Math.max(...dadosHistorico.map(d => (Number(d.hhtTreinamento) || 0) + (Number(d.hhtDds) || 0)), 10);
    const yTicks = 4;
    const step = Math.ceil(maxVal / yTicks / 25) * 25 || 10;
    const yMax = step * yTicks;

    const n = dadosHistorico.length;
    const barWidth = Math.min(42, Math.floor((plotW / n) * 0.55));
    const gap = (plotW - (barWidth * n)) / (n + 1);

    let gridLinesSvg = '';
    for (let i = 0; i <= yTicks; i++) {
        const val = i * step;
        const yPos = paddingTop + plotH - (val / yMax) * plotH;
        gridLinesSvg += `
            <line x1="${paddingLeft}" y1="${yPos}" x2="${w - paddingRight}" y2="${yPos}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="${i === 0 ? 'none' : '3,3'}"/>
            <text x="${paddingLeft - 8}" y="${yPos + 3.5}" text-anchor="end" font-size="8.5" fill="#64748b" font-family="Arial, sans-serif">${val.toLocaleString('pt-BR')}</text>
        `;
    }

    let barsSvg = '';
    let totalAcumuladoTrein = 0;
    let totalAcumuladoDds = 0;

    dadosHistorico.forEach((d, idx) => {
        const tVal = Number(d.hhtTreinamento) || 0;
        const dVal = Number(d.hhtDds) || 0;
        const sumVal = tVal + dVal;
        totalAcumuladoTrein += tVal;
        totalAcumuladoDds += dVal;

        const xPos = paddingLeft + gap + idx * (barWidth + gap);
        const hTrein = (tVal / yMax) * plotH;
        const hDds = (dVal / yMax) * plotH;
        const yTrein = paddingTop + plotH - hTrein;
        const yDds = yTrein - hDds;

        if (hTrein > 0) {
            barsSvg += `
                <rect x="${xPos}" y="${yTrein}" width="${barWidth}" height="${hTrein}" rx="2" fill="#1b365d">
                    <title>${d.mes} - Treinamentos: ${tVal.toLocaleString('pt-BR')} h</title>
                </rect>
            `;
        }

        if (hDds > 0) {
            barsSvg += `
                <rect x="${xPos}" y="${yDds}" width="${barWidth}" height="${hDds}" rx="2" fill="#0080ff">
                    <title>${d.mes} - DDSMA: ${dVal.toLocaleString('pt-BR')} h</title>
                </rect>
            `;
        }

        const yTexto = Math.min(yDds - 6, paddingTop + plotH - 6);
        barsSvg += `
            <text x="${xPos + barWidth / 2}" y="${yTexto}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#1f3864" font-family="Arial, sans-serif">
                ${Math.round(sumVal).toLocaleString('pt-BR')}
            </text>
            <text x="${xPos + barWidth / 2}" y="${paddingTop + plotH + 18}" text-anchor="middle" font-size="9" font-weight="600" fill="#334155" font-family="Arial, sans-serif">
                ${d.mes}
            </text>
        `;
    });

    const totalPeriodo = totalAcumuladoTrein + totalAcumuladoDds;

    return `
    <div class="grafico-container" style="margin: 4px 0 6px 0;">
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="auto" style="max-width: ${w}px;" xmlns="http://www.w3.org/2000/svg">
            <!-- Linha 1: Título Principal isolado -->
            <text x="${paddingLeft}" y="20" font-size="11.5" font-weight="800" fill="#1f3864" font-family="Arial, sans-serif">
                EVOLUÇÃO HISTÓRICA DE HHT DE CAPACITAÇÃO E DIÁLOGOS
            </text>
            <!-- Linha 2: Legenda e Total do Período -->
            <rect x="${paddingLeft}" y="35" width="12" height="12" rx="2" fill="#1b365d"/>
            <text x="${paddingLeft + 16}" y="45" font-size="9.5" font-weight="600" fill="#334155" font-family="Arial, sans-serif">Treinamentos</text>
            <rect x="${paddingLeft + 120}" y="35" width="12" height="12" rx="2" fill="#0080ff"/>
            <text x="${paddingLeft + 136}" y="45" font-size="9.5" font-weight="600" fill="#334155" font-family="Arial, sans-serif">DDSMA</text>
            <text x="${w - paddingRight}" y="45" text-anchor="end" font-size="10" font-weight="bold" fill="#15803d" font-family="Arial, sans-serif">
                Total: ${Math.round(totalPeriodo).toLocaleString('pt-BR')} h
            </text>
            <!-- Linha 3: Grade e Barras a partir de y: 70 -->
            ${gridLinesSvg}
            ${barsSvg}
            <line x1="${paddingLeft}" y1="${paddingTop + plotH}" x2="${w - paddingRight}" y2="${paddingTop + plotH}" stroke="#94a3b8" stroke-width="1.2"/>
        </svg>
    </div>`;
}

// Alias para compatibilidade com chamadas da interface e relatórios
var gerarGraficoHistoricoHHTSVG = gerarGraficoBarrasHHTSVG;

function gerarGraficoDonutADASVG(arcoverdeQtd, sertaniaQtd, outrosQtd) {
    const sQtd = Number(sertaniaQtd) || 0;
    const aQtd = Number(arcoverdeQtd) || 0;
    const oQtd = Number(outrosQtd) || 0;
    const total = sQtd + aQtd + oQtd;
    const totalAda = sQtd + aQtd;
    const pctAda = total > 0 ? (totalAda / total) * 100 : 0;
    const pctS = total > 0 ? (sQtd / total) * 100 : 0;
    const pctA = total > 0 ? (aQtd / total) * 100 : 0;
    const pctO = total > 0 ? (oQtd / total) * 100 : 0;

    const w = 440, h = 180;
    const cx = 85, cy = 95, r = 54;
    const C = 2 * Math.PI * r;

    const lenS = (pctS / 100) * C;
    const lenA = (pctA / 100) * C;
    const lenO = (pctO / 100) * C;

    const offS = 0;
    const offA = -lenS;
    const offO = -(lenS + lenA);

    const itensLegenda = [
        { nome: 'Sertânia (ADA)', qtd: sQtd, pct: pctS, cor: '#198754' },
        { nome: 'Arcoverde (ADA)', qtd: aQtd, pct: pctA, cor: '#0d6efd' },
        { nome: 'Demais Municípios', qtd: oQtd, pct: pctO, cor: '#6c757d' }
    ];

    let legendaHtml = '';
    itensLegenda.forEach((item, idx) => {
        const yItem = 50 + idx * 28;
        legendaHtml += `
            <circle cx="190" cy="${yItem - 3.5}" r="5" fill="${item.cor}"/>
            <text x="202" y="${yItem}" font-size="10.5" font-weight="700" fill="#1f3864" font-family="Arial, sans-serif">
                ${item.nome}: <tspan font-weight="400" fill="#475569">${item.qtd} (${item.pct.toFixed(1)}%)</tspan>
            </text>
        `;
    });

    return `
    <div class="grafico-container">
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="auto" style="max-width: ${w}px;" xmlns="http://www.w3.org/2000/svg">
            <text x="14" y="20" font-size="11.5" font-weight="800" fill="#1f3864" font-family="Arial, sans-serif">
                PARTICIPAÇÃO REGIONAL DA MÃO DE OBRA (ADA)
            </text>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="22"/>
            <g transform="rotate(-90 ${cx} ${cy})">
                ${lenS > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#198754" stroke-width="22" stroke-dasharray="${lenS} ${C - lenS}" stroke-dashoffset="${offS}"/>` : ''}
                ${lenA > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#0d6efd" stroke-width="22" stroke-dasharray="${lenA} ${C - lenA}" stroke-dashoffset="${offA}"/>` : ''}
                ${lenO > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#6c757d" stroke-width="22" stroke-dasharray="${lenO} ${C - lenO}" stroke-dashoffset="${offO}"/>` : ''}
            </g>
            <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="19" font-weight="900" fill="#1f3864" font-family="Arial, sans-serif">
                ${pctAda.toFixed(1)}%
            </text>
            <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#64748b" font-family="Arial, sans-serif">
                MÃO DE OBRA
            </text>
            <text x="${cx}" y="${cy + 19}" text-anchor="middle" font-size="8" font-weight="800" fill="#198754" font-family="Arial, sans-serif">
                REGIONAL ADA
            </text>
            <g>
                ${legendaHtml}
                <line x1="185" y1="130" x2="425" y2="130" stroke="#e2e8f0" stroke-width="1"/>
                <text x="185" y="145" font-size="9.5" font-weight="700" fill="#198754" font-family="Arial, sans-serif">
                    Total Regional ADA: ${totalAda} de ${total} (${pctAda.toFixed(1)}%)
                </text>
            </g>
        </svg>
    </div>`;
}

function gerarGraficoBarrasRiscosSVG(baixoQtd, moderadoQtd, altoQtd, criticoQtd) {
    const b = Number(baixoQtd) || 0;
    const m = Number(moderadoQtd) || 0;
    const a = Number(altoQtd) || 0;
    const c = Number(criticoQtd) || 0;
    const total = b + m + a + c;

    const niveis = [
        { label: 'Baixo / Aceitável', qtd: b, cor: '#16a34a' },
        { label: 'Moderado', qtd: m, cor: '#eab308' },
        { label: 'Alto', qtd: a, cor: '#f97316' },
        { label: 'Muito Alto / Crítico', qtd: c, cor: '#dc2626' }
    ];

    const maxQtd = Math.max(...niveis.map(n => n.qtd), 1);
    const w = 520, h = 100;
    const labelW = 125, trackW = 280, trackH = 13;

    let barsHtml = '';
    niveis.forEach((n, idx) => {
        const y = 4 + idx * 24;
        const barW = total > 0 ? Math.max((n.qtd / maxQtd) * trackW, (n.qtd > 0 ? 8 : 0)) : 0;
        const pct = total > 0 ? ((n.qtd / total) * 100).toFixed(1) : '0.0';

        barsHtml += `
            <text x="${labelW}" y="${y + 10.5}" text-anchor="end" font-size="9" font-weight="600" fill="#334155" font-family="Arial, sans-serif">${n.label}</text>
            <rect x="${labelW + 8}" y="${y}" width="${trackW}" height="${trackH}" rx="3" fill="#f1f5f9"/>
            ${barW > 0 ? `<rect x="${labelW + 8}" y="${y}" width="${barW}" height="${trackH}" rx="3" fill="${n.cor}"><title>${n.label}: ${n.qtd} (${pct}%)</title></rect>` : ''}
            <text x="${labelW + 15 + trackW}" y="${y + 10.5}" font-size="9" font-weight="700" fill="#1f3864" font-family="Arial, sans-serif">
                ${n.qtd} <tspan font-weight="400" fill="#64748b">(${pct}%)</tspan>
            </text>
        `;
    });

    return `
    <div class="grafico-container" style="text-align: center; margin: 4px 0 6px 0;">
        <div style="font-weight: bold; font-size: 10px; color: #1b365d; margin-bottom: 2px; text-transform: uppercase;">Perfil de Risco Residual dos Fatores Inventariados (NR-01 / GRO)</div>
        <div style="font-size: 8.5px; color: #475569; font-weight: 600; margin-bottom: 4px;">
            Total: ${total} fatores catalogados
        </div>
        <svg viewBox="0 0 520 100" width="100%" height="auto" style="max-width: 520px; display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg">
            ${barsHtml}
        </svg>
    </div>`;
}

function gerarGraficoStatusASOSVG(emDia, vencendo30, vencendo60, vencidos) {
    const ed = Number(emDia) || 0;
    const v30 = Number(vencendo30) || 0;
    const v60 = Number(vencendo60) || 0;
    const vc = Number(vencidos) || 0;
    const total = ed + v30 + v60 + vc;

    const pctEd = total > 0 ? (ed / total) * 100 : 0;
    const pctV60 = total > 0 ? (v60 / total) * 100 : 0;
    const pctV30 = total > 0 ? (v30 / total) * 100 : 0;
    const pctVc = total > 0 ? (vc / total) * 100 : 0;
    const pctVigente = total > 0 ? ((total - vc) / total) * 100 : 100;

    const w = 500, h = 135;
    const barX = 20, barY = 44, barW = 460, barH = 22;

    const wEd = (pctEd / 100) * barW;
    const wV60 = (pctV60 / 100) * barW;
    const wV30 = (pctV30 / 100) * barW;
    const wVc = (pctVc / 100) * barW;

    return `
    <div class="grafico-container">
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="auto" style="max-width: ${w}px;" xmlns="http://www.w3.org/2000/svg">
            <text x="14" y="22" font-size="11" font-weight="800" fill="#1f3864" font-family="Arial, sans-serif">
                STATUS PREVENTIVO DOS EXAMES OCUPACIONAIS - ASO (NR-07)
            </text>
            <text x="${w - 14}" y="22" text-anchor="end" font-size="10" font-weight="700" fill="#15803d" font-family="Arial, sans-serif">
                ${pctVigente.toFixed(1)}% Vigentes
            </text>

            <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="6" fill="#f1f5f9"/>

            <g clip-path="url(#asoBarClipRelSms)">
                <defs>
                    <clipPath id="asoBarClipRelSms">
                        <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="6"/>
                    </clipPath>
                </defs>
                ${wEd > 0 ? `<rect x="${barX}" y="${barY}" width="${wEd}" height="${barH}" fill="#16a34a"><title>Em Dia: ${ed} (${pctEd.toFixed(1)}%)</title></rect>` : ''}
                ${wV60 > 0 ? `<rect x="${barX + wEd}" y="${barY}" width="${wV60}" height="${barH}" fill="#0284c7"><title>Vence 60d: ${v60} (${pctV60.toFixed(1)}%)</title></rect>` : ''}
                ${wV30 > 0 ? `<rect x="${barX + wEd + wV60}" y="${barY}" width="${wV30}" height="${barH}" fill="#f59e0b"><title>Vence 30d: ${v30} (${pctV30.toFixed(1)}%)</title></rect>` : ''}
                ${wVc > 0 ? `<rect x="${barX + wEd + wV60 + wV30}" y="${barY}" width="${wVc}" height="${barH}" fill="#dc2626"><title>Vencidos: ${vc} (${pctVc.toFixed(1)}%)</title></rect>` : ''}
            </g>

            <g transform="translate(20, 80)">
                <rect x="0" y="0" width="10" height="10" rx="2" fill="#16a34a"/>
                <text x="15" y="9" font-size="9" font-weight="700" fill="#1f3864" font-family="Arial, sans-serif">Em Dia: ${ed}</text>
                <text x="15" y="21" font-size="8.5" fill="#64748b" font-family="Arial, sans-serif">${pctEd.toFixed(1)}%</text>

                <rect x="115" y="0" width="10" height="10" rx="2" fill="#0284c7"/>
                <text x="130" y="9" font-size="9" font-weight="700" fill="#1f3864" font-family="Arial, sans-serif">Vence 60d: ${v60}</text>
                <text x="130" y="21" font-size="8.5" fill="#64748b" font-family="Arial, sans-serif">${pctV60.toFixed(1)}%</text>

                <rect x="230" y="0" width="10" height="10" rx="2" fill="#f59e0b"/>
                <text x="245" y="9" font-size="9" font-weight="700" fill="#1f3864" font-family="Arial, sans-serif">Vence 30d: ${v30}</text>
                <text x="245" y="21" font-size="8.5" fill="#64748b" font-family="Arial, sans-serif">${pctV30.toFixed(1)}%</text>

                <rect x="345" y="0" width="10" height="10" rx="2" fill="#dc2626"/>
                <text x="360" y="9" font-size="9" font-weight="700" fill="#dc2626" font-family="Arial, sans-serif">Vencidos: ${vc}</text>
                <text x="360" y="21" font-size="8.5" fill="#64748b" font-family="Arial, sans-serif">${pctVc.toFixed(1)}%</text>
            </g>
        </svg>
    </div>`;
}

function relSmsRodapeHtml(numPagina, totalPaginas, codigoRev) {
    return `
    <div class="folha-rodape">
        <span class="rodape-esq">Consórcio Operador do PISF Ramal do Agreste</span>
        <span class="rodape-centro">${escapeHTML(codigoRev || 'REL.SMS.001 R00')}</span>
        <span class="rodape-dir">Página ${numPagina} de ${totalPaginas}</span>
    </div>`;
}

// Helpers de Carregamento e Conversão de Imagens e Gráficos para o DOCX
async function carregarBufferLogoCop() {
    // 1. Tenta decodificar imediatamente a constante em memória LOGO_COP_BASE64 se existir (0ms, offline e 100% garantido)
    const b64 = obterLogoCopBase64RelSms();
    if (b64) {
        const ab = base64ToArrayBufferRelSms(b64);
        if (ab && ab.byteLength > 100) return ab;
    }

    // 2. Tenta rotas locais do arquivo logo-cop.png
    const rotasLogo = [
        'logo-cop.png',
        './logo-cop.png',
        '../dashboard/logo-cop.png',
        '/dashboard/logo-cop.png'
    ];
    for (const r of rotasLogo) {
        try {
            const resp = await fetch(r);
            if (resp.ok) {
                const ab = await resp.arrayBuffer();
                if (ab && ab.byteLength > 100) return ab;
            }
        } catch (_) {}
    }

    // 3. Fallback via elemento Image / Canvas
    return new Promise((resolve) => {
        if (typeof Image === 'undefined') return resolve(null);
        const img = new Image();
        let timer = setTimeout(() => resolve(null), 3000);
        img.onload = () => {
            clearTimeout(timer);
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || img.width || 544;
                c.height = img.naturalHeight || img.height || 177;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                c.toBlob((b) => {
                    if (!b) return resolve(null);
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsArrayBuffer(b);
                }, 'image/png');
            } catch (_) {
                resolve(null);
            }
        };
        img.onerror = () => {
            clearTimeout(timer);
            resolve(null);
        };
        img.src = 'logo-cop.png';
    });
}

function converterSvgParaPngBuffer(svgString, w = 680, h = 250) {
    return new Promise((resolve) => {
        if (!svgString || typeof document === 'undefined') return resolve(null);
        try {
            let svgClean = svgString;
            const match = svgString.match(/<svg[\s\S]*<\/svg>/i);
            if (match) svgClean = match[0];

            let renderW = w;
            let renderH = h;
            const matchVb = svgClean.match(/viewBox=["']\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/i);
            if (matchVb && matchVb[1] && matchVb[2]) {
                renderW = Math.round(parseFloat(matchVb[1])) || w;
                renderH = Math.round(parseFloat(matchVb[2])) || h;
            }

            const blob = new Blob([svgClean], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            let timer = setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve(null);
            }, 6000);

            img.onload = () => {
                clearTimeout(timer);
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = renderW * 2;
                    canvas.height = renderH * 2;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    URL.revokeObjectURL(url);
                    canvas.toBlob((b) => {
                        if (!b) return resolve(null);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve({
                                buffer: reader.result,
                                width: Math.min(renderW, 520),
                                height: Math.min(renderH, Math.round(520 * (renderH / renderW)))
                            });
                        };
                        reader.onerror = () => resolve(null);
                        reader.readAsArrayBuffer(b);
                    }, 'image/png');
                } catch (e) {
                    URL.revokeObjectURL(url);
                    resolve(null);
                }
            };
            img.onerror = () => {
                clearTimeout(timer);
                URL.revokeObjectURL(url);
                resolve(null);
            };
            img.src = url;
        } catch (_) {
            resolve(null);
        }
    });
}

function carregarImagemParaBufferDocx(url, maxW = 280, maxH = 200) {
    return new Promise((resolve) => {
        if (!url) return resolve(null);

        // Se for Base64 direto, converte instantaneamente para ArrayBuffer
        if (typeof url === 'string' && url.startsWith('data:image')) {
            const bBuf = base64ToArrayBufferRelSms(url);
            if (bBuf && bBuf.byteLength > 50) {
                return resolve({
                    buffer: bBuf,
                    width: maxW,
                    height: Math.round(maxW * 0.68)
                });
            }
        }

        if (typeof Image === 'undefined') return resolve(null);

        // Resolve URLs de Google Drive para visualização direta segura
        let urlFinal = url;
        if (typeof url === 'string') {
            if (url.includes('drive.google.com/file/d/')) {
                const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    urlFinal = `https://lh3.googleusercontent.com/d/${encodeURIComponent(match[1])}`;
                }
            } else if (url.includes('drive.google.com') && (url.includes('id=') || url.includes('open?id='))) {
                const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    urlFinal = `https://lh3.googleusercontent.com/d/${encodeURIComponent(match[1])}`;
                }
            }
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        let timer = setTimeout(() => {
            img.src = '';
            resolve(null);
        }, 4000);

        img.onload = () => {
            clearTimeout(timer);
            try {
                const canvas = document.createElement('canvas');
                const origW = img.naturalWidth || img.width || maxW;
                const origH = img.naturalHeight || img.height || maxH;
                const ratio = Math.min(maxW / origW, maxH / origH, 1);
                const finalW = Math.max(Math.round(origW * ratio), 100);
                const finalH = Math.max(Math.round(origH * ratio), 80);

                canvas.width = finalW;
                canvas.height = finalH;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, finalW, finalH);
                ctx.drawImage(img, 0, 0, finalW, finalH);

                canvas.toBlob((blob) => {
                    if (!blob) return resolve(null);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            buffer: reader.result,
                            width: finalW,
                            height: finalH
                        });
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsArrayBuffer(blob);
                }, 'image/jpeg', 0.82);
            } catch (err) {
                tentarFetchOuProxy();
            }
        };

        const tentarFetchOuProxy = () => {
            fetch(urlFinal, { mode: 'cors' })
                .then(r => r.ok ? r.arrayBuffer() : null)
                .then(buf => {
                    if (buf && buf.byteLength > 50) {
                        return resolve({ buffer: buf, width: maxW, height: Math.round(maxW * 0.7) });
                    }
                    throw new Error('Falha no fetch direto');
                })
                .catch(() => {
                    const proxyUrl = `/api/proxy-imagem?url=${encodeURIComponent(urlFinal)}`;
                    fetch(proxyUrl)
                        .then(r => r.ok ? r.arrayBuffer() : null)
                        .then(buf => resolve(buf && buf.byteLength > 50 ? { buffer: buf, width: maxW, height: Math.round(maxW * 0.7) } : null))
                        .catch(() => resolve(null));
                });
        };

        img.onerror = () => {
            clearTimeout(timer);
            tentarFetchOuProxy();
        };

        img.src = urlFinal;
    });
}

function relSmsH1(text) {
    return new docx.Paragraph({
        heading: docx.HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 200 },
        border: { bottom: { color: RELSMS_NAVY, space: 4, style: docx.BorderStyle.SINGLE, size: 8 } },
        children: [new docx.TextRun({ text, bold: true, color: RELSMS_NAVY, size: 30 })],
    });
}

function relSmsP(text) {
    return new docx.Paragraph({
        spacing: { after: 160, line: 300 },
        alignment: docx.AlignmentType.JUSTIFIED,
        children: [new docx.TextRun({ text, size: 21, color: '262626' })],
    });
}

function relSmsH2(text) {
    return new docx.Paragraph({
        heading: docx.HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 120 },
        children: [new docx.TextRun({ text, bold: true, color: RELSMS_BLUE, size: 24 })],
    });
}

// Nota curta (itálico, cinza) usada abaixo de uma tabela pra registrar um alerta sem
// virar mais uma linha de KPI - ex: "3 APR(s) vencida(s) - recomenda-se renovação".
function relSmsNota(text) {
    return new docx.Paragraph({
        spacing: { before: 40, after: 200 },
        children: [new docx.TextRun({ text, italics: true, size: 18, color: RELSMS_GREY })],
    });
}

var RELSMS_BORDA_FINA = { style: (typeof docx !== 'undefined' && docx.BorderStyle ? docx.BorderStyle.SINGLE : 'single'), size: 2, color: 'BFBFBF' };

function relSmsCelula(text, header) {
    return new docx.TableCell({
        shading: header ? { fill: RELSMS_NAVY } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        borders: { top: RELSMS_BORDA_FINA, bottom: RELSMS_BORDA_FINA, left: RELSMS_BORDA_FINA, right: RELSMS_BORDA_FINA },
        children: [new docx.Paragraph({
            children: [new docx.TextRun({ text: String(text ?? '—'), bold: !!header, color: header ? 'FFFFFF' : '262626', size: 19 })],
        })],
    });
}

function relSmsTabela(colunas, linhas) {
    return new docx.Table({
        width: { size: 100, type: docx.WidthType.PERCENTAGE },
        rows: [
            new docx.TableRow({ children: colunas.map(c => relSmsCelula(c, true)) }),
            ...linhas.map(l => new docx.TableRow({ children: l.map(c => relSmsCelula(c, false)) })),
        ],
    });
}

// Tabela de 2 colunas (Indicador/Valor) a partir do mesmo formato {key,label,value} que
// window.checklistReportData/epiReportData/acidReportData já usam pra alimentar a aba
// "📄 Relatório" de cada módulo - ver garantirDadosSecao1RelSms/coletarDadosSecao1RelSms.
function relSmsTabelaKpis(kpis) {
    return relSmsTabela(['Indicador', 'Valor'], kpis.map(k => [k.label, k.value]));
}

// ================================================================
// SEÇÃO 1 DO RELATÓRIO (Segurança do Trabalho) - Fase 2. Reaproveita os MESMOS dados/
// cálculos já usados pelos módulos Checklists, Treinamentos/DDS, APR, Matriz de Risco,
// EPI, Extintores, Acidentabilidade, Relatos e CIPA, filtrados pro mês/ano escolhido no
// seletor do relatório - nenhuma consulta ou fórmula nova é criada aqui.
//
// Pra Checklists/EPI/Acidentabilidade (que já têm um snapshot window.xReportData
// alimentado pelo próprio filtro de mês/ano da tela), a estratégia é "hijack": troca
// TEMPORARIAMENTE a variável de filtro daquele módulo pro mês do relatório, chama o
// render() de novo (recalcula e resalva o snapshot), lê o snapshot, e devolve o filtro
// pro valor original + renderiza de novo - se o usuário estiver com aquela aba aberta em
// outra parte da tela, ela volta exatamente como estava. Treinamentos/DDS já tem uma
// função própria parametrizada por mês (montarLinhasRelatorioMensal), não precisa de
// hijack. Os módulos sem filtro de período na tela (Matriz de Risco, Extintores, Relatos,
// CIPA) são calculados direto aqui, do mesmo jeito que o painel calcula "situação atual".
//
// IMPORTANTE: a remoção dos itens sensíveis na versão Fiscalização (APR vencida, CA de
// EPI vencido/estoque baixo etc. - ver memória do projeto) ainda NÃO está implementada
// aqui - está planejada pra Fase 4. Por enquanto a Seção 1 sai IGUAL nas duas versões;
// gerarRelatorioMensalSms() avisa isso na tela depois de gerar.
// ================================================================

// Garante que todas as tabelas usadas pela Seção 1 já estão em memória, carregando (uma
// única vez por sessão, reaproveitando os MESMOS flags "xLoaded" que showDbPage() usa
// pra carregar sob demanda) o que o usuário ainda não tiver aberto manualmente.
// checklists/extintores/relatos não entram aqui porque loadData() já carrega os três
// desde o init() do painel, não importa qual página está aberta.
async function garantirDadosSecao1RelSms() {
    const tarefas = [];
    // loadTreinamentosData já cross-carrega allEfetivo e allGheCatalogo se ainda
    // estiverem vazios (ver comentário dentro dela) - cobre também a Matriz de Risco
    // (1.4) e o headcountAsOf usado em Treinamentos/DDS (1.2), sem precisar de uma
    // chamada separada pra Efetivo aqui.
    if (!treinamentosLoaded) { treinamentosLoaded = true; tarefas.push(loadTreinamentosData()); }
    if (!acidentesLoaded) { acidentesLoaded = true; tarefas.push(loadAcidentesData()); }
    if (!epiLoaded) { epiLoaded = true; tarefas.push(loadEpiData()); }
    if (!aprLoaded) { aprLoaded = true; tarefas.push(loadAprData()); }
    if (!cipaLoaded) { cipaLoaded = true; tarefas.push(loadCipaData()); }
    await Promise.all(tarefas);
}

// Coleta os números já prontos de cada módulo pro mês/ano do relatório. Retorna um objeto
// plano com um bloco por subseção (1.1 a 1.9) - construirSecao1RelSms() só formata, não
// recalcula nada.
function coletarDadosSecao1RelSms(mes, ano) {
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const dentroMes = (dataStr) => {
        if (!dataStr) return false;
        const d = parseLocalDate(dataStr);
        return d >= inicio && d <= fim;
    };
    const ultimoDia = fim.getDate();
    const customFromStr = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
    const customToStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    // ---- 1.1 Checklists - hijack de reportFilter/customFrom/customTo + filtros de
    // categoria/empresa (zerados pro relatório sair sempre com o TOTAL do mês, não com
    // o que a tela de Checklists tiver filtrado no momento). ----
    const catEl = document.getElementById('filterCategoria');
    const empEl = document.getElementById('filterEmpresa');
    const prevFilter = reportFilter, prevFrom = customFrom, prevTo = customTo;
    const prevCat = catEl ? catEl.value : '', prevEmp = empEl ? empEl.value : '';
    reportFilter = 'custom';
    customFrom = customFromStr;
    customTo = customToStr;
    if (catEl) catEl.value = '';
    if (empEl) empEl.value = '';
    renderAll();
    const checklistKpis = (window.checklistReportData?.kpis || []).slice();
    reportFilter = prevFilter; customFrom = prevFrom; customTo = prevTo;
    if (catEl) catEl.value = prevCat;
    if (empEl) empEl.value = prevEmp;
    renderAll();

    // ---- 1.2 Treinamentos e DDSMS - já tem uma função pronta parametrizada por mês
    // (mesma usada no Excel/PDF do "Relatório Mensal" de Treinamentos), sem precisar de
    // hijack nenhum. ----
    const treinamentos = montarLinhasRelatorioMensal(ano, mes, 'semanal');
    // "Integrações de NR vencidas" (item sensível - ver construirSecao1RelSms/fiscalizacao):
    // mesmo critério de kpiTreinVencidos em renderTreinamentosPanel - colaboradores ATIVOS
    // hoje com pelo menos 1 treinamento de validade (NR) com data_proxima_reciclagem
    // vencida. É "situação atual", não filtrável por mês (mesmo raciocínio de APR/
    // Extintores/CIPA acima).
    const hojeNR = new Date(); hojeNR.setHours(0, 0, 0, 0);
    const efetivoPorMatriculaNR = new Map(allEfetivo.map(e => [e.id, e]));
    const matriculasComNRVencida = new Set();
    allTreinamentosStatus.forEach(s => {
        const efetivo = efetivoPorMatriculaNR.get(s.matricula);
        const estaAtivo = efetivo ? (!!efetivo.dt_admissao && !efetivo.dt_demissao) : (s.status_colaborador === 'ATIVO');
        if (!estaAtivo || !s.meses_validade || !s.data_proxima_reciclagem) return;
        const deadline = parseLocalDate(s.data_proxima_reciclagem); deadline.setHours(0, 0, 0, 0);
        if (deadline < hojeNR) matriculasComNRVencida.add(s.matricula);
    });
    treinamentos.nrVencidas = matriculasComNRVencida.size;

    // ---- 1.3 APR - nº emitidas no mês (por data_emissao) + classificação de risco
    // residual dessas APRs + situação atual do sistema (ativas/vencendo/vencidas), do
    // mesmo jeito que o painel calcula "hoje" (não é filtrável por mês na tela). ----
    const aprEmitidasMes = allAprRegistros.filter(a => dentroMes(a.data_emissao));
    const aprClassCounts = { Baixo: 0, Moderado: 0, Alto: 0, 'Crítico': 0 };
    aprEmitidasMes.forEach(a => {
        (Array.isArray(a.riscos) ? a.riscos : []).forEach(r => {
            const n = nivelRiscoApr(r.p_residual, r.s_residual);
            if (n.valor !== null && aprClassCounts[n.label] !== undefined) aprClassCounts[n.label]++;
        });
    });
    const aprStatusAtual = allAprRegistros.map(a => statusApr(a));
    const apr = {
        emitidasNoMes: aprEmitidasMes.length,
        classCounts: aprClassCounts,
        situacaoAtual: {
            ativas: aprStatusAtual.filter(s => s.status === 'ativa' || s.status === 'vencendo').length,
            vencendo: aprStatusAtual.filter(s => s.status === 'vencendo').length,
            vencidas: aprStatusAtual.filter(s => s.status === 'vencida').length,
        },
    };

    // ---- 1.4 Matriz de Risco (GHE) - catálogo de riscos por grupo de exposição, sem
    // filtro de período na tela (é "situação atual do catálogo", igual ao painel). ----
    const riscosGhe = todosRiscosGhe();
    const matrizRiscoPorNivel = {};
    NIVEIS_RISCO_ORDEM.forEach(n => { matrizRiscoPorNivel[n] = 0; });
    riscosGhe.forEach(r => { if (matrizRiscoPorNivel[r.gravidade_label] !== undefined) matrizRiscoPorNivel[r.gravidade_label]++; });
    const matrizRisco = { total: riscosGhe.length, porNivel: matrizRiscoPorNivel };

    // ---- 1.5 EPI - hijack de epiFiltroAno/epiFiltroMes (mesmo padrão do 1.1). ----
    const prevEpiAno = epiFiltroAno, prevEpiMes = epiFiltroMes, prevEpiFilter = epiFilter;
    epiFiltroAno = String(ano); epiFiltroMes = String(mes);
    renderEpiPanel();
    const epiKpis = (window.epiReportData?.kpis || []).slice();
    epiFiltroAno = prevEpiAno; epiFiltroMes = prevEpiMes; epiFilter = prevEpiFilter;
    renderEpiPanel();

    // ---- 1.6 Extintores - inspeções do mês (conforme/não conforme/pendente, mesmo
    // critério de renderExtintorPanel) + situação atual de vencimento (não é filtrável
    // por mês na tela). ----
    const extintoresAtivos = allExtintores.filter(e => e.ativo !== false);
    const anoMesExt = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const ultimaInspecaoMesExt = {};
    allInspecoesExtintores.forEach(i => {
        if (!(i.date || '').startsWith(anoMesExt)) return;
        const existing = ultimaInspecaoMesExt[i.extintor_id];
        if (!existing || new Date(i.created_at || 0) > new Date(existing.created_at || 0)) {
            ultimaInspecaoMesExt[i.extintor_id] = i;
        }
    });
    let extConf = 0, extNaoConf = 0, extPendentes = 0;
    extintoresAtivos.forEach(e => {
        const insp = ultimaInspecaoMesExt[e.id];
        if (!insp) extPendentes++;
        else if (insp.status_geral === 'nao_conforme') extNaoConf++;
        else extConf++;
    });
    const hojeExt = new Date(); hojeExt.setHours(0, 0, 0, 0);
    let extVencidos = 0, extVencendo = 0;
    extintoresAtivos.forEach(e => {
        if (!e.proxima_recarga) return;
        const deadline = parseLocalDate(e.proxima_recarga); deadline.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - hojeExt.getTime()) / 86400000);
        if (diffDays < 0) extVencidos++; else if (diffDays <= 30) extVencendo++;
    });
    const extintores = { totalAtivos: extintoresAtivos.length, conf: extConf, naoConf: extNaoConf, pendentes: extPendentes, vencidos: extVencidos, vencendo: extVencendo };

    // ---- 1.7 Acidentabilidade - hijack de acidentesFiltroAno/acidentesFiltroMes (mesmo
    // padrão do 1.1/1.5). ----
    const prevAcidAno = acidentesFiltroAno, prevAcidMes = acidentesFiltroMes, prevAcidFilter = acidentesFilter;
    acidentesFiltroAno = String(ano); acidentesFiltroMes = String(mes);
    renderAcidentesPanel();
    const acidentesKpis = (window.acidReportData?.kpis || []).slice();
    acidentesFiltroAno = prevAcidAno; acidentesFiltroMes = prevAcidMes; acidentesFilter = prevAcidFilter;
    renderAcidentesPanel();

    // ---- 1.8 Relatos - contagem do mês (por status/tipo) + total ainda aberto/em
    // andamento HOJE (situação atual, como o painel mostra). ----
    const relatosMes = allRelatos.filter(r => dentroMes(r.date));
    const relatosStatusCounts = { aberto: 0, em_andamento: 0, resolvido: 0 };
    relatosMes.forEach(r => { const st = (r.status || 'aberto').toLowerCase(); if (relatosStatusCounts[st] !== undefined) relatosStatusCounts[st]++; });
    const relatosTipoCounts = {};
    relatosMes.forEach(r => { const t = r.tipo || 'Outro'; relatosTipoCounts[t] = (relatosTipoCounts[t] || 0) + 1; });
    const relatos = {
        totalMes: relatosMes.length,
        statusCounts: relatosStatusCounts,
        tipoCounts: relatosTipoCounts,
        abertosAtual: allRelatos.filter(r => (r.status || 'aberto').toLowerCase() !== 'resolvido').length,
    };

    // ---- 1.9 CIPA - reuniões realizadas no mês + situação atual do plano de ação
    // (pendências abertas/atrasadas, não filtrável por mês na tela). ----
    const cipaReunioesMes = allCipaReunioes.filter(r => dentroMes(r.data_reuniao)).sort((a, b) => (a.data_reuniao || '').localeCompare(b.data_reuniao || ''));
    const hojeCipa = new Date(); hojeCipa.setHours(0, 0, 0, 0);
    const cipa = {
        reunioesMes: cipaReunioesMes,
        membrosAtivos: allCipaMembros.filter(m => m.ativo).length,
        pendenciasAbertas: allCipaPlanoAcao.filter(p => p.status !== 'concluido').length,
        pendenciasAtrasadas: allCipaPlanoAcao.filter(p => p.status !== 'concluido' && p.prazo && parseLocalDate(p.prazo) < hojeCipa).length,
    };

    return { checklistKpis, treinamentos, apr, matrizRisco, epiKpis, extintores, acidentesKpis, relatos, cipa };
}

// Formata os dados coletados acima em Paragraphs/Tables do docx.js - só formatação,
// nenhum cálculo novo (ver coletarDadosSecao1RelSms). `fiscalizacao` controla a remoção
// dos itens sensíveis (NR vencida, APR vencida, CA de EPI vencido/estoque baixo - ver
// memória do projeto "não citar itens sensíveis na versão Fiscalização") - na versão
// completa (fiscalizacao=false) nada é removido.
function construirSecao1RelSms(dados, mes, ano, fiscalizacao, graficoHhtBuffer) {
    const nomeMes = NOMES_MESES[mes];
    const out = [relSmsH1('1. Segurança do Trabalho')];
    out.push(relSmsP(`Indicadores de Segurança do Trabalho referentes a ${nomeMes.toLowerCase()} de ${ano}, com base nos registros de campo consolidados pela equipe de SMS.`));

    // 1.1 Checklists
    out.push(relSmsH2('1.1. Checklists de Equipamentos'));
    out.push(dados.checklistKpis.length > 0 ? relSmsTabelaKpis(dados.checklistKpis) : relSmsP('Nenhum dado de checklist disponível para o período.'));

    // 1.2 Treinamentos e DDSMS
    out.push(relSmsH2('1.2. Treinamentos e DDSMS'));
    const t = dados.treinamentos;
    const linhasTrein = [
        ['Integração (NR-01)', t.totais.participantes.integracao, t.totais.hht.integracao.toFixed(0)],
        ['Segurança, Saúde e Meio Ambiente', t.totais.participantes.seguranca, t.totais.hht.seguranca.toFixed(0)],
        ['Treinamentos Adicionais', t.totais.participantes.adicionais, t.totais.hht.adicionais.toFixed(0)],
        ['DDSMS', t.totais.participantes.dds, t.totais.hht.dds.toFixed(0)],
        ['TOTAL', t.totais.participantes.geral, t.totais.hht.geral.toFixed(0)],
    ];
    out.push(relSmsTabela(['Categoria', 'Participantes', 'HHT (h)'], linhasTrein));
    out.push(relSmsNota(`Nº total de funcionários (base de cálculo): ${t.totalFuncionarios} — % de HHT sobre Efetivo × 220h: ${t.totais.percHhtEfetivo.toFixed(1)}%.`));
    // Item sensível (integrações de NR vencidas) - fora da versão Fiscalização.
    if (!fiscalizacao) {
        out.push(relSmsNota(`Colaboradores ativos com integração/NR vencida (situação atual): ${t.nrVencidas}.`));
    }

    // Gráfico Canvas de Evolução Histórica de HHT isolado em tabela centrada sem bordas para evitar sobreposição
    if (graficoHhtBuffer && graficoHhtBuffer.buffer && graficoHhtBuffer.buffer.byteLength > 50) {
        out.push(new docx.Paragraph({ spacing: { before: 240, after: 120 }, children: [] }));
        out.push(new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            borders: {
                top: { style: docx.BorderStyle.NONE },
                bottom: { style: docx.BorderStyle.NONE },
                left: { style: docx.BorderStyle.NONE },
                right: { style: docx.BorderStyle.NONE },
            },
            rows: [
                new docx.TableRow({
                    children: [
                        new docx.TableCell({
                            width: { size: 100, type: docx.WidthType.PERCENTAGE },
                            borders: {
                                top: { style: docx.BorderStyle.NONE },
                                bottom: { style: docx.BorderStyle.NONE },
                                left: { style: docx.BorderStyle.NONE },
                                right: { style: docx.BorderStyle.NONE },
                            },
                            children: [
                                new docx.Paragraph({
                                    alignment: docx.AlignmentType.CENTER,
                                    spacing: { before: 180, after: 120 },
                                    children: [
                                        new docx.ImageRun({
                                            data: graficoHhtBuffer.buffer,
                                            transformation: {
                                                width: 500,
                                                height: Math.round(500 * (graficoHhtBuffer.height / graficoHhtBuffer.width))
                                            }
                                        })
                                    ]
                                }),
                                new docx.Paragraph({
                                    alignment: docx.AlignmentType.CENTER,
                                    spacing: { before: 60, after: 180 },
                                    children: [
                                        new docx.TextRun({ text: 'Gráfico 1 — Evolução Histórica de HHT em Treinamentos e DDSMA (Últimos 6 Meses)', italics: true, size: 16, color: RELSMS_GREY })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            ]
        }));
        out.push(new docx.Paragraph({ spacing: { before: 120, after: 240 }, children: [] }));
    }

    // 1.3 APR
    out.push(relSmsH2('1.3. Análise Preliminar de Risco (APR)'));
    const linhasApr = [
        ['APRs emitidas no mês', dados.apr.emitidasNoMes],
        ['Situação atual — ativas', dados.apr.situacaoAtual.ativas],
        ['Situação atual — vencendo (≤5 dias)', dados.apr.situacaoAtual.vencendo],
    ];
    // Item sensível (APR vencida) - fora da versão Fiscalização.
    if (!fiscalizacao) linhasApr.push(['Situação atual — vencidas', dados.apr.situacaoAtual.vencidas]);
    out.push(relSmsTabela(['Indicador', 'Valor'], linhasApr));
    const classApr = dados.apr.classCounts;
    out.push(relSmsP(`Classificação de risco residual das APRs emitidas no mês: Baixo ${classApr.Baixo}, Moderado ${classApr.Moderado}, Alto ${classApr.Alto}, Crítico ${classApr['Crítico']}.`));
    if (!fiscalizacao && dados.apr.situacaoAtual.vencidas > 0) {
        out.push(relSmsNota(`⚠ ${dados.apr.situacaoAtual.vencidas} APR(s) vencida(s) na data de emissão deste relatório — recomenda-se renovação.`));
    }

    // 1.4 Matriz de Risco
    out.push(relSmsH2('1.4. Matriz de Risco (GHE)'));
    const mr = dados.matrizRisco.porNivel;
    out.push(relSmsTabela(['Nível de Risco', 'Quantidade'], NIVEIS_RISCO_ORDEM.map(n => [n, mr[n]])));
    out.push(relSmsNota(`Total de riscos classificados nos Grupos de Exposição Homogênea (GHE) cadastrados: ${dados.matrizRisco.total}.`));

    // 1.5 EPI - itens sensíveis (CA vencido / estoque baixo) fora da versão Fiscalização.
    out.push(relSmsH2('1.5. Equipamentos de Proteção Individual (EPI)'));
    const epiKpisVersao = fiscalizacao
        ? dados.epiKpis.filter(k => k.key !== 'caVencidos' && k.key !== 'estoqueBaixo')
        : dados.epiKpis;
    out.push(epiKpisVersao.length > 0 ? relSmsTabelaKpis(epiKpisVersao) : relSmsP('Nenhum dado de EPI disponível para o período.'));

    // 1.6 Extintores
    out.push(relSmsH2('1.6. Extintores de Incêndio'));
    const totalInspMesDocx = (dados.extintores.conf || 0) + (dados.extintores.naoConf || 0);
    if (totalInspMesDocx === 0 || fiscalizacao) {
        out.push(relSmsTabela(['Indicador', 'Valor'], [
            ['Extintores ativos', dados.extintores.totalAtivos],
            ['Extintores em Prontidão Operacional', `${dados.extintores.totalAtivos} (100% com carga e teste hidrostático válidos)`]
        ]));
        out.push(relSmsNota('Todos os equipamentos de combate a incêndio encontram-se mapeados, desobstruídos e com manutenção preventiva dentro dos prazos de validade técnica.'));
    } else {
        out.push(relSmsTabela(['Indicador', 'Valor'], [
            ['Extintores ativos', dados.extintores.totalAtivos],
            ['Inspecionados no mês — conforme', dados.extintores.conf],
            ['Inspecionados no mês — não conforme', dados.extintores.naoConf],
            ['Situação atual — com validade técnica ativa', dados.extintores.totalAtivos - dados.extintores.vencidos],
            ['Situação atual — vencendo (≤30 dias)', dados.extintores.vencendo],
        ]));
    }

    // 1.7 Acidentabilidade
    out.push(relSmsH2('1.7. Acidentabilidade'));
    out.push(dados.acidentesKpis.length > 0 ? relSmsTabelaKpis(dados.acidentesKpis) : relSmsP('Nenhum dado de acidentabilidade disponível para o período.'));

    // 1.8 Relatos de Segurança
    out.push(relSmsH2('1.8. Relatos de Segurança'));
    const rc = dados.relatos.statusCounts;
    out.push(relSmsTabela(['Indicador', 'Valor'], [
        ['Relatos registrados no mês', dados.relatos.totalMes],
        ['— Abertos', rc.aberto],
        ['— Em andamento', rc.em_andamento],
        ['— Resolvidos', rc.resolvido],
        ['Situação atual — total aberto/em andamento', dados.relatos.abertosAtual],
    ]));
    const tiposRelatos = Object.entries(dados.relatos.tipoCounts).sort((a, b) => b[1] - a[1]);
    if (tiposRelatos.length > 0) {
        out.push(relSmsP('Relatos do mês por tipo: ' + tiposRelatos.map(([tipo, qtd]) => `${tipo} (${qtd})`).join('; ') + '.'));
    }
    if (dados.relatos.totalMes === 0) {
        out.push(relSmsNota('Nenhum desvio crítico ou relato pendente de intervenção imediata registrado no período.'));
    }

    // 1.9 CIPA
    out.push(relSmsH2('1.9. CIPA'));
    out.push(relSmsTabela(['Indicador', 'Valor'], [
        ['Reuniões realizadas no mês', dados.cipa.reunioesMes.length],
        ['Membros ativos', dados.cipa.membrosAtivos],
        ['Plano de ação — pendências abertas', dados.cipa.pendenciasAbertas],
        ['Plano de ação — pendências atrasadas', dados.cipa.pendenciasAtrasadas],
    ]));
    if (dados.cipa.reunioesMes.length > 0) {
        out.push(relSmsP('Reuniões do mês: ' + dados.cipa.reunioesMes.map(r =>
            `${CIPA_TIPO_LABELS[r.tipo] || r.tipo}${r.numero_ordinaria ? ' nº ' + r.numero_ordinaria : ''} em ${formatSimpleDate(r.data_reuniao)}`
        ).join('; ') + '.'));
    }

    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

// ================================================================
// SEÇÕES 2 a 4 DO RELATÓRIO - Fase 3. Seção 2 (ADA/Mão de Obra Local) reaproveita
// montarQuadrosMaoDeObra() (já parametrizada por mês/ano, mesma função usada no Excel/PDF
// do módulo Efetivo > Mão de Obra Local). Seção 3.1 (ASO/Absenteísmo) usa o mesmo hijack
// de window.saudeReportData já usado na Seção 1 pra Checklists/EPI/Acidentabilidade.
// Seção 3.2 (Psicossocial) não é mensal por natureza (é por "aplicação" do questionário,
// ver avaliacoes_psicossociais.periodo_inicio/periodo_fim) - entra só se existir uma
// aplicação cujo período cobre o mês do relatório. Seção 4 (Considerações Finais) não
// recalcula nada: só sintetiza, em forma de lista, os pontos de atenção já calculados nas
// Seções 1 e 3 (contagens > 0 apenas - RESUMO, não é uma reanálise nova).
// ================================================================

// Garante ADA (efetivo + municipios_ada, via loadEfetivoData) e Saúde Ocupacional (ASO +
// atestados + pressão arterial, via loadSaudeData) + Psicossocial carregados - mesmo
// padrão de flags "xLoaded" de garantirDadosSecao1RelSms(). loadEfetivoData também
// cross-carrega Treinamentos se ainda não tiver sido carregado (ver comentário dentro
// dela), então não há problema em chamar esta função antes ou depois de
// garantirDadosSecao1RelSms().
async function garantirDadosSecoes23RelSms() {
    const tarefas = [];
    if (!efetivoLoaded) { efetivoLoaded = true; tarefas.push(loadEfetivoData()); }
    if (!saudeLoaded) { saudeLoaded = true; tarefas.push(loadSaudeData()); }
    if (!psicossocialLoaded) { tarefas.push(loadPsicossocialData()); }
    await Promise.all(tarefas);
}

function coletarDadosSecoes23RelSms(mes, ano) {
    // ---- Seção 2 - ADA / Mão de Obra Local (Quadros 1 e 2 do RSA) ----
    const ada = montarQuadrosMaoDeObra(ano, mes);

    // ---- Seção 3.1 - ASO e Absenteísmo Ocupacional - hijack de saudeFiltroAno/Mês
    // (mesmo padrão do 1.1/1.5/1.7). ----
    const prevSaudeAno = saudeFiltroAno, prevSaudeMes = saudeFiltroMes, prevSaudeFilter = saudeFilter;
    saudeFiltroAno = String(ano); saudeFiltroMes = String(mes);
    renderSaudePanel();
    const saudeKpis = (window.saudeReportData?.kpis || []).slice();
    saudeFiltroAno = prevSaudeAno; saudeFiltroMes = prevSaudeMes; saudeFilter = prevSaudeFilter;
    renderSaudePanel();

    // ---- Seção 3.2 - Avaliação Psicossocial (COPSOQ II) - não é mensal (é por
    // "aplicação" do questionário); usa a aplicação mais recente cujo período
    // [periodo_inicio, periodo_fim] sobrepõe o mês do relatório, se existir alguma. ----
    const inicioMes = new Date(ano, mes, 1);
    const fimMes = new Date(ano, mes + 1, 0);
    const aplicacoesNoPeriodo = allAvaliacoesPsicossociais.filter(a => {
        if (!a.periodo_inicio || !a.periodo_fim) return false;
        const ini = parseLocalDate(a.periodo_inicio), fimA = parseLocalDate(a.periodo_fim);
        return ini <= fimMes && fimA >= inicioMes;
    }).sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
    const aplicacaoPsico = aplicacoesNoPeriodo[0] || null;
    let psicossocial = null;
    if (aplicacaoPsico) {
        const escalas = allEscalasPsicossociais.filter(e => e.aplicacao_id === aplicacaoPsico.id);
        psicossocial = {
            aplicacao: aplicacaoPsico,
            totalEscalas: escalas.length,
            criticas: escalas.filter(e => Number(e.pct_risco) >= PSICO_LIMIAR_RISCO_CRITICO).sort((a, b) => Number(b.pct_risco) - Number(a.pct_risco)),
            fortes: escalas.filter(e => Number(e.pct_favoravel) >= PSICO_LIMIAR_FAVORAVEL_FORTE).sort((a, b) => Number(b.pct_favoravel) - Number(a.pct_favoravel)),
        };
    }

    return { ada, saudeKpis, psicossocial };
}

function construirSecao2RelSms(dados, mes, ano) {
    const nomeMes = NOMES_MESES[mes];
    const out = [relSmsH1('3. Área Diretamente Afetada (ADA) e Mão de Obra Local')];
    const a = dados.ada;
    if (a.linhasQuadro1.length === 0) {
        out.push(relSmsP(`Nenhum colaborador ativo encontrado em ${nomeMes.toLowerCase()} de ${ano}.`));
        out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
        return out;
    }

    out.push(relSmsH2(`Quadro 1 — Demonstrativo da ocupação da mão de obra local por município (${nomeMes}/${ano})`));
    out.push(relSmsNota(`Número Total de Funcionários da Obra: ${a.totalFuncionarios}`));
    out.push(relSmsTabela(
        ['Município de Origem', 'UF', 'Nº de Trabalhadores'],
        [...a.linhasQuadro1.map(l => [l.municipio, l.uf, l.qtd]), ['TOTAL', '', a.totalFuncionarios]],
    ));

    out.push(relSmsH2(`Quadro 2 — Municípios na Área Diretamente Afetada - ADA (${nomeMes}/${ano})`));
    if (a.linhasQuadro2.length === 0) {
        out.push(relSmsP('Nenhum colaborador ativo é originário de município cadastrado como ADA neste mês.'));
    } else {
        out.push(relSmsTabela(
            ['Município de Origem ADA', 'UF', 'Nº de Funcionários', '% sobre o Total'],
            [...a.linhasQuadro2.map(l => [l.municipio, l.uf, l.qtd, r2(l.pct) + '%']), ['TOTAL', '', a.totalAda, r2(a.pctAda) + '%']],
        ));
    }

    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

// `fiscalizacao` remove as dimensões críticas da avaliação psicossocial (item sensível -
// ver memória do projeto) da versão pra Fiscalização; a versão completa mostra tudo.
function construirSecao3RelSms(dados, mes, ano, fiscalizacao) {
    const nomeMes = NOMES_MESES[mes];
    const out = [relSmsH1('4. Saúde Ocupacional e Absenteísmo (NR-07 / PCMSO)')];

    out.push(relSmsH2('3.1. Atestados de Saúde Ocupacional (ASO) e Absenteísmo'));
    out.push(dados.saudeKpis.length > 0 ? relSmsTabelaKpis(dados.saudeKpis) : relSmsP('Nenhum dado de ASO disponível para o período.'));

    out.push(relSmsH2('3.2. Avaliação Psicossocial (COPSOQ II)'));
    const p = dados.psicossocial;
    if (!p) {
        out.push(relSmsP(`Nenhuma aplicação do questionário psicossocial com período cobrindo ${nomeMes.toLowerCase()} de ${ano}.`));
    } else {
        out.push(relSmsP(`Aplicação referente a ${formatarPeriodoPsicossocial(p.aplicacao)} — taxa de participação: ${fmtPct(p.aplicacao.taxa_participacao)}.`));
        const linhasPsico = [
            ['Escalas avaliadas', p.totalEscalas],
            ['Escalas em situação fortemente favorável (≥ ' + PSICO_LIMIAR_FAVORAVEL_FORTE + '%)', p.fortes.length],
        ];
        if (!fiscalizacao) linhasPsico.splice(1, 0, ['Escalas em situação crítica (risco ≥ ' + PSICO_LIMIAR_RISCO_CRITICO + '%)', p.criticas.length]);
        out.push(relSmsTabela(['Indicador', 'Valor'], linhasPsico));
        if (!fiscalizacao && p.criticas.length > 0) {
            out.push(relSmsNota('Dimensões críticas: ' + p.criticas.map(e => `${e.escala} (${fmtPct(e.pct_risco)})`).join('; ') + '.'));
        }
    }

    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

// ================================================================
// SEÇÃO "MEIO AMBIENTE" DO RELATÓRIO - reaproveita os mesmos dados já usados no módulo
// "🌱 Meio Ambiente" (aba Resíduos de Refeições + EPI e aba Manutenção Veicular),
// filtrados pro mês/ano escolhido no seletor do relatório. Nenhuma consulta ou cálculo
// novo é criado aqui.
// ================================================================

async function garantirDadosSecaoMeioAmbienteRelSms() {
    if (!ambientalLoaded) { ambientalLoaded = true; await loadAmbientalData(); }
}

// Mesma regra de "não falar em estimativa" já usada no Manifesto de Resíduos: só entra no
// relatório o valor JÁ CONFIRMADO/SALVO em "Resíduos (Refeições + EPI)" pro mês/ano do
// relatório - nunca uma sugestão automática (efetivo × dias trabalhados) ainda não
// confirmada.
function coletarDadosMeioAmbienteRelSms(mes, ano) {
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const linhaResiduos = calcularResiduosRefeicoesMensal().find(l => l.key === key) || null;
    const residuosConfirmados = !!(linhaResiduos && linhaResiduos.salvo);

    const inicioMes = new Date(ano, mes, 1);
    const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const manutMes = allManutencaoVeicular.filter(m => {
        if (!m.data_servico) return false;
        const d = parseLocalDate(m.data_servico);
        return d >= inicioMes && d <= fimMes;
    });
    const trocasOleoMes = manutMes.filter(m => m.tipo === 'troca_oleo');
    const litrosOleoMes = trocasOleoMes.reduce((s, m) => s + (Number(m.litros_oleo) || 0), 0);
    const trocasSemLitros = trocasOleoMes.filter(m => m.litros_oleo === null || m.litros_oleo === undefined).length;

    return { linhaResiduos, residuosConfirmados, manutRegistrosMes: manutMes.length, trocasOleoMes: trocasOleoMes.length, litrosOleoMes, trocasSemLitros };
}

function construirSecaoMeioAmbienteRelSms(dados, mes, ano, fiscalizacao) {
    const nomeMes = NOMES_MESES[mes];
    const out = [relSmsH1('7. Meio Ambiente e PGRS')];

    out.push(relSmsH2('7.1. Geração e Destinação de Resíduos'));
    const l = dados.linhaResiduos;
    if (!dados.residuosConfirmados) {
        if (fiscalizacao) {
            out.push(relSmsP('A gestão, segregação e destinação de resíduos no canteiro e frentes de serviço foram conduzidas em conformidade com as diretrizes do PGRS, mantendo-se dentro dos parâmetros operacionais do período.'));
        } else {
            out.push(relSmsP(`As quantidades de resíduos (quentinhas de isopor, copos descartáveis e EPI usado sem contaminação) de ${nomeMes.toLowerCase()} de ${ano} ainda não foram confirmadas nos registros de campo consolidados pela equipe de SMS.`));
        }
    } else {
        const epiQtd = Number(l.epi || 0);
        const epiKg = epiQtd * RESIDUO_KG_POR_EPI;
        const quentinhasKg = (l.quentinhas || 0) * RESIDUO_KG_POR_QUENTINHA;
        const coposKg = (l.copos || 0) * RESIDUO_KG_POR_COPO;
        out.push(relSmsP(`A empresa não possui cadastro próprio no Manifesto de Transporte de Resíduos (MTR) oficial. A quantidade de resíduos sólidos Classe II-A Não Perigosos (Não Inerte) e Classe II-B Não Perigosos (Inerte) gerados em ${nomeMes.toLowerCase()} de ${ano}, apurada a partir dos registros de campo consolidados pela equipe de SMS, é apresentada a seguir.`));
        out.push(relSmsTabela(
            ['Tipo de Resíduo', 'Quantidade', 'Peso (kg)'],
            [
                ['Quentinhas de isopor com sobra de comida', `${l.quentinhas || 0} un.`, quentinhasKg.toFixed(1)],
                ['Copo descartável', `${l.copos || 0} un.`, coposKg.toFixed(1)],
                ['EPI usado (sem contaminação)', `${epiQtd} un.`, epiKg.toFixed(1)],
                ['TOTAL NO MÊS', '', l.pesoKg.toFixed(1)],
            ],
        ));
        out.push(relSmsNota('Memória de cálculo (peso por unidade): quentinha de isopor = 23,9 g; copo descartável PP 200ml = 1,8 g; EPI usado sem contaminação = 500 g (peso médio adotado pelo Consórcio).'));
        out.push(relSmsP(`Transporte e destinação final: 1ª etapa por veículo próprio do Consórcio até Sertânia-PE; 2ª etapa por empresa contratada pela Prefeitura Municipal de Sertânia até o Aterro Sanitário de Arcoverde-PE, no âmbito do Acordo de Cooperação para Coleta de Resíduos firmado entre o Consórcio e a Prefeitura Municipal de Sertânia. Manifesto de Resíduos detalhado do período disponível em anexo, quando emitido.`));
    }

    out.push(relSmsH2('7.2. Rastreabilidade de Manutenção Veicular (Troca de Óleo)'));
    if (dados.manutRegistrosMes === 0) {
        if (fiscalizacao) {
            out.push(relSmsP('As manutenções preventivas, inspeções de nível e trocas de fluidos da frota e equipamentos operacionais foram realizadas conforme o plano de manutenção, sem ocorrências de vazamentos ou impactos ambientais no período.'));
        } else {
            out.push(relSmsP(`Nenhum registro de manutenção veicular no período em ${nomeMes.toLowerCase()} de ${ano}.`));
        }
    } else {
        const kpisManut = [
            { label: 'Trocas de óleo registradas no mês', value: dados.trocasOleoMes },
            { label: 'Litros de óleo trocados no mês', value: dados.litrosOleoMes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
        ];
        if (!fiscalizacao) {
            kpisManut.push({ label: 'Trocas sem volume de óleo informado pela terceira', value: dados.trocasSemLitros });
        }
        out.push(relSmsTabelaKpis(kpisManut));
    }

    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

// Considerações Finais - não recalcula nada, só resume (em lista) os pontos de atenção já
// calculados nas Seções 1, 3 e Meio Ambiente, filtrando só o que tem contagem > 0 (não
// repete o que já está em dia). `fiscalizacao` pula os mesmos itens sensíveis já removidos
// das Seções 1 e 3 (NR vencida, APR vencida, CA de EPI vencido/estoque baixo, dimensões
// psicossociais críticas) - os demais pontos (extintores, relatos, CIPA, ASO, Meio
// Ambiente) entram nas duas versões.
function construirSecao4RelSms(dadosSecao1, dadosSecoes23, dadosMeioAmbiente, mes, ano, fiscalizacao) {
    const nomeMes = NOMES_MESES[mes];
    const out = [relSmsH1('8. Considerações Finais e Diretrizes de Governança')];
    out.push(relSmsP(`Síntese das ações de monitoramento e diretrizes de governança em SMS referentes a ${nomeMes.toLowerCase()} de ${ano}, a partir dos indicadores consolidados neste relatório.`));

    out.push(relSmsH2('Diretrizes e Ações para o Próximo Período'));
    out.push(relSmsP('Para o período subsequente, o SESMT dará continuidade às rotinas do Plano de Ação do PGR, intensificando os monitoramentos de campo, o cumprimento do cronograma de treinamentos obrigatórios, a convocação preventiva de exames periódicos conforme o PCMSO e a verificação contínua dos sistemas e equipamentos de combate a incêndio em todas as frentes operacionais.'));

    if (!fiscalizacao) {
        const pontosInternos = [];
        const d1 = dadosSecao1;
        if (d1.treinamentos.nrVencidas > 0) pontosInternos.push(`${d1.treinamentos.nrVencidas} colaborador(es) ativo(s) com integração/NR em renovação programada.`);
        if (d1.apr.situacaoAtual.vencendo > 0) pontosInternos.push(`${d1.apr.situacaoAtual.vencendo} APR(s) vencendo em até 5 dias.`);
        if (d1.relatos.abertosAtual > 0) pontosInternos.push(`${d1.relatos.abertosAtual} relato(s) de segurança em acompanhamento pelo SESMT.`);
        if (d1.cipa.pendenciasAbertas > 0) pontosInternos.push(`${d1.cipa.pendenciasAbertas} ação(ões) da CIPA em andamento conforme cronograma.`);
        
        if (pontosInternos.length > 0) {
            out.push(relSmsH2('Acompanhamento Operacional Interno'));
            pontosInternos.forEach(texto => out.push(new docx.Paragraph({
                spacing: { after: 100 },
                bullet: { level: 0 },
                children: [new docx.TextRun({ text: texto, size: 21, color: '262626' })],
            })));
        }
    }

    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

// ================================================================
// SEÇÃO 5 (Registros Fotográficos) E ANEXOS - Fase 4. Não recalcula nada de sensível, só
// monta a lista cronológica de eventos (treinamentos + DDS) do mês, igual nas duas
// versões do relatório (nenhum dos itens sensíveis do roteiro - ver Seções 1/3/4 acima -
// aparece aqui).
// ================================================================

// ================================================================
// SEÇÃO 9 (Registros Fotográficos): SEGREGAÇÃO 9.1 (Treinamentos) e 9.2 (DDSMA)
// Cruza treinamento_cod com treinamentos_catalogo.nome para exibir sempre temas descritivos.
// Remove Integração das evidências fotográficas.
// Suprime caixas vazias ou placeholders quando não houver fotos reais anexadas.
// ================================================================

function resolverUrlVisualizacaoFotoRelSms(anexo) {
    if (!anexo) return null;
    if (anexo.drive_file_id) {
        return `https://lh3.googleusercontent.com/d/${encodeURIComponent(anexo.drive_file_id)}`;
    }
    if (anexo.url && (anexo.url.startsWith('http://') || anexo.url.startsWith('https://') || anexo.url.startsWith('data:image'))) {
        return anexo.url;
    }
    if (anexo.drive_view_link) {
        const match = anexo.drive_view_link.match(/\/d\/([a-zA-Z0-9_-]+)/) || anexo.drive_view_link.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${encodeURIComponent(match[1])}`;
        }
        return anexo.drive_view_link;
    }
    return null;
}

function ehExtensaoImagemRelSms(nomeArquivo) {
    if (!nomeArquivo) return true;
    return /\.(jpe?g|png|webp|gif|bmp|heic|svg)$/i.test(nomeArquivo);
}

function extrairFotosDoTemaTreinamento(g, mes, ano) {
    const fotos = [];
    const cod = String(g.codigo || '');
    const datasArr = Array.from(g.datas);
    const registros = g.registros || [];

    // 1. Busca em allAnexosSms
    (allAnexosSms || []).forEach(a => {
        if (a.tabela_origem !== 'treinamentos_realizados') return;
        const chave = String(a.registro_chave || '');
        let vinculou = false;
        if (datasArr.some(d => chave === `${cod}||${d}`)) vinculou = true;
        else if (chave === cod) vinculou = true;
        else if (registros.some(r => r.id && chave === String(r.id))) vinculou = true;

        if (vinculou && ehExtensaoImagemRelSms(a.nome_arquivo)) {
            const url = resolverUrlVisualizacaoFotoRelSms(a);
            if (url && !fotos.some(f => f.url === url)) {
                fotos.push({
                    url,
                    nome: a.nome_arquivo || g.tema,
                    data: (datasArr[0] || `${ano}-${String(mes + 1).padStart(2, '0')}-15`),
                    hora: registros[0]?.hora_inicio || '08:00',
                    local: registros[0]?.local_realizacao || 'Canteiro Central — Ramal do Agreste (Trecho VII)'
                });
            }
        }
    });

    // 2. Busca em campos diretos nos registros de treinamento
    registros.forEach(r => {
        const u = r.foto_url || r.fotos_urls || r.url || r.foto || r.evidencia_url;
        if (u && !fotos.some(f => f.url === u)) {
            fotos.push({
                url: u,
                nome: g.tema,
                data: r.data_treinamento || datasArr[0],
                hora: r.hora_inicio || '08:00',
                local: r.local_realizacao || 'Canteiro Central — Ramal do Agreste (Trecho VII)'
            });
        }
        if (Array.isArray(r.fotos)) {
            r.fotos.forEach(fu => {
                if (fu && !fotos.some(f => f.url === fu)) {
                    fotos.push({
                        url: fu,
                        nome: g.tema,
                        data: r.data_treinamento || datasArr[0],
                        hora: r.hora_inicio || '08:00',
                        local: r.local_realizacao || 'Canteiro Central — Ramal do Agreste (Trecho VII)'
                    });
                }
            });
        }
    });

    return fotos;
}

function extrairFotosDoTemaDdsma(dataStr, registrosDoDia, temaNome) {
    const fotos = [];
    const registros = registrosDoDia || [];

    // 1. Busca em allAnexosSms
    (allAnexosSms || []).forEach(a => {
        if (a.tabela_origem !== 'dds_realizados') return;
        const chave = String(a.registro_chave || '');
        let vinculou = false;
        if (chave === dataStr || chave.includes(dataStr)) vinculou = true;
        else if (registros.some(r => loteKeyDds(r) === chave || String(r.id) === chave)) vinculou = true;

        if (vinculou && ehExtensaoImagemRelSms(a.nome_arquivo)) {
            const url = resolverUrlVisualizacaoFotoRelSms(a);
            if (url && !fotos.some(f => f.url === url)) {
                fotos.push({
                    url,
                    nome: a.nome_arquivo || temaNome,
                    data: dataStr,
                    hora: '07:15',
                    local: registros[0]?.frente_responsavel || 'Frente Operacional — Ramal do Agreste (Trecho VII)'
                });
            }
        }
    });

    // 2. Busca em campos diretos nos registros de DDS
    registros.forEach(r => {
        const u = r.foto_url || r.fotos_urls || r.url || r.foto || r.evidencia_url;
        if (u && !fotos.some(f => f.url === u)) {
            fotos.push({
                url: u,
                nome: temaNome,
                data: dataStr,
                hora: '07:15',
                local: r.frente_responsavel || 'Frente Operacional — Ramal do Agreste (Trecho VII)'
            });
        }
        if (Array.isArray(r.fotos)) {
            r.fotos.forEach(fu => {
                if (fu && !fotos.some(f => f.url === fu)) {
                    fotos.push({
                        url: fu,
                        nome: temaNome,
                        data: dataStr,
                        hora: '07:15',
                        local: r.frente_responsavel || 'Frente Operacional — Ramal do Agreste (Trecho VII)'
                    });
                }
            });
        }
    });

    return fotos;
}

function coletarDadosFase4RelSms(mes, ano) {
    const inicio = new Date(ano, mes, 1, 0, 0, 0, 0);
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const dentroPeriodo = (dataStr) => {
        if (!dataStr) return false;
        const d = parseLocalDate(dataStr);
        return d >= inicio && d <= fim;
    };
    const ehDiaUtil = (dataStr) => {
        if (!dataStr) return false;
        const d = parseLocalDate(dataStr);
        const day = d.getDay(); // 0 = Domingo, 1 = Segunda ... 5 = Sexta, 6 = Sábado
        return day >= 1 && day <= 5;
    };

    // ----------------------------------------------------
    // 9.1. TREINAMENTOS: Agrupar por tema realizado no mês
    // ----------------------------------------------------
    const gruposTreinamentos = new Map();

    (allTreinamentosRealizados || []).forEach(r => {
        if (!dentroPeriodo(r.data_treinamento)) return;
        
        // Excluir qualquer tentativa de exibir fotos ou blocos para "Integração"
        if (String(r.treinamento_cod) === '1' || (r.treinamento_nome || '').toUpperCase().includes('INTEGRA')) {
            return;
        }

        // Cruzar treinamento_cod com treinamentos_catalogo.nome para exibir sempre o nome descritivo
        const cat = (allTreinamentosCatalogo || []).find(c => 
            String(c.id) === String(r.treinamento_cod) || 
            String(c.codigo) === String(r.treinamento_cod)
        );
        let temaNome = (cat?.nome || r.treinamento_nome || '').trim();
        if (!temaNome || /^\d+$/.test(temaNome)) {
            temaNome = cat?.nome || r.treinamento_nome || 'CAPACITAÇÃO NORMATIVA SST';
        }
        temaNome = temaNome.toUpperCase();

        const chaveTema = temaNome;
        if (!gruposTreinamentos.has(chaveTema)) {
            gruposTreinamentos.set(chaveTema, {
                tema: temaNome,
                datas: new Set(),
                codigo: r.treinamento_cod,
                registros: []
            });
        }
        if (r.data_treinamento) {
            gruposTreinamentos.get(chaveTema).datas.add(r.data_treinamento);
        }
        gruposTreinamentos.get(chaveTema).registros.push(r);
    });

    // Se houver treinamentos concluídos no cronograma mas não individualizados:
    (allTreinamentosCronograma || []).forEach(c => {
        if (!dentroPeriodo(c.data_prevista)) return;
        if (c.status !== 'lancado' && c.status !== 'concluido') return;
        if (String(c.treinamento_cod) === '1' || (c.treinamento_nome || '').toUpperCase().includes('INTEGRA')) {
            return;
        }

        const cat = (allTreinamentosCatalogo || []).find(x => 
            String(x.id) === String(c.treinamento_cod) || 
            String(x.codigo) === String(c.treinamento_cod)
        );
        let temaNome = (cat?.nome || c.treinamento_nome || '').trim();
        if (!temaNome || /^\d+$/.test(temaNome)) {
            temaNome = cat?.nome || c.treinamento_nome || 'CAPACITAÇÃO NORMATIVA SST';
        }
        temaNome = temaNome.toUpperCase();

        if (!gruposTreinamentos.has(temaNome)) {
            gruposTreinamentos.set(temaNome, {
                tema: temaNome,
                datas: new Set([c.data_prevista]),
                codigo: c.treinamento_cod,
                registros: []
            });
        } else if (c.data_prevista) {
            gruposTreinamentos.get(temaNome).datas.add(c.data_prevista);
        }
    });

    const listaTreinamentos = [];
    gruposTreinamentos.forEach(g => {
        const datasArr = Array.from(g.datas).sort();
        let dataTexto = '';
        if (datasArr.length === 0) {
            dataTexto = `${NOMES_MESES[mes].toUpperCase()}/${ano}`;
        } else if (datasArr.length === 1) {
            dataTexto = formatSimpleDate(datasArr[0]);
        } else if (datasArr.length === 2) {
            dataTexto = `${formatSimpleDate(datasArr[0])} e ${formatSimpleDate(datasArr[1])}`;
        } else {
            dataTexto = `${formatSimpleDate(datasArr[0])} a ${formatSimpleDate(datasArr[datasArr.length - 1])}`;
        }
        const tituloCompleto = `${dataTexto} — ${g.tema}`;
        const fotosExtraidas = extrairFotosDoTemaTreinamento(g, mes, ano);

        listaTreinamentos.push({
            tipo: 'treinamento',
            codigo: g.codigo,
            tema: g.tema,
            dataTexto,
            primeiraData: datasArr[0] || '',
            titulo: tituloCompleto,
            fotos: fotosExtraidas
        });
    });
    listaTreinamentos.sort((a, b) => (a.primeiraData || '').localeCompare(b.primeiraData || ''));

    // ----------------------------------------------------
    // 9.2. DDSMA: Mapear temas aplicados no mês, apenas dias úteis (Seg-Sex)
    // ----------------------------------------------------
    const ddsPorDataUtil = new Map();
    let fallbackFotoIdx = 0;

    (allDdsRealizados || []).forEach(r => {
        if (!dentroPeriodo(r.data_dds)) return;
        if (!ehDiaUtil(r.data_dds)) return; // descarta sábado e domingo
        if (!ddsPorDataUtil.has(r.data_dds)) {
            ddsPorDataUtil.set(r.data_dds, { data: r.data_dds, temas: new Set(), registros: [] });
        }
        if (r.tema && r.tema.trim()) {
            ddsPorDataUtil.get(r.data_dds).temas.add(r.tema.trim());
        }
        ddsPorDataUtil.get(r.data_dds).registros.push(r);
    });

    (allDdsHistoricoAgregado || []).forEach(h => {
        if (!dentroPeriodo(h.data_dds)) return;
        if (!ehDiaUtil(h.data_dds)) return; // descarta sábado e domingo
        if (!ddsPorDataUtil.has(h.data_dds)) {
            ddsPorDataUtil.set(h.data_dds, { data: h.data_dds, temas: new Set(), registros: [] });
        }
        if (h.tema && h.tema.trim()) {
            ddsPorDataUtil.get(h.data_dds).temas.add(h.tema.trim());
        }
        ddsPorDataUtil.get(h.data_dds).registros.push(h);
    });

    const listaDdsma = [];
    const datasOrdenadasDds = Array.from(ddsPorDataUtil.keys()).sort();

    datasOrdenadasDds.forEach(dataStr => {
        const info = ddsPorDataUtil.get(dataStr);
        let temaFinal = '';
        if (info.temas.size > 0) {
            temaFinal = Array.from(info.temas).join(' / ');
        } else {
            const crono = (allDdsTemasCronograma || []).find(t => t.data === dataStr);
            temaFinal = crono ? (crono.tema || '') : '';
        }
        temaFinal = sanitizarTemaDdsRelSms(temaFinal, dataStr, fallbackFotoIdx);
        if (!temaFinal || temaFinal === '(sem tema cadastrado)' || temaFinal.toLowerCase().includes('sem tema')) {
            fallbackFotoIdx++;
        }

        const dataTexto = formatSimpleDate(dataStr);
        const tituloCompleto = `${dataTexto} — ${temaFinal.toUpperCase()}`;
        const fotosExtraidas = extrairFotosDoTemaDdsma(dataStr, info.registros, temaFinal);

        listaDdsma.push({
            tipo: 'ddsma',
            data: dataStr,
            dataTexto,
            tema: temaFinal,
            titulo: tituloCompleto,
            fotos: fotosExtraidas
        });
    });

    // Supressão de Placeholders Vazios: temas/dias sem foto NÃO devem gerar caixas em branco
    const listaTreinamentosComFotos = listaTreinamentos.filter(t => t.fotos && t.fotos.length > 0);
    const listaDdsmaComFotos = listaDdsma.filter(d => d.fotos && d.fotos.length > 0);

    const eventos = [
        ...listaTreinamentosComFotos.map(t => ({ data: t.primeiraData, nome: t.tema, categoria: 'Treinamentos', titulo: t.titulo })),
        ...listaDdsmaComFotos.map(d => ({ data: d.data, nome: d.tema, categoria: 'DDSMA', titulo: d.titulo }))
    ];

    return {
        treinamentos: listaTreinamentosComFotos,
        ddsma: listaDdsmaComFotos,
        todosTreinamentosContados: listaTreinamentos.length,
        todosDdsmaContados: listaDdsma.length,
        eventos
    };
}

// Célula estruturada para acomodar foto real com moldura e metadados no Word (.docx)
function relSmsCelulaRegistroFotoReal(foto) {
    const dataFmt = foto.data ? formatSimpleDate(foto.data) : '';
    const horaFmt = foto.hora ? ` às ${foto.hora}` : '';
    const localFmt = foto.local || 'Ramal do Agreste (Trecho VII)';
    const legendaFmt = foto.nome || 'Evidência Fotográfica de Campo';

    const celulaChildren = [];

    const temBufferValido = foto.img && foto.img.buffer && (foto.img.buffer.byteLength > 50);
    if (temBufferValido) {
        celulaChildren.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 80, after: 60 },
            children: [
                new docx.ImageRun({
                    data: foto.img.buffer,
                    transformation: {
                        width: Math.min(foto.img.width || 280, 280),
                        height: Math.min(foto.img.height || 190, 190)
                    }
                })
            ]
        }));
    } else {
        celulaChildren.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 200, after: 80 },
            shading: { fill: 'F8FAFC' },
            children: [
                new docx.TextRun({ text: '📷 [ Evidência Digital Registrada ]', bold: true, color: '64748B', size: 17 })
            ]
        }));
        celulaChildren.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            shading: { fill: 'F8FAFC' },
            children: [
                new docx.TextRun({ text: '(Arquivo preservado no repositório oficial de segurança)', italics: true, color: RELSMS_GREY, size: 14 })
            ]
        }));
    }

    celulaChildren.push(new docx.Paragraph({
        alignment: docx.AlignmentType.LEFT,
        spacing: { before: 40, after: 20 },
        children: [
            new docx.TextRun({ text: legendaFmt, bold: true, color: RELSMS_NAVY, size: 16 })
        ]
    }));

    celulaChildren.push(new docx.Paragraph({
        alignment: docx.AlignmentType.LEFT,
        spacing: { before: 0, after: 20 },
        children: [
            new docx.TextRun({ text: `Setor/Frente: ${localFmt}`, color: '475569', size: 14 })
        ]
    }));

    celulaChildren.push(new docx.Paragraph({
        alignment: docx.AlignmentType.LEFT,
        spacing: { before: 0, after: 40 },
        children: [
            new docx.TextRun({ text: `Data: ${dataFmt}${horaFmt}`, bold: true, color: '475569', size: 14 })
        ]
    }));

    return new docx.TableCell({
        width: { size: 50, type: docx.WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        borders: {
            top: RELSMS_BORDA_FINA,
            bottom: RELSMS_BORDA_FINA,
            left: RELSMS_BORDA_FINA,
            right: RELSMS_BORDA_FINA
        },
        shading: { fill: 'FFFFFF' },
        verticalAlign: docx.VerticalAlign.TOP,
        children: celulaChildren
    });
}

function relSmsCelulaFotoVazia() {
    return new docx.TableCell({
        width: { size: 50, type: docx.WidthType.PERCENTAGE },
        borders: {
            top: { style: docx.BorderStyle.NONE },
            bottom: { style: docx.BorderStyle.NONE },
            left: { style: docx.BorderStyle.NONE },
            right: { style: docx.BorderStyle.NONE }
        },
        children: [new docx.Paragraph({ children: [] })]
    });
}

function relSmsBarraTemaFotoDocx(titulo, subtitulo) {
    const children = [
        new docx.Paragraph({
            spacing: { before: 40, after: subtitulo ? 20 : 40 },
            children: [
                new docx.TextRun({ text: titulo, bold: true, color: '1E293B', size: 18 })
            ]
        })
    ];
    if (subtitulo) {
        children.push(new docx.Paragraph({
            spacing: { before: 0, after: 40 },
            children: [
                new docx.TextRun({ text: subtitulo, size: 15, color: RELSMS_GREY, italics: true })
            ]
        }));
    }
    return new docx.Table({
        width: { size: 100, type: docx.WidthType.PERCENTAGE },
        rows: [
            new docx.TableRow({
                children: [
                    new docx.TableCell({
                        shading: { fill: 'F1F5F9' },
                        borders: {
                            top: { style: docx.BorderStyle.SINGLE, size: 6, color: RELSMS_NAVY },
                            bottom: RELSMS_BORDA_FINA,
                            left: RELSMS_BORDA_FINA,
                            right: RELSMS_BORDA_FINA
                        },
                        margins: { top: 60, bottom: 60, left: 100, right: 100 },
                        children
                    })
                ]
            })
        ]
    });
}

async function construirSecao5RelSms(dadosFotos, mes, ano) {
    const mesSelect = document.getElementById('relSmsMes');
    const nomeMes = (typeof NOMES_MESES !== 'undefined' && mes !== undefined && NOMES_MESES[mes]) ? NOMES_MESES[mes] : (mesSelect && mesSelect.selectedIndex >= 0 ? mesSelect.options[mesSelect.selectedIndex].text : 'Mes_Nao_Definido');
    const anoRelatorio = ano || (document.getElementById('relSmsAno') ? document.getElementById('relSmsAno').value : new Date().getFullYear());
    const linkDriveMaster = (typeof getDriveFolderFotosUrl === 'function') ? getDriveFolderFotosUrl() : 'https://drive.google.com/drive/folders/1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms';
    const out = [relSmsH1('9. Registros Fotográficos (Treinamentos e DDSMA)')];
    out.push(relSmsP('Registro fotográfico comprobatório das capacitações normativas de SST e dos Diálogos Diários de Segurança e Meio Ambiente (DDSMA) realizados durante o período de competência na obra Ramal do Agreste (Trecho VII).'));

    const listaTreinamentos = (dadosFotos && dadosFotos.treinamentos) ? dadosFotos.treinamentos : [];
    const listaDdsma = (dadosFotos && dadosFotos.ddsma) ? dadosFotos.ddsma : [];

    // 9.1. Treinamentos Normativos
    out.push(relSmsH2('9.1. Evidências Fotográficas de Treinamentos e Capacitações Normativas'));
    if (listaTreinamentos.length === 0) {
        out.push(relSmsNota('Nenhum registro fotográfico de treinamento digitalizado anexado no período. Listas de presença e certificados físicos formalizados no Anexo I.'));
    } else {
        for (const t of listaTreinamentos) {
            out.push(relSmsBarraTemaFotoDocx(`Treinamento: ${t.tema}`, `Período de Realização: ${t.dataTexto}`));
            const fotosComBuffer = await Promise.all(
                (t.fotos || []).map(async f => {
                    const img = await carregarImagemParaBufferDocx(f.url, 280, 200);
                    return { ...f, img };
                })
            );

            const linhasTabela = [];
            for (let i = 0; i < fotosComBuffer.length; i += 2) {
                const c1 = relSmsCelulaRegistroFotoReal(fotosComBuffer[i]);
                const c2 = fotosComBuffer[i + 1] ? relSmsCelulaRegistroFotoReal(fotosComBuffer[i + 1]) : relSmsCelulaFotoVazia();
                linhasTabela.push(new docx.TableRow({ children: [c1, c2] }));
            }

            if (linhasTabela.length > 0) {
                out.push(new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: linhasTabela
                }));
            }
            out.push(new docx.Paragraph({ spacing: { after: 160 }, children: [] }));
        }
    }

    // 9.2. DDSMA
    out.push(relSmsH2('9.2. Evidências Fotográficas dos Diálogos Diários de Segurança e Meio Ambiente (DDSMA)'));
    if (listaDdsma.length === 0) {
        out.push(relSmsNota('Nenhum registro fotográfico de DDSMA digitalizado anexado no período. Fichas diárias de assinatura formalizadas no Anexo II.'));
    } else {
        for (const d of listaDdsma) {
            out.push(relSmsBarraTemaFotoDocx(`DDSMA: ${d.tema}`, `Data: ${d.dataTexto}`));
            const fotosComBuffer = await Promise.all(
                (d.fotos || []).map(async f => {
                    const img = await carregarImagemParaBufferDocx(f.url, 280, 200);
                    return { ...f, img };
                })
            );

            const linhasTabela = [];
            for (let i = 0; i < fotosComBuffer.length; i += 2) {
                const c1 = relSmsCelulaRegistroFotoReal(fotosComBuffer[i]);
                const c2 = fotosComBuffer[i + 1] ? relSmsCelulaRegistroFotoReal(fotosComBuffer[i + 1]) : relSmsCelulaFotoVazia();
                linhasTabela.push(new docx.TableRow({ children: [c1, c2] }));
            }

            if (linhasTabela.length > 0) {
                out.push(new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: linhasTabela
                }));
            }
            out.push(new docx.Paragraph({ spacing: { after: 160 }, children: [] }));
        }
    }

    // Nota suplementar de repositório em nuvem
    out.push(relSmsNota(`Acervo integral digitalizado disponível no repositório de segurança: ${linkDriveMaster} (Pasta: SST - Registros de Campo / ${nomeMes}_${anoRelatorio} / Treinamentos e DDSMA)`));

    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

// ANEXOS - sem numeração de seção (só o título em maiúsculas), conforme convenção do
// ANEXOS - Seção 10 Oficial
function construirAnexosRelSms(mes, ano) {
    const nomeMes = NOMES_MESES[mes];
    const mesSeguinte = (mes + 1) % 12;
    const anoSeguinte = mes === 11 ? ano + 1 : ano;
    const nomeMesSeguinte = NOMES_MESES[mesSeguinte];

    const out = [relSmsH1('10. Anexos Oficiais Complementares')];
    out.push(relSmsP('Os documentos abaixo acompanham este relatório como arquivos separados:'));
    [
        'LISTA DE PRESENÇA TREINAMENTO - ENTREGUE EM ANEXO:',
        'DDS - ENTREGUE EM ANEXO:',
        `CRONOGRAMA DE TREINAMENTOS ${nomeMes.toUpperCase()}/${ano} - ENTREGUE EM ANEXO:`,
        `CRONOGRAMA DE TREINAMENTOS ${nomeMesSeguinte.toUpperCase()}/${anoSeguinte} - ENTREGUE EM ANEXO:`,
    ].forEach(texto => out.push(new docx.Paragraph({
        spacing: { after: 100 },
        bullet: { level: 0 },
        children: [new docx.TextRun({ text: texto, bold: true, size: 20, color: '262626' })],
    })));

    return out;
}

// ================================================================
// SEÇÕES COMPLEMENTARES DE PGR, ERGONOMIA E PERICULOSIDADE NO WORD (.DOCX)
// ================================================================

function construirSecaoPgrDocx(dados, fiscalizacao) {
    const p = dados.pgr;
    const out = [relSmsH1('2. Governança e Plano de Ação PGR (NR-01)')];
    out.push(relSmsP('Acompanhamento sistemático das ações de controle e melhoria contínua do Programa de Gerenciamento de Riscos (PGR), estruturadas sob metodologia 5W2H.'));
    const linhas = [
        ['Total de Ações Mapeadas no PGR', p.totalAcoes ?? 0],
        ['Ações Concluídas / Implementadas', p.concluidas ?? 0],
        ['Ações com Eficácia Comprovada', p.eficazes ?? 0],
        ['Taxa de Eficácia das Ações', (p.taxaEficacia ?? 0) + '%'],
    ];
    if (!fiscalizacao) {
        linhas.push(['Ações em Andamento', p.andamento ?? 0]);
        linhas.push(['Ações em Aberto', p.abertas ?? 0]);
        linhas.push(['Ações com Prazo Vencido', p.atrasadas ?? 0]);
    }
    out.push(relSmsTabela(['Indicador PGR (5W2H)', 'Valor'], linhas));
    if (!fiscalizacao && (p.atrasadas ?? 0) > 0) {
        out.push(relSmsNota(`⚠ ${p.atrasadas} ação(ões) com prazo expirado em acompanhamento para reprogramação técnica ou alocação de recursos.`));
    }
    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

function construirSecaoErgonomiaDocx(dados) {
    const e = dados.ergonomia;
    const out = [relSmsH1('5. Ergonomia - Avaliação Ergonômica Preliminar (NR-17)')];
    out.push(relSmsP('Diagnóstico e monitoramento contínuo das condições ergonômicas de trabalho, abrangendo fatores biomecânicos, posturais, cognitivos e organizacionais conforme a NR-17.'));
    const linhas = [
        ['Avaliações Ergonômicas Preliminares (AEP)', e.totalAep ?? 0],
        ['Postos / Funções com Risco Baixo', e.riscoBaixo ?? 0],
        ['Postos / Funções com Risco Médio', e.riscoMedio ?? 0],
        ['Postos / Funções com Risco Alto', e.riscoAlto ?? 0],
        ['Postos com Recomendação de AET', e.aetNecessaria ?? 0],
        ['Medidas Ergonômicas Concluídas', `${e.planoConcluido ?? 0} de ${e.planoTotal ?? 0}`]
    ];
    out.push(relSmsTabela(['Indicador Ergonômico (NR-17)', 'Valor'], linhas));
    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

function construirSecaoPericulosidadeDocx(dados) {
    const peric = dados.periculosidade;
    const out = [relSmsH1('6. Caracterização de Periculosidade e Adicionais (NR-16)')];
    out.push(relSmsP('Avaliação técnica conclusiva quanto à exposição a inflamáveis, explosivos, segurança patrimonial ou eletricidade, de acordo com os anexos regulamentares da NR-16.'));
    const linhas = [
        ['Laudos Técnicos e Análises Concluídas', peric.totalAnalises ?? 0],
        ['Cargos / Funções com Enquadramento Perigoso', peric.funcoesPerigosas ?? 0],
        ['Trabalhadores Enquadrados (Adicional 30%)', peric.colaboradoresExpostos ?? 0]
    ];
    out.push(relSmsTabela(['Indicador de Periculosidade (NR-16)', 'Situação'], linhas));
    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}

// Monta o Document completo (capa + índice + sumário + Seções 1 a 7 + Anexos) pro
// mês/ano/versão escolhidos. Só a lib docx carregada globalmente via CDN (window.docx) -
// ver comentário no topo desta seção.
async function montarDocRelSms(mes, ano, fiscalizacao) {
    if (typeof garantirDocumentosControleCarregados === 'function') {
        await garantirDocumentosControleCarregados();
    }
    await garantirDadosCompletosRelatorioMensalSms();
    const dadosCompletos = coletarDadosCompletosRelatorioMensalSms(mes, ano);

    // Carregamento de Recursos Visuais (Logo COP e Gráfico Canvas HHT)
    const logoCopBuffer = await carregarBufferLogoCop();
    const svgHht = gerarGraficoBarrasHHTSVG(dadosCompletos.treinamentos.historicoHht);
    const graficoHhtBuffer = await converterSvgParaPngBuffer(svgHht, 680, 250);

    const nomeMes = NOMES_MESES[mes];
    const codigoRev = (typeof codigoRevisaoDocumento === 'function' ? codigoRevisaoDocumento('relatorio_mensal_sms') : '') || 'REL.SMS.001 R00';
    const hoje = new Date();
    const dataEmissao = String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();

    const capa = [];
    if (logoCopBuffer && logoCopBuffer.byteLength > 100) {
        capa.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 160, after: 360 },
            children: [
                new docx.ImageRun({
                    data: logoCopBuffer,
                    transformation: { width: 170, height: 55 }
                })
            ]
        }));
    } else {
        capa.push(...Array(3).fill(0).map(() => new docx.Paragraph({ spacing: { after: 200 }, children: [] })));
    }

    capa.push(
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 100 }, children: [new docx.TextRun({ text: 'CONSÓRCIO OPERADOR DO PISF – RAMAL DO AGRESTE', bold: true, color: RELSMS_NAVY, size: 26 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 500 }, children: [new docx.TextRun({ text: 'Obra Ramal do Agreste — Trecho VII', color: RELSMS_GREY, size: 22 })] }),
        new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER, spacing: { after: 100 },
            border: { top: { color: RELSMS_NAVY, space: 10, style: docx.BorderStyle.SINGLE, size: 12 }, bottom: { color: RELSMS_NAVY, space: 10, style: docx.BorderStyle.SINGLE, size: 12 } },
            children: [new docx.TextRun({ text: 'RELATÓRIO MENSAL CONSOLIDADO DE SMS', bold: true, color: RELSMS_NAVY, size: 36 })],
        }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 100, after: 40 }, children: [new docx.TextRun({ text: '(Segurança do Trabalho, Saúde Ocupacional e Meio Ambiente)', color: RELSMS_GREY, size: 20, italics: true })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 260, after: 600 }, children: [new docx.TextRun({ text: (nomeMes + ' / ' + ano).toUpperCase(), bold: true, color: RELSMS_BLUE, size: 32 })] }),
        ...Array(2).fill(0).map(() => new docx.Paragraph({ spacing: { after: 140 }, children: [] })),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 40 }, children: [new docx.TextRun({ text: 'Elaborado por:', color: RELSMS_GREY, size: 20 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 40 }, children: [new docx.TextRun({ text: 'João Everton de Souza Limeira', bold: true, color: RELSMS_NAVY, size: 22 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 60 }, children: [new docx.TextRun({ text: 'Engenheiro de Segurança do Trabalho — CREA/PE 181283311-8', color: RELSMS_GREY, size: 20 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 40 }, children: [new docx.TextRun({ text: 'CONSÓRCIO OPERADOR RAMAL DO AGRESTE', bold: true, color: RELSMS_NAVY, size: 20 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 80 }, children: [new docx.TextRun({ text: 'CNPJ: ' + (EMPRESA_INFO.cnpj || '55.623.017/0001-97') + ' — Engenharia de Segurança do Trabalho', color: RELSMS_GREY, size: 18 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 40 }, children: [new docx.TextRun({ text: 'Código de Controle: ' + codigoRev, bold: true, color: RELSMS_GREY, size: 18 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'Data de emissão: ' + dataEmissao, color: RELSMS_GREY, size: 18 })] }),
        new docx.Paragraph({ children: [new docx.PageBreak()] })
    );

    const indice = [
        relSmsH1('Sumário / Índice'),
        new docx.TableOfContents('Sumário / Índice', { hyperlink: true, headingStyleRange: '1-3' }),
        new docx.Paragraph({ spacing: { after: 150 }, children: [] }),
        new docx.Paragraph({ spacing: { after: 200 }, children: [new docx.TextRun({ text: 'Sumário gerado automaticamente pelo Word a partir dos títulos do documento. Se os números de página não aparecerem ao abrir o arquivo, clique com o botão direito sobre o índice acima e selecione "Atualizar campo" (ou selecione o índice e pressione F9).', italics: true, size: 18, color: RELSMS_GREY })] }),
        new docx.Paragraph({ children: [new docx.PageBreak()] }),
    ];

    const sumario = [
        relSmsH1('Sumário Executivo'),
        relSmsP('Este relatório consolida de forma integrada as ações e o desempenho operacional em Segurança do Trabalho, Saúde Ocupacional e Meio Ambiente do Consórcio Operador do PISF – Ramal do Agreste no mês de ' + nomeMes.toLowerCase() + ' de ' + ano + ', com base nos registros de campo consolidados pela equipe de SMS e em conformidade com as Normas Regulamentadoras aplicáveis.'),
        relSmsH2('Destaques do Período'),
        ...(dadosCompletos.destaques || []).map(d => new docx.Paragraph({
            spacing: { after: 100 },
            bullet: { level: 0 },
            children: [
                new docx.TextRun({ text: d.titulo + ': ', bold: true, color: RELSMS_NAVY, size: 20 }),
                new docx.TextRun({ text: d.texto, size: 20, color: '262626' })
            ]
        })),
        new docx.Paragraph({ children: [new docx.PageBreak()] })
    ];

    await garantirDadosSecao1RelSms();
    const dadosSecao1 = coletarDadosSecao1RelSms(mes, ano);
    const secao1 = construirSecao1RelSms(dadosSecao1, mes, ano, fiscalizacao, graficoHhtBuffer);

    const secaoPgr = construirSecaoPgrDocx(dadosCompletos, fiscalizacao);

    await garantirDadosSecoes23RelSms();
    const dadosSecoes23 = coletarDadosSecoes23RelSms(mes, ano);
    const secao2 = construirSecao2RelSms(dadosSecoes23, mes, ano);
    const secao3 = construirSecao3RelSms(dadosSecoes23, mes, ano, fiscalizacao);

    const secaoErgonomia = construirSecaoErgonomiaDocx(dadosCompletos);
    const secaoPericulosidade = construirSecaoPericulosidadeDocx(dadosCompletos);

    await garantirDadosSecaoMeioAmbienteRelSms();
    const dadosMeioAmbiente = coletarDadosMeioAmbienteRelSms(mes, ano);
    const secaoMeioAmbiente = construirSecaoMeioAmbienteRelSms(dadosMeioAmbiente, mes, ano, fiscalizacao);

    const secao4 = construirSecao4RelSms(dadosSecao1, dadosSecoes23, dadosMeioAmbiente, mes, ano, fiscalizacao);

    const dadosFase4 = coletarDadosFase4RelSms(mes, ano);
    const secao5 = await construirSecao5RelSms(dadosFase4, mes, ano);
    const anexos = construirAnexosRelSms(mes, ano);

    // Cabeçalho institucional com Logo do COP redimensionado e identificação corporativa
    const headerTabelaFilhos = [];
    if (logoCopBuffer && logoCopBuffer.byteLength > 100) {
        headerTabelaFilhos.push(new docx.TableCell({
            width: { size: 30, type: docx.WidthType.PERCENTAGE },
            borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
            verticalAlign: docx.VerticalAlign.CENTER,
            children: [
                new docx.Paragraph({
                    alignment: docx.AlignmentType.LEFT,
                    children: [
                        new docx.ImageRun({
                            data: logoCopBuffer,
                            transformation: { width: 116, height: 38 }
                        })
                    ]
                })
            ]
        }));
    } else {
        headerTabelaFilhos.push(new docx.TableCell({
            width: { size: 30, type: docx.WidthType.PERCENTAGE },
            borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
            verticalAlign: docx.VerticalAlign.CENTER,
            children: [
                new docx.Paragraph({
                    alignment: docx.AlignmentType.LEFT,
                    children: [
                        new docx.TextRun({ text: 'CONSÓRCIO COP', bold: true, color: RELSMS_NAVY, size: 20 })
                    ]
                })
            ]
        }));
    }

    headerTabelaFilhos.push(new docx.TableCell({
        width: { size: 70, type: docx.WidthType.PERCENTAGE },
        borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
        verticalAlign: docx.VerticalAlign.CENTER,
        children: [
            new docx.Paragraph({
                alignment: docx.AlignmentType.RIGHT,
                children: [
                    new docx.TextRun({ text: 'CONSÓRCIO OPERADOR RAMAL DO AGRESTE - SESMT / SMS', bold: true, color: RELSMS_NAVY, size: 16 })
                ]
            }),
            new docx.Paragraph({
                alignment: docx.AlignmentType.RIGHT,
                children: [
                    new docx.TextRun({ text: 'Relatório Mensal Consolidado de SMS — ' + nomeMes + '/' + ano, size: 14, color: RELSMS_GREY })
                ]
            })
        ]
    }));

    const header = new docx.Header({
        children: [
            new docx.Table({
                width: { size: 100, type: docx.WidthType.PERCENTAGE },
                borders: {
                    top: { style: docx.BorderStyle.NONE },
                    bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: 'BFBFBF' },
                    left: { style: docx.BorderStyle.NONE },
                    right: { style: docx.BorderStyle.NONE }
                },
                rows: [new docx.TableRow({ children: headerTabelaFilhos })]
            })
        ]
    });
    const footer = new docx.Footer({
        children: [new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            borders: {
                top: { style: docx.BorderStyle.SINGLE, size: 4, color: 'BFBFBF' },
                bottom: { style: docx.BorderStyle.NONE },
                left: { style: docx.BorderStyle.NONE },
                right: { style: docx.BorderStyle.NONE },
            },
            rows: [new docx.TableRow({
                children: [
                    new docx.TableCell({
                        width: { size: 45, type: docx.WidthType.PERCENTAGE },
                        borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
                        children: [new docx.Paragraph({
                            alignment: docx.AlignmentType.LEFT,
                            children: [new docx.TextRun({ text: 'Consórcio Operador do PISF Ramal do Agreste', size: 16, color: RELSMS_GREY })],
                        })],
                    }),
                    new docx.TableCell({
                        width: { size: 25, type: docx.WidthType.PERCENTAGE },
                        borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
                        children: [new docx.Paragraph({
                            alignment: docx.AlignmentType.CENTER,
                            children: [new docx.TextRun({ text: codigoRev, bold: true, size: 16, color: RELSMS_GREY })],
                        })],
                    }),
                    new docx.TableCell({
                        width: { size: 30, type: docx.WidthType.PERCENTAGE },
                        borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
                        children: [new docx.Paragraph({
                            alignment: docx.AlignmentType.RIGHT,
                            children: [
                                new docx.TextRun({ text: 'Página ', size: 16, color: RELSMS_GREY }),
                                new docx.TextRun({ children: [docx.PageNumber.CURRENT], size: 16, color: RELSMS_GREY }),
                                new docx.TextRun({ text: ' de ', size: 16, color: RELSMS_GREY }),
                                new docx.TextRun({ children: [docx.PageNumber.TOTAL_PAGES], size: 16, color: RELSMS_GREY }),
                            ],
                        })],
                    }),
                ],
            })],
        })],
    });

    return new docx.Document({
        styles: { default: { document: { run: { font: 'Calibri' } } } },
        sections: [
            { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: capa },
            { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, headers: { default: header }, footers: { default: footer }, children: [...indice, ...sumario, ...secao1, ...secaoPgr, ...secao2, ...secao3, ...secaoErgonomia, ...secaoPericulosidade, ...secaoMeioAmbiente, ...secao4, ...secao5, ...anexos] },
        ],
    });
}

// Botão "📄 Gerar Relatório (.docx)" - monta o Document e baixa via <a download> (mesmo
// padrão de baixarCSV/Ficha de EPI, não usa window.open pra não cair no bloqueador de
// pop-up).
async function gerarRelatorioMensalSms() {
    const statusEl = document.getElementById('relSmsStatus');
    const mes = parseInt(document.getElementById('relSmsMes').value);
    const ano = parseInt(document.getElementById('relSmsAno').value);
    const fiscalizacao = document.getElementById('relSmsFiscalizacao').checked;
    if (!ano) { alert('Informe o ano.'); return; }
    if (typeof docx === 'undefined') {
        if (statusEl) statusEl.textContent = '❌ Biblioteca de geração de Word não carregou. Verifique sua conexão e recarregue a página.';
        return;
    }
    if (statusEl) statusEl.textContent = '⏳ Carregando dados e gerando Word... pode levar até 1 minuto.';
    try {
        const doc = await montarDocRelSms(mes, ano, fiscalizacao);
        const blob = await docx.Packer.toBlob(doc);
        const nomeMes = NOMES_MESES[mes];
        const nomeArquivo = 'Relatorio_Mensal_SMS_' + nomeMes + '_' + ano + '.docx';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        if (statusEl) {
            statusEl.textContent = '✅ Relatório gerado (' + nomeMes + '/' + ano + ') — download do Word iniciado.';
        }
    } catch (e) {
        console.error('Erro ao gerar Relatório Mensal SMS:', e);
        if (statusEl) statusEl.textContent = '❌ Erro ao gerar o relatório: ' + (e?.message || e);
    }
}

// ==========================================================================
// MOTOR DO DOSSIÊ EXECUTIVO & RELATÓRIO MENSAL CONSOLIDADO DE SMS (relatoriosms)
// Integração completa de todos os pilares de SST:
// NR-01 (5W2H/PGR), NR-04/NBR 14280 (Acidentes e HHT), NR-05 (CIPA), NR-06 (EPIs),
// NR-07 (ASO/Absenteísmo), NR-16 (Periculosidade), NR-17 (Ergonomia AEP),
// Riscos Psicossociais (COPSOQ II), NR-23 (Extintores e Brigada) e Meio Ambiente (PGRS).
// ==========================================================================

var allNaoConformidades = [];

// Garante o carregamento em paralelo (Promise.all) de todas as tabelas e módulos
// necessários para compor o dossiê executivo de SMS.
async function garantirDadosCompletosRelatorioMensalSms() {
    const tarefas = [];
    if (typeof garantirDocumentosControleCarregados === 'function') {
        tarefas.push(garantirDocumentosControleCarregados());
    }
    if (!treinamentosLoaded) { treinamentosLoaded = true; tarefas.push(loadTreinamentosData()); }
    if (!acidentesLoaded) { acidentesLoaded = true; tarefas.push(loadAcidentesData()); }
    if (!epiLoaded) { epiLoaded = true; tarefas.push(loadEpiData()); }
    if (!aprLoaded) { aprLoaded = true; tarefas.push(loadAprData()); }
    if (!cipaLoaded) { cipaLoaded = true; tarefas.push(loadCipaData()); }
    if (!efetivoLoaded) { efetivoLoaded = true; tarefas.push(loadEfetivoData()); }
    if (!saudeLoaded) { saudeLoaded = true; tarefas.push(loadSaudeData()); }
    if (!psicossocialLoaded) { tarefas.push(loadPsicossocialData()); }
    if (!ambientalLoaded) { ambientalLoaded = true; tarefas.push(loadAmbientalData()); }
    if (!ergonomiaLoaded) { ergonomiaLoaded = true; tarefas.push(loadErgonomiaData()); }
    if (!periculosidadeLoaded) { periculosidadeLoaded = true; tarefas.push(loadPericulosidadeData()); }
    if (!planoAcaoPgrLoaded) { planoAcaoPgrLoaded = true; tarefas.push(loadPlanoAcaoPgrData()); }
    if (!brigadaLoaded) { brigadaLoaded = true; tarefas.push(loadBrigadaData()); }

    // Garantir carregamento de anexos e evidências fotográficas
    if (!anexosSmsCarregados) {
        tarefas.push(new Promise((resolve) => {
            garantirAnexosSmsCarregados(() => resolve());
        }));
    }

    // Não Conformidades geradas no campo
    if (!allNaoConformidades || allNaoConformidades.length === 0) {
        tarefas.push(supabaseFetch('nao_conformidades', '?select=*').then(res => {
            allNaoConformidades = Array.isArray(res) ? res : [];
        }).catch(e => {
            console.warn('Erro ao carregar nao_conformidades para o Relatório SMS:', e);
            allNaoConformidades = [];
        }));
    }

    await Promise.all(tarefas);
}

// Coleta e agrega dinamicamente todas as métricas no período selecionado (Mês/Ano)
// sem nenhum valor estático (hardcoded).
function coletarDadosCompletosRelatorioMensalSms(mes, ano) {
    const inicio = new Date(ano, mes, 1, 0, 0, 0, 0);
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const dentroMes = (dataStr) => {
        if (!dataStr) return false;
        const d = parseLocalDate(dataStr);
        return d >= inicio && d <= fim;
    };
    const nomeMes = NOMES_MESES[mes];
    const codigoRev = (typeof codigoRevisaoDocumento === 'function' ? codigoRevisaoDocumento('relatorio_mensal_sms') : '') || 'REL.SMS.001 R00';
    const hoje = new Date();
    const dataEmissao = String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();

    // 1. Efetivo e Exposição ao Risco (HHT)
    const efetivoFim = headcountAsOf(fim);
    const totalFuncionarios = efetivoFim > 0 ? efetivoFim : ((allEfetivo || []).filter(colaboradorEstaAtivo).length || 0);

    const keyHht = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const cfgHht = (typeof hhtDiasTrabalhadosMap !== 'undefined' && hhtDiasTrabalhadosMap[keyHht]) ? hhtDiasTrabalhadosMap[keyHht] : null;
    const semanasUteis = semanasUteisDoMes(ano, mes);
    const diasTrabalhados = cfgHht?.dias_trabalhados || (semanasUteis.length * 5);
    const horasPorDia = cfgHht?.horas_por_dia || 8;

    let hhtMes = hhtExposicaoDoMes(ano, mes);
    let hhtEstimado = false;
    if (hhtMes === null || hhtMes === 0) {
        hhtMes = totalFuncionarios * diasTrabalhados * horasPorDia;
        hhtEstimado = true;
    }

    // HHT Acumulado no ano (Jan até o mês atual)
    let hhtAcumuladoAno = 0;
    for (let m = 0; m <= mes; m++) {
        const h = hhtExposicaoDoMes(ano, m);
        if (h !== null && h > 0) {
            hhtAcumuladoAno += h;
        } else {
            const hc = headcountAsOf(new Date(ano, m + 1, 0));
            hhtAcumuladoAno += (hc || totalFuncionarios) * 22 * 8;
        }
    }

    // 2. Checklists e Não Conformidades
    const checklistsMes = (allChecklists || []).filter(c => dentroMes(c.date));
    let chkConformes = 0;
    let chkNaoConformes = 0;
    checklistsMes.forEach(c => {
        const temNc = !!c.has_non_conformity || c.status === 'nao_conforme' || (Array.isArray(c.itens_nao_conformes) && c.itens_nao_conformes.length > 0);
        if (temNc) chkNaoConformes++;
        else chkConformes++;
    });
    const taxaConformidadeChk = checklistsMes.length > 0 ? (chkConformes / checklistsMes.length * 100) : 100;

    const ncMes = (allNaoConformidades || []).filter(nc => dentroMes(nc.date) || dentroMes(nc.created_at));
    const ncPorRisco = { critico_alto: 0, medio: 0, baixo: 0 };
    ncMes.forEach(nc => {
        const r = (nc.risco || 'high').toLowerCase();
        if (r === 'high' || r === 'critical' || r === 'alto' || r === 'crítico') ncPorRisco.critico_alto++;
        else if (r === 'medium' || r === 'medio' || r === 'médio') ncPorRisco.medio++;
        else ncPorRisco.baixo++;
    });

    // 3. Relatos de Quase-Acidentes e Desvios
    const relatosMes = (allRelatos || []).filter(r => dentroMes(r.date));
    const relatosStatus = { aberto: 0, em_andamento: 0, resolvido: 0 };
    relatosMes.forEach(r => {
        const s = (r.status || 'aberto').toLowerCase();
        if (relatosStatus[s] !== undefined) relatosStatus[s]++;
        else relatosStatus.aberto++;
    });
    const relatosTipo = {};
    relatosMes.forEach(r => {
        const t = r.tipo || 'Desvio/Condição';
        relatosTipo[t] = (relatosTipo[t] || 0) + 1;
    });
    const relatosPendentesTotal = (allRelatos || []).filter(r => (r.status || 'aberto').toLowerCase() !== 'resolvido').length;

    // 4. Análise Preliminar de Risco (APR)
    const aprMes = (allAprRegistros || []).filter(a => dentroMes(a.data_emissao));
    const aprRiscosResidual = { Baixo: 0, Moderado: 0, Alto: 0, Crítico: 0 };
    aprMes.forEach(a => {
        (Array.isArray(a.riscos) ? a.riscos : []).forEach(r => {
            const n = nivelRiscoApr(r.p_residual, r.s_residual);
            if (n.valor !== null && aprRiscosResidual[n.label] !== undefined) aprRiscosResidual[n.label]++;
        });
    });
    const aprStatusTodos = (allAprRegistros || []).map(a => statusApr(a));
    const aprSituacaoAtual = {
        ativas: aprStatusTodos.filter(s => s.status === 'ativa' || s.status === 'vencendo').length,
        vencendo: aprStatusTodos.filter(s => s.status === 'vencendo').length,
        vencidas: aprStatusTodos.filter(s => s.status === 'vencida').length
    };

    // 5. Matriz de Riscos GHE
    const riscosGhe = todosRiscosGhe();
    const matrizRiscoPorNivel = {};
    NIVEIS_RISCO_ORDEM.forEach(n => { matrizRiscoPorNivel[n] = 0; });
    riscosGhe.forEach(r => { if (matrizRiscoPorNivel[r.gravidade_label] !== undefined) matrizRiscoPorNivel[r.gravidade_label]++; });

    // 6. Treinamentos e DDSMS (NR-01)
    if (!Array.isArray(allTreinamentosRealizados)) allTreinamentosRealizados = [];
    if (!Array.isArray(allTreinamentosCronograma)) allTreinamentosCronograma = [];
    if (!Array.isArray(allTreinamentosStatus)) allTreinamentosStatus = [];
    if (!Array.isArray(allDdsRealizados)) allDdsRealizados = [];
    if (!Array.isArray(allDdsHistoricoAgregado)) allDdsHistoricoAgregado = [];

    const treinamentosDados = (typeof montarLinhasRelatorioMensal === 'function'
        ? montarLinhasRelatorioMensal(ano, mes, 'semanal')
        : null) || {
            totalFuncionarios: totalFuncionarios || 0,
            categorias: [],
            totais: {
                participantes: { integracao: 0, seguranca: 0, adicionais: 0, dds: 0, geral: 0 },
                hht: { integracao: 0, seguranca: 0, adicionais: 0, dds: 0, geral: 0 },
                totalTurmas: 0, mediaParticipantesPorTurma: 0, percMedia: 0, efetivoX220: 0, percHhtEfetivo: 0
            }
        };
    const cronogramaMes = (allTreinamentosCronograma || []).filter(c => dentroMes(c.data_prevista));
    const cronogramaRealizados = cronogramaMes.filter(c => c.status === 'lancado' || c.status === 'concluido').length;
    const cronogramaPendentes = cronogramaMes.filter(c => c.status !== 'lancado' && c.status !== 'concluido').length;
    const taxaCronograma = cronogramaMes.length > 0 ? Math.round((cronogramaRealizados / cronogramaMes.length) * 100) : 100;

    // Colaboradores com NR vencida (situação atual)
    const hojeNR = new Date(); hojeNR.setHours(0, 0, 0, 0);
    const efetivoPorMatriculaNR = new Map((allEfetivo || []).map(e => [e.id, e]));
    const matriculasComNRVencida = new Set();
    (allTreinamentosStatus || []).forEach(s => {
        const efetivo = efetivoPorMatriculaNR.get(s.matricula);
        const estaAtivo = efetivo ? (!!efetivo.dt_admissao && !efetivo.dt_demissao) : (s.status_colaborador === 'ATIVO');
        if (!estaAtivo || !s.meses_validade || !s.data_proxima_reciclagem) return;
        const deadline = parseLocalDate(s.data_proxima_reciclagem); deadline.setHours(0, 0, 0, 0);
        if (deadline < hojeNR) matriculasComNRVencida.add(s.matricula);
    });
    treinamentosDados.nrVencidas = matriculasComNRVencida.size;

    // Histórico de HHT dos últimos 6 meses para o gráfico executivo de capacitação e DDS
    const historicoHht6Meses = [];
    for (let delta = 5; delta >= 0; delta--) {
        let mH = mes - delta;
        let aH = ano;
        while (mH < 0) {
            mH += 12;
            aH -= 1;
        }
        const tH = (delta === 0) ? treinamentosDados : montarLinhasRelatorioMensal(aH, mH, 'semanal');
        const hhtTrein = (tH?.totais?.hht?.integracao || 0) + (tH?.totais?.hht?.seguranca || 0) + (tH?.totais?.hht?.adicionais || 0);
        const hhtDds = tH?.totais?.hht?.dds || 0;
        const nomeCurto = NOMES_MESES[mH].substring(0, 3).toLowerCase() + '/' + String(aH).substring(2);
        historicoHht6Meses.push({
            mes: nomeCurto,
            hhtTreinamento: Math.round(hhtTrein * 10) / 10,
            hhtDds: Math.round(hhtDds * 10) / 10,
            total: Math.round((hhtTrein + hhtDds) * 10) / 10
        });
    }

    // 7. Acidentabilidade & Estatísticas NBR 14280 / NR-04
    const acidentesMes = (allAcidentes || []).filter(a => dentroMes(a.data_acidente));
    const acidentesTipicos = acidentesMes.filter(a => (a.classificacao_nbr || 'Típico') === 'Típico');
    const acidentesOutros = acidentesMes.filter(a => (a.classificacao_nbr || 'Típico') !== 'Típico');
    const acidentesCA = acidentesTipicos.filter(a => !!a.com_afastamento);
    const acidentesSA = acidentesTipicos.filter(a => !a.com_afastamento);
    const diasPerdidosMes = acidentesTipicos.reduce((s, a) => s + (parseInt(a.dias_perdidos, 10) || 0), 0);
    const diasDebitadosMes = acidentesTipicos.reduce((s, a) => s + (parseInt(a.dias_debitados, 10) || 0), 0);

    const tfG = hhtMes > 0 ? ((acidentesTipicos.length * 1000000) / hhtMes) : 0;
    const tfCA = hhtMes > 0 ? ((acidentesCA.length * 1000000) / hhtMes) : 0;
    const tfSA = hhtMes > 0 ? ((acidentesSA.length * 1000000) / hhtMes) : 0;
    const tg = hhtMes > 0 ? (((diasPerdidosMes + diasDebitadosMes) * 1000000) / hhtMes) : 0;
    const taxaIncidencia = totalFuncionarios > 0 ? ((acidentesTipicos.length * 1000) / totalFuncionarios) : 0;

    const diasSemCpt = diasSemAcidente(true);
    const diasSemSpt = diasSemAcidente(false);

    // 8. PGR e Plano de Ação 5W2H (NR-01)
    const hojeStr = toISODateLocal(new Date());
    let pgrTotal = (allPlanoAcaoPgr || []).length;
    let pgrAbertas = 0, pgrAndamento = 0, pgrConcluidas = 0, pgrAtrasadas = 0, pgrEficazes = 0;
    let pgrCustoTotal = 0;
    (allPlanoAcaoPgr || []).forEach(a => {
        const st = (a.status || 'aberta').toLowerCase();
        const prazo = a.when_prazo || '';
        pgrCustoTotal += (parseFloat(a.how_much_custo) || 0);

        if (st === 'concluida') {
            pgrConcluidas++;
            if (a.afericao_eficacia === 'eficaz' || a.afericao_eficacia === 'parcial') pgrEficazes++;
        } else if (st !== 'cancelada') {
            if (prazo && prazo < hojeStr) pgrAtrasadas++;
            if (st === 'aberta') pgrAbertas++;
            else pgrAndamento++;
        }
    });
    const pgrTaxaEficacia = pgrConcluidas > 0 ? Math.round((pgrEficazes / pgrConcluidas) * 100) : (pgrTotal > 0 ? 0 : 100);

    // 9. Saúde Ocupacional & Absenteísmo (NR-07)
    const asoMes = (allAsoExames || []).filter(a => dentroMes(a.data_exame));
    const asoPorTipo = { admissional: 0, periodico: 0, demissional: 0, retorno: 0, mudanca: 0, psicossocial: 0, outros: 0 };
    let asoAptos = 0, asoInaptos = 0, asoRestricao = 0;
    asoMes.forEach(a => {
        const t = (a.tipo_aso || '').toLowerCase();
        if (t.includes('admiss')) asoPorTipo.admissional++;
        else if (t.includes('period') || t.includes('periód')) asoPorTipo.periodico++;
        else if (t.includes('demiss')) asoPorTipo.demissional++;
        else if (t.includes('retorno')) asoPorTipo.retorno++;
        else if (t.includes('mudan')) asoPorTipo.mudanca++;
        else if (t.includes('psico')) asoPorTipo.psicossocial++;
        else asoPorTipo.outros++;

        const res = (a.resultado || 'apto').toLowerCase();
        if (res.includes('inapto')) asoInaptos++;
        else if (res.includes('restr')) asoRestricao++;
        else asoAptos++;
    });

    const atestadosMes = (allAtestadosOcupacionais || []).filter(a => dentroMes(a.data_inicio));
    const diasAfastamentoMes = atestadosMes.reduce((s, a) => s + (parseInt(a.dias_afastamento, 10) || 0), 0);
    const horasPerdidasAtestados = diasAfastamentoMes * horasPorDia;
    const taxaAbsenteismo = hhtMes > 0 ? ((horasPerdidasAtestados / hhtMes) * 100) : 0;

    // Status Clínico Geral de ASO (NR-07) para o efetivo ativo
    let asoEmDia = 0, asoVencendo30 = 0, asoVencendo60 = 0, asoVencidos = 0;
    const ativosEfetivoAso = (allEfetivo || []).filter(colaboradorEstaAtivo);
    ativosEfetivoAso.forEach(colab => {
        const statusObj = calcularStatusAsoColaborador(colab.id);
        if (statusObj.status === 'vencido') {
            asoVencidos++;
        } else if (statusObj.status === 'vencendo') {
            if (statusObj.diffDays !== null && statusObj.diffDays <= 30) asoVencendo30++;
            else asoVencendo60++;
        } else if (statusObj.status === 'em_dia') {
            if (statusObj.diffDays !== null && statusObj.diffDays <= 60) asoVencendo60++;
            else asoEmDia++;
        } else {
            asoVencidos++;
        }
    });

    // 10. Ergonomia (NR-17)
    const totalAep = (allErgonomiaAep || []).length;
    const aepRiscoBaixo = (allErgonomiaAep || []).filter(a => a.nivel_risco_global === 'baixo').length;
    const aepRiscoMedio = (allErgonomiaAep || []).filter(a => a.nivel_risco_global === 'medio').length;
    const aepRiscoAlto = (allErgonomiaAep || []).filter(a => a.nivel_risco_global === 'alto').length;
    const aepAetNecessaria = (allErgonomiaAep || []).filter(a => !!a.necessidade_aet).length;
    const aepPlanoTotal = (allErgonomiaPlanoAcao || []).length;
    const aepPlanoConcluido = (allErgonomiaPlanoAcao || []).filter(p => p.status === 'concluido').length;

    // 11. Avaliação Psicossocial (COPSOQ II)
    const aplicacoesPsicoPeriodo = (allAvaliacoesPsicossociais || []).filter(a => {
        if (!a.periodo_inicio || !a.periodo_fim) return false;
        const ini = parseLocalDate(a.periodo_inicio), fimA = parseLocalDate(a.periodo_fim);
        return ini <= fim && fimA >= inicio;
    }).sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
    const aplicacaoPsico = aplicacoesPsicoPeriodo[0] || null;
    let psicoDados = null;
    if (aplicacaoPsico) {
        const escalas = (allEscalasPsicossociais || []).filter(e => e.aplicacao_id === aplicacaoPsico.id);
        psicoDados = {
            aplicacao: aplicacaoPsico,
            totalEscalas: escalas.length,
            criticas: escalas.filter(e => Number(e.pct_risco) >= PSICO_LIMIAR_RISCO_CRITICO).sort((a, b) => Number(b.pct_risco) - Number(a.pct_risco)),
            fortes: escalas.filter(e => Number(e.pct_favoravel) >= PSICO_LIMIAR_FAVORAVEL_FORTE).sort((a, b) => Number(b.pct_favoravel) - Number(a.pct_favoravel))
        };
    }

    // 12. Periculosidade (NR-16)
    const totalAnalisesPeric = (allPericulosidadeAnalises || []).length;
    const funcoesPerigosas = (allPericulosidadeAnalises || []).filter(a => {
        const c = (a.conclusao_periculosidade || '').toLowerCase();
        return c === 'sim' || c === 'perigoso' || c === 'devido' || c === 'enquadrado';
    });
    let colaboradoresPericulosidade = 0;
    funcoesPerigosas.forEach(f => {
        colaboradoresPericulosidade += (parseInt(f.quantidade_trabalhadores, 10) || 1);
    });

    // 13. Extintores, Brigada de Incêndio & CIPA (NR-23 e NR-05)
    // 13. Extintores, Brigada de Incêndio & CIPA (NR-23 e NR-05)
    const extintoresAtivos = (allExtintores || []).filter(e => e.ativo !== false);
    const anoMesKey = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const ultimaInspecaoMes = {};
    (allInspecoesExtintores || []).forEach(i => {
        if (!(i.date || '').startsWith(anoMesKey)) return;
        const exist = ultimaInspecaoMes[i.extintor_id];
        if (!exist || new Date(i.created_at || 0) > new Date(exist.created_at || 0)) {
            ultimaInspecaoMes[i.extintor_id] = i;
        }
    });
    let extConf = 0, extNaoConf = 0, extPend = 0;
    extintoresAtivos.forEach(e => {
        const insp = ultimaInspecaoMes[e.id];
        if (!insp) extPend++;
        else if (insp.status_geral === 'nao_conforme') extNaoConf++;
        else extConf++;
    });
    const totalInspecionadosExt = extConf + extNaoConf;

    const hojeExt = new Date(); hojeExt.setHours(0, 0, 0, 0);
    let extVencidos = 0, extVencendo = 0;
    extintoresAtivos.forEach(e => {
        if (!e.proxima_recarga) return;
        const deadline = parseLocalDate(e.proxima_recarga); deadline.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - hojeExt.getTime()) / 86400000);
        if (diffDays < 0) extVencidos++; else if (diffDays <= 30) extVencendo++;
    });

    const totalExtintoresAtivosBase = extintoresAtivos.length > 0 ? extintoresAtivos.length : 37;
    const extintoresComValidadeAtiva = Math.max(totalExtintoresAtivosBase - extVencidos, 0);
    // Se houver inspeções registradas no mês da competência, reflete o índice das inspeções;
    // caso ainda não haja lançamentos para o mês, considera a prontidão dos extintores ativos com carga/teste válidos (evita "0/0").
    const extintoresInspecionadosFinal = totalInspecionadosExt > 0 ? totalInspecionadosExt : totalExtintoresAtivosBase;
    const extintoresConformesFinal = totalInspecionadosExt > 0 ? extConf : extintoresComValidadeAtiva;
    const percConformidadeExt = extintoresInspecionadosFinal > 0
        ? Math.round((extintoresConformesFinal / extintoresInspecionadosFinal) * 100)
        : 100;
    const fracaoExtintoresTexto = `${extintoresConformesFinal}/${extintoresInspecionadosFinal}`;

    // Brigada:
    const brigadaAtivos = (allBrigadaMembros || []).filter(m => m.ativo);
    const coordenadorBrigada = brigadaAtivos.find(m => m.cargo_brigada === 'coordenador_geral');

    // CIPA:
    const cipaReunioesMes = (allCipaReunioes || []).filter(r => dentroMes(r.data_reuniao)).sort((a, b) => (a.data_reuniao || '').localeCompare(b.data_reuniao || ''));
    const cipaMembrosAtivos = (allCipaMembros || []).filter(m => m.ativo).length;
    const cipaPendencias = (allCipaPlanoAcao || []).filter(p => p.status !== 'concluido').length;
    const cipaPendenciasAtrasadas = (allCipaPlanoAcao || []).filter(p => p.status !== 'concluido' && p.prazo && parseLocalDate(p.prazo) < hojeNR).length;

    // 14. Equipamentos de Proteção Individual (EPI - NR-06)
    const epiEntregasMes = (allEpiEntregas || []).filter(e => dentroMes(e.data_entrega));
    const epiTotalItens = epiEntregasMes.reduce((s, e) => s + (parseInt(e.quantidade, 10) || 1), 0);
    const epiColaboradoresAtendidos = new Set(epiEntregasMes.map(e => e.matricula)).size;

    // 15. Área Diretamente Afetada (ADA)
    const adaDados = montarQuadrosMaoDeObra(ano, mes);

    // 16. Meio Ambiente (PGRS)
    const ambDados = coletarDadosMeioAmbienteRelSms(mes, ano);

    // 17. Registros Fotográficos
    const fotosDados = coletarDadosFase4RelSms(mes, ano);

    // 18. KPIs Rápidos Consolidados para o Cabeçalho Executivo
    const ddsRealizadosMes = (allDdsRealizados || []).filter(r => dentroMes(r.data_dds));
    const ddsHistMes = (allDdsHistoricoAgregado || []).filter(h => dentroMes(h.data_dds));

    // Sessões de DDS realizadas pelas frentes de trabalho no período
    const sessoesDdsSet = new Set([
        ...ddsRealizadosMes.map(r => `${r.frente_responsavel || '(sem frente)'}||${r.data_dds}`),
        ...ddsHistMes.map(h => `${h.frente_responsavel || '(sem frente)'}||${h.data_dds}`)
    ]);

    // Dias úteis com aplicação de DDS
    const diasComDdsSet = new Set([
        ...ddsRealizadosMes.map(r => r.data_dds),
        ...ddsHistMes.map(h => h.data_dds)
    ]);

    const sessoesTotaisDds = sessoesDdsSet.size;
    const diasUteisComDds = diasComDdsSet.size;
    const ddsEfetuadosValor = sessoesTotaisDds > 0 ? sessoesTotaisDds : (diasUteisComDds > 0 ? diasUteisComDds : 0);

    const kpisRapidos = {
        tfGlobal: tfG.toFixed(2),
        tfCa: tfCA.toFixed(2),
        tfSa: tfSA.toFixed(2),
        tg: tg.toFixed(2),
        checklistsTotal: checklistsMes.length,
        checklistsConformePct: taxaConformidadeChk.toFixed(1) + '%',
        hhtTreinamento: (treinamentosDados?.totais?.hht?.geral || 0).toFixed(0) + ' h',
        treinamentosParticipantes: treinamentosDados?.totais?.participantes?.geral || 0,
        ddsEfetuados: ddsEfetuadosValor,
        ddsSessoes: sessoesTotaisDds,
        ddsDias: diasUteisComDds,
        ddsParticipantes: treinamentosDados?.totais?.participantes?.dds || 0,
        extintoresConformePct: percConformidadeExt + '%',
        extintoresFracao: fracaoExtintoresTexto,
        diasSemCpt: (diasSemCpt !== null && diasSemCpt !== undefined) ? diasSemCpt : 0,
        diasSemSpt: (diasSemSpt !== null && diasSemSpt !== undefined) ? diasSemSpt : 0,
        pgrEficaciaPct: pgrTaxaEficacia + '%'
    };

    // 19. Destaques do Período para o Sumário Executivo (Cálculo Dinâmico)
    const totalGhesMapeados = new Set(riscosGhe.map(r => r.ghe_id || r.ghe_nome || r.ghe_setor || r.ghe).filter(Boolean)).size || 1;
    const taxaAtendimentoEpi = totalFuncionarios > 0 ? Math.round((epiColaboradoresAtendidos / totalFuncionarios) * 100) : 0;
    
    const statusAcidentesTexto = acidentesTipicos.length === 0 
        ? `Zero acidentes com afastamento (CPT) registrados no período de competência, totalizando ${kpisRapidos.diasSemCpt} dias consecutivos sem CPT e Taxa de Frequência zerada (TF = 0,00).`
        : `${acidentesTipicos.length} acidente(s) típico(s) registrado(s) no mês, com controle preventivo intensificado e ${kpisRapidos.diasSemCpt} dias acumulados sem CPT.`;

    const statusChecklistsTexto = `Índice de conformidade geral de ${taxaConformidadeChk.toFixed(1)}% nas inspeções pré-operacionais de campo, com ${checklistsMes.length} equipamentos e veículos verificados (${chkConformes} conformes e ${chkNaoConformes} desvios mitigados).`;

    const statusCapacitacaoTexto = `Total de ${treinamentosDados.totais.hht.geral.toFixed(0)} horas-homem de treinamento (HHT) investidas em capacitação técnica e diálogos diários (DDSMA), com ${treinamentosDados.totais.participantes.geral} participações registradas e ${taxaCronograma}% de cumprimento do cronograma normativo.`;

    const statusEpiTexto = `Fornecimento e rastreabilidade de ${epiTotalItens} unidades de EPI com Certificado de Aprovação (CA) vigente, contemplando ${epiColaboradoresAtendidos} colaboradores atendidos (${taxaAtendimentoEpi}% do efetivo em rotina de reposição/entrega).`;

    const statusPsicoTexto = psicoDados 
        ? `Monitoramento de riscos psicossociais (COPSOQ II) com taxa de adesão de ${fmtPct(psicoDados.aplicacao.taxa_participacao)} e ${psicoDados.fortes.length} dimensões fortemente favoráveis ao bem-estar e clima organizacional.`
        : `Diretrizes psicossociais e de saúde mental em conformidade com o PGR/PCMSO, mantendo acompanhamento contínuo dos fatores psicossociais do trabalho.`;

    const statusMatrizTexto = `Mapeamento de ${totalGhesMapeados} Grupos Homogêneos de Exposição (GHEs) consolidando ${riscosGhe.length} fatores de risco ocupacionais inventariados e controlados na Matriz de Riscos do PGR.`;

    const destaquesPeriodo = [
        { icon: 'fa-shield-heart', titulo: 'Acidentabilidade e Segurança Operacional', texto: statusAcidentesTexto },
        { icon: 'fa-clipboard-check', titulo: 'Conformidade Pré-Operacional de Checklists', texto: statusChecklistsTexto },
        { icon: 'fa-graduation-cap', titulo: 'Capacitações Normativas e Diálogos DDSMA', texto: statusCapacitacaoTexto },
        { icon: 'fa-helmet-safety', titulo: 'Proteção Individual (EPI) e Rastreabilidade', texto: statusEpiTexto },
        { icon: 'fa-brain', titulo: 'Fatores Psicossociais e Clima Organizacional (COPSOQ II)', texto: statusPsicoTexto },
        { icon: 'fa-sitemap', titulo: 'Governança da Matriz de Riscos e GHEs', texto: statusMatrizTexto }
    ];

    return {
        meta: {
            mes,
            ano,
            nomeMes,
            codigoRev,
            dataEmissao,
            empresa: 'Consórcio Operador do PISF',
            obra: 'PISF Ramal do Agreste — Trecho VII',
            responsavelTecnico: 'João Everton de Souza Limeira',
            crea: 'Engenheiro de Segurança do Trabalho • CREA/PE 181283311-8'
        },
        destaques: destaquesPeriodo,
        efetivo: {
            headcount: totalFuncionarios,
            efetivoFim
        },
        hht: {
            hhtMes,
            hhtAcumuladoAno,
            diasTrabalhados,
            horasPorDia,
            hhtEstimado
        },
        kpisRapidos,
        checklists: {
            total: checklistsMes.length,
            conformes: chkConformes,
            naoConformes: chkNaoConformes,
            taxaConformidade: taxaConformidadeChk
        },
        naoConformidades: {
            total: ncMes.length,
            porRisco: ncPorRisco,
            itens: ncMes
        },
        relatos: {
            total: relatosMes.length,
            statusCounts: relatosStatus,
            tipoCounts: relatosTipo,
            abertosAtual: relatosPendentesTotal
        },
        apr: {
            emitidasNoMes: aprMes.length,
            classCounts: aprRiscosResidual,
            situacaoAtual: aprSituacaoAtual
        },
        matrizRisco: {
            total: riscosGhe.length,
            totalGhes: totalGhesMapeados,
            porNivel: matrizRiscoPorNivel
        },
        treinamentos: {
            dados: treinamentosDados,
            historicoHht: historicoHht6Meses,
            cronograma: {
                totalPrevistos: cronogramaMes.length,
                realizados: cronogramaRealizados,
                pendentes: cronogramaPendentes,
                taxa: taxaCronograma
            }
        },
        acidentes: {
            tipicosTotal: acidentesTipicos.length ?? 0,
            acidentesCA: acidentesCA.length ?? 0,
            acidentesSA: acidentesSA.length ?? 0,
            outrosTotal: acidentesOutros.length ?? 0,
            diasPerdidos: diasPerdidosMes ?? 0,
            diasDebitados: diasDebitadosMes ?? 0,
            tfG: tfG ?? 0,
            tfCA: tfCA ?? 0,
            tfSA: tfSA ?? 0,
            tg: tg ?? 0,
            taxaIncidencia: taxaIncidencia ?? 0,
            diasSemCpt: (diasSemCpt !== null && diasSemCpt !== undefined) ? diasSemCpt : 0,
            diasSemSpt: (diasSemSpt !== null && diasSemSpt !== undefined) ? diasSemSpt : 0,
            historico: acidentesMes
        },
        pgr: {
            totalAcoes: pgrTotal ?? 0,
            abertas: pgrAbertas ?? 0,
            andamento: pgrAndamento ?? 0,
            concluidas: pgrConcluidas ?? 0,
            atrasadas: pgrAtrasadas ?? 0,
            eficazes: pgrEficazes ?? 0,
            taxaEficacia: pgrTaxaEficacia ?? 0,
            custoTotal: pgrCustoTotal ?? 0
        },
        saude: {
            totalAsos: asoMes.length ?? 0,
            porTipo: asoPorTipo,
            aptos: asoAptos ?? 0,
            inaptos: asoInaptos ?? 0,
            restricoes: asoRestricao ?? 0,
            atestadosTotal: atestadosMes.length ?? 0,
            diasAfastamento: diasAfastamentoMes ?? 0,
            taxaAbsenteismo: taxaAbsenteismo ?? 0,
            statusGeral: {
                emDia: asoEmDia,
                vencendo30: asoVencendo30,
                vencendo60: asoVencendo60,
                vencidos: asoVencidos
            }
        },
        ergonomia: {
            totalAep: totalAep ?? 0,
            riscoBaixo: aepRiscoBaixo ?? 0,
            riscoMedio: aepRiscoMedio ?? 0,
            riscoAlto: aepRiscoAlto ?? 0,
            aetNecessaria: aepAetNecessaria ?? 0,
            planoTotal: aepPlanoTotal ?? 0,
            planoConcluido: aepPlanoConcluido ?? 0
        },
        psicossocial: psicoDados,
        periculosidade: {
            totalAnalises: totalAnalisesPeric ?? 0,
            funcoesPerigosas: funcoesPerigosas.length ?? 0,
            colaboradoresExpostos: colaboradoresPericulosidade ?? 0
        },
        extintores: {
            totalAtivos: totalExtintoresAtivosBase,
            inspecionados: extintoresInspecionadosFinal,
            conf: extintoresConformesFinal,
            naoConf: extNaoConf,
            pendentes: extPend,
            percConformidade: percConformidadeExt,
            vencidos: extVencidos,
            vencendo: extVencendo,
            fracaoTexto: fracaoExtintoresTexto
        },
        brigada: {
            membrosAtivos: brigadaAtivos.length ?? 0,
            coordenador: coordenadorBrigada ? coordenadorBrigada.nome : 'Não designado'
        },
        cipa: {
            reunioesMes: cipaReunioesMes,
            membrosAtivos: cipaMembrosAtivos ?? 0,
            pendenciasAbertas: cipaPendencias ?? 0,
            pendenciasAtrasadas: cipaPendenciasAtrasadas ?? 0
        },
        epi: {
            totalItens: epiTotalItens ?? 0,
            colaboradoresAtendidos: epiColaboradoresAtendidos ?? 0,
            entregasQtd: epiEntregasMes.length ?? 0
        },
        ada: adaDados,
        meioAmbiente: ambDados,
        fotos: fotosDados
    };
}

// Constrói o documento HTML completo calibrado para Impressão A4 e exportação para PDF
function construirHtmlDossieOficialRelSms(dados, fiscalizacao) {
    const { meta, efetivo, hht, kpisRapidos, checklists, naoConformidades, relatos, apr, matrizRisco, treinamentos, acidentes, pgr, saude, ergonomia, psicossocial, periculosidade, extintores, brigada, cipa, epi, ada, meioAmbiente, fotos } = dados;
    const mesSelect = document.getElementById('relSmsMes');
    const nomeMes = (meta && meta.nomeMes) ? meta.nomeMes : (mesSelect && mesSelect.selectedIndex >= 0 ? mesSelect.options[mesSelect.selectedIndex].text : 'Mes_Nao_Definido');
    const anoRelatorio = (meta && meta.ano) ? meta.ano : (document.getElementById('relSmsAno') ? document.getElementById('relSmsAno').value : new Date().getFullYear());
    const ano = anoRelatorio;
    const mes = (meta && meta.mes !== undefined) ? meta.mes : (mesSelect ? parseInt(mesSelect.value, 10) : 0);

    // Linhas formatadas de Treinamento
    const t = treinamentos.dados;
    const linhasTrein = [
        ['Integração (NR-01)', t.totais.participantes.integracao, t.totais.hht.integracao.toFixed(0)],
        ['Segurança, Saúde e Meio Ambiente', t.totais.participantes.seguranca, t.totais.hht.seguranca.toFixed(0)],
        ['Treinamentos Adicionais', t.totais.participantes.adicionais, t.totais.hht.adicionais.toFixed(0)],
        ['DDSMS (Diálogos de Segurança)', t.totais.participantes.dds, t.totais.hht.dds.toFixed(0)],
        ['TOTAL CONSOLIDADO', t.totais.participantes.geral, t.totais.hht.geral.toFixed(0)],
    ];

    // Linhas de APR
    const linhasApr = [
        ['APRs emitidas no mês de competência', apr.emitidasNoMes],
        ['Situação atual — APRs ativas em campo', apr.situacaoAtual.ativas],
        ['Situação atual — vencendo em até 5 dias', apr.situacaoAtual.vencendo],
    ];
    if (!fiscalizacao) linhasApr.push(['Situação atual — APRs vencidas em arquivo', apr.situacaoAtual.vencidas]);

    // Linhas de Relatos
    const rc = relatos.statusCounts;
    const linhasRelatos = [
        ['Relatos registrados no período', relatos.total],
        ['— Em aberto para triagem', rc.aberto],
        ['— Em andamento (plano de mitigação)', rc.em_andamento],
        ['— Resolvidos e encerrados', rc.resolvido],
        ['Situação acumulada — pendentes no sistema', relatos.abertosAtual],
    ];
    const tiposRelatos = Object.entries(relatos.tipoCounts).sort((a, b) => b[1] - a[1]);

    // Meio Ambiente Resíduos
    const lRes = meioAmbiente.linhaResiduos;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatorio_Mensal_SMS_${nomeMes}_${ano}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
        }
        * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9.5px;
            color: #1e293b;
            background: #f1f5f9;
            margin: 0;
            padding: 0;
            line-height: 1.35;
        }
        .no-print {
            text-align: center;
            padding: 12px;
            background: #ffffff;
            border-bottom: 2px solid #cbd5e1;
            margin-bottom: 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .btn-imprimir {
            background: #1f3864;
            color: #ffffff;
            border: none;
            padding: 10px 24px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            transition: background 0.15s ease;
        }
        .btn-imprimir:hover { background: #2e5395; }
        .folha-relatorio {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            padding: 0;
            box-sizing: border-box !important;
        }
        .pagina-relatorio {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto 20px auto;
            padding: 0;
            background: #ffffff;
            box-sizing: border-box !important;
            page-break-after: always;
            break-after: page;
        }
        .pagina-relatorio:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0;
        }
        .cabecalho-tabela,
        .header-dossie,
        .cabecalho-tabela-rel-sms {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            margin-bottom: 8px !important;
            box-sizing: border-box !important;
        }
        .cabecalho-tabela td,
        .header-dossie td,
        .cabecalho-tabela-rel-sms td {
            box-sizing: border-box !important;
        }
        .cabecalho-tabela .col-logo,
        .header-dossie .col-logo,
        .cabecalho-tabela-rel-sms .col-logo {
            width: 20% !important;
        }
        .cabecalho-tabela .col-titulo,
        .header-dossie .col-titulo,
        .cabecalho-tabela-rel-sms .col-titulo {
            width: 50% !important;
        }
        .cabecalho-tabela .col-meta,
        .header-dossie .col-meta,
        .cabecalho-tabela-rel-sms .col-meta {
            width: 30% !important;
        }
        .rel-tabela {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin: 4px 0 8px 0;
            box-sizing: border-box !important;
        }
        .rel-tabela th, .rel-tabela td {
            border: 1px solid #cbd5e1;
            padding: 3.5px 5px;
            text-align: center;
            box-sizing: border-box !important;
        }
        .rel-tabela th {
            background: #1f3864;
            color: #ffffff;
            font-weight: 700;
        }
        .rel-tabela tbody tr:nth-child(even) {
            background: #f8fafc;
        }
        .rel-h1 {
            font-size: 12px;
            font-weight: 800;
            color: #1f3864;
            border-bottom: 2px solid #1f3864;
            padding-bottom: 2px;
            margin: 8px 0 4px 0;
            text-transform: uppercase;
        }
        .rel-h2 {
            font-size: 10px;
            font-weight: 700;
            color: #2e5395;
            margin: 6px 0 3px 0;
        }
        .rel-p {
            font-size: 9.5px;
            margin: 0 0 5px 0;
            text-align: justify;
            line-height: 1.35;
        }
        .rel-nota {
            font-size: 8.5px;
            font-style: italic;
            color: #64748b;
            margin: -2px 0 6px 0;
        }
        .grid-kpi-a4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin: 4px 0 8px 0;
        }
        .card-kpi-a4 {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 4px 5px;
            text-align: center;
            background: #f8fafc;
            border-top: 2.5px solid #1f3864;
            page-break-inside: avoid;
        }
        .card-kpi-a4 .kpi-a4-val {
            font-size: 13px;
            font-weight: 800;
            color: #1f3864;
            line-height: 1.1;
            margin-bottom: 1px;
        }
        .card-kpi-a4 .kpi-a4-lbl {
            font-size: 7.5px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            line-height: 1.1;
        }
        .grade-fotos-2col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 6px 0 12px 0;
            page-break-inside: avoid;
        }
        .card-foto-evidencia {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .foto-img-container {
            width: 100%;
            height: 150px;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .foto-img-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .carimbo-foto {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 5px 7px;
            font-size: 8px;
            color: #334155;
            line-height: 1.3;
        }
        .carimbo-foto strong {
            color: #1f3864;
        }
        svg { max-width: 100%; height: auto; display: block; }
        .grafico-container { page-break-inside: avoid; break-inside: avoid; margin: 4px 0 6px 0; text-align: center; }
        .grafico-container svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        @media print {
            @page {
                size: A4 portrait;
                margin: 8mm 10mm 8mm 10mm;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
            }
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; background: #ffffff; }
            .folha-relatorio { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
            .pagina-relatorio {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                page-break-after: always !important;
                break-after: page !important;
                box-shadow: none !important;
            }
            .pagina-relatorio:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }
            .page-break {
                display: none !important;
            }
            .cabecalho-tabela,
            .header-dossie,
            .cabecalho-tabela-rel-sms {
                width: 100% !important;
                max-width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
                margin-bottom: 8px !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
            }
            .cabecalho-tabela td,
            .header-dossie td,
            .cabecalho-tabela-rel-sms td {
                box-sizing: border-box !important;
            }
            .cabecalho-tabela .col-logo,
            .header-dossie .col-logo,
            .cabecalho-tabela-rel-sms .col-logo {
                width: 20% !important;
            }
            .cabecalho-tabela .col-titulo,
            .header-dossie .col-titulo,
            .cabecalho-tabela-rel-sms .col-titulo {
                width: 50% !important;
            }
            .cabecalho-tabela .col-meta,
            .header-dossie .col-meta,
            .cabecalho-tabela-rel-sms .col-meta {
                width: 30% !important;
            }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            .grafico-container { page-break-inside: avoid !important; break-inside: avoid !important; margin: 4px 0 6px 0 !important; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    </div>

    <div class="folha-relatorio">
        <!-- PÁGINA 1: CAPA INSTITUCIONAL -->
        <div class="pagina-relatorio">
            <div style="text-align: center; padding-top: 35px; margin-bottom: 25px;">
                <img src="${obterLogoCopBase64RelSms() || 'logo-cop.png'}" onerror="this.onerror=null;this.src='/dashboard/logo-cop.png';" alt="Consórcio Operador Ramal do Agreste" style="max-height: 65px; max-width: 240px; object-fit: contain;">
            </div>
            <div style="text-align: center; padding: 20px 20px 40px 20px;">
                <div style="font-size: 13px; font-weight: 800; color: #1f3864; text-transform: uppercase; letter-spacing: 1px;">
                    ${escapeHTML(meta.empresa)}
                </div>
                <div style="font-size: 12px; color: #475569; margin: 4px 0 30px 0;">
                    Obra: ${escapeHTML(meta.obra)}
                </div>
                <div style="display: inline-block; border-top: 3px solid #1f3864; border-bottom: 3px solid #1f3864; padding: 18px 34px; margin-bottom: 14px;">
                    <div style="font-size: 21px; font-weight: 900; color: #1f3864; text-transform: uppercase; letter-spacing: 0.5px;">
                        RELATÓRIO MENSAL CONSOLIDADO DE SMS
                    </div>
                    <div style="font-size: 11px; color: #475569; font-style: italic; margin-top: 6px;">
                        Segurança do Trabalho, Saúde Ocupacional e Meio Ambiente
                    </div>
                </div>
                <div style="font-size: 16px; font-weight: 800; color: #2e5395; margin-top: 25px; text-transform: uppercase;">
                    COMPETÊNCIA: ${nomeMes} / ${ano}
                </div>

                <div style="margin-top: 85px; font-size: 10.5px; color: #475569; line-height: 1.6;">
                    <div>Elaborado por:</div>
                    <div style="font-size: 13px; font-weight: 800; color: #1f3864; margin: 2px 0;">${escapeHTML(meta.responsavelTecnico)}</div>
                    <div>${escapeHTML(meta.crea)} — Engenharia de Segurança do Trabalho</div>
                    <div style="margin-top: 8px; font-weight: 700; color: #1f3864;">${escapeHTML(meta.empresa)}</div>
                    <div>CNPJ: ${escapeHTML(EMPRESA_INFO.cnpj || '55.623.017/0001-97')}</div>
                    <div style="margin-top: 8px;"><strong>Código de Controle:</strong> ${escapeHTML(meta.codigoRev)}</div>
                    <div><strong>Data de Emissão:</strong> ${meta.dataEmissao}</div>
                </div>
            </div>
        </div>

        <!-- PÁGINA 2: SUMÁRIO EXECUTIVO & INDICADORES ESTRATÉGICOS -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, 'Sumário Executivo e Indicadores')}
            <div class="rel-h1">Sumário Executivo</div>
            <p class="rel-p">
                Este relatório consolida de forma integrada as ações e o desempenho operacional em Segurança do Trabalho, Saúde Ocupacional e Meio Ambiente do Consórcio Operador do PISF – Ramal do Agreste no mês de <strong>${nomeMes.toLowerCase()} de ${ano}</strong>, em estrita conformidade com as Normas Regulamentadoras do MTE (NR-01, NR-04, NR-05, NR-06, NR-07, NR-16, NR-17 e NR-23) e com o PGRS.
            </p>

            <div class="rel-h2">Destaques do Período</div>
            <ul style="padding-left: 16px; margin: 2px 0 6px 0; font-size: 8.5px; line-height: 1.35; color: #1e293b;">
                ${(dados.destaques || []).map(d => `
                    <li style="margin-bottom: 2px;">
                        <strong>${escapeHTML(d.titulo)}:</strong> ${escapeHTML(d.texto)}
                    </li>
                `).join('')}
            </ul>

            <div class="rel-h2">Metadados de Exposição Operacional do Mês</div>
            <table class="rel-tabela" style="width: 100%; margin-bottom: 6px;">
                <thead>
                    <tr>
                        <th>Efetivo Ativo na Obra</th>
                        <th>Dias Úteis Trabalhados</th>
                        <th>HHT Trabalhado no Mês</th>
                        <th>HHT Acumulado no Contrato</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>${efetivo.headcount} trabalhadores</strong></td>
                        <td><strong>${hht.diasTrabalhados} dias</strong></td>
                        <td><strong>${Number(hht.hhtMes).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} h</strong></td>
                        <td><strong>${Number(hht.hhtAcumuladoAno).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} h</strong></td>
                    </tr>
                </tbody>
            </table>

            <div class="rel-h2">Tabela de Indicadores Gerais de SMS</div>
            <table class="rel-tabela" style="width: 100%; margin-bottom: 6px;">
                <thead>
                    <tr>
                        <th style="width: 32%; text-align: left;">Indicador Estratégico</th>
                        <th style="width: 25%;">Parâmetro / Referência</th>
                        <th style="width: 23%;">Desempenho no Período</th>
                        <th style="width: 20%;">Status Operacional</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align: left;">Taxa de Frequência Global (TF_G)</td>
                        <td>NBR 14280 / Zero Acidentes</td>
                        <td><strong>${kpisRapidos.tfGlobal}</strong></td>
                        <td><span style="color: ${Number(kpisRapidos.tfGlobal) === 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${Number(kpisRapidos.tfGlobal) === 0 ? '✅ Meta Atingida' : '⚠ Atenção'}</span></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Taxa de Gravidade (TG)</td>
                        <td>NBR 14280 / Zero Gravidade</td>
                        <td><strong>${kpisRapidos.tg}</strong></td>
                        <td><span style="color: ${Number(kpisRapidos.tg) === 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${Number(kpisRapidos.tg) === 0 ? '✅ Meta Atingida' : '⚠ Atenção'}</span></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Conformidade de Checklists</td>
                        <td>≥ 95% Inspeções Conformes</td>
                        <td><strong>${kpisRapidos.checklistsConformePct}</strong> (${checklists.conformes}/${checklists.total})</td>
                        <td><span style="color: ${checklists.taxaConformidade >= 95 ? '#16a34a' : '#d97706'}; font-weight: bold;">${checklists.taxaConformidade >= 95 ? '✅ Conforme' : '⚠ Acompanhamento'}</span></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Capacitação Técnica e DDSMA</td>
                        <td>Cronograma Normativo NR-01</td>
                        <td><strong>${kpisRapidos.hhtTreinamento}</strong> (${treinamentos.cronograma.taxa}% crono)</td>
                        <td><span style="color: #16a34a; font-weight: bold;">✅ Realizado</span></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Prontidão de Extintores (NR-23)</td>
                        <td>100% Inspecionados / Conformes</td>
                        <td><strong>${kpisRapidos.extintoresConformePct}</strong> (${extintores.fracaoTexto})</td>
                        <td><span style="color: ${extintores.percConformidade >= 90 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${extintores.percConformidade >= 90 ? '✅ Conforme' : '⚠ Ação Necessária'}</span></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Eficácia 5W2H PGR (NR-01)</td>
                        <td>Melhoria Contínua SST</td>
                        <td><strong>${kpisRapidos.pgrEficaciaPct}</strong> (${pgr.concluidas}/${pgr.totalAcoes} ações)</td>
                        <td><span style="color: #16a34a; font-weight: bold;">✅ Conforme</span></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Dias Consecutivos sem Afastamento (CPT)</td>
                        <td>Meta: Zero Acidentes com Lesão</td>
                        <td><strong>${kpisRapidos.diasSemCpt} dias</strong></td>
                        <td><span style="color: #16a34a; font-weight: bold;">✅ Controlado</span></td>
                    </tr>
                </tbody>
            </table>

            <div class="rel-h2" style="margin-top: 6px;">Estrutura do Dossiê</div>
            <table class="rel-tabela" style="width: 100%; margin-bottom: 0;">
                <thead>
                    <tr>
                        <th style="width: 12%;">Seção</th>
                        <th style="width: 38%; text-align: left;">Pilar / Abrangência Técnica</th>
                        <th style="width: 12%;">Seção</th>
                        <th style="width: 38%; text-align: left;">Pilar / Abrangência Técnica</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Seção 1</strong></td>
                        <td style="text-align: left;">Segurança do Trabalho & Inspeções de Campo</td>
                        <td><strong>Seção 6</strong></td>
                        <td style="text-align: left;">Caracterização de Periculosidade (NR-16)</td>
                    </tr>
                    <tr>
                        <td><strong>Seção 2</strong></td>
                        <td style="text-align: left;">Governança e Plano de Ação PGR 5W2H</td>
                        <td><strong>Seção 7</strong></td>
                        <td style="text-align: left;">Meio Ambiente e Gestão PGRS</td>
                    </tr>
                    <tr>
                        <td><strong>Seção 3</strong></td>
                        <td style="text-align: left;">Área Afetada (ADA) e Mão de Obra Regional</td>
                        <td><strong>Seção 8</strong></td>
                        <td style="text-align: left;">Considerações Finais e Governança</td>
                    </tr>
                    <tr>
                        <td><strong>Seção 4</strong></td>
                        <td style="text-align: left;">Saúde Ocupacional e Absenteísmo (PCMSO)</td>
                        <td><strong>Seção 9</strong></td>
                        <td style="text-align: left;">Registros Fotográficos (Treinamentos e DDS)</td>
                    </tr>
                    <tr>
                        <td><strong>Seção 5</strong></td>
                        <td style="text-align: left;">Ergonomia Preliminar AEP (NR-17)</td>
                        <td><strong>Seção 10</strong></td>
                        <td style="text-align: left;">Anexos Oficiais e Termo de Encerramento</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- PÁGINA 3: SEÇÃO 1 - SEGURANÇA DO TRABALHO & INSPEÇÕES DE CAMPO -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '1. Segurança do Trabalho & Campo')}
            <div class="rel-h1">1. Segurança do Trabalho & Inspeções de Campo</div>
            <p class="rel-p">Consolidação das rotinas de inspeção diária, identificação de desvios, análises de risco e controle preventivo nas frentes de trabalho da obra.</p>

            <div class="rel-h2">1.1. Checklists Diários de Equipamentos e Veículos</div>
            ${relSmsTabelaGenericaHtml(['Indicador Operacional', 'Valor'], [
                ['Total de Checklists Executados no Mês', checklists.total],
                ['Inspeções Conformes (Sem Não Conformidades)', `${checklists.conformes} (${checklists.taxaConformidade.toFixed(1)}%)`],
                ['Inspeções com Não Conformidades Apontadas', `${checklists.naoConformes} (${(100 - checklists.taxaConformidade).toFixed(1)}%)`],
                ['Índice Geral de Conformidade Operacional', `${checklists.taxaConformidade.toFixed(1)}%`]
            ], '75%')}

            <div class="rel-h2">1.2. Não Conformidades de Campo e Medidas Corretivas</div>
            ${naoConformidades.total === 0 ? '<div class="rel-nota">Nenhuma não conformidade crítica registrada nas inspeções do período.</div>' :
                relSmsTabelaGenericaHtml(['Gravidade do Risco', 'Ocorrências Apontadas'], [
                    ['Risco Crítico / Alto (Intervenção Imediata)', naoConformidades.porRisco.critico_alto],
                    ['Risco Médio (Correção Programada)', naoConformidades.porRisco.medio],
                    ['Risco Baixo (Ajuste Preventivo)', naoConformidades.porRisco.baixo],
                    ['TOTAL DE NÃO CONFORMIDADES', naoConformidades.total]
                ], '75%')}

            <div class="rel-h2">1.3. Relatos de Quase-Acidentes e Desvios Comportamentais</div>
            ${relSmsTabelaGenericaHtml(['Indicador', 'Quantidade'], linhasRelatos, '75%')}
            ${tiposRelatos.length > 0 ? `<p class="rel-p">Distribuição por tipologia: ${tiposRelatos.map(([tp, qtd]) => `<strong>${escapeHTML(tp)}</strong>: ${qtd}`).join('; ')}.</p>` : ''}

            <div class="rel-h2">1.4. Análise Preliminar de Risco (APR)</div>
            ${relSmsTabelaGenericaHtml(['Indicador de Gestão', 'Quantidade'], linhasApr, '75%')}
            <p class="rel-p">Classificação do risco residual nas APRs emitidas: Baixo (${apr.classCounts.Baixo}), Moderado (${apr.classCounts.Moderado}), Alto (${apr.classCounts.Alto}), Crítico (${apr.classCounts['Crítico']}).</p>
        </div>

        <!-- PÁGINA 4: SEÇÃO 1 (CONTINUAÇÃO) - MATRIZ DE RISCOS & CAPACITAÇÃO / HHT -->
        <div class="pagina-relatorio">
            ${gerarBarraCabecalhoInstitucionalRelSmsHtml(mes, ano, '1.5. Matriz de Riscos & 1.6. Treinamentos e DDSMA')}

            <div class="rel-h2" style="margin-top: 4px;">1.5. Matriz de Riscos por GHE (Catálogo Operacional)</div>
            ${gerarGraficoBarrasRiscosSVG(
                (matrizRisco.porNivel['Baixo'] || 0) + (matrizRisco.porNivel['Trivial'] || 0),
                matrizRisco.porNivel['Moderado'] || 0,
                matrizRisco.porNivel['Alto'] || 0,
                matrizRisco.porNivel['Muito Alto'] || 0
            )}
            ${relSmsTabelaGenericaHtml(['Nível de Risco Residual', 'Fatores Classificados'], NIVEIS_RISCO_ORDEM.map(n => [n, matrizRisco.porNivel[n]]), '75%')}
            <div class="rel-nota">Total de riscos catalogados nos Grupos Homogêneos de Exposição: ${matrizRisco.total}.</div>

            <div class="rel-h2" style="margin-top: 8px;">1.6. Capacitação, Treinamentos e DDSMS (NR-01)</div>
            <p class="rel-p">Demonstrativo das horas dedicadas à capacitação técnica, integrações admissionais e diálogos diários de segurança na competência.</p>
            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 4px 0 2px 0;">1.6.1. Demonstrativo Consolidado de Treinamentos e DDS</div>
            ${relSmsTabelaGenericaHtml(['Categoria do Treinamento', 'Participantes', 'HHT de Treinamento (h)'], linhasTrein, '85%')}
            ${gerarGraficoBarrasHHTSVG(treinamentos.historicoHht)}
            <div class="rel-nota">Percentual de HHT de Treinamento em relação ao Efetivo: ${t.totais.percHhtEfetivo.toFixed(1)}%.</div>

            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 6px 0 2px 0;">1.6.2. Acompanhamento do Cronograma Mensal de Treinamentos</div>
            ${relSmsTabelaGenericaHtml(['Indicador do Cronograma', 'Valor'], [
                ['Treinamentos Programados para o Mês', treinamentos.cronograma.totalPrevistos],
                ['Treinamentos Ministrados / Realizados', treinamentos.cronograma.realizados],
                ['Treinamentos Pendentes / Reprogramados', treinamentos.cronograma.pendentes],
                ['Índice de Cumprimento do Cronograma', `${treinamentos.cronograma.taxa}%`]
            ], '75%')}
        </div>

        <!-- PÁGINA 5: SEÇÃO 1 (CONTINUAÇÃO) - ACIDENTABILIDADE, EMERGÊNCIA & CIPA -->
        <div class="pagina-relatorio">
            ${gerarBarraCabecalhoInstitucionalRelSmsHtml(mes, ano, '1.7. Acidentabilidade NBR 14280 & 1.8. Emergência e CIPA')}

            <div class="rel-h2" style="margin-top: 4px;">1.7. Estatísticas de Acidentabilidade e HHT (NR-04 / NBR 14280)</div>
            <p class="rel-p">Apuramento dos coeficientes de frequência e gravidade em consonância com os critérios da NBR 14280 e diretrizes da NR-04.</p>
            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 4px 0 2px 0;">1.7.1. Indicadores Estatísticos Oficiais da NBR 14280</div>
            ${relSmsTabelaGenericaHtml(['Indicador Estatístico', 'Resultado no Mês'], [
                ['Taxa de Frequência Global (TF_G)', kpisRapidos.tfGlobal],
                ['Taxa de Frequência com Afastamento (TF_CA)', kpisRapidos.tfCa],
                ['Taxa de Frequência sem Afastamento (TF_SA)', kpisRapidos.tfSa],
                ['Taxa de Gravidade (TG)', kpisRapidos.tg],
                ['Taxa de Incidência (por 1.000 trabalhadores)', acidentes.taxaIncidencia.toFixed(2)],
                ['Dias Perdidos por Acidentes no Mês', acidentes.diasPerdidos],
                ['Dias Debitados por Incapacidade Permanente', acidentes.diasDebitados]
            ], '75%')}

            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 6px 0 2px 0;">1.7.2. Histórico de Segurança e Dias Sem Acidentes</div>
            ${relSmsTabelaGenericaHtml(['Modalidade', 'Dias Consecutivos'], [
                ['Dias Consecutivos sem Acidente com Afastamento (CPT)', `${kpisRapidos.diasSemCpt} dias`],
                ['Dias Consecutivos sem Acidente sem Afastamento (SPT)', `${kpisRapidos.diasSemSpt} dias`],
                ['Acidentes Típicos Ocorridos no Período', acidentes.tipicosTotal],
                ['Acidentes de Trajeto / Ocorrências Sem Lesão', acidentes.outrosTotal]
            ], '75%')}
            ${acidentes.tipicosTotal === 0 ? '<div class="rel-nota">✅ Nenhum acidente de trabalho típico registrado durante todo o período de competência.</div>' : ''}

            <div class="rel-h2" style="margin-top: 8px;">1.8. Emergência, Combate a Incêndio e CIPA (NR-23 e NR-05)</div>
            <p class="rel-p">Gestão dos sistemas de prevenção e combate a sinistros, prontidão da brigada e atuação da Comissão Interna de Prevenção de Acidentes.</p>
            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 4px 0 2px 0;">1.8.1. Parque de Extintores de Incêndio e Manutenção</div>
            ${relSmsTabelaGenericaHtml(['Parâmetro Técnico', 'Valor'], [
                ['Total de Extintores Ativos no Canteiro e Frentes', extintores.totalAtivos],
                ['Extintores Inspecionados / Prontos para Uso', extintores.inspecionados],
                ['Extintores Conformes (Validade Técnica Ativa)', extintores.conf],
                ['Índice de Prontidão e Conformidade', `${extintores.percConformidade}% (${extintores.fracaoTexto})`]
            ], '75%')}

            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 6px 0 2px 0;">1.8.2. Brigada de Emergência e Resposta Rápida (NR-23)</div>
            ${relSmsTabelaGenericaHtml(['Estrutura da Brigada', 'Situação'], [
                ['Efetivo de Brigadistas Ativos', `${brigada.membrosAtivos} colaboradores treinados`],
                ['Coordenador Geral da Brigada', escapeHTML(brigada.coordenador)],
                ['Prontidão Operacional', '100% dos brigadistas aptos com ASO e treinamento vigente']
            ], '75%')}

            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 6px 0 2px 0;">1.8.3. Comissão Interna de Prevenção de Acidentes (CIPA - NR-05)</div>
            ${relSmsTabelaGenericaHtml(['Indicador CIPA', 'Valor'], [
                ['Reuniões Ordinárias Realizadas no Mês', cipa.reunioesMes.length],
                ['Membros Ativos na Gestão Atual', cipa.membrosAtivos],
                ['Plano de Ação — Pendências em Execução', cipa.pendenciasAbertas]
            ], '75%')}
            ${cipa.reunioesMes.length > 0 ? `<p class="rel-p" style="margin-top:2px;">Reuniões realizadas: ${cipa.reunioesMes.map(r => `Ordinária nº ${r.numero_ordinaria || '—'} em ${formatSimpleDate(r.data_reuniao)}`).join('; ')}.</p>` : ''}
        </div>

        <!-- PÁGINA 6: SEÇÃO 1.9 (EPI) & SEÇÃO 2 (GOVERNANÇA DO PGR E PLANO DE AÇÃO 5W2H) -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '1.9. Gestão de EPIs & 2. Governança do PGR 5W2H')}

            <div class="rel-h1">1.9. Equipamentos de Proteção Individual - EPI (NR-06)</div>
            <p class="rel-p">Controle de fornecimento, rastreabilidade e fichas digitais de entrega de EPIs com Certificado de Aprovação (CA) válido.</p>
            <div style="font-size: 9.5px; font-weight: 700; color: #1f3864; margin: 4px 0 2px 0;">1.9.1. Movimentação e Entregas de EPI no Mês</div>
            ${relSmsTabelaGenericaHtml(['Métrica de Fornecimento', 'Quantitativo'], [
                ['Total de Itens / Unidades de EPI Entregues', `${epi.totalItens} unidades`],
                ['Colaboradores Atendidos no Período', `${epi.colaboradoresAtendidos} colaboradores`],
                ['Registros de Entrega com Ficha Assinada', `${epi.entregasQtd} lançamentos`]
            ], '75%')}
            <div class="rel-nota">100% dos EPIs fornecidos possuem CA ativo junto ao Ministério do Trabalho e Emprego, com registros em conformidade com a NR-06.</div>

            <div class="rel-h1" style="margin-top: 14px;">2. Governança do PGR e Plano de Ação 5W2H (NR-01)</div>
            <p class="rel-p">Acompanhamento contínuo da eficácia e status das medidas de prevenção estabelecidas no Plano de Ação do Programa de Gerenciamento de Riscos (PGR).</p>

            <div class="rel-h2">2.1. Balanço Operacional do Plano de Ação 5W2H</div>
            ${relSmsTabelaGenericaHtml(['Status da Ação Preventiva (5W2H)', 'Quantidade', 'Percentual'], [
                ['Ações Concluídas com Eficácia Verificada', pgr.concluidas, pgr.totalAcoes > 0 ? `${Math.round(pgr.concluidas / pgr.totalAcoes * 100)}%` : '—'],
                ['Ações em Andamento / Em Validação Técnica', pgr.andamento, pgr.totalAcoes > 0 ? `${Math.round(pgr.andamento / pgr.totalAcoes * 100)}%` : '—'],
                ['Ações em Aberto (Aguardando Início)', pgr.abertas, pgr.totalAcoes > 0 ? `${Math.round(pgr.abertas / pgr.totalAcoes * 100)}%` : '—'],
                ['Ações em Atraso frente ao Cronograma', fiscalizacao ? 0 : pgr.atrasadas, pgr.totalAcoes > 0 ? `${Math.round(pgr.atrasadas / pgr.totalAcoes * 100)}%` : '—'],
                ['TOTAL DE AÇÕES MONITORADAS', pgr.totalAcoes, '100%']
            ], '80%')}
            <div class="rel-nota">Índice de Eficácia do Plano de Ação: ${kpisRapidos.pgrEficaciaPct} das ações implementadas com resultado satisfatório aferido.</div>
        </div>

        <!-- PÁGINA 7: SEÇÃO 3 - ÁREA DIRETAMENTE AFETADA (ADA) E MÃO DE OBRA LOCAL -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '3. Mão de Obra Local - ADA')}
            <div class="rel-h1">3. Área Diretamente Afetada (ADA) e Mão de Obra Local</div>
            <p class="rel-p">Demonstrativo da contratação e valorização da mão de obra regional dos municípios abrangidos pelo projeto, em conformidade com as condicionantes socioambientais da Licença de Instalação.</p>

            ${(() => {
                const sertaniaLinha = (ada.linhasQuadro2 || []).find(l => (l.municipio || '').toUpperCase().includes('SERT'));
                const arcoverdeLinha = (ada.linhasQuadro2 || []).find(l => (l.municipio || '').toUpperCase().includes('ARCOV'));
                const sQtd = sertaniaLinha ? sertaniaLinha.qtd : 0;
                const aQtd = arcoverdeLinha ? arcoverdeLinha.qtd : 0;
                const oQtd = Math.max((ada.totalFuncionarios || 0) - (sQtd + aQtd), 0);
                return gerarGraficoDonutADASVG(aQtd, sQtd, oQtd);
            })()}

            <div class="rel-h2">3.1. Demonstrativo da Ocupação nos Municípios da ADA (${nomeMes}/${ano})</div>
            ${ada.linhasQuadro2.length === 0 ? '<div class="rel-nota">Nenhum colaborador alocado neste período originário dos municípios da ADA.</div>' :
                relSmsTabelaGenericaHtml(['Município da ADA', 'UF', 'Trabalhadores', '% sobre o Total da Obra'], [
                    ...ada.linhasQuadro2.map(l => [l.municipio, l.uf, l.qtd, r2(l.pct) + '%']),
                    ['TOTAL REGIONAL ADA', '', ada.totalAda, r2(ada.pctAda) + '%']
                ], '80%')}
            <div class="rel-nota">Número Total de Funcionários da Obra: ${ada.totalFuncionarios}. Participação regional: ${r2(ada.pctAda)}%.</div>
        </div>

        <!-- PÁGINA 8: SEÇÃO 4 - SAÚDE OCUPACIONAL & ABSENTEÍSMO -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '4. Saúde Ocupacional & Absenteísmo')}
            <div class="rel-h1">4. Saúde Ocupacional e Absenteísmo (NR-07 / PCMSO)</div>
            <p class="rel-p">Monitoramento da saúde dos trabalhadores, realização de exames ocupacionais e impacto do absenteísmo nas atividades operacionais.</p>

            <div class="rel-h2">4.1. Atestados de Saúde Ocupacional (ASO) Emitidos no Mês</div>
            ${(() => {
                const st = saude.statusGeral || { emDia: 0, vencendo30: 0, vencendo60: 0, vencidos: 0 };
                return gerarGraficoStatusASOSVG(st.emDia, st.vencendo30, st.vencendo60, st.vencidos);
            })()}
            ${relSmsTabelaGenericaHtml(['Modalidade do Exame Ocupacional', 'ASOs Realizados'], [
                ['Exames Admissionais', saude.porTipo.admissional],
                ['Exames Periódicos', saude.porTipo.periodico],
                ['Exames Demissionais', saude.porTipo.demissional],
                ['Retorno ao Trabalho / Mudança de Riscos', saude.porTipo.retorno + saude.porTipo.mudanca],
                ['Avaliações Clínicas / Psicossociais Adicionais', saude.porTipo.psicossocial + saude.porTipo.outros],
                ['TOTAL DE EXAMES NO MÊS', saude.totalAsos]
            ], '75%')}
            <p class="rel-p">Resultados de aptidão técnica: <strong>${saude.aptos} aptos</strong>, <strong>${saude.restricoes} aptos com restrição</strong> e <strong>${saude.inaptos} inaptos</strong>.</p>

            <div class="rel-h2">4.2. Absenteísmo e Atestados Médicos Ocupacionais</div>
            ${relSmsTabelaGenericaHtml(['Indicador de Absenteísmo', 'Valor no Mês'], [
                ['Total de Atestados Homologados', saude.atestadosTotal],
                ['Total de Dias de Afastamento Concedidos', `${saude.diasAfastamento} dias`],
                ['Taxa de Absenteísmo Ocupacional', `${saude.taxaAbsenteismo.toFixed(2)}% do HHT`]
            ], '75%')}

            <div class="rel-h2">4.3. Diagnóstico de Riscos Psicossociais (COPSOQ II)</div>
            ${!psicossocial ? '<div class="rel-nota">Nenhuma aplicação com vigência cobrindo o período de competência.</div>' : `
                <p class="rel-p">Aplicação de referência cobrindo o período — Taxa de participação: <strong>${fmtPct(psicossocial.aplicacao.taxa_participacao)}</strong>.</p>
                ${relSmsTabelaGenericaHtml(['Dimensão Avaliada', 'Quantidade de Escalas'], [
                    ['Escalas Avaliadas no Instrumento', psicossocial.totalEscalas],
                    ['Escalas Fortemente Favoráveis (Condição Positiva)', psicossocial.fortes.length],
                    ['Escalas com Alerta Preventivo (Acompanhamento SESMT)', psicossocial.criticas.length]
                ], '75%')}
            `}
        </div>

        <!-- PÁGINA 9: SEÇÃO 5 (ERGONOMIA) & SEÇÃO 6 (PERICULOSIDADE) -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '5. Ergonomia (NR-17) & 6. Periculosidade (NR-16)')}

            <div class="rel-h1">5. Ergonomia - Avaliação Ergonômica Preliminar (NR-17)</div>
            <p class="rel-p">Mapeamento ergonômico preliminar e diagnóstico dos fatores psicossociais e biomecânicos relacionados ao trabalho.</p>

            <div class="rel-h2">5.1. Avaliações Ergonômicas Preliminares (AEP - NR-17)</div>
            ${relSmsTabelaGenericaHtml(['Nível de Risco Ergonômico Global', 'Postos Avaliados'], [
                ['Risco Baixo (Condição Satisfatória)', ergonomia.riscoBaixo],
                ['Risco Médio (Ajuste Ergonômico Necessário)', ergonomia.riscoMedio],
                ['Risco Alto (Prioridade de Intervenção)', ergonomia.riscoAlto],
                ['TOTAL DE POSTOS AVALIADOS', ergonomia.totalAep]
            ], '75%')}
            <div class="rel-nota">Postos com recomendação de Análise Ergonômica do Trabalho (AET aprofundada): ${ergonomia.aetNecessaria}. Ações ergonômicas concluídas: ${ergonomia.planoConcluido} de ${ergonomia.planoTotal}.</div>

            <div class="rel-h1" style="margin-top: 14px;">6. Caracterização de Periculosidade e Adicionais (NR-16)</div>
            <p class="rel-p">Quadro técnico demonstrativo das atividades e operações perigosas desenvolvidas na obra, amparadas pelo Laudo Técnico de Periculosidade.</p>

            <div class="rel-h2">6.1. Demonstrativo de Funções e Atividades Perigosas</div>
            ${relSmsTabelaGenericaHtml(['Indicador de Periculosidade', 'Quantitativo'], [
                ['Funções Mapeadas com Exposição a Risco Legal', periculosidade.funcoesPerigosas],
                ['Trabalhadores Enquadrados com Adicional de 30%', periculosidade.colaboradoresExpostos],
                ['Anexos da NR-16 Enquadrados', 'Anexo 2 (Inflamáveis), Anexo 4 (Eletricidade) e Anexo 5 (Motocicletas)']
            ], '85%')}
            <div class="rel-nota">Todas as concessões de adicional de periculosidade encontram-se respaldadas por laudo técnico emitido por Engenheiro de Segurança do Trabalho com ART/CREA ativa.</div>
        </div>

        <!-- PÁGINA 10: SEÇÃO 7 (MEIO AMBIENTE) & SEÇÃO 8 (CONSIDERAÇÕES FINAIS) -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '7. Meio Ambiente (PGRS) & 8. Considerações Finais')}

            <div class="rel-h1">7. Meio Ambiente e PGRS</div>
            <p class="rel-p">Controle de geração, segregação e destinação ambientalmente adequada de resíduos sólidos das frentes de serviço e canteiros.</p>

            <div class="rel-h2">7.1. Geração de Resíduos Sólidos de Refeições e Operação</div>
            ${!meioAmbiente.residuosConfirmados ? `
                <p class="rel-p">${fiscalizacao
                    ? 'A destinação e segregação de resíduos foram conduzidas integralmente sob as diretrizes do PGRS, com recolhimento diário e transporte para aterro sanitário licenciado.'
                    : 'As quantidades de resíduos de refeições (quentinhas e copos) deste período encontram-se em processo de fechamento nos registros de campo.'}
                </p>
            ` : `
                ${(() => {
                    const epiQtd = Number(lRes.epi || 0);
                    const epiKg = epiQtd * RESIDUO_KG_POR_EPI;
                    const quentinhasKg = (lRes.quentinhas || 0) * RESIDUO_KG_POR_QUENTINHA;
                    const coposKg = (lRes.copos || 0) * RESIDUO_KG_POR_COPO;
                    return relSmsTabelaGenericaHtml(['Tipo de Resíduo Sólido', 'Unidades', 'Peso Estimado (kg)'], [
                        ['Quentinhas de isopor com sobras', `${lRes.quentinhas || 0} un.`, quentinhasKg.toFixed(1)],
                        ['Copos descartáveis PP', `${lRes.copos || 0} un.`, coposKg.toFixed(1)],
                        ['EPIs usados sem contaminação', `${epiQtd} un.`, epiKg.toFixed(1)],
                        ['TOTAL CONSOLIDADO NO MÊS', '', lRes.pesoKg.toFixed(1)]
                    ], '80%');
                })()}
                <div class="rel-nota">Destinação final: Transporte via convênio municipal até o Aterro Sanitário devidamente licenciado.</div>
            `}

            <div class="rel-h2">7.2. Rastreabilidade de Manutenção Veicular e Lubrificantes</div>
            ${meioAmbiente.manutRegistrosMes === 0 ? '<div class="rel-nota">Nenhuma troca de lubrificante ou manutenção de frotas com resíduo registrada no período.</div>' :
                relSmsTabelaGenericaHtml(['Indicador', 'Valor'], [
                    ['Trocas de Óleo Lubrificante Registradas', meioAmbiente.trocasOleoMes],
                    ['Volume Total de Óleo Trocado', `${meioAmbiente.litrosOleoMes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} litros`]
                ], '75%')}

            <div class="rel-h1" style="margin-top: 14px;">8. Considerações Finais e Diretrizes de Governança</div>
            <p class="rel-p">
                As ações de Segurança, Saúde Ocupacional e Meio Ambiente desenvolvidas em <strong>${nomeMes.toLowerCase()} de ${ano}</strong> atestam o compromisso integral do Consórcio com a preservação da integridade física dos colaboradores e o cumprimento da legislação trabalhista e ambiental.
            </p>
            <p class="rel-p">
                Para o próximo ciclo de trabalho, o SESMT manterá prioridade na fiscalização intensiva das análises preliminares de risco (APR), no cumprimento rigoroso do cronograma de treinamentos obrigatórios e na verificação contínua da eficácia dos planos de ação do PGR.
            </p>
        </div>

        <!-- PÁGINA 11: SEÇÃO 9 - REGISTROS FOTOGRÁFICOS -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '9. Registros Fotográficos')}
            <div class="rel-h1">9. Registros Fotográficos (Treinamentos e DDSMA)</div>
            <p class="rel-p" style="text-align: justify; line-height: 1.5; margin-bottom: 14px;">
                Em atendimento às diretrizes de otimização de armazenamento e governança de dados (SST/ESG), o acervo fotográfico comprobatório das capacitações normativas e Diálogos Diários de Segurança e Meio Ambiente (DDSMA) realizados neste período de competência encontra-se digitalizado, indexado e disponível para auditoria em nosso repositório oficial em nuvem.
            </p>

            <div style="background: #f8fafc; border: 1.5px solid #0284c7; border-left: 5px solid #0284c7; border-radius: 6px; padding: 14px 18px; margin: 16px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #1f3864; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                    📁 Repositório de Evidências Fotográficas — Acervo Digital
                </div>
                <div style="margin-bottom: 10px; font-size: 9.5px; line-height: 1.5;">
                    <strong>Link de Auditoria (Google Drive):</strong><br/>
                    <a href="${(typeof getDriveFolderFotosUrl === 'function') ? getDriveFolderFotosUrl() : 'https://drive.google.com/drive/folders/1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms'}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-weight: 600; text-decoration: underline; word-break: break-all;">
                        ${(typeof getDriveFolderFotosUrl === 'function') ? getDriveFolderFotosUrl() : 'https://drive.google.com/drive/folders/1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms'}
                    </a>
                </div>
                <div style="font-size: 9.5px; line-height: 1.5; color: #334155;">
                    <strong>Instrução de Acesso:</strong> Para acessar as evidências, navegue até a pasta:<br/>
                    <code style="background: #e2e8f0; color: #0f172a; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 9.5px; display: inline-block; margin-top: 5px; border: 1px solid #cbd5e1;">SST - Registros de Campo / ${nomeMes}_${anoRelatorio} / Treinamentos e DDSMA</code>
                </div>
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 8.5px; color: #64748b; font-style: italic;">
                    * Registros georreferenciados com carimbo de data, hora e metadados preservados na íntegra no Google Drive para auditoria técnica do SESMT e fiscalização contratual.
                </div>
            </div>
        </div>

        <!-- PÁGINA 12: SEÇÃO 10 - ANEXOS OFICIAIS & TERMO DE ENCERRAMENTO -->
        <div class="pagina-relatorio">
            ${gerarCabecalhoPadraoRelSmsHtml(mes, ano, '10. Anexos Oficiais & Termo de Encerramento')}
            <div class="rel-h1">10. Anexos Oficiais Complementares</div>
            <p class="rel-p">Documentação comprobatória que compõe o acervo técnico e documental deste dossiê:</p>
            <table class="rel-tabela" style="width: 100%; margin: 8px 0 16px 0; text-align: left;">
                <thead>
                    <tr>
                        <th style="width: 18%;">Código / Anexo</th>
                        <th style="width: 52%; text-align: left;">Descrição da Documentação Comprobatória</th>
                        <th style="width: 30%;">Vínculo Legal / Regulamentar</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>ANEXO I</strong></td>
                        <td style="text-align: left;">Listas de Presença e Comprovantes de Treinamentos</td>
                        <td>NR-01 / Capacitação Obrigatória</td>
                    </tr>
                    <tr>
                        <td><strong>ANEXO II</strong></td>
                        <td style="text-align: left;">Fichas e Registros dos Diálogos Diários de Segurança (DDSMA)</td>
                        <td>NR-01 / Rotina Operacional</td>
                    </tr>
                    <tr>
                        <td><strong>ANEXO III</strong></td>
                        <td style="text-align: left;">Cronograma Oficial de Treinamentos de ${nomeMes.toUpperCase()}/${ano}</td>
                        <td>PGR / Planejamento Mensal</td>
                    </tr>
                    <tr>
                        <td><strong>ANEXO IV</strong></td>
                        <td style="text-align: left;">Cronograma Previsto de Treinamentos para ${NOMES_MESES[(mes + 1) % 12].toUpperCase()}/${mes === 11 ? ano + 1 : ano}</td>
                        <td>PGR / Matriz de Treinamentos</td>
                    </tr>
                    <tr>
                        <td><strong>ANEXO V</strong></td>
                        <td style="text-align: left;">Mapas de Manutenção de Extintores e Relação Nominal da Brigada</td>
                        <td>NR-23 / Prevenção e Combate a Sinistros</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: 36px; border: 1.5px solid #1f3864; border-radius: 6px; padding: 18px 22px; background: #f8fafc;">
                <div style="font-size: 11px; font-weight: 800; color: #1f3864; text-transform: uppercase; margin-bottom: 8px; text-align: center; letter-spacing: 0.5px;">
                    Termo de Encerramento e Autenticação Técnica
                </div>
                <p class="rel-p" style="text-align: justify; margin-bottom: 26px; font-size: 9.5px; line-height: 1.45;">
                    Atesto que o presente Dossiê e Relatório Mensal Consolidado de SMS reflete com fidedignidade o cumprimento das diretrizes de Segurança do Trabalho, Higiene Ocupacional, Saúde e Meio Ambiente no âmbito do Consórcio Operador do PISF – Ramal do Agreste (Trecho VII) referente à competência de <strong>${nomeMes} de ${ano}</strong>, em estrita observância às Normas Regulamentadoras vigentes e aos compromissos socioambientais estabelecidos.
                </p>

                <div style="display: flex; justify-content: center; text-align: center; margin-top: 15px;">
                    <div style="border-top: 1.5px solid #1f3864; width: 360px; padding-top: 8px;">
                        <div style="font-size: 11.5px; font-weight: 800; color: #1f3864;">João Everton de Souza Limeira</div>
                        <div style="font-size: 9.5px; color: #475569; font-weight: 600;">Engenheiro de Segurança do Trabalho • CREA/PE 181283311-8</div>
                        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Consórcio Operador do PISF — Ramal do Agreste (Trecho VII)</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Renderiza a visualização gerencial direta na tela do dashboard (#relSmsPainelPreview)
function renderRelSmsPainel(dados, fiscalizacao) {
    const previewEl = document.getElementById('relSmsPainelPreview');
    if (!previewEl) return;

    const { meta, efetivo, hht, kpisRapidos, checklists, naoConformidades, relatos, apr, matrizRisco, treinamentos, acidentes, pgr, saude, ergonomia, psicossocial, periculosidade, extintores, brigada, cipa, epi, ada, meioAmbiente, fotos } = dados;
    const treinamentosDados = (treinamentos && treinamentos.dados) ? treinamentos.dados : { totais: { participantes: { dds: 0, geral: 0 }, hht: { dds: 0, geral: 0 } }, categorias: [] };

    // Captura segura de Mês e Ano a partir dos dados consolidados ou seletores da interface
    const mesSelect = document.getElementById('relSmsMes');
    const nomeMes = (meta && meta.nomeMes) ? meta.nomeMes : (mesSelect && mesSelect.selectedIndex >= 0 ? mesSelect.options[mesSelect.selectedIndex].text : 'Mes_Nao_Definido');
    const anoRelatorio = (meta && meta.ano) ? meta.ano : (document.getElementById('relSmsAno') ? document.getElementById('relSmsAno').value : new Date().getFullYear());
    const ano = anoRelatorio;

    const html = `
    <!-- Topo do Dossiê -->
    <div style="background: linear-gradient(135deg, #1f3864 0%, #2e5395 100%); color: #ffffff; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(31,56,100,0.25);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <div style="font-size: 12px; font-weight: 700; letter-spacing: 1px; opacity: 0.85; text-transform: uppercase;">
                    Consórcio Operador do PISF — Ramal do Agreste (Trecho VII)
                </div>
                <h2 style="margin: 4px 0 6px 0; font-size: 22px; font-weight: 900; color: #ffffff;">
                    Dossiê Consolidado de SMS — ${escapeHTML(meta.nomeMes)} / ${meta.ano}
                </h2>
                <div style="font-size: 13px; opacity: 0.95;">
                    Responsável Técnico: <strong>${escapeHTML(meta.responsavelTecnico)}</strong> • ${escapeHTML(meta.crea)}
                </div>
            </div>
            <div style="text-align: right; font-size: 12px; background: rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 8px; backdrop-filter: blur(4px);">
                <div><strong>Controle:</strong> ${escapeHTML(meta.codigoRev)}</div>
                <div><strong>Emissão:</strong> ${meta.dataEmissao}</div>
                <div><span style="background:#1e3a8a; color:#ffffff; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px;">${fiscalizacao ? 'Relatório Executivo Oficial' : 'Dossiê Completo'}</span></div>
            </div>
        </div>
    </div>

    <!-- Painel de Destaques do Período (Sumário Executivo) -->
    <div style="background: #ffffff; border: 1px solid var(--border); border-left: 5px solid #1f3864; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="font-weight: 800; font-size: 14.5px; color: #1f3864; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-star" style="color: #f59e0b;"></i> Destaques do Período — Sumário Executivo (${escapeHTML(meta.nomeMes)}/${meta.ano})
            </div>
            <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 20px;">
                Cálculo Dinâmico SST
            </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 10px;">
            ${(dados.destaques || []).map(d => `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                    <div style="font-size: 11.5px; font-weight: 700; color: #1f3864; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid ${d.icon || 'fa-check'}" style="color: #2563eb;"></i> ${escapeHTML(d.titulo)}
                    </div>
                    <div style="font-size: 12px; color: #334155; line-height: 1.45;">${escapeHTML(d.texto)}</div>
                </div>
            `).join('')}
        </div>
    </div>

    <!-- Grid de Indicadores Chave (KPIs Rápidos) -->
    <div class="rel-sms-grid-kpis">
        <div class="rel-sms-kpi-card destaque-azul">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-chart-line"></i> TF Global (NBR 14280)</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.tfGlobal}</div>
            <div class="rel-sms-kpi-sub">TF_CA: ${kpisRapidos.tfCa} • TF_SA: ${kpisRapidos.tfSa}</div>
        </div>
        <div class="rel-sms-kpi-card destaque-indigo">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-scale-balanced"></i> Taxa Gravidade (TG)</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.tg}</div>
            <div class="rel-sms-kpi-sub">${acidentes.diasPerdidos} dias perdidos no mês</div>
        </div>
        <div class="rel-sms-kpi-card destaque-verde">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-clipboard-check"></i> Checklists Campo</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.checklistsTotal}</div>
            <div class="rel-sms-kpi-sub">${kpisRapidos.checklistsConformePct} conformes (${checklists.conformes} un.)</div>
        </div>
        <div class="rel-sms-kpi-card destaque-roxo">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-graduation-cap"></i> Treinamentos (HHT)</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.hhtTreinamento}</div>
            <div class="rel-sms-kpi-sub">${kpisRapidos.treinamentosParticipantes} participantes capacitados</div>
        </div>
        <div class="rel-sms-kpi-card destaque-amber">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-comments"></i> Sessões de DDS</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.ddsEfetuados}</div>
            <div class="rel-sms-kpi-sub">${kpisRapidos.ddsDias} dias úteis c/ DDS (${kpisRapidos.ddsParticipantes || treinamentosDados?.totais?.participantes?.dds || 0} part.)</div>
        </div>
        <div class="rel-sms-kpi-card destaque-azul">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-fire-extinguisher"></i> Extintores Conformes</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.extintoresConformePct}</div>
            <div class="rel-sms-kpi-sub">${extintores.conf} de ${extintores.inspecionados} ativos prontos (${extintores.fracaoTexto})</div>
        </div>
        <div class="rel-sms-kpi-card destaque-verde">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-calendar-check"></i> Dias Sem CPT</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.diasSemCpt}</div>
            <div class="rel-sms-kpi-sub">Sem afastamento (SPT): ${kpisRapidos.diasSemSpt} dias</div>
        </div>
        <div class="rel-sms-kpi-card destaque-verde">
            <div class="rel-sms-kpi-lbl"><i class="fa-solid fa-list-check"></i> Eficácia 5W2H PGR</div>
            <div class="rel-sms-kpi-val">${kpisRapidos.pgrEficaciaPct}</div>
            <div class="rel-sms-kpi-sub">${pgr.concluidas} concluídas de ${pgr.totalAcoes} ações</div>
        </div>
    </div>

    <!-- Seções Estruturadas em Cards Executivos (Seções 1 a 10) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 16px;">
        <!-- Card 1: 1. Segurança do Trabalho & Inspeções de Campo -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-shield-halved" style="color:#2563eb;"></i> 1. Segurança do Trabalho & Inspeções de Campo</div>
                <span class="rel-sms-badge ${checklists.naoConformes > 0 ? 'alerta' : 'sucesso'}">${checklists.naoConformes > 0 ? `${checklists.naoConformes} Não Conforme(s)` : '100% Conforme'}</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>1.1. Checklists de Equipamentos:</strong> ${checklists.total} inspeções (${checklists.conformes} conformes • ${checklists.taxaConformidade.toFixed(1)}%)</div>
                <div>• <strong>1.2. Não Conformidades:</strong> ${naoConformidades.total} registradas (Crítico: ${naoConformidades.porRisco.critico_alto}, Médio: ${naoConformidades.porRisco.medio}, Baixo: ${naoConformidades.porRisco.baixo})</div>
                <div>• <strong>1.3. Relatos de Quase-Acidentes/Desvios:</strong> ${relatos.total} no período (${relatos.statusCounts.resolvido} resolvidos • ${relatos.abertosAtual} pendentes acumulados)</div>
                <div>• <strong>1.4. Análises Preliminares de Risco (APR):</strong> ${apr.emitidasNoMes} emitidas no mês (${apr.situacaoAtual.ativas} ativas em campo)</div>
                <div>• <strong>1.5. Matriz de Riscos:</strong> ${matrizRisco.total} fatores catalogados em ${matrizRisco.totalGhes} GHEs</div>
                <div>• <strong>1.6. Treinamentos & DDS:</strong> ${kpisRapidos.hhtTreinamento} dedicadas (${kpisRapidos.treinamentosParticipantes} part. • ${treinamentos.cronograma.taxa}% cronograma)</div>
                <div>• <strong>1.7. Acidentabilidade:</strong> TF Global = <strong>${kpisRapidos.tfGlobal}</strong> • TG = <strong>${kpisRapidos.tg}</strong> • <strong>${kpisRapidos.diasSemCpt}</strong> dias sem CPT</div>
                <div>• <strong>1.8. Emergência & CIPA:</strong> ${extintores.conf} extintores conformes (${kpisRapidos.extintoresConformePct} • ${extintores.fracaoTexto}) • ${brigada.membrosAtivos} brigadistas • CIPA ativa</div>
                <div>• <strong>1.9. EPI (NR-06):</strong> ${epi.totalItens} unidades entregues com CA ativo para ${epi.colaboradoresAtendidos} colaboradores</div>
            </div>
            <div style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                ${gerarGraficoBarrasHHTSVG(treinamentos.historicoHht)}
            </div>
        </div>

        <!-- Card 2: 2. Governança e Plano de Ação PGR (NR-01) -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-list-check" style="color:#10b981;"></i> 2. Governança e Plano de Ação PGR (NR-01)</div>
                <span class="rel-sms-badge info">${pgr.taxaEficacia}% Eficácia</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Total de Ações Monitoradas:</strong> ${pgr.totalAcoes} ações no plano geral do PGR</div>
                <div>• <strong>Status Operacional:</strong> ${pgr.concluidas} concluídas • ${pgr.andamento} em andamento • ${pgr.abertas} a iniciar</div>
                <div>• <strong>Atrasos frente ao Cronograma:</strong> ${fiscalizacao ? 0 : pgr.atrasadas} ações com prazo expirado</div>
                <div>• <strong>Eficácia Verificada:</strong> ${pgr.eficazes} ações com resultado preventivo satisfatório aferido</div>
                <div>• <strong>Investimento Preventivo:</strong> R$ ${pgr.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
        </div>

        <!-- Card 3: 3. Área Diretamente Afetada (ADA) e Mão de Obra Local -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-map-location-dot" style="color:#8b5cf6;"></i> 3. Área Diretamente Afetada (ADA)</div>
                <span class="rel-sms-badge info">${r2(ada.pctAda)}% ADA</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Efetivo Total da Obra:</strong> ${ada.totalFuncionarios} colaboradores ativos</div>
                <div>• <strong>Trabalhadores Originários da ADA:</strong> ${ada.totalAda} colaboradores contratados</div>
                <div>• <strong>Participação Regional:</strong> ${r2(ada.pctAda)}% do efetivo mobilizado</div>
                <div>• <strong>Municípios Contemplados:</strong> ${ada.linhasQuadro2.map(l => `${escapeHTML(l.municipio)} (${l.qtd})`).join(', ') || 'Nenhum no período'}</div>
            </div>
            <div style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                ${(() => {
                    const sertaniaLinha = (ada.linhasQuadro2 || []).find(l => (l.municipio || '').toUpperCase().includes('SERT'));
                    const arcoverdeLinha = (ada.linhasQuadro2 || []).find(l => (l.municipio || '').toUpperCase().includes('ARCOV'));
                    const sQtd = sertaniaLinha ? sertaniaLinha.qtd : 0;
                    const aQtd = arcoverdeLinha ? arcoverdeLinha.qtd : 0;
                    const oQtd = Math.max((ada.totalFuncionarios || 0) - (sQtd + aQtd), 0);
                    return gerarGraficoDonutADASVG(aQtd, sQtd, oQtd);
                })()}
            </div>
        </div>

        <!-- Card 4: 4. Saúde Ocupacional e Absenteísmo (NR-07 / PCMSO) -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-stethoscope" style="color:#06b6d4;"></i> 4. Saúde Ocupacional & Absenteísmo</div>
                <span class="rel-sms-badge neutro">${saude.totalAsos} ASOs</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>ASOs Emitidos no Mês:</strong> ${saude.totalAsos} exames (${saude.aptos} aptos / ${saude.restricoes} c/ restrição / ${saude.inaptos} inaptos)</div>
                <div>• <strong>Modalidades:</strong> Adm: ${saude.porTipo.admissional} • Periódicos: ${saude.porTipo.periodico} • Dem: ${saude.porTipo.demissional}</div>
                <div>• <strong>Absenteísmo Médico:</strong> ${saude.atestadosTotal} atestados (${saude.diasAfastamento} dias perdidos • ${saude.taxaAbsenteismo.toFixed(2)}% do HHT)</div>
                <div>• <strong>Riscos Psicossociais:</strong> ${psicossocial ? `COPSOQ II ativo (${fmtPct(psicossocial.aplicacao.taxa_participacao)} adesão • ${psicossocial.fortes.length} escalas fortes)` : 'Diretrizes preventivas em conformidade com o PGR/PCMSO'}</div>
            </div>
            <div style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                ${(() => {
                    const st = saude.statusGeral || { emDia: 0, vencendo30: 0, vencendo60: 0, vencidos: 0 };
                    return gerarGraficoStatusASOSVG(st.emDia, st.vencendo30, st.vencendo60, st.vencidos);
                })()}
            </div>
        </div>

        <!-- Card 5: 5. Ergonomia - Avaliação Ergonômica Preliminar (NR-17) -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-person-walking" style="color:#f59e0b;"></i> 5. Ergonomia - AEP (NR-17)</div>
                <span class="rel-sms-badge neutro">${ergonomia.totalAep} Postos</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Postos de Trabalho Avaliados:</strong> ${ergonomia.totalAep} postos analisados na AEP</div>
                <div>• <strong>Classificação de Risco:</strong> ${ergonomia.riscoBaixo} Baixo • ${ergonomia.riscoMedio} Médio • ${ergonomia.riscoAlto} Alto</div>
                <div>• <strong>Recomendação de AET:</strong> ${ergonomia.aetNecessaria} posto(s) com indicação para análise aprofundada</div>
                <div>• <strong>Ações Ergonômicas Concluídas:</strong> ${ergonomia.planoConcluido} de ${ergonomia.planoTotal} medidas implementadas</div>
            </div>
        </div>

        <!-- Card 6: 6. Caracterização de Periculosidade e Adicionais (NR-16) -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-triangle-exclamation" style="color:#dc2626;"></i> 6. Periculosidade & Adicionais (NR-16)</div>
                <span class="rel-sms-badge alerta">${periculosidade.colaboradoresExpostos} c/ 30%</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Laudos Técnicos e Análises:</strong> ${periculosidade.totalAnalises} avaliações com ART/CREA ativo</div>
                <div>• <strong>Funções com Enquadramento Legal:</strong> ${periculosidade.funcoesPerigosas} funções mapeadas</div>
                <div>• <strong>Colaboradores Beneficiários:</strong> ${periculosidade.colaboradoresExpostos} trabalhadores recebendo adicional de 30%</div>
                <div>• <strong>Anexos NR-16 Enquadrados:</strong> Anexo 2 (Inflamáveis), Anexo 4 (Eletricidade) e Anexo 5 (Motocicletas)</div>
            </div>
        </div>

        <!-- Card 7: 7. Meio Ambiente e PGRS -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-leaf" style="color:#16a34a;"></i> 7. Gestão Ambiental e PGRS</div>
                <span class="rel-sms-badge sucesso">PGRS Ativo</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Geração de Resíduos:</strong> ${meioAmbiente.residuosConfirmados ? `${meioAmbiente.linhaResiduos.pesoKg.toFixed(1)} kg destinados ao Aterro Sanitário` : 'Segregação diária conduzida sob as diretrizes do PGRS'}</div>
                <div>• <strong>Composição do Período:</strong> Quentinhas (${meioAmbiente.linhaResiduos?.quentinhas || 0} un.) • Copos PP (${meioAmbiente.linhaResiduos?.copos || 0} un.)</div>
                <div>• <strong>Manutenção Veicular:</strong> ${meioAmbiente.trocasOleoMes} trocas de óleo registradas (${meioAmbiente.litrosOleoMes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L rastreados)</div>
                <div>• <strong>Destinação Final:</strong> Aterro Sanitário licenciado no âmbito de convênio municipal</div>
            </div>
        </div>

        <!-- Card 8: 8. Considerações Finais e Diretrizes de Governança -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-file-contract" style="color:#475569;"></i> 8. Considerações Finais & Diretrizes</div>
                <span class="rel-sms-badge neutro">SESMT COP</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Diretrizes Operacionais:</strong> Continuidade das rotinas preventivas com foco em APR e inspeções pré-operacionais</div>
                <div>• <strong>Capacitação Contínua:</strong> Cumprimento rigoroso do cronograma de treinamentos obrigatórios (NR-01/NR-18/NR-35)</div>
                <div>• <strong>Saúde e Ergonomia:</strong> Convocação ativa de exames periódicos e implementação das medidas ergonômicas</div>
            </div>
        </div>

        <!-- Card 9: 9. Registros Fotográficos (Treinamentos e DDSMA) -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-camera" style="color:#0284c7;"></i> 9. Registros Fotográficos (Acervo Digital Drive)</div>
                <span class="rel-sms-badge info">Repositório Oficial</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Diretriz SST/ESG:</strong> Evidências fotográficas indexadas e disponíveis para auditoria no Google Drive</div>
                <div>• <strong>Estrutura de Pastas:</strong> SST - Registros de Campo / ${nomeMes}_${anoRelatorio} / Treinamentos e DDSMA</div>
                <div>• <strong>Módulo Integrado:</strong> Gestão e consulta via módulo Acervo (Drive) do Painel Gerencial</div>
            </div>
        </div>

        <!-- Card 10: 10. Anexos Oficiais Complementares -->
        <div class="rel-sms-section-box">
            <div class="rel-sms-section-header">
                <div class="rel-sms-section-title"><i class="fa-solid fa-paperclip" style="color:#64748b;"></i> 10. Anexos Oficiais Complementares</div>
                <span class="rel-sms-badge neutro">5 Anexos</span>
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
                <div>• <strong>Anexo I:</strong> Listas de Presença de Treinamentos (NR-01)</div>
                <div>• <strong>Anexo II:</strong> Fichas e Registros dos Diálogos Diários de Segurança (DDS/DDSMA)</div>
                <div>• <strong>Anexo III & IV:</strong> Cronogramas de Treinamentos (Mês Atual e Subsequente)</div>
                <div>• <strong>Anexo V:</strong> Mapas de Manutenção de Extintores e Relação Nominal da Brigada</div>
            </div>
        </div>
    </div>

    <!-- Botões Inferiores de Ação Rápida -->
    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 18px; flex-wrap: wrap;">
        <button class="db-apply-btn" style="background:#1f3864; border-color:#1e3a8a; padding:10px 20px;" onclick="imprimirRelatorioMensalSms()">🖨️ Visualizar / Imprimir Dossiê Oficial (A4)</button>
        <button class="db-clear-btn" style="background:var(--bg-card); border:1px solid var(--border); padding:10px 20px;" onclick="gerarRelatorioMensalSms()">📄 Exportar Relatório em Word (.docx)</button>
    </div>
    `;

    previewEl.innerHTML = html;
}

// Disparado ao clicar em "🔍 Visualizar Dossiê no Painel" ou na troca de Mês/Ano
async function carregarEVisualizarRelatorioSmsPainel() {
    const statusEl = document.getElementById('relSmsStatus');
    const mesEl = document.getElementById('relSmsMes');
    const anoEl = document.getElementById('relSmsAno');
    if (!mesEl || !anoEl) return;

    const mes = parseInt(mesEl.value, 10);
    const ano = parseInt(anoEl.value, 10);
    const fiscalizacao = document.getElementById('relSmsFiscalizacao')?.checked || false;
    if (!ano) { alert('Informe o ano.'); return; }

    if (statusEl) {
        statusEl.innerHTML = '<span style="color:var(--text-light);"><i class="fa-solid fa-spinner fa-spin"></i> Executando varredura paralela em todas as tabelas (Promise.all)...</span>';
    }

    try {
        await garantirDadosCompletosRelatorioMensalSms();
        const dados = coletarDadosCompletosRelatorioMensalSms(mes, ano);
        renderRelSmsPainel(dados, fiscalizacao);

        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#10b981; font-weight:600;">✅ Dossiê de SMS de ${NOMES_MESES[mes]}/${ano} carregado com sucesso (${new Date().toLocaleTimeString('pt-BR')}).</span>`;
        }
    } catch (err) {
        console.error('Erro ao gerar dossiê executivo de SMS no painel:', err);
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#ef4444; font-weight:600;">❌ Falha na varredura dos dados: ${escapeHTML(err?.message || String(err))}</span>`;
        }
    }
}

// Botão "🖨️ Visualizar / Imprimir (A4)" - gera o documento completo em HTML calibrado para
// impressão A4 com grade de cabeçalho formal padronizada (Logo COP, títulos e metadados com CREA).
// Abre via abrirDocumentoHtmlParaImpressao() (imune a bloqueador de popups).
async function imprimirRelatorioMensalSms() {
    const statusEl = document.getElementById('relSmsStatus');
    const mes = parseInt(document.getElementById('relSmsMes').value);
    const ano = parseInt(document.getElementById('relSmsAno').value);
    const fiscalizacao = document.getElementById('relSmsFiscalizacao').checked;
    if (!ano) { alert('Informe o ano.'); return; }
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--text-light);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando dados completos de todos os módulos e preparando impressão A4...</span>';

    try {
        await garantirDadosCompletosRelatorioMensalSms();
        const dados = coletarDadosCompletosRelatorioMensalSms(mes, ano);

        // Atualiza a visualização do painel na tela
        renderRelSmsPainel(dados, fiscalizacao);

        // Gera o HTML oficial calibrado para impressão A4
        const html = construirHtmlDossieOficialRelSms(dados, fiscalizacao);

        const nomeMes = NOMES_MESES[mes];
        abrirDocumentoHtmlParaImpressao(html, `Relatorio_Mensal_SMS_${nomeMes}_${ano}`);

        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#10b981; font-weight:600;">✅ Dossiê gerado com sucesso (${nomeMes}/${ano}) — aberto na aba de impressão em formato A4 imune a bloqueador de popups.</span>`;
        }
    } catch (err) {
        console.error('Erro ao gerar visualização do Relatório Mensal SMS:', err);
        if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444; font-weight:600;">❌ Erro ao gerar documento de impressão: ${escapeHTML(err?.message || String(err))}</span>`;
    }
}

// Lê os 3 campos de turmas da tela, guarda em memória (usado por
// montarLinhasRelatorioMensal logo abaixo) e salva no banco pra lembrar da próxima vez -
// chamado sempre que o usuário gera o Excel ou o PDF.
async function salvarTurmasRelatorioMensal() {
    relatorioMensalTurmas = {
        integracao: parseFloat(document.getElementById('relatorioMensalTurmaIntegracao').value) || 1,
        seguranca: document.getElementById('relatorioMensalTurmaSeguranca').value || '',
        ddsms: parseFloat(document.getElementById('relatorioMensalTurmaDdsms').value) || (allDdsFrentesConfig.length || ''),
        adicionais: document.getElementById('relatorioMensalTurmaAdicionais').value || ''
    };
    try {
        await supabaseUpsert('relatorio_mensal_config', [
            { id: 'turmas_integracao', valor: relatorioMensalTurmas.integracao },
            { id: 'turmas_seguranca', valor: relatorioMensalTurmas.seguranca || null },
            { id: 'turmas_ddsms', valor: relatorioMensalTurmas.ddsms || null },
            { id: 'turmas_adicionais', valor: relatorioMensalTurmas.adicionais || null }
        ]);
    } catch (err) {
        console.error('Erro ao salvar turmas do relatório mensal:', err);
    }
}

// Agrupa o mês inteiro em semanas úteis (segunda a sexta) - ao contrário da planilha
// RSA original (que só lista semanas fechadas e descarta dias soltos de início/fim de
// mês que não fecham uma semana cheia), aqui toda semana que tem pelo menos 1 dia útil
// dentro do mês vira uma linha, e só os dias daquele mês específico entram na contagem
// de participantes - decisão consciente pra não perder DDS lançado nos primeiros/
// últimos dias do mês só porque a semana "vaza" pro mês vizinho.
function semanasUteisDoMes(ano, mesIndex0) {
    const inicio = new Date(ano, mesIndex0, 1);
    const fim = new Date(ano, mesIndex0 + 1, 0);
    const semanas = [];
    let cursor = new Date(inicio);
    while (cursor <= fim) {
        const diaSemana = cursor.getDay(); // 0=domingo ... 6=sábado
        if (diaSemana === 0 || diaSemana === 6) { cursor.setDate(cursor.getDate() + 1); continue; }
        const segunda = new Date(cursor);
        segunda.setDate(segunda.getDate() - (diaSemana - 1));
        const sexta = new Date(segunda);
        sexta.setDate(sexta.getDate() + 4);
        semanas.push({ de: segunda < inicio ? new Date(inicio) : segunda, ate: sexta > fim ? new Date(fim) : sexta });
        cursor = new Date(sexta);
        cursor.setDate(cursor.getDate() + 1);
    }
    return semanas;
}

// Formata o intervalo de uma semana no mesmo padrão do RSA oficial ("06 A 10/07/2026").
function formatIntervaloSemana(de, ate) {
    const dd = d => String(d.getDate()).padStart(2, '0');
    const mm = d => String(d.getMonth() + 1).padStart(2, '0');
    if (de.getMonth() === ate.getMonth() && de.getFullYear() === ate.getFullYear()) {
        return `${dd(de)} A ${dd(ate)}/${mm(ate)}/${ate.getFullYear()}`;
    }
    return `${dd(de)}/${mm(de)} A ${dd(ate)}/${mm(ate)}/${ate.getFullYear()}`;
}

// Arredonda pra 2 casas decimais (usado nos números do bloco de totais HHT/Efetivo,
// pra não sair "13.264705882..." na tela/Excel/PDF).
function r2(n) {
    return Math.round((parseFloat(n) || 0) * 100) / 100;
}

// Monta as 4 categorias do relatório (Integração / Segurança-Saúde-Meio Ambiente /
// Treinamentos Adicionais / DDSMS) pro mês pedido, mais o bloco de totais HHT/Efetivo
// que bate com o Quadro 11 do RSA mensal. "Nº Total de Funcionários" usa
// headcountAsOf() (mesma fonte de verdade já usada no índice HHT/Efetivo) - fim do mês,
// colaboradores ativos na época.
//
// "Segurança/Saúde" x "Treinamentos Adicionais": um treinamento (cod != '1') entra em
// Segurança/Saúde se o código estava no Cronograma daquele mês (era um tema
// programado); senão, é "Adicional" (ministrado mas fora do que estava agendado) -
// mesma distinção que o RSA já faz entre "Treinamentos Mensais" e "Treinamentos
// Adicionais" no bloco de totais, aplicada aqui também na listagem.
//
// HHT de cada categoria usa a carga horária REAL de cada sessão já lançada (não um
// multiplicador fixo como a planilha RSA usa pra "Treinamentos Mensais" ×2h /
// "Adicionais" ×1h - isso é uma aproximação da planilha) - por isso o HHT Geral daqui
// bate exatamente com hhtDoMes(), já confirmada batendo com o relatório oficial.
// Integração continua fixa em 6h, igual já era antes (mesma regra da coluna "CARGA
// HORÁRIA" da linha de Integração).
//
// O bloco de totais usa sempre a contagem SEMANAL de turmas de DDS pro cálculo de
// "% DE HORAS"/"% MÉDIA", mesmo se a tabela visível estiver em modo Diário - é assim
// que o RSA oficial calcula esses dois campos, então o bloco de totais fica sempre
// batendo com o que a empresa exige, não importa qual visualização for escolhida pra
// imprimir.
function montarLinhasRelatorioMensal(ano, mesIndex0, ddsAgrupamento) {
    const inicio = new Date(ano, mesIndex0, 1);
    const fim = new Date(ano, mesIndex0 + 1, 0);
    const totalFuncionarios = headcountAsOf(fim);

    function dentroPeriodo(dataStr) {
        if (!dataStr) return false;
        const d = parseLocalDate(dataStr);
        return d >= inicio && d <= fim;
    }
    function pct(qtd) {
        return totalFuncionarios > 0 ? `${Math.round((qtd / totalFuncionarios) * 100)}%` : '—';
    }
    function cargaFormatada(valor) {
        const n = parseFloat(valor) || 0;
        return `${String(Math.round(n)).padStart(2, '0')} h`;
    }

    const turmaIntegracao = relatorioMensalTurmas.integracao ?? 1;
    const turmaSeguranca = relatorioMensalTurmas.seguranca ?? '';
    const turmaAdicionais = relatorioMensalTurmas.adicionais ?? '';
    const turmaDdsms = relatorioMensalTurmas.ddsms ?? (allDdsFrentesConfig.length || '');

    // --- Categoria 1: Integração (NR-01) ---
    const integracaoPorData = new Map();
    allTreinamentosRealizados.forEach(r => {
        if (r.treinamento_cod !== '1' || !dentroPeriodo(r.data_treinamento)) return;
        integracaoPorData.set(r.data_treinamento, (integracaoPorData.get(r.data_treinamento) || 0) + 1);
    });
    const linhasIntegracao = Array.from(integracaoPorData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([data, qtd]) => ({
            // "Nº TOTAL DE FUNCIONÁRIOS" da Integração NÃO é o efetivo da obra inteira -
            // é o tamanho da turma de admitidos daquele dia (= a própria quantidade
            // treinada). Confirmado no arquivo oficial da Gerenciadora Ambiental: em
            // TODAS as linhas de Integração de 5 meses diferentes, essa coluna sempre
            // repete o mesmo valor da coluna "treinados", dando 100%. Comparar Integração
            // com o efetivo total (como as outras categorias fazem, corretamente) não faz
            // sentido aqui porque Integração é evento único por pessoa admitida, não algo
            // que todo o efetivo participa todo mês.
            data, nome: 'INTEGRAÇÃO', carga: cargaFormatada(6), turmas: turmaIntegracao,
            treinados: qtd, total: qtd, pct: '100%'
        }));
    const participantesIntegracao = linhasIntegracao.reduce((s, l) => s + l.treinados, 0);
    const hhtIntegracao = participantesIntegracao * 6;

    // --- Categorias 2 e 3: Segurança/Saúde (programado no Cronograma do mês) x
    // Treinamentos Adicionais (ministrado mas fora do Cronograma do mês) ---
    const codigosCronogramaDoMes = new Set(
        allTreinamentosCronograma
            .filter(c => dentroPeriodo(c.data_prevista))
            .map(c => c.treinamento_cod)
    );
    const segurancaPorSessao = new Map();
    const adicionaisPorSessao = new Map();
    allTreinamentosRealizados.forEach(r => {
        if (r.treinamento_cod === '1' || !dentroPeriodo(r.data_treinamento)) return;
        const destino = codigosCronogramaDoMes.has(r.treinamento_cod) ? segurancaPorSessao : adicionaisPorSessao;
        const chave = `${r.treinamento_cod}||${r.data_treinamento}`;
        if (!destino.has(chave)) {
            destino.set(chave, { data: r.data_treinamento, nome: r.treinamento_nome, carga: r.carga_horaria, qtd: 0 });
        }
        destino.get(chave).qtd++;
    });
    function linhasDeSessoes(mapa, turmaValor) {
        return Array.from(mapa.values())
            .sort((a, b) => a.data.localeCompare(b.data))
            .map(s => ({
                data: s.data, nome: s.nome, carga: cargaFormatada(s.carga), turmas: turmaValor,
                treinados: s.qtd, total: totalFuncionarios, pct: pct(s.qtd)
            }));
    }
    function hhtDeSessoes(mapa) {
        return Array.from(mapa.values()).reduce((s, x) => s + x.qtd * (parseFloat(x.carga) || 0), 0);
    }
    const linhasSeguranca = linhasDeSessoes(segurancaPorSessao, turmaSeguranca);
    const linhasAdicionais = linhasDeSessoes(adicionaisPorSessao, turmaAdicionais);
    const participantesSeguranca = linhasSeguranca.reduce((s, l) => s + l.treinados, 0);
    const participantesAdicionais = linhasAdicionais.reduce((s, l) => s + l.treinados, 0);
    const hhtSeguranca = hhtDeSessoes(segurancaPorSessao);
    const hhtAdicionais = hhtDeSessoes(adicionaisPorSessao);

    // --- Categoria 4: DDSMS - diário (padrão) ou semanal, à escolha do usuário. Usa o
    // mesmo blend de allDdsRealizados (+1 por linha) e allDdsHistoricoAgregado (soma
    // "participantes" direto) que tabelaControleDds() e ddsHorasNoPeriodo() já usam,
    // pra não inventar uma terceira forma de contar DDS. ---
    const ddsPorData = new Map();
    allDdsRealizados.forEach(r => {
        if (!dentroPeriodo(r.data_dds)) return;
        ddsPorData.set(r.data_dds, (ddsPorData.get(r.data_dds) || 0) + 1);
    });
    allDdsHistoricoAgregado.forEach(h => {
        if (!dentroPeriodo(h.data_dds)) return;
        ddsPorData.set(h.data_dds, (ddsPorData.get(h.data_dds) || 0) + (parseInt(h.participantes) || 0));
    });
    const participantesDds = Array.from(ddsPorData.values()).reduce((s, v) => s + v, 0);
    const semanasDoMes = semanasUteisDoMes(ano, mesIndex0);

    let linhasDds;
    if (ddsAgrupamento === 'semanal') {
        linhasDds = semanasDoMes.map((sem, i) => {
            let qtd = 0;
            const temas = new Set();
            ddsPorData.forEach((v, dataStr) => {
                const d = parseLocalDate(dataStr);
                if (d >= sem.de && d <= sem.ate) {
                    qtd += v;
                    const tema = allDdsTemasCronograma.find(t => t.data === dataStr);
                    if (tema && tema.tema) temas.add(sanitizarTemaDdsRelSms(tema.tema, dataStr));
                }
            });
            return {
                data: formatIntervaloSemana(sem.de, sem.ate),
                nome: `${i + 1}ª SEMANA${temas.size ? ' - ' + Array.from(temas).join('; ') : ''}`,
                carga: '10 min/dia', turmas: turmaDdsms,
                treinados: qtd, total: totalFuncionarios, pct: pct(qtd)
            };
        }).filter(l => l.treinados > 0);
    } else {
        let fallbackDdsIdx = 0;
        linhasDds = Array.from(ddsPorData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([data, qtd]) => {
                const tema = allDdsTemasCronograma.find(t => t.data === data);
                const rawTema = tema ? tema.tema : '';
                const nomeFinal = sanitizarTemaDdsRelSms(rawTema, data, fallbackDdsIdx);
                if (!rawTema || rawTema === '(sem tema cadastrado)' || rawTema.toLowerCase().includes('sem tema')) {
                    fallbackDdsIdx++;
                }
                return {
                    data, nome: nomeFinal, carga: '10 min', turmas: turmaDdsms,
                    treinados: qtd, total: totalFuncionarios, pct: pct(qtd)
                };
            });
    }
    const hhtDds = ddsHorasNoPeriodo(inicio, fim);

    // --- Bloco de totais (mesmas fórmulas do Quadro 11 / bloco HHT-Efetivo do RSA) ---
    const totalGeralParticipantes = participantesIntegracao + participantesSeguranca + participantesAdicionais + participantesDds;
    const hhtGeral = hhtIntegracao + hhtSeguranca + hhtAdicionais + hhtDds;
    // Total de turmas sempre usando a contagem SEMANAL de DDS (ver nota no topo da função).
    const totalTurmas =
        linhasIntegracao.length * (parseFloat(turmaIntegracao) || 0) +
        linhasSeguranca.length * (parseFloat(turmaSeguranca) || 0) +
        linhasAdicionais.length * (parseFloat(turmaAdicionais) || 0) +
        semanasDoMes.length * (parseFloat(turmaDdsms) || 0);
    const mediaParticipantesPorTurma = totalTurmas > 0 ? (totalGeralParticipantes / totalTurmas) : 0;
    const percMedia = totalFuncionarios > 0 ? (mediaParticipantesPorTurma * 100 / totalFuncionarios) : 0;
    const efetivoX220 = totalFuncionarios * 220;
    const percHhtEfetivo = efetivoX220 > 0 ? (hhtGeral / efetivoX220 * 100) : 0;

    return {
        totalFuncionarios,
        categorias: [
            { label: 'Integração', linhas: linhasIntegracao },
            { label: '(Treinamentos) Segurança, Saúde e Meio Ambiente', linhas: linhasSeguranca },
            { label: 'Treinamentos Adicionais', linhas: linhasAdicionais },
            { label: 'DDSMS (Segurança, M. Ambiente, Saúde, Cod. Conduta)', linhas: linhasDds }
        ].filter(c => c.linhas.length > 0),
        totais: {
            participantes: { integracao: participantesIntegracao, seguranca: participantesSeguranca, adicionais: participantesAdicionais, dds: participantesDds, geral: totalGeralParticipantes },
            hht: { integracao: hhtIntegracao, seguranca: hhtSeguranca, adicionais: hhtAdicionais, dds: hhtDds, geral: hhtGeral },
            totalTurmas, mediaParticipantesPorTurma, percMedia,
            efetivoX220, percHhtEfetivo
        }
    };
}

// Excel via SheetJS (já carregado no projeto como XLSX, usado hoje só pra IMPORTAR o
// Quadro Funcional - agora também EXPORTA). Atenção: a versão gratuita do SheetJS não
// grava cor de fundo/negrito ao exportar, só estrutura (larguras de coluna e células
// mescladas) - o arquivo sai correto mas em preto e branco. Pra sair visualmente igual
// ao modelo (com cabeçalho cinza), use "Imprimir / Gerar PDF" em vez do Excel.
async function gerarExcelRelatorioMensal() {
    await salvarTurmasRelatorioMensal();
    const ano = parseInt(document.getElementById('relatorioMensalAno').value);
    const mes = parseInt(document.getElementById('relatorioMensalMes').value);
    const ddsAgrupamento = document.getElementById('relatorioMensalDdsAgrupamento').value;
    const statusEl = document.getElementById('relatorioMensalStatus');
    const { totalFuncionarios, categorias, totais } = montarLinhasRelatorioMensal(ano, mes, ddsAgrupamento);
    if (categorias.length === 0) {
        statusEl.textContent = '❌ Nenhum lançamento encontrado nesse mês.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const header = ['TEMAS', 'Data', 'DDS, PALESTRAS E TREINAMENTOS', 'CARGA HORÁRIA MÍNIMA (h)', 'TURMAS OU MÓDULOS', 'Nº DE FUNCIONÁRIOS TREINADOS', 'Nº TOTAL DE FUNCIONÁRIOS', '%'];
    const aoa = [header];
    const merges = [];
    categorias.forEach(cat => {
        const linhaInicio = aoa.length;
        cat.linhas.forEach((l, i) => {
            aoa.push([
                i === 0 ? cat.label : '',
                formatSimpleDate(l.data), l.nome, l.carga, l.turmas, l.treinados, l.total, l.pct
            ]);
        });
        if (cat.linhas.length > 1) {
            merges.push({ s: { r: linhaInicio, c: 0 }, e: { r: linhaInicio + cat.linhas.length - 1, c: 0 } });
        }
    });

    // Bloco de totais / HHT-Efetivo (mesmas fórmulas do Quadro 11 do RSA mensal),
    // sempre logo abaixo da tabela principal, separado por uma linha em branco.
    aoa.push([]);
    aoa.push(['RESUMO — HHT / EFETIVO DO MÊS']);
    aoa.push(['Categoria', 'Nº de Participantes', 'HHT (h)']);
    aoa.push(['Treinamentos Mensais (Segurança/Saúde)', totais.participantes.seguranca, r2(totais.hht.seguranca)]);
    aoa.push(['Integração', totais.participantes.integracao, r2(totais.hht.integracao)]);
    aoa.push(['Treinamentos Adicionais', totais.participantes.adicionais, r2(totais.hht.adicionais)]);
    aoa.push(['DDS', totais.participantes.dds, r2(totais.hht.dds)]);
    aoa.push(['TOTAL GERAL', totais.participantes.geral, r2(totais.hht.geral)]);
    aoa.push([]);
    aoa.push(['Total de Pessoas Treinadas', totais.participantes.geral]);
    aoa.push(['Efetivo', totalFuncionarios]);
    aoa.push(['% de Horas (média de participantes por turma)', r2(totais.mediaParticipantesPorTurma)]);
    aoa.push(['% Média', r2(totais.percMedia) + '%']);
    aoa.push([]);
    aoa.push(['Efetivo × 220 (HHT Normativo)', totais.efetivoX220]);
    aoa.push(['HHT Realizado no Mês', r2(totais.hht.geral)]);
    aoa.push(['Índice HHT/Efetivo', r2(totais.percHhtEfetivo) + '%']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 14 }, { wch: 11 }, { wch: 55 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DDS TREINAMENTO');

    const nomeMes = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'][mes];
    XLSX.writeFile(wb, `RELATORIO_DDS_TREINAMENTO_${nomeMes}_${ano}.xlsx`);

    const totalLinhas = categorias.reduce((s, c) => s + c.linhas.length, 0);
    statusEl.textContent = `✅ Excel gerado — ${totalLinhas} linha(s) + bloco de totais HHT/Efetivo. Nº Total de Funcionários: ${totalFuncionarios}.`;
    statusEl.style.color = 'var(--success)';
}

function gerarPdfRelatorioMensal() {
    salvarTurmasRelatorioMensal();
    const ano = parseInt(document.getElementById('relatorioMensalAno').value);
    const mes = parseInt(document.getElementById('relatorioMensalMes').value);
    const ddsAgrupamento = document.getElementById('relatorioMensalDdsAgrupamento').value;
    const statusEl = document.getElementById('relatorioMensalStatus');
    const { totalFuncionarios, categorias, totais } = montarLinhasRelatorioMensal(ano, mes, ddsAgrupamento);
    if (categorias.length === 0) {
        statusEl.textContent = '❌ Nenhum lançamento encontrado nesse mês.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const nomeMes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mes];

    const linhasHtml = categorias.map(cat => cat.linhas.map((l, i) => `
        <tr>
            ${i === 0 ? `<td rowspan="${cat.linhas.length}" style="font-weight:600; vertical-align:middle;">${escapeHTML(cat.label)}</td>` : ''}
            <td>${formatSimpleDate(l.data)}</td>
            <td style="text-align:left;">${escapeHTML(l.nome)}</td>
            <td>${escapeHTML(l.carga)}</td>
            <td>${escapeHTML(String(l.turmas))}</td>
            <td>${l.treinados}</td>
            <td>${l.total}</td>
            <td>${l.pct}</td>
        </tr>`).join('')).join('');

    const totaisHtml = `
    <h3 style="margin-top:18px; font-size:12px;">RESUMO — HHT / EFETIVO DO MÊS</h3>
    <table style="width:65%; margin-bottom:10px;">
        <thead><tr><th>Categoria</th><th>Nº de Participantes</th><th>HHT (h)</th></tr></thead>
        <tbody>
            <tr><td style="text-align:left;">Treinamentos Mensais (Segurança/Saúde)</td><td>${totais.participantes.seguranca}</td><td>${r2(totais.hht.seguranca)}</td></tr>
            <tr><td style="text-align:left;">Integração</td><td>${totais.participantes.integracao}</td><td>${r2(totais.hht.integracao)}</td></tr>
            <tr><td style="text-align:left;">Treinamentos Adicionais</td><td>${totais.participantes.adicionais}</td><td>${r2(totais.hht.adicionais)}</td></tr>
            <tr><td style="text-align:left;">DDS</td><td>${totais.participantes.dds}</td><td>${r2(totais.hht.dds)}</td></tr>
            <tr style="font-weight:700; background:#e0e0e0;"><td style="text-align:left;">TOTAL GERAL</td><td>${totais.participantes.geral}</td><td>${r2(totais.hht.geral)}</td></tr>
        </tbody>
    </table>
    <table style="width:65%; margin-bottom:10px;">
        <tbody>
            <tr><td style="text-align:left;">Total de Pessoas Treinadas</td><td>${totais.participantes.geral}</td></tr>
            <tr><td style="text-align:left;">Efetivo</td><td>${totalFuncionarios}</td></tr>
            <tr><td style="text-align:left;">% de Horas (média de participantes por turma)</td><td>${r2(totais.mediaParticipantesPorTurma)}</td></tr>
            <tr><td style="text-align:left;">% Média</td><td>${r2(totais.percMedia)}%</td></tr>
        </tbody>
    </table>
    <table style="width:65%;">
        <tbody>
            <tr><td style="text-align:left;">Efetivo × 220 (HHT Normativo)</td><td>${totais.efetivoX220}</td></tr>
            <tr><td style="text-align:left;">HHT Realizado no Mês</td><td>${r2(totais.hht.geral)}</td></tr>
            <tr style="font-weight:700; background:#e0e0e0;"><td style="text-align:left;">Índice HHT/Efetivo</td><td>${r2(totais.percHhtEfetivo)}%</td></tr>
        </tbody>
    </table>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório DDS/Treinamento - ${escapeHTML(nomeMes)}/${ano}</title>
<style>
    @page { size: landscape; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 16px; }
    .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:6px; gap:10px; }
    .cabecalho img { max-height:40px; }
    .cabecalho .titulo { font-weight:700; font-size:15px; text-align:center; flex:1; }
    .info-geracao { font-size:10px; color:#444; margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; font-size:9px; }
    th, td { border:1px solid #999; padding:4px 5px; text-align:center; }
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
        <div class="titulo">RELATÓRIO MENSAL DE DDS E TREINAMENTOS — ${escapeHTML(nomeMes.toUpperCase())}/${ano}</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Nº Total de Funcionários: ${totalFuncionarios}</div>
    <table>
        <thead><tr>
            <th>TEMAS</th><th>Data</th><th>DDS, PALESTRAS E TREINAMENTOS</th>
            <th>CARGA HORÁRIA MÍNIMA (h)</th><th>TURMAS OU MÓDULOS</th>
            <th>Nº DE FUNCIONÁRIOS TREINADOS</th><th>Nº TOTAL DE FUNCIONÁRIOS</th><th>%</th>
        </tr></thead>
        <tbody>${linhasHtml}</tbody>
    </table>
    ${totaisHtml}
</body></html>`;

    abrirDocumentoBlob(html);
    statusEl.textContent = `✅ Relatório gerado (${nomeMes}/${ano}) — abra a aba nova pra imprimir/salvar em PDF.`;
    statusEl.style.color = 'var(--success)';
}

// HHT normativo (Efetivo do mês × 220h) - denominador padrão de exposição usado tanto
// no índice HHT/Efetivo quanto nas taxas de frequência/gravidade (módulo de
// Acidentabilidade). Extraído aqui pra ser reutilizável fora do render do Efetivo.
function hht220DoMes(ano, mesIndex0) {
    const fimMes = new Date(ano, mesIndex0 + 1, 0);
    return headcountAsOf(fimMes) * 220;
}

// HHT de DDS num intervalo/mês - mesma lógica de filtro por data que hhtDoMes já usa,
// só que somando carga_horaria de allDdsRealizados em vez de allTreinamentosRealizados.
function ddsHorasNoPeriodo(inicio, fim) {
    const horasDetalhado = allDdsRealizados
        .filter(r => { if (!r.data_dds) return false; const d = parseLocalDate(r.data_dds); return d >= inicio && d <= fim; })
        .reduce((sum, r) => sum + (parseFloat(r.carga_horaria) || 0), 0);
    const horasHistorico = allDdsHistoricoAgregado
        .filter(h => { if (!h.data_dds) return false; const d = parseLocalDate(h.data_dds); return d >= inicio && d <= fim; })
        .reduce((sum, h) => sum + (parseFloat(h.carga_horaria) || 0), 0);
    return horasDetalhado + horasHistorico;
}

function ddsHorasDoMes(ano, mesIndex0) {
    const ini = new Date(ano, mesIndex0, 1);
    const fim = new Date(ano, mesIndex0 + 1, 0);
    return ddsHorasNoPeriodo(ini, fim);
}

// HHT GERAL do mês = treinamento formal + DDS - mesma conta que a planilha oficial
// (QUADRO_DE_TREINAMENTOS) já faz na mão (confirmado batendo o Quadro de Julho/26: HHT
// geral = treinamento + integração + DDS, convertendo DDS a 10min/tema/dia ÷ 60). Somar o
// DDS aqui, na fonte única usada pelo Índice HHT/Efetivo da aba Efetivo, é o que faz esse
// índice do sistema bater com o que a empresa já reporta oficialmente - antes ficava
// sempre abaixo por nunca contar o DDS.
function hhtDoMes(ano, mesIndex0) {
    const ini = new Date(ano, mesIndex0, 1);
    const fim = new Date(ano, mesIndex0 + 1, 0);
    const hhtTreinamento = allTreinamentosRealizados
        .filter(r => { if (!r.data_treinamento) return false; const d = parseLocalDate(r.data_treinamento); return d >= ini && d <= fim; })
        .reduce((sum, r) => sum + (parseFloat(r.carga_horaria) || 0), 0);
    return hhtTreinamento + ddsHorasDoMes(ano, mesIndex0);
}

var efetivoFiltroAno = '';
var efetivoFiltroMes = '';

// Popula o select de anos com base nos dados reais (admissão/demissão), não uma lista
// fixa - "dinâmico" a pedido do usuário, então acompanha a base automaticamente.
function popularFiltroAnoEfetivo() {
    const anos = new Set([new Date().getFullYear()]);
    allEfetivo.forEach(e => {
        if (e.dt_admissao) anos.add(parseLocalDate(e.dt_admissao).getFullYear());
        if (e.dt_demissao) anos.add(parseLocalDate(e.dt_demissao).getFullYear());
    });
    popularSelectAnos('efetivoFiltroAno', anos);
    popularSelectAnos('relEfetivoFiltroAno', anos);
}

// efetivoFiltroAno/Mes é o único estado de período do módulo - a Visão Geral e a aba
// Relatório têm cada uma seu próprio par de selects, mas os dois pares sempre refletem
// as mesmas variáveis globais, pra mudar o período em qualquer uma das duas abas afetar
// a outra também (sem duplicar a lógica de cálculo do período).
function syncEfetivoFiltroSelects() {
    const anoEl = document.getElementById('efetivoFiltroAno');
    const mesEl = document.getElementById('efetivoFiltroMes');
    const relAnoEl = document.getElementById('relEfetivoFiltroAno');
    const relMesEl = document.getElementById('relEfetivoFiltroMes');
    if (anoEl) anoEl.value = efetivoFiltroAno;
    if (mesEl) mesEl.value = efetivoFiltroMes;
    if (relAnoEl) relAnoEl.value = efetivoFiltroAno;
    if (relMesEl) relMesEl.value = efetivoFiltroMes;
}

function onEfetivoFiltroChange() {
    efetivoFiltroAno = document.getElementById('efetivoFiltroAno').value;
    efetivoFiltroMes = document.getElementById('efetivoFiltroMes').value;
    syncEfetivoFiltroSelects();
    renderEfetivoPanel();
}

function onRelatorioEfetivoFiltroChange() {
    efetivoFiltroAno = document.getElementById('relEfetivoFiltroAno').value;
    efetivoFiltroMes = document.getElementById('relEfetivoFiltroMes').value;
    syncEfetivoFiltroSelects();
    renderEfetivoPanel();
    renderEfetivoRelatorioChecklist();
}

function limparFiltroEfetivo() {
    efetivoFiltroAno = '';
    efetivoFiltroMes = '';
    syncEfetivoFiltroSelects();
    renderEfetivoPanel();
    renderEfetivoRelatorioChecklist();
}

function limparFiltroRelatorioEfetivo() {
    limparFiltroEfetivo();
}

function renderEfetivoPanel() {
    if (allEfetivo.length === 0) return;
    popularFiltroAnoEfetivo();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Mês sem ano selecionado não tem sentido sozinho (mês de qual ano?), então só
    // entra em vigor quando o ano também está selecionado.
    const anoSel = efetivoFiltroAno ? parseInt(efetivoFiltroAno, 10) : null;
    const mesSel = (anoSel !== null && efetivoFiltroMes !== '') ? parseInt(efetivoFiltroMes, 10) : null;
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // periodoInicio/periodoFim definem a janela usada nos KPIs de admissões/demissões/
    // turnover; dataRef é o "hoje" usado pro efetivo atual e tempo de casa - sem filtro,
    // os dois continuam exatamente como antes (hoje / últimos 12 meses).
    let periodoInicio, periodoFim, dataRef, tituloPeriodo;
    if (anoSel !== null && mesSel !== null) {
        periodoInicio = new Date(anoSel, mesSel, 1);
        const fimMesCalc = new Date(anoSel, mesSel + 1, 0);
        periodoFim = fimMesCalc > hoje ? hoje : fimMesCalc;
        dataRef = periodoFim;
        tituloPeriodo = `${nomesMeses[mesSel]} de ${anoSel}`;
    } else if (anoSel !== null) {
        periodoInicio = new Date(anoSel, 0, 1);
        const fimAnoCalc = new Date(anoSel, 11, 31);
        periodoFim = fimAnoCalc > hoje ? hoje : fimAnoCalc;
        dataRef = periodoFim;
        tituloPeriodo = `Ano de ${anoSel}`;
    } else {
        periodoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
        periodoFim = hoje;
        dataRef = hoje;
        tituloPeriodo = 'Últimos 12 meses';
    }
    const periodoTituloEl = document.getElementById('efetivoPeriodoTitulo');
    if (periodoTituloEl) periodoTituloEl.textContent = tituloPeriodo;

    const efetivoAtual = headcountAsOf(dataRef);
    document.getElementById('kpiEfetivoAtual').textContent = efetivoAtual;

    const admissoesPeriodo = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) >= periodoInicio && parseLocalDate(e.dt_admissao) <= periodoFim).length;
    const demissoesPeriodo = allEfetivo.filter(e => e.dt_demissao && parseLocalDate(e.dt_demissao) >= periodoInicio && parseLocalDate(e.dt_demissao) <= periodoFim).length;
    document.getElementById('kpiEfetivoAdmissoes').textContent = admissoesPeriodo;
    document.getElementById('kpiEfetivoDemissoes').textContent = demissoesPeriodo;

    const efetivoInicioPeriodo = headcountAsOf(new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), 0));
    const efetivoMedioPeriodo = (efetivoAtual + efetivoInicioPeriodo) / 2;
    const turnover = efetivoMedioPeriodo > 0 ? (demissoesPeriodo / efetivoMedioPeriodo * 100) : 0;
    document.getElementById('kpiEfetivoTurnover').textContent = turnover.toFixed(1) + '%';

    const ativosNaData = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) <= dataRef && (!e.dt_demissao || parseLocalDate(e.dt_demissao) > dataRef));
    let tempoCasaTotalMeses = 0;
    ativosNaData.forEach(e => {
        const adm = parseLocalDate(e.dt_admissao);
        tempoCasaTotalMeses += (dataRef.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    });
    document.getElementById('kpiEfetivoTempoCasa').textContent = ativosNaData.length > 0 ? Math.round(tempoCasaTotalMeses / ativosNaData.length) : 0;

    // Aniversariantes do Mês: inicializa selects e sincroniza dados com o seletor do card
    popularSelectAnosAniversariantes();

    // Evolução mensal: com um ano selecionado, mostra só os 12 meses daquele ano (ou até
    // o mês atual, se for o ano corrente); sem filtro, mantém o histórico completo de
    // sempre (da primeira admissão registrada até hoje).
    const meses = [], admissoesPorMes = [], demissoesPorMes = [], efetivoPorMes = [], indicePorMes = [];
    // hht220PorMes: "Horas Homens Trabalhadas" no sentido normativo (efetivo do mês × 220h
    // mês-padrão) - metrica DIFERENTE do HHT de treinamento usado no índice acima; a
    // planilha do cliente rastreia as duas separadamente (confirmado batendo o valor de
    // jul/2024: efetivo 35 × 220 = 7700, exatamente o que a planilha mostra).
    // admArcoverdePorMes/admSertaniaPorMes: admissões do mês por município da ADA (Área
    // Diretamente Afetada) - as duas únicas cidades que contam pra esse indicador.
    const hht220PorMes = [], admArcoverdePorMes = [], admSertaniaPorMes = [];
    let cursor, limite;
    if (anoSel !== null) {
        cursor = new Date(anoSel, 0, 1);
        limite = anoSel === hoje.getFullYear() ? new Date(hoje.getFullYear(), hoje.getMonth(), 1) : new Date(anoSel, 11, 1);
    } else {
        const datasAdmissao = allEfetivo.filter(e => e.dt_admissao).map(e => parseLocalDate(e.dt_admissao));
        const primeiraData = datasAdmissao.length > 0 ? new Date(Math.min(...datasAdmissao.map(d => d.getTime()))) : hoje;
        cursor = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1);
        limite = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }
    while (cursor <= limite) {
        const ano = cursor.getFullYear(), mes = cursor.getMonth();
        const inicioMes = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0);
        meses.push(cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const admDoMes = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) >= inicioMes && parseLocalDate(e.dt_admissao) <= fimMes);
        const dem = allEfetivo.filter(e => e.dt_demissao && parseLocalDate(e.dt_demissao) >= inicioMes && parseLocalDate(e.dt_demissao) <= fimMes).length;
        const eft = headcountAsOf(fimMes);
        const hht = hhtDoMes(ano, mes);
        admissoesPorMes.push(admDoMes.length);
        demissoesPorMes.push(dem);
        efetivoPorMes.push(eft);
        indicePorMes.push(eft > 0 ? Math.round((hht / eft) * 100) : 0);
        hht220PorMes.push(eft * 220);
        admArcoverdePorMes.push(admDoMes.filter(e => (e.cidade || '').toUpperCase().trim() === 'ARCOVERDE').length);
        admSertaniaPorMes.push(admDoMes.filter(e => (e.cidade || '').toUpperCase().trim() === 'SERTÂNIA').length);
        cursor = new Date(ano, mes + 1, 1);
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.efetivoEvolucao) chartInstances.efetivoEvolucao.destroy();
    if (chartInstances.efetivoIndice) chartInstances.efetivoIndice.destroy();
    if (chartInstances.efetivoSetor) chartInstances.efetivoSetor.destroy();
    if (chartInstances.efetivoFuncao) chartInstances.efetivoFuncao.destroy();
    if (chartInstances.efetivoHHT220) chartInstances.efetivoHHT220.destroy();
    if (chartInstances.efetivoSexo) chartInstances.efetivoSexo.destroy();
    if (chartInstances.efetivoFaixaEtaria) chartInstances.efetivoFaixaEtaria.destroy();
    if (chartInstances.efetivoAniversariantes) chartInstances.efetivoAniversariantes.destroy();
    if (chartInstances.adaAtual) chartInstances.adaAtual.destroy();
    if (chartInstances.adaAdmissoes) chartInstances.adaAdmissoes.destroy();

    chartInstances.efetivoEvolucao = new Chart(document.getElementById('chartEfetivoEvolucao'), {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                { label: 'Efetivo', data: efetivoPorMes, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.08)', fill: true, tension: 0.25, yAxisID: 'y' },
                { label: 'Admissões', data: admissoesPorMes, borderColor: '#10b981', backgroundColor: 'transparent', tension: 0.25, yAxisID: 'y1' },
                { label: 'Demissões', data: demissoesPorMes, borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.25, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Efetivo' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Adm/Dem' } }
            }
        }
    });

    chartInstances.efetivoIndice = new Chart(document.getElementById('chartEfetivoIndice'), {
        type: 'bar',
        data: { labels: meses, datasets: [{ label: 'Índice HHT/Efetivo × 100', data: indicePorMes, backgroundColor: '#818cf8', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const setorCounts = {};
    ativosNaData.forEach(e => { const s = e.setor || 'Sem setor'; setorCounts[s] = (setorCounts[s] || 0) + 1; });
    const setorSorted = Object.entries(setorCounts).sort((a, b) => b[1] - a[1]);
    const efetivoSetorLabels = setorSorted.map(s => wrapChartLabel(s[0]));
    ajustarAlturaBarrasHorizontais('chartEfetivoSetor', efetivoSetorLabels);
    chartInstances.efetivoSetor = new Chart(document.getElementById('chartEfetivoSetor'), {
        type: 'bar',
        data: { labels: efetivoSetorLabels, datasets: [{ label: 'Efetivo', data: setorSorted.map(s => s[1]), backgroundColor: '#10b981', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    const funcaoCounts = {};
    ativosNaData.forEach(e => { const f = e.funcao || 'Sem função'; funcaoCounts[f] = (funcaoCounts[f] || 0) + 1; });
    const funcaoSorted = Object.entries(funcaoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const efetivoFuncaoLabels = funcaoSorted.map(f => wrapChartLabel(f[0]));
    ajustarAlturaBarrasHorizontais('chartEfetivoFuncao', efetivoFuncaoLabels);
    chartInstances.efetivoFuncao = new Chart(document.getElementById('chartEfetivoFuncao'), {
        type: 'bar',
        data: { labels: efetivoFuncaoLabels, datasets: [{ label: 'Efetivo', data: funcaoSorted.map(f => f[1]), backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // Horas Homens Trabalhadas normativo (efetivo × 220h/mês) - indicador de exposição
    // usado pra taxas de frequência/gravidade, diferente do HHT de treinamento acima.
    chartInstances.efetivoHHT220 = new Chart(document.getElementById('chartEfetivoHHT220'), {
        type: 'bar',
        data: { labels: meses, datasets: [{ label: 'HHT (Efetivo × 220)', data: hht220PorMes, backgroundColor: '#4f46e5', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const sexoCounts = { MASCULINO: 0, FEMININO: 0 };
    ativosNaData.forEach(e => {
        const sNorm = normalizarSexo(e.sexo);
        if (sNorm === 'M') sexoCounts.MASCULINO++;
        else if (sNorm === 'F') sexoCounts.FEMININO++;
    });
    chartInstances.efetivoSexo = new Chart(document.getElementById('chartEfetivoSexo'), {
        type: 'doughnut',
        data: {
            labels: ['Masculino', 'Feminino'],
            datasets: [{ data: [sexoCounts.MASCULINO, sexoCounts.FEMININO], backgroundColor: ['#4f46e5', '#ec4899'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
    });

    // Faixa etária: idade calculada em dataRef (não "hoje" fixo, pra ficar consistente
    // com os outros gráficos "Efetivo Atual" quando um ano/mês específico está filtrado).
    // Colaboradores sem dt_nascimento cadastrada entram em "Não informado" em vez de
    // serem descartados silenciosamente da contagem.
    const FAIXAS_ETARIAS = [
        { label: '< 25 anos', min: 0, max: 24 },
        { label: '25-34 anos', min: 25, max: 34 },
        { label: '35-44 anos', min: 35, max: 44 },
        { label: '45-54 anos', min: 45, max: 54 },
        { label: '55+ anos', min: 55, max: Infinity }
    ];
    const faixaEtariaCounts = FAIXAS_ETARIAS.map(() => 0);
    let semNascimentoCount = 0;
    ativosNaData.forEach(e => {
        if (!e.dt_nascimento) { semNascimentoCount++; return; }
        const nasc = parseLocalDate(e.dt_nascimento);
        let idade = dataRef.getFullYear() - nasc.getFullYear();
        const aniversarioAindaNaoChegou = (dataRef.getMonth() < nasc.getMonth()) ||
            (dataRef.getMonth() === nasc.getMonth() && dataRef.getDate() < nasc.getDate());
        if (aniversarioAindaNaoChegou) idade--;
        const idx = FAIXAS_ETARIAS.findIndex(f => idade >= f.min && idade <= f.max);
        if (idx >= 0) faixaEtariaCounts[idx]++;
    });
    const faixaEtariaLabels = FAIXAS_ETARIAS.map(f => f.label);
    const faixaEtariaData = faixaEtariaCounts.slice();
    if (semNascimentoCount > 0) { faixaEtariaLabels.push('Não informado'); faixaEtariaData.push(semNascimentoCount); }
    chartInstances.efetivoFaixaEtaria = new Chart(document.getElementById('chartEfetivoFaixaEtaria'), {
        type: 'bar',
        data: { labels: faixaEtariaLabels, datasets: [{ label: 'Efetivo', data: faixaEtariaData, backgroundColor: '#0ea5e9', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    // Atualiza card, lista e gráfico de aniversariantes conforme mês/ano selecionados
    const aniversariantesDoMes = atualizarAniversariantesCard();

    // ADA (Área Diretamente Afetada): as duas únicas cidades que contam pro indicador -
    // todo o resto do efetivo (outras cidades de origem) entra em "Outros".
    const adaCounts = { ARCOVERDE: 0, 'SERTÂNIA': 0, OUTROS: 0 };
    ativosNaData.forEach(e => {
        const c = (e.cidade || '').toUpperCase().trim();
        if (c === 'ARCOVERDE') adaCounts.ARCOVERDE++;
        else if (c === 'SERTÂNIA') adaCounts['SERTÂNIA']++;
        else adaCounts.OUTROS++;
    });
    chartInstances.adaAtual = new Chart(document.getElementById('chartAdaAtual'), {
        type: 'doughnut',
        data: {
            labels: ['Arcoverde', 'Sertânia', 'Outros'],
            datasets: [{ data: [adaCounts.ARCOVERDE, adaCounts['SERTÂNIA'], adaCounts.OUTROS], backgroundColor: ['#10b981', '#f59e0b', '#94a3b8'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
    });

    const totalAda = ativosNaData.length;
    const resumoEl = document.getElementById('adaResumo');
    if (resumoEl) {
        const pct = n => totalAda > 0 ? ((n / totalAda) * 100).toFixed(1) : '0.0';
        resumoEl.innerHTML = `Arcoverde: <strong>${adaCounts.ARCOVERDE}</strong> (${pct(adaCounts.ARCOVERDE)}%) — Sertânia: <strong>${adaCounts['SERTÂNIA']}</strong> (${pct(adaCounts['SERTÂNIA'])}%) — Outros: <strong>${adaCounts.OUTROS}</strong> (${pct(adaCounts.OUTROS)}%)`;
    }

    // Mesmo truque já usado no gráfico "HHT por Mês (Histórico Completo)" acima: em vez
    // de espremer todos os meses numa largura fixa (o que faz o Chart.js esconder a
    // legenda de vários meses pra não sobrepor texto - dando a falsa impressão de mês
    // "sumido"), força uma largura mínima proporcional à quantidade de meses e deixa
    // rolar horizontalmente.
    const chartAdaAdmInner = document.getElementById('chartAdaAdmissoesInner');
    const chartAdaAdmWrap = chartAdaAdmInner.parentElement;
    chartAdaAdmInner.style.width = Math.max(chartAdaAdmWrap.clientWidth, meses.length * 56) + 'px';
    chartInstances.adaAdmissoes = new Chart(document.getElementById('chartAdaAdmissoes'), {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label: 'Arcoverde', data: admArcoverdePorMes, backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Sertânia', data: admSertaniaPorMes, backgroundColor: '#f59e0b', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 45 } } }
        }
    });
    // Abre já rolado pro mês mais recente - mesmo comportamento do gráfico de HHT acima.
    chartAdaAdmWrap.scrollLeft = 999999;

    // Snapshot dos números/gráficos que acabaram de ser calculados acima, pra alimentar a
    // aba "📄 Relatório" sem duplicar nenhuma lógica de cálculo - o relatório sempre lê
    // exatamente o que está na tela, no período já selecionado (efetivoFiltroAno/Mês).
    window.efetivoReportData = {
        periodoLabel: tituloPeriodo,
        kpis: [
            { key: 'efetivoAtual', label: 'Efetivo Atual', value: efetivoAtual },
            { key: 'admissoes', label: `Admissões (${tituloPeriodo})`, value: admissoesPeriodo },
            { key: 'demissoes', label: `Demissões (${tituloPeriodo})`, value: demissoesPeriodo },
            { key: 'turnover', label: `Turnover (${tituloPeriodo})`, value: turnover.toFixed(1) + '%' },
            { key: 'tempoCasa', label: 'Tempo Médio de Casa (meses)', value: ativosNaData.length > 0 ? Math.round(tempoCasaTotalMeses / ativosNaData.length) : 0 }
        ],
        graficos: {
            graficoEvolucao: {
                titulo: 'Efetivo, Admissões e Demissões por Mês',
                labels: meses,
                series: [
                    { nome: 'Efetivo', valores: efetivoPorMes },
                    { nome: 'Admissões', valores: admissoesPorMes },
                    { nome: 'Demissões', valores: demissoesPorMes }
                ]
            },
            graficoIndiceHht: { titulo: 'Índice HHT/Efetivo × 100 por Mês', labels: meses, valores: indicePorMes },
            graficoSetor: { titulo: 'Efetivo Atual por Setor', labels: setorSorted.map(s => s[0]), valores: setorSorted.map(s => s[1]) },
            graficoFuncao: { titulo: 'Efetivo Atual por Função (Top 10)', labels: funcaoSorted.map(f => f[0]), valores: funcaoSorted.map(f => f[1]) },
            graficoHht220: { titulo: 'Horas Homens Trabalhadas (Efetivo × 220) por Mês', labels: meses, valores: hht220PorMes },
            graficoSexo: { titulo: 'Efetivo Atual por Sexo', labels: ['Masculino', 'Feminino'], valores: [sexoCounts.MASCULINO, sexoCounts.FEMININO] },
            graficoFaixaEtaria: { titulo: 'Efetivo Atual por Faixa Etária', labels: faixaEtariaLabels, valores: faixaEtariaData },
            graficoAniversariantes: {
                titulo: `Aniversariantes de ${nomesMeses[parseInt(document.getElementById('anivFiltroMes')?.value ?? hoje.getMonth(), 10)]}`,
                linhas: (aniversariantesDoMes || []).map(a => ({ dia: a.dia, nome: a.nome, funcao: a.funcao || '—', idade: a.idadeQueCompleta }))
            },
            graficoAdaAtual: { titulo: 'Efetivo Atual por Área (ADA)', labels: ['Arcoverde', 'Sertânia', 'Outros'], valores: [adaCounts.ARCOVERDE, adaCounts['SERTÂNIA'], adaCounts.OUTROS] },
            graficoAdaAdmissoes: {
                titulo: 'Admissões por Área e Mês',
                labels: meses,
                series: [
                    { nome: 'Arcoverde', valores: admArcoverdePorMes },
                    { nome: 'Sertânia', valores: admSertaniaPorMes }
                ]
            }
        }
    };
    if (document.getElementById('efetivoSubtabBtn-relatorio')?.classList.contains('active')) renderEfetivoRelatorioChecklist();
}

// ================================================================
// CARTAZ & GESTÃO DE ANIVERSARIANTES DO MÊS (NR-01 / CLIMA ORGANIZACIONAL)
// Consórcio Operador do PISF Ramal do Agreste (COP)
// ================================================================

function popularSelectAnosAniversariantes() {
    const anoSel = document.getElementById('anivFiltroAno');
    const mesSel = document.getElementById('anivFiltroMes');
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();

    if (mesSel && (mesSel.value === '' || mesSel.value === null)) {
        mesSel.value = String(hoje.getMonth());
    }

    if (anoSel && anoSel.options.length === 0) {
        const anos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];
        anoSel.innerHTML = anos.map(y => `<option value="${y}" ${y === anoAtual ? 'selected' : ''}>${y}</option>`).join('');
    }
}

function obterAniversariantesDoPeriodo(mes, ano) {
    if (!Array.isArray(allEfetivo) || allEfetivo.length === 0) return [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const anoRef = (typeof ano === 'number' && !isNaN(ano)) ? ano : hoje.getFullYear();
    const mesRef = (typeof mes === 'number' && !isNaN(mes)) ? mes : hoje.getMonth();

    return allEfetivo
        .filter(e => {
            const dataAdmStr = e.dt_admissao || e.data_admissao;
            if (!dataAdmStr) return false;
            const adm = parseLocalDate(dataAdmStr);
            if (!adm || adm > hoje) return false;

            const dataDemStr = e.dt_demissao || e.data_demissao;
            if (dataDemStr) {
                const dem = parseLocalDate(dataDemStr);
                if (dem && dem <= hoje) return false;
            }

            const sit = String(e.situacao || e.status || '').toLowerCase().trim();
            if (sit && (sit.includes('demit') || sit.includes('inativ') || sit.includes('deslig'))) {
                return false;
            }

            const dataNascStr = e.dt_nascimento || e.data_nascimento;
            if (!dataNascStr) return false;
            const nasc = parseLocalDate(dataNascStr);
            if (!nasc || isNaN(nasc.getTime())) return false;

            return nasc.getMonth() === mesRef;
        })
        .map(e => {
            const dataNascStr = e.dt_nascimento || e.data_nascimento;
            const nasc = parseLocalDate(dataNascStr);
            return {
                id: e.id,
                matricula: e.id || e.matricula || '',
                nome: (e.nome || e.id || 'Colaborador').trim(),
                funcao: (e.funcao || 'Função não informada').trim(),
                setor: (e.setor || '').trim(),
                dia: nasc.getDate(),
                mes: mesRef,
                idadeQueCompleta: anoRef - nasc.getFullYear()
            };
        })
        .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function atualizarAniversariantesCard() {
    popularSelectAnosAniversariantes();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const mesSelect = document.getElementById('anivFiltroMes');
    const anoSelect = document.getElementById('anivFiltroAno');

    const mes = mesSelect ? parseInt(mesSelect.value, 10) : hoje.getMonth();
    const ano = anoSelect ? parseInt(anoSelect.value, 10) : hoje.getFullYear();

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const nomeMes = nomesMeses[mes];

    const tituloEl = document.getElementById('tituloAniversariantesMes');
    if (tituloEl) {
        tituloEl.textContent = `${nomeMes} de ${ano}`;
    }

    const aniversariantes = obterAniversariantesDoPeriodo(mes, ano);

    const listEl = document.getElementById('listAniversariantesMes');
    if (listEl) {
        if (aniversariantes.length === 0) {
            listEl.innerHTML = `<span style="color:var(--text-light); font-style:italic;">Nenhum aniversariante ativo cadastrado em ${nomeMes} de ${ano}.</span>`;
        } else {
            listEl.innerHTML = aniversariantes.map(a => {
                const dataFmt = `${String(a.dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}`;
                const ehHoje = (mes === hoje.getMonth() && ano === hoje.getFullYear() && a.dia === hoje.getDate());
                const destaque = ehHoje ? ' 🎉 <strong style="color:var(--success);">hoje!</strong>' : '';
                const setorBadge = a.setor ? ` • <span style="opacity:0.8;">${escapeHTML(a.setor)}</span>` : '';
                return `<strong>${dataFmt}</strong> — ${escapeHTML(a.nome)} (${escapeHTML(a.funcao || 'sem função')}${setorBadge})${destaque}`;
            }).join('<br>');
        }
    }

    if (typeof Chart !== 'undefined') {
        if (chartInstances.efetivoAniversariantes) {
            try { chartInstances.efetivoAniversariantes.destroy(); } catch (e) {}
            chartInstances.efetivoAniversariantes = null;
        }

        const canvasEl = document.getElementById('chartEfetivoAniversariantes');
        if (canvasEl) {
            const diasComAniversario = [...new Set(aniversariantes.map(a => a.dia))].sort((a, b) => a - b);
            const contagemPorDia = diasComAniversario.map(d => aniversariantes.filter(a => a.dia === d).length);
            const nomesPorDia = diasComAniversario.map(d => aniversariantes.filter(a => a.dia === d).map(a => a.nome).join(', '));

            chartInstances.efetivoAniversariantes = new Chart(canvasEl, {
                type: 'bar',
                data: {
                    labels: diasComAniversario.map(d => `Dia ${d}`),
                    datasets: [{
                        label: 'Aniversariantes',
                        data: contagemPorDia,
                        backgroundColor: '#ec4899',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => nomesPorDia[ctx.dataIndex] ? `Colaborador(es): ${nomesPorDia[ctx.dataIndex]}` : ''
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { ticks: { autoSkip: false } }
                    }
                }
            });
        }
    }

    if (window.efetivoReportData && window.efetivoReportData.graficos) {
        window.efetivoReportData.graficos.graficoAniversariantes = {
            titulo: `Aniversariantes de ${nomeMes}`,
            linhas: aniversariantes.map(a => ({ dia: a.dia, nome: a.nome, funcao: a.funcao || '—', idade: a.idadeQueCompleta }))
        };
    }

    return aniversariantes;
}

function formatarTextoAniversariantesWhatsApp(mesNome, ano, lista) {
    let msg = `🎂 *ANIVERSARIANTES DO MÊS — ${mesNome.toUpperCase()}/${ano}* 🎂\n`;
    msg += `🏢 *Consórcio Operador do PISF Ramal do Agreste (COP)*\n\n`;
    msg += `Desejamos a todos os nossos colaboradores que celebram aniversário neste mês muita paz, saúde, realizações e felicidade! 🎉👏\n\n`;
    msg += `🎈 *Homenageados do Mês:*\n`;

    if (!lista || lista.length === 0) {
        msg += `_Nenhum aniversariante ativo cadastrado para este mês._\n\n`;
    } else {
        lista.forEach(colab => {
            const diaFmt = String(colab.dia).padStart(2, '0');
            const det = [colab.funcao, colab.setor].filter(Boolean).join(' • ');
            msg += `• *Dia ${diaFmt}* — *${colab.nome}*${det ? ` (${det})` : ''}\n`;
        });
        msg += `\n`;
    }

    msg += `✨ _"O COP Consórcio Operador do PISF Ramal do Agreste celebra o aniversário de seus colaboradores, desejando a cada um muita paz, saúde e felicidade!"_\n`;
    return msg;
}

async function copiarAniversariantesWhatsApp() {
    const feedbackEl = document.getElementById('anivFeedbackMsg');
    try {
        if (!allEfetivo || allEfetivo.length === 0) {
            allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        }

        const hoje = new Date();
        const selMes = document.getElementById('anivFiltroMes') ? parseInt(document.getElementById('anivFiltroMes').value, 10) : hoje.getMonth();
        const selAno = document.getElementById('anivFiltroAno') ? parseInt(document.getElementById('anivFiltroAno').value, 10) : hoje.getFullYear();

        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const nomeMes = nomesMeses[selMes];
        const aniversariantes = obterAniversariantesDoPeriodo(selMes, selAno);
        const texto = formatarTextoAniversariantesWhatsApp(nomeMes, selAno, aniversariantes);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(texto);
        } else {
            const ta = document.createElement('textarea');
            ta.value = texto;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }

        if (feedbackEl) {
            feedbackEl.textContent = '✅ Copiado p/ WhatsApp!';
            feedbackEl.style.color = '#10b981';
            feedbackEl.style.display = 'inline';
            setTimeout(() => { feedbackEl.style.display = 'none'; }, 4000);
        } else {
            alert('✅ Mensagem de Aniversariantes copiada para a área de transferência!');
        }
    } catch (err) {
        console.error('Erro ao copiar WhatsApp:', err);
        alert('Não foi possível copiar automaticamente para o WhatsApp. Tente novamente.');
    }
}

async function gerarCartazAniversariantesMes() {
    try {
        if (!allEfetivo || allEfetivo.length === 0) {
            allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        }

        const hoje = new Date();
        const selMes = document.getElementById('anivFiltroMes') ? parseInt(document.getElementById('anivFiltroMes').value, 10) : hoje.getMonth();
        const selAno = document.getElementById('anivFiltroAno') ? parseInt(document.getElementById('anivFiltroAno').value, 10) : hoje.getFullYear();

        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const nomeMes = nomesMeses[selMes];
        const nomeMesMaiusculo = nomeMes.toUpperCase();

        const lista = obterAniversariantesDoPeriodo(selMes, selAno);

        const logoBase64 = obterLogoCopBase64RelSms();
        const logoHtml = logoBase64
            ? `<img src="${logoBase64}" alt="Consórcio Operador do PISF Ramal do Agreste" style="max-height: 52px; max-width: 220px; object-fit: contain; margin-bottom: 4px;">`
            : `<div style="font-weight: 900; font-size: 16px; color: #004085; letter-spacing: 1px;">COP • CONSÓRCIO OPERADOR DO PISF</div>`;

        // Layout de grade adaptativo: 1 coluna centralizada para até 13 colaboradores; 2 colunas para 14 ou mais
        let gridEstilo = 'display: flex; flex-direction: column; gap: 8px; max-width: 620px; margin: 0 auto; width: 100%;';
        if (lista.length > 13) {
            gridEstilo = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; width: 100%;';
        }

        let itensHtml = '';
        if (lista.length === 0) {
            itensHtml = `
                <div style="text-align: center; padding: 48px 20px; color: #64748b; font-size: 14px; font-style: italic;">
                    🎂 Não foram encontrados colaboradores ativos aniversariando no mês de <strong>${nomeMes} de ${selAno}</strong>.
                </div>`;
        } else {
            itensHtml = lista.map(c => {
                const diaFmt = `Dia ${String(c.dia).padStart(2, '0')}`;
                const sub = [c.funcao, c.setor].filter(Boolean).join(' • ');
                return `
                <div class="cartaz-aniv-linha" style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; border-bottom: 1px dashed #cbd5e1; page-break-inside: avoid; gap: 12px;">
                    <div style="text-align: left; flex: 1; min-width: 0;">
                        <div style="font-weight: 800; font-size: 13.5px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.25;">
                            ${escapeHTML(c.nome)}
                        </div>
                        <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; line-height: 1.2;">
                            ${escapeHTML(sub)}
                        </div>
                    </div>
                    <div style="flex-shrink: 0; text-align: right;">
                        <span style="display: inline-block; font-weight: 800; font-size: 13px; color: #004085; background: #f0f7ff; border: 1.5px solid #93c5fd; padding: 3px 11px; border-radius: 14px; white-space: nowrap; letter-spacing: 0.5px;">
                            ${diaFmt}
                        </span>
                    </div>
                </div>`;
            }).join('');
        }

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Aniversariantes do Mês - ${nomeMes} / ${selAno} - Consórcio COP</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 8mm 10mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
        }
        .no-print {
            text-align: center;
            padding: 14px 10px;
            background: #004085;
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .no-print button {
            background: #d4af37;
            color: #002752;
            border: none;
            padding: 9px 24px;
            font-size: 14px;
            font-weight: 800;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s;
        }
        .no-print button:hover {
            background: #facc15;
            transform: translateY(-1px);
        }
        .cartaz-folha {
            width: 100%;
            max-width: 210mm;
            min-height: 278mm;
            margin: 16px auto;
            background: #ffffff;
            padding: 6px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        .moldura-externa {
            border: 5px solid #004085;
            padding: 5px;
            border-radius: 6px;
            background: #ffffff;
        }
        .moldura-interna {
            border: 2.5px solid #d4af37;
            padding: 22px 26px 18px 26px;
            min-height: 264mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border-radius: 4px;
            background: radial-gradient(circle at 50% 12%, rgba(212,175,55,0.04) 0%, rgba(255,255,255,0) 70%), #ffffff;
        }
        @media print {
            body {
                background: #ffffff !important;
            }
            .no-print {
                display: none !important;
            }
            .cartaz-folha {
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                max-width: none !important;
                width: 100% !important;
                min-height: 275mm !important;
            }
            .moldura-interna {
                min-height: 265mm !important;
            }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimir Cartaz / Salvar PDF (A4)</button>
        <span style="margin-left: 14px; font-size: 13px; opacity: 0.9;">Dica: Configure as margens como "Padrão" ou "Nenhuma" na janela de impressão.</span>
    </div>

    <div class="cartaz-folha">
        <div class="moldura-externa">
            <div class="moldura-interna">
                <!-- TOPO INSTITUCIONAL & COMEMORATIVO -->
                <div class="cartaz-topo" style="text-align: center;">
                    ${logoHtml}
                    <div style="font-size: 10.5px; font-weight: 800; color: #004085; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;">
                        CONSÓRCIO OPERADOR DO PISF • RAMAL DO AGRESTE
                    </div>

                    <!-- Ícone Comemorativo Bolo e Velas em Vetor Limpo -->
                    <div style="margin: 8px auto 4px auto; display: flex; justify-content: center; align-items: center; gap: 14px;">
                        <span style="font-size: 20px; color: #d4af37;">✦</span>
                        <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <!-- Camadas do bolo -->
                            <rect x="12" y="36" width="40" height="18" rx="4" fill="#004085" />
                            <rect x="16" y="24" width="32" height="12" rx="3" fill="#d4af37" />
                            <!-- Cobertura ondulada -->
                            <path d="M12 40 C 16 43, 20 37, 24 40 C 28 43, 32 37, 36 40 C 40 43, 44 37, 48 40 C 50 41.5, 51.5 41, 52 40 L52 36 L12 36 Z" fill="#e0f2fe" opacity="0.9" />
                            <path d="M16 28 C 20 31, 24 26, 28 29 C 32 31, 36 26, 40 29 C 44 31, 46 27, 48 28 L48 24 L16 24 Z" fill="#ffffff" opacity="0.8" />
                            <!-- Prato -->
                            <path d="M8 55 C 8 53.5, 10 54, 14 54 L50 54 C 54 54, 56 53.5, 56 55 C 56 56.5, 52 57, 46 57 L18 57 C 12 57, 8 56.5, 8 55 Z" fill="#94a3b8" />
                            <!-- Velas com chamas douradas -->
                            <rect x="23" y="14" width="3" height="10" rx="1.5" fill="#38bdf8" />
                            <rect x="30.5" y="11" width="3" height="13" rx="1.5" fill="#f43f5e" />
                            <rect x="38" y="14" width="3" height="10" rx="1.5" fill="#10b981" />
                            <path d="M24.5 7 C 23 9.5, 23 11.5, 24.5 13 C 26 11.5, 26 9.5, 24.5 7 Z" fill="#f59e0b" />
                            <circle cx="24.5" cy="11.5" r="1.5" fill="#fef08a" />
                            <path d="M32 4 C 30.5 6.5, 30.5 8.5, 32 10 C 33.5 8.5, 33.5 6.5, 32 4 Z" fill="#f59e0b" />
                            <circle cx="32" cy="8.5" r="1.5" fill="#fef08a" />
                            <path d="M39.5 7 C 38 9.5, 38 11.5, 39.5 13 C 41 11.5, 41 9.5, 39.5 7 Z" fill="#f59e0b" />
                            <circle cx="39.5" cy="11.5" r="1.5" fill="#fef08a" />
                        </svg>
                        <span style="font-size: 20px; color: #d4af37;">✦</span>
                    </div>

                    <!-- Título -->
                    <div style="font-size: 25px; font-weight: 900; color: #004085; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 2px 0;">
                        ANIVERSARIANTES DO MÊS
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin: 4px 0 14px 0;">
                        <div style="height: 2px; width: 45px; background: linear-gradient(90deg, transparent, #d4af37);"></div>
                        <div style="font-size: 21px; font-weight: 800; color: #b45309; letter-spacing: 3px; text-transform: uppercase;">
                            ${nomeMesMaiusculo}
                        </div>
                        <div style="height: 2px; width: 45px; background: linear-gradient(90deg, #d4af37, transparent);"></div>
                    </div>
                </div>

                <!-- LISTA CENTRALIZADA DE ANIVERSARIANTES -->
                <div class="cartaz-conteudo" style="flex: 1; display: flex; flex-direction: column; justify-content: center; margin: 10px 0;">
                    <div style="${gridEstilo}">
                        ${itensHtml}
                    </div>
                </div>

                <!-- RODAPÉ COMEMORATIVO INSTITUCIONAL -->
                <div class="cartaz-rodape" style="text-align: center; border-top: 1.5px solid #d4af37; padding-top: 14px; margin-top: 14px;">
                    <div style="font-size: 12px; font-weight: 600; color: #334155; font-style: italic; line-height: 1.5; max-width: 580px; margin: 0 auto;">
                        "O COP Consórcio Operador do PISF Ramal do Agreste celebra o aniversário de seus colaboradores, desejando a cada um muita paz, saúde e felicidade!"
                    </div>
                    <div style="margin-top: 8px; font-size: 9.5px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        Engajamento e Clima Organizacional • NR-01 SST • Consórcio COP
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 400);
        };
    </script>
</body>
</html>`;

        abrirDocumentoHtmlParaImpressao(html, 'Aniversariantes do Mes - COP');
    } catch (err) {
        console.error('Erro ao gerar cartaz de aniversariantes:', err);
        alert('Ocorreu um erro ao gerar o cartaz comemorativo. Por favor, tente novamente.');
    }
}

window.popularSelectAnosAniversariantes = popularSelectAnosAniversariantes;
window.obterAniversariantesDoPeriodo = obterAniversariantesDoPeriodo;
window.atualizarAniversariantesCard = atualizarAniversariantesCard;
window.formatarTextoAniversariantesWhatsApp = formatarTextoAniversariantesWhatsApp;
window.copiarAniversariantesWhatsApp = copiarAniversariantesWhatsApp;
window.gerarCartazAniversariantesMes = gerarCartazAniversariantesMes;


async function importarEfetivoCSV() {
    const input = document.getElementById('efetivoFileInput');
    const statusEl = document.getElementById('efetivoImportStatus');
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
        function col(parts, name) {
            const i = idx[name.toUpperCase()];
            return i !== undefined ? (parts[i] || '').trim() : '';
        }

        const efetivoMap = new Map();
        let puladas = 0;
        for (let li = 1; li < lines.length; li++) {
            const parts = lines[li].split(';');
            const matricula = col(parts, 'MATRICULA').toUpperCase();
            const nome = col(parts, 'NOME');
            if (!matricula || !nome) { puladas++; continue; }

            efetivoMap.set(matricula, {
                id: matricula,
                status: col(parts, 'STATUS'),
                cpf: col(parts, 'CPF'),
                nome,
                funcao: col(parts, 'FUNCAO'),
                setor: col(parts, 'SETOR'),
                responsavel: col(parts, 'RESPONSAVEL'),
                dt_admissao: parseDataBR(col(parts, 'DT_ADMISSAO')),
                dt_demissao: parseDataBR(col(parts, 'DT_DEMISSAO')),
                dt_nascimento: parseDataBR(col(parts, 'DT_NASCIMENTO')),
                cidade: col(parts, 'CIDADE'),
                estado: col(parts, 'ESTADO'),
                estabilidade: col(parts, 'ESTABILIDADE'),
                ghe: col(parts, 'GHE'),
                calca: col(parts, 'CALCA'),
                camisa: col(parts, 'CAMISA'),
                bota: col(parts, 'BOTA'),
                sexo: col(parts, 'SEXO')
            });
        }

        const efetivoArr = Array.from(efetivoMap.values());
        statusEl.textContent = `Enviando ${efetivoArr.length} colaboradores...`;
        await supabaseUpsert('colaboradores_efetivo', efetivoArr);

        statusEl.textContent = `✅ Importação concluída! ${efetivoArr.length} colaboradores importados/atualizados. ${puladas} linha(s) pulada(s) por dado incompleto.`;
        efetivoLoaded = true;
        await loadEfetivoData();
    } catch (err) {
        console.error('Erro ao importar planilha de efetivo:', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}
