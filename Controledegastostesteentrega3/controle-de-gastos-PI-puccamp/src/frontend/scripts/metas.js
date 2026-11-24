// Metas de economia
(() => {
  'use strict';
  const { metas, mesAtual, nomeMes, diferencaMeses, moeda, porcentagem, escapar, arredondar,
    economiaAcumulada, guardadoDaMeta, disponivelParaMetas } = ContaAi;
  const $ = id => document.getElementById(id);

  const form = $('form-meta');
  const lista = $('lista-metas');
  const janela = $('janela-valor');
  const campoValor = $('valor-meta');
  let operacao = null; // { id, tipo: 'guardar' | 'retirar' }

  function desenharEconomia() {
    const eco = economiaAcumulada();
    const disponivel = disponivelParaMetas();
    $('eco-receitas').textContent = moeda(eco.receitas);
    $('eco-despesas').textContent = moeda(eco.despesas);
    UI.mostrarSaldo($('eco-total'), eco.total, 'valor');
    UI.mostrarSaldo($('eco-disponivel'), disponivel, 'economia-disponivel-valor valor');

    $('eco-texto').textContent = eco.total < 0
      ? 'Suas despesas pagas estão maiores que as receitas recebidas. Reduza gastos para voltar a economizar.'
      : 'Considera só o que já foi recebido e pago, até o mês atual. Use “Guardar” em uma meta para reservar parte desse valor.';
  }

  function cartao(m) {
    const guardado = guardadoDaMeta(m);
    const pct = Math.min(100, porcentagem(guardado, m.valor));
    const falta = Math.max(0, m.valor - guardado);
    const concluida = falta === 0;
    const meses = diferencaMeses(m.prazo, mesAtual()) + 1;

    let nota;
    if (concluida) nota = 'Meta alcançada! Parabéns.';
    else if (meses <= 0) nota = `O prazo passou. Faltam <strong>${moeda(falta)}</strong>.`;
    else nota = `Faltam <strong>${moeda(falta)}</strong>: guarde <strong>${moeda(falta / meses)}</strong> por mês até ${nomeMes(m.prazo)}.`;

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

  function desenhar() {
    desenharEconomia();
    const todas = metas.todos().sort((a, b) => a.prazo.localeCompare(b.prazo));
    lista.innerHTML = todas.map(cartao).join('');
    $('vazio-metas').hidden = todas.length > 0;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = new FormData(form);
    const meta = {
      nome: dados.get('nome').trim(),
      valor: parseFloat(dados.get('valor')),
      prazo: dados.get('prazo'),
      guardadoInicial: Math.max(0, parseFloat(dados.get('guardado')) || 0),
      aportes: 0
    };
    if (!meta.nome || !(meta.valor > 0) || !/^\d{4}-\d{2}$/.test(meta.prazo)) return;
    metas.adicionar(meta);
    form.reset();
    UI.avisar('Meta criada.');
    desenhar();
  });

  /* guardar e retirar */

  function abrirValor(m, tipo) {
    const guardar = tipo === 'guardar';
    if (guardar && disponivelParaMetas() <= 0) {
      UI.avisar('Ainda não há economia disponível para guardar.');
      return;
    }
    operacao = { id: m.id, tipo };
    const limite = guardar
      ? Math.min(disponivelParaMetas(), m.valor - guardadoDaMeta(m))
      : m.aportes;
    $('janela-valor-titulo').textContent = `${guardar ? 'Guardar em' : 'Retirar de'} "${m.nome}"`;
    $('janela-valor-texto').textContent = guardar
      ? `Disponível para guardar: ${moeda(disponivelParaMetas())}.`
      : `Você pode retirar até ${moeda(m.aportes)} que foram guardados por aqui.`;
    $('btn-confirmar-valor').textContent = guardar ? 'Guardar' : 'Retirar';
    campoValor.value = limite > 0 ? arredondar(limite) : '';
    UI.erro($('erro-valor'));
    janela.showModal();
    campoValor.select();
  }

  $('form-valor').addEventListener('submit', e => {
    e.preventDefault();
    const m = operacao && metas.buscar(operacao.id);
    if (!m) return;
    const valor = arredondar(parseFloat(campoValor.value));
    const mostrarErro = texto => UI.erro($('erro-valor'), texto);
    if (!(valor > 0)) return mostrarErro('Informe um valor maior que zero.');

    if (operacao.tipo === 'guardar') {
      if (valor > disponivelParaMetas() + 0.001) return mostrarErro(`Você só tem ${moeda(disponivelParaMetas())} disponível.`);
      metas.atualizar(m.id, { aportes: arredondar((m.aportes || 0) + valor) });
      UI.avisar(`${moeda(valor)} guardados em "${m.nome}".`);
    } else {
      if (valor > (m.aportes || 0) + 0.001) return mostrarErro(`O máximo para retirar é ${moeda(m.aportes)}.`);
      metas.atualizar(m.id, { aportes: arredondar(m.aportes - valor) });
      UI.avisar(`${moeda(valor)} retirados de "${m.nome}".`);
    }
    janela.close();
    desenhar();
  });

  UI.acoes(lista, async (acao, id) => {
    const m = metas.buscar(id);
    if (!m) return;

    if (acao === 'excluir') {
      if (!await UI.confirmar(`Excluir a meta "${m.nome}"? O valor guardado volta a ficar disponível.`)) return;
      metas.remover(m.id);
      UI.avisar('Meta excluída.');
      desenhar();
    } else {
      abrirValor(m, acao);
    }
  });

  $('meta-prazo').min = mesAtual();
  desenhar();
})();
