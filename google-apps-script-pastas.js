function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "erro", message: "Sem dados" })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || "").trim();

    if (action === "listarFotosSubpastas" || action === "extrairFotosDaPasta") {
      return listarFotosSubpastas(data);
    }
    if (action === "criarEstruturaCronograma" || (Array.isArray(data.temas) && data.temas.length > 0)) {
      return criarEstruturaCronograma(data);
    }
    return criarPastaEvidenciasFotos(data);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "erro", message: String(error) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function listarFotosSubpastas(data) {
  var pastaId = extrairIdPasta(data.pastaId || data.pastaRaizId || data.folderId);
  if (!pastaId) {
    return ContentService.createTextOutput(JSON.stringify({ status: "erro", message: "ID invalido" })).setMimeType(ContentService.MimeType.JSON);
  }
  var pastaMae;
  try {
    pastaMae = DriveApp.getFolderById(pastaId);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "erro", message: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }

  var subpastas = pastaMae.getFolders();
  var resultado = [];

  while (subpastas.hasNext()) {
    var sub = subpastas.next();
    var arquivos = sub.getFiles();
    var fotos = [];

    while (arquivos.hasNext()) {
      var arq = arquivos.next();
      var mime = arq.getMimeType();
      if (mime.indexOf("image/") === 0 || mime === "application/vnd.google-apps.photo") {
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
      pastaId: sub.getId(),
      pastaNome: sub.getName(),
      fotos: fotos
    });
  }

  resultado.sort(function(a, b) {
    return a.pastaNome.localeCompare(b.pastaNome, "pt-BR");
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: "sucesso",
    pastaMaeNome: pastaMae.getName(),
    pastaMaeId: pastaMae.getId(),
    totalSubpastas: resultado.length,
    subpastas: resultado,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function criarEstruturaCronograma(data) {
  var rootFolderId = extrairIdPasta(data.pastaRaizId || data.rootFolderId || data.folderId);
  var ano = String(data.ano || new Date().getFullYear());
  var mes = normalizarNomeMes(data.mes || (new Date().getMonth() + 1));
  var temas = Array.isArray(data.temas) ? data.temas : [];

  var pastaRaiz;
  if (rootFolderId) {
    try {
      pastaRaiz = DriveApp.getFolderById(rootFolderId);
    } catch (eRaiz) {
      pastaRaiz = DriveApp.getRootFolder();
    }
  } else {
    pastaRaiz = DriveApp.getRootFolder();
  }

  var pastaAno = getOrCreateSubFolder(pastaRaiz, String(ano));
  var pastaMes = getOrCreateSubFolder(pastaAno, String(mes));
  var pastasResultado = [];

  for (var i = 0; i < temas.length; i++) {
    var t = temas[i];
    var diaRaw = String(t.dia || "").trim();
    var codRaw = String(t.codigo || t.cod || "").trim();
    var temaRaw = String(t.tema || t.nome || "").trim();

    var matchNumMes = String(mes).match(/^(\d{2})/);
    var numMesPadrao = matchNumMes ? matchNumMes[1] : String(new Date().getMonth() + 1).padStart(2, "0");

    var prefixoData = diaRaw;
    if (prefixoData) {
      if (prefixoData.includes("-") && prefixoData.length >= 8) {
        var partes = prefixoData.split("-");
        prefixoData = partes[2] + "/" + partes[1];
      } else if (!prefixoData.includes("/") && !prefixoData.includes("-")) {
        prefixoData = prefixoData.padStart(2, "0") + "/" + numMesPadrao;
      }
    } else {
      prefixoData = "01/" + numMesPadrao;
    }

    var nomePastaTema = codRaw ? ("[" + prefixoData + "] " + codRaw + " - " + temaRaw) : ("[" + prefixoData + "] " + temaRaw);
    var prefixoAlt = prefixoData.replace("/", "-");
    var pastaTema = getOrCreateTemaFolder(pastaMes, nomePastaTema, "[" + prefixoData + "]", "[" + prefixoAlt + "]", codRaw, temaRaw);

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
      caminho: ano + " / " + mes + " / " + pastaTema.getName()
    });
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "sucesso",
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
  var rootFolderId = extrairIdPasta(data.rootFolderId || data.folderId || data.pastaRaizId);
  var ano = String(data.ano || new Date().getFullYear());
  var mes = data.mes || data.mesPasta || formatarMesPadrao(new Date());
  var categoria = data.categoria || data.categoriaPasta || "01_Treinamentos";
  var nomePastaFinal = data.nomePastaFinal || data.subpasta || data.subpastaFinal || "Evidencias";

  var pastaAtual;
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
  var pastaFinal = getOrCreateSubFolder(pastaAtual, nomePastaFinal);

  try {
    pastaFinal.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_) {}

  return ContentService.createTextOutput(JSON.stringify({
    status: "sucesso",
    folderId: pastaFinal.getId(),
    folderUrl: pastaFinal.getUrl(),
    caminho: ano + " / " + mes + " / " + categoria + " / " + nomePastaFinal,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSubFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function getOrCreateTemaFolder(parentFolder, folderName, prefixo1, prefixo2, cod, tema) {
  var exact = parentFolder.getFoldersByName(folderName);
  if (exact.hasNext()) return exact.next();

  var all = parentFolder.getFolders();
  var tNorm = tema ? tema.toUpperCase().trim() : "";
  var codNorm = cod ? cod.toUpperCase().trim() : "";

  while (all.hasNext()) {
    var f = all.next();
    var fName = f.getName().trim().toUpperCase();
    if (prefixo1 && fName.indexOf(prefixo1.toUpperCase()) === 0) return f;
    if (prefixo2 && fName.indexOf(prefixo2.toUpperCase()) === 0) return f;
    if (codNorm && tNorm && fName.includes(codNorm) && fName.includes(tNorm.substring(0, 10))) return f;
  }

  return parentFolder.createFolder(folderName);
}

function normalizarNomeMes(mesValor) {
  var meses = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  var str = String(mesValor || "").trim();
  if (/^\d{2}\s*-\s*[A-Za-z]+/.test(str)) return str;
  if (/^\d{1,2}$/.test(str)) {
    var num = parseInt(str, 10);
    if (num >= 0 && num <= 11 && str === "0") num = 1;
    if (num >= 1 && num <= 12) return String(num).padStart(2, "0") + " - " + meses[num - 1];
  }
  for (var i = 0; i < meses.length; i++) {
    if (str.toLowerCase().includes(meses[i].toLowerCase())) return String(i + 1).padStart(2, "0") + " - " + meses[i];
  }
  return formatarMesPadrao(new Date());
}

function formatarMesPadrao(d) {
  var meses = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return String(d.getMonth() + 1).padStart(2, "0") + " - " + meses[d.getMonth()];
}

function extrairIdPasta(urlOuId) {
  if (!urlOuId) return "";
  var str = String(urlOuId).trim();
  var match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return str;
}
