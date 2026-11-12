const {test}=require('node:test'),assert=require('node:assert/strict');
const {planejarAcessos}=require('../planejar-acessos-anexos.cjs');
const uid='11111111-1111-4111-8111-111111111111',outro='22222222-2222-4222-8222-222222222222';
const conta=()=>({auth_uid:uid,email_confirmado:true,bloqueado_auth:false,concessao_anexos:null,vinculos_internos:[{ativo:true,nivel:'Admin'}],vinculos_painel:[]});
const proposta=()=>({auth_uid:uid,rotulo:'Conta fictícia',concessao:{versao:1,admin:true}});
test('não infere concessões de linhas Admin e não aprova proposta elegível',()=>{
    assert.equal(planejarAcessos([conta()],[]).itens[0].estado,'sem_proposta');
    const r=planejarAcessos([conta()],[proposta()]);assert.equal(r.itens[0].estado,'elegivel_para_revisao');assert.equal(r.itens[0].aprovado,false);assert.equal(r.altera_contas,false);
});
test('e-mail pendente, bloqueio, perfil inativo e vínculo duplicado impedem habilitação',()=>{
    for(const patch of [{email_confirmado:false},{bloqueado_auth:true},{vinculos_internos:[{ativo:false}]},
        {vinculos_painel:[{ativo:true,perfil_ativo:false}]},{vinculos_internos:[{ativo:true},{ativo:true}]},{vinculos_internos:[]}]) {
        const r=planejarAcessos([{...conta(),...patch}],[proposta()]);assert.equal(r.itens[0].estado,'bloqueado');assert.ok(r.itens[0].motivos.length);
    }
});
test('não sobrescreve concessão diferente nem inclui conta desconhecida silenciosamente',()=>{
    assert.equal(planejarAcessos([{...conta(),concessao_anexos:{versao:1,ver_todos:true}}],[proposta()]).itens[0].estado,'bloqueado');
    assert.equal(planejarAcessos([], [{...proposta(),auth_uid:outro}]).itens[0].estado,'bloqueado');
});
test('concessão igual dispensa alteração e entradas não são modificadas',()=>{
    const c={...conta(),concessao_anexos:proposta().concessao},p=proposta(),antes=JSON.stringify({c,p});
    assert.equal(planejarAcessos([c],[p]).itens[0].estado,'sem_alteracao');assert.equal(JSON.stringify({c,p}),antes);
});
test('recusa duplicidade, campos fora da finalidade e ampliação de Saúde',()=>{
    assert.throws(()=>planejarAcessos([conta(),conta()],[]));assert.throws(()=>planejarAcessos([conta()],[proposta(),proposta()]));
    const id='abcdefab-1111-4111-8111-111111111111';assert.throws(()=>planejarAcessos([{...conta(),auth_uid:id},{...conta(),auth_uid:id.toUpperCase()}],[]));
    for(const concessao of [{versao:1,role:'service_role'},{versao:1,saude:true,admin:true},{versao:1,saude:true,modulos_edicao:['acervodrive']},{versao:1,admin:'true'},{versao:2}]) {
        assert.throws(()=>planejarAcessos([conta()],[{...proposta(),concessao}]));
    }
});
