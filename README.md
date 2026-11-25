# ContaAí — Controle de gastos financeiros

Site de controle de gastos pessoais. A pessoa cria um **perfil local** (sem conectar conta bancária) e registra receitas e despesas em categorias com limite mensal. O site também tem metas de economia, contas fixas, compras parceladas e um painel com gráficos.

Projeto Integrador da disciplina de **Desenvolvimento Web**, Engenharia de Computação, PUC-Campinas.

## Tecnologias utilizadas no projeto

- HTML5 semântico
- CSS3 (variáveis, Flexbox, Grid, **mobile first**)
- JavaScript puro, com os dados salvos no **localStorage** do navegador
- Fonte Roboto (Google Fonts) e ícones Font Awesome (só na tela de login)

## Como abrir

Abra `src/frontend/index.html` no navegador, ou use a extensão **Live Server** do VS Code.

## Estrutura do nosso projeto

```
controle-de-gastos-PI-puccamp/
├── README.md
├── .gitignore
├── assets/img/                  → logo e fotos
├── docs/prototipo/              → prints e protótipos
└── src/frontend/
    ├── index.html               → tela inicial
    ├── pages/
    │   ├── _modelo.html         → molde das telas internas
    │   ├── login.html           → cadastro e login do perfil local
    │   ├── visaogeral.html      → resumo, gráficos e configuração do perfil
    │   ├── lancamentos.html
    │   ├── categorias.html
    │   ├── contas.html
    │   ├── parcelamentos.html
    │   └── metas.html
    ├── styles/
    │   ├── variables.css        → cores, fontes e medidas (compartilhado)
    │   ├── main.css             → reset e estilos globais (compartilhado)
    │   ├── components.css       → botões, cards, campos, tabelas, janelas (compartilhado)
    │   ├── painel.css           → barra verde + menu lateral (compartilhado)
    │   └── NOME-DA-PAGINA.css   → um arquivo por página
    └── scripts/
        ├── auth.js              → perfil local: cadastro, login, sessão e proteção das páginas
        ├── dados.js             → armazenamento e cálculos (usado por todas as telas)
        ├── ui.js                → avisos, confirmação, selos e formatação de valores
        ├── menu.js              → menu no celular
        └── NOME-DA-PAGINA.js    → lógica de cada página
```

As páginas internas carregam os scripts nesta ordem: `auth.js` → `dados.js` → `ui.js` → `menu.js` → script da página.

## Como as partes se integram

- Cada perfil tem seus próprios dados no localStorage (`ca_dados_<email>_...`).
- `dados.js` junta **lançamentos, contas fixas e parcelas** em `movimentosDoMes(mes)`. Todas as telas usam essa função, então uma conta fixa ou parcela aparece automaticamente nos Lançamentos, nos totais da Visão geral e no gasto das Categorias.
- Marcar algo como pago em qualquer tela (Lançamentos, Contas fixas, Parcelamentos ou Visão geral) atualiza todas as outras.
- A economia acumulada (Metas) é a soma do que já foi **recebido** menos o que já foi **pago**, até o mês atual. O valor guardado nas metas sai dessa economia.

## Cores dos valores em dinheiro

Só duas cores, definidas no `variables.css`:

- `--cor-positivo` (verde) → receitas e saldo positivo (classe `.valor-positivo`)
- `--cor-negativo` (vermelho) → despesas e saldo negativo (classe `.valor-negativo`)

Totais neutros (a pagar, soma dos limites etc.) ficam na cor do texto.

## Divisão do trabalho

| Funcionalidade | Arquivos | Responsável |
|---|---|---|
| Tela inicial e login | `index.html`, `pages/login.html`, `styles/inicio.css`, `styles/login.css`, `scripts/login.js` | Gustavo Crepaldi |
| Visão geral | `pages/visaogeral.html`, `styles/visaogeral.css`, `scripts/visaogeral.js` | João Vitor Leite |
| Lançamentos | `pages/lancamentos.html`, `styles/lancamentos.css`, `scripts/lancamentos.js` | Gustavo Crepaldi / Felipe Righetto |
| Categorias e limites | `pages/categorias.html`, `styles/categorias.css`, `scripts/categorias.js` | Leonardo Newman |
| Contas fixas | `pages/contas.html`, `styles/contas.css`, `scripts/contas.js` | Matheus Finardi |
| Parcelamentos | `pages/parcelamentos.html`, `styles/parcelamentos.css`, `scripts/parcelamentos.js` | Felipe Righetto |
| Metas | `pages/metas.html`, `styles/metas.css`, `scripts/metas.js` | Gustavo Crepaldi / Felipe Righetto |
