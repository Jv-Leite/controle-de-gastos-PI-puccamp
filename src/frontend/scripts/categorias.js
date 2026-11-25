/* categorias.js: tela de Categorias. Cartões com gasto x limite do mês,
   resumo do orçamento e criar/editar/excluir categorias. */
(() => {
  'use strict';
  const { categorias, gastosPorCategoria, movimentosDoMes, nomeMes, moeda, porcentagem, escapar } = ContaAi;
  const $ = id => document.getElementById(id);

  const form = $('form-categoria');           // formulário de nova categoria
  const campoTipo = $('cat-tipo');
  const janela = $('janela-categoria');       // <dialog> de edição
  const mesEscolhido = UI.periodo(desenhar);  // seletor de mês; ao mudar, redesenha

  /* --- cartões --- */

  // moldura do cartão: nome, conteúdo ("corpo") e botões
  function cartao(c, corpo) {
    return `<li><article class="card categoria" data-id="${escapar(c.id)}">
      <h3 class="cat">${UI.marcador(c.cor)}${escapar(c.nome)}</h3>
      ${corpo}
      <div class="acoes-linha">
        <button type="button" class="btn-linha" data-acao="editar">Editar</button>
        <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir</button>
      </div>
    </article></li>`;
  }

  // despesa: sem limite mostra só o gasto; com limite mostra barra e quanto resta
  function cartaoDespesa(c, gasto) {
    if (!(c.limite > 0)) {
      return cartao(c, `<p class="categoria-gasto"><strong class="valor">${moeda(gasto)}</strong> gastos no mês</p>
        <p class="categoria-nota">Sem limite definido.</p>`);
    }
    const resta = c.limite - gasto;
    const nota = resta < 0
      ? `Passou <strong class="valor-negativo">${moeda(-resta)}</strong> do limite.`
      : `Restam <strong>${moeda(resta)}</strong> até o limite.`;
    return cartao(c, `<p class="categoria-gasto"><strong class="valor">${moeda(gasto)}</strong> de ${moeda(c.limite)} · ${porcentagem(gasto, c.limite)}%</p>
      ${UI.medidor(gasto, c.limite)}
      <p class="categoria-nota">${nota}</p>`);
  }

  // receita: quanto entrou no mês
  const cartaoReceita = (c, recebido) =>
    cartao(c, `<p class="categoria-gasto"><strong class="valor valor-positivo">${moeda(recebido)}</strong> no mês</p>`);

  // redesenha cartões e resumo
  function desenhar() {
    const mes = mesEscolhido();
    const gastos = gastosPorCategoria(mes); // { "Moradia": 1000, ... }
    // receitas por categoria
    const receitas = {};
    movimentosDoMes(mes).filter(m => m.tipo === 'receita').forEach(m => {
      receitas[m.categoria] = (receitas[m.categoria] || 0) + m.valor;
    });

    const despesas = categorias.doTipo('despesa');
    const deReceita = categorias.doTipo('receita');
    $('lista-despesas').innerHTML = despesas.map(c => cartaoDespesa(c, gastos[c.nome] || 0)).join('');
    $('lista-receitas').innerHTML = deReceita.map(c => cartaoReceita(c, receitas[c.nome] || 0)).join('');
    $('vazio-despesas').hidden = despesas.length > 0;
    $('vazio-receitas').hidden = deReceita.length > 0;

    // resumo: só categorias com limite
    $('resumo-mes').textContent = nomeMes(mes);
    const comLimite = despesas.filter(c => c.limite > 0);
    const soma = comLimite.reduce((s, c) => s + c.limite, 0);
    const gasto = comLimite.reduce((s, c) => s + (gastos[c.nome] || 0), 0);
    const estouradas = comLimite.filter(c => (gastos[c.nome] || 0) > c.limite);

    $('soma-limites').textContent = moeda(soma);
    $('ja-gasto').textContent = moeda(gasto);
    $('ainda-disponivel').textContent = moeda(Math.max(0, soma - gasto)); // nunca negativo

    // barra geral do orçamento
    const medidor = $('meter-orcamento');
    medidor.hidden = !(soma > 0);
    if (soma > 0) {
      Object.assign(medidor, { max: soma, low: soma * 0.8, high: soma - 0.01, value: gasto });
      medidor.textContent = `${porcentagem(gasto, soma)}% do orçamento`;
      $('nota-orcamento').textContent = `${porcentagem(gasto, soma)}% do orçamento usado (considera só as categorias com limite).` +
        (estouradas.length ? ` Passaram do limite: ${estouradas.map(c => c.nome).join(', ')}.` : '');
    } else {
      $('nota-orcamento').textContent = 'Defina um limite em alguma categoria para ver o resumo.';
    }
  }

  /* --- criar --- */

  // erro do nome ('' = ok). idIgnorado: a própria categoria ao editar
  const erroDoNome = (nome, idIgnorado) => {
    if (!nome) return 'Digite um nome.';
    const repetido = categorias.todos().some(c =>
      c.id !== idIgnorado && c.nome.toLowerCase() === nome.toLowerCase()); // ignora maiúsculas
    return repetido ? 'Já existe uma categoria com esse nome.' : '';
  };
  // número positivo ou null (sem limite)
  const limiteOuNulo = texto => (parseFloat(texto) > 0 ? parseFloat(texto) : null);

  // receita não tem limite; sugere a próxima cor livre
  function prepararForm() {
    $('campo-limite').hidden = campoTipo.value !== 'despesa';
    $('cat-cor').value = categorias.proximaCor(campoTipo.value);
  }
  campoTipo.addEventListener('change', prepararForm);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = $('cat-nome').value.trim();
    const tipo = campoTipo.value === 'receita' ? 'receita' : 'despesa';
    const erro = erroDoNome(nome);
    UI.erro($('erro-categoria'), erro); // mostra ou esconde a mensagem
    if (erro) return;

    categorias.adicionar({
      nome, tipo, cor: $('cat-cor').value,
      limite: tipo === 'despesa' ? limiteOuNulo($('cat-limite').value) : null
    });
    form.reset();
    prepararForm();
    UI.avisar('Categoria criada.');
    desenhar();
  });

  /* --- editar e excluir --- */

  // janela de edição preenchida
  function abrirEdicao(c) {
    $('editar-id').value = c.id;
    $('editar-nome').value = c.nome;
    $('editar-limite').value = c.limite || '';
    $('editar-cor').value = c.cor;
    $('campo-editar-limite').hidden = c.tipo !== 'despesa';
    UI.erro($('erro-editar')); // limpa erro de uma edição anterior
    janela.showModal();
  }

  $('form-editar').addEventListener('submit', e => {
    e.preventDefault();
    const id = $('editar-id').value;
    const nome = $('editar-nome').value.trim();
    const erro = erroDoNome(nome, id);
    UI.erro($('erro-editar'), erro);
    if (erro) return;

    // renomear atualiza os registros que usam a categoria
    categorias.renomear(id, nome);
    categorias.atualizar(id, { cor: $('editar-cor').value, limite: limiteOuNulo($('editar-limite').value) });
    janela.close();
    UI.avisar('Categoria atualizada.');
    desenhar();
  });

  // botões de todos os cartões (veja UI.acoes)
  UI.acoes(document.querySelector('.conteudo'), async (acao, id) => {
    const c = categorias.buscar(id);
    if (!c) return;
    if (acao === 'editar') return abrirEdicao(c);
    if (!await UI.confirmar(`Excluir a categoria "${c.nome}"? Os lançamentos já feitos continuam salvos.`)) return;
    categorias.remover(c.id);
    UI.avisar('Categoria excluída.');
    desenhar();
  });

  // ao abrir a página
  prepararForm();
  desenhar();
})();
