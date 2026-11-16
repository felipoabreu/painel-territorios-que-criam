# Painel de Dados – Programa Territórios que Criam | Senac SP

Versão local do painel, para abrir, editar e evoluir no **Visual Studio Code**.
É um site estático (HTML + CSS + JavaScript com D3), sem etapa de build: os dados
ficam em arquivos JSON na pasta `data/`.

## Como rodar

O painel lê os arquivos de `data/` com `fetch`, por isso precisa de um servidor
local. Abrir o `index.html` com duplo clique (file://) **não** funciona.

**Opção 1 – Live Server (recomendado)**
1. No VS Code: *Arquivo → Abrir Pasta…* e escolha esta pasta.
2. Aceite a extensão recomendada **Live Server** (ou instale `ritwickdey.LiveServer`).
3. Clique em **Go Live** na barra inferior. O painel abre em `http://localhost:5500`.
   Cada vez que você salva um arquivo, a página recarrega.

**Opção 2 – Node.js**
```bash
npm start            # serve em http://localhost:8080 e abre o navegador
```

**Opção 3 – Python**
```bash
python -m http.server 8080   # depois abra http://localhost:8080
```

Para depurar com pontos de parada, use *Executar e Depurar → "Abrir painel no Chrome/Edge"*
com o Live Server ligado (`.vscode/launch.json`).

## Publicar na internet
O passo a passo para hospedar o painel no GitHub Pages está em `PUBLICAR-NO-GITHUB.md`.
A pasta já está pronta para isso: caminhos relativos, arquivo `.nojekyll` e dados carregados sob demanda
(ao abrir, o painel baixa cerca de 2 MB; o restante vem quando cada aba é aberta).

## Estrutura

```
index.html            estrutura da página (abas, cartões, filtros) – cada gráfico é um elemento com data-draw="nome"
css/tokens.css        cores, fontes e espaçamentos (tema claro/escuro automático)
css/painel.css        estilos do painel
js/dash-runtime.js    mini-runtime: carrega os dados sob demanda, guarda filtros na URL e redesenha os gráficos
js/app.js             toda a lógica: formatação, cálculos (ranking, correlações) e os ~60 gráficos
js/d3.v7.min.js       biblioteca D3 v7 (local, funciona sem internet)
data/manifest.json    lista dos conjuntos de dados carregados
data/*.json           37 conjuntos de dados (um registro por território/ano/setor)
scripts/              consulta do CNPJ no BigQuery e script que gera os conjuntos empresas_*.json
```

### Como o código se conecta
- Em `index.html`, um elemento como `<div data-draw="mapa"></div>` é desenhado pela função
  registrada em `js/app.js` com `dash.draw('mapa', (el) => { ... })`.
- `dash.data('territorios')` devolve `{status, data}` do arquivo `data/territorios.json`.
- O território selecionado e as escolhas dos filtros ficam na URL (`?t=3509502&ind=idpec`);
  links copiados abrem o painel já filtrado. A aba ativa fica no `#` (ex.: `#criativa`).
- Códigos de território: `35` Estado · 4 dígitos região intermediária · 6 dígitos região imediata ·
  7 dígitos município (IBGE) · `900`–`903` capital e GOs Senac · 5 dígitos área de unidade Senac.

### Tarefas comuns
- **Trocar cores do painel**: `css/tokens.css` (variáveis `--color-*`) e a paleta dos gráficos em
  `dash.colors`, no início de `js/dash-runtime.js`.
- **Atualizar um dado**: substitua o JSON correspondente em `data/` mantendo os mesmos nomes de campos.
- **Novo gráfico**: crie um elemento `data-draw="meu-grafico"` no `index.html` e registre
  `dash.draw('meu-grafico', (el) => { ... })` no `app.js` (use os auxiliares `hbars`, `cols`, `lines`, `barsN`).
- **Publicar**: a pasta inteira pode ir para qualquer hospedagem estática (GitHub Pages, Netlify,
  servidor do Senac, SharePoint com páginas estáticas etc.).

## Fontes e método
A aba **Glossário & Metodologia** do próprio painel traz as fontes, datas de coleta e métodos
(IBGE CEMPRE, PNAD Contínua, RAIS e CNPJ da Receita Federal via Base dos Dados, INEP, FIRJAN, Siconfi, SALIC, PNAB, SNC,
MUNIC, Comex Stat). Os dados são públicos e agregados; nenhum dado pessoal foi incluído.

Versão dos dados: 16/11/2026 · pacote 1.9 (pronto para GitHub Pages; inclui empresas criativas da Receita Federal, no recorte do Panorama Territorial da Economia Criativa Paulista).
