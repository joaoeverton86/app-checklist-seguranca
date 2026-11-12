// Executado pelo runner antes dos testes: verifica as restrições efetivas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const { spawnSync } = require('node:child_process');
assert.ok(process.permission, 'Sistema de permissões indisponível');
assert.equal(process.permission.has('net'), false);
assert.equal(process.permission.has('fs.write'), false);
assert.equal(process.permission.has('child'), false);
assert.throws(() => fs.writeFileSync(__filename + '.probe', ''), { code: 'ERR_ACCESS_DENIED' });
assert.throws(() => spawnSync(process.execPath, ['--version']), { code: 'ERR_ACCESS_DENIED' });
const socket = net.connect({ host: '127.0.0.1', port: 9 });
socket.on('connect', () => { socket.destroy(); throw new Error('Conexão indevidamente permitida'); });
socket.on('error', erro => {
    assert.equal(erro.code, 'ERR_ACCESS_DENIED');
    console.log('Restrições conferidas: conexão TCP, escrita e subprocessos bloqueados.');
});
