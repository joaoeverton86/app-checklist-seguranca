/* Supabase Auth gate — dashboard only.
 * Authorization uses server-assigned app_metadata only. This UI gate does not replace database RLS.
 */
(function () {
  'use strict';
  var URL = 'https://qqtcwxvbjmybyzubocgd.supabase.co';
  var KEY = 'sb_publishable_fpLRS4PX3tiL3d9AkuCyPA_lzH7sJSv';
  var client;
  var initialized = false;
  function byId(id) { return document.getElementById(id); }
  function canAccess(user) {
    var meta = user && user.app_metadata || {};
    return meta.dashboard_access === true || meta.role === 'admin';
  }
  function ensureGate() {
    if (byId('supabaseAuthGate')) return;
    var style = document.createElement('style');
    style.textContent = '#supabaseAuthGate{position:fixed;inset:0;z-index:20000;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,sans-serif}#supabaseAuthCard{width:100%;max-width:390px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;box-shadow:0 15px 45px rgba(15,23,42,.12);box-sizing:border-box}#supabaseAuthCard input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:8px;margin-top:5px;font-size:14px}#supabaseAuthCard button{width:100%;padding:11px;border:0;border-radius:8px;background:#1d4ed8;color:white;font-weight:700;cursor:pointer;margin-top:12px}#supabaseAuthMessage{font-size:12px;line-height:1.45;margin-top:12px;color:#b91c1c;white-space:pre-wrap}';
    document.head.appendChild(style);
    var gate = document.createElement('div');
    gate.id = 'supabaseAuthGate';
    gate.innerHTML = '<section id="supabaseAuthCard" aria-labelledby="supabaseAuthTitle"><div style="font-size:32px;text-align:center">🛡️</div><h1 id="supabaseAuthTitle" style="font-size:20px;text-align:center;margin:8px 0">Painel Gerencial SST</h1><p style="font-size:12px;color:#64748b;text-align:center;margin:0 0 20px">Acesso protegido pelo Supabase Auth</p><form id="supabaseAuthForm"><label for="supabaseAuthEmail" style="font-size:12px;font-weight:600">E-mail corporativo</label><input id="supabaseAuthEmail" type="email" autocomplete="username" required><label for="supabaseAuthPassword" style="display:block;font-size:12px;font-weight:600;margin-top:12px">Senha</label><input id="supabaseAuthPassword" type="password" autocomplete="current-password" required><button id="supabaseAuthSubmit" type="submit">Entrar</button></form><button id="supabaseAuthReset" type="button" style="background:#475569">Enviar link para redefinir senha</button><div id="supabaseAuthMessage" role="status" aria-live="polite"></div><p style="font-size:11px;color:#64748b;line-height:1.4;margin-bottom:0">Somente contas previamente autorizadas para o painel podem entrar. Se você já tem cadastro, solicite a vinculação segura ao administrador.</p></section>';
    document.body.appendChild(gate);
    byId('supabaseAuthForm').addEventListener('submit', signIn);
    byId('supabaseAuthReset').addEventListener('click', resetPassword);
  }
  function showGate(msg) {
    ensureGate();
    byId('supabaseAuthGate').style.display = 'flex';
    var legacy = byId('dashboardLoginScreen');
    if (legacy) legacy.style.display = 'none';
    if (msg) message(msg, false);
  }
  function message(text, success) {
    var node = byId('supabaseAuthMessage');
    if (node) { node.textContent = text || ''; node.style.color = success ? '#166534' : '#b91c1c'; }
  }
  function allow(user) {
    if (!canAccess(user)) {
      client.auth.signOut();
      showGate('Conta autenticada, mas sem permissão para o painel. Solicite ao administrador a concessão de acesso.');
      return false;
    }
    var gate = byId('supabaseAuthGate');
    if (gate) gate.remove();
    var legacy = byId('dashboardLoginScreen');
    if (legacy) legacy.style.display = 'none';
    document.documentElement.dataset.dashboardAuth = 'authenticated';
    window.dispatchEvent(new CustomEvent('dashboard:supabase-authenticated', {detail:{userId:user.id,email:user.email}}));
    return true;
  }
  async function signIn(event) {
    event.preventDefault();
    var button = byId('supabaseAuthSubmit');
    button.disabled = true; button.textContent = 'Validando...'; message('');
    try {
      var result = await client.auth.signInWithPassword({email:byId('supabaseAuthEmail').value.trim(),password:byId('supabaseAuthPassword').value});
      if (result.error) throw result.error;
      if (result.data.user) allow(result.data.user);
    } catch (_) { message('Não foi possível autenticar. Verifique o e-mail e a senha ou solicite suporte ao administrador.'); }
    finally { if (byId('supabaseAuthSubmit')) {button.disabled=false;button.textContent='Entrar';} }
  }
  async function resetPassword() {
    var email = byId('supabaseAuthEmail').value.trim();
    if (!email) {message('Informe o e-mail corporativo para receber o link de redefinição.');return;}
    try {
      var result = await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});
      if (result.error) throw result.error;
      message('Se houver uma conta elegível para esse e-mail, você receberá as instruções de redefinição.',true);
    } catch (_) {message('Não foi possível solicitar a redefinição agora. Tente novamente mais tarde.');}
  }
  async function init() {
    showGate();
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {message('A biblioteca Supabase Auth não carregou. Atualize a página ou tente novamente.');return;}
    client = window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    try {
      var result = await client.auth.getSession();
      if (result.error) throw result.error;
      if (result.data.session && allow(result.data.session.user)) initialized = true;
    } catch (_) {message('Não foi possível validar a sessão. Tente entrar novamente quando houver conexão.');}
    client.auth.onAuthStateChange(function(event,session) {
      if (event === 'SIGNED_OUT' || !session) {initialized=false;showGate();}
      else if (session && session.user) initialized=allow(session.user);
    });
    window.dashboardSupabaseAuth = {
      client:client,
      signOut:async function(){var result=await client.auth.signOut();if(result.error)throw result.error;showGate();},
      getSession:function(){return client.auth.getSession();},
      hasAccess:function(){return initialized;}
    };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();