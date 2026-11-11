const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

// Mock para o contexto do dashboard
const windowMock = {
    allEfetivo: [
        { id: '1001', nome: 'João da Silva', funcao: 'Pedreiro', setor: 'Obras', status: 'Ativo' },
        { id: '1002', nome: 'Maria Santos', funcao: 'Eletricista', setor: 'Manutenção', status: 'Ativo' },
        { id: '1003', nome: 'Carlos Souza', funcao: 'Operador', setor: 'Logística', status: 'Demitido' }
    ]
};

const ctx = vm.createContext({
    window: windowMock,
    allEfetivo: windowMock.allEfetivo,
    colaboradorEstaAtivo: (colab) => colab && colab.status === 'Ativo',
    formatSimpleDate: (d) => d || '—',
    escapeHTML: (str) => String(str || ''),
    document: {
        getElementById: () => null
    },
    console,
    Date,
    Set,
    Map,
    Array,
    String,
    parseInt,
    isNaN
});

// Extrai do dashboard.js apenas as funções de Consulta Mensal PCMSO
const code = fs.readFileSync('dashboard/dashboard.js', 'utf8');
const pcmsoStartIndex = code.indexOf('function pcmsoDataValida');
if (pcmsoStartIndex === -1) {
    throw new Error('Funções de Consulta Mensal PCMSO não encontradas no dashboard.js');
}
const pcmsoCode = code.slice(pcmsoStartIndex);
vm.runInContext(pcmsoCode, ctx);

const calcular = ctx.calcularConsultaMensalPcmso;
const formatarMesAno = ctx.formatarMesAnoPcmso;

test('formatarMesAnoPcmso converte YYYY-MM para Nome do Mês de YYYY', () => {
    assert.equal(formatarMesAno('2026-11'), 'Novembro de 2026');
    assert.equal(formatarMesAno('2026-01'), 'Janeiro de 2026');
});

test('calcularConsultaMensalPcmso separa realizados, vencidos e previstos', () => {
    const registros = [
        {
            matricula: '1001',
            nome_colaborador: 'João da Silva',
            status: 'Concluído',
            exames_detalhe: [
                { nome: 'Audiometria', data_exame: '2026-11-05', data_vencimento: '2027-11-05' }
            ]
        },
        {
            matricula: '1002',
            nome_colaborador: 'Maria Santos',
            status: 'Concluído',
            exames_detalhe: [
                { nome: 'Acuidade Visual', data_exame: '2025-11-10', data_vencimento: '2026-11-05' } // vencido antes de hoje (2026-11-11)
            ]
        },
        {
            matricula: '1001',
            nome_colaborador: 'João da Silva',
            status: 'Concluído',
            exames_detalhe: [
                { nome: 'Raio-X de Tórax', data_exame: '2025-11-20', data_vencimento: '2026-11-25' } // a vencer após hoje (2026-11-11)
            ]
        },
        {
            // Colaborador demitido: realizado no mês deve ser contabilizado no histórico
            matricula: '1003',
            nome_colaborador: 'Carlos Souza',
            status: 'Concluído',
            exames_detalhe: [
                { nome: 'Hemograma Completo', data_exame: '2026-11-02', data_vencimento: '2027-11-02' }
            ]
        }
    ];

    const matriculasAtivas = new Set(['1001', '1002']);
    const hoje = '2026-11-11';
    const periodo = '2026-11';

    const res = calcular(registros, periodo, '', matriculasAtivas, hoje);

    // 2 exames realizados em 2026-11 (João Audiometria e Carlos Hemograma)
    assert.equal(res.realizados.length, 2);
    assert.equal(res.pessoas, 2);

    // 1 exame vencido em 2026-11 (Maria Acuidade Visual venceu em 2026-11-05 < 2026-11-11)
    assert.equal(res.vencidos.length, 1);
    assert.equal(res.vencidos[0].matricula, '1002');
    assert.equal(res.vencidos[0].tipo, 'vencido');
    assert.equal(res.pessoasVencidas, 1);

    // 1 exame a vencer em 2026-11 (João Raio-X vence em 2026-11-25 >= 2026-11-11)
    assert.equal(res.previstos.length, 1);
    assert.equal(res.previstos[0].matricula, '1001');
    assert.equal(res.previstos[0].tipo, 'previsto');
    assert.equal(res.pessoasPrevistas, 1);

    // Total de exames monitorados no mês
    assert.equal(res.totalExames, 4);

    // Verifica enriquecimento cadastral (função e setor obtidos de allEfetivo)
    const joaoAudiometria = res.realizados.find(r => r.matricula === '1001');
    assert.equal(joaoAudiometria.funcao, 'Pedreiro');
    assert.equal(joaoAudiometria.setor, 'Obras');
    assert.equal(joaoAudiometria.ativo, true);

    const carlosHemograma = res.realizados.find(r => r.matricula === '1003');
    assert.equal(carlosHemograma.ativo, false);
});

test('calcularConsultaMensalPcmso filtra por tipo de exame específico', () => {
    const registros = [
        {
            matricula: '1001',
            nome_colaborador: 'João da Silva',
            status: 'Concluído',
            exames_detalhe: [
                { nome: 'Audiometria', data_exame: '2026-11-05', data_vencimento: '2027-11-05' },
                { nome: 'Espirometria', data_exame: '2026-11-05', data_vencimento: '2027-11-05' }
            ]
        }
    ];

    const matriculasAtivas = new Set(['1001']);
    const res = calcular(registros, '2026-11', 'audiometria', matriculasAtivas, '2026-11-11');

    assert.equal(res.realizados.length, 1);
    assert.equal(res.realizados[0].exame, 'Audiometria');
});
