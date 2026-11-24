// dados.js: armazenamento (localStorage) e cálculos usados por todas as telas.
// Precisa ser carregado depois do auth.js.
const ContaAi = (() => {
  'use strict';

  // cada usuário tem suas próprias chaves no localStorage
  function usuarioAtual() {
    const s = typeof Auth !== 'undefined' ? Auth.sessao() : null;
    return s ? s.email : 'visitante';
  }
  const chave = nome => `ca_dados_${usuarioAtual()}_${nome}`;

  // só aceita listas: dado corrompido ou alterado à mão vira lista vazia
  function ler(nome) {
    try {
      const valor = JSON.parse(localStorage.getItem(chave(nome)));
      return Array.isArray(valor) ? valor.filter(i => i && typeof i === 'object') : null;
    } catch {
      return null;
    }
  }

  function gravar(nome, valor) {
    localStorage.setItem(chave(nome), JSON.stringify(valor));
  }

  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function colecao(nome) {
    return {
      todos() { return ler(nome) || []; },
      salvar(itens) { gravar(nome, itens); },
      adicionar(item) {
        const itens = this.todos();
        const novo = { id: novoId(), ...item };
        itens.push(novo);
        this.salvar(itens);
        return novo;
      },
      atualizar(id, mudancas) {
        this.salvar(this.todos().map(i => (i.id === id ? { ...i, ...mudancas } : i)));
      },
      remover(id) {
        this.salvar(this.todos().filter(i => i.id !== id));
      },
      buscar(id) {
        return this.todos().find(i => i.id === id);
      }
    };
  }

  const lancamentos = colecao('lancamentos');
  const contasFixas = colecao('contas_fixas');
  const parcelamentos = colecao('parcelamentos');
  const metas = colecao('metas');

  /* categorias */

  // paleta fixa das categorias (sempre na mesma ordem)
  const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#0891b2', '#9a5b2e'];
  const COR_OUTRAS = '#8a8984';

  const CATEGORIAS_PADRAO = [
    { nome: 'Moradia', tipo: 'despesa', cor: PALETA[0] },
    { nome: 'Alimentação', tipo: 'despesa', cor: PALETA[1] },
    { nome: 'Transporte', tipo: 'despesa', cor: PALETA[2] },
    { nome: 'Lazer', tipo: 'despesa', cor: PALETA[3] },
    { nome: 'Saúde', tipo: 'despesa', cor: PALETA[4] },
    { nome: 'Compras', tipo: 'despesa', cor: PALETA[5] },
    { nome: 'Salário', tipo: 'receita', cor: PALETA[0] },
    { nome: 'Outras receitas', tipo: 'receita', cor: PALETA[1] }
  ];

  const baseCategorias = colecao('categorias');
  const categorias = {
    ...baseCategorias,
    todos() {
      const salvas = ler('categorias');
      if (salvas) return salvas;
      const iniciais = CATEGORIAS_PADRAO.map(c => ({ id: novoId(), limite: null, ...c }));
      gravar('categorias', iniciais);
      return iniciais;
    },
    doTipo(tipo) {
      return this.todos().filter(c => c.tipo === tipo);
    },
    porNome(nome) {
      return this.todos().find(c => c.nome === nome);
    },
    proximaCor(tipo) {
      const usadas = this.doTipo(tipo).map(c => c.cor);
      return PALETA.find(cor => !usadas.includes(cor)) || COR_OUTRAS;
    },
    // ao renomear, os registros que usam a categoria acompanham
    renomear(id, novoNome) {
      const antiga = this.buscar(id);
      if (!antiga || antiga.nome === novoNome) return;
      const troca = item => (item.categoria === antiga.nome ? { ...item, categoria: novoNome } : item);
      lancamentos.salvar(lancamentos.todos().map(troca));
      contasFixas.salvar(contasFixas.todos().map(troca));
      parcelamentos.salvar(parcelamentos.todos().map(troca));
      this.atualizar(id, { nome: novoNome });
    }
  };

  // a cor vai para o atributo style, então só aceita o formato #rrggbb
  const corValida = cor => (/^#[0-9a-f]{6}$/i.test(cor) ? cor : COR_OUTRAS);

  function corDaCategoria(nome) {
    const c = categorias.porNome(nome);
    return corValida(c && c.cor);
  }

  /* datas e formatação */

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const pad = n => String(n).padStart(2, '0');

  function hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const mesAtual = () => hoje().slice(0, 7);

  // as funções de data convertem para número, então nunca devolvem texto arbitrário
  const partes = iso => String(iso).split('-').map(Number);

  function nomeMes(ym) {
    const [ano, mes] = partes(ym);
    return `${MESES[mes - 1]} de ${ano}`;
  }

  function mesCurto(ym) {
    const [ano, mes] = partes(ym);
    return `${(MESES[mes - 1] || '').slice(0, 3)}/${String(ano).slice(2)}`;
  }

  function somarMeses(ym, n) {
    const [ano, mes] = partes(ym);
    const total = ano * 12 + (mes - 1) + n;
    return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
  }

  function diferencaMeses(a, b) {
    const [aa, am] = partes(a);
    const [ba, bm] = partes(b);
    return (aa * 12 + am) - (ba * 12 + bm);
  }

  function diasNoMes(ym) {
    const [ano, mes] = partes(ym);
    return new Date(ano, mes, 0).getDate();
  }

  // dia 31 vira o último dia em meses mais curtos
  const dataNoMes = (ym, dia) => `${ym}-${pad(Math.min(dia, diasNoMes(ym)))}`;

  function diasAte(iso) {
    const [a, m, d] = partes(iso);
    const [ha, hm, hd] = partes(hoje());
    return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000);
  }

  function formatarData(iso) {
    const [ano, mes, dia] = partes(iso);
    return `${pad(dia)}/${pad(mes)}/${ano}`;
  }

  const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const moeda = valor => formatoMoeda.format(valor || 0).replace(/ /g, ' ');
  const arredondar = v => Math.round(v * 100) / 100;
  const porcentagem = (parte, total) => Math.round((parte / total) * 100);
  const plural = (n, um, varios = um + 's') => `${n} ${n === 1 ? um : varios}`;

  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* parcelas */

  // a última parcela absorve a diferença de centavos
  function valorParcela(p, indice) {
    const base = Math.floor((p.total / p.parcelas) * 100) / 100;
    return indice === p.parcelas - 1 ? arredondar(p.total - base * (p.parcelas - 1)) : base;
  }

  // índices das parcelas que ainda não foram pagas
  const parcelasEmAberto = p => Array.from({ length: p.parcelas }, (_, i) => i)
    .filter(i => !(p.pagas || []).includes(i));
  const restanteDoParcelamento = p => parcelasEmAberto(p).reduce((s, i) => s + valorParcela(p, i), 0);

  /* movimentos do mês: junta lançamentos, contas fixas e parcelas */

  function movimentosDoMes(mes) {
    const lista = [];

    lancamentos.todos().filter(l => String(l.data).startsWith(mes)).forEach(l => {
      lista.push({ ...l, origem: 'lancamento', refId: l.id });
    });

    contasFixas.todos().forEach(c => {
      if (c.inicio > mes || (c.fim && c.fim < mes)) return;
      lista.push({
        id: `fixa-${c.id}-${mes}`, origem: 'fixa', refId: c.id, mes,
        tipo: c.tipo, descricao: c.nome, valor: c.valor,
        data: dataNoMes(mes, c.dia), categoria: c.categoria || '',
        situacao: (c.mesesPagos || []).includes(mes) ? 'pago' : 'pendente'
      });
    });

    parcelamentos.todos().forEach(p => {
      const i = diferencaMeses(mes, p.inicio);
      if (i < 0 || i >= p.parcelas) return;
      lista.push({
        id: `parc-${p.id}-${i}`, origem: 'parcela', refId: p.id, indice: i,
        tipo: 'despesa', descricao: p.descricao, valor: valorParcela(p, i),
        data: dataNoMes(mes, p.dia), categoria: p.categoria,
        situacao: (p.pagas || []).includes(i) ? 'pago' : 'pendente',
        parcela: `${i + 1}/${p.parcelas}`
      });
    });

    return lista.sort((a, b) => a.data.localeCompare(b.data));
  }

  // muda pago/pendente, seja qual for a origem do movimento
  function alternarSituacao(mov) {
    if (mov.origem === 'lancamento') {
      lancamentos.atualizar(mov.refId, { situacao: mov.situacao === 'pago' ? 'pendente' : 'pago' });
    } else if (mov.origem === 'fixa') {
      const c = contasFixas.buscar(mov.refId);
      const pagos = new Set(c.mesesPagos || []);
      pagos.has(mov.mes) ? pagos.delete(mov.mes) : pagos.add(mov.mes);
      contasFixas.atualizar(c.id, { mesesPagos: [...pagos] });
    } else if (mov.origem === 'parcela') {
      const p = parcelamentos.buscar(mov.refId);
      const pagas = new Set(p.pagas || []);
      pagas.has(mov.indice) ? pagas.delete(mov.indice) : pagas.add(mov.indice);
      parcelamentos.atualizar(p.id, { pagas: [...pagas] });
    }
  }

  // pago | atrasado | proximo (vence em até 5 dias) | pendente
  function estadoDe(mov) {
    if (mov.situacao === 'pago') return 'pago';
    if (mov.tipo === 'receita') return 'pendente';
    const dias = diasAte(mov.data);
    if (dias < 0) return 'atrasado';
    if (dias <= 5) return 'proximo';
    return 'pendente';
  }

  function resumoDoMes(mes) {
    const r = { receitas: 0, despesas: 0, aPagar: 0, recebido: 0, pago: 0 };
    movimentosDoMes(mes).forEach(m => {
      if (m.tipo === 'receita') {
        r.receitas += m.valor;
        if (m.situacao === 'pago') r.recebido += m.valor;
      } else {
        r.despesas += m.valor;
        if (m.situacao === 'pago') r.pago += m.valor; else r.aPagar += m.valor;
      }
    });
    r.saldo = r.receitas - r.despesas;
    return r;
  }

  function gastosPorCategoria(mes) {
    const gastos = {};
    movimentosDoMes(mes).filter(m => m.tipo === 'despesa').forEach(m => {
      const nome = m.categoria || 'Sem categoria';
      gastos[nome] = (gastos[nome] || 0) + m.valor;
    });
    return gastos;
  }

  /* economia e metas */

  function primeiroMes() {
    const meses = [
      ...lancamentos.todos().map(l => String(l.data).slice(0, 7)),
      ...contasFixas.todos().map(c => c.inicio),
      ...parcelamentos.todos().map(p => p.inicio)
    ].filter(Boolean).sort();
    return meses[0] || mesAtual();
  }

  // economia acumulada: só o que já foi recebido e pago, até o mês atual
  function economiaAcumulada() {
    let receitas = 0, despesas = 0;
    const fim = mesAtual();
    for (let m = primeiroMes(); m <= fim; m = somarMeses(m, 1)) {
      const r = resumoDoMes(m);
      receitas += r.recebido;
      despesas += r.pago;
    }
    return { receitas, despesas, total: receitas - despesas };
  }

  const guardadoDaMeta = m => (m.guardadoInicial || 0) + (m.aportes || 0);
  const totalAportado = () => metas.todos().reduce((s, m) => s + (m.aportes || 0), 0);
  const disponivelParaMetas = () => arredondar(economiaAcumulada().total - totalAportado());

  return {
    COR_OUTRAS,
    lancamentos, categorias, contasFixas, parcelamentos, metas,
    hoje, mesAtual, nomeMes, mesCurto, somarMeses, diferencaMeses, diasAte,
    formatarData, moeda, arredondar, porcentagem, plural, escapar, corValida, corDaCategoria,
    valorParcela, parcelasEmAberto, restanteDoParcelamento, movimentosDoMes, alternarSituacao, estadoDe,
    resumoDoMes, gastosPorCategoria,
    economiaAcumulada, guardadoDaMeta, disponivelParaMetas
  };
})();
