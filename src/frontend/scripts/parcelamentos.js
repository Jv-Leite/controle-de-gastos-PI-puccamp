/* parcelamentos.js: tela de Compras parceladas. Cadastro com prévia da parcela,
   tabela dos próximos 6 meses e um cartão por compra. */
(() => {
  'use strict';
  const { parcelamentos, mesAtual, somarMeses, diferencaMeses, mesCurto, nomeMes,
    moeda, plural, escapar, valorParcela, parcelasEmAberto, restanteDoParcelamento } = ContaAi;
  const $ = id => document.getElementById(id);

  const form = $('form-parcelamento');
  const [campoTotal, campoQtd, campoInicio] = [$('parc-total'), $('parc-qtd'), $('parc-inicio')];

  // parcela que cai no mês (0 se não houver)
  function parcelaNoMes(p, mes) {
    const i = diferencaMeses(mes, p.inicio); // 0 = mês da primeira parcela
    return i >= 0 && i < p.parcelas ? valorParcela(p, i) : 0;
  }

  /* --- formulário --- */

  // prévia ao digitar: "10x de R$ 150,00, até agosto de 2027."
  function atualizarPrevia() {
    const total = parseFloat(campoTotal.value);
    const qtd = parseInt(campoQtd.value, 10);
    const previa = $('previa-parcela');
    if (!(total > 0) || !(qtd >= 2)) { previa.textContent = ''; return; } // ainda incompleto
    const fim = campoInicio.value ? `, até ${nomeMes(somarMeses(campoInicio.value, qtd - 1))}` : '';
    previa.textContent = `${qtd}x de ${moeda(valorParcela({ total, parcelas: qtd }, 0))}${fim}.`;
  }
  // recalcula a cada tecla
  [campoTotal, campoQtd, campoInicio].forEach(c => c.addEventListener('input', atualizarPrevia));

  // valores iniciais: categoria "Compras" e mês atual
  function prepararForm() {
    $('parc-categoria').innerHTML = UI.opcoesCategorias('despesa', 'Compras');
    campoInicio.value = mesAtual();
    atualizarPrevia();
  }

  // salvar compra nova
  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = new FormData(form);
    const p = {
      descricao: dados.get('descricao').trim(),
      total: parseFloat(dados.get('total')),
      parcelas: parseInt(dados.get('parcelas'), 10),
      inicio: dados.get('inicio'),
      categoria: dados.get('categoria'),
      dia: parseInt(dados.get('dia'), 10) // dia do mês em que a parcela vence
    };
    // não salva dados inválidos
    if (!p.descricao || !(p.total > 0) || !(p.parcelas >= 2 && p.parcelas <= 48) ||
        !p.inicio || !p.categoria || !(p.dia >= 1 && p.dia <= 31)) return;

    // parcelas de meses passados já entram pagas (há 3 meses -> [0, 1, 2])
    const passadas = Math.max(0, Math.min(p.parcelas, diferencaMeses(mesAtual(), p.inicio)));
    parcelamentos.adicionar({ ...p, pagas: Array.from({ length: passadas }, (_, i) => i) });
    form.reset();
    prepararForm();
    UI.avisar('Parcelas geradas.');
    desenhar();
  });

  /* --- projeção dos próximos 6 meses --- */

  // linha por compra, coluna por mês, total no rodapé
  function desenharProjecao(lista) {
    const meses = Array.from({ length: 6 }, (_, i) => somarMeses(mesAtual(), i)); // este mês + 5
    // valores de cada compra nos 6 meses (sem parcela no período = fora)
    const linhas = lista
      .map(p => ({ p, valores: meses.map(m => parcelaNoMes(p, m)) }))
      .filter(l => l.valores.some(v => v > 0));

    $('projecao-wrap').hidden = linhas.length === 0;
    $('vazio-projecao').hidden = linhas.length > 0;
    if (!linhas.length) return;

    // total de cada mês
    const totais = meses.map((_, j) => linhas.reduce((s, l) => s + l.valores[j], 0));
    const celula = v => v > 0 ? `<td>${moeda(v)}</td>` : '<td class="sem-parcela">—</td>';

    $('tabela-projecao').innerHTML = `
      <thead><tr><th scope="col">Compra</th>${meses.map(m => `<th scope="col">${mesCurto(m)}</th>`).join('')}</tr></thead>
      <tbody>${linhas.map(l => `<tr><th scope="row">${escapar(l.p.descricao)}</th>${l.valores.map(celula).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">Total do mês</th>${totais.map(t => `<td class="valor-negativo">${moeda(t)}</td>`).join('')}</tr></tfoot>`;
  }

  /* --- cartões das compras --- */

  // cartão: total, progresso, quanto falta e próxima parcela
  function cartao(p) {
    const n = Number(p.parcelas);
    const pagas = n - parcelasEmAberto(p).length;
    const proxima = parcelasEmAberto(p)[0]; // primeira parcela em aberto (undefined se quitou)
    const quitada = proxima === undefined;

    // índice começa em 0, por isso "proxima + 1"
    return `<li><article class="card compra" data-id="${escapar(p.id)}">
      <div class="compra-topo">
        <h3>${escapar(p.descricao)}</h3>
        <span class="selo ${quitada ? 'selo-pago' : 'selo-pendente'}">${quitada ? 'quitada' : `${pagas}/${n} pagas`}</span>
      </div>
      <p class="compra-valor"><strong class="valor">${moeda(p.total)}</strong> em ${n}x de ${moeda(valorParcela(p, 0))}</p>
      <progress max="${n}" value="${pagas}">${pagas} de ${n} parcelas pagas</progress>
      <p class="compra-linha"><span>${UI.rotuloCategoria(p.categoria)}</span><span>${mesCurto(p.inicio)} a ${mesCurto(somarMeses(p.inicio, n - 1))}</span></p>
      <p class="compra-linha"><span>Falta pagar</span><strong>${moeda(restanteDoParcelamento(p))}</strong></p>
      ${quitada ? '' : `<p class="compra-linha"><span>Próxima parcela</span><strong>${proxima + 1}ª em ${mesCurto(somarMeses(p.inicio, proxima))}</strong></p>`}
      <div class="acoes-linha">
        ${quitada ? '' : `<button type="button" class="btn-linha" data-acao="pagar">Pagar ${proxima + 1}ª parcela</button>`}
        <button type="button" class="btn-linha btn-linha-perigo" data-acao="excluir">Excluir</button>
      </div>
    </article></li>`;
  }

  // redesenha tudo
  function desenhar() {
    const lista = parcelamentos.todos();
    const mes = mesAtual();

    desenharProjecao(lista);
    $('lista-compras').innerHTML = lista.map(cartao).join('');
    $('vazio-compras').hidden = lista.length > 0;

    const doMes = lista.map(p => parcelaNoMes(p, mes)).filter(v => v > 0); // parcelas deste mês
    const ativas = lista.filter(p => parcelasEmAberto(p).length > 0);      // compras não quitadas

    $('total-mes').textContent = moeda(doMes.reduce((s, v) => s + v, 0));
    $('total-mes-nota').textContent = doMes.length ? `${plural(doMes.length, 'parcela')} em ${nomeMes(mes)}` : 'nenhuma parcela';
    $('total-restante').textContent = moeda(lista.reduce((s, p) => s + restanteDoParcelamento(p), 0));
    $('qtd-ativas').textContent = ativas.length;
    $('qtd-ativas-nota').textContent = `de ${plural(lista.length, 'cadastrada')}`;
  }

  // botões dos cartões (veja UI.acoes)
  UI.acoes($('lista-compras'), async (acao, id) => {
    const p = parcelamentos.buscar(id);
    if (!p) return;

    if (acao === 'pagar') {
      // paga a próxima parcela em aberto
      parcelamentos.atualizar(p.id, { pagas: [...(p.pagas || []), parcelasEmAberto(p)[0]] });
      UI.avisar('Parcela marcada como paga.');
    } else {
      if (!await UI.confirmar(`Excluir a compra "${p.descricao}" e todas as parcelas?`)) return;
      parcelamentos.remover(p.id);
      UI.avisar('Compra excluída.');
    }
    desenhar();
  });

  // ao abrir a página
  prepararForm();
  desenhar();
})();
