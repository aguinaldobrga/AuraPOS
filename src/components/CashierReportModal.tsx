import { useState, FormEvent } from 'react';
import { X, FileText, UserCheck, Store, Lock } from 'lucide-react';
import { Sale } from '@/types';
import { usePos } from '@/context/PosContext';
import { generateDailyReportPDF } from '@/utils';

interface CashierReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
}

export function CashierReportModal({ isOpen, onClose, sales }: CashierReportModalProps) {
  const { users } = usePos();
  const [cashierPrefix, setCashierPrefix] = useState('Caixa 01');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const activeUsers = users.filter(u => u.active);

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      setError('Selecione um operador na lista.');
      return;
    }

    const selectedOperator = activeUsers.find(u => u.id === selectedUserId);

    if (!selectedOperator) {
      setError('Operador não encontrado ou inativo.');
      return;
    }

    // Validação estrita do PIN
    if (selectedOperator.pin !== pin.trim()) {
      setError('PIN incorreto para o operador selecionado.');
      setPin('');
      return;
    }

    setError('');

    // Dispara a geração do relatório em PDF
    generateDailyReportPDF(sales, {
      cashierPrefix: cashierPrefix.trim(),
      operator: selectedOperator
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#161B22] border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Emitir Relatório</h3>
            <p className="text-sm text-slate-400">Autenticação obrigatória de operador</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Identificação do Caixa
            </label>
            <div className="relative">
              <Store size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={cashierPrefix}
                onChange={e => setCashierPrefix(e.target.value)}
                placeholder="Ex: Caixa 01, Estande Central"
                className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Operador Autorizado <span className="text-teal-400">*</span>
            </label>
            <div className="relative">
              <UserCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <select
                required
                value={selectedUserId}
                onChange={e => {
                  setSelectedUserId(e.target.value);
                  if (error) setError('');
                }}
                className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors cursor-pointer"
              >
                <option value="" disabled className="bg-[#161B22] text-slate-400">
                  Selecione seu nome na lista...
                </option>
                {activeUsers.map(user => (
                  <option key={user.id} value={user.id} className="bg-[#161B22] text-slate-100">
                    {user.name} ({user.role === 'ADMIN' ? 'Admin' : 'Operador'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              PIN do Operador <span className="text-teal-400">*</span>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
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
                className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-100 tracking-widest focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-300 font-medium hover:bg-slate-800/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors shadow-lg active:scale-95"
            >
              Confirmar e Gerar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}