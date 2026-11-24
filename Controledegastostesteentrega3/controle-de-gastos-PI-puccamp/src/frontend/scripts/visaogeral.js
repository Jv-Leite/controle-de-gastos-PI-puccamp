// Visão geral
(() => {
  'use strict';
  if (!Auth.sessao()) return;
  const { contasFixas, categorias, metas, hoje, mesAtual, somarMeses, mesCurto, nomeMes,
    formatarData, moeda, porcentagem, plural, escapar, resumoDoMes, gastosPorCategoria, movimentosDoMes,
    alternarSituacao, estadoDe, guardadoDaMeta, corDaCategoria, COR_OUTRAS } = ContaAi;
  const $ = id => document.getElementById(id);

  const dica = $('dica-grafico');
  const mesEscolhido = UI.periodo(desenharTudo);
  let pendentes = [];

  const formatoCurto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const moedaCurta = v => `${v < 0 ? '−' : ''}R$ ${formatoCurto.format(Math.abs(v))}`;

  /* resumo */

  function desenharResumo(mes) {
    const r = resumoDoMes(mes);
    $('subtitulo').textContent = `Resumo de ${nomeMes(mes)}.`;
    UI.mostrarSaldo($('saldo-previsto'), r.saldo, 'resumo-card-valor');
    $('total-receitas').textContent = moeda(r.receitas);
    $('nota-receitas').textContent = `${moeda(r.recebido)} recebido`;
    $('total-despesas').textContent = moeda(r.despesas);
    $('nota-despesas').textContent = `${moeda(r.pago)} pago`;
    $('total-a-pagar').textContent = moeda(r.aPagar);
    const atrasadas = movimentosDoMes(mes).filter(m => estadoDe(m) === 'atrasado').length;
    $('nota-a-pagar').textContent = r.aPagar === 0
      ? 'nada pendente' : (atrasadas ? `${atrasadas} em atraso` : 'nenhuma em atraso');
  }

  /* gráfico de rosca */

  function desenharCategorias(mes) {
    const caixa = $('grafico-categorias');
    const ordenado = Object.entries(gastosPorCategoria(mes)).sort((a, b) => b[1] - a[1]);
    const total = ordenado.reduce((s, [, v]) => s + v, 0);

    if (total === 0) {
      caixa.innerHTML = '<p class="vazio">Nenhuma despesa neste mês.</p>';
      return;
    }

    // até 6 categorias; o resto vira "Outras"
    let fatias = ordenado.slice(0, 6).map(([nome, valor]) => ({ nome, valor, cor: corDaCategoria(nome) }));
    const resto = ordenado.slice(6).reduce((s, [, v]) => s + v, 0);
    if (resto > 0) fatias.push({ nome: 'Outras', valor: resto, cor: COR_OUTRAS });

    const raio = 40, circ = 2 * Math.PI * raio;
    const folga = fatias.length > 1 ? 1.2 : 0;
    let deslocamento = 0;
    const circulos = fatias.map((f, i) => {
      const tamanho = (f.valor / total) * circ;
      const c = `<circle data-fatia="${i}" cx="50" cy="50" r="${raio}" fill="none" stroke="${f.cor}" stroke-width="16"
        stroke-dasharray="${Math.max(tamanho - folga, 0.5)} ${circ}" stroke-dashoffset="${-deslocamento}"></circle>`;
      deslocamento += tamanho;
      return c;
    }).join('');

    caixa.innerHTML = `
      <div class="rosca-area">
        <div class="rosca">
          <svg viewBox="0 0 100 100" role="img" aria-label="Gastos por categoria">${circulos}</svg>
          <div class="rosca-centro"><span>Total gasto</span><strong>${moedaCurta(total)}</strong></div>
        </div>
        <ul class="rosca-legenda">
          ${fatias.map(f => `<li>
            ${UI.rotuloCategoria(f.nome, f.cor)}
            <span class="rosca-legenda-valor">${porcentagem(f.valor, total)}% · ${moeda(f.valor)}</span>
          </li>`).join('')}
        </ul>
      </div>`;

    caixa.querySelectorAll('circle[data-fatia]').forEach(c => {
      const f = fatias[c.dataset.fatia];
      ligarDica(c, () => `<strong>${escapar(f.nome)}</strong><br>${moeda(f.valor)} · ${porcentagem(f.valor, total)}%`);
    });
  }

  /* barras dos últimos 6 meses (terminando no mês escolhido) */

  function desenharComparativo(mes) {
    const caixa = $('grafico-comparativo');
    const meses = Array.from({ length: 6 }, (_, i) => somarMeses(mes, i - 5));
    const dados = meses.map(m => ({ mes: m, ...resumoDoMes(m) }));
    const maior = Math.max(...dados.map(d => Math.max(d.receitas, d.despesas)));

    if (maior === 0) {
      caixa.innerHTML = '<p class="vazio">Ainda não há receitas ou despesas para comparar.</p>';
      return;
    }

    const altura = v => `${Math.max((v / maior) * 100, v > 0 ? 1 : 0)}%`;
    caixa.innerHTML = `
      <div class="barras">
        ${dados.map((d, i) => `<div class="barras-mes" data-i="${i}" tabindex="0" aria-label="${nomeMes(d.mes)}: receitas ${moeda(d.receitas)}, despesas ${moeda(d.despesas)}, saldo ${moeda(d.saldo)}">
          <span class="barra barra-receita" style="height:${altura(d.receitas)}"></span>
          <span class="barra barra-despesa" style="height:${altura(d.despesas)}"></span>
        </div>`).join('')}
      </div>
      <div class="barras-rotulos">
        ${dados.map(d => `<div class="${d.mes === mes ? 'mes-atual' : ''}">
          <span>${mesCurto(d.mes)}</span>
          <strong class="${UI.classeSaldo(d.saldo)}">${(d.saldo < 0 ? '−' : '') + formatoCurto.format(Math.abs(d.saldo))}</strong>
        </div>`).join('')}
      </div>
      <p class="barras-nota">Abaixo de cada mês: saldo em reais (receitas − despesas).</p>`;

    caixa.querySelectorAll('.barras-mes').forEach(el => {
      const d = dados[el.dataset.i];
      ligarDica(el, () => `<strong>${nomeMes(d.mes)}</strong><br>Receitas: ${moeda(d.receitas)}<br>Despesas: ${moeda(d.despesas)}<br>Saldo: ${moeda(d.saldo)}`);
    });
  }

  function ligarDica(el, conteudo) {
    const mostrar = e => {
      dica.innerHTML = conteudo();
      dica.hidden = false;
      const r = el.getBoundingClientRect();
      const x = e && e.clientX ? e.clientX : r.left + r.width / 2;
      const y = e && e.clientY ? e.clientY : r.top;
      const largura = dica.offsetWidth;
      dica.style.left = `${Math.min(Math.max(8, x - largura / 2), innerWidth - largura - 8)}px`;
      dica.style.top = `${Math.max(8, y - dica.offsetHeight - 12)}px`;
    };
    el.addEventListener('mousemove', mostrar);
    el.addEventListener('focus', () => mostrar());
    el.addEventListener('mouseleave', () => { dica.hidden = true; });
    el.addEventListener('blur', () => { dica.hidden = true; });
  }

  /* painéis */

  function desenharVencimentos(mes) {
    pendentes = movimentosDoMes(mes).filter(m => m.tipo === 'despesa' && m.situacao === 'pendente');
    const lista = $('lista-vencimentos');

    if (!pendentes.length) {
      lista.innerHTML = '<li><p class="vazio">Nenhuma conta pendente neste mês.</p></li>';
      return;
    }

    lista.innerHTML = pendentes.slice(0, 5).map(m => `<li data-id="${escapar(m.id)}">
      <div class="mini-linha"><strong>${escapar(m.descricao)}${m.parcela ? ` (${escapar(m.parcela)})` : ''}</strong>${UI.valorComSinal(m.valor, m.tipo)}</div>
      <div class="mini-linha"><span class="mini-detalhe">${formatarData(m.data)} · ${UI.selo(m)}</span>
        <button type="button" class="btn-linha" data-acao="pagar">Pagar</button></div>
    </li>`).join('') + (pendentes.length > 5
      ? `<li><span class="mini-detalhe">e mais ${plural(pendentes.length - 5, 'pendente')}.</span></li>` : '');
  }

  UI.acoes($('lista-vencimentos'), (acao, id) => {
    const mov = pendentes.find(m => m.id === id);
    if (!mov) return;
    alternarSituacao(mov);
    UI.avisar(`"${mov.descricao}" marcada como paga.`);
    desenharTudo();
  });

  function desenharLimites(mes) {
    const gastos = gastosPorCategoria(mes);
    const comLimite = categorias.doTipo('despesa').filter(c => c.limite > 0)
      .map(c => ({ ...c, gasto: gastos[c.nome] || 0 }))
      .sort((a, b) => b.gasto / b.limite - a.gasto / a.limite);
    $('lista-limites').innerHTML = comLimite.length
      ? comLimite.slice(0, 5).map(c => `<li>
            <div class="mini-linha">${UI.rotuloCategoria(c.nome)}<span class="mini-detalhe">${moeda(c.gasto)} de ${moeda(c.limite)}</span></div>
            ${UI.medidor(c.gasto, c.limite)}
          </li>`).join('')
      : '<li><p class="vazio">Nenhuma categoria com limite. Defina limites em Categorias.</p></li>';
  }

  function desenharMetas() {
    const todas = metas.todos();
    $('lista-metas').innerHTML = todas.length
      ? todas.slice(0, 4).map(m => {
          const g = guardadoDaMeta(m);
          return `<li>
            <div class="mini-linha"><strong>${escapar(m.nome)}</strong><span class="mini-detalhe">${Math.min(100, porcentagem(g, m.valor))}%</span></div>
            <progress max="${Number(m.valor)}" value="${Math.min(g, m.valor)}"></progress>
            <span class="mini-detalhe">${moeda(g)} de ${moeda(m.valor)} · até ${mesCurto(m.prazo)}</span>
          </li>`;
        }).join('')
      : '<li><p class="vazio">Nenhuma meta criada ainda.</p></li>';
  }

  function desenharTudo() {
    const mes = mesEscolhido();
    desenharResumo(mes);
    desenharCategorias(mes);
    desenharComparativo(mes);
    desenharVencimentos(mes);
    desenharLimites(mes);
    desenharMetas();
  }

  /* renda mensal (receita fixa marcada como renda) */

  const rendaVigente = mes => contasFixas.todos()
    .find(c => c.renda && c.inicio <= mes && (!c.fim || c.fim >= mes));

  function salvarRenda(valor, dia, aPartirDe) {
    const atual = rendaVigente(aPartirDe);
    if (atual && atual.inicio >= aPartirDe) {
      contasFixas.atualizar(atual.id, { valor, dia });
      return;
    }
    if (atual) {
      contasFixas.atualizar(atual.id, {
        fim: somarMeses(aPartirDe, -1),
        mesesPagos: (atual.mesesPagos || []).filter(m => m < aPartirDe)
      });
    }
    // rendas futuras já cadastradas são substituídas
    contasFixas.todos().filter(c => c.renda && c.inicio > aPartirDe).forEach(c => contasFixas.remover(c.id));
    contasFixas.adicionar({
      tipo: 'receita', nome: 'Renda mensal', valor, dia, categoria: 'Salário',
      inicio: aPartirDe, fim: null, renda: true,
      mesesPagos: atual ? (atual.mesesPagos || []).filter(m => m >= aPartirDe) : []
    });
  }

  /* configuração inicial do perfil */

  const modal = $('modal-perfil');
  const linhasContas = $('linhas-contas');
  let qtdContas = 0;

  function adicionarLinhaConta() {
    if (qtdContas >= 5) return;
    qtdContas++;
    const n = qtdContas;
    linhasContas.insertAdjacentHTML('beforeend', `
      <div class="campos-4 linha-conta">
        <div class="campo"><label for="conta-nome-${n}">Conta ${n}</label>
          <input type="text" id="conta-nome-${n}" placeholder="Ex.: Aluguel" maxlength="40"></div>
        <div class="campo"><label for="conta-valor-${n}">Valor (R$)</label>
          <input type="number" id="conta-valor-${n}" placeholder="0,00" step="0.01" min="0.01"></div>
        <div class="campo"><label for="conta-dia-${n}">Vencimento</label>
          <input type="number" id="conta-dia-${n}" placeholder="Dia" min="1" max="31"></div>
        <div class="campo"><label for="conta-cat-${n}">Categoria</label>
          <select id="conta-cat-${n}">${UI.opcoesCategorias('despesa', '', 'Sem categoria')}</select></div>
      </div>`);
    if (qtdContas >= 5) $('btn-mais-conta').hidden = true;
  }

  function abrirConfiguracao() {
    adicionarLinhaConta();
    $('campos-limites').innerHTML = categorias.doTipo('despesa').map(c => `
      <div class="campo"><label for="limite-${escapar(c.id)}">${escapar(c.nome)}</label>
        <input type="number" id="limite-${escapar(c.id)}" data-categoria="${escapar(c.id)}" placeholder="Sem limite" step="0.01" min="0"></div>`).join('');
    modal.classList.add('active');
    $('renda').focus();
  }

  $('btn-mais-conta').addEventListener('click', adicionarLinhaConta);

  $('form-perfil').addEventListener('submit', e => {
    e.preventDefault();
    const renda = parseFloat($('renda').value);
    const dia = parseInt($('dia-recebimento').value, 10);
    if (!(renda > 0) || !(dia >= 1 && dia <= 31)) return;
    const mes = mesAtual();

    salvarRenda(renda, dia, mes);
    // se o dia do salário já passou, o mês atual entra como recebido
    if (dia <= Number(hoje().slice(8))) contasFixas.atualizar(rendaVigente(mes).id, { mesesPagos: [mes] });

    for (let n = 1; n <= qtdContas; n++) {
      const nome = $(`conta-nome-${n}`).value.trim();
      const valor = parseFloat($(`conta-valor-${n}`).value);
      const venc = parseInt($(`conta-dia-${n}`).value, 10);
      if (nome && valor > 0 && venc >= 1 && venc <= 31) {
        contasFixas.adicionar({
          tipo: 'despesa', nome, valor, dia: venc,
          categoria: $(`conta-cat-${n}`).value,
          inicio: mes, fim: null, mesesPagos: []
        });
      }
    }

    document.querySelectorAll('#campos-limites input').forEach(campo => {
      const limite = parseFloat(campo.value);
      if (limite > 0) categorias.atualizar(campo.dataset.categoria, { limite });
    });

    Auth.marcarPerfilConfigurado();
    modal.classList.remove('active');
    UI.avisar('Perfil configurado!');
    desenharTudo();
  });

  /* alterar salário */

  const janelaRenda = $('janela-renda');

  $('btn-editar-renda').addEventListener('click', () => {
    const atual = rendaVigente(mesEscolhido()) || rendaVigente(mesAtual());
    $('renda-nova').value = atual ? atual.valor : '';
    $('renda-dia-novo').value = atual ? atual.dia : '';
    $('renda-inicio').value = mesEscolhido();
    janelaRenda.showModal();
  });

  $('form-renda').addEventListener('submit', e => {
    e.preventDefault();
    const valor = parseFloat($('renda-nova').value);
    const dia = parseInt($('renda-dia-novo').value, 10);
    const inicio = $('renda-inicio').value;
    if (!(valor > 0) || !(dia >= 1 && dia <= 31) || !/^\d{4}-\d{2}$/.test(inicio)) return;
    salvarRenda(valor, dia, inicio);
    janelaRenda.close();
    UI.avisar('Salário atualizado.');
    desenharTudo();
  });

  desenharTudo();
  if (!Auth.perfilConfigurado()) abrirConfiguracao();
})();
