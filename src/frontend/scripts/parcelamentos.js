// Parcelamentos: cadastrar a compra, gerar as parcelas como lançamentos
// (despesas pendentes nos meses seguintes), marcar parcelas pagas e excluir.
(() => {
  'use strict';
  const { parcelamentos, lancamentos, categorias, hoje, mesAtual, somarMeses,
    mesCurto, nomeMes, moeda, escapar, classeCategoria } = ContaAi;

  const form = document.getElementById('form-parcelamento');
  const selectCategoria = document.getElementById('parc-categoria');
  const campoInicio = document.getElementById('parc-inicio');
  const listaCompras = document.getElementById('lista-compras');
  const avisoCompras = document.getElementById('vazio-compras');
  const tabela = document.getElementById('tabela-projecao');
  const tabelaWrap = document.getElementById('projecao-wrap');
  const avisoProjecao = document.getElementById('vazio-projecao');

  /* ----- formulário ----- */

  function prepararFormulario() {
    selectCategoria.innerHTML = categorias.todos()
      .filter(c => c.tipo === 'despesa')
      .map(c => `<option value="${escapar(c.nome)}">${escapar(c.nome)}</option>`)
      .join('');
    campoInicio.value = mesAtual();
  }

  form.addEventListener('reset', () => setTimeout(prepararFormulario, 0));

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    const dados = new FormData(form);
    const descricao = dados.get('descricao').trim();
    const total = parseFloat(dados.get('total'));
    const qtd = parseInt(dados.get('parcelas'), 10);
    const categoria = dados.get('categoria');
    const inicio = dados.get('inicio');
    const dia = String(parseInt(dados.get('dia'), 10)).padStart(2, '0');
    if (!descricao || !(total > 0) || !(qtd >= 2) || !inicio) return;

    // divide em centavos; a diferença da divisão vai para a última parcela
    const centavos = Math.round(total * 100);
    const base = Math.floor(centavos / qtd);
    const resto = centavos - base * qtd;

    const compra = parcelamentos.adicionar({ descricao, total, qtd, categoria, inicio, valorParcela: base / 100 });

    for (let i = 0; i < qtd; i++) {
      lancamentos.adicionar({
        tipo: 'despesa',
        descricao,
        valor: (base + (i === qtd - 1 ? resto : 0)) / 100,
        data: `${somarMeses(inicio, i)}-${dia}`,
        categoria,
        situacao: 'pendente',
        parcela: `${i + 1}/${qtd}`,
        parcelamentoId: compra.id
      });
    }

    form.reset();
    desenhar();
  });

  /* ----- compras ----- */

  function parcelasDe(compra) {
    return lancamentos.todos()
      .filter(l => l.parcelamentoId === compra.id)
      .sort((a, b) => a.data.localeCompare(b.data));
  }

  function statusParcela(l) {
    if (l.situacao === 'pago') return ['parcela-paga', 'paga'];
    if (l.data < hoje()) return ['parcela-atrasada', 'atrasada'];
    return ['', 'prevista'];
  }

  function cartao(compra) {
    const parcelas = parcelasDe(compra);
    const pagas = parcelas.filter(p => p.situacao === 'pago').length;
    const atrasadas = parcelas.filter(p => p.situacao !== 'pago' && p.data < hoje()).length;
    const falta = parcelas.filter(p => p.situacao !== 'pago').reduce((s, p) => s + p.valor, 0);

    let etiqueta = '<span class="etiqueta etiqueta-ok">em dia</span>';
    if (atrasadas > 0) {
      etiqueta = `<span class="etiqueta etiqueta-erro">${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}</span>`;
    } else if (pagas === compra.qtd) {
      etiqueta = '<span class="etiqueta etiqueta-ok">quitada</span>';
    }

    const itens = parcelas.map(p => {
      const [classe, texto] = statusParcela(p);
      const atual = p.data.startsWith(mesAtual()) ? ' parcela-atual' : '';
      return `<li class="parcela ${classe}${atual}" data-id="${p.id}" role="button" tabindex="0" title="Clique para marcar como paga ou desfazer">
        <strong>${escapar(p.parcela)}</strong><span>${mesCurto(p.data.slice(0, 7))}</span><span>${texto}</span></li>`;
    }).join('');

    return `
      <article class="card compra ${classeCategoria(compra.categoria)}" data-compra="${compra.id}">
        <div class="cartao-topo">
          <div>
            <h3>${escapar(compra.descricao)}</h3>
            <p class="cartao-subtitulo">${moeda(compra.total)} em ${compra.qtd}x de ${moeda(compra.valorParcela)} · ${escapar(compra.categoria)}</p>
          </div>
          ${etiqueta}
        </div>

        <p class="barra-legenda"><span>${pagas} de ${compra.qtd} parcelas pagas</span><span>Falta pagar ${moeda(falta)}</span></p>
        <progress max="${compra.qtd}" value="${pagas}">${pagas} de ${compra.qtd}</progress>

        <ol class="parcelas" aria-label="Parcelas de ${escapar(compra.descricao)}">${itens}</ol>

        <div class="card-acoes">
          <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir compra</button>
        </div>
      </article>`;
  }

  function alternarParcela(li) {
    const l = lancamentos.buscar(li.dataset.id);
    lancamentos.atualizar(l.id, { situacao: l.situacao === 'pago' ? 'pendente' : 'pago' });
    desenhar();
  }

  listaCompras.addEventListener('click', evento => {
    const botao = evento.target.closest('button[data-acao="excluir"]');
    if (botao) {
      const id = botao.closest('article').dataset.compra;
      const compra = parcelamentos.buscar(id);
      if (!confirm(`Excluir "${compra.descricao}" e todas as parcelas dos lançamentos?`)) return;
      lancamentos.salvar(lancamentos.todos().filter(l => l.parcelamentoId !== id));
      parcelamentos.remover(id);
      desenhar();
      return;
    }
    const parcela = evento.target.closest('li.parcela[data-id]');
    if (parcela) alternarParcela(parcela);
  });

  listaCompras.addEventListener('keydown', evento => {
    const parcela = evento.target.closest('li.parcela[data-id]');
    if (parcela && (evento.key === 'Enter' || evento.key === ' ')) {
      evento.preventDefault();
      alternarParcela(parcela);
    }
  });

  /* ----- projeção dos próximos meses ----- */

  function rotuloMes(ym) {
    const [nome, , ano] = nomeMes(ym).split(' ');
    return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${ano}`;
  }

  function desenharProjecao(compras) {
    tabelaWrap.hidden = compras.length === 0;
    avisoProjecao.hidden = compras.length > 0;
    if (!compras.length) { tabela.innerHTML = ''; return; }

    const parcelas = lancamentos.todos().filter(l => l.parcelamentoId);
    let ultimo = mesAtual();
    parcelas.forEach(p => { if (p.data.slice(0, 7) > ultimo) ultimo = p.data.slice(0, 7); });

    const meses = [];
    for (let m = mesAtual(); m <= ultimo && meses.length < 12; m = somarMeses(m, 1)) meses.push(m);

    const totalPorCompra = compras.map(() => 0);
    let totalGeral = 0;

    const linhas = meses.map(mes => {
      let totalMes = 0;
      const celulas = compras.map((compra, i) => {
        const p = parcelas.find(x => x.parcelamentoId === compra.id && x.data.startsWith(mes));
        if (!p) return '<td class="coluna-valor">—</td>';
        totalMes += p.valor;
        totalPorCompra[i] += p.valor;
        return `<td class="coluna-valor valor">${moeda(p.valor)} <span class="parcela-numero">${escapar(p.parcela)}</span></td>`;
      }).join('');
      totalGeral += totalMes;
      return `<tr><th scope="row">${rotuloMes(mes)}</th>${celulas}<td class="coluna-valor valor">${moeda(totalMes)}</td></tr>`;
    }).join('');

    tabela.innerHTML = `
      <caption>Parcelas já agendadas a partir de ${nomeMes(mesAtual())}</caption>
      <thead><tr>
        <th scope="col">Mês</th>
        ${compras.map(c => `<th scope="col" class="coluna-valor">${escapar(c.descricao)}</th>`).join('')}
        <th scope="col" class="coluna-valor">Total do mês</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr>
        <th scope="row">Total agendado</th>
        ${totalPorCompra.map(v => `<td class="coluna-valor valor">${moeda(v)}</td>`).join('')}
        <td class="coluna-valor valor">${moeda(totalGeral)}</td>
      </tr></tfoot>`;
  }

  function desenhar() {
    const compras = parcelamentos.todos();
    listaCompras.innerHTML = compras.map(cartao).join('');
    avisoCompras.hidden = compras.length > 0;
    desenharProjecao(compras);
  }

  prepararFormulario();
  desenhar();
})();
