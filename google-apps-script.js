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

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    criarAbaSeNaoExiste(ss, CHECKLIST_SHEET, [
        'ID', 'Data', 'Patrimônio', 'Equipamento', 'NR', 'Empresa', 
        'Operador', 'SST', 'Responsável', 'Conformes', 'Não Conformes', 'N/A', 'Observações', 
        'Status', 'Prazo Adequação', 'Data Hora Registro', 'Sincronizado'
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
        'Validade ASO', 'Data Hora Registro', 'Sincronizado'
    ]);
    Logger.log('Setup concluído!');
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

function salvarChecklist(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(CHECKLIST_SHEET);
    aba.appendRow([
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
        'Sim'
    ]);
    
    if (record.stats && record.stats.naoConformes > 0 && record.items && record.equipment && record.equipment.items) {
        const abaNC = ss.getSheetByName(NC_SHEET);
        const itens = record.equipment.items;
        for (const itemId in record.items) {
            if (itemId === '_form') continue;
            const data = record.items[itemId];
            if (data.status === 'NC') {
                const item = itens.find(function(i) { return i.id === itemId; });
                abaNC.appendRow([
                    record.id || '',
                    record.date || '',
                    record.patrimonio || '',
                    (item && item.text) || itemId,
                    (item && item.nr) || '',
                    (item && item.risk) || '',
                    data.observation || '',
                    new Date().toISOString()
                ]);
            }
        }
    }
}

function salvarRelato(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(ISSUES_SHEET);
    aba.appendRow([
        record.id || '',
        record.date || '',
        record.type || '',
        record.identificacao || '',
        record.description || '',
        record.reporter || '',
        record.role || '',
        record.status || '',
        new Date().toISOString()
    ]);
}

function salvarCadastro(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(CADASTROS_SHEET);
    aba.appendRow([
        record.id || '',
        record.tipo || '',
        record.categoria || '',
        record.nome || '',
        record.patrimonio || '',
        record.empresa || '',
        record.setor || '',
        record.obs || '',
        new Date().toISOString(),
        'Sim'
    ]);
}

function salvarColaborador(record) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(COLABORADORES_SHEET);
    aba.appendRow([
        record.id || '',
        record.nome || '',
        record.funcao || '',
        record.setor || '',
        record.empresa || '',
        record.matricula || '',
        record.aso || '',
        new Date().toISOString(),
        'Sim'
    ]);
}
