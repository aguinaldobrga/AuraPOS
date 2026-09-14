import { useState, FormEvent } from 'react';
import { usePos } from '@/context/PosContext';
import { X, Lock, ShieldCheck, ShieldOff, Timer } from 'lucide-react';
import { verifyPin } from '@/utils';
import { usePinGuard } from '@/utils/pinGuard';

console.log('🔥 AdminPinModal.tsx CARREGADO');

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ID fixo para o guard do modal admin (não está vinculado a um usuário selecionado)
const ADMIN_GUARD_KEY = '__admin_modal__';

export function AdminPinModal({ isOpen, onClose, onSuccess }: AdminPinModalProps) {
  const { users, setCurrentUser } = usePos();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Proteção contra força bruta para o modal de acesso admin
  const guard = usePinGuard(ADMIN_GUARD_KEY);

  if (!isOpen) return null;

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    console.log('🔥 handleSubmit FOI CHAMADO');
    e.preventDefault();

    // Bloquear submissão se o guard estiver ativo
    if (guard.isLocked) return;

    // Busca o usuário Administrador cadastrado
    const adminUser = users.find(u => u.role === 'ADMIN' && u.active);

    if (!adminUser) {
      setError('Nenhum administrador ativo encontrado.');
      return;
    }

    // Valida o PIN com hash SHA-256 (corrigindo comparação anterior sem hash)
    // Valida o PIN usando PBKDF2 + salt armazenado no hash
    const cleanPin = pin.trim();
      console.log('[DEBUG PIN]', {
        pin: cleanPin,
        storedPin: adminUser.pin,
      });
    const isPinValid = await verifyPin(cleanPin, adminUser.pin);
      console.log('[DEBUG PIN RESULT]', isPinValid);

    if (!isPinValid) {
      guard.recordFailure();

      const attemptsLeft = 5 - (guard.failureCount + 1);
      if (attemptsLeft <= 0) {
        setError('Muitas tentativas. Aguarde o tempo de bloqueio.');
      } else {
        setError(`PIN incorreto. ${attemptsLeft} tentativa${attemptsLeft !== 1 ? 's' : ''} restante${attemptsLeft !== 1 ? 's' : ''}.`);
      }
      setPin('');
      return;
    }

    // ATUALIZA O ESTADO GLOBAL: O usuário atual passa a ser o ADMIN
    guard.resetFailures();
    setCurrentUser(adminUser);
    setPin('');
    setError('');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl mb-3">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Acesso Restrito</h3>
          <p className="text-xs text-slate-400 mt-1">Digite o PIN do Administrador para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="password"
                autoFocus
                maxLength={6}
                disabled={guard.isLocked}
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••"
                className="w-full bg-main border border-slate-800 rounded-xl py-3 px-4 text-center text-xl tracking-widest text-slate-100 focus:outline-none focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            {/* Painel de Bloqueio por Força Bruta */}
            {guard.isLocked && (
              <div className="mt-3 flex flex-col items-center gap-1.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <ShieldOff size={15} />
                  <span>Acesso bloqueado temporariamente</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-300 text-xl font-bold tabular-nums">
                  <Timer size={16} className="text-rose-400" />
                  <span>{guard.lockSecondsRemaining}s</span>
                </div>
              </div>
            )}

            {/* Erro comum */}
            {error && !guard.isLocked && (
              <p className="text-xs text-rose-400 mt-2 text-center font-medium">{error}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 font-medium text-sm hover:bg-slate-800/50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guard.isLocked}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}