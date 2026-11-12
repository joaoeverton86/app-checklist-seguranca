const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('mock e verificadores recusam origem operacional antes de acessar armazenamento ou DOM', async () => {
    for (const arquivo of ['mocks.js', 'verificar-fluxos.js', 'verificar-recarga.js']) {
        let acessos = 0;
        const proibido = () => { acessos++; throw Error('Efeito indevido fora da origem de teste'); };
        const ctx = vm.createContext({
            location: { origin: 'https://operacao.example.invalid' }, window: {},
            localStorage: { getItem: proibido, setItem: proibido }, document: { querySelector: proibido }
        });
        const codigo = fs.readFileSync('dashboard/tests/isolado/' + arquivo, 'utf8');
        if (arquivo === 'mocks.js') assert.throws(() => vm.runInContext(codigo, ctx), /somente na origem local/);
        else await assert.rejects(vm.runInContext(codigo, ctx), /somente na prévia isolada/);
        assert.equal(acessos, 0);
    }
});

test('fixture e servidor de simulação têm exclusões específicas de publicação', () => {
    const regras = fs.readFileSync('.vercelignore', 'utf8').split(/\r?\n/);
    assert.ok(regras.includes('dashboard/tests/isolado/'));
    assert.ok(regras.includes('scripts/preview-dashboard-isolado.cjs'));
    assert.ok(!fs.readFileSync('dashboard/index.html', 'utf8').includes('/__teste/mocks.js'));
});
