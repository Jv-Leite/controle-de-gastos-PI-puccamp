// Lançamentos
(() => {
  'use strict';
  const { lancamentos, hoje, nomeMes, formatarData, moeda, escapar,
    movimentosDoMes, alternarSituacao, resumoDoMes } = ContaAi;
  const $ = id => document.getElementById(id);

  const form = $('form-lancamento');
  const campoId = $('lan-id');
  const corpo = $('lista-lancamentos');
  let filtro = 'todos';
  let movimentos = [];
  const mesEscolhido = UI.periodo(desenhar);

  /* formulário */

  function atualizarCategorias(selecionada) {
    const tipo = form.elements.tipo.value;
    $('lan-categoria').innerHTML = UI.opcoesCategorias(tipo, selecionada);
    $('rotulo-pago').textContent = tipo === 'receita' ? 'Recebido' : 'Pago';
  }

  function textosDoForm(editando) {
    $('titulo-form').textContent = editando ? 'Editar lançamento' : 'Novo lançamento';
    $('btn-salvar').textContent = editando ? 'Salvar alterações' : 'Salvar lançamento';
    $('btn-cancelar-edicao').hidden = !editando;
  }

  // o reset (botão "Limpar" ou modoNovo) volta a data para hoje e recarrega as categorias
  form.addEventListener('reset', () => setTimeout(() => {
    $('lan-data').value = hoje();
    atualizarCategorias();
  }));

  function modoNovo() {
    campoId.value = '';
    form.reset();
    textosDoForm(false);
  }

  function modoEdicao(l) {
    form.elements.tipo.value = l.tipo;
    form.elements.situacao.value = l.situacao;
    campoId.value = l.id;
    $('lan-descricao').value = l.descricao;
    $('lan-valor').value = l.valor;
    $('lan-data').value = l.data;
    atualizarCategorias(l.categoria);
    textosDoForm(true);
    const painel = $('painel-lancamento');
    painel.open = true;
    painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('lan-descricao').focus({ preventScroll: true });
  }

  form.querySelectorAll('input[name="tipo"]').forEach(r =>
    r.addEventListener('change', () => atualizarCategorias()));
  $('btn-cancelar-edicao').addEventListener('click', modoNovo);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = new FormData(form);
    const registro = {
      tipo: dados.get('tipo') === 'receita' ? 'receita' : 'despesa',
      descricao: dados.get('descricao').trim(),
      valor: parseFloat(dados.get('valor')),
      data: dados.get('data'),
      categoria: dados.get('categoria'),
      situacao: dados.get('situacao') === 'pago' ? 'pago' : 'pendente'
    };
    if (!registro.descricao || !(registro.valor > 0) || !registro.data || !registro.categoria) return;

    if (campoId.value) lancamentos.atualizar(campoId.value, registro);
    else lancamentos.adicionar(registro);
    UI.avisar(campoId.value ? 'Lançamento atualizado.' : 'Lançamento salvo.');
    $('periodo').value = registro.data.slice(0, 7);
    modoNovo();
    desenhar();
  });

  /* tabela */

  function linha(m) {
    let extra = '';
    if (m.origem === 'fixa') extra = '<span class="origem">conta fixa</span>';
    if (m.origem === 'parcela') extra = `<span class="origem">parcela ${escapar(m.parcela)}</span>`;

    const textoSituacao = m.situacao === 'pago'
      ? 'Desfazer' : (m.tipo === 'receita' ? 'Receber' : 'Pagar');

    const acoes = m.origem === 'lancamento'
      ? `<button type="button" class="btn-linha" data-acao="editar">Editar</button>
         <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir</button>`
      : `<a class="btn-linha" href="${m.origem === 'fixa' ? 'contas.html' : 'parcelamentos.html'}">Gerenciar</a>`;

    return `
      <tr data-id="${escapar(m.id)}">
        <th scope="row">${escapar(m.descricao)} ${extra}</th>
        <td>${UI.rotuloCategoria(m.categoria)}</td>
        <td><time datetime="${escapar(m.data)}">${formatarData(m.data)}</time></td>
        <td>${UI.selo(m)}</td>
        <td class="coluna-valor">${UI.valorComSinal(m.valor, m.tipo)}</td>
        <td><div class="acoes-linha">
          <button type="button" class="btn-linha" data-acao="situacao">${textoSituacao}</button>
          ${acoes}
        </div></td>
      </tr>`;
  }

  const passaNoFiltro = m => filtro === 'todos' ||
    (filtro === 'pendente' ? m.situacao === 'pendente' : m.tipo === filtro);

  function desenhar() {
    const mes = mesEscolhido();
    movimentos = movimentosDoMes(mes).reverse();
    const visiveis = movimentos.filter(passaNoFiltro);

    corpo.innerHTML = visiveis.map(linha).join('');
    $('vazio-lancamentos').hidden = visiveis.length > 0;
    $('titulo-lancamentos').textContent = `Lançamentos de ${nomeMes(mes)}`;

    const r = resumoDoMes(mes);
    $('total-receitas').textContent = moeda(r.receitas);
    $('total-despesas').textContent = moeda(r.despesas);
    $('total-a-pagar').textContent = moeda(r.aPagar);
    UI.mostrarSaldo($('total-saldo'), r.saldo, 'resumo-card-valor');
  }

  UI.acoes(corpo, async (acao, id) => {
    const mov = movimentos.find(m => m.id === id);
    if (!mov) return;

    if (acao === 'editar') return modoEdicao(lancamentos.buscar(mov.refId));
    if (acao === 'situacao') alternarSituacao(mov);
    if (acao === 'excluir') {
      if (!await UI.confirmar(`Excluir o lançamento "${mov.descricao}"?`)) return;
      lancamentos.remover(mov.refId);
      if (campoId.value === mov.refId) modoNovo();
      UI.avisar('Lançamento excluído.');
    }
    desenhar();
  });

  document.querySelectorAll('.filtro').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    document.querySelectorAll('.filtro').forEach(o => o.setAttribute('aria-pressed', o === b));
    desenhar();
  }));

  modoNovo();
  desenhar();
})();
