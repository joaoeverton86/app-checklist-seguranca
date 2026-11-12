const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(raiz, 'dashboard/index.html'), 'utf8');
const permitidos = new Set(['/dashboard/dashboard.css', '/__teste/mocks.js']);
for (const m of html.matchAll(/<script\b[^>]*src="([^"]+)"/g)) {
    if (!/^https?:/.test(m[1])) permitidos.add(new URL(m[1], 'http://localhost/dashboard/').pathname);
}
html = html.replace(/<script\b[^>]*src="https?:[^\"]+"[^>]*><\/script>/g, '')
    .replace(/<link\b[^>]*href="https?:[^\"]+"[^>]*>/g, '')
    .replace('<head>', '<head><script src="/__teste/mocks.js"></script>');
const csp = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'self'";
const servidor = http.createServer((req, res) => {
    const rota = new URL(req.url, 'http://localhost').pathname;
    if (rota === '/__teste/encerrar' && req.method === 'POST') { res.end('Encerrado'); servidor.close(); return; }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (rota === '/dashboard/' || rota === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp, 'Cache-Control': 'no-store' }); res.end(html); return;
    }
    if (!permitidos.has(rota)) { res.writeHead(404).end(); return; }
    const arquivo = rota === '/__teste/mocks.js' ? path.join(raiz, 'dashboard/tests/isolado/mocks.js') : path.join(raiz, '.' + rota);
    res.writeHead(200, { 'Content-Type': rota.endsWith('.css') ? 'text/css' : 'application/javascript', 'Cache-Control': 'no-store' });
    const conteudo = fs.readFileSync(arquivo);
    res.end(rota.endsWith('.css')
        ? conteudo.toString('utf8').replace(/@import\s+url\(\s*['"]?https?:[^)]*\)\s*;/gi, '')
        : conteudo);
});
servidor.listen(32408, '127.0.0.1', () => console.log('Painel com mocks: http://127.0.0.1:32408/dashboard/'));
setTimeout(() => servidor.close(), 900000).unref();
