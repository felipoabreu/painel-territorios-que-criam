# Publicar o painel como site (GitHub Pages)

Tempo estimado: 15 minutos. Não é preciso instalar nada; tudo se faz pelo navegador.
O resultado é um endereço aberto, do tipo `https://SEU-USUARIO.github.io/painel-territorios-que-criam/`.

## 1. Criar a conta e o repositório
1. Entre em https://github.com e crie uma conta gratuita (ou entre na sua).
2. Clique em **New repository** (botão verde "New").
3. Em **Repository name**, escreva `painel-territorios-que-criam`.
4. Marque **Public**. No plano gratuito, o GitHub Pages só funciona em repositório público.
5. Clique em **Create repository**.

## 2. Enviar os arquivos
1. Extraia o arquivo .zip em uma pasta do computador.
2. Na página do repositório recém-criado, clique em **uploading an existing file**.
3. Abra a pasta extraída, selecione **tudo o que está dentro dela** (Ctrl+A) e arraste para a página do GitHub.
   Arraste o conteúdo da pasta, não a pasta em si: o `index.html` precisa ficar na raiz do repositório.
4. Espere a barra de envio terminar (são cerca de 55 arquivos, 25 MB).
5. Clique em **Commit changes**.

Se o navegador não aceitar o arraste de pastas, envie em duas vezes: primeiro os arquivos soltos, depois
cada pasta (`css`, `js`, `data`, `scripts`).

## 3. Ligar o site
1. No repositório, abra **Settings** e, no menu à esquerda, **Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
4. Aguarde de 1 a 3 minutos e recarregue a página: o endereço do site aparece no topo.

## 4. Conferir
- Abra o endereço no computador e no celular.
- Troque de aba e selecione um município: os gráficos devem aparecer em poucos segundos.
- Um link com filtro, como `.../?t=3552205#criativa`, abre direto em Sorocaba, na aba Ecossistema Criativo.

## Atualizar os dados (ciclo do dia 16)
1. Substitua os arquivos da pasta `data/` pelos novos (mesmos nomes).
2. No repositório: **Add file → Upload files**, arraste os arquivos novos e confirme com **Commit changes**.
3. O site se atualiza sozinho em 1 a 3 minutos. A data de carga aparece no topo do painel.

Quem usa o VS Code pode fazer o mesmo pela aba **Source Control**: *Commit* e *Sync*.

## Dois ajustes de versão de teste
- **Faixa "Versão de teste, não oficial"**: está no início do `index.html`, marcada com um comentário. Apague a linha para remover.
- **Buscadores**: o `index.html` tem uma linha `noindex`, que impede o site de aparecer no Google.
  Quem tiver o link acessa normalmente. Apague a linha para liberar a indexação.

## O que este site não faz
- Não exige login: qualquer pessoa com o link vê o painel. Os dados são públicos e agregados.
- Não se atualiza sozinho: os dados mudam quando os arquivos de `data/` são substituídos.
- Não registra quem acessou.
