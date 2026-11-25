/* dados.js: onde os dados ficam salvos e os cálculos usados em todas as telas.
   Tudo fica em ContaAi (ex.: ContaAi.moeda). Carregar depois do auth.js.
   Datas: "2026-11-24" (dia) e "2026-11" (mês, chamado de "ym"). */
const ContaAi = (() => {
  'use strict';

  /* --- armazenamento --- */

  // e-mail do usuário logado (cada um tem seus próprios dados)
  function usuarioAtual() {
    const s = typeof Auth !== 'undefined' ? Auth.sessao() : null;
    return s ? s.email : 'visitante';
  }

  // nome da chave: chave('metas') -> "ca_dados_ana@x.com_metas"
  const chave = nome => `ca_dados_${usuarioAtual()}_${nome}`;

  // lê uma lista; se o dado estiver estragado devolve null (a tela trata como vazia)
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

  // id único: horário atual + trecho aleatório
  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // funções prontas (listar, adicionar, atualizar, remover, buscar) para uma lista salva
  function colecao(nome) {
    return {
      todos() { return ler(nome) || []; },
      salvar(itens) { gravar(nome, itens); },
      adicionar(item) {
        const itens = this.todos();
        const novo = { id: novoId(), ...item }; // ...item copia os campos
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

  const lancamentos = colecao('lancamentos');     // receitas e despesas avulsas
  const contasFixas = colecao('contas_fixas');    // se repetem todo mês
  const parcelamentos = colecao('parcelamentos'); // compras parceladas
  const metas = colecao('metas');                 // metas de economia

  /* --- categorias --- */

  // cores usadas em ordem nas categorias novas
  const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#0891b2', '#9a5b2e'];
  const COR_OUTRAS = '#8a8984'; // cinza: "Outras" e cores inválidas

  // criadas no primeiro acesso
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

  // coleção comum + funções próprias de categoria
  const baseCategorias = colecao('categorias');
  const categorias = {
    ...baseCategorias,
    // nada salvo ainda: cria as categorias padrão
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
    // primeira cor da paleta ainda não usada
    proximaCor(tipo) {
      const usadas = this.doTipo(tipo).map(c => c.cor);
      return PALETA.find(cor => !usadas.includes(cor)) || COR_OUTRAS;
    },
    // os registros guardam o NOME da categoria, então todos são atualizados junto
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

  // só aceita cor #rrggbb (a cor vai num atributo style; evita injeção de código)
  const corValida = cor => (/^#[0-9a-f]{6}$/i.test(cor) ? cor : COR_OUTRAS);

  function corDaCategoria(nome) {
    const c = categorias.porNome(nome);
    return corValida(c && c.cor);
  }

  /* --- datas e formatação --- */

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const pad = n => String(n).padStart(2, '0'); // 5 -> "05"

  // hoje em "aaaa-mm-dd" (getMonth começa em 0)
  function hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const mesAtual = () => hoje().slice(0, 7); // "2026-11"

  // "2026-11-24" -> [2026, 11, 24]. Virar número impede texto estranho na tela
  const partes = iso => String(iso).split('-').map(Number);

  // "2026-11" -> "novembro de 2026"
  function nomeMes(ym) {
    const [ano, mes] = partes(ym);
    return `${MESES[mes - 1]} de ${ano}`;
  }

  // "2026-11" -> "nov/26"
  function mesCurto(ym) {
    const [ano, mes] = partes(ym);
    return `${(MESES[mes - 1] || '').slice(0, 3)}/${String(ano).slice(2)}`;
  }

  // somarMeses("2026-11", 3) -> "2027-02" (conta em meses totais para virar o ano certo)
  function somarMeses(ym, n) {
    const [ano, mes] = partes(ym);
    const total = ano * 12 + (mes - 1) + n;
    return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
  }

  // meses de b até a: ("2027-01", "2026-11") -> 2
  function diferencaMeses(a, b) {
    const [aa, am] = partes(a);
    const [ba, bm] = partes(b);
    return (aa * 12 + am) - (ba * 12 + bm);
  }

  // o "dia 0" do mês seguinte é o último dia deste
  function diasNoMes(ym) {
    const [ano, mes] = partes(ym);
    return new Date(ano, mes, 0).getDate();
  }

  // data de vencimento no mês; dia 31 vira o último dia em meses curtos
  const dataNoMes = (ym, dia) => `${ym}-${pad(Math.min(dia, diasNoMes(ym)))}`;

  // dias até a data (negativo = já passou). UTC evita erro de horário de verão
  function diasAte(iso) {
    const [a, m, d] = partes(iso);
    const [ha, hm, hd] = partes(hoje());
    return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000); // ms em 1 dia
  }

  // "2026-11-24" -> "24/11/2026"
  function formatarData(iso) {
    const [ano, mes, dia] = partes(iso);
    return `${pad(dia)}/${pad(mes)}/${ano}`;
  }

  // 1234.5 -> "R$ 1.234,50" (troca o espaço especial   por espaço comum)
  const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const moeda = valor => formatoMoeda.format(valor || 0).replace(/ /g, ' ');

  const arredondar = v => Math.round(v * 100) / 100;                      // 2 casas
  const porcentagem = (parte, total) => Math.round((parte / total) * 100); // inteiro
  const plural = (n, um, varios = um + 's') => `${n} ${n === 1 ? um : varios}`; // "1 conta" / "2 contas"

  // troca < > & " ' por códigos seguros, para texto do usuário não virar HTML
  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* --- parcelas --- */

  // valor da parcela "indice" (começa em 0); a última leva os centavos que sobram
  // ex.: R$ 100 em 3x -> 33,33 + 33,33 + 33,34
  function valorParcela(p, indice) {
    const base = Math.floor((p.total / p.parcelas) * 100) / 100;
    return indice === p.parcelas - 1 ? arredondar(p.total - base * (p.parcelas - 1)) : base;
  }

  // índices ainda não pagos. Ex.: 4 parcelas, pagas [0, 1] -> [2, 3]
  const parcelasEmAberto = p => Array.from({ length: p.parcelas }, (_, i) => i)
    .filter(i => !(p.pagas || []).includes(i));
  const restanteDoParcelamento = p => parcelasEmAberto(p).reduce((s, i) => s + valorParcela(p, i), 0);

  /* --- movimentos do mês --- */

  // junta tudo do mês: lançamentos, contas fixas e parcelas.
  // Contas e parcelas não são salvas mês a mês: são geradas aqui a partir do cadastro.
  // origem = de onde veio; refId = id do registro original. Sai ordenado por data.
  function movimentosDoMes(mes) {
    const lista = [];

    lancamentos.todos().filter(l => String(l.data).startsWith(mes)).forEach(l => {
      lista.push({ ...l, origem: 'lancamento', refId: l.id });
    });

    contasFixas.todos().forEach(c => {
      if (c.inicio > mes || (c.fim && c.fim < mes)) return; // fora do período
      lista.push({
        id: `fixa-${c.id}-${mes}`, origem: 'fixa', refId: c.id, mes,
        tipo: c.tipo, descricao: c.nome, valor: c.valor,
        data: dataNoMes(mes, c.dia), categoria: c.categoria || '',
        situacao: (c.mesesPagos || []).includes(mes) ? 'pago' : 'pendente' // meses pagos ficam numa lista
      });
    });

    parcelamentos.todos().forEach(p => {
      const i = diferencaMeses(mes, p.inicio); // qual parcela cai neste mês
      if (i < 0 || i >= p.parcelas) return;
      lista.push({
        id: `parc-${p.id}-${i}`, origem: 'parcela', refId: p.id, indice: i,
        tipo: 'despesa', descricao: p.descricao, valor: valorParcela(p, i),
        data: dataNoMes(mes, p.dia), categoria: p.categoria,
        situacao: (p.pagas || []).includes(i) ? 'pago' : 'pendente',
        parcela: `${i + 1}/${p.parcelas}` // "2/10"
      });
    });

    return lista.sort((a, b) => a.data.localeCompare(b.data));
  }

  // pago <-> pendente; cada origem guarda isso num lugar diferente
  function alternarSituacao(mov) {
    if (mov.origem === 'lancamento') {
      lancamentos.atualizar(mov.refId, { situacao: mov.situacao === 'pago' ? 'pendente' : 'pago' });
    } else if (mov.origem === 'fixa') {
      const c = contasFixas.buscar(mov.refId);
      const pagos = new Set(c.mesesPagos || []); // Set = lista sem repetição
      pagos.has(mov.mes) ? pagos.delete(mov.mes) : pagos.add(mov.mes);
      contasFixas.atualizar(c.id, { mesesPagos: [...pagos] });
    } else if (mov.origem === 'parcela') {
      const p = parcelamentos.buscar(mov.refId);
      const pagas = new Set(p.pagas || []);
      pagas.has(mov.indice) ? pagas.delete(mov.indice) : pagas.add(mov.indice);
      parcelamentos.atualizar(p.id, { pagas: [...pagas] });
    }
  }

  // estado para o selo: pago | atrasado | proximo (até 5 dias) | pendente
  function estadoDe(mov) {
    if (mov.situacao === 'pago') return 'pago';
    if (mov.tipo === 'receita') return 'pendente'; // receita não atrasa
    const dias = diasAte(mov.data);
    if (dias < 0) return 'atrasado';
    if (dias <= 5) return 'proximo';
    return 'pendente';
  }

  // totais do mês: previstos (receitas/despesas), já pagos (recebido/pago),
  // pendente (aPagar) e saldo previsto (receitas - despesas)
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

  // gasto por categoria: { "Moradia": 1000, "Lazer": 80 }
  function gastosPorCategoria(mes) {
    const gastos = {};
    movimentosDoMes(mes).filter(m => m.tipo === 'despesa').forEach(m => {
      const nome = m.categoria || 'Sem categoria';
      gastos[nome] = (gastos[nome] || 0) + m.valor;
    });
    return gastos;
  }

  /* --- economia e metas --- */

  // mês do registro mais antigo ("aaaa-mm" em ordem alfabética = ordem de data)
  function primeiroMes() {
    const meses = [
      ...lancamentos.todos().map(l => String(l.data).slice(0, 7)),
      ...contasFixas.todos().map(c => c.inicio),
      ...parcelamentos.todos().map(p => p.inicio)
    ].filter(Boolean).sort();
    return meses[0] || mesAtual();
  }

  // economia = tudo o que já foi recebido - tudo o que já foi pago, até hoje
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

  // guardado = o que já tinha ao criar a meta + o que guardou pelo site
  const guardadoDaMeta = m => (m.guardadoInicial || 0) + (m.aportes || 0);
  const totalAportado = () => metas.todos().reduce((s, m) => s + (m.aportes || 0), 0);
  // o que ainda dá para guardar nas metas
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
