/* inicio.js: página inicial (index.html).
   Se a pessoa já está logada, os botões levam direto ao painel. */
(() => {
  'use strict';
  if (!Auth.sessao()) return; // ninguém logado: botões ficam como estão

  const entrar = document.getElementById('btn-entrar');
  const criar = document.getElementById('btn-criar');
  entrar.textContent = 'Meu painel';
  criar.textContent = 'Ir para o meu painel';
  entrar.href = criar.href = 'pages/visaogeral.html';
})();
