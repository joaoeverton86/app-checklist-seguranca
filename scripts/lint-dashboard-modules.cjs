// Scripts clássicos compartilham declarações globais; não concatenar arquivos,
// pois isso confunde escopos e números de linha e esconde a origem dos erros.
const fs = require('node:fs');
const path = require('node:path');
const { Linter } = require('eslint');
const raiz = path.resolve(__dirname, '..');
const config = require('../.eslintrc.undef-check.json');
// O painel roda no navegador: o ambiente Node criaria um escopo CommonJS artificial.
config.env = { ...config.env, node: false };
config.parserOptions = { ...config.parserOptions, ecmaFeatures: { globalReturn: false } };
const html = fs.readFileSync(path.join(raiz, 'dashboard/index.html'), 'utf8');
const fontes = new Map();
for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const src = match[1].split(/[?#]/)[0];
    if (/^(?:https?:)?\/\//.test(src)) continue;
    const arquivo = path.resolve(raiz, 'dashboard', src);
    if (!arquivo.startsWith(raiz + path.sep)) throw new Error('Script fora do projeto');
    fontes.set(arquivo, fs.readFileSync(arquivo, 'utf8'));
}
const globais = { ...config.globals };
let falhas = 0;
for (const [arquivo, codigo] of fontes) {
    const analise = new Linter();
    const mensagens = analise.verify(codigo, { ...config, rules: { 'no-undef': 'off' } });
    const fatal = mensagens.find(m => m.fatal);
    if (fatal) {
        console.error(`${path.relative(raiz, arquivo)}:${fatal.line}: ${fatal.message}`);
        falhas++;
        continue;
    }
    for (const variavel of analise.getSourceCode().scopeManager.globalScope.variables) {
        if (variavel.defs.length) globais[variavel.name] = 'readonly';
    }
    const fonte = analise.getSourceCode();
    function exportacoes(node) {
        if (node.type === 'AssignmentExpression' && node.operator === '=') {
            const destino = node.left;
            if (destino.type === 'MemberExpression' && destino.object.type === 'Identifier' &&
                destino.object.name === 'window' && !destino.computed) {
                globais[destino.property.name] = 'readonly';
            }
        }
        for (const chave of fonte.visitorKeys[node.type] || []) {
            const valor = node[chave];
            if (Array.isArray(valor)) valor.filter(Boolean).forEach(exportacoes);
            else if (valor) exportacoes(valor);
        }
    }
    exportacoes(fonte.ast);
}
const modulos = [...fontes.keys()].filter(arquivo => arquivo.includes(`${path.sep}modules${path.sep}`));
// Detectar também módulos ainda não carregados; eles não fornecem globais aos demais.
for (const item of fs.readdirSync(path.join(raiz, 'dashboard/modules'))) {
    if (!item.endsWith('.js')) continue;
    const arquivo = path.join(raiz, 'dashboard/modules', item);
    if (!fontes.has(arquivo)) {
        fontes.set(arquivo, fs.readFileSync(arquivo, 'utf8'));
        modulos.push(arquivo);
    }
}
for (const arquivo of modulos) {
    const mensagens = new Linter().verify(fontes.get(arquivo), { ...config, globals: globais });
    for (const m of mensagens) {
        console.error(`${path.relative(raiz, arquivo)}:${m.line}:${m.column} ${m.message} (${m.ruleId || 'sintaxe'})`);
        falhas++;
    }
}
console.log(`Lint: ${modulos.length} módulos verificados; ${falhas} ocorrências. Declarações e exportações window extraídas dos scripts locais carregados no HTML.`);
console.log('Não verifica ordem de inicialização, handlers inline, duplicações ou regras de negócio.');
process.exitCode = falhas ? 1 : 0;
