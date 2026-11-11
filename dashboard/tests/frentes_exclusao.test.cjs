const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const efetivo = fs.readFileSync('dashboard/modules/efetivo_ferias.js', 'utf8');
function ambiente(falhar = false) {
    const estado = { gravacoes: [], fechou: false, avisos: [], botao: { disabled: false }, status: { style: {} } };
    const contexto = vm.createContext({
        allFrentesCatalogo: [{ nome: 'VAZIA', ativo: true }],
        allDdsFrentesConfig: [{ id: 'VAZIA', ativo: true }],
        allEfetivo: [], frenteAtualGerenciada: 'VAZIA',
        colaboradorEstaAtivo: e => e.ativo, colaboradorEhTerceiro: () => false,
        confirm: () => true, alert: msg => estado.avisos.push(msg), console: { error() {} },
        document: { getElementById: id => id === 'frenteBtnExcluirVazia' ? estado.botao : estado.status },
        salvarCatalogoFrentesSupabase: async dados => {
            if (falhar) throw new Error('Falha de rede');
            estado.gravacoes.push(JSON.parse(JSON.stringify(dados)));
        },
        fecharGerenciarFrente: () => { estado.fechou = true; },
        renderFrentesLista() {}, popularFrentesDatalist() {}
    });
    contexto.window = contexto;
    for (const nome of ['excluirFrenteAtual', 'obterCatalogoFrentesCompleto']) {
        vm.runInContext(efetivo.match(new RegExp('(?:async )?function '+nome+'\\(\\) \\{[\\s\\S]*?\\n\\}'))[0], contexto);
    }
    return { contexto, estado };
}
test('exclusão persiste e não reaparece pelo legado DDS após recarga', async () => {
    const { contexto, estado } = ambiente();
    await contexto.excluirFrenteAtual();
    assert.equal(estado.fechou, true);
    contexto.allFrentesCatalogo = estado.gravacoes[0];
    assert.equal(contexto.obterCatalogoFrentesCompleto().length, 0);
    assert.equal(contexto.allDdsFrentesConfig.length, 1);
    for (const arquivo of ['dashboard/dashboard.js','dashboard/modules/treinamentos_ddsma.js']) {
        const fonte = fs.readFileSync(arquivo, 'utf8');
        vm.runInContext(fonte.match(/function todasFrentesAtivas\(\) \{[\s\S]*?\n\}/)[0], contexto);
        assert.equal(contexto.todasFrentesAtivas().length, 0, arquivo);
    }
});
test('falha de gravação preserva catálogo, seleção e permite tentar novamente', async () => {
    const { contexto, estado } = ambiente(true);
    await contexto.excluirFrenteAtual();
    assert.equal(contexto.allFrentesCatalogo[0].excluida, undefined);
    assert.equal(estado.fechou, false);
    assert.equal(estado.botao.disabled, false);
    assert.match(estado.status.textContent, /Falha de rede/);
});
test('cancelar ou tentar excluir frente com equipe não grava', async () => {
    const { contexto, estado } = ambiente();
    contexto.confirm = () => false;
    await contexto.excluirFrenteAtual();
    contexto.confirm = () => true;
    contexto.allEfetivo = [{ responsavel: 'VAZIA', ativo: true }];
    await contexto.excluirFrenteAtual();
    assert.equal(estado.gravacoes.length, 0);
    assert.equal(estado.fechou, false);
});

