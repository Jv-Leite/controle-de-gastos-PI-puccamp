window.addEventListener('DOMContentLoaded', () => {
  const nomeUsuario = localStorage.getItem('usuarioLogado');

  const elementoNome = document.querySelector('.topo-saudacao strong');
  const elementoAvatar = document.querySelector('.avatar');

  if (nomeUsuario) {
    if (elementoNome) {
      elementoNome.textContent = nomeUsuario;
    }
  }
});



/*parte nova*/

window.addEventListener('DOMContentLoaded', () => {
  const modalOnboarding = document.getElementById('modal');
  const formSetup = document.getElementById('form-modal');

  const perfilConfigurado = localStorage.getItem('perfilConfigurado');

  if (perfilConfigurado === 'false' && modalOnboarding) {
    modalOnboarding.classList.add('active');
  }

  if (formSetup) {
    formSetup.addEventListener('submit', (e) => {
      e.preventDefault();

      const rendaValor = document.getElementById('renda-valor').value;
      const rendaDia = document.getElementById('renda-dia').value;
      const contaNome = document.getElementById('conta1-nome').value;
      const contaValor = document.getElementById('conta1-valor').value;
      const contaVencimento = document.getElementById('conta1-vencimento').value;

      localStorage.setItem('dadosFinanceiros', JSON.stringify({
        renda: { valor: rendaValor, dia: rendaDia },
        contaFixa: { nome: contaNome, valor: contaValor, vencimento: contaVencimento }
      }));

      localStorage.setItem('perfilConfigurado', 'true');

      modalOnboarding.classList.remove('active');

      const cardSaldo = document.querySelector('.card-saldo h2');
      if (cardSaldo && rendaValor) {
        cardSaldo.textContent = `R$ ${parseFloat(rendaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
    });
  }
});