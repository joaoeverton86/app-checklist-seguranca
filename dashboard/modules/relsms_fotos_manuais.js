/* Registro fotográfico editável no Word. Não consulta nem grava arquivos no Drive. */
async function relSmsColetarCamposFotos(mes, ano) {
    if (!Number.isInteger(mes) || mes < 0 || mes > 11 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) throw new Error('Competência inválida para os campos de fotos.');
    const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const inicio = prefixo + '-01';
    const fim = prefixo + '-' + String(new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()).padStart(2, '0');
    const [treinamentos, catalogo, ddsma] = await Promise.all([
        supabaseFetch('treinamentos_cronograma', `?select=*&or=(and(data_prevista.gte.${inicio},data_prevista.lte.${fim}),and(data_realizada.gte.${inicio},data_realizada.lte.${fim}))&order=data_prevista.asc`),
        supabaseFetch('treinamentos_catalogo', '?select=id,nome'),
        supabaseFetch('dds_temas_cronograma', `?select=id,data,tema&data=gte.${inicio}&data=lte.${fim}&order=data.asc`)
    ]);
    if (![treinamentos, catalogo, ddsma].every(Array.isArray)) throw new Error('Não foi possível conferir os cronogramas para montar os campos de fotos.');
    const grupos = [];
    const vistos = new Set();
    const adicionar = (tipo, tema, prevista, realizada) => {
        tema = String(tema || '').trim();
        if (!tema) throw new Error('Há tema sem descrição no cronograma. Corrija o cadastro antes de gerar o Word.');
        const chave = JSON.stringify([tipo, tema, prevista || '', realizada || '']);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        grupos.push({ tipo, tema, prevista: prevista || null, realizada: realizada || null });
    };
    for (const t of treinamentos) {
        if (['cancelado', 'cancelada'].includes(String(t.status || '').toLowerCase())) continue;
        const nome = catalogo.find(c => String(c.id) === String(t.treinamento_cod))?.nome || t.treinamento_nome;
        adicionar('treinamento', nome, String(t.data_prevista || '').slice(0, 10), String(t.data_realizada || '').slice(0, 10));
    }
    for (const d of ddsma) adicionar('ddsma', d.tema, String(d.data || '').slice(0, 10), null);
    return { mes, ano, grupos };
}

function relSmsConstruirCamposFotosWord(dados) {
    const out = [relSmsH1('9. Registros Fotográficos — Treinamentos e DDSMA')];
    out.push(relSmsNota('Inserir duas fotos por tema nos espaços reservados e conferir a data da aplicação. As datas previstas vêm dos cronogramas e não comprovam realização. Retirar os blocos de atividades não realizadas antes da emissão final.'));
    const data = valor => /^\d{4}-\d{2}-\d{2}$/.test(valor || '') ? valor.split('-').reverse().join('/') : '____/____/________';
    for (const [tipo, titulo] of [['treinamento', '9.1. Treinamentos'], ['ddsma', '9.2. DDSMA']]) {
        out.push(relSmsH2(titulo));
        const grupos = dados.grupos.filter(g => g.tipo === tipo);
        if (!grupos.length) out.push(relSmsP('Nenhum tema cadastrado no cronograma desta competência.'));
        for (const g of grupos) {
            out.push(new docx.Paragraph({ keepNext: true, spacing: { before: 200, after: 80 }, children: [new docx.TextRun({ text: g.tema, bold: true, size: 22 })] }));
            out.push(new docx.Paragraph({ keepNext: true, spacing: { after: 100 }, children: [new docx.TextRun({ text: `Data prevista: ${data(g.prevista)} • Data da aplicação: ${data(g.realizada)}`, size: 18 })] }));
            const borda = { style: docx.BorderStyle.SINGLE, size: 6, color: '94A3B8' };
            const cells = [1, 2].map(n => new docx.TableCell({
                width: { size: 4680, type: docx.WidthType.DXA },
                verticalAlign: docx.VerticalAlign.CENTER,
                borders: { top: borda, bottom: borda, left: borda, right: borda },
                children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: `INSERIR FOTO ${n}`, color: '64748B', size: 20 })] })]
            }));
            out.push(new docx.Table({
                width: { size: 9360, type: docx.WidthType.DXA }, columnWidths: [4680, 4680],
                rows: [new docx.TableRow({ cantSplit: true, height: { value: 2600, rule: docx.HeightRule.ATLEAST }, children: cells })]
            }));
            out.push(new docx.Paragraph({ spacing: { after: 120 }, children: [new docx.TextRun({ text: `Tema: ${g.tema} — Data: ${data(g.realizada)}`, size: 18 })] }));
        }
    }
    out.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    return out;
}
