// Prévia local do painel; APIs de produção não são simuladas.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
    let rota;
    try { rota = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    if (rota.split('/').some(p => p.startsWith('.')) || /\.(?:pem|key|env)$/i.test(rota)) { res.writeHead(403).end(); return; }
    let arquivo = path.resolve(raiz, '.' + rota);
    if (arquivo !== raiz && !arquivo.startsWith(raiz + path.sep)) { res.writeHead(403).end(); return; }
    fs.stat(arquivo, (erro, stat) => {
        if (erro) { res.writeHead(404).end('Não encontrado'); return; }
        if (stat.isDirectory()) arquivo = path.join(arquivo, 'index.html');
        fs.readFile(arquivo, (erroLeitura, conteudo) => {
            if (erroLeitura) { res.writeHead(404).end('Não encontrado'); return; }
            res.writeHead(200, { 'Content-Type': tipos[path.extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            res.end(conteudo);
        });
    });
}).listen(3000, '127.0.0.1', () => console.log('Painel local: http://localhost:3000/dashboard/'));
