// ============================================================
// recados.handlers.js  —  Main Process (Electron)
// Registrar com: registerRecadosHandlers(ipcMain, db)
// ============================================================

const { ipcMain } = require('electron');

function registerRecadosHandlers(ipcMain, db) {

  // ──────────────────────────────────────────────
  // Listar recados (admin/secretaria/professor)
  // filtros: { status, remetente_tipo, remetente_id, search }
  // ──────────────────────────────────────────────
  ipcMain.handle('recados:listar', (_, filtros = {}) => {
    try {
      let where = [];
      let params = [];

      if (filtros.status) {
        where.push('r.status = ?');
        params.push(filtros.status);
      }
      if (filtros.remetente_tipo) {
        where.push('r.remetente_tipo = ?');
        params.push(filtros.remetente_tipo);
      }
      if (filtros.remetente_id) {
        where.push('r.remetente_id = ?');
        params.push(filtros.remetente_id);
      }
      if (filtros.search) {
        where.push('(r.titulo LIKE ? OR r.mensagem LIKE ?)');
        params.push(`%${filtros.search}%`, `%${filtros.search}%`);
      }

      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

      const recados = db.prepare(`
        SELECT
          r.*,
          COUNT(DISTINCT rd.id) as total_destinatarios,
          COUNT(DISTINCT rl.id) as total_lidos
        FROM recados r
        LEFT JOIN recados_destinatarios rd ON rd.recado_id = r.id
        LEFT JOIN recados_leituras rl ON rl.recado_id = r.id AND rl.lido = 1
        ${whereClause}
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `).all(...params);

      // Buscar destinatários de cada recado
      const stmtDest = db.prepare(`
        SELECT * FROM recados_destinatarios WHERE recado_id = ?
      `);

      return recados.map(r => ({
        ...r,
        destinatarios: stmtDest.all(r.id)
      }));
    } catch (err) {
      console.error('[recados:listar]', err);
      throw err;
    }
  });

  // ──────────────────────────────────────────────
  // Recados recebidos por um aluno
  // ──────────────────────────────────────────────
  ipcMain.handle('recados:para-aluno', (_, { aluno_id, turma_id }) => {
    try {
      // Recados enviados para este aluno especificamente, para sua turma, ou para todos
      const recados = db.prepare(`
        SELECT DISTINCT
          r.*,
          COALESCE(rl.lido, 0) as lido,
          rl.lido_em
        FROM recados r
        JOIN recados_destinatarios rd ON rd.recado_id = r.id
        LEFT JOIN recados_leituras rl ON rl.recado_id = r.id AND rl.aluno_id = ?
        WHERE r.status = 'enviado'
          AND (
            (rd.tipo = 'aluno' AND rd.referencia_id = ?)
            OR (rd.tipo = 'turma' AND rd.referencia_id = ?)
            OR rd.tipo = 'todos'
          )
        ORDER BY r.enviado_em DESC
      `).all(aluno_id, aluno_id, turma_id ?? -1);

      return recados;
    } catch (err) {
      console.error('[recados:para-aluno]', err);
      throw err;
    }
  });

  // ──────────────────────────────────────────────
  // Criar / atualizar recado (rascunho ou agendado)
  // ──────────────────────────────────────────────
  ipcMain.handle('recados:salvar', (_, dados) => {
    try {
      const {
        id,
        titulo,
        mensagem,
        remetente_tipo,
        remetente_id,
        remetente_nome,
        prioridade = 'normal',
        agendado_para = null,
        destinatarios = [],   // [{ tipo, referencia_id, referencia_nome }]
        enviar_agora = false
      } = dados;

      const status = enviar_agora
        ? 'enviado'
        : agendado_para
          ? 'agendado'
          : 'rascunho';

      const enviado_em = enviar_agora ? new Date().toISOString() : null;

      let recadoId = id;

      const upsert = db.transaction(() => {
        if (id) {
          db.prepare(`
            UPDATE recados SET
              titulo = ?, mensagem = ?, prioridade = ?,
              agendado_para = ?, status = ?, enviado_em = ?
            WHERE id = ?
          `).run(titulo, mensagem, prioridade, agendado_para, status, enviado_em, id);

          db.prepare('DELETE FROM recados_destinatarios WHERE recado_id = ?').run(id);
        } else {
          const result = db.prepare(`
            INSERT INTO recados
              (titulo, mensagem, remetente_tipo, remetente_id, remetente_nome,
               prioridade, agendado_para, status, enviado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(titulo, mensagem, remetente_tipo, remetente_id, remetente_nome,
                 prioridade, agendado_para, status, enviado_em);

          recadoId = result.lastInsertRowid;
        }

        const stmtDest = db.prepare(`
          INSERT INTO recados_destinatarios (recado_id, tipo, referencia_id, referencia_nome)
          VALUES (?, ?, ?, ?)
        `);

        for (const dest of destinatarios) {
          stmtDest.run(recadoId, dest.tipo, dest.referencia_id ?? null, dest.referencia_nome ?? null);
        }

        // Se enviando agora, criar entradas de leitura para alunos individuais
        if (enviar_agora) {
          _criarLeituras(db, recadoId, destinatarios);
        }
      });

      upsert();
      return { ok: true, id: recadoId };
    } catch (err) {
      console.error('[recados:salvar]', err);
      throw err;
    }
  });

  // ──────────────────────────────────────────────
  // Enviar recado agendado agora (ou ao disparar scheduler)
  // ──────────────────────────────────────────────
  ipcMain.handle('recados:enviar', (_, { id }) => {
    try {
      const recado = db.prepare('SELECT * FROM recados WHERE id = ?').get(id);
      if (!recado) throw new Error('Recado não encontrado');

      const destinatarios = db.prepare(
        'SELECT * FROM recados_destinatarios WHERE recado_id = ?'
      ).all(id);

      db.transaction(() => {
        db.prepare(`
          UPDATE recados SET status = 'enviado', enviado_em = ? WHERE id = ?
        `).run(new Date().toISOString(), id);

        _criarLeituras(db, id, destinatarios);
      })();

      return { ok: true };
    } catch (err) {
      console.error('[recados:enviar]', err);
      throw err;
    }
  });

  // ──────────────────────────────────────────────
  // Marcar recado como lido pelo aluno
  // ──────────────────────────────────────────────
  ipcMain.handle('recados:marcar-lido', (_, { recado_id, aluno_id }) => {
    try {
      db.prepare(`
        INSERT INTO recados_leituras (recado_id, aluno_id, lido, lido_em)
        VALUES (?, ?, 1, datetime('now','localtime'))
        ON CONFLICT(recado_id, aluno_id)
        DO UPDATE SET lido = 1, lido_em = datetime('now','localtime')
      `).run(recado_id, aluno_id);
      return { ok: true };
    } catch (err) {
      console.error('[recados:marcar-lido]', err);
      throw err;
    }
  });

  // ──────────────────────────────────────────────
  // Excluir recado (apenas rascunhos / admin)
  // ──────────────────────────────────────────────
  ipcMain.handle('recados:excluir', (_, { id }) => {
    try {
      db.prepare('DELETE FROM recados WHERE id = ?').run(id);
      return { ok: true };
    } catch (err) {
      console.error('[recados:excluir]', err);
      throw err;
    }
  });

  // ──────────────────────────────────────────────
  // Contador de não lidos para badge no menu
  // ──────────────────────────────────────────────
  ipcMain.handle('recados:nao-lidos-count', (_, { aluno_id, turma_id }) => {
    try {
      const row = db.prepare(`
        SELECT COUNT(*) as total
        FROM recados r
        JOIN recados_destinatarios rd ON rd.recado_id = r.id
        LEFT JOIN recados_leituras rl ON rl.recado_id = r.id AND rl.aluno_id = ?
        WHERE r.status = 'enviado'
          AND COALESCE(rl.lido, 0) = 0
          AND (
            (rd.tipo = 'aluno' AND rd.referencia_id = ?)
            OR (rd.tipo = 'turma' AND rd.referencia_id = ?)
            OR rd.tipo = 'todos'
          )
      `).get(aluno_id, aluno_id, turma_id ?? -1);
      return row.total;
    } catch (err) {
      console.error('[recados:nao-lidos-count]', err);
      return 0;
    }
  });

  // ──────────────────────────────────────────────
  // Scheduler: verificar recados agendados vencidos
  // Chamar de setInterval a cada 60s no main process
  // ──────────────────────────────────────────────
  function processarAgendados() {
    try {
      const vencidos = db.prepare(`
        SELECT r.*, GROUP_CONCAT(rd.id) as dest_ids
        FROM recados r
        LEFT JOIN recados_destinatarios rd ON rd.recado_id = r.id
        WHERE r.status = 'agendado'
          AND r.agendado_para <= datetime('now','localtime')
        GROUP BY r.id
      `).all();

      for (const recado of vencidos) {
        const destinatarios = db.prepare(
          'SELECT * FROM recados_destinatarios WHERE recado_id = ?'
        ).all(recado.id);

        db.transaction(() => {
          db.prepare(`
            UPDATE recados SET status = 'enviado', enviado_em = datetime('now','localtime')
            WHERE id = ?
          `).run(recado.id);
          _criarLeituras(db, recado.id, destinatarios);
        })();

        console.log(`[recados] Recado #${recado.id} agendado enviado.`);
      }
    } catch (err) {
      console.error('[recados:scheduler]', err);
    }
  }

  // Retorna a função do scheduler para o caller registrar no setInterval
  return { processarAgendados };
}

// ──────────────────────────────────────────────
// Helper: criar entradas de leitura para alunos
// Resolve grupos (turma, todos, lista_espera) para alunos individuais
// ──────────────────────────────────────────────
function _criarLeituras(db, recadoId, destinatarios) {
  const stmtInsert = db.prepare(`
    INSERT OR IGNORE INTO recados_leituras (recado_id, aluno_id)
    VALUES (?, ?)
  `);

  for (const dest of destinatarios) {
    let alunoIds = [];

    if (dest.tipo === 'aluno') {
      alunoIds = [dest.referencia_id];
    } else if (dest.tipo === 'turma') {
      alunoIds = db.prepare(
        'SELECT id FROM alunos WHERE turma_id = ? AND status = "ativo"'
      ).all(dest.referencia_id).map(a => a.id);
    } else if (dest.tipo === 'todos') {
      alunoIds = db.prepare(
        'SELECT id FROM alunos WHERE status = "ativo"'
      ).all().map(a => a.id);
    } else if (dest.tipo === 'lista_espera') {
      alunoIds = db.prepare(
        'SELECT id FROM alunos WHERE status = "lista_espera"'
      ).all().map(a => a.id);
    } else if (dest.tipo === 'inadimplentes') {
      // Adaptar conforme tabela financeira do projeto
      alunoIds = db.prepare(
        'SELECT DISTINCT aluno_id FROM financeiro WHERE status = "inadimplente"'
      ).all().map(a => a.aluno_id);
    }

    for (const alunoId of alunoIds) {
      if (alunoId) stmtInsert.run(recadoId, alunoId);
    }
  }
}

module.exports = { registerRecadosHandlers };
