const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('dashboard/modules/kits_admissionais.js', 'utf8'), ctx);
const calcular = (...args) => JSON.parse(JSON.stringify(ctx.distribuirAgendaAdmissional(...args)));

test('integração de 6h e curso de 4h seguinte começa inteiro no próximo dia', () => {
    const agenda = calcular('2026-11-09', '08:00', [{ carga: 6 }, { carga: 4 }]);
    assert.deepEqual(agenda[0].periodos, [
        { data: '2026-11-09', inicio: '08:00', fim: '12:00' },
        { data: '2026-11-09', inicio: '13:00', fim: '15:00' }
    ]);
    assert.deepEqual(agenda[1].periodos, [
        { data: '2026-11-10', inicio: '07:00', fim: '11:00' }
    ]);
});
test('curso curto que não cabe na sexta começa inteiro na segunda', () => {
    assert.deepEqual(calcular('2026-11-13', '15:00', [{ carga: 3 }])[0].periodos, [
        { data: '2026-11-16', inicio: '07:00', fim: '10:00' }
    ]);
});
test('não sobrepõe horário registrado', () => {
    assert.deepEqual(calcular('2026-11-09', '08:00', [{ carga: 2 }], [{ data: '2026-11-09', inicio: 540, fim: 600 }])[0].periodos, [
        { data: '2026-11-09', inicio: '08:00', fim: '09:00' },
        { data: '2026-11-09', inicio: '10:00', fim: '11:00' }
    ]);
});
test('reserva explícita de dia inteiro, almoço e carga inválida', () => {
    assert.equal(calcular('2026-11-09', '08:00', [{ carga: 1 }], [{ data: '2026-11-09', inicio: 0, fim: 1440 }])[0].periodos[0].data, '2026-11-10');
    assert.equal(calcular('2026-11-09', '12:30', [{ carga: 1 }])[0].periodos[0].inicio, '13:00');
    assert.throws(() => calcular('2026-11-09', '08:00', [{ carga: 0 }]));
});

test('regressão 11/11: histórico sem horário não adia admissão para 13/11', () => {
    const registros = [
        { matricula: '123', data_treinamento: '2026-11-11', treinamento_cod: '1' },
        { matricula: '123', data_treinamento: '2026-11-12', treinamento_cod: '2', hora_inicio: '', hora_termino: '' },
        { matricula: 'outro', data_treinamento: '2026-11-11', hora_inicio: '07:00', hora_termino: '17:00' }
    ];
    const { ocupados, semHorario } = ctx.obterOcupacaoKitAdmissional(registros, '123');
    assert.equal(ocupados.length, 0);
    assert.equal(semHorario.length, 2);
    const agenda = calcular('2026-11-11', '08:00', [6, 4, 2, 8, 2].map(carga => ({ carga })), ocupados);
    assert.deepEqual(agenda[0].periodos, [
        { data: '2026-11-11', inicio: '08:00', fim: '12:00' },
        { data: '2026-11-11', inicio: '13:00', fim: '15:00' }
    ]);
    assert.equal(agenda[1].periodos[0].inicio, '07:00');
    assert.equal(agenda[1].periodos[0].data, '2026-11-12');
    assert.equal(agenda[4].periodos.at(-1).data, '2026-11-16');
    assert.equal(agenda[4].periodos.at(-1).fim, '09:00');
});

test('somente intervalos válidos reservam horário', () => {
    const { ocupados, semHorario } = ctx.obterOcupacaoKitAdmissional([
        { matricula: '1', data_treinamento: '2026-11-11', hora_inicio: '08:00:00', hora_termino: '10:00:00' },
        { matricula: '1', hora_inicio: '25:00', hora_termino: '26:00' },
        { matricula: '1', hora_inicio: '10:00', hora_termino: '09:00' }
    ], '1');
    assert.equal(ocupados.length, 1);
    assert.equal(semHorario.length, 2);
    assert.equal(calcular('2026-11-11', '08:00', [{ carga: 1 }], ocupados)[0].periodos[0].inicio, '10:00');
});

test('2h cabem no fim da quinta mas passam inteiras para segunda no fim da sexta', () => {
    assert.deepEqual(calcular('2026-11-12', '15:00', [{ carga: 2 }])[0].periodos, [
        { data: '2026-11-12', inicio: '15:00', fim: '17:00' }
    ]);
    assert.deepEqual(calcular('2026-11-13', '15:00', [{ carga: 2 }])[0].periodos, [
        { data: '2026-11-16', inicio: '07:00', fim: '09:00' }
    ]);
});

test('4h respeitam almoço sem atravessar a data e conflitos reduzem disponibilidade', () => {
    const agenda = calcular('2026-11-12', '10:00', [{ carga: 4 }])[0];
    assert.deepEqual(agenda.periodos, [
        { data: '2026-11-12', inicio: '10:00', fim: '12:00' },
        { data: '2026-11-12', inicio: '13:00', fim: '15:00' }
    ]);
    assert.equal(calcular('2026-11-12', '13:00', [{ carga: 4 }], [
        { data: '2026-11-12', inicio: 900, fim: 1020 }
    ])[0].periodos[0].data, '2026-11-13');
});

test('16h e 20h continuam em vários dias preservando a carga e o expediente', () => {
    for (const carga of [16, 20]) {
        const periodos = calcular('2026-11-13', '08:00', [{ carga }])[0].periodos;
        assert.ok(new Set(periodos.map(p => p.data)).size > 1);
        const minuto = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
        assert.equal(periodos.reduce((total, p) => total + minuto(p.fim) - minuto(p.inicio), 0), carga * 60);
        assert.equal(periodos[0].data, '2026-11-13');
        assert.ok(periodos.every(p => !['2026-11-14', '2026-11-15'].includes(p.data)));
    }
});

test('alternativas de EPI preferem GHE e não removem outros cursos', () => {
    const cursos = [
        { id: '6', nome: 'NR.06 - EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL', origensKit: 'Geral (Todos)' },
        { id: '77', nome: "USO OBRIGATÓRIO E HIGIENIZAÇÃO DE EPI'S", origensKit: 'GHE 21' },
        { id: '16', nome: 'NR.35 - TRABALHO EM ALTURA', origensKit: 'GHE 21' }
    ];
    assert.deepEqual(Array.from(ctx.selecionarCursosEquivalentesKit(cursos)), ['6']);
    assert.equal(ctx.selecionarCursosEquivalentesKit(cursos.slice(1)).size, 0);
    assert.equal(cursos.length, 3);
});
