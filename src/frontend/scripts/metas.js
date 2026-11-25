/* metas.js: tela de Metas. Mostra a economia acumulada (recebido - pago)
   e as metas; parte da economia pode ser guardada em cada meta.
   guardadoInicial = o que já tinha ao criar; aportes = o que guardou pelo site. */
(() => {
  'use strict';
  const { metas, mesAtual, nomeMes, diferencaMeses, moeda, porcentagem, escapar, arredondar,
    economiaAcumulada, guardadoDaMeta, disponivelParaMetas } = ContaAi;
  const $ = id => document.getElementById(id);

  const form = $('form-meta');
  const lista = $('lista-metas');
  const janela = $('janela-valor');   // <dialog> para digitar quanto guardar/retirar
  const campoValor = $('valor-meta');
  // operação da janela: { id, tipo: 'guardar' | 'retirar' }
  let operacao = null;

  /* --- economia acumulada --- */

  function desenharEconomia() {
    const eco = economiaAcumulada();
    const disponivel = disponivelParaMetas(); // economia menos o que já está nas metas
    $('eco-receitas').textContent = moeda(eco.receitas);
    $('eco-despesas').textContent = moeda(eco.despesas);
    UI.mostrarSaldo($('eco-total'), eco.total, 'valor');
    UI.mostrarSaldo($('eco-disponivel'), disponivel, 'economia-disponivel-valor valor');
  }

  /* --- cartões das metas --- */

  function cartao(m) {
    const guardado = guardadoDaMeta(m);
    const pct = Math.min(100, porcentagem(guardado, m.valor)); // trava em 100%
    const falta = Math.max(0, m.valor - guardado);               // nunca negativo
    const concluida = falta === 0;
    // meses restantes, contando o atual
    const meses = diferencaMeses(m.prazo, mesAtual()) + 1;

    // concluída, prazo vencido ou quanto guardar por mês
    let nota;
    if (concluida) nota = 'Meta batida!';
    else if (meses <= 0) nota = `Prazo vencido. Faltam <strong>${moeda(falta)}</strong>.`;
    else nota = `Faltam <strong>${moeda(falta)}</strong> · <strong>${moeda(falta / meses)}</strong>/mês`;

    // "Guardar" se não concluiu; "Retirar" se guardou algo pelo site
    return `<li><article class="card meta" data-id="${escapar(m.id)}">
      <div class="meta-topo">
        <div>
          <h3>${escapar(m.nome)}</h3>
          <p class="meta-prazo">Prazo: ${nomeMes(m.prazo)}</p>
        </div>
        <span class="selo ${concluida ? 'selo-pago' : 'selo-pendente'}">${concluida ? 'concluída' : pct + '%'}</span>
      </div>
      <p class="meta-valor"><strong class="valor">${moeda(guardado)}</strong> <span>de ${moeda(m.valor)}</span></p>
      <progress max="${Number(m.valor)}" value="${Math.min(guardado, m.valor)}">${pct}%</progress>
      <p class="meta-nota">${nota}</p>
      <div class="acoes-linha">
        ${concluida ? '' : '<button type="button" class="btn-linha" data-acao="guardar">Guardar</button>'}
        ${(m.aportes || 0) > 0 ? '<button type="button" class="btn-linha" data-acao="retirar">Retirar</button>' : ''}
        <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir</button>
      </div>
    </article></li>`;
  }

  // redesenha tudo (prazo mais próximo primeiro)
  function desenhar() {
    desenharEconomia();
    const todas = metas.todos().sort((a, b) => String(a.prazo).localeCompare(String(b.prazo)));
    lista.innerHTML = todas.map(cartao).join('');
    $('vazio-metas').hidden = todas.length > 0;
  }

  /* --- criar meta --- */

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = new FormData(form);
    const meta = {
      nome: dados.get('nome').trim(),
      valor: parseFloat(dados.get('valor')),
      prazo: dados.get('prazo'),
      guardadoInicial: Math.max(0, parseFloat(dados.get('guardado')) || 0), // campo opcional
      aportes: 0
    };
    // prazo no formato "aaaa-mm"
    if (!meta.nome || !(meta.valor > 0) || !/^\d{4}-\d{2}$/.test(meta.prazo)) return;
    metas.adicionar(meta);
    form.reset();
    UI.avisar('Meta criada.');
    desenhar();
  });

  /* --- guardar e retirar --- */

  // janela já com o máximo: guardar = menor entre disponível e o que falta;
  // retirar = tudo o que foi guardado pelo site
  function abrirValor(m, tipo) {
    const guardar = tipo === 'guardar';
    if (guardar && disponivelParaMetas() <= 0) {
      UI.avisar('Nada livre para guardar por enquanto.');
      return;
    }
    operacao = { id: m.id, tipo };
    const limite = guardar
      ? Math.min(disponivelParaMetas(), m.valor - guardadoDaMeta(m))
      : m.aportes;
    $('janela-valor-titulo').textContent = `${guardar ? 'Guardar em' : 'Retirar de'} "${m.nome}"`;
    $('janela-valor-texto').textContent = guardar
      ? `Livre para guardar: ${moeda(disponivelParaMetas())}`
      : `Guardado aqui: ${moeda(m.aportes)}`;
    $('btn-confirmar-valor').textContent = guardar ? 'Guardar' : 'Retirar';
    campoValor.value = limite > 0 ? arredondar(limite) : '';
    UI.erro($('erro-valor')); // limpa erro anterior
    janela.showModal();
    campoValor.select(); // seleciona o valor, para a pessoa já poder digitar por cima
  }

  // confere o valor e atualiza os aportes
  $('form-valor').addEventListener('submit', e => {
    e.preventDefault();
    const m = operacao && metas.buscar(operacao.id);
    if (!m) return;
    const valor = arredondar(parseFloat(campoValor.value));
    const mostrarErro = texto => UI.erro($('erro-valor'), texto);
    if (!(valor > 0)) return mostrarErro('O valor precisa ser maior que zero.');

    // "+ 0.001" tolera arredondamento de centavos
    if (operacao.tipo === 'guardar') {
      if (valor > disponivelParaMetas() + 0.001) return mostrarErro(`Você só tem ${moeda(disponivelParaMetas())} livre.`);
      metas.atualizar(m.id, { aportes: arredondar((m.aportes || 0) + valor) });
      UI.avisar(`${moeda(valor)} guardados em "${m.nome}".`);
    } else {
      if (valor > (m.aportes || 0) + 0.001) return mostrarErro(`Dá para retirar até ${moeda(m.aportes)}.`);
      metas.atualizar(m.id, { aportes: arredondar(m.aportes - valor) });
      UI.avisar(`${moeda(valor)} retirados de "${m.nome}".`);
    }
    janela.close();
    desenhar();
  });

  // botões dos cartões (veja UI.acoes)
  UI.acoes(lista, async (acao, id) => {
    const m = metas.buscar(id);
    if (!m) return;

    if (acao === 'excluir') {
      // os aportes voltam para o disponível
      if (!await UI.confirmar(`Excluir "${m.nome}"? O que foi guardado nela volta a ficar livre.`)) return;
      metas.remover(m.id);
      UI.avisar('Meta excluída.');
      desenhar();
    } else {
      abrirValor(m, acao); // "guardar" ou "retirar"
    }
  });

  // estado vazio: abre o formulário de nova meta
  $('btn-primeira-meta').addEventListener('click', () => {
    form.closest('details').open = true;
    $('meta-nome').focus();
  });

  // ao abrir: prazo não pode ser mês passado
  $('meta-prazo').min = mesAtual();
  desenhar();
})();
