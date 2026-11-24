// menu lateral no celular
(() => {
  const botaoMenu = document.querySelector('.botao-menu');
  const menu = document.querySelector('#menu-principal');
  if (!botaoMenu || !menu) return;

  function fechar(devolverFoco) {
    menu.classList.remove('menu-aberto');
    botaoMenu.setAttribute('aria-expanded', 'false');
    if (devolverFoco) botaoMenu.focus();
  }

  botaoMenu.addEventListener('click', () => {
    const aberto = menu.classList.toggle('menu-aberto');
    botaoMenu.setAttribute('aria-expanded', aberto);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('menu-aberto')) fechar(true);
  });

  // clicar fora fecha o menu
  document.addEventListener('click', e => {
    if (menu.classList.contains('menu-aberto') &&
        !menu.contains(e.target) && !botaoMenu.contains(e.target)) fechar(false);
  });
})();
