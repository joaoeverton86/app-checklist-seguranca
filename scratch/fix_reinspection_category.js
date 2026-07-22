const fs = require('fs');
const filePath = 'c:\\Users\\COP_RAMAL\\OneDrive - ZERO PAPEL\\Área de Trabalho\\app-checklist-v2\\app.js';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Define encontrarCategoriaDoEquipamento helper
const categoryHelper = `
function encontrarCategoriaDoEquipamento(equipment) {
    if (!equipment) return '';
    for (const [catKey, list] of Object.entries(EQUIPMENT_TYPES)) {
        if (list.some(e => e.id === equipment.id)) {
            return catKey;
        }
    }
    return '';
}
`;

// Insert the helper right before encontrarEquipamentoParaChecklist definition
const encontrarEqpDef = 'function encontrarEquipamentoParaChecklist(checklist) {';
if (!content.includes(encontrarEqpDef)) {
    console.error('encontrarEquipamentoParaChecklist not found in app.js!');
    process.exit(1);
}
content = content.replace(encontrarEqpDef, categoryHelper + '\n' + encontrarEqpDef);

// 2. Modify reinspecionarChecklist to use encontrarCategoriaDoEquipamento for category determination
const oldCategoryLine = "    const category = equipment.category || original.equipment?.tipo || original.equipment?.category || '';";
const newCategoryLine = "    const category = encontrarCategoriaDoEquipamento(equipment) || equipment.category || original.equipment?.tipo || original.equipment?.category || '';";

if (!content.includes(oldCategoryLine)) {
    console.error('oldCategoryLine not found in app.js!');
    process.exit(1);
}
content = content.replace(oldCategoryLine, newCategoryLine);

// Convert line endings back to CRLF
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully fixed reinspection category loading in app.js!');
