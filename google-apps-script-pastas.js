function doGet(e) {
  var raiz = PropertiesService.getScriptProperties().getProperty("FOTOS_ROOT_ID");
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok", protocolo: "pastas-assinadas-v1", somenteLeitura: true,
    assinaturaObrigatoria: true,
    assinaturaConfigurada: String(PropertiesService.getScriptProperties().getProperty("DRIVE_PASTAS_SIGNING_SECRET") || "").length >= 32,
    raizConfigurada: Boolean(raiz),
    raizHash: raiz ? bytesHexPastas(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raiz, Utilities.Charset.UTF_8)) : null
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "erro", message: "Sem dados" })).setMimeType(ContentService.MimeType.JSON);
    }
    if (e.postData.contents.length > 520000) throw new Error("Pedido excede o limite da integração.");
    var autorizado = validarEnvelopePastas(JSON.parse(e.postData.contents));
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error("Outra operação de pastas está em andamento. Consulte novamente.");
    var cache = CacheService.getScriptCache();
    if (cache.get(autorizado.nonce)) throw new Error("Pedido já utilizado. Consulte novamente antes de repetir.");
    cache.put(autorizado.nonce, "utilizado", 120);
    var data = autorizado.data;
    var action = String(data.action || "").trim();

    if (action === "diagnostico") {
      return ContentService.createTextOutput(JSON.stringify({status:"sucesso", somenteLeitura:true})).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "listarFotosSubpastas") {
      return listarFotosSubpastas(data);
    }
    if (action === "criarEstruturaCronograma") {
      return criarEstruturaCronograma(data);
    }
    if (action === "criar_pasta_fotos") return criarPastaEvidenciasFotos(data);
    throw new Error("Ação não autorizada.");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "erro", message: String(error) })).setMimeType(ContentService.MimeType.JSON);
  } finally { if (lock) lock.releaseLock(); }
}

function bytesHexPastas(bytes) {
  return bytes.map(function(b) { return ("0" + (b & 255).toString(16)).slice(-2); }).join("");
}
function validarEnvelopePastas(pedido) {
  var segredo = PropertiesService.getScriptProperties().getProperty("DRIVE_PASTAS_SIGNING_SECRET");
  if (!segredo || segredo.length < 32 || typeof pedido.envelope !== "string" || pedido.envelope.length > 250000 || !/^[a-f0-9]{64}$/.test(pedido.assinatura || "")) throw new Error("Pedido sem autorização válida do painel.");
  var esperado = bytesHexPastas(Utilities.computeHmacSha256Signature(pedido.envelope, segredo, Utilities.Charset.UTF_8));
  var diferenca = 0;
  for (var i=0;i<64;i++) diferenca |= esperado.charCodeAt(i) ^ pedido.assinatura.charCodeAt(i);
  if (diferenca) throw new Error("Assinatura inválida.");
  var env = JSON.parse(pedido.envelope);
  if (env.v !== 1 || !env.uid || !Number.isSafeInteger(env.exp) || env.exp <= Date.now() || env.exp > Date.now()+90000 || !/^[a-f0-9-]{36}$/.test(env.nonce || "")) throw new Error("Autorização expirada ou inválida.");
  var raiz = PropertiesService.getScriptProperties().getProperty("FOTOS_ROOT_ID");
  if (!raiz || env.raiz !== raiz || !Array.isArray(env.raizes) || !env.raizes.includes(raiz) || !env.data) throw new Error("Raiz não autorizada.");
  var action = env.data.action;
  if (!["listarFotosSubpastas","criar_pasta_fotos","criarEstruturaCronograma","diagnostico"].includes(action)) throw new Error("Ação não autorizada.");
  if (action === "criar_pasta_fotos" && env.data.rootFolderId !== raiz) throw new Error("Raiz de fotos não autorizada.");
  if (action === "criarEstruturaCronograma" && !env.raizes.includes(env.data.pastaRaizId)) throw new Error("Raiz de escaneados não autorizada.");
  return env;
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

  var raiz = PropertiesService.getScriptProperties().getProperty("FOTOS_ROOT_ID");
  if (!raiz) throw new Error("Configure FOTOS_ROOT_ID nas propriedades do script.");
  var atual = pastaMae;
  var permitida = false;
  for (var nivel = 0; nivel < 12; nivel++) {
    if (atual.getId() === raiz) { permitida = true; break; }
    var pais = atual.getParents();
    if (!pais.hasNext()) break;
    atual = pais.next();
  }
  if (!permitida) throw new Error("Pasta fora da raiz de fotos autorizada.");

  var subpastas = pastaMae.getFolders();
  var resultado = [];
  var totalFotosConsulta = 0;

  while (subpastas.hasNext()) {
    if (resultado.length >= 200) throw new Error("Mais de 200 subpastas: consulte uma pasta mensal menor.");
    var sub = subpastas.next();
    var arquivos = sub.getFiles();
    var fotos = [];

    while (arquivos.hasNext()) {
      var arq = arquivos.next();
      var mime = arq.getMimeType();
      if (mime.indexOf("image/") === 0 || mime === "application/vnd.google-apps.photo") {
        totalFotosConsulta++;
        if (totalFotosConsulta > 2000) throw new Error("Mais de 2000 fotos: consulte uma pasta mensal menor.");
        if (fotos.length >= 200) throw new Error("Mais de 200 fotos em uma subpasta.");
        fotos.push({
          id: arq.getId(),
          nome: arq.getName(),
          mimeType: mime,
          url: arq.getUrl(),
          tamanho: arq.getSize()
        });
      }
    }

    fotos.sort(function(a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });

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
    somenteLeitura: true,
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

  if (!rootFolderId) throw new Error("Informe a raiz autorizada.");
  var pastaRaiz = DriveApp.getFolderById(rootFolderId);

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

  if (!rootFolderId) throw new Error("Informe a raiz autorizada.");
  var pastaAtual = DriveApp.getFolderById(rootFolderId);

  pastaAtual = getOrCreateSubFolder(pastaAtual, String(ano));
  pastaAtual = getOrCreateSubFolder(pastaAtual, mes);
  pastaAtual = getOrCreateSubFolder(pastaAtual, categoria);
  var pastaFinal = getOrCreateSubFolder(pastaAtual, nomePastaFinal);


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
  if (folders.hasNext()) {
    var existente = folders.next();
    if (folders.hasNext()) throw new Error("Há pastas duplicadas para " + folderName + ". Confira o Drive.");
    return existente;
  }
  return parentFolder.createFolder(folderName);
}

function getOrCreateTemaFolder(parentFolder, folderName, prefixo1, prefixo2, cod, tema) {
  var exact = parentFolder.getFoldersByName(folderName);
  if (exact.hasNext()) {
    var existente = exact.next();
    if (exact.hasNext()) throw new Error("Há pastas duplicadas para " + folderName + ". Confira o Drive.");
    return existente;
  }

  var all = parentFolder.getFolders();
  var normalizar = function(v) { return String(v).normalize("NFC").toUpperCase().replace(/\s+/g," ").trim(); };
  var esperado = normalizar(folderName);
  var alternativo = normalizar(folderName.replace(prefixo1, prefixo2));
  var encontrado = null;

  while (all.hasNext()) {
    var f = all.next();
    var fName = f.getName().trim().toUpperCase();
    if (normalizar(fName) === esperado || normalizar(fName) === alternativo) {
      if (encontrado) throw new Error("Há pastas duplicadas para o tema e a data.");
      encontrado = f;
    }
  }

  return encontrado || parentFolder.createFolder(folderName);
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
