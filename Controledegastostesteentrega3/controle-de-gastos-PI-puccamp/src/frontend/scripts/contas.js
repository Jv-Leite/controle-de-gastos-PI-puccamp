// Contas fixas
(() => {
  'use strict';
  const { contasFixas, mesAtual, somarMeses, nomeMes, moeda, plural, escapar, corDaCategoria,
    movimentosDoMes, alternarSituacao, estadoDe } = ContaAi;
  const $ = id => document.getElementById(id);

  const lista = $('lista-contas');
  const janela = $('janela-conta');
  const form = $('form-conta');
  const campos = {
    id: $('conta-id'), tipo: $('conta-tipo'), nome: $('conta-nome'), valor: $('conta-valor'),
    dia: $('conta-dia'), categoria: $('conta-categoria'), inicio: $('conta-inicio')
  };
  let itens = [];
  const mesEscolhido = UI.periodo(desenhar);

  const soma = l => l.reduce((s, m) => s + m.valor, 0);
  const diaDe = m => Number(m.data.slice(8));

  function item(m) {
    const receita = m.tipo === 'receita';
    const textoBotao = m.situacao === 'pago' ? 'Desfazer' : (receita ? 'Marcar recebida' : 'Marcar paga');

    return `
      <li class="conta-item" data-id="${escapar(m.id)}">
        <div class="conta-info">
          <span class="conta-icone" style="--cor-cat:${corDaCategoria(m.categoria)}" aria-hidden="true">${escapar(m.descricao.charAt(0).toUpperCase())}</span>
          <div class="conta-textos">
            <span class="conta-nome">${escapar(m.descricao)} ${UI.selo(m)}</span>
            <span class="conta-detalhe">${receita ? 'Recebe' : 'Vence'} todo dia ${diaDe(m)} · ${escapar(m.categoria || 'Sem categoria')}</span>
          </div>
        </div>
        <div class="conta-direita">
          ${UI.valorComSinal(m.valor, m.tipo)}
          <div class="acoes-linha">
            <button type="button" class="btn-linha" data-acao="pagar">${textoBotao}</button>
            <button type="button" class="btn-linha" data-acao="editar">Editar</button>
            <button type="button" class="btn-linha btn-linha-perigo" data-acao="remover">Remover</button>
          </div>
        </div>
      </li>`;
  }

  function desenhar() {
    itens = movimentosDoMes(mesEscolhido()).filter(m => m.origem === 'fixa');
    lista.innerHTML = itens.map(item).join('');
    $('vazio-contas').hidden = itens.length > 0;

    const despesas = itens.filter(m => m.tipo === 'despesa');
    const receitas = itens.filter(m => m.tipo === 'receita');
    const pagas = despesas.filter(m => m.situacao === 'pago');
    const pendentes = despesas.filter(m => m.situacao !== 'pago');
    const alertas = despesas.filter(m => ['atrasado', 'proximo'].includes(estadoDe(m)));
    const atrasadas = alertas.filter(m => estadoDe(m) === 'atrasado');

    $('total-despesas').textContent = moeda(soma(despesas));
    $('total-despesas-nota').textContent = plural(despesas.length, 'conta');
    $('total-receitas').textContent = moeda(soma(receitas));
    $('total-receitas-nota').textContent = plural(receitas.length, 'receita');
    $('pagas-valor').textContent = moeda(soma(pagas));
    $('pagas-nota').textContent = `${pagas.length} de ${despesas.length} contas`;
    $('pendentes-valor').textContent = moeda(soma(pendentes));
    $('pendentes-nota').textContent = atrasadas.length ? plural(atrasadas.length, 'atrasada') : 'nenhuma atrasada';

    const aviso = $('aviso-vencimento');
    aviso.hidden = alertas.length === 0;
    aviso.textContent = alertas.length
      ? `Atenção: ${alertas.map(m => `${m.descricao} (${estadoDe(m) === 'atrasado' ? 'atrasada' : 'vence dia ' + diaDe(m)})`).join(', ')}.`
      : '';
  }

  /* janela de cadastro */

  const preencherCategorias = selecionada =>
    campos.categoria.innerHTML = UI.opcoesCategorias(campos.tipo.value, selecionada, 'Sem categoria');

  function abrir(conta) {
    form.reset();
    campos.id.value = conta ? conta.id : '';
    $('janela-conta-titulo').textContent = conta ? 'Editar conta fixa' : 'Nova conta fixa';
    ['tipo', 'nome', 'valor', 'dia', 'inicio'].forEach(k => { if (conta) campos[k].value = conta[k]; });
    if (!conta) campos.inicio.value = mesEscolhido();
    preencherCategorias(conta ? conta.categoria : '');
    janela.showModal();
    campos.nome.focus();
  }

  $('btn-nova-conta').addEventListener('click', () => abrir());
  campos.tipo.addEventListener('change', () => preencherCategorias(''));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = {
      tipo: campos.tipo.value === 'receita' ? 'receita' : 'despesa',
      nome: campos.nome.value.trim(),
      valor: parseFloat(campos.valor.value),
      dia: parseInt(campos.dia.value, 10),
      categoria: campos.categoria.value,
      inicio: campos.inicio.value || mesAtual()
    };
    if (!dados.nome || !(dados.valor > 0) || !(dados.dia >= 1 && dados.dia <= 31)) return;

    if (campos.id.value) contasFixas.atualizar(campos.id.value, dados);
    else contasFixas.adicionar({ ...dados, mesesPagos: [], fim: null });
    UI.avisar(campos.id.value ? 'Conta fixa atualizada.' : 'Conta fixa cadastrada.');
    janela.close();
    desenhar();
  });

  /* ações da lista */

  UI.acoes(lista, async (acao, id) => {
    const mov = itens.find(m => m.id === id);
    const conta = mov && contasFixas.buscar(mov.refId);
    if (!conta) return;

    if (acao === 'editar') return abrir(conta);
    if (acao === 'pagar') alternarSituacao(mov);
    if (acao === 'remover') {
      if (!await UI.confirmar(`Remover "${conta.nome}" a partir de ${nomeMes(mov.mes)}? Os meses anteriores continuam no histórico.`, 'Remover')) return;
      // encerra a conta no mês anterior; se começou neste mês, apaga de vez
      if (conta.inicio >= mov.mes) contasFixas.remover(conta.id);
      else contasFixas.atualizar(conta.id, { fim: somarMeses(mov.mes, -1) });
      UI.avisar('Conta fixa removida.');
    }
    desenhar();
  });

  desenhar();
})();
