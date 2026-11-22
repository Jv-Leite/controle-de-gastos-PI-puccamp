//login google-------------------------------------------------------------------------

const CLIENT_ID = "40556338154-6nu0sdn7epkkfem0gk803khfhgua2o69.apps.googleusercontent.com";
let clienteGoogle;

window.addEventListener("load", () => {
  if (!window.google) return;

  clienteGoogle = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "email profile",
    callback: async (resposta) => {
      if (!resposta.access_token) return;
      try {
        const req = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${resposta.access_token}` }
        });
        const u = await req.json();
        const nome = u.given_name || u.name || u.email.split("@")[0];
        Auth.entrarComGoogle(u.email, nome);
        window.location.href = "visaogeral.html";
      } catch (erro) {
        alert("Não foi possível entrar com o Google. Tente novamente.");
      }
    }
  });
});

document.getElementById("btn-google").addEventListener("click", () => {
  if (!clienteGoogle) {
    alert("O login com Google ainda não carregou. Tente novamente em instantes.");
    return;
  }
  clienteGoogle.requestAccessToken();
});

//modal----------------------------------------

function configurarModal(modal, botaoAbrir, botaoFechar) {
  const abrir = () => {
    modal.classList.add("active");
    const primeiro = modal.querySelector("input");
    if (primeiro) primeiro.focus();
  };
  const fechar = () => modal.classList.remove("active");

  botaoAbrir.addEventListener("click", abrir);
  botaoFechar.addEventListener("click", fechar);
  //clique no fundo
  modal.addEventListener("click", e => { if (e.target === modal) fechar(); }); 
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("active")) fechar();
  });
  return { abrir, fechar };
}

const modalCadastro = document.getElementById("modal-cadastro");
const modalLogin = document.getElementById("modal-login");

configurarModal(modalCadastro, document.getElementById("cadastrar-email"), document.getElementById("btn-fechar"));
const loginModal = configurarModal(modalLogin, document.getElementById("entrar"), document.getElementById("btn-fechar-login"));

//erros dos inputs---------------------------------------------------------------------

function mostrarErro(input, idSpanErro, mensagem) {
  input.closest(".input-box").classList.add("invalido");
  document.getElementById(idSpanErro).innerText = mensagem;
}

function limparErro(input, idSpanErro) {
  input.closest(".input-box").classList.remove("invalido");
  document.getElementById(idSpanErro).innerText = "";
}

//erro sumir quando digita

[["nome", "erro-nome"], ["email", "erro-email"], ["senha", "erro-senha"],
 ["login-email", "erro-login-email"], ["login-senha", "erro-login-senha"]]
  .forEach(([id, erro]) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => limparErro(input, erro));
  });

const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//cadastro-----------------------------------------------------------------------------

document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  let temErro = false;

  const inputNome = document.getElementById("nome");
  const inputEmail = document.getElementById("email");
  const inputSenha = document.getElementById("senha");

  const nome = inputNome.value.trim();
  const email = inputEmail.value.trim();
  const senha = inputSenha.value;

  if (nome.length < 2 || nome.length > 20) {
    mostrarErro(inputNome, "erro-nome", "O nome deve ter entre 2 e 20 caracteres.");
    temErro = true;
  } else limparErro(inputNome, "erro-nome");

  if (!regexEmail.test(email)) {
    mostrarErro(inputEmail, "erro-email", "Digite um e-mail válido (ex: nome@email.com).");
    temErro = true;
  } else limparErro(inputEmail, "erro-email");

  if (senha.length < 6) {
    mostrarErro(inputSenha, "erro-senha", "A senha deve ter no mínimo 6 caracteres.");
    temErro = true;
  } else limparErro(inputSenha, "erro-senha");

  if (temErro) return;

  const resultado = await Auth.cadastrar(nome, email, senha);
  if (!resultado.ok) {
    mostrarErro(inputEmail, "erro-email", resultado.erro);
    return;
  }
  window.location.href = "visaogeral.html";
});

//login--------------------------------------------------------------------------------

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  let temErro = false;

  const inputEmail = document.getElementById("login-email");
  const inputSenha = document.getElementById("login-senha");

  if (!regexEmail.test(inputEmail.value.trim())) {
    mostrarErro(inputEmail, "erro-login-email", "Digite um e-mail válido.");
    temErro = true;
  } else limparErro(inputEmail, "erro-login-email");

  if (inputSenha.value.length < 6) {
    mostrarErro(inputSenha, "erro-login-senha", "A senha deve ter pelo menos 6 caracteres.");
    temErro = true;
  } else limparErro(inputSenha, "erro-login-senha");

  if (temErro) return;

  const resultado = await Auth.entrar(inputEmail.value, inputSenha.value);
  if (!resultado.ok) {
    mostrarErro(inputSenha, "erro-login-senha", resultado.erro);
    return;
  }
  window.location.href = "visaogeral.html";
});
