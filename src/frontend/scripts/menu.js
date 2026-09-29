
const botaoMenu = document.querySelector(".botao-menu");
const menu = document.querySelector("#menu-principal");

if (botaoMenu && menu) {
  botaoMenu.addEventListener("click", function () {
    const estaAberto = menu.classList.toggle("menu-aberto");

    botaoMenu.setAttribute("aria-expanded", estaAberto);
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && menu.classList.contains("menu-aberto")) {
      menu.classList.remove("menu-aberto");
      botaoMenu.setAttribute("aria-expanded", "false");
      botaoMenu.focus();
    }
  });
}
