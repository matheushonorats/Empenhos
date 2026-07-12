/**
 * Gestão de Empenhos - SETUR
 * Backend Google Apps Script (Codigo.gs)
 *
 * Versão com autenticação, log de atividades, correção de horários e
 * atualização rápida de status.
 */

const SHEETS = {
  EMPENHOS: 'EMPENHOS',
  ITENS: 'ITENS',
  SOLICITACOES: 'SOLICITACOES',
  USUARIOS: 'USUARIOS',
  LOG: 'LOG_ATIVIDADES'
};

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss.getSheetByName(SHEETS.USUARIOS)) {
      inicializarPlanilha();
    }
  } catch (e) {
    Logger.log('Erro na auto-inicialização: ' + e.message);
  }

  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Gestão de Empenhos - SETUR')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── SHEET HELPERS ───────────────────────────────────────────────────────────

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground('#003366');
    range.setFontColor('#ffffff');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers.forEach(h => {
      if (currentHeaders.indexOf(h) === -1) {
        const newCol = sheet.getLastColumn() + 1;
        sheet.insertColumnAfter(sheet.getLastColumn());
        sheet.getRange(1, newCol).setValue(h)
             .setFontWeight('bold')
             .setBackground('#003366')
             .setFontColor('#ffffff')
             .setHorizontalAlignment('center');
      }
    });
  }
  return sheet;
}

// ─── SEGURANÇA: HASH E TOKENS ────────────────────────────────────────────────

function hashSenha(senha) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    senha,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function gerarToken() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function salvarToken(token, login, perfil, nome) {
  const expiry = new Date().getTime() + TOKEN_TTL_MS;
  PropertiesService.getScriptProperties()
    .setProperty('T_' + token, JSON.stringify({ login, perfil, nome, expiry }));
}

function validarToken(token) {
  if (!token) return null;
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('T_' + token);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (new Date().getTime() > data.expiry) {
      PropertiesService.getScriptProperties().deleteProperty('T_' + token);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

function revogarToken(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('T_' + token);
}

// ─── LOG DE ATIVIDADES ───────────────────────────────────────────────────────

function registrarLog(token, acao, detalhes) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LOG);
    if (!sheet) return;
    const u = validarToken(token);
    sheet.appendRow([
      new Date(),
      u ? u.login : 'sistema',
      u ? u.nome  : 'Sistema',
      acao,
      detalhes || ''
    ]);
  } catch (e) {
    Logger.log('Erro ao registrar log: ' + e.message);
  }
}

// ─── INICIALIZAÇÃO DA PLANILHA ───────────────────────────────────────────────

/**
 * Execute esta função UMA VEZ no editor do Apps Script para configurar as
 * abas, criar o usuário admin padrão e inserir dados de exemplo.
 *
 * Login inicial: admin | Senha inicial: setur@2026
 * (O usuário será obrigado a alterar a senha no primeiro acesso.)
 */
function inicializarPlanilha() {
  const headersEmpenhos = [
    'Nº Empenho', 'Tipo', 'Data Emissão', 'Vencimento', 'Processo',
    'Licitação', 'Fornecedor', 'CNPJ', 'Órgão', 'Dotação', 'Valor Empenhado', 'Link PDF'
  ];
  const headersItens = [
    'Nº Empenho', 'Lote', 'Item', 'Código', 'Descrição', 'Região',
    'Unidade', 'Qtde Autorizada', 'Valor Unitário'
  ];
  const headersSolicitacoes = [
    'Nº Solicitação', 'Nº Empenho', 'Data Solicitação', 'Nome do Evento',
    'Datas do Evento', 'Horário Início', 'Horário Fim', 'Código Item',
    'Qtde Consumida', 'Local do Evento', 'Resp. Montagem', 'Contato Resp.',
    'Status', 'Nº Nota Fiscal', 'Observações', 'Link PDF'
  ];
  const headersUsuarios = [
    'Login', 'Senha Hash', 'Nome Completo', 'Perfil',
    'Primeiro Acesso', 'Ativo', 'Criado Em', 'Último Acesso'
  ];
  const headersLog = [
    'Timestamp', 'Login', 'Nome', 'Ação', 'Detalhes'
  ];

  getOrCreateSheet(SHEETS.EMPENHOS,    headersEmpenhos);
  getOrCreateSheet(SHEETS.ITENS,       headersItens);
  getOrCreateSheet(SHEETS.SOLICITACOES,headersSolicitacoes);
  getOrCreateSheet(SHEETS.USUARIOS,    headersUsuarios);
  getOrCreateSheet(SHEETS.LOG,         headersLog);

  // Cria admin padrão somente se não houver usuários
  const sheetUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USUARIOS);
  if (sheetUsuarios.getLastRow() <= 1) {
    sheetUsuarios.appendRow([
      'admin',
      hashSenha('setur@2026'),
      'Administrador',
      'admin',
      'S', // Primeiro acesso — deve trocar a senha
      'S',
      new Date(),
      ''
    ]);
    Logger.log('Usuário admin criado. Login: admin | Senha: setur@2026');
  }

  // Dados de exemplo somente se EMPENHOS estiver vazio
  const sheetEmpenhos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.EMPENHOS);
  if (sheetEmpenhos.getLastRow() <= 1) {
    sheetEmpenhos.appendRow([
      '004205/2026', 'Global', new Date('2026-05-18'), new Date('2026-12-31'),
      '11738', 'Pregão nº 23/2025', 'EGM EVENTOS LTDA', '11.412.274/0001-04',
      'SETUR', '23.695.0001', 3009550.00, ''
    ]);

    const sheetItens = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ITENS);
    [
      ['004205/2026', 60, 20, '72200', 'Som de palestra para atividades eventuais', 'Costa Sul',         'UND/DIA', 65,  2250.00],
      ['004205/2026', 60, 21, '72201', 'Som de palestra para atividades eventuais', 'Centro-Costa Norte','UND/DIA', 30,  2200.00],
      ['004205/2026', 60, 22, '72202', 'Som e luz de dupla musical',                'Costa Sul',         'UND/DIA', 65,  3500.00],
      ['004205/2026', 60, 23, '72203', 'Som e luz de dupla musical',                'Centro-Costa Norte','UND/DIA', 30,  3650.00],
      ['004205/2026', 60, 24, '72204', 'Som e luz p/ pequenas bandas',              'Costa Sul',         'UND/DIA', 260, 5480.00],
      ['004205/2026', 60, 25, '72205', 'Som e luz p/ pequenas bandas',              'Centro-Costa Norte','UND/DIA', 190, 5450.00]
    ].forEach(r => sheetItens.appendRow(r));

    const sheetSol = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SOLICITACOES);
    [
      ['0074/2026',  '004205/2026', new Date('2026-03-17'), 'VARANDA MUSICAL (PAÚBA)',
       '28/03, 25/04, 27/06, 25/07, 29/08, 26/09/2026', '17:00', '23:59', '72204',
       6, 'R. José Benedito de Almeida 30, Paúba', 'SORMANI', '(11) 99632-6204', 'Realizado', '', '', ''],
      ['0142/2026', '004205/2026', new Date('2026-04-17'), '13° ARRAIÁ DE BAREQUEÇABA',
       '10, 11 e 12/07/2026', '19:00', '23:59', '72205',
       3, 'Quadra de Esporte de Barequeçaba', 'SABARE', '(12) 99734-0961', 'Solicitado', '', '', ''],
      ['0158/2026', '004205/2026', new Date('2026-05-01'), 'RITMOS & DANÇAS (MAIO)',
       '06, 13, 20 e 27/05/2026', '18:00', '21:00', '72202',
       4, 'Praça Por do Sol, Boiçucanga', 'KAKÁ', '(12) 99658-9594', 'Realizado', '', '', '']
    ].forEach(r => sheetSol.appendRow(r));
  }

  Logger.log('Planilha inicializada com sucesso.');
}

// ─── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────

function autenticar(login, senha) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USUARIOS);
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, error: 'Sistema não inicializado. Execute inicializarPlanilha() no editor do Apps Script.' };
    }
    const lastRow = sheet.getLastRow();
    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const senhaHash = hashSenha(senha);

    for (let i = 0; i < data.length; i++) {
      const rowLogin = String(data[i][0]).trim();
      const rowHash  = data[i][1];
      const rowNome  = data[i][2];
      const rowPerf  = data[i][3];
      const rowFirst = String(data[i][4]);
      const rowAtivo = String(data[i][5]);

      if (rowLogin === login.trim() && rowHash === senhaHash && rowAtivo === 'S') {
        const token = gerarToken();
        salvarToken(token, rowLogin, rowPerf, rowNome);
        sheet.getRange(i + 2, 8).setValue(new Date());
        registrarLog(token, 'LOGIN', 'Acesso via web app');
        return {
          success: true,
          token,
          nome: rowNome,
          perfil: rowPerf,
          primeiroAcesso: rowFirst === 'S'
        };
      }
    }
    return { success: false, error: 'Usuário ou senha incorretos, ou usuário inativo.' };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: 'Erro interno: ' + e.message };
  }
}

function logout(token) {
  try {
    registrarLog(token, 'LOGOUT', 'Sessão encerrada');
    revogarToken(token);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

/**
 * Troca a senha do usuário autenticado.
 * Em caso de primeiro acesso, senhaAtual pode ser null (não verificada).
 */
function trocarSenha(token, senhaAtual, novaSenha) {
  try {
    const u = validarToken(token);
    if (!u) return { success: false, error: 'Sessão inválida. Faça login novamente.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USUARIOS);
    const lastRow = sheet.getLastRow();
    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() !== u.login) continue;

      const isPrimeiroAcesso = String(data[i][4]) === 'S';

      // Se não é primeiro acesso, exige senha atual
      if (!isPrimeiroAcesso) {
        if (!senhaAtual) return { success: false, error: 'Informe a senha atual.' };
        if (data[i][1] !== hashSenha(senhaAtual)) return { success: false, error: 'Senha atual incorreta.' };
      }

      sheet.getRange(i + 2, 2).setValue(hashSenha(novaSenha));
      sheet.getRange(i + 2, 5).setValue('N'); // Marca como não sendo mais primeiro acesso
      registrarLog(token, 'TROCA_SENHA', `Senha alterada por ${u.login}`);
      return { success: true };
    }
    return { success: false, error: 'Usuário não encontrado.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── GESTÃO DE USUÁRIOS (apenas admin) ───────────────────────────────────────

function cadastrarUsuario(token, novoUsuario) {
  try {
    const u = validarToken(token);
    if (!u || u.perfil !== 'admin') return { success: false, error: 'Permissão negada.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USUARIOS);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const logins = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
      if (logins.includes(novoUsuario.login.trim())) {
        return { success: false, error: 'Login já cadastrado.' };
      }
    }

    sheet.appendRow([
      novoUsuario.login.trim(),
      hashSenha(novoUsuario.senhaInicial),
      novoUsuario.nome.trim(),
      novoUsuario.perfil || 'usuario',
      'S', 'S',
      new Date(), ''
    ]);

    registrarLog(token, 'CRIAR_USUARIO',
      `Admin ${u.login} criou usuário: ${novoUsuario.login} (${novoUsuario.perfil || 'usuario'})`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function listarUsuarios(token) {
  try {
    const u = validarToken(token);
    if (!u || u.perfil !== 'admin') return { success: false, error: 'Permissão negada.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USUARIOS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, usuarios: [] };

    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const tz = Session.getScriptTimeZone();
    return {
      success: true,
      usuarios: data.map(row => ({
        login:          row[0],
        nome:           row[2],
        perfil:         row[3],
        primeiroAcesso: String(row[4]) === 'S',
        ativo:          String(row[5]) === 'S',
        criadoEm:       row[6] instanceof Date ? Utilities.formatDate(row[6], tz, 'dd/MM/yyyy') : '-',
        ultimoAcesso:   row[7] instanceof Date ? Utilities.formatDate(row[7], tz, 'dd/MM/yyyy HH:mm') : 'Nunca'
      }))
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function alterarStatusUsuario(token, loginAlvo, ativo) {
  try {
    const u = validarToken(token);
    if (!u || u.perfil !== 'admin') return { success: false, error: 'Permissão negada.' };
    if (loginAlvo === u.login) return { success: false, error: 'Não é possível alterar a própria conta.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USUARIOS);
    const lastRow = sheet.getLastRow();
    const logins = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < logins.length; i++) {
      if (String(logins[i][0]) === loginAlvo) {
        sheet.getRange(i + 2, 6).setValue(ativo ? 'S' : 'N');
        registrarLog(token, 'ALTERAR_USUARIO',
          `${u.login} ${ativo ? 'ativou' : 'desativou'} o usuário ${loginAlvo}`);
        return { success: true };
      }
    }
    return { success: false, error: 'Usuário não encontrado.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function redefinirSenhaAdmin(token, loginAlvo, novaSenha) {
  try {
    const u = validarToken(token);
    if (!u || u.perfil !== 'admin') return { success: false, error: 'Permissão negada.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USUARIOS);
    const lastRow = sheet.getLastRow();
    const logins = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < logins.length; i++) {
      if (String(logins[i][0]) === loginAlvo) {
        sheet.getRange(i + 2, 2).setValue(hashSenha(novaSenha));
        sheet.getRange(i + 2, 5).setValue('S'); // Força troca na próxima entrada
        registrarLog(token, 'RESET_SENHA',
          `${u.login} redefiniu a senha de ${loginAlvo}`);
        return { success: true };
      }
    }
    return { success: false, error: 'Usuário não encontrado.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function obterLogs(token) {
  try {
    const u = validarToken(token);
    if (!u || u.perfil !== 'admin') return { success: false, error: 'Permissão negada.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LOG);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, logs: [] };

    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    const tz = Session.getScriptTimeZone();
    return {
      success: true,
      logs: data.map(row => ({
        timestamp: row[0] instanceof Date
          ? Utilities.formatDate(row[0], tz, 'dd/MM/yyyy HH:mm:ss')
          : String(row[0]),
        login:    row[1],
        nome:     row[2],
        acao:     row[3],
        detalhes: row[4]
      })).reverse() // Mais recente primeiro
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── STATUS RÁPIDO ────────────────────────────────────────────────────────────

function atualizarStatusSolicitacao(token, idSolicitacao, novoStatus) {
  try {
    const u = validarToken(token);
    if (!u) return { success: false, error: 'Sessão inválida. Faça login novamente.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SOLICITACOES);
    if (!sheet) return { success: false, error: 'Aba não encontrada.' };

    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) == String(idSolicitacao)) {
        sheet.getRange(i + 2, 13).setValue(novoStatus);
        registrarLog(token, 'STATUS',
          `Solicitação ${idSolicitacao} → ${novoStatus} por ${u.login}`);
        return { success: true };
      }
    }
    return { success: false, error: 'Solicitação não encontrada.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── LEITURA DE DADOS ─────────────────────────────────────────────────────────

/**
 * Lê uma aba e retorna array de objetos.
 * Datas são formatadas como yyyy-MM-dd.
 * Horários (Horário Início / Horário Fim) são formatados como HH:MM,
 * eliminando definitivamente o bug do 1899-12-30.
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const range   = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values  = range.getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const timeHeaders = new Set(['Horário Início', 'Horário Fim']);
  const tz = Session.getScriptTimeZone();

  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        if (timeHeaders.has(header)) {
          // Extrai HH:MM diretamente do objeto Date — sem risco de 1899
          const h = String(val.getHours()).padStart(2, '0');
          const m = String(val.getMinutes()).padStart(2, '0');
          val = `${h}:${m}`;
        } else {
          val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
        }
      }
      obj[header] = val;
    });
    return obj;
  });
}

function obterDadosCompletos() {
  try {
    const empenhos    = getSheetData(SHEETS.EMPENHOS);
    const itens       = getSheetData(SHEETS.ITENS);
    const solicitacoes = getSheetData(SHEETS.SOLICITACOES);

    const consumoItens    = {};
    const consumoEmpenhos = {};

    solicitacoes.forEach(sol => {
      if (sol['Status'] === 'Cancelado') return;
      const keyItem = sol['Nº Empenho'] + '_' + sol['Código Item'];
      const keyEmp  = sol['Nº Empenho'];
      const qty     = Number(sol['Qtde Consumida']) || 0;
      const item    = itens.find(it => it['Nº Empenho'] === sol['Nº Empenho'] && it['Código'] == sol['Código Item']);
      const unitVal = item ? Number(item['Valor Unitário']) || 0 : 0;
      consumoItens[keyItem]  = (consumoItens[keyItem]  || 0) + qty;
      consumoEmpenhos[keyEmp] = (consumoEmpenhos[keyEmp] || 0) + qty * unitVal;
    });

    const itensCalculados = itens.map(item => {
      const key          = item['Nº Empenho'] + '_' + item['Código'];
      const qtyUtilizada = consumoItens[key] || 0;
      const qtyAut       = Number(item['Qtde Autorizada']) || 0;
      const qtyDisp      = Math.max(0, qtyAut - qtyUtilizada);
      const unitVal      = Number(item['Valor Unitário']) || 0;
      const pct          = qtyAut > 0 ? qtyUtilizada / qtyAut : 0;
      let status = 'Disponível';
      if (qtyDisp <= 0) status = 'Esgotado';
      else if (pct >= 0.8) status = 'Baixo';
      return { ...item, qtyUtilizada, qtyDisponivel: qtyDisp,
               totalAut: qtyAut * unitVal, totalUtilizado: qtyUtilizada * unitVal,
               pctUtilizado: pct, status };
    });

    const empenhosCalculados = empenhos.map(emp => {
      const valorConsumido = consumoEmpenhos[emp['Nº Empenho']] || 0;
      const valorEmpenhado = Number(emp['Valor Empenhado']) || 0;
      const saldo          = Math.max(0, valorEmpenhado - valorConsumido);
      const pct            = valorEmpenhado > 0 ? valorConsumido / valorEmpenhado : 0;
      let status = 'Ativo';
      if (saldo <= 0) status = 'Esgotado';
      else if (pct >= 0.8) status = 'Atenção';
      return { ...emp, valorConsumido, saldo, pctUtilizado: pct, status };
    });

    return { empenhos: empenhosCalculados, itens: itensCalculados, solicitacoes };
  } catch (e) {
    Logger.log(e);
    throw new Error('Erro ao obter dados: ' + e.message);
  }
}

// ─── UPLOAD DE ARQUIVO ────────────────────────────────────────────────────────

function uploadArquivoParaDrive(base64Data, nomeArquivo) {
  try {
    const split           = base64Data.split(',');
    const fileContentType = split[0].match(/:(.*?);/)[1];
    const bytes           = Utilities.base64Decode(split[1]);
    const blob            = Utilities.newBlob(bytes, fileContentType, nomeArquivo);
    const folderName      = 'Empenhos_PDFs';
    const folders         = DriveApp.getFoldersByName(folderName);
    const folder          = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    const file            = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    Logger.log(e);
    throw new Error('Falha no upload: ' + e.message);
  }
}

// ─── OPERAÇÕES DE ESCRITA ─────────────────────────────────────────────────────

function registrarSolicitacao(token, novaSolicitacao) {
  try {
    const u = validarToken(token);
    if (!u) return { success: false, error: 'Sessão inválida.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SOLICITACOES);
    if (!sheet) throw new Error('Aba não encontrada.');

    const solicitacoes = getSheetData(SHEETS.SOLICITACOES);
    if (solicitacoes.some(s => s['Nº Solicitação'] === novaSolicitacao.numeroSolicitacao)) {
      throw new Error(`Solicitação ${novaSolicitacao.numeroSolicitacao} já cadastrada.`);
    }

    const dados     = obterDadosCompletos();
    const itemMatch = dados.itens.find(it =>
      it['Nº Empenho'] === novaSolicitacao.numeroEmpenho && it['Código'] == novaSolicitacao.codigoItem
    );
    if (!itemMatch) throw new Error('Item não encontrado.');

    const qty = Number(novaSolicitacao.qtyConsumida) || 0;
    if (qty <= 0) throw new Error('Quantidade deve ser maior que zero.');
    if (qty > itemMatch.qtyDisponivel) throw new Error(`Quantidade (${qty}) excede o saldo (${itemMatch.qtyDisponivel}).`);

    let fileUrl = '';
    if (novaSolicitacao.pdfFile && novaSolicitacao.pdfFileName) {
      fileUrl = uploadArquivoParaDrive(novaSolicitacao.pdfFile, novaSolicitacao.pdfFileName);
    }

    sheet.appendRow([
      novaSolicitacao.numeroSolicitacao, novaSolicitacao.numeroEmpenho,
      novaSolicitacao.dataSolicitacao, novaSolicitacao.nomeEvento,
      novaSolicitacao.datasEvento, novaSolicitacao.horarioInicio,
      novaSolicitacao.horarioFim, novaSolicitacao.codigoItem,
      qty, novaSolicitacao.localEvento, novaSolicitacao.respMontagem,
      novaSolicitacao.contatoResp, novaSolicitacao.status || 'Solicitado',
      novaSolicitacao.numeroNotaFiscal || '', novaSolicitacao.observacoes || '', fileUrl
    ]);

    registrarLog(token, 'NOVA_SOLICITACAO',
      `${novaSolicitacao.numeroSolicitacao} — Evento: ${novaSolicitacao.nomeEvento} — Item: ${novaSolicitacao.codigoItem} — Qtd: ${qty}`);
    return { success: true };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.message };
  }
}

function editarSolicitacao(token, idSolicitacao, dadosAtualizados) {
  try {
    const u = validarToken(token);
    if (!u) return { success: false, error: 'Sessão inválida.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SOLICITACOES);
    if (!sheet) throw new Error('Aba não encontrada.');

    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowIdx = -1;
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) == String(idSolicitacao)) { rowIdx = i + 2; break; }
    }
    if (rowIdx === -1) throw new Error('Solicitação não encontrada.');

    const dados       = obterDadosCompletos();
    const solOriginal = dados.solicitacoes.find(s => s['Nº Solicitação'] == idSolicitacao);
    const itemMatch   = dados.itens.find(it =>
      it['Nº Empenho'] === dadosAtualizados.numeroEmpenho && it['Código'] == dadosAtualizados.codigoItem
    );

    const qtyDif = Number(dadosAtualizados.qtyConsumida) - (Number(solOriginal['Qtde Consumida']) || 0);
    if (itemMatch && qtyDif > 0 && qtyDif > itemMatch.qtyDisponivel) {
      throw new Error(`Nova quantidade excede saldo. Adicionais: ${qtyDif}, Disponível: ${itemMatch.qtyDisponivel}`);
    }

    let fileUrl = solOriginal['Link PDF'] || '';
    if (dadosAtualizados.pdfFile && dadosAtualizados.pdfFileName) {
      fileUrl = uploadArquivoParaDrive(dadosAtualizados.pdfFile, dadosAtualizados.pdfFileName);
    }

    sheet.getRange(rowIdx,  2).setValue(dadosAtualizados.numeroEmpenho);
    sheet.getRange(rowIdx,  3).setValue(dadosAtualizados.dataSolicitacao);
    sheet.getRange(rowIdx,  4).setValue(dadosAtualizados.nomeEvento);
    sheet.getRange(rowIdx,  5).setValue(dadosAtualizados.datasEvento);
    sheet.getRange(rowIdx,  6).setValue(dadosAtualizados.horarioInicio);
    sheet.getRange(rowIdx,  7).setValue(dadosAtualizados.horarioFim);
    sheet.getRange(rowIdx,  8).setValue(dadosAtualizados.codigoItem);
    sheet.getRange(rowIdx,  9).setValue(dadosAtualizados.qtyConsumida);
    sheet.getRange(rowIdx, 10).setValue(dadosAtualizados.localEvento);
    sheet.getRange(rowIdx, 11).setValue(dadosAtualizados.respMontagem);
    sheet.getRange(rowIdx, 12).setValue(dadosAtualizados.contatoResp);
    sheet.getRange(rowIdx, 13).setValue(dadosAtualizados.status);
    sheet.getRange(rowIdx, 14).setValue(dadosAtualizados.numeroNotaFiscal || '');
    sheet.getRange(rowIdx, 15).setValue(dadosAtualizados.observacoes || '');
    sheet.getRange(rowIdx, 16).setValue(fileUrl);

    registrarLog(token, 'EDITAR_SOLICITACAO',
      `Solicitação ${idSolicitacao} editada por ${u.login}`);
    return { success: true };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.message };
  }
}

function excluirSolicitacao(token, idSolicitacao) {
  try {
    const u = validarToken(token);
    if (!u) return { success: false, error: 'Sessão inválida.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SOLICITACOES);
    if (!sheet) throw new Error('Aba não encontrada.');

    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) == String(idSolicitacao)) {
        sheet.deleteRow(i + 2);
        registrarLog(token, 'EXCLUIR_SOLICITACAO',
          `Solicitação ${idSolicitacao} excluída por ${u.login}`);
        return { success: true };
      }
    }
    throw new Error('Solicitação não encontrada.');
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.message };
  }
}

function cadastrarNovoEmpenhoComItens(token, payload) {
  try {
    const u = validarToken(token);
    if (!u) return { success: false, error: 'Sessão inválida.' };

    const ss       = SpreadsheetApp.getActiveSpreadsheet();
    const sheetEmp   = ss.getSheetByName(SHEETS.EMPENHOS);
    const sheetItens = ss.getSheetByName(SHEETS.ITENS);

    const empenhos = getSheetData(SHEETS.EMPENHOS);
    if (empenhos.some(e => e['Nº Empenho'] === payload.numeroEmpenho)) {
      throw new Error(`Empenho ${payload.numeroEmpenho} já cadastrado.`);
    }

    let fileUrl = '';
    if (payload.pdfFile && payload.pdfFileName) {
      fileUrl = uploadArquivoParaDrive(payload.pdfFile, payload.pdfFileName);
    }

    sheetEmp.appendRow([
      payload.numeroEmpenho, payload.tipo, payload.dataEmissao, payload.vencimento,
      payload.processo, payload.licitacao, payload.fornecedor, payload.cnpj,
      payload.orgao || 'SETUR', payload.dotacao,
      Number(payload.valorEmpenhado) || 0, fileUrl
    ]);

    payload.itens.forEach(item => {
      sheetItens.appendRow([
        payload.numeroEmpenho,
        Number(item.lote)      || 0,
        Number(item.itemIndex) || 0,
        item.codigo,
        item.descricao,
        item.regiao,
        item.unidade || 'UND/DIA',
        Number(item.qtyAutorizada)  || 0,
        Number(item.valorUnitario)  || 0
      ]);
    });

    registrarLog(token, 'NOVO_EMPENHO',
      `Empenho ${payload.numeroEmpenho} — Fornecedor: ${payload.fornecedor} — Valor: R$ ${payload.valorEmpenhado} — por ${u.login}`);
    return { success: true };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.message };
  }
}

function editarEmpenhoComItens(token, numeroEmpenhoOriginal, payload) {
  try {
    const u = validarToken(token);
    if (!u) return { success: false, error: 'Sessão inválida.' };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetEmp = ss.getSheetByName(SHEETS.EMPENHOS);
    const sheetItens = ss.getSheetByName(SHEETS.ITENS);
    const sheetSol = ss.getSheetByName(SHEETS.SOLICITACOES);

    // 1. Verificar se empenho original existe
    const lastRowEmp = sheetEmp.getLastRow();
    if (lastRowEmp <= 1) throw new Error('Planilha de empenhos vazia.');
    const empenhosIds = sheetEmp.getRange(2, 1, lastRowEmp - 1, 1).getValues().flat().map(String);
    const originalIndex = empenhosIds.indexOf(String(numeroEmpenhoOriginal));
    if (originalIndex === -1) throw new Error('Empenho original não encontrado.');
    const empRowIdx = originalIndex + 2;

    // 2. Se mudou o número do empenho, verificar se o novo já existe
    if (String(payload.numeroEmpenho) !== String(numeroEmpenhoOriginal)) {
      if (empenhosIds.includes(String(payload.numeroEmpenho))) {
        throw new Error(`O número de empenho ${payload.numeroEmpenho} já está em uso por outro cadastro.`);
      }
    }

    // 3. Verificar integridade dos itens em relação a solicitações
    const solicitacoes = getSheetData(SHEETS.SOLICITACOES);
    const solsDoEmpenhoOriginal = solicitacoes.filter(s => String(s['Nº Empenho']) === String(numeroEmpenhoOriginal));
    
    solsDoEmpenhoOriginal.forEach(sol => {
      const codItemSol = String(sol['Código Item']);
      const itemAindaExiste = payload.itens.some(it => String(it.codigo) === codItemSol);
      if (!itemAindaExiste) {
        throw new Error(`Não é possível remover o item código ${codItemSol} porque ele possui a solicitação/OS ${sol['Nº Solicitação']} vinculada a ele.`);
      }
      
      const novaQtyAut = Number(payload.itens.find(it => String(it.codigo) === codItemSol).qtyAutorizada) || 0;
      const consumoAcumulado = solicitacoes
        .filter(s => String(s['Nº Empenho']) === String(numeroEmpenhoOriginal) && String(s['Código Item']) === codItemSol && s['Status'] !== 'Cancelado')
        .reduce((sum, s) => sum + (Number(s['Qtde Consumida']) || 0), 0);
      
      if (novaQtyAut < consumoAcumulado) {
        throw new Error(`Não é possível reduzir a quantidade autorizada do item ${codItemSol} para ${novaQtyAut} porque o consumo atual dele já é de ${consumoAcumulado}.`);
      }
    });

    // 4. Se houver upload de novo PDF, usa. Senão, mantém o link PDF existente
    const empOriginalData = sheetEmp.getRange(empRowIdx, 1, 1, 12).getValues()[0];
    let fileUrl = empOriginalData[11] || ''; // Link PDF na coluna 12 (index 11)
    if (payload.pdfFile && payload.pdfFileName) {
      fileUrl = uploadArquivoParaDrive(payload.pdfFile, payload.pdfFileName);
    }

    // 5. Atualizar os dados do empenho na planilha
    sheetEmp.getRange(empRowIdx, 1, 1, 12).setValues([[
      payload.numeroEmpenho, payload.tipo, payload.dataEmissao, payload.vencimento,
      payload.processo, payload.licitacao, payload.fornecedor, payload.cnpj,
      payload.orgao || 'SETUR', payload.dotacao,
      Number(payload.valorEmpenhado) || 0, fileUrl
    ]]);

    // 6. Atualizar referências em cascata nas solicitações se o ID mudou
    if (String(payload.numeroEmpenho) !== String(numeroEmpenhoOriginal)) {
      const lastRowSol = sheetSol.getLastRow();
      if (lastRowSol > 1) {
        const solEmpenhoCols = sheetSol.getRange(2, 2, lastRowSol - 1, 1).getValues();
        for (let i = 0; i < solEmpenhoCols.length; i++) {
          if (String(solEmpenhoCols[i][0]) === String(numeroEmpenhoOriginal)) {
            sheetSol.getRange(i + 2, 2).setValue(payload.numeroEmpenho);
          }
        }
      }
    }

    // 7. Remover itens antigos do empenho original na planilha
    const lastRowItens = sheetItens.getLastRow();
    if (lastRowItens > 1) {
      const itensEmpenhoCols = sheetItens.getRange(1, 1, lastRowItens, 1).getValues();
      for (let i = lastRowItens; i >= 2; i--) {
        if (String(itensEmpenhoCols[i - 1][0]) === String(numeroEmpenhoOriginal)) {
          sheetItens.deleteRow(i);
        }
      }
    }

    // 8. Inserir novos itens com o número do empenho atualizado
    payload.itens.forEach(item => {
      sheetItens.appendRow([
        payload.numeroEmpenho,
        Number(item.lote)      || 0,
        Number(item.itemIndex) || 0,
        item.codigo,
        item.descricao,
        item.regiao,
        item.unidade || 'UND/DIA',
        Number(item.qtyAutorizada)  || 0,
        Number(item.valorUnitario)  || 0
      ]);
    });

    registrarLog(token, 'EDITAR_EMPENHO',
      `Empenho ${numeroEmpenhoOriginal} editado para ${payload.numeroEmpenho} — Fornecedor: ${payload.fornecedor} — Valor: R$ ${payload.valorEmpenhado} — por ${u.login}`);
    return { success: true };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.message };
  }
}

