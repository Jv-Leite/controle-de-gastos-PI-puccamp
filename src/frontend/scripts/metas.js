// Metas de economia: criar, guardar valores, excluir e ver o progresso.
(() => {
  'use strict';
  const { metas, lancamentos, mesAtual, nomeMes, diferencaMeses, moeda, escapar } = ContaAi;

  const lista = document.getElementById('lista-metas');
  const avisoVazio = document.getElementById('vazio-metas');
  const form = document.getElementById('form-meta');

  function lerNumero(texto) {
    return parseFloat(String(texto).replace(',', '.'));
  }

  function cartao(m) {
    const concluida = m.guardado >= m.valor;
    const pct = Math.min(100, Math.round((m.guardado / m.valor) * 100));
    const meses = diferencaMeses(m.prazo, mesAtual());
    const restante = Math.max(0, m.valor - m.guardado);

    let textoPrazo;
    if (concluida) {
      textoPrazo = `Concluída em <time datetime="${m.concluidaEm || m.prazo}">${nomeMes(m.concluidaEm || mesAtual())}</time>`;
    } else if (meses > 0) {
      textoPrazo = `Prazo: <time datetime="${m.prazo}">${nomeMes(m.prazo)}</time> · ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    } else {
      textoPrazo = `Prazo: <time datetime="${m.prazo}">${nomeMes(m.prazo)}</time> · ${meses === 0 ? 'vence este mês' : 'prazo vencido'}`;
    }

    const nota = concluida
      ? 'Meta batida!'
      : `Faltam ${moeda(restante)}. Guarde <strong>${moeda(restante / Math.max(meses, 1))} por mês</strong> para chegar no prazo.`;

    return `<li><article class="card meta${concluida ? ' meta-concluida' : ''}" data-id="${m.id}">
      <header class="meta-topo">
        <h3>${escapar(m.nome)}</h3>
        <span class="selo ${concluida ? 'selo-concluida' : 'selo-percentual'}">${concluida ? 'concluída' : pct + '%'}</span>
      </header>
      <p class="meta-prazo">${textoPrazo}</p>
      <p class="meta-valor"><strong class="valor">${moeda(m.guardado)}</strong> <span>de ${moeda(m.valor)}</span></p>
      <progress max="${m.valor}" value="${Math.min(m.guardado, m.valor)}">${pct}% da meta</progress>
      <p class="categoria-nota">${nota}</p>
      <div class="card-acoes">
        ${concluida ? '' : '<button type="button" class="btn-linha" data-acao="guardar">Guardar valor</button>'}
        <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir</button>
      </div>
    </article></li>`;
  }

  function desenharEconomia(todas) {
    // economia = tudo que já entrou − tudo que já saiu (lançamentos pagos)
    const pagos = lancamentos.todos().filter(l => l.situacao === 'pago');
    const receitas = pagos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesas = pagos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const economia = receitas - despesas;
    const reservado = todas.reduce((s, m) => s + m.guardado, 0);
    const abertas = todas.filter(m => m.guardado < m.valor);
    const porMes = abertas.reduce((s, m) =>
      s + (m.valor - m.guardado) / Math.max(diferencaMeses(m.prazo, mesAtual()), 1), 0);

    document.getElementById('eco-receitas').textContent = moeda(receitas);
    document.getElementById('eco-despesas').textContent = moeda(despesas);
    document.getElementById('eco-total').textContent = moeda(economia);

    document.getElementById('eco-texto').innerHTML =
      `<strong>${moeda(reservado)}</strong> já estão reservados nas metas e ` +
      `<strong>${moeda(economia - reservado)}</strong> ainda podem ser distribuídos.` +
      (abertas.length ? ` Juntas, as metas abertas pedem ${moeda(porMes)} por mês.` : '');
  }

  function desenhar() {
    const todas = metas.todos();
    lista.innerHTML = todas.map(cartao).join('');
    avisoVazio.hidden = todas.length > 0;
    desenharEconomia(todas);
  }

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    const dados = new FormData(form);
    const valor = lerNumero(dados.get('valor'));
    const guardado = dados.get('guardado') === '' ? 0 : lerNumero(dados.get('guardado'));
    if (!(valor > 0) || !(guardado >= 0)) return;

    metas.adicionar({
      nome: dados.get('nome').trim(),
      valor,
      prazo: dados.get('prazo'),
      guardado,
      concluidaEm: guardado >= valor ? mesAtual() : null
    });
    form.reset();
    desenhar();
  });

  lista.addEventListener('click', evento => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.closest('article').dataset.id;
    const meta = metas.buscar(id);

    if (botao.dataset.acao === 'guardar') {
      const resposta = prompt(`Quanto você guardou agora para "${meta.nome}" (R$)?`);
      const valor = lerNumero(resposta);
      if (!(valor > 0)) return;
      const guardado = meta.guardado + valor;
      metas.atualizar(id, {
        guardado,
        concluidaEm: guardado >= meta.valor ? mesAtual() : null
      });
    } else if (botao.dataset.acao === 'excluir') {
      if (!confirm(`Excluir a meta "${meta.nome}"?`)) return;
      metas.remover(id);
    }
    desenhar();
  });

  desenhar();
})();
