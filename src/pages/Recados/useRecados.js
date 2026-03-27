// ============================================================
// useRecados.js  —  Hook React
// Abstrai todas as chamadas ipcRenderer para o módulo de recados
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const ipc = window.electron?.ipcRenderer ?? window.ipcRenderer;

// ──────────────────────────────────────
// Hook principal — painel admin/secretaria/professor
// ──────────────────────────────────────
export function useRecados(filtros = {}) {
  const [recados, setRecados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ipc.invoke('recados:listar', filtros);
      setRecados(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filtros)]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = useCallback(async (dados) => {
    const result = await ipc.invoke('recados:salvar', dados);
    await carregar();
    return result;
  }, [carregar]);

  const enviar = useCallback(async (id) => {
    const result = await ipc.invoke('recados:enviar', { id });
    await carregar();
    return result;
  }, [carregar]);

  const excluir = useCallback(async (id) => {
    await ipc.invoke('recados:excluir', { id });
    await carregar();
  }, [carregar]);

  return { recados, loading, error, carregar, salvar, enviar, excluir };
}

// ──────────────────────────────────────
// Hook para aluno/responsável
// ──────────────────────────────────────
export function useRecadosAluno(aluno_id, turma_id) {
  const [recados, setRecados] = useState([]);
  const [naoLidos, setNaoLidos] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!aluno_id) return;
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        ipc.invoke('recados:para-aluno', { aluno_id, turma_id }),
        ipc.invoke('recados:nao-lidos-count', { aluno_id, turma_id }),
      ]);
      setRecados(data);
      setNaoLidos(count);
    } finally {
      setLoading(false);
    }
  }, [aluno_id, turma_id]);

  useEffect(() => { carregar(); }, [carregar]);

  const marcarLido = useCallback(async (recado_id) => {
    await ipc.invoke('recados:marcar-lido', { recado_id, aluno_id });
    setRecados(prev =>
      prev.map(r => r.id === recado_id ? { ...r, lido: 1 } : r)
    );
    setNaoLidos(prev => Math.max(0, prev - 1));
  }, [aluno_id]);

  return { recados, naoLidos, loading, carregar, marcarLido };
}
