//visão geral
(() => {
  'use strict';
  const { contasFixas, resumoDoMes, gastosPorCategoria, mesAtual, somarMeses,
    mesCurto, moeda, escapar, classeCategoria } = ContaAi;

  /*modal de config do perfil*/

  const modal = document.getElementById('modal-perfil');
  const formulario = document.getElementById('form-perfil');

  if (localStorage.getItem('perfilConfigurado') === 'false' && modal) {
    modal.classList.add('active');
  }

  if (formulario) {
    formulario.addEventListener('submit', evento => {
      evento.preventDefault();

      const renda = parseFloat(document.getElementById('renda').value);
      const diaRecebimento = parseInt(document.getElementById('dia-recebimento').value, 10);
      const contaNome = document.getElementById('conta-nome').value.trim();
      const contaValor = parseFloat(document.getElementById('conta-valor').value);
      const contaVencimento = parseInt(document.getElementById('conta-vencimento').value, 10);

      localStorage.setItem('dadosFinanceiros', JSON.stringify({
        renda: { valor: renda, dia: diaRecebimento },
        contaFixa: { nome: contaNome, valor: contaValor, vencimento: contaVencimento }
      }));

      //a renda vira uma receita fixa e a conta vira uma despesa fixa
      // se já existir uma com o mesmo nome e tipo vai trocar em vez de somar
      function salvarFixa(dados) {
        contasFixas.todos()
          .filter(c => c.nome === dados.nome && c.tipo === dados.tipo)
          .forEach(c => contasFixas.remover(c.id));
        contasFixas.adicionar(dados);
      }

      salvarFixa({
        tipo: 'receita', nome: 'Renda mensal', valor: renda,
        dia: diaRecebimento, categoria: 'Salário', pagoMes: null
      });

      if (contaNome && contaValor > 0 && contaVencimento >= 1) {
        salvarFixa({
          tipo: 'despesa', nome: contaNome, valor: contaValor,
          dia: contaVencimento, categoria: '', pagoMes: null
        });
      }

      localStorage.setItem('perfilConfigurado', 'true');
      modal.classList.remove('active');
      desenharResumo();
      desenharGraficos();
    });
  }

  /*resumo do mes*/

  function desenharResumo() {
    const r = resumoDoMes(mesAtual());
    document.getElementById('saldo-previsto').textContent = moeda(r.saldo);
    document.getElementById('total-receitas').textContent = moeda(r.receitas);
    document.getElementById('total-despesas').textContent = moeda(r.despesas);
    document.getElementById('total-a-pagar').textContent = moeda(r.aPagar);
  }

  /*grafico*/

  function desenharGraficos() {
    //gastos por categoria no mês
    const gastos = Object.entries(gastosPorCategoria(mesAtual()))
      .sort((a, b) => b[1] - a[1]);
    const total = gastos.reduce((s, [, v]) => s + v, 0);
    const boxCategorias = document.getElementById('grafico-categorias');

    boxCategorias.innerHTML = total === 0
      ? '<p class="vazio">Nenhuma despesa lançada neste mês.</p>'
      : `<ul class="grafico-itens">${gastos.map(([nome, valor]) => {
          const pct = Math.round((valor / total) * 100);
          return `<li class="${classeCategoria(nome)}">
            <p class="grafico-linha"><span class="categoria-rotulo ${classeCategoria(nome)}"><span class="bolinha"></span>${escapar(nome)}</span>
            <span>${pct}% · ${moeda(valor)}</span></p>
            <span class="barra"><span class="barra-preench" style="width:${pct}%"></span></span>
          </li>`;
        }).join('')}</ul>`;

    //receitas e despesas nos últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(somarMeses(mesAtual(), -i));
    const dados = meses.map(m => ({ mes: m, ...resumoDoMes(m, m >= mesAtual()) }));
    const maior = Math.max(...dados.map(d => Math.max(d.receitas, d.despesas)));
    const boxComparativo = document.getElementById('grafico-comparativo');

    boxComparativo.innerHTML = maior === 0
      ? '<p class="vazio">Ainda não há receitas ou despesas para comparar.</p>'
      : `<ul class="grafico-itens">${dados.map(d => `<li>
          <p class="grafico-linha"><strong>${mesCurto(d.mes)}</strong>
          <span>${moeda(d.receitas)} × ${moeda(d.despesas)}</span></p>
          <span class="barra" title="Receitas"><span class="barra-preench barra-receita" style="width:${(d.receitas / maior) * 100}%"></span></span>
          <span class="barra" title="Despesas" style="margin-top:4px"><span class="barra-preench barra-despesa" style="width:${(d.despesas / maior) * 100}%"></span></span>
        </li>`).join('')}</ul>
        <p class="grafico-legenda"><span class="barra-receita legenda-ponto"></span> Receitas
        <span class="barra-despesa legenda-ponto"></span> Despesas</p>`;
  }

  desenharResumo();
  desenharGraficos();
})();
