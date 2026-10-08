// =========================================================================================
// GOOGLE APPS SCRIPT - AUTOMAÇÃO HIERÁRQUICA DE PASTAS DE FOTOS & EVIDÊNCIAS DE SST
// =========================================================================================
// INSTRUÇÕES DE IMPLANTAÇÃO COMO APLICATIVO DA WEB (WEB APP):
// 1. Acesse o Google Drive (com a conta proprietária da pasta de SST).
// 2. Crie um novo projeto no Google Apps Script (ou acesse: https://script.google.com).
// 3. Cole todo este código no editor (substituindo o conteúdo padrão de "Código.gs").
// 4. Clique em "Implantar" (Deploy) no canto superior direito -> "Nova implantação" (New deployment).
// 5. Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha "Aplicativo da Web" (Web app).
// 6. Preencha as opções EXATAMENTE assim:
//    - Descrição: Automação de Pastas SST Fotos
//    - Executar como (Execute as): "Eu" (seu e-mail proprietário do Drive)
//    - Quem pode acessar (Who has access): "Qualquer pessoa" (Anyone)
// 7. Clique em "Implantar" (Deploy), autorize as permissões da sua conta Google e copie a URL do Web App:
//    Exemplo: https://script.google.com/macros/s/AKfycb.../exec
// 8. No Painel Gerencial de SST, abra o menu de Configurações do Google Drive e cole a URL no campo
//    "URL do Web App (Automação de Pastas de Fotos)".
// =========================================================================================

/**
 * Endpoint GET para diagnóstico rápido e teste no navegador
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    servico: 'Automação de Pastas de Fotos & Evidências SST',
    mensagem: 'Web App ativo e pronto para receber requisições POST.',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint POST para criação/localização recursiva da subpasta de evidências
 * Parâmetros esperados no body JSON:
 * - rootFolderId: ID ou URL da pasta raiz no Google Drive
 * - ano: Ano (ex: "2026")
 * - mes: Pasta do Mês (ex: "2026-05 - Maio")
 * - categoria: Categoria padronizada (ex: "01_Treinamentos", "02_DDSMA", etc.)
 * - nomePastaFinal: Subpasta do evento (ex: "2026-05-14 - NR-35 Trabalho em Altura")
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'erro',
        message: 'Nenhum dado recebido no corpo da requisição POST.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    
    // Suporte flexível para os parâmetros
    let rootFolderId = data.rootFolderId || data.folderId || data.pastaRaizId;
    const ano = String(data.ano || new Date().getFullYear());
    const mes = data.mes || data.mesPasta || formatarMesPadrao(new Date());
    const categoria = data.categoria || data.categoriaPasta || '01_Treinamentos';
    const nomePastaFinal = data.nomePastaFinal || data.subpasta || data.subpastaFinal || 'Evidencias';

    // 1. Sanitiza rootFolderId se o usuário passou a URL completa do Drive
    if (rootFolderId && (rootFolderId.indexOf('http://') === 0 || rootFolderId.indexOf('https://') === 0)) {
      const match = rootFolderId.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        rootFolderId = match[1];
      }
    }

    // Se ainda assim não vier rootFolderId, fallback para a pasta raiz do Drive
    let pastaAtual;
    if (rootFolderId) {
      pastaAtual = DriveApp.getFolderById(rootFolderId);
    } else {
      pastaAtual = DriveApp.getRootFolder();
    }

    // 2. Navega ou cria recursivamente: Ano -> Mês -> Categoria -> Subpasta
    pastaAtual = getOrCreateSubFolder(pastaAtual, String(ano));
    pastaAtual = getOrCreateSubFolder(pastaAtual, mes);                   // Ex: "2026-05 - Maio"
    pastaAtual = getOrCreateSubFolder(pastaAtual, categoria);             // Ex: "01_Treinamentos"
    const pastaFinal = getOrCreateSubFolder(pastaAtual, nomePastaFinal); // Ex: "2026-05-14 - NR-35..."

    // Garante permissão de visualização/link se aplicável
    try {
      pastaFinal.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (_) {}

    return ContentService.createTextOutput(JSON.stringify({
      status: 'sucesso',
      folderId: pastaFinal.getId(),
      folderUrl: pastaFinal.getUrl(),
      caminho: `${ano} / ${mes} / ${categoria} / ${nomePastaFinal}`
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Erro ao criar/localizar pasta no Drive: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'erro',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Localiza subpasta existente pelo nome ou cria uma nova se não existir
 */
function getOrCreateSubFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Formatação auxiliar de fallback de mês caso não seja enviado
 */
function formatarMesPadrao(d) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const ano = d.getFullYear();
  const mesNum = String(d.getMonth() + 1).padStart(2, '0');
  const nomeMes = meses[d.getMonth()];
  return `${ano}-${mesNum} - ${nomeMes}`;
}
