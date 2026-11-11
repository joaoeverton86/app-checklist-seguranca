'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'../dashboard.js'),'utf8');
const start=code.indexOf('async function realizarLoginPainelExterno()');
const end=code.indexOf('// Alterna a telinha de login',start);
assert(start>=0&&end>start);
(async()=>{
 const elements={dbLoginExternoEmail:{value:'visualizador@example.test'},dbLoginExternoSenha:{value:'senha-ficticia'},dbLoginExternoError:{style:{}},dbLoginExternoBtn:{}};
 let saved,initialized=false;
 const context=vm.createContext({document:{getElementById:id=>elements[id]},sbAuth:{auth:{signInWithPassword:async()=>({data:{user:{id:'auth-uid-ficticio',email:'verificado@example.test'}}}),signOut:async()=>{}}},supabaseFetch:async()=>[{auth_user_id:'auth-uid-ficticio',nome:'Pessoa Ficticia',email:'cadastro-antigo@example.test',ativo:true,perfil_id:'leitor',painel_perfis:{ativo:true,nome:'Leitor',ver_todos:false,modulos:['gestao_de_condutores'],modulos_edicao:[]}}],localStorage:{setItem:(key,value)=>{assert.equal(key,'active_session');saved=JSON.parse(value);}},init:()=>{initialized=true;},console});
 vm.runInContext(code.slice(start,end),context);
 await context.realizarLoginPainelExterno();
 assert.equal(initialized,true);
 assert.equal(saved.auth_user_id,'auth-uid-ficticio');
 assert.equal(saved.email,'verificado@example.test','Sessão visual deve guardar email verificado pelo Auth');
 assert.equal(saved.tipo,'painel_externo');
 console.log('Login painel: UID e email verificados preservados na sessão visual.');
})();
