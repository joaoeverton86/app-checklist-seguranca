const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(DIR, req.url === '/' ? 'index.html' : req.url);
    
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

// Get network IP
const os = require('os');
const interfaces = os.networkInterfaces();
let localIP = 'localhost';
for (const name in interfaces) {
    for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
        }
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  SERVIDOR - CHECKLIST SEGURANCA');
    console.log('========================================');
    console.log('');
    console.log(`Servidor rodando!`);
    console.log('');
    console.log(`No PC: http://localhost:${PORT}`);
    console.log(`No celular: http://${localIP}:${PORT}`);
    console.log('');
    console.log('Para parar: Ctrl+C');
});
