import { useState, FormEvent } from 'react';
import { usePos } from '@/context/PosContext';
import { Lock, Store, ArrowRight, AlertCircle, ShieldOff, Timer } from 'lucide-react';
import { verifyPin } from '@/utils';
import { usePinGuard } from '@/utils/pinGuard';

interface PinLockScreenProps {
  onSuccess: () => void;
}

export function PinLockScreen({ onSuccess }: PinLockScreenProps) {
  const { users, setCurrentUser } = usePos();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Proteção contra força bruta — vinculada ao usuário selecionado
  const guard = usePinGuard(selectedUserId || '__no_user__');

  const activeUsers = users.filter(u => u.active);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 1. Bloquear submissão se o guard estiver ativo
    if (guard.isLocked) return;

    // 2. Validação de seleção de operador
    if (!selectedUserId) {
      setError('Selecione seu nome na lista.');
      return;
    }

    // 3. Busca do operador ativo
    const user = activeUsers.find(u => u.id === selectedUserId);
    if (!user) {
      setError('Usuário não encontrado.');
      return;
    }

   try {
  // 4. Verifica o PIN usando PBKDF2 + salt armazenado no hash
      const isPinValid = await verifyPin(pin.trim(), user.pin);

      if (!isPinValid) {
        guard.recordFailure();

        // Mensagem adaptada ao contexto de bloqueio
        const attemptsLeft = 5 - (guard.failureCount + 1);
        if (attemptsLeft <= 0) {
          setError('Muitas tentativas incorretas. Aguarde o tempo de bloqueio.');
        } else {
          setError(
            `PIN incorreto. ${attemptsLeft} tentativa${
              attemptsLeft !== 1 ? 's' : ''
            } restante${attemptsLeft !== 1 ? 's' : ''}.`,
          );
        }

        setPin('');
        return;
      }

      // 5. Libera a sessão
      guard.resetFailures();
      setCurrentUser(user);
      setError('');
      onSuccess();

    } catch (err) {
      console.error('[AuraPOS] Erro ao validar credenciais:', err);
      setError('Erro interno ao validar o PIN.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-main">
      <div className="w-full max-w-md bg-surface border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-4 bg-teal-500/10 text-teal-400 rounded-2xl mb-4 border border-teal-500/20">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">AuraPOS</h1>
          <p className="text-sm text-slate-400 mt-1">Identifique-se para acessar o caixa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Selecione o Operador / Admin
            </label>
            <select
              required
              value={selectedUserId}
              onChange={e => {
                setSelectedUserId(e.target.value);
                setPin('');
                if (error) setError('');
              }}
              className="w-full bg-main border border-slate-800 rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors cursor-pointer"
            >
              <option value="" disabled className="bg-surface text-slate-400">
                Selecione seu perfil...
              </option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id} className="bg-surface text-slate-100">
                  {u.name} ({u.role === 'ADMIN' ? 'Administrador' : 'Operador'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              PIN de Acesso
            </label>
            <div className="relative">
              <input
                type="password"
                required
                maxLength={6}
                value={pin}
                disabled={guard.isLocked}
                onChange={e => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••"
                className="w-full bg-main border border-slate-800 rounded-xl py-3.5 px-4 text-center text-2xl tracking-widest text-slate-100 focus:outline-none focus:border-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Painel de Bloqueio por Força Bruta */}
          {guard.isLocked && (
            <div className="flex flex-col items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <ShieldOff size={18} />
                <span>Acesso temporariamente bloqueado</span>
              </div>
              <div className="flex items-center gap-2 text-rose-300 text-2xl font-bold tabular-nums">
                <Timer size={20} className="text-rose-400" />
                <span>{guard.lockSecondsRemaining}s</span>
              </div>
              <p className="text-xs text-rose-400/70 text-center">
                Muitas tentativas incorretas. Aguarde para tentar novamente.
              </p>
            </div>
          )}

          {/* Erro comum (sem bloqueio) */}
          {error && !guard.isLocked && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={guard.isLocked}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span>Entrar no Sistema</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}