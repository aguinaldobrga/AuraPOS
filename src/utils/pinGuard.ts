// ──────────────────────────────────────────────────────────────────────────────
// usePinGuard — Proteção contra força bruta (Brute Force) em telas de PIN
//
// Comportamento:
//   • Até 4 tentativas erradas: erro simples
//   • Na 5ª tentativa: bloqueio de 30s (dobra a cada rodada: 60s, 120s, 240s…)
//   • Countdown regressivo visível
//   • Estado salvo no sessionStorage (persiste na sessão, some ao fechar o browser)
//   • Cada userId tem seu próprio contador independente
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_ATTEMPTS = 5;       // Tentativas antes de bloquear
const BASE_LOCKOUT_MS = 30_000; // 30 segundos de bloqueio base

interface GuardState {
  failures: number;
  lockedUntil: number;   // timestamp em ms (0 = não bloqueado)
  lockRound: number;     // quantas rodadas de bloqueio já ocorreram
}

function storageKey(userId: string) {
  return `pin_guard_${userId}`;
}

function loadState(userId: string): GuardState {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw) as GuardState;
  } catch {
    // fallback seguro
  }
  return { failures: 0, lockedUntil: 0, lockRound: 0 };
}

function saveState(userId: string, state: GuardState) {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // fallback seguro — sem acesso ao sessionStorage
  }
}

function clearState(userId: string) {
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch { /* noop */ }
}

export interface PinGuardResult {
  /** Indica se o usuário está atualmente bloqueado */
  isLocked: boolean;
  /** Segundos restantes de bloqueio (0 quando não bloqueado) */
  lockSecondsRemaining: number;
  /** Chama após uma tentativa de PIN incorreta */
  recordFailure: () => void;
  /** Chama após um login bem-sucedido */
  resetFailures: () => void;
  /** Quantas tentativas já foram feitas na rodada atual */
  failureCount: number;
}

/**
 * Hook de proteção contra força bruta para telas de PIN.
 *
 * @param userId - ID do usuário sendo autenticado (ou string fixa como 'admin')
 */
export function usePinGuard(userId: string): PinGuardResult {
  const [guardState, setGuardState] = useState<GuardState>(() => loadState(userId));
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Atualiza o userId quando mudar (troca de operador no select)
  useEffect(() => {
    setGuardState(loadState(userId));
  }, [userId]);

  // Ticker a cada segundo enquanto houver bloqueio ativo
  useEffect(() => {
    if (guardState.lockedUntil > Date.now()) {
      timerRef.current = setInterval(() => {
        const currentNow = Date.now();
        setNow(currentNow);
        if (currentNow >= guardState.lockedUntil) {
          // Bloqueio expirou — zera tentativas mas mantém o round
          const nextState: GuardState = {
            failures: 0,
            lockedUntil: 0,
            lockRound: guardState.lockRound
          };
          saveState(userId, nextState);
          setGuardState(nextState);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [guardState.lockedUntil, userId, guardState.lockRound]);

  const recordFailure = useCallback(() => {
    setGuardState(prev => {
      const nextFailures = prev.failures + 1;

      if (nextFailures >= MAX_ATTEMPTS) {
        // Calcula duração do bloqueio com backoff exponencial
        const nextRound = prev.lockRound + 1;
        const lockDuration = BASE_LOCKOUT_MS * Math.pow(2, nextRound - 1);
        const lockedUntil = Date.now() + lockDuration;
        const next: GuardState = { failures: nextFailures, lockedUntil, lockRound: nextRound };
        saveState(userId, next);
        return next;
      }

      const next: GuardState = { ...prev, failures: nextFailures };
      saveState(userId, next);
      return next;
    });
    setNow(Date.now());
  }, [userId]);

  const resetFailures = useCallback(() => {
    clearState(userId);
    setGuardState({ failures: 0, lockedUntil: 0, lockRound: 0 });
  }, [userId]);

  const isLocked = guardState.lockedUntil > now;
  const lockSecondsRemaining = isLocked
    ? Math.ceil((guardState.lockedUntil - now) / 1000)
    : 0;

  return {
    isLocked,
    lockSecondsRemaining,
    recordFailure,
    resetFailures,
    failureCount: guardState.failures
  };
}
