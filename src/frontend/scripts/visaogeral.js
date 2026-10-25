// Visão geral: saudação, modal de configuração do perfil e saldo

function formatarReais(valor) {
  return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function mostrarSaldo(renda) {
  const saldo = document.getElementById('saldo-previsto');
  if (saldo && renda) {
    saldo.textContent = formatarReais(renda);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // ----- Saudação -----
  const nomeUsuario = localStorage.getItem('usuarioLogado');
  const elementoNome = document.querySelector('.topo-saudacao strong');
  const elementoAvatar = document.querySelector('.avatar');

  if (nomeUsuario) {
    if (elementoNome) elementoNome.textContent = nomeUsuario;
    if (elementoAvatar) elementoAvatar.textContent = nomeUsuario.charAt(0).toUpperCase();
  }

  // ----- Modal de configuração do perfil -----
  const modal = document.getElementById('modal-perfil');
  const formulario = document.getElementById('form-perfil');

  // Abre o modal enquanto o perfil não estiver configurado
  if (localStorage.getItem('perfilConfigurado') === 'false' && modal) {
    modal.classList.add('active');
  }

  // Se já configurou antes, mostra o saldo salvo
  const salvos = localStorage.getItem('dadosFinanceiros');
  if (salvos) {
    try {
      mostrarSaldo(JSON.parse(salvos).renda.valor);
    } catch (erro) {
      console.warn('Dados financeiros inválidos no localStorage.', erro);
    }
  }

  if (!formulario) return;

  formulario.addEventListener('submit', (e) => {
    e.preventDefault();

    const renda = document.getElementById('renda').value;
    const diaRecebimento = document.getElementById('dia-recebimento').value;
    const contaNome = document.getElementById('conta-nome').value.trim();
    const contaValor = document.getElementById('conta-valor').value;
    const contaVencimento = document.getElementById('conta-vencimento').value;

    localStorage.setItem('dadosFinanceiros', JSON.stringify({
      renda: { valor: renda, dia: diaRecebimento },
      contaFixa: { nome: contaNome, valor: contaValor, vencimento: contaVencimento }
    }));

    localStorage.setItem('perfilConfigurado', 'true');

    modal.classList.remove('active');
    mostrarSaldo(renda);
  });
});
