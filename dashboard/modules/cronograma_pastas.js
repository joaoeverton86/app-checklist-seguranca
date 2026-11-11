/* Preparação antecipada do acervo. Não altera execução nem seleção de fotos. */
var cronogramaPastasEstado = { busy: false, sequencia: 0, previa: null };

function cronogramaPastasPodeEditar(fonte) {
    return usuarioPodeGravarModulo('relatoriosms') || usuarioPodeGravarModulo(fonte);
}

function cronogramaPastasAbrir(fonteInicial) {
    if (cronogramaPastasEstado.busy) return;
    const calendario = fonteInicial === 'ddsma' ? 'ddsma' : 'treinamentos';
    if (!cronogramaPastasPodeEditar(calendario)) return;
    let modal = document.getElementById('cronogramaPastasModal');
    if (!modal) {
        modal = document.createElement('dialog'); modal.id = 'cronogramaPastasModal';
        modal.style.cssText = 'width:760px;max-width:94vw;border:0;border-radius:12px;padding:24px;';
        document.body.appendChild(modal);
        modal.addEventListener('cancel', event => { if (cronogramaPastasEstado.busy) event.preventDefault(); });
    }
    const origemMes = fonteInicial === 'ddsma' ? 'ddsCalendarioFiltroMes' : fonteInicial === 'treinamentos' ? 'cronoFiltroMes' : 'relSmsMes';
    const origemAno = fonteInicial === 'ddsma' ? 'ddsCalendarioFiltroAno' : fonteInicial === 'treinamentos' ? 'cronoFiltroAno' : 'relSmsAno';
    const valorMes = document.getElementById(origemMes)?.value;
    const mes = valorMes !== undefined && valorMes !== '' ? Number(valorMes) : new Date().getMonth();
    const ano = Number(document.getElementById(origemAno)?.value) || new Date().getFullYear();
    cronogramaPastasEstado.previa = null;
    modal.innerHTML = `<h2>Criar pastas de fotos pelo cronograma</h2>
        <p><strong>Destino: Fotos & Evidências.</strong> As pastas de documentos escaneados são preparadas pelo botão separado de escaneados.</p>
        <label>Ano <input id="cronogramaPastasAno" type="number" min="2000" max="2100" value="${ano}" style="width:100px"></label>
        <label>Mês <select id="cronogramaPastasMes">${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((n,i) => `<option value="${i}" ${i === mes ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <p>As pastas serão preparadas pela data prevista, sem marcar realização nem selecionar fotos. Eventos com o mesmo tema e data compartilham a pasta.</p>
        <label>Calendário <select id="cronogramaPastasFonte"><option value="treinamentos">Treinamentos</option><option value="ddsma">DDSMA — calendário de temas</option></select></label>
        <p><label>Link da pasta do mês em Fotos & Evidências<br><input id="cronogramaPastasDestino" type="url" style="width:100%;box-sizing:border-box" placeholder="https://drive.google.com/drive/folders/…"></label></p>
        <p>Escolha a pasta do mês, por exemplo 10_OUTUBRO_2026, na categoria correspondente. As pastas que você já criou serão conferidas antes de gerar novas.</p>
        <button type="button" id="cronogramaPastasConsultar">Conferir pastas previstas</button>
        <button type="button" id="cronogramaPastasCriar" disabled>Confirmar criação das pastas</button>
        <button type="button" id="cronogramaPastasFechar">Fechar</button>
        <p id="cronogramaPastasStatus" role="status"></p><div id="cronogramaPastasLista" style="max-height:45vh;overflow:auto"></div>`;
    const fonte = document.getElementById('cronogramaPastasFonte');
    fonte.value = calendario;
    for (const option of fonte.options) option.disabled = !cronogramaPastasPodeEditar(option.value);
    const mesEl = document.getElementById('cronogramaPastasMes');
    const anoEl = document.getElementById('cronogramaPastasAno');
    const destino = document.getElementById('cronogramaPastasDestino');
    const restaurarDestino = () => {
        destino.value = localStorage.getItem(`cronograma_pastas_fotos_${anoEl.value}_${mesEl.value}_${fonte.value}`) || '';
    };
    const invalidar = () => {
        cronogramaPastasEstado.previa = null;
        document.getElementById('cronogramaPastasCriar').disabled = true;
        document.getElementById('cronogramaPastasLista').textContent = '';
    };
    for (const campo of [fonte, mesEl, anoEl]) campo.addEventListener('change', () => { restaurarDestino(); invalidar(); });
    destino.addEventListener('input', invalidar);
    document.getElementById('cronogramaPastasConsultar').onclick = () => cronogramaPastasExecutar(false, Number(mesEl.value), Number(anoEl.value));
    document.getElementById('cronogramaPastasCriar').onclick = () => cronogramaPastasExecutar(true, Number(mesEl.value), Number(anoEl.value));
    document.getElementById('cronogramaPastasFechar').onclick = () => {
        if (!cronogramaPastasEstado.busy) modal.close();
    };
    restaurarDestino(); modal.showModal();
}

async function cronogramaPastasExecutar(confirmar, mes, ano) {
    const estado = cronogramaPastasEstado;
    if (estado.busy) return;
    const modal = document.getElementById('cronogramaPastasModal');
    const status = document.getElementById('cronogramaPastasStatus');
    const fonte = document.getElementById('cronogramaPastasFonte').value;
    if (!cronogramaPastasPodeEditar(fonte)) return;
    const link = document.getElementById('cronogramaPastasDestino').value.trim();
    let pastaId;
    try {
        const url = new URL(link);
        if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com') throw new Error();
        pastaId = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([\w-]{10,150})\/?$/)?.[1];
        if (!pastaId) throw new Error();
    } catch { status.textContent = 'Informe o link da pasta do mês no Google Drive.'; return; }
    if (confirmar && (!estado.previa || !confirm('Criar as pastas previstas abaixo? As existentes serão reutilizadas. Nenhum evento será marcado como realizado.'))) return;
    estado.busy = true;
    modal.querySelectorAll('button,input,select').forEach(el => { el.disabled = true; });
    status.textContent = confirmar ? 'Preparando as pastas. Aguarde a confirmação…' : 'Conferindo cronograma e pastas existentes…';
    try {
        const resposta = await fetch('/api/cronograma-pastas', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await authTokenDashboard(), apikey: SUPABASE_KEY },
            body: JSON.stringify({ mes, ano, fonte, pastaId, confirmar, assinatura: confirmar ? estado.previa.assinatura : undefined }),
            signal: AbortSignal.timeout(120000)
        });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || 'Falha ao preparar pastas.');
        estado.previa = confirmar ? null : dados;
        localStorage.setItem(`cronograma_pastas_fotos_${ano}_${mes}_${fonte}`, link);
        const lista = document.getElementById('cronogramaPastasLista'); lista.replaceChildren();
        for (const item of dados.itens) {
            const linha = document.createElement('p');
            linha.textContent = `${item.situacao === 'criar' ? 'A criar' : item.situacao === 'criada' ? 'Criada' : 'Já existe'} — ${item.nome} `;
            if (item.id) {
                const a = document.createElement('a'); a.href = 'https://drive.google.com/drive/folders/' + item.id;
                a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Abrir pasta'; linha.appendChild(a);
            }
            lista.appendChild(linha);
        }
        status.textContent = dados.itens.length ? (confirmar ? 'Pastas preparadas. O cronograma e a seleção de fotos permanecem como estavam.' : 'Confira os nomes e o destino antes de confirmar a criação.') : 'Nenhum tema previsto nesta competência e calendário.';
    } catch (err) {
        estado.previa = null;
        status.textContent = err.message + (confirmar ? ' Algumas pastas podem ter sido criadas. Consulte novamente para continuar sem repetir as já preparadas.' : '');
    } finally {
        estado.busy = false;
        modal.querySelectorAll('button,input,select').forEach(el => { el.disabled = false; });
        document.getElementById('cronogramaPastasCriar').disabled = !estado.previa?.itens?.some(i => i.situacao === 'criar');
    }
}
