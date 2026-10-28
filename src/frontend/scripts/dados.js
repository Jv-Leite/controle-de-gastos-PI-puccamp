/* =====================================================================
   dados.js — base compartilhada de todas as telas do painel.
   Guarda tudo no localStorage do navegador (perfil local, sem servidor).
   Carregue ESTE arquivo antes do script da página:
     <script src="../scripts/dados.js"></script>
     <script src="../scripts/lancamentos.js"></script>
   ===================================================================== */

const ContaAi = (() => {
  'use strict';

  /* ---------- armazenamento ---------- */
  const CHAVES = {
    lancamentos: 'ca_lancamentos',
    categorias: 'ca_categorias',
    contasFixas: 'ca_contas_fixas',
    parcelamentos: 'ca_parcelamentos',
    metas: 'ca_metas'
  };

  function ler(chave, padrao) {
    try {
      const texto = localStorage.getItem(chave);
      return texto ? JSON.parse(texto) : padrao;
    } catch (erro) {
      console.warn('Não foi possível ler', chave, erro);
      return padrao;
    }
  }

  function gravar(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
  }

  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Cria uma "coleção": uma lista de objetos com id, guardada numa chave.
  function colecao(chave) {
    return {
      todos() { return ler(chave, []); },
      salvar(itens) { gravar(chave, itens); },
      adicionar(item) {
        const itens = this.todos();
        item.id = novoId();
        itens.push(item);
        this.salvar(itens);
        return item;
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

  /* ---------- as coleções do site ---------- */
  const lancamentos = colecao(CHAVES.lancamentos);
  const contasFixas = colecao(CHAVES.contasFixas);
  const parcelamentos = colecao(CHAVES.parcelamentos);
  const metas = colecao(CHAVES.metas);

  // Categorias já nascem com as básicas (sem limite). Cada uma é de
  // 'despesa' ou de 'receita'.
  const CATEGORIAS_PADRAO = [
    { nome: 'Alimentação', tipo: 'despesa' },
    { nome: 'Moradia', tipo: 'despesa' },
    { nome: 'Transporte', tipo: 'despesa' },
    { nome: 'Lazer', tipo: 'despesa' },
    { nome: 'Saúde', tipo: 'despesa' },
    { nome: 'Compras', tipo: 'despesa' },
    { nome: 'Salário', tipo: 'receita' },
    { nome: 'Outras receitas', tipo: 'receita' }
  ];

  const categorias = {
    ...colecao(CHAVES.categorias),
    todos() {
      const salvas = ler(CHAVES.categorias, null);
      if (salvas) return salvas;
      const iniciais = CATEGORIAS_PADRAO.map(c => ({ id: novoId(), limite: null, ...c }));
      gravar(CHAVES.categorias, iniciais);
      return iniciais;
    }
  };

  /* ---------- datas e formatação ---------- */
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const pad = n => String(n).padStart(2, '0');

  function hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function mesAtual() { return hoje().slice(0, 7); }

  // '2026-09' -> 'setembro de 2026'
  function nomeMes(ym) {
    const [ano, mes] = ym.split('-');
    return `${MESES[Number(mes) - 1]} de ${ano}`;
  }

  // '2026-09' -> 'set/26'
  function mesCurto(ym) {
    const [ano, mes] = ym.split('-');
    return `${MESES[Number(mes) - 1].slice(0, 3)}/${ano.slice(2)}`;
  }

  // soma (ou subtrai) meses: somarMeses('2026-11', 2) -> '2027-01'
  function somarMeses(ym, n) {
    const [ano, mes] = ym.split('-').map(Number);
    const total = ano * 12 + (mes - 1) + n;
    return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
  }

  // diferença em meses: diferencaMeses('2027-05', '2026-09') -> 8
  function diferencaMeses(a, b) {
    const [aa, am] = a.split('-').map(Number);
    const [ba, bm] = b.split('-').map(Number);
    return (aa * 12 + am) - (ba * 12 + bm);
  }

  // '2026-09-25' -> '25/09/2026'
  function formatarData(iso) {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function moeda(valor) {
    return formatoMoeda.format(valor || 0).replace(/\u00a0/g, ' ');
  }

  // Evita que texto digitado vire HTML ao montar as telas com innerHTML.
  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 'Saúde' -> 'cat-saude' (cor da categoria; as novas usam 'cat-extra')
  function classeCategoria(nome) {
    const limpo = String(nome || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const conhecidas = ['alimentacao', 'moradia', 'compras', 'transporte', 'lazer', 'saude', 'salario'];
    return conhecidas.includes(limpo) ? `cat-${limpo}` : 'cat-extra';
  }

  /* ---------- somas simples (usadas em mais de uma tela) ---------- */
  function doMes(mes) {
    return lancamentos.todos().filter(l => l.data.startsWith(mes));
  }

  // despesas do mês somadas por categoria: { Alimentação: 120, ... }
  function gastosPorCategoria(mes) {
    const gastos = {};
    doMes(mes).filter(l => l.tipo === 'despesa').forEach(l => {
      gastos[l.categoria] = (gastos[l.categoria] || 0) + l.valor;
    });
    return gastos;
  }

  // Resumo do mês: lançamentos + contas fixas (que se repetem todo mês).
  // Para meses passados use incluirFixas = false (as contas fixas só valem
  // do mês atual em diante).
  function resumoDoMes(mes, incluirFixas = true) {
    let receitas = 0, despesas = 0, aPagar = 0;

    doMes(mes).forEach(l => {
      if (l.tipo === 'receita') {
        receitas += l.valor;
      } else {
        despesas += l.valor;
        if (l.situacao === 'pendente') aPagar += l.valor;
      }
    });

    (incluirFixas ? contasFixas.todos() : []).forEach(c => {
      if (c.tipo === 'receita') {
        receitas += c.valor;
      } else {
        despesas += c.valor;
        if (c.pagoMes !== mes) aPagar += c.valor;
      }
    });

    return { receitas, despesas, aPagar, saldo: receitas - despesas };
  }

  /* ---------- barra do topo (todas as telas do painel) ---------- */
  function iniciarPainel() {
    if (!document.body.classList.contains('painel')) return;

    const nome = localStorage.getItem('usuarioLogado');

    // sem login, volta para a tela de entrada
    if (!nome) {
      window.location.href = 'login.html';
      return;
    }

    const saudacao = document.querySelector('.topo-saudacao strong');
    const avatar = document.querySelector('.avatar');
    if (saudacao) saudacao.textContent = nome;
    if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();

    // "Sair do perfil" encerra a sessão (os dados financeiros ficam salvos)
    const sair = document.querySelector('.menu-rodape .menu-link');
    if (sair) {
      sair.addEventListener('click', () => localStorage.removeItem('usuarioLogado'));
    }
  }

  iniciarPainel();

  return {
    lancamentos, categorias, contasFixas, parcelamentos, metas,
    hoje, mesAtual, nomeMes, mesCurto, somarMeses, diferencaMeses, formatarData,
    moeda, escapar, classeCategoria,
    doMes, gastosPorCategoria, resumoDoMes
  };
})();
