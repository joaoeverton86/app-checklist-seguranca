const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Detecta divergência entre os modelos escolhidos pela tela e os requisitos autorizados pelo servidor.
const root = path.resolve(__dirname, '../..');
const js = fs.readFileSync(path.join(root, 'dashboard/modules/gestao_de_condutores_cnh.js'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261110021911_matriz_sst_condutores_aprovada.sql'), 'utf8');
const client = JSON.parse(js.match(/const MATRIZ_SST_APROVADA = ([\s\S]*?);\s*const VINCULOS_VALIDOS/)[1]);
const server = JSON.parse(sql.match(/\$json\$([\s\S]*?)\$json\$/)[1]);
assert.deepEqual(client, server, 'Catálogo do formulário deve corresponder ao catálogo canônico do banco');
assert.equal(server.length, 7);
assert.equal(new Set(server.map(m => m.atividade_codigo)).size, 7);
for (const modelo of server) {
    assert.equal(modelo.exige_cnh, 'SIM');
    assert.ok(modelo.categorias_aceitas.length);
    assert.ok(modelo.treinamentos.length);
    assert.ok(!modelo.regra_aprovada, 'Cliente não fornece aprovação autoritativa');
    for (const t of modelo.treinamentos) {
        assert.equal(t.status_aplicabilidade, 'OBRIGATORIO');
        assert.ok(!t.data_realizacao && !t.validade && !t.comprovacao_ref, 'Modelo não inventa evidências');
    }
}
console.log('Matriz CNH: sete modelos consistentes entre tela e servidor, sem evidências inventadas.');
