/* menu.js: abre e fecha o menu lateral no celular (botão "hambúrguer"). */
(() => {
  const botaoMenu = document.querySelector('.botao-menu');
  const menu = document.querySelector('#menu-principal');
  if (!botaoMenu || !menu) return; // página sem menu

  // devolverFoco: volta o foco para o botão (para quem usa teclado)
  function fechar(devolverFoco) {
    menu.classList.remove('menu-aberto');
    botaoMenu.setAttribute('aria-expanded', 'false'); // avisa leitores de tela
    if (devolverFoco) botaoMenu.focus();
  }

  // botão alterna aberto/fechado
  botaoMenu.addEventListener('click', () => {
    const aberto = menu.classList.toggle('menu-aberto');
    botaoMenu.setAttribute('aria-expanded', aberto);
  });

  // Esc fecha
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('menu-aberto')) fechar(true);
  });

  // clique fora do menu fecha
  document.addEventListener('click', e => {
    if (menu.classList.contains('menu-aberto') &&
        !menu.contains(e.target) && !botaoMenu.contains(e.target)) fechar(false);
  });
})();
