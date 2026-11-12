(async () => {
    if (location.origin !== 'http://127.0.0.1:32408' || !window.__homologacao) throw Error('Execute somente na prévia isolada.');
    const casos = [];
    const exigir = (valor, msg) => { if (!valor) throw Error(msg); };
    async function caso(nome, executar) {
        try { await executar(); casos.push({ nome, passou: true }); }
        catch (erro) { casos.push({ nome, passou: false, erro: erro.message }); }
    }
    await caso('Recarga: shell reinicia com sessão simulada e sem erros JS', async () => {
        exigir(document.querySelector('.db-page.active')?.id === 'page-checklists', 'Página inicial incorreta');
        exigir(document.getElementById('dashboardApp').style.display !== 'none', 'Shell oculto');
        exigir(__homologacao.erros.length === 0, 'Erros após recarga');
    });
    await caso('Recarga: status duplo e terceiros persistem no backend simulado', async () => {
        await loadEfetivoData(); await carregarColaboradoresInternos();
        exigir(allEfetivo.find(e => e.id === 'FIX001').status === 'ATIVO', 'Efetivo não persistiu');
        exigir(allColaboradoresInternos.find(e => e.id === 'FIX001').ativo === true, 'Checklist não persistiu');
        showDbPage('efetivo'); showEfetivoSubtab('terceiros');
        exigir(document.getElementById('tabelaTerceirosBody').innerText.includes('02/11/2026'), 'Data de terceiros não persistiu');
    });
    await caso('Recarga: presença continua única após carregar treinamentos', async () => {
        await loadTreinamentosData();
        const rows = allTreinamentosRealizados.filter(t => t.matricula === 'FIX001' && t.treinamento_cod === 'CURSO-FICTICIO');
        exigir(rows.length === 1, 'Presença ausente ou duplicada');
        exigir(rows[0].data_treinamento === '2026-11-11', 'Data incorreta');
    });
    await caso('Troca de editar para novo terceiro limpa campos; cancelar não grava', async () => {
        const antes = JSON.stringify(__homologacao.banco.colaboradores_efetivo);
        abrirModalNovoTerceiro('FIX002');
        exigir(document.getElementById('tercForm_matricula').readOnly, 'Matrícula de edição não protegida');
        exigir(document.getElementById('tercForm_dt_inicio').value === '2026-11-02', 'Data de edição incorreta');
        fecharModalTerceiro(); abrirModalNovoTerceiro();
        exigir(!document.getElementById('tercForm_matricula').readOnly, 'Campo novo ficou bloqueado');
        exigir(document.getElementById('tercForm_nome').value === '', 'Nome anterior vazou para novo registro');
        fecharModalTerceiro();
        exigir(JSON.stringify(__homologacao.banco.colaboradores_efetivo) === antes, 'Cancelamento gravou');
    });
    showDbPage('efetivo'); showEfetivoSubtab('terceiros');
    return JSON.stringify({ casos, erros: __homologacao.erros, consoleErros: __homologacao.consoleErros, recusados: __homologacao.recusados,
        recursos: performance.getEntriesByType('resource').map(r => r.name).filter(nome => !nome.startsWith('data:')) });
})()
