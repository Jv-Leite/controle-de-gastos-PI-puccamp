/* auth.js: cadastro, login e sessão.
   Sem servidor: os perfis ficam no localStorage do navegador.
     ca_usuarios -> { "email": { nome, sal, senhaHash, perfilConfigurado } }
     ca_sessao   -> { email, nome } de quem está logado
   O código fica dentro de (() => { ... })() para as variáveis não vazarem;
   só o que está no "return" fica acessível, como Auth.algumaCoisa. */
const Auth = (() => {
  'use strict'; // acusa erros que passariam em silêncio

  const CH_USUARIOS = 'ca_usuarios';
  const CH_SESSAO = 'ca_sessao';

  /* --- localStorage --- */

  // lê uma chave como objeto; se não existir ou estiver estragada, devolve "padrao"
  function ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
    catch { return padrao; }
  }
  const usuarios = () => ler(CH_USUARIOS, {});
  const salvarUsuarios = u => localStorage.setItem(CH_USUARIOS, JSON.stringify(u));
  const normalizar = email => String(email).trim().toLowerCase(); // " Ana@X.com" -> "ana@x.com"

  // sessão atual ou null. Só vale se o usuário existir (evita sessão forjada)
  function sessao() {
    const s = ler(CH_SESSAO, null);
    return s && typeof s.email === 'string' && usuarios()[s.email] ? s : null;
  }

  /* --- senha (nunca é salva em texto, só o hash) --- */

  // bytes -> texto hexadecimal
  const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');

  // hash PBKDF2 da senha. O "sal" é aleatório por usuário e as 150 mil
  // repetições deixam cada tentativa lenta, o que dificulta adivinhar a senha.
  async function derivar(senha, sal) {
    // crypto.subtle só existe em file://, localhost ou https
    if (!crypto.subtle) throw new Error('Abra o site por localhost ou https para usar o login.');
    const enc = new TextEncoder();
    const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(sal), iterations: 150000 }, chave, 256);
    return hex(bits);
  }

  // hash antigo (fraco). Só serve para contas antigas entrarem e serem convertidas
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

  // sorteia um sal novo e grava o hash da senha no perfil
  async function guardarSenha(usuario, senha) {
    usuario.sal = hex(crypto.getRandomValues(new Uint8Array(16)));
    usuario.senhaHash = await derivar(senha, usuario.sal);
  }

  function iniciarSessao(email, nome) {
    localStorage.setItem(CH_SESSAO, JSON.stringify({ email, nome }));
  }

  /* --- cadastro, login e saída --- */

  // cria o perfil e já loga. Devolve { ok } ou { ok: false, erro }
  async function cadastrar(nome, email, senha) {
    email = normalizar(email);
    if (usuarios()[email]) return { ok: false, erro: 'Já existe uma conta com esse e-mail.' };
    const novo = { nome, perfilConfigurado: false };
    await guardarSenha(novo, senha);
    const todos = usuarios(); // relê depois do await para não perder alterações
    todos[email] = novo;
    salvarUsuarios(todos);
    iniciarSessao(email, nome);
    return { ok: true };
  }

  // senha certa = o hash da senha digitada é igual ao hash salvo
  async function entrar(email, senha) {
    email = normalizar(email);
    const todos = usuarios();
    const u = todos[email];
    const certa = u && (u.sal
      ? await derivar(senha, u.sal) === u.senhaHash   // conta nova
      : hashAntigo(email + senha) === u.senhaHash);   // conta antiga
    // mesma mensagem nos dois casos, para não revelar quais e-mails existem
    if (!certa) return { ok: false, erro: 'E-mail ou senha incorretos.' };

    if (!u.sal) { await guardarSenha(u, senha); salvarUsuarios(todos); } // converte conta antiga
    iniciarSessao(email, u.nome);
    return { ok: true };
  }

  function sair() {
    localStorage.removeItem(CH_SESSAO);
    location.href = '../index.html';
  }

  /* --- configuração inicial (janela da Visão Geral) --- */

  // já preencheu renda e contas no primeiro acesso?
  const perfilConfigurado = () => !!(sessao() && usuarios()[sessao().email].perfilConfigurado);

  function marcarPerfilConfigurado() {
    const s = sessao();
    if (!s) return;
    const todos = usuarios();
    todos[s.email].perfilConfigurado = true;
    salvarUsuarios(todos);
  }

  /* --- proteção das páginas internas --- */

  // sem login vai para login.html; com login mostra o nome e liga o "Sair"
  function proteger() {
    const s = sessao();
    if (!s) { location.replace('login.html'); return; }
    const nome = String(s.nome || '');
    const campoNome = document.querySelector('.topo-saudacao strong');
    const avatar = document.querySelector('.avatar');
    if (campoNome) campoNome.textContent = nome; // textContent: o nome entra como texto puro
    if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();
    // qualquer elemento com data-sair faz logout
    document.addEventListener('click', e => {
      if (e.target.closest('[data-sair]')) { e.preventDefault(); sair(); }
    });
  }

  // roda sozinho nas páginas com <body class="painel">
  if (document.body && document.body.classList.contains('painel')) proteger();

  return { sessao, cadastrar, entrar, perfilConfigurado, marcarPerfilConfigurado };
})();
