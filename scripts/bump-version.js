/**
 * scripts/bump-version.js
 * Utilitário para sincronizar a versão do Painel Gerencial em todos os 3 pontos:
 * 1. VERSAO_PAINEL em dashboard/dashboard.js
 * 2. Badges de versão (Login e Sidebar) em dashboard/index.html
 * 3. Todos os parâmetros de cache-buster (?v=...) em dashboard/index.html
 *
 * Uso:
 *   node scripts/bump-version.js       -> Incrementa automaticamente (+1)
 *   node scripts/bump-version.js 232   -> Define explicitamente para v232
 */

const fs = require('fs');
const path = require('path');

const fileDashboardJs = path.join(__dirname, '..', 'dashboard', 'dashboard.js');
const fileIndexHtml = path.join(__dirname, '..', 'dashboard', 'index.html');

let jsContent = fs.readFileSync(fileDashboardJs, 'utf8');
let htmlContent = fs.readFileSync(fileIndexHtml, 'utf8');

// Detecta versão atual
const matchAtual = jsContent.match(/var\s+VERSAO_PAINEL\s*=\s*'v(\d+)';/);
if (!matchAtual) {
  console.error('❌ Não foi possível encontrar "var VERSAO_PAINEL = \'v...\';" em dashboard/dashboard.js');
  process.exit(1);
}

const versaoAtualNum = parseInt(matchAtual[1], 10);
let novaVersaoNum;

const arg = process.argv[2];
if (arg) {
  const argClean = arg.replace(/^v/i, '');
  novaVersaoNum = parseInt(argClean, 10);
  if (isNaN(novaVersaoNum)) {
    console.error(`❌ Versão inválida fornecida: "${arg}". Use um número como 232.`);
    process.exit(1);
  }
} else {
  novaVersaoNum = versaoAtualNum + 1;
}

const novaVersaoStr = `v${novaVersaoNum}`;
console.log(`🔄 Atualizando versão do Painel Gerencial: v${versaoAtualNum} ➔ ${novaVersaoStr}`);

// 1. Atualiza dashboard.js
jsContent = jsContent.replace(
  /var\s+VERSAO_PAINEL\s*=\s*'v\d+';/,
  `var VERSAO_PAINEL = '${novaVersaoStr}';`
);
fs.writeFileSync(fileDashboardJs, jsContent, 'utf8');
console.log(`  ✅ dashboard/dashboard.js: VERSAO_PAINEL = '${novaVersaoStr}'`);

// 2. Atualiza badges no index.html
htmlContent = htmlContent.replace(
  /(id="badgeVersaoDashboardLogin"[^>]*>)v\d+(<\/span>)/g,
  `$1${novaVersaoStr}$2`
);
htmlContent = htmlContent.replace(
  /(id="badgeVersaoDashboardSidebar"[^>]*>)v\d+(<\/span>)/g,
  `$1${novaVersaoStr}$2`
);

// 3. Atualiza cache-busters (?v=...) no index.html
let cacheBusterCount = 0;
htmlContent = htmlContent.replace(/\?v=\d+/g, () => {
  cacheBusterCount++;
  return `?v=${novaVersaoNum}`;
});

fs.writeFileSync(fileIndexHtml, htmlContent, 'utf8');
console.log(`  ✅ dashboard/index.html: Badges de login e sidebar atualizados para ${novaVersaoStr}`);
console.log(`  ✅ dashboard/index.html: ${cacheBusterCount} tags de script/css sincronizadas com ?v=${novaVersaoNum}`);

console.log(`🎉 Versão sincronizada com sucesso para ${novaVersaoStr}!`);
