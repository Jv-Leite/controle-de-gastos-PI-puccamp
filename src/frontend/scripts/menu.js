/* ==========================================================================
   MENU.JS — Abre e fecha o menu lateral no celular (arquivo COMPARTILHADO)
   --------------------------------------------------------------------------
   O botão ☰ coloca/tira a classe "menu-aberto" do <nav>.
   Quem faz a gaveta deslizar é o CSS (styles/painel.css).
   ========================================================================== */

const botaoMenu = document.querySelector(".botao-menu");
const menu = document.querySelector("#menu-principal");

if (botaoMenu && menu) {
  botaoMenu.addEventListener("click", function () {
    const estaAberto = menu.classList.toggle("menu-aberto");

    // aria-expanded avisa o leitor de tela se o menu está aberto ou fechado
    botaoMenu.setAttribute("aria-expanded", estaAberto);
  });

  // A tecla Esc também fecha o menu
  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && menu.classList.contains("menu-aberto")) {
      menu.classList.remove("menu-aberto");
      botaoMenu.setAttribute("aria-expanded", "false");
      botaoMenu.focus();
    }
  });
}
