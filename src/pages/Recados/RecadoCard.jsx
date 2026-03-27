// ============================================================
// RecadoCard.jsx  —  Card de recado na listagem admin
// ============================================================

import React, { useState } from 'react';
import styles from './Recados.module.css';

const PRIORIDADE_LABEL = { normal: 'Normal', importante: 'Importante', urgente: 'Urgente' };
const STATUS_LABEL = { rascunho: 'Rascunho', agendado: 'Agendado', enviado: 'Enviado' };

const TIPO_DEST_LABEL = {
  aluno: 'Aluno',
  turma: 'Turma',
  lista_espera: 'Lista de Espera',
  todos: 'Todos os alunos',
  inadimplentes: 'Inadimplentes',
};

function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function RecadoCard({ recado, onEditar, onEnviar, onExcluir, podeEditar }) {
  const [expandido, setExpandido] = useState(false);

  const totalDest = recado.total_destinatarios ?? 0;
  const totalLidos = recado.total_lidos ?? 0;
  const taxaLeitura = totalDest > 0 ? Math.round((totalLidos / totalDest) * 100) : 0;

  return (
    <div className={`${styles.card} ${styles[`card_${recado.status}`]} ${styles[`card_pri_${recado.prioridade}`]}`}>

      {/* ── Linha principal ── */}
      <div className={styles.cardTopo} onClick={() => setExpandido(e => !e)}>
        <div className={styles.cardTituloArea}>
          <div className={styles.cardMeta}>
            <span className={`${styles.statusPill} ${styles[`status_${recado.status}`]}`}>
              {STATUS_LABEL[recado.status]}
            </span>
            {recado.prioridade !== 'normal' && (
              <span className={`${styles.prioridadePill} ${styles[`prio_${recado.prioridade}`]}`}>
                {PRIORIDADE_LABEL[recado.prioridade]}
              </span>
            )}
          </div>
          <h3 className={styles.cardTitulo}>{recado.titulo}</h3>
          <div className={styles.cardInfo}>
            <span>Por {recado.remetente_nome}</span>
            <span className={styles.sep}>·</span>
            {recado.status === 'enviado' && <span>{formatarData(recado.enviado_em)}</span>}
            {recado.status === 'agendado' && <span>Agendado para {formatarData(recado.agendado_para)}</span>}
            {recado.status === 'rascunho' && <span>Criado em {formatarData(recado.created_at)}</span>}
          </div>
        </div>

        {/* Destinatários e leitura */}
        <div className={styles.cardStats}>
          {recado.status === 'enviado' && (
            <div className={styles.leituraWrap}>
              <div className={styles.leituraBar}>
                <div className={styles.leituraFill} style={{ width: `${taxaLeitura}%` }} />
              </div>
              <span className={styles.leituraTexto}>{totalLidos}/{totalDest} leram</span>
            </div>
          )}
          <div className={styles.destChips}>
            {(recado.destinatarios ?? []).slice(0, 3).map((d, i) => (
              <span key={i} className={styles.destChip}>
                {d.tipo === 'aluno' || d.tipo === 'turma' ? d.referencia_nome : TIPO_DEST_LABEL[d.tipo]}
              </span>
            ))}
            {(recado.destinatarios ?? []).length > 3 && (
              <span className={styles.destChip}>+{recado.destinatarios.length - 3}</span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg className={`${styles.chevron} ${expandido ? styles.chevronAberto : ''}`}
          width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── Conteúdo expandido ── */}
      {expandido && (
        <div className={styles.cardCorpo}>
          <p className={styles.cardMensagem}>{recado.mensagem}</p>

          {podeEditar && (
            <div className={styles.cardAcoes}>
              {recado.status !== 'enviado' && (
                <>
                  <button className={styles.btnAcao} onClick={onEditar}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 2.5l2 2-7 7H2.5V9.5l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    Editar
                  </button>
                  <button className={`${styles.btnAcao} ${styles.btnEnviar}`} onClick={onEnviar}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1.5 7l11-5-5 11-1.5-4.5L1.5 7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
                    </svg>
                    Enviar agora
                  </button>
                </>
              )}
              {recado.status === 'rascunho' && (
                <button className={`${styles.btnAcao} ${styles.btnExcluir}`} onClick={onExcluir}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Excluir
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
