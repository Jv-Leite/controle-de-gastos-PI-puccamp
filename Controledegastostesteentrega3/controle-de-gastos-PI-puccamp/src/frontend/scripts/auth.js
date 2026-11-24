// auth.js: perfil local (cadastro, login e sessão) usando localStorage
const Auth = (() => {
  'use strict';

  const CH_USUARIOS = 'ca_usuarios';
  const CH_SESSAO = 'ca_sessao';

  function ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
    catch { return padrao; }
  }
  const usuarios = () => ler(CH_USUARIOS, {});
  const salvarUsuarios = u => localStorage.setItem(CH_USUARIOS, JSON.stringify(u));
  const normalizar = email => String(email).trim().toLowerCase();

  // a sessão só vale se apontar para um usuário cadastrado
  function sessao() {
    const s = ler(CH_SESSAO, null);
    return s && typeof s.email === 'string' && usuarios()[s.email] ? s : null;
  }

  /* senha: PBKDF2 (SHA-256) com sal aleatório por usuário */

  const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');

  async function derivar(senha, sal) {
    if (!crypto.subtle) throw new Error('Abra o site por localhost ou https para usar o login.');
    const enc = new TextEncoder();
    const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(sal), iterations: 150000 }, chave, 256);
    return hex(bits);
  }

  // hash antigo (sem sal aleatório); só serve para migrar contas criadas antes
  function hashAntigo(texto) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < texto.length; i++) {
      const c = texto.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }

  async function guardarSenha(usuario, senha) {
    usuario.sal = hex(crypto.getRandomValues(new Uint8Array(16)));
    usuario.senhaHash = await derivar(senha, usuario.sal);
  }

  function iniciarSessao(email, nome) {
    localStorage.setItem(CH_SESSAO, JSON.stringify({ email, nome }));
  }

  async function cadastrar(nome, email, senha) {
    email = normalizar(email);
    if (usuarios()[email]) return { ok: false, erro: 'Já existe uma conta com esse e-mail.' };
    const novo = { nome, perfilConfigurado: false };
    await guardarSenha(novo, senha);
    const todos = usuarios();
    todos[email] = novo;
    salvarUsuarios(todos);
    iniciarSessao(email, nome);
    return { ok: true };
  }

  async function entrar(email, senha) {
    email = normalizar(email);
    const todos = usuarios();
    const u = todos[email];
    const certa = u && (u.sal
      ? await derivar(senha, u.sal) === u.senhaHash
      : hashAntigo(email + senha) === u.senhaHash);
    if (!certa) return { ok: false, erro: 'E-mail ou senha incorretos.' };

    if (!u.sal) { await guardarSenha(u, senha); salvarUsuarios(todos); }
    iniciarSessao(email, u.nome);
    return { ok: true };
  }

  function sair() {
    localStorage.removeItem(CH_SESSAO);
    location.href = '../index.html';
  }

  const perfilConfigurado = () => !!(sessao() && usuarios()[sessao().email].perfilConfigurado);

  function marcarPerfilConfigurado() {
    const s = sessao();
    if (!s) return;
    const todos = usuarios();
    todos[s.email].perfilConfigurado = true;
    salvarUsuarios(todos);
  }

  // páginas internas: exige login, mostra o nome e liga o botão "Sair"
  function proteger() {
    const s = sessao();
    if (!s) { location.replace('login.html'); return; }
    const nome = String(s.nome || '');
    const campoNome = document.querySelector('.topo-saudacao strong');
    const avatar = document.querySelector('.avatar');
    if (campoNome) campoNome.textContent = nome;
    if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();
    document.addEventListener('click', e => {
      if (e.target.closest('[data-sair]')) { e.preventDefault(); sair(); }
    });
  }

  if (document.body && document.body.classList.contains('painel')) proteger();

  return { sessao, cadastrar, entrar, perfilConfigurado, marcarPerfilConfigurado };
})();
