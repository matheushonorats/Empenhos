# SETUR - Gestão de Empenhos

Sistema de controle, utilização e gestão de empenhos da Secretaria Municipal de Turismo (SETUR) de São Sebastião. O sistema é baseado em **Google Apps Script** rodando como um Web App integrado ao Google Planilhas.

---

## 🛠️ Especificações Técnicas

- **Arquitetura**: Aplicação Single-Page (SPA) Serverless integrada à suíte Google Workspace.
- **Backend (`Código.js`)**: Google Apps Script (GAS) atuando como API e gerenciador do banco de dados (Google Sheets).
- **Frontend (`Index.html`)**: HTML5, CSS3 vanila (design responsivo premium, paleta corporativa azul/cinza e animações suaves), e JavaScript puro (ES6+).
- **Integração de Bibliotecas**:
  - **Flatpickr**: Componente integrado e traduzido para seleção múltipla de datas.
  - **Google Fonts**: Inter, Inter Tight, e Outfit.
- **Armazenamento de Arquivos**: PDFs de solicitações e ordens de serviço salvos automaticamente em pasta dedicada no Google Drive via integração de API nativa do GAS.
- **Segurança**: Autenticação com sessão persistida via `sessionStorage`, hashing de senhas, troca obrigatória de senha no primeiro acesso e monitoramento de logs de ações do sistema.

---

## 📋 Regras de Negócio

### 1. Gestão de Empenhos e Itens
- Cada empenho cadastrado possui diversos itens/serviços vinculados, cada um com sua região correspondente, unidade de medida, quantidade autorizada e valor unitário.
- **Controle de Saldo**: O sistema calcula automaticamente em tempo real a quantidade utilizada e o saldo disponível de cada item. O status é categorizado como:
  - *Disponível*: Saldo positivo.
  - *Baixo*: Consumo igual ou superior a 80% do total autorizado.
  - *Esgotado*: Sem saldo restante.
- **Validação de Limite**: O formulário de solicitação impede gravação caso a quantidade digitada ultrapasse o saldo atual disponível para aquele item específico do empenho.

### 2. Registro de Solicitações (Nova Solicitação)
- **Campos Obrigatórios** (Sinalizados com `*`):
  - Número da Solicitação
  - Empenho Vinculado
  - Item / Serviço
  - Nome do Evento
  - Quantidade Solicitada (Diárias)
  - Datas do Evento
- **Campos Opcionais**: Data do Registro, Datas do Evento, Horário de Início/Término, Local/Endereço, Responsável, Contato, Status, Nota Fiscal, PDF e Observações.
- **Bloqueio de Envio**: O botão de "Gravar" permanece bloqueado dinamicamente até que todos os 6 campos obrigatórios estejam válidos e preenchidos.
- **Sugestões Inteligentes**: Ao digitar o nome do evento, o sistema busca no histórico as informações anteriores correspondentes e oferece a opção de preenchimento automático para agilizar o cadastro.

### 3. Controle de Usuários e Permissões
- Perfis de acesso: `Administrador` e `Operador`.
- Regras rígidas de alteração de senha:
  - Mínimo de 8 caracteres.
  - Indicador de força de senha visual.
  - Usuários novos são obrigados a alterar a senha padrão fornecida logo no primeiro login.
  - Botão alternador de visibilidade (olhinho 👁️) presente em todos os campos de senha do sistema.

### 4. Customização de Relatórios (Exportação / Impressão)
- O sistema possui um seletor dinâmico de colunas que permite ao usuário personalizar quais dados devem aparecer no relatório antes de gerar o PDF em qualquer um dos 4 fluxos de impressão (Histórico Geral, Estoque, Consumo de Item ou Solicitação Específica).

---

## 📝 Notas de Desenvolvimento e Histórico de Correções

1. **Eliminação do Flash da Interface (v1.12)**: Inserção de bloqueio visual (`visibility: hidden`) no `<body>` até que a sessão do usuário seja confirmada pelo JavaScript.
2. **Combinação de OS / Empenho**: A coluna "OS" e "Empenho" foram fundidas nas tabelas para economizar largura útil de visualização e impressão.
3. **Prevenção de Quebras Monetárias**: Ajuste na função `formatCurrency` utilizando espaços não-quebráveis (`\u00A0`) para impedir a separação do símbolo `R$` do valor numérico.
4. **Campo Multi-Datas com Flatpickr (v1.26)**: Substituição de inputs primitivos por seletor interativo de múltiplas datas com formatação automática em padrão nacional (`dd/mm/aaaa`).
5. **Validação Unificada do Formulário (v1.28)**: Criação de função integrada de validação de envio condicionando o estado ativo do botão de gravação à totalidade dos dados requeridos.
