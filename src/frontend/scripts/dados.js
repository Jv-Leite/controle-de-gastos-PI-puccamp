/*Dados é a base compartilhada de todas as telas*/
/*guarda tudo em localStorage*/

const ContaAi = (() => {
  'use strict';

  /*armazenamento*/
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

  //cria uma lista de obj guardados com id
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

  /*coleções do site*/
  const lancamentos = colecao(CHAVES.lancamentos);
  const contasFixas = colecao(CHAVES.contasFixas);
  const parcelamentos = colecao(CHAVES.parcelamentos);
  const metas = colecao(CHAVES.metas);

  // Categorias já começam sem limites de receita ou despesa
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

  /*datas e formatação*/
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const pad = n => String(n).padStart(2, '0');

  function hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function mesAtual() { return hoje().slice(0, 7); }

  function nomeMes(ym) {
    const [ano, mes] = ym.split('-');
    return `${MESES[Number(mes) - 1]} de ${ano}`;
  }

  function mesCurto(ym) {
    const [ano, mes] = ym.split('-');
    return `${MESES[Number(mes) - 1].slice(0, 3)}/${ano.slice(2)}`;
  }

  //soma de meses
  function somarMeses(ym, n) {
    const [ano, mes] = ym.split('-').map(Number);
    const total = ano * 12 + (mes - 1) + n;
    return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
  }

  //diferença de meses
  function diferencaMeses(a, b) {
    const [aa, am] = a.split('-').map(Number);
    const [ba, bm] = b.split('-').map(Number);
    return (aa * 12 + am) - (ba * 12 + bm);
  }

//
  function formatarData(iso) {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function moeda(valor) {
    return formatoMoeda.format(valor || 0).replace(/\u00a0/g, ' ');
  }

  // Evita que texto digitado vire html ao montar as telas com innerhtml.
  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  //saude
  function classeCategoria(nome) {
    const limpo = String(nome || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const conhecidas = ['alimentacao', 'moradia', 'compras', 'transporte', 'lazer', 'saude', 'salario'];
    return conhecidas.includes(limpo) ? `cat-${limpo}` : 'cat-extra';
  }

  /*soma usada em mais telas*/ 
  function doMes(mes) {
    return lancamentos.todos().filter(l => l.data.startsWith(mes));
  }

  //soma dos mes somada por categoria
  function gastosPorCategoria(mes) {
    const gastos = {};
    doMes(mes).filter(l => l.tipo === 'despesa').forEach(l => {
      gastos[l.categoria] = (gastos[l.categoria] || 0) + l.valor;
    });
    return gastos;
  }

  //resumo do mês que se repetem
  //para meses passados usa incluirFixas = false para as contas fixas só valerem do mês atual em diante
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

  /*barra no topo*/
  function iniciarPainel() {
    if (!document.body.classList.contains('painel')) return;

    const nome = localStorage.getItem('usuarioLogado');

    //sem login sai
    if (!nome) {
      window.location.href = 'login.html';
      return;
    }

    const saudacao = document.querySelector('.topo-saudacao strong');
    const avatar = document.querySelector('.avatar');
    if (saudacao) saudacao.textContent = nome;
    if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();

    // sair do perfil
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
