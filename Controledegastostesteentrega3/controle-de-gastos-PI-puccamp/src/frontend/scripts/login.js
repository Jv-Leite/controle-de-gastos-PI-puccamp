// login e cadastro do perfil local
(() => {
  'use strict';

  // quem já está logado vai direto para o painel
  if (Auth.sessao()) {
    location.replace('visaogeral.html');
    return;
  }

  const $ = id => document.getElementById(id);

  /* modais */

  function configurarModal(modal, botaoAbrir, botaoFechar) {
    const abrir = () => {
      modal.classList.add('active');
      modal.querySelector('input').focus();
    };
    const fechar = () => modal.classList.remove('active');

    botaoAbrir.addEventListener('click', abrir);
    botaoFechar.addEventListener('click', fechar);
    modal.addEventListener('click', e => { if (e.target === modal) fechar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
    return { abrir, fechar };
  }

  const cadastro = configurarModal($('modal-cadastro'), $('cadastrar-email'), $('btn-fechar'));
  const login = configurarModal($('modal-login'), $('entrar'), $('btn-fechar-login'));

  $('ir-login').addEventListener('click', () => { cadastro.fechar(); login.abrir(); });
  $('ir-cadastro').addEventListener('click', () => { login.fechar(); cadastro.abrir(); });

  // login.html?cadastro abre direto o cadastro (botão "Criar meu perfil" da tela inicial)
  const params = new URLSearchParams(location.search);
  if (params.has('cadastro')) cadastro.abrir();
  else if (params.has('entrar')) login.abrir();

  /* erros dos campos: cada input tem um <span id="erro-ID_DO_INPUT"> */

  function erro(input, mensagem = '') {
    input.closest('.input-box').classList.toggle('invalido', !!mensagem);
    $(`erro-${input.id}`).textContent = mensagem;
  }

  // valida todos os campos e devolve true se nenhum tiver erro
  const validar = regras => regras
    .map(([input, ok, mensagem]) => { erro(input, ok ? '' : mensagem); return ok; })
    .every(Boolean);

  document.querySelectorAll('.input-box input').forEach(input =>
    input.addEventListener('input', () => erro(input)));

  const emailValido = texto => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());

  // trava o botão enquanto a senha é processada
  function enviar(form, acao) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const botao = form.querySelector('[type="submit"]');
      botao.disabled = true;
      try {
        if (await acao()) location.href = 'visaogeral.html';
      } catch (falha) {
        alert(falha.message);
      } finally {
        botao.disabled = false;
      }
    });
  }

  /* cadastro */

  enviar($('form-cadastro'), async () => {
    const [nome, email, senha] = [$('nome'), $('email'), $('senha')];
    const texto = nome.value.trim();
    if (!validar([
      [nome, texto.length >= 2 && texto.length <= 20, 'O nome deve ter entre 2 e 20 caracteres.'],
      [email, emailValido(email.value), 'Digite um e-mail válido (ex: nome@email.com).'],
      [senha, senha.value.length >= 6, 'A senha deve ter no mínimo 6 caracteres.']
    ])) return false;

    const r = await Auth.cadastrar(texto, email.value, senha.value);
    if (!r.ok) erro(email, r.erro);
    return r.ok;
  });

  /* login */

  enviar($('form-login'), async () => {
    const [email, senha] = [$('login-email'), $('login-senha')];
    if (!validar([
      [email, emailValido(email.value), 'Digite um e-mail válido.'],
      [senha, senha.value.length >= 6, 'A senha deve ter pelo menos 6 caracteres.']
    ])) return false;

    const r = await Auth.entrar(email.value, senha.value);
    if (!r.ok) erro(senha, r.erro);
    return r.ok;
  });
})();
