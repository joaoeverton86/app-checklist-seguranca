const fs = require('fs');
const filePath = 'c:\\Users\\COP_RAMAL\\OneDrive - ZERO PAPEL\\Área de Trabalho\\app-checklist-v2\\app.js';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF for easier replacements
content = content.replace(/\r\n/g, '\n');

// 1. Helper function aplicarStatusSalvosDOM definition
const helperFunction = `
function aplicarStatusSalvosDOM() {
    for (const [itemId, itemData] of Object.entries(checklistData)) {
        const itemContainer = document.getElementById(\`item-\${itemId}\`);
        if (itemContainer) {
            const btnClass = itemData.status ? itemData.status.toLowerCase() : '';
            if (btnClass) {
                const btn = itemContainer.querySelector(\`.status-btn.\${btnClass}\`);
                if (btn) {
                    itemContainer.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    
                    const obsDiv = document.getElementById(\`obs-\${itemId}\`);
                    if (obsDiv) {
                        if (itemData.status === 'NC') {
                            obsDiv.classList.add('show');
                        } else {
                            obsDiv.classList.remove('show');
                        }
                    }
                }
            }
            
            const obsTextarea = itemContainer.querySelector(\`.item-observation textarea\`);
            if (obsTextarea) {
                obsTextarea.value = itemData.observation || '';
            }
        }
    }
    updateProgress();
}
`;

// Insert the helper function right before reinspecionarChecklist definition
const reinspectDef = 'async function reinspecionarChecklist(id) {';
if (!content.includes(reinspectDef)) {
    console.error('reinspecionarChecklist not found in app.js!');
    process.exit(1);
}
content = content.replace(reinspectDef, helperFunction + '\n' + reinspectDef);

// 2. Replace the body of reinspecionarChecklist
const reinspectRegex = /async function reinspecionarChecklist\(id\) \{[\s\S]*?showPage\('pageChecklistForm'\);\s*showToast\('Reinspeção iniciada! Dados anteriores carregados\.'\);\s*\}/;

const reinspectReplacement = `async function reinspecionarChecklist(id) {
    let original = await getFromIndexedDB('checklists', id);
    if (!original) {
        const numId = Number(id);
        if (!isNaN(numId)) {
            original = await getFromIndexedDB('checklists', numId);
        }
    }
    if (!original) {
        showToast('Checklist não encontrado.');
        return;
    }
    
    const equipment = encontrarEquipamentoParaChecklist(original);
    if (!equipment) {
        showToast('Erro: Não foi possível determinar o tipo do equipamento.');
        return;
    }
    
    currentEquipment = equipment;
    currentCadastro = null;
    
    showPage('pageNewChecklist');
    
    const categorySelect = document.getElementById('checklistCategory');
    if (categorySelect && equipment.category) {
        categorySelect.value = equipment.category;
        if (typeof onCategoryChange === 'function') onCategoryChange();
    }
    
    const typeSelect = document.getElementById('checklistType');
    if (typeSelect && equipment.id) {
        typeSelect.value = equipment.id;
        if (typeof onTypeChange === 'function') onTypeChange();
    }
    
    document.getElementById('checklistDate').value = new Date().toISOString().split('T')[0];
    
    const nomeInput = document.getElementById('checklistNome');
    const empresaInput = document.getElementById('checklistEmpresa');
    if (nomeInput) nomeInput.value = original.nome || equipment.name || '';
    if (empresaInput) empresaInput.value = original.empresa || '';
    
    const opInput = document.getElementById('checklistOperador');
    if (opInput) opInput.value = original.operador || '';
    
    const obsInput = document.getElementById('checklistObservacoes');
    if (obsInput) obsInput.value = \`Reinspeção baseada no checklist #\${original.id}. \` + (original.observacoes || '');
    
    const sstInput = document.getElementById('checklistSSTSelect');
    if (sstInput) sstInput.value = original.sst || '';
    
    const respInput = document.getElementById('checklistResponsavelSelect');
    if (respInput) respInput.value = original.responsavel || '';
    
    lockEquipmentFields(!!original.patrimonio);
    
    const category = equipment.category || original.equipment?.tipo || original.equipment?.category || '';
    if (category && typeof loadCadastroSelect === 'function') {
        await loadCadastroSelect(category);
    }
    if (typeof loadResponsavelSelect === 'function') {
        await loadResponsavelSelect();
    }
    
    // Selecionar patrimônio e carregar o cadastro ANTES de renderizar
    const selectPatrimonio = document.getElementById('checklistPatrimonio');
    if (selectPatrimonio && original.patrimonio) {
        selectPatrimonio.value = original.patrimonio;
        const cadastro = await getFromIndexedDB('cadastros', original.patrimonio);
        if (cadastro) {
            currentCadastro = cadastro;
        }
    }
    
    itensComFalhaAnterior = [];
    if (original.items) {
        for (const [itemId, itemData] of Object.entries(original.items)) {
            if (itemData && itemData.status === 'NC') {
                itensComFalhaAnterior.push(itemId);
            }
        }
    }
    
    // Update reinspection banner visibility
    const banner = document.getElementById('reinspectionBanner');
    if (banner) {
        banner.style.display = itensComFalhaAnterior.length > 0 ? 'flex' : 'none';
        const bannerDetail = document.getElementById('reinspectionBannerDetail');
        if (bannerDetail) {
            bannerDetail.textContent = \`Esta reinspeção é baseada no checklist #\${original.id}. Os itens com não conformidades anteriores foram destacados com bordas e selos amarelos.\`;
        }
    }
    
    // Copiar todas as respostas da inspeção anterior (Conforme e Não Conforme)
    checklistData = {};
    if (original.items) {
        for (const [itemId, itemData] of Object.entries(original.items)) {
            if (itemId === '_form') continue;
            checklistData[itemId] = {
                status: itemData.status,
                observation: itemData.observation || ''
            };
        }
    }
    
    clearSignature();
    clearSignatureResponsavel();
    
    renderChecklistItems(equipment, currentCadastro);
    
    // Aplicar status salvos nos botões e observações do DOM
    setTimeout(() => {
        aplicarStatusSalvosDOM();
        
        // Também pre-selecionar o status do checklist (Ex: Interditado, etc.) no formulário
        if (original.statusChecklist) {
            currentStatusChecklist = original.statusChecklist;
            const btnStatus = document.querySelector(\`button[onclick*="'\${original.statusChecklist}'"]\`);
            if (btnStatus) {
                setStatusChecklist(original.statusChecklist, btnStatus);
            }
        } else {
            currentStatusChecklist = null;
        }
    }, 80);
    
    showPage('pageChecklistForm');
    showToast('Reinspeção iniciada! Dados anteriores carregados.');
}`;

if (!reinspectRegex.test(content)) {
    console.error('reinspecionarChecklist function body regex match not found!');
    process.exit(1);
}
content = content.replace(reinspectRegex, reinspectReplacement);

// 3. Update setStatus logic to support auto-interdiction on INTERDIÇÃO items
const setStatusOld = `    // Salvar dados
    if (!checklistData[itemId]) checklistData[itemId] = {};
    checklistData[itemId].status = status;
    
    updateProgress();
}`;

const setStatusNew = `    // Salvar dados
    if (!checklistData[itemId]) checklistData[itemId] = {};
    checklistData[itemId].status = status;
    
    // Auto-interdição se item de interdição for marcado como NC
    if (status === 'NC' && currentEquipment) {
        const items = getEffectiveItems(currentEquipment);
        const currentItem = items.find(i => String(i.id) === String(itemId));
        if (currentItem && currentItem.section === 'INTERDIÇÃO') {
            const btnInterditar = document.querySelector("button[onclick*=\\"'interditado'\\"]");
            if (btnInterditar) {
                setStatusChecklist('interditado', btnInterditar);
            }
        }
    }
    
    updateProgress();
}`;

if (!content.includes(setStatusOld)) {
    console.error('setStatus target code not found in app.js!');
    process.exit(1);
}
content = content.replace(setStatusOld, setStatusNew);

// 4. Update saveChecklist logic to calculate hasInterdictionNC and force 'interditado'
const saveStatsRegex = /\/\/\s*Calcular\s+estatísticas[\s\S]*?statusFinal\s*=\s*'liberado';\s*\}/;

const saveChecklistNew = `    // Calcular estatísticas
    let conformes = 0, naoConformes = 0, na = 0;
    let hasInterdictionNC = false;
    const effectiveItems = getEffectiveItems(currentEquipment);
    items.forEach(k => {
        if (checklistData[k].status === 'C') conformes++;
        else if (checklistData[k].status === 'NC') {
            naoConformes++;
            const effItem = effectiveItems.find(i => String(i.id) === String(k));
            if (effItem && effItem.section === 'INTERDIÇÃO') {
                hasInterdictionNC = true;
            }
        }
        else if (checklistData[k].status === 'NA') na++;
        const effItem = effectiveItems.find(i => String(i.id) === String(k));
        if (effItem) checklistData[k].customText = effItem.text;
    });
    
    // Lógica de Status Final com Auto-Interdição
    let statusFinal = currentStatusChecklist;
    if (hasInterdictionNC) {
        statusFinal = 'interditado';
    } else if (naoConformes > 0 && !currentStatusChecklist) {
        statusFinal = 'liberado_restricao';
    } else if (naoConformes === 0) {
        statusFinal = 'liberado';
    }`;

content = content.replace(saveStatsRegex, saveChecklistNew);

// Convert line endings back to CRLF
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated app.js with new reinspection and interdiction logic!');
