const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const raiz = path.resolve(__dirname, '..');
function arquivos(pasta) {
    return fs.readdirSync(path.join(raiz, pasta), { withFileTypes: true }).flatMap(item => {
        const relativo = path.join(pasta, item.name);
        return item.isDirectory() ? arquivos(relativo) : /\.(?:js|cjs)$/.test(item.name) ? [relativo] : [];
    });
}
const alvos = [
    ...fs.readdirSync(raiz).filter(nome => /\.(?:js|cjs)$/.test(nome)),
    ...['dashboard', 'api', 'scripts'].flatMap(arquivos)
].sort();
let falhas = 0;
for (const arquivo of alvos) {
    const r = spawnSync(process.execPath, ['--check', path.join(raiz, arquivo)], { encoding: 'utf8' });
    if (r.error || r.status !== 0) {
        falhas++;
        console.error(arquivo, r.error?.message || r.stderr);
    }
}
console.log(`Sintaxe: ${alvos.length - falhas}/${alvos.length} arquivos aprovados (sem executar o código).`);
process.exitCode = falhas ? 1 : 0;
