const assert = require('assert');
const fs = require('fs');

console.log('🧪 Iniciando Teste de Subabas de Efetivo...');

// Mock de DOM básico
const elements = {};
function mockElement(id) {
    if (!elements[id]) {
        elements[id] = {
            id,
            style: { display: '' },
            classList: {
                _classes: new Set(),
                add(c) { this._classes.add(c); },
                remove(c) { this._classes.delete(c); },
                toggle(c, force) {
                    if (force === undefined) {
                        if (this._classes.has(c)) this._classes.delete(c);
                        else this._classes.add(c);
                    } else if (force) {
                        this._classes.add(c);
                    } else {
                        this._classes.delete(c);
                    }
                },
                contains(c) { return this._classes.has(c); }
            }
        };
    }
    return elements[id];
}

const subtabs = ['visao', 'colaboradores', 'terceiros', 'ferias', 'os', 'setores', 'ghe', 'recomendacoes', 'maoobra', 'relatorio'];
subtabs.forEach(t => {
    mockElement('efetivoSubtab-' + t);
    mockElement('efetivoSubtabBtn-' + t);
});

// Mock de document
global.document = {
    getElementById(id) {
        return elements[id] || null;
    }
};

// Funções dummy
global.renderEfetivoPanel = () => {};
global.renderEfetivoResumo = () => {};
global.filterEfetivoColaboradores = () => {};
global.renderTerceirosPanel = () => {};
global.renderFeriasPanel = () => {};
global.renderControleOrdensServico = () => {};
global.fecharGerenciarSetor = () => {};
global.renderSetoresLista = () => {};
global.fecharGerenciarGhe = () => {};
global.renderGheLista = () => {};
global.renderRecomendacoesGheLista = () => {};
global.popularMaoDeObraDefaults = () => {};
global.renderMunicipiosAdaLista = () => {};
global.renderEfetivoRelatorioChecklist = () => {};

// Carrega showEfetivoSubtab de efetivo_ferias.js
const code = fs.readFileSync('dashboard/modules/efetivo_ferias.js', 'utf8');
const fnMatch = code.match(/function showEfetivoSubtab\(tab\) \{[\s\S]*?\n\}/);
if (!fnMatch) throw new Error('Não encontrou showEfetivoSubtab no arquivo');

eval(fnMatch[0]);

// Testa cada subaba
subtabs.forEach(tab => {
    showEfetivoSubtab(tab);

    subtabs.forEach(other => {
        const expectedDisplay = (other === tab) ? 'block' : 'none';
        const expectedActive = (other === tab);

        assert.strictEqual(
            elements['efetivoSubtab-' + other].style.display,
            expectedDisplay,
            `Display de efetivoSubtab-${other} deveria ser ${expectedDisplay} ao ativar ${tab}`
        );

        assert.strictEqual(
            elements['efetivoSubtabBtn-' + other].classList.contains('active'),
            expectedActive,
            `Botão efetivoSubtabBtn-${other} deveria ser active=${expectedActive} ao ativar ${tab}`
        );
    });
});

console.log('✅ Teste de alternância das 10 subabas de Efetivo APROVADO!');
