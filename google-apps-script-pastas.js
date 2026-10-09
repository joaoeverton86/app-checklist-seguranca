// =========================================================================================
// GOOGLE APPS SCRIPT - AUTOMAÇÃO HIERÁRQUICA DE PASTAS DO GOOGLE DRIVE (SST)
// =========================================================================================
// Suporta:
// 1. Criação em lote da estrutura mensal do Cronograma de Treinamentos/DDSMA (Ação: "criarEstruturaCronograma")
//    Padrão: [Pasta Raiz] -> [Ano] -> [Mês (ex: 10 - Outubro)] -> [Subpastas de Temas: [DD/MM] COD - TEMA]
// 2. Criação individual de pastas de Fotos & Evidências (Ação: "criar_pasta_fotos")
//    Padrão: [Pasta Raiz] -> [Ano] -> [Mês] -> [Categoria] -> [Subpasta do Evento]
//
// INSTRUÇÕES DE IMPLANTAÇÃO COMO APLICATIVO DA WEB (WEB APP):
// 1. Acesse o Google Drive (com a conta proprietária da pasta de SST).
// 2. Crie um novo projeto no Google Apps Script (ou acesse: https://script.google.com).
// 3. Cole todo este código no editor (substituindo o conteúdo de "Código.gs").
// 4. Clique em "Implantar" (Deploy) no canto superior direito -> "Nova implantação" (New deployment).
// 5. Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha "Aplicativo da Web" (Web app).
// 6. Preencha as opções EXATAMENTE assim:
//    - Descrição: Automação de Pastas SST (Cronograma & Fotos)
//    - Executar como (Execute as): "Eu" (seu e-mail proprietário do Drive)
//    - Quem pode acessar (Who has access): "Qualquer pessoa" (Anyone)
// 7. Clique em "Implantar" (Deploy), autorize as permissões da conta Google e copie a URL do Web App:
//    URL OFICIAL IMPLANTADA:
//    https://script.google.com/macros/s/AKfycbzdCzGE9Jm77RauUe8iuo1p8il193F7Pd7HeLLbut0zToD8zhHtv2RBSAY86bQZGLtA/exec
// 8. No Painel Gerencial de SST, a URL acima já está configurada como padrão operacional no sistema.
// =========================================================================================

/**
 * Endpoint GET para diagnóstico rápido e teste no navegador
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    servico: 'Automação de Pastas de SST (Cronograma & Evidências)',
    acoesDisponiveis: ['criarEstruturaCronograma', 'criar_pasta_fotos'],
    mensagem: 'Web App ativo e pronto para receber requisições POST.',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint POST principal
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
    const action = String(data.action || '').trim();

    // Roteamento de ações
    if (action === 'criarEstruturaCronograma' || (Array.isArray(data.temas) && data.temas.length > 0)) {
      return criarEstruturaCronograma(data);
    }

    // Ação padrão legada: criação individual de pasta de fotos/evidências
    return criarPastaEvidenciasFotos(data);

  } catch (error) {
    Logger.log('Erro geral no doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'erro',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * AÇÃO 1: Criação recursiva e idempotente de pastas para todos os temas de treinamento do cronograma
 * Estrutura: [Pasta Raiz] -> [Ano] -> [Mês (ex: "10 - Outubro")] -> [Subpasta: "[DD/MM] COD - TEMA"]
 */
function criarEstruturaCronograma(data) {
  let rootFolderId = data.pastaRaizId || data.rootFolderId || data.folderId;
  const ano = String(data.ano || new Date().getFullYear());
  let mes = normalizarNomeMes(data.mes || (new Date().getMonth() + 1));
  const temas = Array.isArray(data.temas) ? data.temas : [];

  // Sanitiza rootFolderId se for uma URL completa do Drive
  rootFolderId = extrairIdPasta(rootFolderId);

  let pastaRaiz;
  if (rootFolderId) {
    try {
      pastaRaiz = DriveApp.getFolderById(rootFolderId);
    } catch (eRaiz) {
      Logger.log('Pasta raiz não localizada pelo ID informado, usando Raiz do Meu Drive: ' + eRaiz.toString());
      pastaRaiz = DriveApp.getRootFolder();
    }
  } else {
    pastaRaiz = DriveApp.getRootFolder();
  }

  // 1. Localiza ou cria pasta do Ano (ex: "2026")
  const pastaAno = getOrCreateSubFolder(pastaRaiz, String(ano));

  // 2. Localiza ou cria pasta do Mês (ex: "10 - Outubro")
  const pastaMes = getOrCreateSubFolder(pastaAno, String(mes));

  const pastasResultado = [];

  // 3. Itera sobre cada tema de treinamento do cronograma
  for (let i = 0; i < temas.length; i++) {
    const t = temas[i];
    const diaRaw = String(t.dia || '').trim();
    const codRaw = String(t.codigo || t.cod || '').trim();
    const temaRaw = String(t.tema || t.nome || '').trim();

    // Extrai número do mês a partir do nome da pasta (ex: "10 - Outubro" -> "10")
    const matchNumMes = String(mes).match(/^(\d{2})/);
    const numMesPadrao = matchNumMes ? matchNumMes[1] : String(new Date().getMonth() + 1).padStart(2, '0');

    // Formata o dia no padrão DD/MM
    let prefixoData = diaRaw;
    if (prefixoData) {
      if (prefixoData.includes('-') && prefixoData.length >= 8) {
        // Formato ISO: YYYY-MM-DD
        const partes = prefixoData.split('-');
        prefixoData = `${partes[2]}/${partes[1]}`;
      } else if (!prefixoData.includes('/') && !prefixoData.includes('-')) {
        prefixoData = `${prefixoData.padStart(2, '0')}/${numMesPadrao}`;
      }
    } else {
      prefixoData = `01/${numMesPadrao}`;
    }

    // Padrão de nomenclatura: [DD/MM] COD - TEMA ou [DD/MM] TEMA
    let nomePastaTema = '';
    if (codRaw) {
      nomePastaTema = `[${prefixoData}] ${codRaw} - ${temaRaw}`;
    } else {
      nomePastaTema = `[${prefixoData}] ${temaRaw}`;
    }

    // Prefixo alternativo para compatibilidade/idempotência tolerante (ex: [01-10] vs [01/10])
    const prefixoAlt = prefixoData.replace('/', '-');

    // Localiza ou cria de forma estritamente idempotente
    const pastaTema = getOrCreateTemaFolder(pastaMes, nomePastaTema, `[${prefixoData}]`, `[${prefixoAlt}]`, codRaw, temaRaw);

    // Permissão de leitura pública por link
    try {
      pastaTema.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (_) {}

    pastasResultado.push({
      id: t.id || null,
      dia: prefixoData,
      codigo: codRaw,
      tema: temaRaw,
      nomePasta: pastaTema.getName(),
      folderId: pastaTema.getId(),
      folderUrl: pastaTema.getUrl(),
      caminho: `${ano} / ${mes} / ${pastaTema.getName()}`
    });
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'sucesso',
    ano: ano,
    mes: mes,
    pastaMesId: pastaMes.getId(),
    pastaMesUrl: pastaMes.getUrl(),
    totalTemas: temas.length,
    pastas: pastasResultado,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * AÇÃO 2: Criação individual de pasta de fotos e evidências operacionais
 */
function criarPastaEvidenciasFotos(data) {
  let rootFolderId = extrairIdPasta(data.rootFolderId || data.folderId || data.pastaRaizId);
  const ano = String(data.ano || new Date().getFullYear());
  const mes = data.mes || data.mesPasta || formatarMesPadrao(new Date());
  const categoria = data.categoria || data.categoriaPasta || '01_Treinamentos';
  const nomePastaFinal = data.nomePastaFinal || data.subpasta || data.subpastaFinal || 'Evidencias';

  let pastaAtual;
  if (rootFolderId) {
    try {
      pastaAtual = DriveApp.getFolderById(rootFolderId);
    } catch (_) {
      pastaAtual = DriveApp.getRootFolder();
    }
  } else {
    pastaAtual = DriveApp.getRootFolder();
  }

  // Navega/cria recursivamente: Ano -> Mês -> Categoria -> Subpasta Final
  pastaAtual = getOrCreateSubFolder(pastaAtual, String(ano));
  pastaAtual = getOrCreateSubFolder(pastaAtual, mes);
  pastaAtual = getOrCreateSubFolder(pastaAtual, categoria);
  const pastaFinal = getOrCreateSubFolder(pastaAtual, nomePastaFinal);

  try {
    pastaFinal.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_) {}

  return ContentService.createTextOutput(JSON.stringify({
    status: 'sucesso',
    folderId: pastaFinal.getId(),
    folderUrl: pastaFinal.getUrl(),
    caminho: `${ano} / ${mes} / ${categoria} / ${nomePastaFinal}`,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Localiza subpasta existente pelo nome ou cria uma nova se não existir (Idempotente)
 */
function getOrCreateSubFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Localiza subpasta de tema com tolerância a variações de prefixo ([01/10] vs [01-10])
 * para assegurar que chamadas repetidas NÃO criem pastas duplicadas
 */
function getOrCreateTemaFolder(parentFolder, folderName, prefixo1, prefixo2, cod, tema) {
  // 1. Tenta correspondência exata
  const exact = parentFolder.getFoldersByName(folderName);
  if (exact.hasNext()) return exact.next();

  // 2. Busca pastas existentes com prefixo compatível
  const all = parentFolder.getFolders();
  const tNorm = tema ? tema.toUpperCase().trim() : '';
  const codNorm = cod ? cod.toUpperCase().trim() : '';

  while (all.hasNext()) {
    const f = all.next();
    const fName = f.getName().trim().toUpperCase();

    // Se começa com [DD/MM] ou [DD-MM]
    if (prefixo1 && fName.indexOf(prefixo1.toUpperCase()) === 0) {
      return f;
    }
    if (prefixo2 && fName.indexOf(prefixo2.toUpperCase()) === 0) {
      return f;
    }
    // Se contém código e os primeiros 10 caracteres do tema
    if (codNorm && tNorm && fName.includes(codNorm) && fName.includes(tNorm.substring(0, 10))) {
      return f;
    }
  }

  // 3. Se não existir, cria a nova pasta
  return parentFolder.createFolder(folderName);
}

/**
 * Normaliza o nome do mês para o formato "MM - NomeDoMês" (ex: "10 - Outubro")
 */
function normalizarNomeMes(mesValor) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const str = String(mesValor || '').trim();

  // Já está no formato "10 - Outubro"
  if (/^\d{2}\s*-\s*[A-Za-zçãéíóú]+/i.test(str)) {
    return str;
  }

  // Apenas número (0 a 11 ou 1 a 12)
  if (/^\d{1,2}$/.test(str)) {
    let num = parseInt(str, 10);
    // Se for 0 a 11 (índice JS)
    if (num >= 0 && num <= 11 && str === '0') num = 1;
    if (num >= 1 && num <= 12) {
      return `${String(num).padStart(2, '0')} - ${meses[num - 1]}`;
    }
  }

  // Nome do mês em texto
  for (let i = 0; i < meses.length; i++) {
    if (str.toLowerCase().includes(meses[i].toLowerCase())) {
      return `${String(i + 1).padStart(2, '0')} - ${meses[i]}`;
    }
  }

  return formatarMesPadrao(new Date());
}

/**
 * Formatação auxiliar de fallback
 */
function formatarMesPadrao(d) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesNum = String(d.getMonth() + 1).padStart(2, '0');
  const nomeMes = meses[d.getMonth()];
  return `${mesNum} - ${nomeMes}`;
}

/**
 * Extrai o ID do Google Drive de uma URL completa ou retorna o próprio ID
 */
function extrairIdPasta(urlOuId) {
  if (!urlOuId) return '';
  const str = String(urlOuId).trim();
  const match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return str;
}
