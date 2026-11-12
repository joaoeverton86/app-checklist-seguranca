(async () => {
    if (location.origin !== 'http://127.0.0.1:32408' || !window.__homologacao) throw Error('Execute somente na prévia isolada.');
    const casos = [];
    const exigir = (valor, msg) => { if (!valor) throw Error(msg); };
    const aguardar = async predicado => {
        for (let i = 0; i < 100; i++) { if (predicado()) return; await new Promise(r => setTimeout(r, 50)); }
        throw Error('Tempo esgotado aguardando a interface');
    };
    async function caso(nome, acao) {
        try { await acao(); casos.push({ nome, passou: true }); }
        catch (erro) { casos.push({ nome, passou: false, erro: erro.message }); }
    }
    const confirmOriginal = window.confirm;
    try {
        // Limpar exclusivamente os caches desta origem local de homologação.
        // A primeira preparação da fixture usava um campo PJ incompatível com o app.
        await dashCacheInvalidate();
        sessionStorage.clear();
        await loadEfetivoData();
        await caso('Inicialização completa com scripts reais e 28 páginas', async () => {
            exigir(document.querySelectorAll('.db-page').length === 28, 'Páginas ausentes');
            exigir(__homologacao.erros.length === 0, 'Erro no bootstrap');
        });
        await caso('Efetivo/Terceiros: navegação, nome e data real formatada', async () => {
            showDbPage('efetivo');
            await aguardar(() => allEfetivo.length === 2);
            document.getElementById('efetivoSubtabBtn-terceiros').click();
            const texto = document.getElementById('tabelaTerceirosBody').innerText;
            exigir(texto.includes('Pessoa Terceira Fictícia'), 'Terceiro não renderizado');
            exigir(texto.includes('02/11/2026'), 'Data não formatada');
        });
        await caso('Exportação usa os dados da tabela real com XLSX simulado', async () => {
            exportarExcelTerceiros();
            exigir(__homologacao.exportacoes.at(-1)?.[0]?.['Data de Início / Mobilização'] === '02/11/2026', 'Payload exportado incorreto');
        });
        await caso('Cancelar edição de terceiro não grava nem muda o registro', async () => {
            const antes = JSON.stringify(__homologacao.banco.colaboradores_efetivo);
            abrirModalNovoTerceiro('FIX002');
            exigir(document.getElementById('tercForm_nome').value === 'Pessoa Terceira Fictícia', 'Registro errado no formulário');
            document.getElementById('tercForm_nome').value = 'Alteração cancelada';
            fecharModalTerceiro();
            exigir(JSON.stringify(__homologacao.banco.colaboradores_efetivo) === antes, 'Cancelamento gravou');
            abrirModalNovoTerceiro('FIX002');
            exigir(document.getElementById('tercForm_nome').value === 'Pessoa Terceira Fictícia', 'Formulário manteve edição cancelada');
            fecharModalTerceiro();
        });
        await caso('Status: cancelar e desativar/reativar nas duas bases simuladas', async () => {
            await carregarColaboradoresInternos();
            const antes = __homologacao.chamadas.filter(x => x.metodo !== 'GET').length;
            window.confirm = () => false;
            await alternarAtivoColaborador('FIX001', true);
            exigir(__homologacao.chamadas.filter(x => x.metodo !== 'GET').length === antes, 'Cancelamento gravou');
            window.confirm = () => true;
            await alternarAtivoColaborador('FIX001', true);
            exigir(__homologacao.banco.colaboradores_checklist[0].ativo === false, 'Checklist não desativou');
            exigir(__homologacao.banco.colaboradores_efetivo[0].status === 'INATIVO', 'Efetivo não desativou');
            await alternarAtivoColaborador('FIX001', false);
            exigir(__homologacao.banco.colaboradores_checklist[0].ativo === true && __homologacao.banco.colaboradores_efetivo[0].status === 'ATIVO', 'Reativação não sincronizou');
        });
        await caso('GHE: cartão navega para a tela Psicossocial global real', async () => {
            showDbPage('matrizrisco');
            await aguardar(() => allGheCatalogo.some(g => g.id === 'GHE-FICTICIO'));
            selecionarGheMatrizRisco('GHE-FICTICIO');
            const botao = [...document.querySelectorAll('#matrizSetorConteudo button')].find(b => b.textContent.includes('Abrir Psicossocial global'));
            exigir(botao, 'Atalho do GHE ausente'); botao.click();
            exigir(document.querySelector('.db-page.active')?.id === 'page-psicossocial', 'Destino incorreto');
        });
        await caso('Retorno do Psicossocial ao Efetivo preserva os dados', async () => {
            showDbPage('efetivo'); document.getElementById('efetivoSubtabBtn-terceiros').click();
            exigir(document.getElementById('tabelaTerceirosBody').innerText.includes('02/11/2026'), 'Retorno perdeu data');
        });
        await caso('Kits: salvar presença com scripts completos atualiza dados e prontidão', async () => {
            showDbPage('treinamentos');
            await aguardar(() => allTreinamentosCatalogo.some(c => c.id === 'CURSO-FICTICIO'));
            kitsCodigoAtual = 'CURSO-FICTICIO'; kitsDataAtual = '2026-11-11';
            kitsEquipe = new Map([['FIX001', { nome: 'Pessoa Própria Fictícia', checked: true }]]);
            prontidaoDadosCalculadosCache = [{ antigo: true }];
            window.confirm = () => true;
            await salvarPresencaTurmaDiretoKits();
            exigir(__homologacao.banco.treinamentos_realizados?.length === 1, 'Presença não salva');
            exigir(prontidaoDadosCalculadosCache === null, 'Prontidão não invalidada');
            exigir(document.getElementById('kitsLancamentoStatus').textContent.includes('sucesso'), 'Sem sucesso: ' + document.getElementById('kitsLancamentoStatus').textContent);
            exigir(__homologacao.chamadas.some(c => c.tabela === 'treinamentos_status' && c.metodo === 'GET'), 'Sem consulta de status');
        });
        await caso('SMS: identidade simulada verificada pelo fluxo real do helper', async () => {
            exigir(await relSmsIdentificarAutorAtual() === 'pessoa@example.invalid', 'Identidade incorreta');
        });
    } finally { window.confirm = confirmOriginal; }
    const saida = { casos, erros: __homologacao.erros, consoleErros: __homologacao.consoleErros, recusados: __homologacao.recusados, chamadas: __homologacao.chamadas };
    localStorage.setItem('__homologacao_resultado', JSON.stringify(saida));
    return JSON.stringify(saida);
})()
