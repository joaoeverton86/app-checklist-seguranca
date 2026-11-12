// Lista explícita: novos testes precisam de revisão antes de entrar nesta execução.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const testes = [
    'api/tests/cronograma-pastas.test.cjs',
    'dashboard/tests/correcoes_lint_modulos.test.cjs',
    'dashboard/tests/consulta_mensal_pcmso.test.cjs',
    'dashboard/tests/frentes_efetivo_ddsma.test.cjs',
    'dashboard/tests/frentes_exclusao.test.cjs',
    'dashboard/tests/gerador_prompts_integracao.test.cjs',
    'dashboard/tests/gestao_de_condutores_cnh.test.cjs',
    'dashboard/tests/kits_admissionais.test.cjs',
    'dashboard/tests/login_painel_identidade_cnh.test.cjs',
    'dashboard/tests/matriz_condutores_aprovada.test.cjs',
    'dashboard/tests/preview_isolado.test.cjs',
    'dashboard/tests/status_colaborador_atomico.test.cjs',
    'dashboard/tests/relatorio_sms.test.cjs',
    'dashboard/tests/terceiros_gestao.test.cjs',
    'dashboard/tests/terceiros_subtabs.test.cjs'
];
if (process.argv.includes('--list')) {
    console.log(testes.join('\n'));
    process.exit(0);
}
// Node 26 fornece bloqueio de rede pelo sistema de permissões.
// Não voltar silenciosamente a uma execução sem essas restrições em versões antigas.
if (Number(process.versions.node.split('.')[0]) < 26) {
    console.error('Testes locais exigem Node.js 26 ou superior para restringir rede. Nenhum teste executado.');
    process.exit(1);
}
// Não herdar credenciais, NODE_OPTIONS ou configuração de serviços do terminal.
const ambiente = Object.fromEntries(Object.entries(process.env).filter(([chave]) =>
    /^(PATH|SYSTEMROOT|WINDIR|SYSTEMDRIVE|TEMP|TMP|TZ)$/i.test(chave)));
const restricoes = ['--permission', `--allow-fs-read=${raiz}`];
const preflight = spawnSync(process.execPath, [...restricoes, path.join(__dirname, 'test-local-permissions.cjs')], {
    cwd: raiz, env: ambiente, stdio: 'inherit', timeout: 15000
});
if (preflight.error || preflight.status !== 0) {
    console.error('Falha na verificação das restrições. Nenhum teste do produto executado.');
    process.exit(1);
}
let falhas = 0;
for (const teste of testes) {
    console.log(`\nTeste local isolado: ${teste}`);
    const resultado = spawnSync(process.execPath, [...restricoes, teste], {
        cwd: raiz, env: ambiente, stdio: 'inherit', timeout: 120000
    });
    if (resultado.error || resultado.status !== 0) {
        falhas++;
        console.error(`Falha: ${teste}${resultado.error ? ` (${resultado.error.message})` : ''}`);
    }
}
console.log(`\nArquivos de teste: ${testes.length - falhas}/${testes.length} aprovados. Rede, escrita em disco e subprocessos não autorizados nos testes.`);
console.log('Cobertura: simulações e revisão estática; não equivale a teste autenticado ou de produção.');
process.exitCode = falhas ? 1 : 0;
