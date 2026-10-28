console.log('olá, Mundo!');




//login google--------------------------------------------------------------------------------------------------------

const CLIENT_ID = "40556338154-6nu0sdn7epkkfem0gk803khfhgua2o69.apps.googleusercontent.com";
let clienteGoogle;

window.addEventListener("load", () => {
  clienteGoogle = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "email profile",
    callback: async (resposta) => {
      if (resposta.access_token) {
        const req = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${resposta.access_token}` }
        });
        const usuario = await req.json();

        console.log("Dados recebidos do Google:", usuario);

        localStorage.setItem("usuarioLogado", usuario.given_name);

        // primeiro logon com google tmb configura as coisas
        if (!localStorage.getItem("perfilConfigurado")) {
          localStorage.setItem("perfilConfigurado", "false");
        }

        window.location.href = "visaogeral.html";
      }
    }
  });
});

const botaoGoogle = document.getElementById("btn-google");

botaoGoogle.addEventListener("click", () => {
  clienteGoogle.requestAccessToken();
});








//cadastro com e-mail-------------------------------------------------------------------------------------------------

  const btnCadastrar = document.getElementById('cadastrar-email');
  const btnFechar = document.getElementById('btn-fechar');
  const modal = document.getElementById('modal-cadastro');


  btnCadastrar.addEventListener('click', () => {
  modal.classList.add('active');
  });


  btnFechar.addEventListener('click', () => {
  modal.classList.remove('active');
  });





//já tenho conta----------------------------------------------------------------------------------------------------



    
  const btnLogin = document.getElementById('entrar');
  const btnFecharLogin = document.getElementById('btn-fechar-login');
  const modalLogin = document.getElementById('modal-login');

  btnLogin.addEventListener('click', () => {
  modalLogin.classList.add('active');
  });




  btnFecharLogin.addEventListener('click', () => {
    modalLogin.classList.remove('active');
  });







// checagem dos inputs

  function mostrarErro(input, idSpanErro, mensagem) {
    const inputBox=input.closest('.input-box');
    const spanErro=document.getElementById(idSpanErro);
    
    inputBox.classList.add('invalido');
    spanErro.innerText = mensagem;
  }

  function limparErro(input, idSpanErro) {
    const inputBox = input.closest('.input-box');
    const spanErro = document.getElementById(idSpanErro);
    
    inputBox.classList.remove('invalido');
    spanErro.innerText = '';
  }




  //validação do cadastro

  const formCadastro = document.getElementById('form-cadastro');

  if (formCadastro) {
    formCadastro.addEventListener('submit', (e) => {
      e.preventDefault();
      let temErro = false;

      const inputNome = document.getElementById('nome');
      const inputEmail = document.getElementById('email');
      const inputSenha = document.getElementById('senha');

      const nome = inputNome.value.trim();
      const email = inputEmail.value.trim();
      const senha = inputSenha.value;

      //nome (2 a 20 caracteres)
      if (nome.length < 2 || nome.length > 20) {
        mostrarErro(inputNome, 'erro-nome', 'O nome deve ter entre 2 e 20 caracteres.');
        temErro = true;
      } else {
        limparErro(inputNome, 'erro-nome');
      }

      //email
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regexEmail.test(email)) {
        mostrarErro(inputEmail, 'erro-email', 'Digite um e-mail válido (ex: nome@email.com).');
        temErro = true;
      } else {
        limparErro(inputEmail, 'erro-email');
      }

      //senha (minimo 6 caracteres)
      if (senha.length < 6) {
        mostrarErro(inputSenha, 'erro-senha', 'A senha deve ter no mínimo 6 caracteres.');
        temErro = true;
      } else {
        limparErro(inputSenha, 'erro-senha');
      }

        if (!temErro) {
        localStorage.setItem('usuarioLogado', nome);
        localStorage.setItem('perfilConfigurado', 'false');

        window.location.href = 'visaogeral.html';
      }
    
    //-//-//-//-//-//-//-//-//-//

    });
  }




  //validação do Login
  const formLogin = document.getElementById('form-login');

  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      let temErro = false;

      const inputEmailLogin = document.getElementById('login-email');
      const inputSenhaLogin = document.getElementById('login-senha');

      const email = inputEmailLogin.value.trim();
      const senha = inputSenhaLogin.value;

      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regexEmail.test(email)) {
        mostrarErro(inputEmailLogin, 'erro-login-email', 'Digite um e-mail válido.');
        temErro = true;
      } else {
        limparErro(inputEmailLogin, 'erro-login-email');
      }

      if (senha.length < 6) {
        mostrarErro(inputSenhaLogin, 'erro-login-senha', 'A senha deve ter pelo menos 6 caracteres.');
        temErro = true;
      } else {
        limparErro(inputSenhaLogin, 'erro-login-senha');
      }

      if (!temErro) {
        console.log('Login efetuado com sucesso!');
        modalLogin.classList.remove('active');
        formLogin.reset();
      }
      if (!temErro) {

      //o início do email se n tiver nome salvo
      if (!localStorage.getItem('usuarioLogado')) {
        const nomeDoEmail = email.split('@')[0];
        localStorage.setItem('usuarioLogado', nomeDoEmail);
      }

      // primeiro acesso neste navegador: abre a configuração do perfil
      if (!localStorage.getItem('perfilConfigurado')) {
        localStorage.setItem('perfilConfigurado', 'false');
      }

      window.location.href = 'visaogeral.html';
    }
    });

  } 


