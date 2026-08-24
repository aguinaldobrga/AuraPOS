import { useState, FormEvent } from 'react';
import { usePos } from '@/context/PosContext';
import { Lock, Store, ArrowRight, AlertCircle } from 'lucide-react';
import { hashPin } from '@/utils';

interface PinLockScreenProps {
  onSuccess: () => void;
}

export function PinLockScreen({ onSuccess }: PinLockScreenProps) {
  const { users, setCurrentUser } = usePos();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const activeUsers = users.filter(u => u.active);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 1. Validação de seleção de operador
    if (!selectedUserId) {
      setError('Selecione seu nome na lista.');
      return;
    }

    // 2. Busca do operador ativo
    const user = activeUsers.find(u => u.id === selectedUserId);
    if (!user) {
      setError('Usuário não encontrado.');
      return;
    }

    try {
      // 3. Criptografa o PIN digitado para comparar com o hash salvo
      const enteredPinHash = await hashPin(pin.trim());

      if (user.pin !== enteredPinHash) {
        setError('PIN incorreto. Tente novamente.');
        setPin('');
        return;
      }

      // 4. Libera a sessão
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D1117]">
      <div className="w-full max-w-md bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
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
                if (error) setError('');
              }}
              className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors cursor-pointer"
            >
              <option value="" disabled className="bg-[#161B22] text-slate-400">
                Selecione seu perfil...
              </option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id} className="bg-[#161B22] text-slate-100">
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
                onChange={e => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••"
                className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-3.5 px-4 text-center text-2xl tracking-widest text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
          >
            <span>Entrar no Sistema</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}