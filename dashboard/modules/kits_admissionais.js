// Planejamento local: não grava presença nem altera o histórico de capacitação.
function distribuirAgendaAdmissional(data, hora, cursos, ocupados = []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) throw new Error('Informe data e hora de início.');
    let cursor = new Date(`${data}T${hora}:00`);
    if (!Number.isFinite(cursor.getTime())) throw new Error('Data inválida.');
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hh = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const minutosLivresNoDia = (dataDia, inicio, fimDia) => {
        let livres = 0;
        const reservas = ocupados.filter(p => p.data === dataDia).sort((a, b) => a.inicio - b.inicio);
        for (const [ini, fim] of [[420, 720], [780, fimDia]]) {
            let posicao = Math.max(ini, inicio);
            for (const reserva of reservas) {
                if (reserva.fim <= posicao || reserva.inicio >= fim) continue;
                livres += Math.max(0, Math.min(fim, reserva.inicio) - posicao);
                posicao = Math.max(posicao, reserva.fim);
            }
            livres += Math.max(0, fim - posicao);
        }
        return livres;
    };
    return cursos.map(curso => {
        let restante = Math.round(Number(curso.carga) * 60);
        if (!Number.isFinite(restante) || restante <= 0 || restante > 60000) throw new Error('Revise as cargas horárias (maiores que zero, até 1000h).');
        const periodos = [];
        let tentativas = 0;
        while (restante > 0) {
            if (++tentativas > 10000) throw new Error('Não foi possível encontrar período disponível.');
            const dia = cursor.getDay(), minuto = cursor.getHours() * 60 + cursor.getMinutes();
            const fimDia = dia === 5 ? 960 : 1020;
            if (dia === 0 || dia === 6 || minuto >= fimDia) { cursor.setDate(cursor.getDate() + 1); cursor.setHours(7, 0, 0, 0); continue; }
            if (minuto < 420) { cursor.setHours(7, 0, 0, 0); continue; }
            if (minuto >= 720 && minuto < 780) { cursor.setHours(13, 0, 0, 0); continue; }
            // Cursos de até uma jornada começam somente quando cabem inteiros no dia.
            // O almoço pode separar períodos do mesmo dia; cursos maiores seguem em vários dias.
            if (!periodos.length && restante <= 540 && minutosLivresNoDia(iso(cursor), minuto, fimDia) < restante) {
                cursor.setDate(cursor.getDate() + 1); cursor.setHours(7, 0, 0, 0); continue;
            }
            const limite = Math.min(minuto < 720 ? 720 : fimDia, minuto + restante);
            const choque = ocupados.filter(p => p.data === iso(cursor) && p.inicio < limite && p.fim > minuto).sort((a, b) => a.inicio - b.inicio)[0];
            if (choque && choque.inicio <= minuto) { cursor.setHours(0, choque.fim, 0, 0); continue; }
            const fim = choque ? choque.inicio : limite;
            const inicio = hh(cursor), dataPeriodo = iso(cursor);
            cursor.setHours(0, fim, 0, 0);
            periodos.push({ data: dataPeriodo, inicio, fim: hh(cursor) });
            restante -= fim - minuto;
        }
        return { ...curso, periodos };
    });
}

function abrirKitAdmissional() {
    const ctx = contextoKits();
    if (ctx.colaboradores.length !== 1) return alert('Marque apenas um colaborador na turma para montar seu kit admissional.');
    const r = ctx.colaboradores[0];
    const gaps = calcularDiagnosticoGapsTreinamentos().filter(d => String(d.matricula) === String(r.matricula) && d.obrigatorioAdmissao);
    const cursos = gaps.map(d => {
        const cat = allTreinamentosCatalogo.find(c => String(c.id) === String(d.treinamentoCod));
        return cat ? { ...cat, origensKit: d.origens } : null;
    }).filter(Boolean);
    if (!cursos.length) return alert('Nenhum curso admissional encontrado nas regras deste colaborador. Revise Regras de Recomendação.');
    cursos.sort((a, b) => Number(!/integra[çc][aã]o/i.test(a.nome)) - Number(!/integra[çc][aã]o/i.test(b.nome)));
    const selecao = selecionarCursosEquivalentesKit(cursos);
    const host = document.getElementById('kitAdmissionalEditor');
    host.oninput = e => {
        if (e.target.closest('.admCurso') || ['admData', 'admHora'].includes(e.target.id)) {
            const previa = document.getElementById('admPrevia');
            if (previa) previa.innerHTML = 'Programação alterada. Calcule novamente.';
        }
    };
    host.dataset.matricula = String(r.matricula);
    host.innerHTML = `<p><b>${escapeHTML(r.nome)}</b> — ${escapeHTML(r.funcao || '')}</p>
        <p>Revise a ordem e a carga de cada curso. Expediente: 07h–12h e 13h–17h (sexta até 16h); fins de semana excluídos. Cursos de até 9h serão concluídos no mesmo dia; se não couberem, começarão no próximo dia útil disponível. Cursos maiores continuarão em outros dias. Feriados precisam de revisão operacional.</p>
        <p>As sugestões combinam regras gerais, GHE, cargo e individuais. A origem aparece em cada curso.</p>
        ${selecao.size ? '<p>Uso e higienização de EPI e NR-06 foram tratados como alternativas neste kit, conforme sua orientação. Uma opção ficou desmarcada para evitar duplicidade. Revise o conteúdo antes de substituir; as regras cadastradas foram preservadas.</p>' : ''}
        <label>Data inicial <input id="admData" type="date" value="${escapeHTML(ctx.campos.data_inicio || ctx.data)}"></label>
        <label>Horário inicial <input id="admHora" type="time" value="08:00"></label>
        <div>${cursos.map((c, i) => `<div class="admCurso" data-codigo="${escapeHTML(String(c.id))}" style="margin:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <label><input type="checkbox" ${selecao.has(String(c.id)) ? '' : 'checked'}> ${escapeHTML(c.nome)}</label>
            <span style="font-size:12px">Origem: ${escapeHTML(c.origensKit || 'Regra cadastrada')}</span>
            <label>Ordem <input type="number" min="1" value="${i + 1}" style="width:60px"></label>
            <label>Carga (h) <input type="number" min="0.0167" step="any" value="${escapeHTML(String(c.carga_horaria || ''))}" style="width:75px"></label></div>`).join('')}</div>
        <button type="button" class="db-apply-btn" onclick="preverKitAdmissional()">Calcular sequência</button><div id="admPrevia" aria-live="polite"></div>`;
}

function selecionarCursosEquivalentesKit(cursos) {
    const normalizar = nome => String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const uso = cursos.filter(c => /USO.*HIGIENIZA.*EPI/.test(normalizar(c.nome)));
    const nr06 = cursos.filter(c => /NR[.\s-]*0?6\b/.test(normalizar(c.nome)));
    if (!uso.length || !nr06.length) return new Set();
    const alternativas = [...uso, ...nr06];
    // Prefere o curso vinculado ao GHE; a seleção continua editável pelo responsável.
    const preferido = alternativas.find(c => /GHE/i.test(c.origensKit || '')) || uso[0];
    return new Set(alternativas.filter(c => c !== preferido).map(c => String(c.id)));
}

function obterOcupacaoKitAdmissional(registros, matricula) {
    const minutos = h => {
        const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(h || '');
        return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const ocupados = [], semHorario = [];
    registros.filter(t => String(t.matricula) === String(matricula)).forEach(t => {
        const inicio = minutos(t.hora_inicio), fim = minutos(t.hora_termino);
        if (inicio !== null && fim !== null && fim > inicio) {
            ocupados.push({ data: t.data_treinamento, inicio, fim });
        } else {
            // Uma data sem horários não comprova que todo o expediente esteja ocupado.
            semHorario.push(t);
        }
    });
    return { ocupados, semHorario };
}

function lerAgendaKitAdmissional() {
    const ctx = contextoKits();
    const mat = document.getElementById('kitAdmissionalEditor').dataset.matricula;
    if (ctx.colaboradores.length !== 1 || String(ctx.colaboradores[0].matricula) !== mat) throw new Error('A turma mudou. Carregue novamente o kit admissional.');
    const cursos = Array.from(document.querySelectorAll('.admCurso')).filter(el => el.querySelector('input').checked).map(el => {
        const inputs = el.querySelectorAll('input');
        const cat = allTreinamentosCatalogo.find(c => String(c.id) === el.dataset.codigo);
        return { codigo: cat.id, nome: cat.nome, carga: Number(inputs[2].value), ordem: Number(inputs[1].value) };
    }).sort((a, b) => a.ordem - b.ordem);
    if (!cursos.length || cursos.some(c => !Number.isInteger(c.ordem) || c.ordem < 1) || new Set(cursos.map(c => c.ordem)).size !== cursos.length) throw new Error('Selecione cursos e use ordens positivas sem repetição.');
    const { ocupados, semHorario } = obterOcupacaoKitAdmissional(allTreinamentosRealizados, mat);
    const data = document.getElementById('admData').value, hora = document.getElementById('admHora').value;
    const agenda = distribuirAgendaAdmissional(data, hora, cursos, ocupados);
    const dias = new Set(agenda.flatMap(c => c.periodos.map(p => p.data)));
    const pendencias = semHorario.filter(t => dias.has(t.data_treinamento));
    const inicio = agenda[0].periodos[0];
    const ajusteInicio = inicio.data !== data || inicio.inicio !== hora
        ? `Início ajustado de ${formatSimpleDate(data)} ${hora} para ${formatSimpleDate(inicio.data)} ${inicio.inicio}, por expediente ou conflito com horário já registrado. Revise o histórico antes de emitir.` : '';
    return { ctx, agenda, pendencias, ajusteInicio };
}

function preverKitAdmissional() {
    try {
        const { agenda, pendencias, ajusteInicio } = lerAgendaKitAdmissional();
        document.getElementById('kitAdmissionalEditor').dataset.agenda = JSON.stringify(agenda);
        const avisos = pendencias.length ? `<div role="status"><b>Histórico sem horário: confira possíveis conflitos</b><p>Estes registros não reservaram o dia inteiro. Revise os horários no histórico antes de confirmar a emissão:</p>${pendencias.map(t => `<p>${escapeHTML(formatSimpleDate(t.data_treinamento))} — ${escapeHTML(obterNomeCursoCatalogo(t.treinamento_cod))}</p>`).join('')}<label><input id="admHistoricoRevisado" type="checkbox"> Revisei os registros sem horário e confirmei que não há sobreposição.</label></div>` : '';
        document.getElementById('admPrevia').innerHTML = (ajusteInicio ? `<p role="status"><b>${escapeHTML(ajusteInicio)}</b></p>` : '') + avisos + agenda.map(c => `<p><b>${escapeHTML(c.nome)} — ${c.carga}h</b><br>${c.periodos.map(p => `${formatSimpleDate(p.data)}: ${p.inicio}–${p.fim}`).join('<br>')}</p>`).join('') +
            '<p>Confira feriados e compromissos ainda não registrados. Esta programação não comprova participação.</p><label><input id="admConfirmado" type="checkbox"> Confirmo a realização efetiva de todos os cursos e revisei os responsáveis técnicos abaixo.</label><br><button type="button" class="db-apply-btn" onclick="emitirKitAdmissional()">Emitir certificados da sequência</button>';
    } catch (e) { alert(e.message); }
}

async function emitirKitAdmissional() {
    try {
        if (!document.getElementById('admConfirmado')?.checked) throw new Error('Confirme a realização antes de emitir certificados.');
        const { ctx, agenda, pendencias } = lerAgendaKitAdmissional();
        if (pendencias.length && !document.getElementById('admHistoricoRevisado')?.checked) throw new Error('Revise e confirme os registros sem horário antes de emitir.');
        if (document.getElementById('kitAdmissionalEditor').dataset.agenda !== JSON.stringify(agenda)) throw new Error('A programação mudou. Calcule e confira novamente antes de emitir.');
        await garantirDocumentosControleCarregados();
        const r = ctx.colaboradores[0], colab = allEfetivo.find(e => String(e.id) === String(r.matricula));
        const folhas = agenda.map(c => {
            const primeiro = c.periodos[0], ultimo = c.periodos[c.periodos.length - 1];
            const campos = { ...ctx.campos, tipo_capacitacao: 'inicial', carga_horaria_sessao: c.carga, data_inicio: primeiro.data,
                hora_inicio: primeiro.inicio, hora_termino: ultimo.fim, conteudo_programatico_custom: null, base_legal_custom: null,
                agenda_periodos: c.periodos };
            return construirFolhaCertificado(r, colab, allTreinamentosCatalogo.find(cat => cat.id === c.codigo), c.codigo, campos, ultimo.data);
        }).join('');
        abrirDocumentoHtmlParaImpressao(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Kit admissional</title><style>${DOC_INDIVIDUAL_CSS} @page { size:A4 landscape; margin:8mm; }</style></head><body><button class="no-print" onclick="window.print()">Imprimir / Salvar PDF</button>${folhas}</body></html>`, 'Kit_admissional');
    } catch (e) { alert(e.message); }
}
