// ui.js: peças de interface reaproveitadas pelas telas internas
const UI = (() => {
  'use strict';
  const { escapar, corValida, corDaCategoria, moeda, mesAtual, estadoDe, diasAte, porcentagem } = ContaAi;

  // aviso rápido no rodapé da tela
  let toast, timer;
  function avisar(texto) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = texto;
    toast.classList.add('visivel');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('visivel'), 2500);
  }

  // janela de confirmação (substitui o confirm do navegador)
  function confirmar(texto, rotuloOk = 'Excluir') {
    return new Promise(resolver => {
      const janela = document.createElement('dialog');
      janela.className = 'janela';
      janela.innerHTML = `
        <form method="dialog">
          <h2>Tem certeza?</h2>
          <p class="janela-texto">${escapar(texto)}</p>
          <div class="form-acoes">
            <button class="btn-secundario" value="nao">Cancelar</button>
            <button class="btn-primario" value="sim">${escapar(rotuloOk)}</button>
          </div>
        </form>`;
      document.body.appendChild(janela);
      janela.addEventListener('close', () => {
        resolver(janela.returnValue === 'sim');
        janela.remove();
      });
      janela.showModal();
    });
  }

  // qualquer dialog fecha ao clicar fora da caixa ou num botão [data-fechar]
  document.addEventListener('click', e => {
    if (e.target.tagName === 'DIALOG' && e.target.open) e.target.close();
    const fechar = e.target.closest('dialog [data-fechar]');
    if (fechar) fechar.closest('dialog').close();
  });

  // cliques nos botões [data-acao] de uma lista; o item clicado tem data-id
  function acoes(lista, tratar) {
    lista.addEventListener('click', e => {
      const botao = e.target.closest('button[data-acao]');
      const item = botao && botao.closest('[data-id]');
      if (item) tratar(botao.dataset.acao, item.dataset.id, botao);
    });
  }

  // seletor de mês do topo: começa no mês atual e redesenha a tela ao mudar
  function periodo(aoMudar) {
    const campo = document.getElementById('periodo');
    campo.value = mesAtual();
    campo.addEventListener('change', aoMudar);
    document.getElementById('form-periodo').addEventListener('submit', e => e.preventDefault());
    return () => campo.value || mesAtual();
  }

  // mostra (ou esconde, sem texto) uma mensagem de erro de formulário
  function erro(el, texto) {
    el.textContent = texto || '';
    el.hidden = !texto;
  }

  const marcador = cor => `<span class="bolinha" style="--cor-cat:${corValida(cor)}"></span>`;

  const rotuloCategoria = (nome, cor = corDaCategoria(nome)) =>
    `<span class="cat">${marcador(cor)}${escapar(nome || 'Sem categoria')}</span>`;

  // medidor de gasto x limite (amarelo a partir de 80%, vermelho ao passar)
  const medidor = (gasto, limite) => {
    const [g, l] = [Number(gasto), Number(limite)];
    return `<meter min="0" max="${l}" low="${l * 0.8}" high="${l - 0.01}" optimum="0" value="${g}">${porcentagem(g, l)}% do limite</meter>`;
  };

  function opcoesCategorias(tipo, selecionada, comVazio) {
    const opcoes = ContaAi.categorias.doTipo(tipo)
      .map(c => `<option value="${escapar(c.nome)}"${c.nome === selecionada ? ' selected' : ''}>${escapar(c.nome)}</option>`)
      .join('');
    const vazio = comVazio
      ? `<option value="">${escapar(comVazio)}</option>`
      : '<option value="" disabled selected>Escolha uma categoria</option>';
    return vazio + opcoes;
  }

  const SELOS = {
    pago: ['selo-pago', 'pago'],
    proximo: ['selo-proximo', 'vence em breve'],
    atrasado: ['selo-atrasado', 'atrasado'],
    pendente: ['selo-pendente', 'pendente']
  };

  function selo(mov) {
    const estado = estadoDe(mov);
    let [classe, texto] = SELOS[estado];
    if (mov.tipo === 'receita') texto = estado === 'pago' ? 'recebido' : 'a receber';
    if (estado === 'proximo') {
      const dias = diasAte(mov.data);
      texto = dias === 0 ? 'vence hoje' : `vence em ${ContaAi.plural(dias, 'dia')}`;
    }
    return `<span class="selo ${classe}">${texto}</span>`;
  }

  // valor com sinal e cor padronizada
  function valorComSinal(valor, tipo) {
    const receita = tipo === 'receita';
    return `<span class="valor ${receita ? 'valor-positivo' : 'valor-negativo'}">${receita ? '+' : '−'} ${moeda(valor)}</span>`;
  }

  function classeSaldo(valor) {
    if (Math.abs(valor) < 0.005) return '';
    return valor < 0 ? 'valor-negativo' : 'valor-positivo';
  }

  // escreve o valor com a cor do saldo (verde, vermelho ou neutro)
  function mostrarSaldo(el, valor, classeBase) {
    el.textContent = moeda(valor);
    el.className = `${classeBase} ${classeSaldo(valor)}`;
  }

  return {
    avisar, confirmar, acoes, periodo, erro, marcador, rotuloCategoria, medidor,
    opcoesCategorias, selo, valorComSinal, classeSaldo, mostrarSaldo
  };
})();
