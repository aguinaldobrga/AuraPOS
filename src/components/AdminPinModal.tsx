import { useState, FormEvent } from 'react';
import { usePos } from '@/context/PosContext';
import { X, Lock, ShieldCheck } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminPinModal({ isOpen, onClose, onSuccess }: AdminPinModalProps) {
  const { users, setCurrentUser } = usePos();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Busca o usuário Administrador cadastrado
    const adminUser = users.find(u => u.role === 'ADMIN' && u.active);

    if (!adminUser) {
      setError('Nenhum administrador ativo encontrado.');
      return;
    }

    // Valida o PIN digitado contra o PIN do Admin
    if (adminUser.pin !== pin.trim()) {
      setError('PIN administrativo incorreto.');
      setPin('');
      return;
    }

    // ATUALIZA O ESTADO GLOBAL: O usuário atual passa a ser o ADMIN
    setCurrentUser(adminUser);
    setPin('');
    setError('');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
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
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••"
                className="w-full bg-main border border-slate-800 rounded-xl py-3 px-4 text-center text-xl tracking-widest text-slate-100 focus:outline-none focus:border-teal-500"
              />
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            {error && <p className="text-xs text-rose-400 mt-2 text-center font-medium">{error}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 font-medium text-sm hover:bg-slate-800/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-lg active:scale-95"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}