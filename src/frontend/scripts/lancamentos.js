// Lançamentos: cadastrar, listar por mês, mudar a situação e excluir.
(() => {
  'use strict';
  const { lancamentos, categorias, hoje, mesAtual, nomeMes, formatarData,
    moeda, escapar, classeCategoria } = ContaAi;

  const formNovo = document.getElementById('form-lancamento');
  const formPeriodo = document.getElementById('form-periodo');
  const campoPeriodo = document.getElementById('periodo');
  const campoData = document.getElementById('lan-data');
  const selectCategoria = document.getElementById('lan-categoria');
  const corpo = document.getElementById('lista-lancamentos');
  const avisoVazio = document.getElementById('vazio-lancamentos');

  /* ----- formulário ----- */

  function tipoEscolhido() {
    return formNovo.querySelector('input[name="tipo"]:checked').value;
  }

  // Despesa e receita têm categorias diferentes.
  function preencherCategorias() {
    const tipo = tipoEscolhido();
    const opcoes = categorias.todos()
      .filter(c => c.tipo === tipo)
      .map(c => `<option value="${escapar(c.nome)}">${escapar(c.nome)}</option>`)
      .join('');
    selectCategoria.innerHTML =
      '<option value="" selected disabled>Escolha uma categoria</option>' + opcoes;
  }

  function prepararFormulario() {
    campoData.value = hoje();
    preencherCategorias();
  }

  formNovo.querySelectorAll('input[name="tipo"]').forEach(radio =>
    radio.addEventListener('change', preencherCategorias));

  // "Limpar" volta aos valores iniciais (data de hoje etc.)
  formNovo.addEventListener('reset', () => setTimeout(prepararFormulario, 0));

  formNovo.addEventListener('submit', evento => {
    evento.preventDefault();
    const dados = new FormData(formNovo);
    const valor = parseFloat(dados.get('valor'));
    if (!(valor > 0)) return;

    const data = dados.get('data');
    lancamentos.adicionar({
      tipo: dados.get('tipo'),
      descricao: dados.get('descricao').trim(),
      valor,
      data,
      categoria: dados.get('categoria'),
      situacao: dados.get('situacao')
    });

    campoPeriodo.value = data.slice(0, 7); // mostra o mês do novo lançamento
    formNovo.reset();
    desenhar();
  });

  /* ----- tabela ----- */

  function seloDe(l) {
    if (l.situacao === 'pago') {
      return l.tipo === 'receita'
        ? ['selo-recebido', 'recebido'] : ['selo-pago', 'pago'];
    }
    if (l.tipo === 'despesa' && l.data < hoje()) return ['selo-atrasado', 'atrasado'];
    return ['selo-pendente', 'pendente'];
  }

  function linha(l) {
    const [classeSelo, textoSelo] = seloDe(l);
    const ehReceita = l.tipo === 'receita';
    const parcela = l.parcela ? ` <small class="parcela">parcela ${escapar(l.parcela)}</small>` : '';
    const textoBotao = l.situacao === 'pago'
      ? 'Desfazer' : (ehReceita ? 'Receber' : 'Pagar');

    return `
      <tr data-id="${l.id}" data-tipo="${l.tipo}"${l.situacao === 'pendente' ? ' data-pendente' : ''}>
        <th scope="row">${escapar(l.descricao)}${parcela}</th>
        <td><span class="cat ${classeCategoria(l.categoria)}"><span class="bolinha"></span>${escapar(l.categoria)}</span></td>
        <td><time datetime="${l.data}">${formatarData(l.data)}</time></td>
        <td><span class="selo ${classeSelo}">${textoSelo}</span></td>
        <td class="col-valor ${ehReceita ? 'valor-receita' : 'valor-despesa'}">${ehReceita ? '+' : '−'}${moeda(l.valor)}</td>
        <td class="col-acoes">
          <button type="button" class="btn-linha" data-acao="situacao">${textoBotao}</button>
          <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir</button>
        </td>
      </tr>`;
  }

  function desenhar() {
    const mes = campoPeriodo.value || mesAtual();
    const itens = lancamentos.todos()
      .filter(l => l.data.startsWith(mes))
      .sort((a, b) => b.data.localeCompare(a.data));

    corpo.innerHTML = itens.map(linha).join('');
    avisoVazio.hidden = itens.length > 0;

    // textos que mudam com o mês
    const nome = nomeMes(mes);
    document.getElementById('periodo-texto').textContent = nome;
    document.getElementById('periodo-texto').setAttribute('datetime', mes);
    document.getElementById('titulo-lancamentos').textContent = `Lançamentos de ${nome}`;
    document.getElementById('qtd-registros').textContent = itens.length;

    // totais do rodapé
    const receitas = itens.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesas = itens.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    document.getElementById('total-receitas').textContent = moeda(receitas);
    document.getElementById('total-despesas').textContent = moeda(despesas);
    document.getElementById('total-saldo').textContent = moeda(receitas - despesas);
  }

  corpo.addEventListener('click', evento => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.closest('tr').dataset.id;

    if (botao.dataset.acao === 'situacao') {
      const l = lancamentos.buscar(id);
      lancamentos.atualizar(id, { situacao: l.situacao === 'pago' ? 'pendente' : 'pago' });
    } else if (botao.dataset.acao === 'excluir') {
      if (!confirm('Excluir este lançamento?')) return;
      lancamentos.remover(id);
    }
    desenhar();
  });

  campoPeriodo.addEventListener('change', desenhar);
  formPeriodo.addEventListener('submit', e => e.preventDefault());

  /* ----- início ----- */
  campoPeriodo.value = mesAtual();
  prepararFormulario();
  desenhar();
})();
