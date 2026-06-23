const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function handler(req, res) {
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
}

const certPath = path.join(DIR, 'cert.pem');
const keyPath = path.join(DIR, 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('Gerando certificado auto-assinado...');
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`);
    console.log('Certificado gerado!');
}

const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

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

const server = https.createServer(options, handler);

server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  SERVIDOR HTTPS - CHECKLIST SEGURANCA');
    console.log('========================================');
    console.log('');
    console.log(`Servidor rodando!`);
    console.log('');
    console.log(`No PC: https://localhost:${PORT}`);
    console.log(`No celular: https://${localIP}:${PORT}`);
    console.log('');
    console.log('No celular: aceite o aviso de certificado');
    console.log('Para parar: Ctrl+C');
});
