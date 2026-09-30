# ContaAí — Controle de gastos financeiros

Site de controle de gastos pessoais. A pessoa cria um **perfil local** (sem conectar conta bancária) e registra receitas e despesas em categorias com limite mensal. O site também tem metas de economia, contas fixas, compras parceladas e um painel com gráficos.

Projeto Integrador da disciplina de **Desenvolvimento Web**, Engenharia de Computação, PUC-Campinas.

## Tecnologias utilizadas no projeto

- HTML5 semântico
- CSS3 (variáveis, Flexbox, Grid, **mobile first**)
- JavaScript básico, só para interações simples
- Fonte Roboto (Google Fonts)

## Como abrir

Abra `src/frontend/index.html` no navegador, ou use a extensão **Live Server** do VS Code.

## Estrutura do nosso projeto

```
controle-de-gastos-PI-puccamp/
├── README.md
├── .gitignore
├── assets/img/                  → logo e fotos (compartilhado)
├── docs/prototipo/              → prints e protótipos
└── src/frontend/
    ├── index.html               → tela inicial
    ├── pages/
    │   ├── _modelo.html         → MOLDE das telas internas (não editar)
    │   ├── login.html
    │   ├── dashboard.html
    │   ├── lancamentos.html
    │   ├── categorias.html
    │   ├── contas.html
    │   ├── parcelamentos.html
    │   └── metas.html
    ├── styles/
    │   ├── variables.css        → cores, fontes e medidas      (compartilhado)
    │   ├── main.css             → reset e estilos globais      (compartilhado)
    │   ├── components.css       → botões, cards, campos, barras (compartilhado)
    │   ├── painel.css           → barra verde + menu lateral   (compartilhado)
    │   └── NOME-DA-PAGINA.css   → um arquivo por página        (de cada pessoa)
    └── scripts/
        ├── menu.js              → menu no celular              (compartilhado)
        └── NOME-DA-PAGINA.js    → se a página precisar         (de cada pessoa)
```

## Divisão do trabalho

| Funcionalidade | Branch | Arquivos | Responsável |
|---|---|---|---|
| Tela inicial e login | `tela-inicial1` | `index.html`, `pages/login.html`, `styles/inicio.css`, `styles/login.css` | Gustavo Crepaldi |
| Visão geral (dashboard) | `feature/visao-geral` | `pages/dashboard.html`, `styles/dashboard.css` | João Vitor Leite |
| Lançamentos | `feature/lancamentos` | `pages/lancamentos.html`, `styles/lancamentos.css` | A fazer |
| Categorias e limites | `feature/categorias` | `pages/categorias.html`, `styles/categorias.css` | Leonardo Newman |
| Contas fixas | `feature/contas-fixas` | `pages/contas.html`, `styles/contas.css` | Matheus Finardi |
| Parcelamentos | `feature/parcelamentos` | `pages/parcelamentos.html`, `styles/parcelamentos.css` | Felipe Righetto |
| Metas | `feature/metas` | `pages/metas.html`, `styles/metas.css` | A fazer |
