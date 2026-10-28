// Categorias e limites: criar, editar o limite, excluir e ver o uso no mês.
(() => {
  'use strict';
  const { categorias, gastosPorCategoria, mesAtual, nomeMes, moeda,
    escapar, classeCategoria } = ContaAi;

  const lista = document.getElementById('lista-categorias');
  const avisoVazio = document.getElementById('vazio-categorias');
  const form = document.getElementById('form-categoria');
  const erro = document.getElementById('erro-categoria');

  function cartao(c, gasto) {
    const classe = classeCategoria(c.nome);
    const cabecalho = `<h3 class="categoria-rotulo ${classe}"><span class="bolinha"></span>${escapar(c.nome)}</h3>`;
    const acoes = `
      <div class="card-acoes">
        <button type="button" class="btn-linha" data-acao="limite">${c.limite > 0 ? 'Editar limite' : 'Definir limite'}</button>
        <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir</button>
      </div>`;

    if (!(c.limite > 0)) {
      return `<li><article class="card categoria" data-id="${c.id}">
        ${cabecalho}
        <p class="categoria-gasto"><strong class="valor">${moeda(gasto)}</strong> gastos no mês</p>
        <p class="categoria-nota">Sem limite definido.</p>
        ${acoes}
      </article></li>`;
    }

    const resta = c.limite - gasto;
    const nota = resta < 0
      ? `Passou <strong>${moeda(-resta)}</strong> do limite.`
      : `Restam <strong>${moeda(resta)}</strong> até o limite.`;
    const pct = Math.round((gasto / c.limite) * 100);

    return `<li><article class="card categoria" data-id="${c.id}">
      ${cabecalho}
      <p class="categoria-gasto"><strong class="valor">${moeda(gasto)}</strong> de ${moeda(c.limite)}</p>
      <meter min="0" max="${c.limite}" low="${(c.limite * 0.8).toFixed(2)}" high="${(c.limite - 0.01).toFixed(2)}" optimum="0" value="${gasto}">${pct}% do limite</meter>
      <p class="categoria-nota">${nota}</p>
      ${acoes}
    </article></li>`;
  }

  function desenhar() {
    const mes = mesAtual();
    const gastos = gastosPorCategoria(mes);
    const doTipo = categorias.todos().filter(c => c.tipo === 'despesa');

    lista.innerHTML = doTipo.map(c => cartao(c, gastos[c.nome] || 0)).join('');
    avisoVazio.hidden = doTipo.length > 0;

    document.getElementById('mes-texto').textContent = nomeMes(mes);
    document.getElementById('mes-texto').setAttribute('datetime', mes);
    document.getElementById('resumo-mes').textContent = nomeMes(mes);

    // resumo: só entram as categorias com limite
    const comLimite = doTipo.filter(c => c.limite > 0);
    const soma = comLimite.reduce((s, c) => s + c.limite, 0);
    const gasto = comLimite.reduce((s, c) => s + (gastos[c.nome] || 0), 0);
    const estouradas = comLimite.filter(c => (gastos[c.nome] || 0) > c.limite);

    document.getElementById('soma-limites').textContent = moeda(soma);
    document.getElementById('ja-gasto').textContent = moeda(gasto);
    document.getElementById('ainda-disponivel').textContent = moeda(Math.max(0, soma - gasto));

    const medidor = document.getElementById('meter-orcamento');
    const nota = document.getElementById('nota-orcamento');

    if (soma > 0) {
      medidor.hidden = false;
      medidor.max = soma;
      medidor.low = soma * 0.8;
      medidor.high = soma - 0.01;
      medidor.value = gasto;
      medidor.textContent = `${Math.round((gasto / soma) * 100)}% do orçamento`;
      nota.textContent = 'Conta só as categorias com limite.' + (estouradas.length
        ? ` Já passou do teto: ${estouradas.map(c => c.nome).join(', ')}.` : '');
    } else {
      medidor.hidden = true;
      nota.textContent = 'Defina um limite em alguma categoria para ver o resumo.';
    }
  }

  function lerNumero(texto) {
    return parseFloat(String(texto).replace(',', '.'));
  }

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    const nome = document.getElementById('cat-nome').value.trim();
    const textoLimite = document.getElementById('cat-limite').value;
    const limite = textoLimite === '' ? null : lerNumero(textoLimite);

    const jaExiste = categorias.todos().some(c =>
      c.nome.toLowerCase() === nome.toLowerCase());
    if (jaExiste) {
      erro.textContent = 'Já existe uma categoria com esse nome.';
      erro.hidden = false;
      return;
    }

    erro.hidden = true;
    categorias.adicionar({ nome, tipo: 'despesa', limite: limite > 0 ? limite : null });
    form.reset();
    desenhar();
  });

  lista.addEventListener('click', evento => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.closest('article').dataset.id;
    const categoria = categorias.buscar(id);

    if (botao.dataset.acao === 'limite') {
      const resposta = prompt(
        `Limite mensal de ${categoria.nome} (R$).\nDeixe em branco para tirar o limite.`,
        categoria.limite || '');
      if (resposta === null) return; // cancelou
      const novo = lerNumero(resposta);
      categorias.atualizar(id, { limite: novo > 0 ? novo : null });
    } else if (botao.dataset.acao === 'excluir') {
      if (!confirm(`Excluir a categoria "${categoria.nome}"? Os lançamentos já feitos continuam salvos.`)) return;
      categorias.remover(id);
    }
    desenhar();
  });

  desenhar();
})();
