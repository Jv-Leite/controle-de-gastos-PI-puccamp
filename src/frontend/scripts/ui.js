/* ui.js: peças de interface usadas em várias telas (avisos, janelas,
   seletor de mês, selos, valores coloridos). Ficam em UI. Usa o dados.js. */
const UI = (() => {
  'use strict';
  const { escapar, corValida, corDaCategoria, moeda, mesAtual, estadoDe, diasAte, porcentagem } = ContaAi;

  /* --- aviso rápido (toast) --- */

  // mensagem curta no rodapé por 2,5 s (criada uma vez e reaproveitada)
  let toast, timer;
  function avisar(texto) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status'); // leitor de tela anuncia
      document.body.appendChild(toast);
    }
    toast.textContent = texto;
    toast.classList.add('visivel');
    clearTimeout(timer); // reinicia a contagem se já havia um aviso
    timer = setTimeout(() => toast.classList.remove('visivel'), 2500);
  }

  /* --- janela de confirmação --- */

  // substitui o confirm(). Uso: if (await UI.confirmar('...')) { ... }
  // form method="dialog" fecha a janela e guarda o value do botão clicado
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
        resolver(janela.returnValue === 'sim'); // true só se clicou em confirmar
        janela.remove();
      });
      janela.showModal();
    });
  }

  // qualquer <dialog> fecha ao clicar no fundo ou num botão com data-fechar
  document.addEventListener('click', e => {
    if (e.target.tagName === 'DIALOG' && e.target.open) e.target.close();
    const fechar = e.target.closest('dialog [data-fechar]');
    if (fechar) fechar.closest('dialog').close();
  });

  /* --- cliques nas listas --- */

  // um só evento na lista inteira. Cada item tem data-id e cada botão data-acao;
  // ao clicar chama tratar(acao, id, botao)
  function acoes(lista, tratar) {
    lista.addEventListener('click', e => {
      const botao = e.target.closest('button[data-acao]');
      const item = botao && botao.closest('[data-id]');
      if (item) tratar(botao.dataset.acao, item.dataset.id, botao);
    });
  }

  /* --- seletor de mês do topo --- */

  // começa no mês atual e chama aoMudar ao trocar. Devolve uma função que lê o mês
  function periodo(aoMudar) {
    const campo = document.getElementById('periodo');
    campo.value = mesAtual();
    campo.addEventListener('change', aoMudar);
    document.getElementById('form-periodo').addEventListener('submit', e => e.preventDefault()); // Enter não recarrega
    return () => campo.value || mesAtual();
  }

  // mostra a mensagem de erro; sem texto, esconde
  function erro(el, texto) {
    el.textContent = texto || '';
    el.hidden = !texto;
  }

  /* --- pedaços de HTML --- */

  // bolinha com a cor da categoria
  const marcador = cor => `<span class="bolinha" style="--cor-cat:${corValida(cor)}"></span>`;

  // bolinha + nome da categoria
  const rotuloCategoria = (nome, cor = corDaCategoria(nome)) =>
    `<span class="cat">${marcador(cor)}${escapar(nome || 'Sem categoria')}</span>`;

  // barra gasto x limite: verde até 80%, amarela depois, vermelha ao passar
  const medidor = (gasto, limite) => {
    const [g, l] = [Number(gasto), Number(limite)];
    return `<meter min="0" max="${l}" low="${l * 0.8}" high="${l - 0.01}" optimum="0" value="${g}">${porcentagem(g, l)}% do limite</meter>`;
  };

  // <option>s de categorias do tipo. comVazio = texto da opção vazia (ex.: "Sem categoria")
  function opcoesCategorias(tipo, selecionada, comVazio) {
    const opcoes = ContaAi.categorias.doTipo(tipo)
      .map(c => `<option value="${escapar(c.nome)}"${c.nome === selecionada ? ' selected' : ''}>${escapar(c.nome)}</option>`)
      .join('');
    const vazio = comVazio
      ? `<option value="">${escapar(comVazio)}</option>`
      : '<option value="" disabled selected>Escolha uma categoria</option>';
    return vazio + opcoes;
  }

  // classe CSS e texto de cada selo
  const SELOS = {
    pago: ['selo-pago', 'pago'],
    proximo: ['selo-proximo', 'vence em breve'],
    atrasado: ['selo-atrasado', 'atrasado'],
    pendente: ['selo-pendente', 'pendente']
  };

  // selo de situação ("pago", "atrasado", "vence em 3 dias"...)
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

  // "+ R$ 10,00" verde (receita) ou "− R$ 10,00" vermelho (despesa)
  function valorComSinal(valor, tipo) {
    const receita = tipo === 'receita';
    return `<span class="valor ${receita ? 'valor-positivo' : 'valor-negativo'}">${receita ? '+' : '−'} ${moeda(valor)}</span>`;
  }

  // vermelho se negativo, verde se positivo, sem cor se zero
  function classeSaldo(valor) {
    if (Math.abs(valor) < 0.005) return '';
    return valor < 0 ? 'valor-negativo' : 'valor-positivo';
  }

  // escreve o valor em reais já com a cor do saldo
  function mostrarSaldo(el, valor, classeBase) {
    el.textContent = moeda(valor);
    el.className = `${classeBase} ${classeSaldo(valor)}`;
  }

  return {
    avisar, confirmar, acoes, periodo, erro, marcador, rotuloCategoria, medidor,
    opcoesCategorias, selo, valorComSinal, classeSaldo, mostrarSaldo
  };
})();
