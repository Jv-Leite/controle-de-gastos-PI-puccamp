//auth.js: login com localStorage

const Auth = (() => {
  'use strict';

  const CH_USUARIOS = 'auth_usuarios';
  const CH_SESSAO = 'auth_sessao';
  const chaveDados = email => 'auth_dados_' + email;

  const ler = (chave, padrao) => {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
    catch { return padrao; }
  };
  const usuarios = () => ler(CH_USUARIOS, {});
  const salvarUsuarios = u => localStorage.setItem(CH_USUARIOS, JSON.stringify(u));
  const normalizar = email => String(email).trim().toLowerCase();
  const sessao = () => ler(CH_SESSAO, null);

  //chaves do app que pertencem ao usuario logado (dados.js usa o prefixo ca)
  const chavesDoApp = () => Object.keys(localStorage)
    .filter(k => k.startsWith('ca_') || k === 'dadosFinanceiros');

  //guarda os dados do app de quem está logado
  function salvarDados() {
    const s = sessao();
    if (!s) return;
    const copia = {};
    chavesDoApp().forEach(k => { copia[k] = localStorage.getItem(k); });
    localStorage.setItem(chaveDados(s.email), JSON.stringify(copia));
  }

  //limpa o app e carrega só os dados desse usuário
  function carregarDados(email) {
    chavesDoApp().forEach(k => localStorage.removeItem(k));
    Object.entries(ler(chaveDados(email), {}))
      .forEach(([k, v]) => localStorage.setItem(k, v));
  }

  async function hashSenha(texto) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    //hash basico
    let h = 5381;
    for (const c of texto) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return 'x' + h.toString(16);
  }

  function iniciarSessao(email, nome) {
    salvarDados(); //protege os dados de quem estava logado antes
    carregarDados(email); // traz os dados de quem está entrando
    localStorage.setItem(CH_SESSAO, JSON.stringify({ email, nome }));
    //outros scripts do projeto podem ler essas chaves antigas
    localStorage.setItem('usuarioLogado', nome);
    const u = usuarios()[email];
    localStorage.setItem('perfilConfigurado', u && u.perfilConfigurado ? 'true' : 'false');
  }

  async function cadastrar(nome, email, senha) {
    email = normalizar(email);
    const todos = usuarios();
    if (todos[email]) return { ok: false, campo: 'email', erro: 'Já existe uma conta com esse e-mail.' };
    todos[email] = { nome, senhaHash: await hashSenha(senha), perfilConfigurado: false };
    salvarUsuarios(todos);
    iniciarSessao(email, nome);
    return { ok: true };
  }

  async function entrar(email, senha) {
    email = normalizar(email);
    const u = usuarios()[email];
    if (u && !u.senhaHash) {
      return { ok: false, erro: 'Esta conta usa o login com Google.' };
    }
    if (!u || u.senhaHash !== await hashSenha(senha)) {
      return { ok: false, erro: 'E-mail ou senha incorretos.' };
    }
    iniciarSessao(email, u.nome);
    return { ok: true };
  }

  function entrarComGoogle(email, nome) {
    email = normalizar(email);
    const todos = usuarios();
    if (!todos[email]) {
      todos[email] = { nome, senhaHash: null, perfilConfigurado: false };
      salvarUsuarios(todos);
    }
    iniciarSessao(email, todos[email].nome);
  }

  function sair() {
    salvarDados();
    localStorage.removeItem(CH_SESSAO);
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('perfilConfigurado');
    chavesDoApp().forEach(k => localStorage.removeItem(k));
    location.href = '../index.html';
  }

  //perfil configurado por usuário
  function perfilConfigurado() {
    const s = sessao();
    return !!(s && usuarios()[s.email] && usuarios()[s.email].perfilConfigurado);
  }
  function marcarPerfilConfigurado() {
    const s = sessao();
    const todos = usuarios();
    if (s && todos[s.email]) {
      todos[s.email].perfilConfigurado = true;
      salvarUsuarios(todos);
      localStorage.setItem('perfilConfigurado', 'true');
    }
  }

  //exige login mostra o nome e botão sair
  function proteger() {
    const s = sessao();
    if (!s) { location.replace('login.html'); return; }
    const nome = document.querySelector('.topo-saudacao strong');
    const avatar = document.querySelector('.avatar');
    if (nome) nome.textContent = s.nome;
    if (avatar) avatar.textContent = s.nome.charAt(0).toUpperCase();
    document.addEventListener('click', e => {
      if (e.target.closest('.menu-rodape a')) { e.preventDefault(); sair(); }
    });
  }

  if (document.body && document.body.classList.contains('painel')) proteger();

  return { sessao, cadastrar, entrar, entrarComGoogle, sair,
           perfilConfigurado, marcarPerfilConfigurado };
})();
