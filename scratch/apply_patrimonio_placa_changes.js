const fs = require('fs');
const filePath = 'c:\\Users\\COP_RAMAL\\OneDrive - ZERO PAPEL\\Área de Trabalho\\app-checklist-v2\\app.js';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// Helper to replace exact block or return error
function replaceExact(target, replacement) {
    if (!content.includes(target)) {
        console.error('Target string not found in app.js:\n', target);
        process.exit(1);
    }
    content = content.replace(target, replacement);
}

// 1. Update converterParaSupabase (store === 'cadastros')
const convSupaOld = [
    "    if (store === 'cadastros') {",
    "        return {",
    "            id: String(item.id || item.patrimonio || '').trim().toUpperCase(),",
    "            tipo: item.tipo || '',",
    "            categoria: item.categoria || '',",
    "            nome: item.nome || '',",
    "            patrimonio: String(item.patrimonio || item.id || '').toUpperCase(),",
    "            empresa: item.empresa || '',",
    "            setor: item.setor || '',",
    "            obs: item.obs || '',",
    "            ativo: item.ativo !== false",
    "        };",
    "    }"
].join("\n");

const convSupaNew = [
    "    if (store === 'cadastros') {",
    "        return {",
    "            id: String(item.id || item.patrimonio || '').trim().toUpperCase(),",
    "            tipo: item.tipo || '',",
    "            categoria: item.categoria || '',",
    "            nome: item.nome || '',",
    "            patrimonio: String(item.patrimonio || item.id || '').toUpperCase(),",
    "            empresa: item.empresa || '',",
    "            setor: item.placa || '',",
    "            obs: item.obs || '',",
    "            ativo: item.ativo !== false",
    "        };",
    "    }"
].join("\n");
replaceExact(convSupaOld, convSupaNew);

// 2. Update converterParaAppFromSupabase (table === 'cadastros')
const convAppOld = [
    "    if (table === 'cadastros') {",
    "        return {",
    "            id: row.id,",
    "            tipo: row.tipo,",
    "            categoria: row.categoria,",
    "            nome: row.nome,",
    "            patrimonio: row.patrimonio,",
    "            empresa: row.empresa,",
    "            setor: row.setor,",
    "            obs: row.obs,",
    "            ativo: row.ativo,",
    "            synced: true",
    "        };",
    "    }"
].join("\n");

const convAppNew = [
    "    if (table === 'cadastros') {",
    "        return {",
    "            id: row.id,",
    "            tipo: row.tipo,",
    "            categoria: row.categoria,",
    "            nome: row.nome,",
    "            patrimonio: row.patrimonio,",
    "            placa: row.setor || '',",
    "            empresa: row.empresa,",
    "            setor: '',",
    "            obs: row.obs,",
    "            ativo: row.ativo,",
    "            synced: true",
    "        };",
    "    }"
].join("\n");
replaceExact(convAppOld, convAppNew);

// 3. Update saveCadastro()
const saveOld = [
    "async function saveCadastro() {",
    "    const tipo = document.getElementById('cadastroTipo').value;",
    "    const categoria = document.getElementById('cadastroCategoria').value;",
    "    const nome = document.getElementById('cadastroNome').value.trim();",
    "    const patrimonio = document.getElementById('cadastroPatrimonio').value.trim();",
    "    const empresa = document.getElementById('cadastroEmpresa').value.trim();",
    "    const setor = document.getElementById('cadastroSetor')?.value.trim() || '';",
    "    const obs = document.getElementById('cadastroObs').value.trim();",
    "    ",
    "    if (!tipo || !categoria || !nome || !patrimonio) {",
    "        showToast('Preencha todos os campos obrigatórios');",
    "        return;",
    "    }",
    "    ",
    "    const patrimonioNorm = patrimonio.trim().toUpperCase();",
    "    ",
    "    const existing = await getFromIndexedDB('cadastros', patrimonioNorm);",
    "    if (existing && existing.ativo !== false) {",
    "        showToast('⚠️ Já existe equipamento com patrimônio \"' + patrimonioNorm + '\"');",
    "        return;",
    "    }",
    "    ",
    "    if (existing && existing.ativo === false) {",
    "        if (!confirm('Já existiu um item com patrimônio \"' + patrimonioNorm + '\" (desativado). Deseja reativar?')) {",
    "            return;",
    "        }",
    "        existing.ativo = true;",
    "        existing.nome = nome;",
    "        existing.empresa = empresa;",
    "        existing.setor = setor;",
    "        existing.obs = obs;",
    "        existing.equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria) || null;",
    "        await saveToIndexedDB('cadastros', existing);",
    "        showToast('Equipamento reativado!');",
    "        ",
    "        document.getElementById('cadastroTipo').value = '';",
    "        document.getElementById('cadastroCategoria').innerHTML = '<option value=\"\">Selecione o tipo primeiro...</option>';",
    "        document.getElementById('cadastroNome').value = '';",
    "        document.getElementById('cadastroPatrimonio').value = '';",
    "        document.getElementById('cadastroEmpresa').value = '';",
    "        if (document.getElementById('cadastroSetor')) document.getElementById('cadastroSetor').value = '';",
    "        document.getElementById('cadastroObs').value = '';",
    "        ",
    "        setTimeout(() => showPage('pageCadastro'), 800);",
    "        return;",
    "    }",
    "    ",
    "    const equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria);",
    "    ",
    "    const cadastro = {",
    "        id: patrimonioNorm,",
    "        tipo,",
    "        categoria,",
    "        nome,",
    "        patrimonio: patrimonioNorm,",
    "        empresa,",
    "        setor,",
    "        obs,",
    "        equipment: equipment ? { id: equipment.id, name: equipment.name, icon: equipment.icon, nr: equipment.nr } : null,",
    "        timestamp: new Date().toISOString(),",
    "        ativo: true,",
    "        synced: false",
    "    };",
    "    ",
    "    await saveToIndexedDB('cadastros', cadastro);",
    "    ",
    "    document.getElementById('cadastroTipo').value = '';",
    "    document.getElementById('cadastroCategoria').innerHTML = '<option value=\"\">Selecione o tipo primeiro...</option>';",
    "    document.getElementById('cadastroNome').value = '';",
    "    document.getElementById('cadastroPatrimonio').value = '';",
    "    document.getElementById('cadastroEmpresa').value = '';",
    "    if (document.getElementById('cadastroSetor')) document.getElementById('cadastroSetor').value = '';",
    "    document.getElementById('cadastroObs').value = '';",
    "    ",
    "    showToast('Equipamento cadastrado!');",
    "    setTimeout(() => showPage('pageCadastro'), 800);",
    "}"
].join("\n");

const saveNew = [
    "async function saveCadastro() {",
    "    const tipo = document.getElementById('cadastroTipo').value;",
    "    const categoria = document.getElementById('cadastroCategoria').value;",
    "    const nome = document.getElementById('cadastroNome').value.trim();",
    "    const patrimonio = document.getElementById('cadastroPatrimonio').value.trim();",
    "    const placa = document.getElementById('cadastroPlaca')?.value.trim() || '';",
    "    const empresa = document.getElementById('cadastroEmpresa').value.trim();",
    "    const obs = document.getElementById('cadastroObs').value.trim();",
    "    ",
    "    if (!tipo || !categoria || !nome || !patrimonio) {",
    "        showToast('Preencha todos os campos obrigatórios');",
    "        return;",
    "    }",
    "    ",
    "    const patrimonioNorm = patrimonio.trim().toUpperCase();",
    "    ",
    "    const existing = await getFromIndexedDB('cadastros', patrimonioNorm);",
    "    if (existing && existing.ativo !== false) {",
    "        showToast('⚠️ Já existe equipamento com patrimônio \"' + patrimonioNorm + '\"');",
    "        return;",
    "    }",
    "    ",
    "    if (existing && existing.ativo === false) {",
    "        if (!confirm('Já existiu um item com patrimônio \"' + patrimonioNorm + '\" (desativado). Deseja reativar?')) {",
    "            return;",
    "        }",
    "        existing.ativo = true;",
    "        existing.nome = nome;",
    "        existing.empresa = empresa;",
    "        existing.placa = placa;",
    "        existing.setor = '';",
    "        existing.obs = obs;",
    "        existing.equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria) || null;",
    "        await saveToIndexedDB('cadastros', existing);",
    "        showToast('Equipamento reativado!');",
    "        ",
    "        document.getElementById('cadastroTipo').value = '';",
    "        document.getElementById('cadastroCategoria').innerHTML = '<option value=\"\">Selecione o tipo primeiro...</option>';",
    "        document.getElementById('cadastroNome').value = '';",
    "        document.getElementById('cadastroPatrimonio').value = '';",
    "        if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = '';",
    "        document.getElementById('cadastroEmpresa').value = '';",
    "        document.getElementById('cadastroObs').value = '';",
    "        ",
    "        setTimeout(() => showPage('pageCadastro'), 800);",
    "        return;",
    "    }",
    "    ",
    "    const equipment = EQUIPMENT_TYPES[tipo].find(e => e.id === categoria);",
    "    ",
    "    const cadastro = {",
    "        id: patrimonioNorm,",
    "        tipo,",
    "        categoria,",
    "        nome,",
    "        patrimonio: patrimonioNorm,",
    "        placa,",
    "        empresa,",
    "        setor: '',",
    "        obs,",
    "        equipment: equipment ? { id: equipment.id, name: equipment.name, icon: equipment.icon, nr: equipment.nr } : null,",
    "        timestamp: new Date().toISOString(),",
    "        ativo: true,",
    "        synced: false",
    "    };",
    "    ",
    "    await saveToIndexedDB('cadastros', cadastro);",
    "    ",
    "    document.getElementById('cadastroTipo').value = '';",
    "    document.getElementById('cadastroCategoria').innerHTML = '<option value=\"\">Selecione o tipo primeiro...</option>';",
    "    document.getElementById('cadastroNome').value = '';",
    "    document.getElementById('cadastroPatrimonio').value = '';",
    "    if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = '';",
    "    document.getElementById('cadastroEmpresa').value = '';",
    "    document.getElementById('cadastroObs').value = '';",
    "    ",
    "    showToast('Equipamento cadastrado!');",
    "    setTimeout(() => showPage('pageCadastro'), 800);",
    "}"
].join("\n");
replaceExact(saveOld, saveNew);

// 4. Update editCadastro()
const editOld = [
    "        document.getElementById('cadastroNome').value = cadastro.nome || '';",
    "        document.getElementById('cadastroPatrimonio').value = cadastro.patrimonio || '';",
    "        document.getElementById('cadastroEmpresa').value = cadastro.empresa || '';",
    "        document.getElementById('cadastroSetor').value = cadastro.setor || '';",
    "        document.getElementById('cadastroObs').value = cadastro.obs || '';"
].join("\n");

const editNew = [
    "        document.getElementById('cadastroNome').value = cadastro.nome || '';",
    "        document.getElementById('cadastroPatrimonio').value = cadastro.patrimonio || '';",
    "        if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = cadastro.placa || '';",
    "        document.getElementById('cadastroEmpresa').value = cadastro.empresa || '';",
    "        document.getElementById('cadastroObs').value = cadastro.obs || '';"
].join("\n");
replaceExact(editOld, editNew);

// 5. Update saveCadastroEdit()
const saveEditOld = [
    "    const cadastro = {",
    "        ...oldCadastro,",
    "        id: newPatrimonio,",
    "        patrimonio: newPatrimonio,",
    "        tipo: document.getElementById('cadastroTipo')?.value || oldCadastro.tipo || '',",
    "        categoria: document.getElementById('cadastroCategoria')?.value || oldCadastro.categoria || '',",
    "        nome: document.getElementById('cadastroNome').value.trim(),",
    "        empresa: document.getElementById('cadastroEmpresa').value.trim(),",
    "        setor: document.getElementById('cadastroSetor').value.trim(),",
    "        obs: document.getElementById('cadastroObs').value.trim(),",
    "        ativo: isAtivo,",
    "        synced: false",
    "    };",
    "",
    "    await saveToIndexedDB('cadastros', cadastro);",
    "",
    "    if (isSupabaseConfigured()) {",
    "        await sincronizarItemIndividualSupabase('cadastros', cadastro);",
    "    }",
    "",
    "    showToast(isAtivo ? 'Equipamento atualizado com sucesso!' : 'Equipamento desmobilizado!');",
    "",
    "    const btn = document.querySelector('#pageNovoEquipamento .save-btn[onclick^=\"saveCadastroEdit\"]');",
    "    if (btn) {",
    "        btn.textContent = 'Cadastrar Equipamento';",
    "        btn.setAttribute('onclick', 'saveCadastro()');",
    "    }",
    "",
    "    const statusGroup = document.getElementById('groupCadastroStatus');",
    "    if (statusGroup) statusGroup.style.display = 'none';",
    "    const statusSelect = document.getElementById('cadastroStatus');",
    "    if (statusSelect) statusSelect.value = 'ativo';",
    "",
    "    document.getElementById('cadastroTipo').value = '';",
    "    document.getElementById('cadastroCategoria').innerHTML = '<option value=\"\">Selecione o tipo primeiro...</option>';",
    "    document.getElementById('cadastroNome').value = '';",
    "    document.getElementById('cadastroPatrimonio').value = '';",
    "    document.getElementById('cadastroEmpresa').value = '';",
    "    document.getElementById('cadastroSetor').value = '';",
    "    document.getElementById('cadastroObs').value = '';"
].join("\n");

const saveEditNew = [
    "    const cadastro = {",
    "        ...oldCadastro,",
    "        id: newPatrimonio,",
    "        patrimonio: newPatrimonio,",
    "        tipo: document.getElementById('cadastroTipo')?.value || oldCadastro.tipo || '',",
    "        categoria: document.getElementById('cadastroCategoria')?.value || oldCadastro.categoria || '',",
    "        nome: document.getElementById('cadastroNome').value.trim(),",
    "        placa: document.getElementById('cadastroPlaca')?.value.trim() || '',",
    "        empresa: document.getElementById('cadastroEmpresa').value.trim(),",
    "        setor: '',",
    "        obs: document.getElementById('cadastroObs').value.trim(),",
    "        ativo: isAtivo,",
    "        synced: false",
    "    };",
    "",
    "    await saveToIndexedDB('cadastros', cadastro);",
    "",
    "    if (isSupabaseConfigured()) {",
    "        await sincronizarItemIndividualSupabase('cadastros', cadastro);",
    "    }",
    "",
    "    showToast(isAtivo ? 'Equipamento atualizado com sucesso!' : 'Equipamento desmobilizado!');",
    "",
    "    const btn = document.querySelector('#pageNovoEquipamento .save-btn[onclick^=\"saveCadastroEdit\"]');",
    "    if (btn) {",
    "        btn.textContent = 'Cadastrar Equipamento';",
    "        btn.setAttribute('onclick', 'saveCadastro()');",
    "    }",
    "",
    "    const statusGroup = document.getElementById('groupCadastroStatus');",
    "    if (statusGroup) statusGroup.style.display = 'none';",
    "    const statusSelect = document.getElementById('cadastroStatus');",
    "    if (statusSelect) statusSelect.value = 'ativo';",
    "",
    "    document.getElementById('cadastroTipo').value = '';",
    "    document.getElementById('cadastroCategoria').innerHTML = '<option value=\"\">Selecione o tipo primeiro...</option>';",
    "    document.getElementById('cadastroNome').value = '';",
    "    document.getElementById('cadastroPatrimonio').value = '';",
    "    if (document.getElementById('cadastroPlaca')) document.getElementById('cadastroPlaca').value = '';",
    "    document.getElementById('cadastroEmpresa').value = '';",
    "    document.getElementById('cadastroObs').value = '';"
].join("\n");
replaceExact(saveEditOld, saveEditNew);

// 6. Update loadGestao query filter and render formatting
const gestaoFilterOld = [
    "        if (query) {",
    "            items = items.filter(c =>",
    "                (c.patrimonio && c.patrimonio.toLowerCase().includes(query)) ||",
    "                (c.nome && c.nome.toLowerCase().includes(query)) ||",
    "                (c.empresa && c.empresa.toLowerCase().includes(query)) ||",
    "                (c.setor && c.setor.toLowerCase().includes(query))",
    "            );",
    "        }"
].join("\n");

const gestaoFilterNew = [
    "        if (query) {",
    "            items = items.filter(c =>",
    "                (c.patrimonio && c.patrimonio.toLowerCase().includes(query)) ||",
    "                (c.nome && c.nome.toLowerCase().includes(query)) ||",
    "                (c.empresa && c.empresa.toLowerCase().includes(query)) ||",
    "                (c.placa && c.placa.toLowerCase().includes(query))",
    "            );",
    "        }"
].join("\n");
replaceExact(gestaoFilterOld, gestaoFilterNew);

const gestaoRenderOld = [
    "            return `",
    "                <div class=\"history-item\" style=\"flex-wrap: wrap; ${opacityStyle}\">",
    "                    <div class=\"history-info\">",
    "                        <div class=\"history-title\">${c.patrimonio}</div>",
    "                        <div class=\"history-date\">${c.nome || ''}</div>",
    "                        <div class=\"history-date\">${c.empresa || ''}</div>",
    "                        <div class=\"history-date\">${c.setor || ''}</div>",
    "                        <div style=\"margin-top: 4px;\">${statusBadge}</div>",
    "                    </div>"
].join("\n");

const gestaoRenderNew = [
    "            return `",
    "                <div class=\"history-item\" style=\"flex-wrap: wrap; ${opacityStyle}\">",
    "                    <div class=\"history-info\">",
    "                        <div class=\"history-title\">${c.patrimonio}${c.placa ? ' [' + c.placa + ']' : ''}</div>",
    "                        <div class=\"history-date\">${c.nome || ''}</div>",
    "                        <div class=\"history-date\">${c.empresa || ''}</div>",
    "                        <div style=\"margin-top: 4px;\">${statusBadge}</div>",
    "                    </div>"
].join("\n");
replaceExact(gestaoRenderOld, gestaoRenderNew);

// 7. Update loadCadastroSuggestions and filterCadastros suggestions
const suggestionsRenderOld = "${c.empresa || 'Sem empresa'} ${c.setor ? '• ' + c.setor : ''}";
const suggestionsRenderNew = "${c.empresa || 'Sem empresa'} ${c.placa ? '• Placa: ' + c.placa : ''}";
// Since it appears twice, we will replace it (AllowMultiple check)
content = content.split(suggestionsRenderOld).join(suggestionsRenderNew);

const suggestionsFilterQueryOld = [
    "    const filtered = filtradosBase.filter(item => ",
    "        (item.patrimonio && item.patrimonio.toLowerCase().includes(queryLower)) ||",
    "        (item.nome && item.nome.toLowerCase().includes(queryLower)) ||",
    "        (item.empresa && item.empresa.toLowerCase().includes(queryLower))",
    "    );"
].join("\n");

const suggestionsFilterQueryNew = [
    "    const filtered = filtradosBase.filter(item => ",
    "        (item.patrimonio && item.patrimonio.toLowerCase().includes(queryLower)) ||",
    "        (item.nome && item.nome.toLowerCase().includes(queryLower)) ||",
    "        (item.empresa && item.empresa.toLowerCase().includes(queryLower)) ||",
    "        (item.placa && item.placa.toLowerCase().includes(queryLower))",
    "    );"
].join("\n");
replaceExact(suggestionsFilterQueryOld, suggestionsFilterQueryNew);

// 8. Update loadCadastroSelect option text formatting
const selectOptOld = "        option.textContent = `${c.patrimonio} - ${c.nome} (${c.empresa || 'Sem empresa'})`;";
const selectOptNew = "        option.textContent = `${c.patrimonio}${c.placa ? ' [' + c.placa + ']' : ''} - ${c.nome} (${c.empresa || 'Sem empresa'})`;";
replaceExact(selectOptOld, selectOptNew);

// 9. Update reportFilterPatrimonio option text formatting
const reportOptOld = "            opt.textContent = `${eq.patrimonio} - ${eq.nome}`;";
const reportOptNew = "            opt.textContent = `${eq.patrimonio}${eq.placa ? ' [' + eq.placa + ']' : ''} - ${eq.nome}`;";
replaceExact(reportOptOld, reportOptNew);

// 10. Update exportChecklist PDF generation lookup and output
const pdfLookupOld = [
    "    const c = await getFromIndexedDB('checklists', id);",
    "    if (!c) return;"
].join("\n");

const pdfLookupNew = [
    "    const c = await getFromIndexedDB('checklists', id);",
    "    if (!c) return;",
    "    ",
    "    const cad = c.patrimonio ? await getFromIndexedDB('cadastros', c.patrimonio) : null;",
    "    const placa = cad ? cad.placa : '';"
].join("\n");
replaceExact(pdfLookupOld, pdfLookupNew);

const pdfFieldOld = "    drawField('Setor: ', c.setor || 'N/A', 20, innerY + 24);";
const pdfFieldNew = "    drawField('Placa: ', placa || 'N/A', 20, innerY + 24);";
replaceExact(pdfFieldOld, pdfFieldNew);

// Convert line endings back to CRLF
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully completed all replacements for Patrimonio/Placa and Setor separation!');
