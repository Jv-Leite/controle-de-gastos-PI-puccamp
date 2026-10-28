//contas fixas
(() => {
  'use strict';
  const { contasFixas, categorias, mesAtual, moeda, escapar, classeCategoria } = ContaAi;

  const lista = document.getElementById('lista-contas');
  const avisoVazio = document.getElementById('vazio-contas');
  const dialogo = document.getElementById('dialog-conta');
  const form = document.getElementById('form-conta');
  const campos = {
    id: document.getElementById('conta-id'),
    tipo: document.getElementById('conta-tipo'),
    nome: document.getElementById('conta-nome'),
    valor: document.getElementById('conta-valor'),
    dia: document.getElementById('conta-dia'),
    categoria: document.getElementById('conta-categoria')
  };

  //cor e icone de cada categoria
  const ICONES = {
    'cat-moradia': ['category-housing', 'fa-house'],
    'cat-alimentacao': ['category-services', 'fa-utensils'],
    'cat-saude': ['category-health', 'fa-heart-pulse'],
    'cat-transporte': ['category-lifestyle', 'fa-car'],
    'cat-lazer': ['category-lifestyle', 'fa-masks-theater'],
    'cat-compras': ['category-services', 'fa-bag-shopping'],
    'cat-salario': ['category-health', 'fa-money-bill-wave']
  };

  function item(c, mes) {
    const [corIcone, icone] = ICONES[classeCategoria(c.categoria)] || ['category-housing', 'fa-tag'];
    const ehReceita = c.tipo === 'receita';
    const paga = c.pagoMes === mes;
    const textoDia = ehReceita ? `Recebe todo dia ${c.dia}` : `Vence todo dia ${c.dia}`;
    const etiqueta = paga
      ? `<span class="etiqueta etiqueta-ok">${ehReceita ? 'recebida' : 'paga'}</span>` : '';
    const textoMarcar = paga ? 'Desmarcar' : (ehReceita ? 'Marcar como recebida' : 'Marcar como paga');

    return `
      <li class="account-item" data-id="${c.id}">
        <div class="account-info">
          <div class="account-icon ${corIcone}"><i class="fa-solid ${icone}"></i></div>
          <div class="account-details">
            <span class="account-name">${escapar(c.nome)} ${etiqueta}</span>
            <span class="account-category">${textoDia}</span>
          </div>
        </div>

        <div class="account-actions-wrapper">
          <span class="account-amount ${ehReceita ? 'text-success' : 'text-danger'}">${moeda(c.valor)}</span>

          <div class="hover-actions-dropdown">
            <button type="button" class="btn-more-actions" aria-label="Opções" aria-haspopup="true">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="dropdown-menu">
              <button type="button" class="dropdown-item" data-acao="pagar"><i class="fa-solid fa-check"></i> ${textoMarcar}</button>
              <button type="button" class="dropdown-item" data-acao="editar"><i class="fa-solid fa-pen-to-square"></i> Modificar</button>
              <button type="button" class="dropdown-item text-danger" data-acao="remover"><i class="fa-solid fa-trash"></i> Tirar</button>
            </div>
          </div>
        </div>
      </li>`;
  }

  function desenhar() {
    const mes = mesAtual();
    const todas = contasFixas.todos();
    lista.innerHTML = todas.map(c => item(c, mes)).join('');
    avisoVazio.hidden = todas.length > 0;

    //só despesas
    const despesas = todas.filter(c => c.tipo === 'despesa');
    const pagas = despesas.filter(c => c.pagoMes === mes);
    const pendentes = despesas.filter(c => c.pagoMes !== mes);
    const soma = lista => lista.reduce((s, c) => s + c.valor, 0);

    document.getElementById('total-contas').textContent = moeda(soma(despesas));
    document.getElementById('total-contas-sub').textContent =
      `${despesas.length} ${despesas.length === 1 ? 'despesa cadastrada' : 'despesas cadastradas'}`;
    document.getElementById('pagas-valor').textContent = moeda(soma(pagas));
    document.getElementById('pagas-sub').textContent =
      `${pagas.length} de ${despesas.length} concluídas`;
    document.getElementById('pendentes-valor').textContent = moeda(soma(pendentes));
    document.getElementById('pendentes-sub').textContent =
      `${pendentes.length} a vencer`;
  }

  /* ----- janela de cadastro ----- */

  function preencherCategorias(selecionada) {
    const opcoes = categorias.todos().filter(c => c.tipo === campos.tipo.value)
      .map(c => `<option value="${escapar(c.nome)}">${escapar(c.nome)}</option>`).join('');
    campos.categoria.innerHTML = '<option value="">Sem categoria</option>' + opcoes;
    campos.categoria.value = selecionada || '';
  }

  function abrir(conta) {
    form.reset();
    campos.id.value = conta ? conta.id : '';
    document.getElementById('dialog-conta-titulo').textContent =
      conta ? 'Modificar conta fixa' : 'Nova conta fixa';

    if (conta) {
      campos.tipo.value = conta.tipo;
      campos.nome.value = conta.nome;
      campos.valor.value = conta.valor;
      campos.dia.value = conta.dia;
    }
    preencherCategorias(conta ? conta.categoria : '');
    dialogo.showModal();
    campos.nome.focus();
  }

  document.getElementById('btn-nova-conta').addEventListener('click', () => abrir());
  document.getElementById('conta-cancelar').addEventListener('click', () => dialogo.close());
  campos.tipo.addEventListener('change', () => preencherCategorias(''));

  //clicar fora da caixa fecha a janela
  dialogo.addEventListener('click', e => { if (e.target === dialogo) dialogo.close(); });

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    const dados = {
      tipo: campos.tipo.value,
      nome: campos.nome.value.trim(),
      valor: parseFloat(campos.valor.value),
      dia: parseInt(campos.dia.value, 10),
      categoria: campos.categoria.value
    };
    if (!dados.nome || !(dados.valor > 0) || !(dados.dia >= 1 && dados.dia <= 31)) return;

    if (campos.id.value) {
      contasFixas.atualizar(campos.id.value, dados);
    } else {
      contasFixas.adicionar({ ...dados, pagoMes: null });
    }
    dialogo.close();
    desenhar();
  });

  /*ações da lista*/

  lista.addEventListener('click', evento => {
    //menu de tres pontinhos
    const ponto = evento.target.closest('.btn-more-actions');
    if (ponto) {
      const caixa = ponto.parentElement;
      const estavaAberto = caixa.classList.contains('aberto');
      fecharMenus();
      if (!estavaAberto) caixa.classList.add('aberto');
      return;
    }

    const botao = evento.target.closest('[data-acao]');
    if (!botao) return;
    const id = botao.closest('.account-item').dataset.id;
    const conta = contasFixas.buscar(id);
    fecharMenus();

    if (botao.dataset.acao === 'pagar') {
      contasFixas.atualizar(id, { pagoMes: conta.pagoMes === mesAtual() ? null : mesAtual() });
    } else if (botao.dataset.acao === 'editar') {
      abrir(conta);
      return;
    } else if (botao.dataset.acao === 'remover') {
      if (!confirm(`Tirar "${conta.nome}" das contas fixas?`)) return;
      contasFixas.remover(id);
    }
    desenhar();
  });

  function fecharMenus() {
    lista.querySelectorAll('.hover-actions-dropdown.aberto')
      .forEach(m => m.classList.remove('aberto'));
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('.hover-actions-dropdown')) fecharMenus();
  });

  desenhar();
})();
