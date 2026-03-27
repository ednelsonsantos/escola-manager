// ============================================================
// RecadosPage.jsx  —  Aba principal do módulo de recados
// Visão: Secretaria / Admin / Professor
// ============================================================

import React, { useState, useMemo } from 'react';
import { useRecados } from './useRecados';
import RecadoForm from './RecadoForm';
import RecadoCard from './RecadoCard';
import styles from './Recados.module.css';

const FILTROS_STATUS = [
  { value: '', label: 'Todos' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'agendado', label: 'Agendados' },
  { value: 'rascunho', label: 'Rascunhos' },
];

export default function RecadosPage({ usuarioAtual }) {
  // usuarioAtual: { id, nome, tipo: 'secretaria' | 'professor' }

  const [filtroStatus, setFiltroStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [recadoEditando, setRecadoEditando] = useState(null);

  const filtros = useMemo(() => {
    const f = {};
    if (filtroStatus) f.status = filtroStatus;
    if (search.trim()) f.search = search.trim();
    // Professor vê apenas seus próprios recados
    if (usuarioAtual?.tipo === 'professor') {
      f.remetente_tipo = 'professor';
      f.remetente_id = usuarioAtual.id;
    }
    return f;
  }, [filtroStatus, search, usuarioAtual]);

  const { recados, loading, error, salvar, enviar, excluir } = useRecados(filtros);

  const contadores = useMemo(() => ({
    enviados:  recados.filter(r => r.status === 'enviado').length,
    agendados: recados.filter(r => r.status === 'agendado').length,
    rascunhos: recados.filter(r => r.status === 'rascunho').length,
  }), [recados]);

  function abrirNovo() {
    setRecadoEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(recado) {
    setRecadoEditando(recado);
    setModalAberto(true);
  }

  async function handleSalvar(dados) {
    await salvar({ ...dados, remetente_tipo: usuarioAtual.tipo, remetente_id: usuarioAtual.id, remetente_nome: usuarioAtual.nome });
    setModalAberto(false);
  }

  async function handleEnviar(id) {
    if (window.confirm('Enviar este recado agora para todos os destinatários?')) {
      await enviar(id);
    }
  }

  async function handleExcluir(id) {
    if (window.confirm('Excluir este recado? Esta ação não pode ser desfeita.')) {
      await excluir(id);
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Cabeçalho ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.titulo}>Recados</h1>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.badgeEnviado}`}>{contadores.enviados} enviados</span>
            {contadores.agendados > 0 && (
              <span className={`${styles.badge} ${styles.badgeAgendado}`}>{contadores.agendados} agendados</span>
            )}
            {contadores.rascunhos > 0 && (
              <span className={`${styles.badge} ${styles.badgeRascunho}`}>{contadores.rascunhos} rascunhos</span>
            )}
          </div>
        </div>
        <button className={styles.btnNovo} onClick={abrirNovo}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Novo Recado
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className={styles.filtros}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar recados..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.tabs}>
          {FILTROS_STATUS.map(f => (
            <button
              key={f.value}
              className={`${styles.tab} ${filtroStatus === f.value ? styles.tabAtivo : ''}`}
              onClick={() => setFiltroStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      <div className={styles.lista}>
        {loading && (
          <div className={styles.estado}>
            <div className={styles.spinner} />
            <span>Carregando recados...</span>
          </div>
        )}

        {error && (
          <div className={styles.estadoErro}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 6v4M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Erro ao carregar: {error}
          </div>
        )}

        {!loading && !error && recados.length === 0 && (
          <div className={styles.estado}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.3">
              <rect x="8" y="10" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 18h16M16 24h12M16 30h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Nenhum recado encontrado.</span>
            <button className={styles.btnNovo} onClick={abrirNovo}>Criar primeiro recado</button>
          </div>
        )}

        {!loading && recados.map(recado => (
          <RecadoCard
            key={recado.id}
            recado={recado}
            onEditar={() => abrirEdicao(recado)}
            onEnviar={() => handleEnviar(recado.id)}
            onExcluir={() => handleExcluir(recado.id)}
            podeEditar={usuarioAtual?.tipo === 'secretaria' || recado.remetente_id === usuarioAtual?.id}
          />
        ))}
      </div>

      {/* ── Modal de formulário ── */}
      {modalAberto && (
        <RecadoForm
          recado={recadoEditando}
          usuarioAtual={usuarioAtual}
          onSalvar={handleSalvar}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}
