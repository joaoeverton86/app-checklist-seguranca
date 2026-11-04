function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    servico: 'Automacao de Pastas de SST (Cronograma e Evidencias)',
    acoesDisponiveis: ['criarEstruturaCronograma', 'criar_pasta_fotos', 'listarFotosSubpastas'],
    mensagem: 'Web App ativo e pronto para receber requisicoes POST.',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'erro',
        message: 'Nenhum dado recebido no corpo da requisicao POST.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const action = String(data.action || '').trim();

    if (action === 'listarFotosSubpastas' || action === 'extrairFotosDaPasta') {
      return listarFotosSubpastas(data);
    }

    if (action === 'criarEstruturaCronograma' || (Array.isArray(data.temas) && data.temas.length > 0)) {
      return criarEstruturaCronograma(data);
    }

    return criarPastaEvidenciasFotos(data);

  } catch (error) {
    Logger.log('Erro geral no doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'erro',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function listarFotosSubpastas(data) {
  let pastaId = extrairIdPasta(data.pastaId || data.pastaRaizId || data.folderId);
  if (!pastaId) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'erro',
      message: 'ID da pasta nao informado.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let pastaMae;
  try {
    pastaMae = DriveApp.getFolderById(pastaId);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'erro',
      message: 'Nao foi possivel acessar a pasta no Drive: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const subpastas = pastaMae.getFolders();
  const resultado = [];

  while (subpastas.hasNext()) {
    const sub = subpastas.next();
    const subNome = sub.getName();
    const subId = sub.getId();

    const arquivos = sub.getFiles();
    const fotos = [];

    while (arquivos.hasNext()) {
      const arq = arquivos.next();
      const mime = arq.getMimeType();
      if (mime.indexOf('image/') === 0 || mime === 'application/vnd.google-apps.photo') {
        try {
          arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (_) {}

        fotos.push({
          id: arq.getId(),
          nome: arq.getName(),
          url: arq.getUrl(),
          tamanho: arq.getSize()
        });
      }
    }

    resultado.push({
      pastaId: subId,
      pastaNome: subNome,
      fotos: fotos
    });
  }

  resultado.sort(function(a, b) {
    return a.pastaNome.localeCompare(b.pastaNome, 'pt-BR');
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: 'sucesso',
    pastaMaeNome: pastaMae.getName(),
    pastaMaeId: pastaMae.getId(),
    totalSubpastas: resultado.length,
    subpastas: resultado,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function criarEstruturaCronograma(data) {
  let rootFolderId = extrairIdPasta(data.pastaRaizId || data.rootFolderId || data.folderId);
  const ano = String(data.ano || new Date().getFullYear());
  let mes = normalizarNomeMes(data.mes || (new Date().getMonth() + 1));
  const temas = Array.isArray(data.temas) ? data.temas : [];

  let pastaRaiz;
  if (rootFolderId) {
    try {
      pastaRaiz = DriveApp.getFolderById(rootFolderId);
    } catch (eRaiz) {
      pastaRaiz = DriveApp.getRootFolder();
    }
  } else {
    pastaRaiz = DriveApp.getRootFolder();
  }

  const pastaAno = getOrCreateSubFolder(pastaRaiz, String(ano));
  const pastaMes = getOrCreateSubFolder(pastaAno, String(mes));
  const pastasResultado = [];

  for (let i = 0; i < temas.length; i++) {
    const t = temas[i];
    const diaRaw = String(t.dia || '').trim();
    const codRaw = String(t.codigo || t.cod || '').trim();
    const temaRaw = String(t.tema || t.nome || '').trim();

    const matchNumMes = String(mes).match(/^(\d{2})/);
    const numMesPadrao = matchNumMes ? matchNumMes[1] : String(new Date().getMonth() + 1).padStart(2, '0');

    let prefixoData = diaRaw;
    if (prefixoData) {
      if (prefixoData.includes('-') && prefixoData.length >= 8) {
        const partes = prefixoData.split('-');
        prefixoData = partes[2] + '/' + partes[1];
      } else if (!prefixoData.includes('/') && !prefixoData.includes('-')) {
        prefixoData = prefixoData.padStart(2, '0') + '/' + numMesPadrao;
      }
    } else {
      prefixoData = '01/' + numMesPadrao;
    }

    let nomePastaTema = codRaw ? ('[' + prefixoData + '] ' + codRaw + ' - ' + temaRaw) : ('[' + prefixoData + '] ' + temaRaw);
    const prefixoAlt = prefixoData.replace('/', '-');
    const pastaTema = getOrCreateTemaFolder(pastaMes, nomePastaTema, '[' + prefixoData + ']', '[' + prefixoAlt + ']', codRaw, temaRaw);

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
      caminho: ano + ' / ' + mes + ' / ' + pastaTema.getName()
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
    caminho: ano + ' / ' + mes + ' / ' + categoria + ' / ' + nomePastaFinal,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSubFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function getOrCreateTemaFolder(parentFolder, folderName, prefixo1, prefixo2, cod, tema) {
  const exact = parentFolder.getFoldersByName(folderName);
  if (exact.hasNext()) return exact.next();

  const all = parentFolder.getFolders();
  const tNorm = tema ? tema.toUpperCase().trim() : '';
  const codNorm = cod ? cod.toUpperCase().trim() : '';

  while (all.hasNext()) {
    const f = all.next();
    const fName = f.getName().trim().toUpperCase();
    if (prefixo1 && fName.indexOf(prefixo1.toUpperCase()) === 0) return f;
    if (prefixo2 && fName.indexOf(prefixo2.toUpperCase()) === 0) return f;
    if (codNorm && tNorm && fName.includes(codNorm) && fName.includes(tNorm.substring(0, 10))) return f;
  }

  return parentFolder.createFolder(folderName);
}

function normalizarNomeMes(mesValor) {
  const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const str = String(mesValor || '').trim();
  if (/^\d{2}\s*-\s*[A-Za-z]+/.test(str)) return str;
  if (/^\d{1,2}$/.test(str)) {
    let num = parseInt(str, 10);
    if (num >= 0 && num <= 11 && str === '0') num = 1;
    if (num >= 1 && num <= 12) return String(num).padStart(2, '0') + ' - ' + meses[num - 1];
  }
  for (let i = 0; i < meses.length; i++) {
    if (str.toLowerCase().includes(meses[i].toLowerCase())) return String(i + 1).padStart(2, '0') + ' - ' + meses[i];
  }
  return formatarMesPadrao(new Date());
}

function formatarMesPadrao(d) {
  const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return String(d.getMonth() + 1).padStart(2, '0') + ' - ' + meses[d.getMonth()];
}

function extrairIdPasta(urlOuId) {
  if (!urlOuId) return '';
  const str = String(urlOuId).trim();
  const match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return str;
}
