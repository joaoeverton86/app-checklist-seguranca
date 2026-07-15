// ============================================
// GOOGLE APPS SCRIPT v2 - Sincronização com Google Sheets
// ============================================
// Cole este código no Apps Script da sua planilha
// Execute a função "setup" uma vez
// Implante como "Aplicativo da Web" com acesso "Qualquer pessoa"
// ============================================

const CHECKLIST_SHEET = 'Checklists';
const ISSUES_SHEET = 'Relatos';
const NC_SHEET = 'Não Conformidades';
const CADASTROS_SHEET = 'Cadastros';
const COLABORADORES_SHEET = 'Colaboradores';
const ITEMS_SHEET = 'Itens Checklist';

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    criarAbaSeNaoExiste(ss, CHECKLIST_SHEET, [
        'ID', 'Data', 'Patrimônio', 'Equipamento', 'NR', 'Empresa', 
        'Operador', 'SST', 'Responsável', 'Conformes', 'Não Conformes', 'N/A', 'Observações', 
        'Status', 'Prazo Adequação', 'Data Hora Registro', 'Sincronizado', 'Itens Detalhados'
    ]);
    criarAbaSeNaoExiste(ss, ISSUES_SHEET, [
        'ID', 'Data', 'Tipo', 'Identificação', 'Descrição', 
        'Reportado por', 'Cargo', 'Status', 'Data Hora Registro'
    ]);
    criarAbaSeNaoExiste(ss, NC_SHEET, [
        'ID Checklist', 'Data', 'Patrimônio', 'Item', 'NR', 'Risco',
        'Observação', 'Data Hora Registro'
    ]);
    criarAbaSeNaoExiste(ss, CADASTROS_SHEET, [
        'ID', 'Tipo', 'Categoria', 'Nome', 'Patrimônio', 'Empresa',
        'Setor', 'Observações', 'Data Hora Registro', 'Sincronizado'
    ]);
    criarAbaSeNaoExiste(ss, COLABORADORES_SHEET, [
        'ID', 'Nome', 'Função', 'Setor', 'Empresa', 'Matrícula',
        'Validade ASO', 'Data Hora Registro', 'Sincronizado', 'Ativo', 'Senha', 'NivelAcesso'
    ]);
    criarABASeNaoExisteOuAtualizar(ss, ITEMS_SHEET);
    Logger.log('Setup concluído!');
}

function criarABASeNaoExisteOuAtualizar(ss, nomeAba) {
    let aba = ss.getSheetByName(nomeAba);
    const cabecalhos = [
        'ID', 'ID Equipamento', 'Nome Equipamento', 'Ícone Equipamento', 
        'Categoria Equipamento', 'Texto do Item', 'NR', 'Risco', 'Seção', 'Ordem', 'Ativo'
    ];
    if (!aba) {
        aba = ss.insertSheet(nomeAba);
        aba.appendRow(cabecalhos);
    }
}

function criarAbaSeNaoExiste(ss, nomeAba, cabecalhos) {
    let aba = ss.getSheetByName(nomeAba);
    if (!aba) {
        aba = ss.insertSheet(nomeAba);
        aba.appendRow(cabecalhos);
        const range = aba.getRange(1, 1, 1, cabecalhos.length);
        range.setFontWeight('bold');
        range.setBackground('#1a5276');
        range.setFontColor('white');
        range.setHorizontalAlignment('center');
        cabecalhos.forEach((_, i) => {
            aba.setColumnWidth(i + 1, 150);
        });
    }
}

// GET - Consultar dados (suporta ?store=NomeAba)
function doGet(e) {
    Logger.log('doGet chamado');
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const storeParam = (e && e.parameter && e.parameter.store) || 'Checklists';
        
        const storeMap = {
            'Checklists': CHECKLIST_SHEET,
            'Cadastros': CADASTROS_SHEET,
            'Relatos': ISSUES_SHEET,
            'Colaboradores': COLABORADORES_SHEET
        };
        
        const nomeAba = storeMap[storeParam] || storeParam;
        const aba = ss.getSheetByName(nomeAba);
        
        if (!aba) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: true, data: [] }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const dadosRaw = aba.getDataRange().getValues();
        if (dadosRaw.length < 2) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: true, data: [] }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const headers = dadosRaw[0];
        const dados = [];
        for (let i = 1; i < dadosRaw.length; i++) {
            const obj = {};
            headers.forEach((h, j) => { obj[h] = dadosRaw[i][j]; });
            dados.push(obj);
        }
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, data: dados }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        Logger.log('Erro doGet: ' + error.toString());
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// POST - Receber dados
function doPost(e) {
    Logger.log('doPost chamado');
    Logger.log('postData: ' + (e.postData ? e.postData.contents : 'null'));
    
    try {
        if (!e.postData || !e.postData.contents) {
            Logger.log('Sem dados recebidos');
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Sem dados' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const data = JSON.parse(e.postData.contents);
        Logger.log('Store: ' + data.store);
        
        // Teste de conexão
        if (data.store === 'test') {
            Logger.log('Teste de conexão recebido');
            return ContentService
                .createTextOutput(JSON.stringify({ success: true, message: 'Conexão OK' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const record = data.data;
        
        if (data.store === 'checklists') {
            salvarChecklist(record);
        } else if (data.store === 'issues') {
            salvarRelato(record);
        } else if (data.store === 'cadastros') {
            salvarCadastro(record);
        } else if (data.store === 'colaboradores') {
            salvarColaborador(record);
        } else if (data.store === 'checklist_items') {
            salvarItemChecklist(record);
        } else if (data.store === 'checklist_items_bulk') {
            salvarItensEmMassa(record);
        } else {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Store desconhecido: ' + data.store }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        Logger.log('Dados salvos com sucesso: ' + data.store);
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        Logger.log('Erro doPost: ' + error.toString());
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// FUNÇÕES AUXILIARES DE PERSISTÊNCIA
// ============================================

// Busca um ID na primeira coluna da aba correspondente para evitar duplicidades
function encontrarLinhaPorId(aba, id) {
    if (!id) return -1;
    const dados = aba.getDataRange().getValues();
    for (let i = 1; i < dados.length; i++) {
        if (dados[i][0] == id) {
            return i + 1; // 1-based index do Google Sheets
        }
    }
    return -1;
}

function obterAbaSegura(ss, nomeAba, cabecalhos) {
    let aba = ss.getSheetByName(nomeAba);
    if (!aba) {
        aba = ss.insertSheet(nomeAba);
        aba.appendRow(cabecalhos);
        const range = aba.getRange(1, 1, 1, cabecalhos.length);
        range.setFontWeight('bold');
        range.setBackground('#1a5276');
        range.setFontColor('white');
        range.setHorizontalAlignment('center');
        cabecalhos.forEach((_, i) => {
            aba.setColumnWidth(i + 1, 150);
        });
    } else {
        const lastCol = aba.getLastColumn();
        if (lastCol > 0) {
            const headersExistentes = aba.getRange(1, 1, 1, lastCol).getValues()[0];
            cabecalhos.forEach((header, index) => {
                if (index >= headersExistentes.length) {
                    const celula = aba.getRange(1, index + 1);
                    celula.setValue(header);
                    celula.setFontWeight('bold');
                    celula.setBackground('#1a5276');
                    celula.setFontColor('white');
                    celula.setHorizontalAlignment('center');
                    aba.setColumnWidth(index + 1, 150);
                }
            });
        }
    }
    return aba;
}

function salvarChecklist(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaSegura(ss, CHECKLIST_SHEET, [
        'ID', 'Data', 'Patrimônio', 'Equipamento', 'NR', 'Empresa', 
        'Operador', 'SST', 'Responsável', 'Conformes', 'Não Conformes', 'N/A', 'Observações', 
        'Status', 'Prazo Adequação', 'Data Hora Registro', 'Sincronizado', 'Itens Detalhados', 'Link PDF'
    ]);
    
    const pdfUrl = criarPDFNoDrive(record);
    
    const rowData = [
        record.id || '',
        record.date || '',
        record.patrimonio || '',
        record.nome || '',
        (record.equipment && record.equipment.nr) || '',
        record.empresa || '',
        record.operador || '',
        record.sst || '',
        record.responsavel || '',
        (record.stats && record.stats.conformes) || 0,
        (record.stats && record.stats.naoConformes) || 0,
        (record.stats && record.stats.na) || 0,
        record.observacoes || '',
        record.statusChecklist || '',
        record.prazoAdequacao || '',
        new Date().toISOString(),
        'Sim',
        JSON.stringify(record.items || {}),
        pdfUrl
    ];
    
    const linha = encontrarLinhaPorId(aba, record.id);
    if (linha !== -1) {
        aba.getRange(linha, 1, 1, rowData.length).setValues([rowData]);
    } else {
        aba.appendRow(rowData);
    }
    
    // Envia e-mail automático em caso de interdição
    enviarEmailInterdicao(record, pdfUrl);
    
    if (record.items) {
        const abaNC = obterAbaSegura(ss, NC_SHEET, [
            'ID Checklist', 'Data', 'Patrimônio', 'Item', 'NR', 'Risco',
            'Observação', 'Data Hora Registro'
        ]);
        const itens = (record.equipment && record.equipment.items) || [];
        for (const itemId in record.items) {
            if (itemId === '_form') continue;
            const data = record.items[itemId];
            
            const item = itens.find(function(i) { return i.id === itemId; });
            const itemTextRaw = (item && item.text) || itemId;
            const itemText = getNCDescription(itemTextRaw, itemId);
            
            let linhaNC = -1;
            const dadosNC = abaNC.getDataRange().getValues();
            for (let i = 1; i < dadosNC.length; i++) {
                if (dadosNC[i][0] == record.id && dadosNC[i][3] == itemText) {
                    linhaNC = i + 1;
                    break;
                }
            }
            
            if (data.status === 'NC') {
                const rowDataNC = [
                    record.id || '',
                    record.date || '',
                    record.patrimonio || '',
                    itemText,
                    (item && item.nr) || '',
                    (item && item.risk) || '',
                    data.observation || '',
                    new Date().toISOString()
                ];
                if (linhaNC !== -1) {
                    abaNC.getRange(linhaNC, 1, 1, rowDataNC.length).setValues([rowDataNC]);
                } else {
                    abaNC.appendRow(rowDataNC);
                }
            } else if (linhaNC !== -1) {
                abaNC.deleteRow(linhaNC);
            }
        }
    }
}

function salvarRelato(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaSegura(ss, ISSUES_SHEET, [
        'ID', 'Data', 'Tipo', 'Identificação', 'Descrição', 
        'Reportado por', 'Cargo', 'Status', 'Data Hora Registro'
    ]);
    
    const rowData = [
        record.id || '',
        record.date || '',
        record.type || '',
        record.identificacao || '',
        record.description || '',
        record.reporter || '',
        record.role || '',
        record.status || '',
        new Date().toISOString()
    ];
    
    const linha = encontrarLinhaPorId(aba, record.id);
    if (linha !== -1) {
        aba.getRange(linha, 1, 1, rowData.length).setValues([rowData]);
    } else {
        aba.appendRow(rowData);
    }
}

function salvarCadastro(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaSegura(ss, CADASTROS_SHEET, [
        'ID', 'Tipo', 'Categoria', 'Nome', 'Patrimônio', 'Empresa',
        'Setor', 'Observações', 'Data Hora Registro', 'Sincronizado', 'Ativo'
    ]);
    
    const rowData = [
        record.id || '',
        record.tipo || '',
        record.categoria || '',
        record.nome || '',
        record.patrimonio || '',
        record.empresa || '',
        record.setor || '',
        record.obs || '',
        new Date().toISOString(),
        'Sim',
        record.ativo !== false ? 'Sim' : 'Não'
    ];
    
    const linha = encontrarLinhaPorId(aba, record.id);
    if (linha !== -1) {
        aba.getRange(linha, 1, 1, rowData.length).setValues([rowData]);
    } else {
        aba.appendRow(rowData);
    }
}

function salvarColaborador(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaSegura(ss, COLABORADORES_SHEET, [
        'ID', 'Nome', 'Função', 'Setor', 'Empresa', 'Matrícula',
        'Validade ASO', 'Data Hora Registro', 'Sincronizado', 'Ativo', 'Senha', 'NivelAcesso'
    ]);
    
    const rowData = [
        record.id || '',
        record.nome || '',
        record.funcao || '',
        record.setor || '',
        record.empresa || '',
        record.matricula || '',
        record.aso || '',
        new Date().toISOString(),
        'Sim',
        record.ativo !== false ? 'Sim' : 'Não',
        record.senha || '',
        record.nivelAcesso || 'Tecnico'
    ];
    
    const linha = encontrarLinhaPorId(aba, record.id);
    if (linha !== -1) {
        aba.getRange(linha, 1, 1, rowData.length).setValues([rowData]);
    } else {
        aba.appendRow(rowData);
    }
}

function salvarItemChecklist(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaSegura(ss, ITEMS_SHEET, [
        'ID', 'ID Equipamento', 'Nome Equipamento', 'Ícone Equipamento', 
        'Categoria Equipamento', 'Texto do Item', 'NR', 'Risco', 'Seção', 'Ordem', 'Ativo'
    ]);
    
    const rowData = [
        record.id || '',
        record.idEquipamento || '',
        record.nomeEquipamento || '',
        record.iconeEquipamento || '',
        record.categoriaEquipamento || '',
        record.textoItem || '',
        record.nr || '',
        record.risco || 'medium',
        record.secao || '',
        record.ordem !== undefined ? record.ordem : 0,
        record.ativo !== false && record.ativo !== 'Não' ? 'Sim' : 'Não'
    ];
    
    const linha = encontrarLinhaPorId(aba, record.id);
    if (linha !== -1) {
        aba.getRange(linha, 1, 1, rowData.length).setValues([rowData]);
    } else {
        aba.appendRow(rowData);
    }
}

function salvarItensEmMassa(items) {
    if (!items || !items.length) return;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaSegura(ss, ITEMS_SHEET, [
        'ID', 'ID Equipamento', 'Nome Equipamento', 'Ícone Equipamento', 
        'Categoria Equipamento', 'Texto do Item', 'NR', 'Risco', 'Seção', 'Ordem', 'Ativo'
    ]);
    
    const rows = [];
    for (var i = 0; i < items.length; i++) {
        const item = items[i];
        rows.push([
            item.id || '',
            item.idEquipamento || '',
            item.nomeEquipamento || '',
            item.iconeEquipamento || '',
            item.categoriaEquipamento || '',
            item.textoItem || '',
            item.nr || '',
            item.risco || 'medium',
            item.secao || '',
            item.ordem !== undefined ? item.ordem : 0,
            item.ativo !== false && item.ativo !== 'Não' ? 'Sim' : 'Não'
        ]);
    }
    
    if (rows.length > 0) {
        aba.getRange(aba.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
}

function criarPDFNoDrive(record) {
    try {
        var html = "<html><body style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>";
        html += "<div style='max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>";
        html += "<h2 style='color:#1a5276; border-bottom:2px solid #1a5276; padding-bottom:8px; margin-top:0;'>" + (record.nome || "Checklist") + " - Checklist de Segurança</h2>";
        html += "<table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>ID:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee;'>" + (record.id || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Data:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee;'>" + (record.date || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Patrimônio:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee;'>" + (record.patrimonio || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Empresa:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee;'>" + (record.empresa || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Operador/Motorista:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee;'>" + (record.operador || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Téc. Segurança (SST):</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee;'>" + (record.sst || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Encarregado/Responsável:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee;'>" + (record.responsavel || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Status Geral:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee; font-weight: bold; color: " + 
                (record.statusChecklist === 'liberado' ? '#27ae60' : (record.statusChecklist === 'liberado_restricao' ? '#f39c12' : '#c0392b')) + ";'>" + 
                (record.statusChecklist ? record.statusChecklist.toUpperCase().replace('_', ' ') : 'N/A') + "</td></tr>";
        if (record.prazoAdequacao) {
            html += "<tr><td style='padding: 6px 0; border-bottom: 1px solid #eee;'><strong>Prazo de Adequação:</strong></td><td style='padding: 6px 0; border-bottom: 1px solid #eee; color: #c0392b; font-weight: bold;'>" + record.prazoAdequacao + "</td></tr>";
        }
        html += "</table>";
        
        if (record.observacoes) {
            html += "<div style='background: #f9f9f9; padding: 10px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #1a5276;'><strong>Observações Gerais:</strong><p style='margin: 4px 0 0 0; font-size: 13px;'>" + record.observacoes + "</p></div>";
        }
        
        html += "<h3>Itens Verificados:</h3>";
        html += "<table style='width: 100%; border-collapse: collapse; font-size: 13px;'>";
        html += "<thead><tr style='background: #f2f2f2;'><th style='text-align: left; padding: 8px; border: 1px solid #ddd;'>Item</th><th style='text-align: center; padding: 8px; border: 1px solid #ddd; width: 120px;'>Status</th></tr></thead><tbody>";
        
        for (var itemId in record.items) {
            if (itemId === '_form') continue;
            var itemData = record.items[itemId];
            var statusText = itemData.status === 'C' ? 'Conforme' : (itemData.status === 'NC' ? 'Não Conforme' : 'N/A');
            var statusColor = itemData.status === 'C' ? '#27ae60' : (itemData.status === 'NC' ? '#c0392b' : '#95a5a6');
            
            html += "<tr>";
            html += "<td style='padding: 8px; border: 1px solid #ddd;'><strong>" + itemId.toUpperCase() + "</strong>" + (itemData.observation ? "<br><span style='color:#7f8c8d; font-size: 11px;'>Obs: " + itemData.observation + "</span>" : "") + "</td>";
            html += "<td style='padding: 8px; border: 1px solid #ddd; text-align: center; color: " + statusColor + "; font-weight: bold;'>" + statusText + "</td>";
            html += "</tr>";
        }
        html += "</tbody></table>";
        html += "</div></body></html>";
        
        var blob = Utilities.newBlob(html, "text/html", "checklist-" + record.id + ".html");
        
        var folderName = "Checklists_PDFs";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder;
        if (folders.hasNext()) {
            folder = folders.next();
        } else {
            folder = DriveApp.createFolder(folderName);
        }
        
        var tempFile = DriveApp.createFile(blob);
        var pdfBlob = tempFile.getAs("application/pdf");
        var pdfFile = folder.createFile(pdfBlob);
        pdfFile.setName((record.nome || 'Checklist') + "_" + (record.patrimonio || 'SemPatrimonio') + "_" + (record.date || 'SemData') + ".pdf");
        
        try {
            pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch(e) {
            console.log("Erro ao definir compartilhamento: " + e.toString());
        }
        
        tempFile.setTrashed(true);
        
        return pdfFile.getUrl();
    } catch(e) {
        return "Erro PDF: " + e.toString();
    }
}

function testarPDFEDrive() {
    const dummyRecord = {
        id: "TESTE-123",
        date: "2026-06-28",
        patrimonio: "TESTE-PATRIMONIO",
        nome: "Equipamento Teste",
        empresa: "Empresa Teste",
        operador: "Operador Teste",
        sst: "SST Teste",
        responsavel: "Responsavel Teste",
        statusChecklist: "liberado",
        prazoAdequacao: "",
        items: {
            "item1": { status: "C", observation: "" },
            "item2": { status: "NC", observation: "Necessita ajuste" }
        }
    };
    
    Logger.log("Iniciando geração do PDF de teste...");
    const url = criarPDFNoDrive(dummyRecord);
    Logger.log("PDF criado com sucesso! Link: " + url);
}


function getNCDescription(text, itemId) {
    if (!text) return 'Irregularidade';
    if (itemId === 'item_interdicao') return 'Interdição Urgente';
    
    var ncText = text.trim();
    
    // Check specific IDs
    var idLower = (itemId || '').toLowerCase();
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

function enviarEmailInterdicao(record, pdfUrl) {
    if (record.statusChecklist !== 'interditado') {
        return;
    }
    
    try {
        const DESTINATARIOS_EMAIL = ""; // Defina os e-mails de destino aqui. Ex: "gestor@empresa.com, encarregado@empresa.com"
        const emailDestino = DESTINATARIOS_EMAIL || Session.getEffectiveUser().getEmail();
        
        if (!emailDestino) {
            Logger.log("Aviso: Nenhum e-mail de destino configurado ou encontrado.");
            return;
        }
        
        const statusText = "🔴 INTERDITADO";
        const titulo = "🔴 ALERTA DE INTERDIÇÃO - " + (record.nome || 'Equipamento') + " (" + (record.patrimonio || 'Sem Patrimônio') + ")";
        
        // List non-conformities
        const itensNC = [];
        if (record.items) {
            const itens = (record.equipment && record.equipment.items) || [];
            for (const itemId in record.items) {
                if (itemId === '_form') continue;
                const itemData = record.items[itemId];
                if (itemData.status === 'NC') {
                    // Try to find the item text
                    var itemText = itemId;
                    for (var i = 0; i < itens.length; i++) {
                        if (itens[i].id === itemId) {
                            itemText = itens[i].text;
                            break;
                        }
                    }
                    const ncText = getNCDescription(itemText, itemId);
                    const obsText = itemData.observation ? " (Obs: " + itemData.observation + ")" : "";
                    itensNC.push("<li><strong>" + ncText + "</strong>" + obsText + "</li>");
                }
            }
        }
        const itensListHtml = itensNC.length > 0 ? "<ul>" + itensNC.join("") + "</ul>" : "<p>Nenhum item NC detalhado.</p>";
        
        var html = "<html><body style='font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;'>";
        html += "<div style='max-width: 600px; margin: 0 auto; border: 2px solid #e74c3c; padding: 25px; border-radius: 8px; background: #fff;'>";
        html += "<h2 style='color:#e74c3c; border-bottom:2px solid #e74c3c; padding-bottom:12px; margin-top:0;'>🔴 ALERTA DE EQUIPAMENTO INTERDITADO</h2>";
        html += "<p>Atenção, o checklist de segurança identificou não conformidades críticas e o equipamento foi <strong>INTERDITADO</strong> para uso.</p>";
        
        html += "<table style='width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;'>";
        html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd; width: 40%;'><strong>Equipamento:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + (record.nome || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Patrimônio / Placa:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + (record.patrimonio || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Norma Relacionada:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + (record.nr || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Operador / Motorista:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + (record.operador || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Registrado por (TST):</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + (record.sst || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Encarregado Notificado:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + (record.responsavel || 'N/A') + "</td></tr>";
        html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Data do Registro:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + new Date().toLocaleString('pt-BR') + "</td></tr>";
        if (record.prazoAdequacao) {
            html += "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd; color: #e74c3c;'><strong>Prazo de Adequação:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd; color: #e74c3c; font-weight: bold;'>" + formatSimpleDate(record.prazoAdequacao) + "</td></tr>";
        }
        html += "</table>";
        
        html += "<h3 style='color:#c0392b; border-bottom: 1px solid #ddd; padding-bottom: 6px;'>Não Conformidades Encontradas:</h3>";
        html += itensListHtml;
        
        if (pdfUrl) {
            html += "<div style='margin-top: 25px; text-align: center;'>";
            html += "<a href='" + pdfUrl + "' style='background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;'>📄 Acessar PDF do Checklist no Drive</a>";
            html += "</div>";
        }
        
        html += "<p style='font-size: 11px; color: #7f8c8d; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;'>Este e-mail foi gerado automaticamente pelo aplicativo de Checklist de Segurança.</p>";
        html += "</div></body></html>";
        
        MailApp.sendEmail({
            to: emailDestino,
            subject: titulo,
            htmlBody: html
        });
        
        Logger.log("E-mail de interdição enviado com sucesso para: " + emailDestino);
    } catch (e) {
        Logger.log("Erro ao enviar e-mail de interdição: " + e.toString());
    }
}

function formatSimpleDate(dateStr) {
    if (!dateStr) return '—';
    if (dateStr.indexOf('-') !== -1) {
        var parts = dateStr.split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
    }
    return dateStr;
}
