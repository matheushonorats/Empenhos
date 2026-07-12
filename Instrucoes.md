# Guia de Implantação Rápida — Sistema de Gestão de Empenhos

Siga este passo a passo simples para criar a planilha no seu Google Drive, instalar o sistema e começar a usá-lo como um sistema de controle de estoque com uma interface bonita e visual.

---

## Passo 1: Criar a sua Planilha no Google Drive

1. Acesse o seu Google Drive ([drive.google.com](https://drive.google.com)).
2. Clique no botão **Novo** (canto superior esquerdo) e escolha **Planilhas Google** para criar uma planilha em branco.
3. No canto superior esquerdo, dê um nome para sua planilha, como por exemplo: `Controle de Empenhos - SETUR`.

---

## Passo 2: Acessar o Editor de Código (Apps Script)

1. Com a sua planilha aberta, vá ao menu superior e clique em **Extensões** > **Apps Script**.
2. Uma nova aba do navegador se abrirá mostrando o painel de desenvolvimento de códigos da Google.

---

## Passo 3: Colar os Códigos do Projeto

Você precisará copiar os códigos dos dois arquivos criados na pasta deste projeto:

### 1. Configurar o arquivo `Codigo.gs` (Servidor)
1. No editor de Apps Script, você verá um arquivo pré-criado chamado `Código.gs` (ou `code.gs`).
2. Apague todo o conteúdo que estiver lá dentro.
3. Abra o arquivo `Codigo.gs` que criamos no seu computador, copie todo o seu código e cole no editor do Google.
4. Salve o projeto clicando no ícone de disquete no menu superior do editor ou pressionando `Ctrl + S`.

### 2. Criar e configurar o arquivo `Index.html` (Interface Visual)
1. No menu lateral esquerdo do Apps Script, clique no botão de mais **(+)** ao lado da palavra "Arquivos".
2. Selecione a opção **HTML**.
3. Digite o nome exatamente como: `Index` (não precisa escrever .html, o sistema colocará automaticamente). Pressione Enter.
4. Apague todo o código padrão gerado nele.
5. Abra o arquivo `Index.html` que criamos no seu computador, copie todo o conteúdo e cole dentro deste novo arquivo no Google.
6. Salve o projeto (`Ctrl + S`).

---

## Passo 4: Criar as Abas e Estruturas Automaticamente

Criamos uma função que cria todas as colunas, as abas necessárias e insere os dados de exemplo automaticamente, para você não precisar digitar nada do zero.

1. No topo do editor de Apps Script, ao lado do botão "Executar", verifique se a função selecionada no menu dinâmico é a `inicializarPlanilha`.
2. Se não estiver, clique no menu dinâmico e escolha `inicializarPlanilha`.
3. Clique no botão **Executar**.
4. O Google solicitará permissões de acesso para rodar o código. Clique em **Revisar permissões**, selecione sua conta Google, clique em **Avançado** (no link pequeno abaixo) e depois em **Acessar Controle de Empenhos (não seguro)**. Por fim, clique em **Permitir**.
5. Aguarde alguns segundos. O log mostrará "Execução concluída".
6. Se você voltar para a aba da sua Planilha do Google, verá que surgiram 3 abas novas (`EMPENHOS`, `ITENS`, `SOLICITACOES`) totalmente estruturadas com cabeçalhos formatados em azul marinho e todos os dados de exemplo já inseridos!

---

## Passo 5: Publicar e Usar o Sistema Visual (Frontend)

Agora você irá publicar o sistema como um Web App para obter o link da sua tela de controle visual.

1. No canto superior direito do editor do Apps Script, clique no botão azul **Implantar** > **Nova implantação**.
2. Clique no ícone de engrenagem ao lado de "Selecione o tipo" e selecione **App da Web**.
3. Preencha as configurações exatamente assim:
   - **Descrição**: `Versao 1.0`
   - **Executar como**: `Eu (seu-email@gmail.com)` (Importante para que o sistema salve os dados usando suas permissões)
   - **Quem pode acessar**: `Somente eu` (Para garantir a segurança, ou escolha `Qualquer pessoa` se mais pessoas da SETUR precisarem acessar).
4. Clique no botão **Implantar**.
5. O Google gerará um link sob o título **URL do app da web**.
6. Copie esse link. Este é o endereço do seu sistema visual! Você pode salvá-lo nos seus favoritos do navegador.

---

## Como usar a Interface Visual

Ao abrir a URL gerada, você terá acesso direto a 3 telas:

1. **Visão Geral**: Mostra cards inteligentes com o orçamento total reservado, valor total consumido e o saldo financeiro disponível atualizado em tempo real. Logo abaixo, há uma seção com cards para cada item de serviço, com barras de progresso que mostram a porcentagem disponível. Quando o saldo de diárias de um item fica abaixo de 20%, o sistema exibe um alerta automático avisando que o saldo está baixo, permitindo que a usuária saiba o momento de pedir mais créditos (reabastecer).
2. **Nova Solicitação**: Um formulário limpo para lançar novos eventos. Ao selecionar o Empenho do contrato, o sistema busca e filtra apenas os códigos dos itens relacionados àquele contrato. Ao selecionar o código, ele busca automaticamente a descrição, região, valor unitário e o saldo atual disponível em estoque. Ao preencher a quantidade de diárias, o sistema valida em tempo real e impede o clique no botão "Gravar no Estoque" se a quantidade solicitada for maior do que a disponível em estoque, evitando erros.
3. **Histórico de Saídas**: Lista todas as solicitações cadastradas em ordem decrescente (da mais recente para a mais antiga). Permite filtrar instantaneamente por empenho, região geográfica, status ou buscar por texto livre. Possui também um botão "Imprimir / PDF" formatado para gerar um relatório limpo em papel ou arquivo digital para arquivamento.
