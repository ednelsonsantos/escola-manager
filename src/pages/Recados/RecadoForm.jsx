// ============================================================
// RecadoForm.jsx  —  Modal para criar / editar recado
// ============================================================

import React, { useState, useEffect } from 'react';
import styles from './Recados.module.css';

const ipc = window.electron?.ipcRenderer ?? window.ipcRenderer;

const TIPOS_DEST = [
  { value: 'todos',         label: 'Todos os alunos ativos' },
  { value: 'lista_espera',  label: 'Lista de espera' },
  { value: 'inadimplentes', label: 'Inadimplentes' },
  { value: 'turma',         label: 'Turma específica' },
  { value: 'aluno',         label: 'Aluno específico' },
];

export default function RecadoForm({ recado, usuarioAtual, onSalvar, onFechar }) {
  const editando = !!recado;

  const [form, setForm] = useState({
    titulo: recado?.titulo ?? '',
    mensagem: recado?.mensagem ?? '',
    prioridade: recado?.prioridade ?? 'normal',
    agendado_para: recado?.agendado_para ? recado.agendado_para.slice(0, 16) : '',
  });

  const [destinatarios, setDestinatarios] = useState(
    recado?.destinatarios ?? [{ tipo: 'todos', referencia_id: null, referencia_nome: null }]
  );

  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Carregar turmas e alunos para seleção
  useEffect(() => {
    ipc?.invoke('turmas:listar').then(setTurmas).catch(() => {});
    ipc?.invoke('alunos:listar', { status: 'ativo' }).then(setAlunos).catch(() => {});
  }, []);

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  // ── Destinatários ──
  function adicionarDest() {
    setDestinatarios(d => [...d, { tipo: 'todos', referencia_id: null, referencia_nome: null }]);
  }

  function removerDest(idx) {
    setDestinatarios(d => d.filter((_, i) => i !== idx));
  }

  function atualizarDest(idx, campo, valor) {
    setDestinatarios(d => d.map((item, i) => {
      if (i !== idx) return item;
      if (campo === 'tipo') return { tipo: valor, referencia_id: null, referencia_nome: null };
      if (campo === 'referencia_id') {
        let nome = null;
        if (item.tipo === 'turma') {
          nome = turmas.find(t => t.id === Number(valor))?.nome ?? null;
        } else if (item.tipo === 'aluno') {
          nome = alunos.find(a => a.id === Number(valor))?.nome ?? null;
        }
        return { ...item, referencia_id: Number(valor), referencia_nome: nome };
      }
      return { ...item, [campo]: valor };
    }));
  }

  // ── Submit ──
  async function handleSubmit(enviar_agora) {
    if (!form.titulo.trim()) { setErro('Informe o título do recado.'); return; }
    if (!form.mensagem.trim()) { setErro('Informe a mensagem.'); return; }
    if (destinatarios.length === 0) { setErro('Adicione ao menos um destinatário.'); return; }

    const destInvalidos = destinatarios.filter(
      d => (d.tipo === 'turma' || d.tipo === 'aluno') && !d.referencia_id
    );
    if (destInvalidos.length > 0) { setErro('Selecione turma/aluno para todos os destinatários.'); return; }

    setSalvando(true);
    setErro('');
    try {
      await onSalvar({
        id: recado?.id,
        ...form,
        agendado_para: form.agendado_para || null,
        destinatarios,
        enviar_agora,
      });
    } catch (err) {
      setErro(err.message ?? 'Erro ao salvar recado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className={styles.modal}>

        {/* Cabeçalho */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitulo}>{editando ? 'Editar recado' : 'Novo recado'}</h2>
          <button className={styles.btnFechar} onClick={onFechar} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.modalCorpo}>

          {/* Título */}
          <div className={styles.campo}>
            <label className={styles.label}>Título <span className={styles.obrig}>*</span></label>
            <input
              className={styles.input}
              type="text"
              placeholder="Ex: Reunião de pais — 3º Trimestre"
              value={form.titulo}
              onChange={e => set('titulo', e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Mensagem */}
          <div className={styles.campo}>
            <label className={styles.label}>Mensagem <span className={styles.obrig}>*</span></label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Digite o conteúdo do recado..."
              value={form.mensagem}
              onChange={e => set('mensagem', e.target.value)}
              rows={5}
            />
          </div>

          {/* Prioridade + Agendamento */}
          <div className={styles.linha2col}>
            <div className={styles.campo}>
              <label className={styles.label}>Prioridade</label>
              <select className={styles.input} value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
                <option value="normal">Normal</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className={styles.campo}>
              <label className={styles.label}>Agendar envio para</label>
              <input
                className={styles.input}
                type="datetime-local"
                value={form.agendado_para}
                onChange={e => set('agendado_para', e.target.value)}
              />
              <span className={styles.hint}>Deixe em branco para não agendar</span>
            </div>
          </div>

          {/* Destinatários */}
          <div className={styles.campo}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Destinatários <span className={styles.obrig}>*</span></label>
              <button type="button" className={styles.btnAddDest} onClick={adicionarDest}>
                + Adicionar grupo
              </button>
            </div>

            <div className={styles.destLista}>
              {destinatarios.map((dest, idx) => (
                <div key={idx} className={styles.destItem}>
                  <select
                    className={styles.inputSm}
                    value={dest.tipo}
                    onChange={e => atualizarDest(idx, 'tipo', e.target.value)}
                  >
                    {TIPOS_DEST.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  {dest.tipo === 'turma' && (
                    <select
                      className={styles.inputSm}
                      value={dest.referencia_id ?? ''}
                      onChange={e => atualizarDest(idx, 'referencia_id', e.target.value)}
                    >
                      <option value="">Selecione a turma...</option>
                      {turmas.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  )}

                  {dest.tipo === 'aluno' && (
                    <select
                      className={styles.inputSm}
                      value={dest.referencia_id ?? ''}
                      onChange={e => atualizarDest(idx, 'referencia_id', e.target.value)}
                    >
                      <option value="">Selecione o aluno...</option>
                      {alunos.map(a => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                  )}

                  {destinatarios.length > 1 && (
                    <button
                      type="button"
                      className={styles.btnRemDest}
                      onClick={() => removerDest(idx)}
                      aria-label="Remover destinatário"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className={styles.erroMsg}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {erro}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className={styles.modalFooter}>
          <button className={styles.btnSecundario} onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <div className={styles.footerAcoes}>
            <button
              className={styles.btnRascunho}
              onClick={() => handleSubmit(false)}
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : form.agendado_para ? 'Agendar' : 'Salvar rascunho'}
            </button>
            {!form.agendado_para && (
              <button
                className={styles.btnPrimario}
                onClick={() => handleSubmit(true)}
                disabled={salvando}
              >
                {salvando ? 'Enviando...' : 'Enviar agora'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
