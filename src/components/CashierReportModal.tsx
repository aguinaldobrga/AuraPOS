import { useState, FormEvent } from 'react';
import { X, FileText, UserCheck, Store, Lock } from 'lucide-react';
import { Sale } from '@/types';
import { usePos } from '@/context/PosContext';
import { generateDailyReportPDF, hashPin } from '@/utils';

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

  const handleSubmit = async (e: FormEvent) => {
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

    const cleanPin = pin.trim();
    const hashedInputPin = await hashPin(cleanPin);

    // Validação estrita com suporte a hash SHA-256 e fallback
    const isPinValid = 
      selectedOperator.pin === hashedInputPin || 
      selectedOperator.pin === cleanPin;

    if (!isPinValid) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-line w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-txt-primary">
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 right-4 text-txt-secondary hover:text-txt-primary p-2 rounded-lg transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-txt-primary">Emitir Relatório</h3>
            <p className="text-sm text-txt-secondary">Autenticação obrigatória de operador</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-txt-secondary mb-2">
              Identificação do Caixa
            </label>
            <div className="relative">
              <Store size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary" />
              <input
                type="text"
                value={cashierPrefix}
                onChange={e => setCashierPrefix(e.target.value)}
                placeholder="Ex: Caixa 01, Estande Central"
                className="w-full bg-main border border-line rounded-xl py-3 pl-10 pr-4 text-txt-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-txt-secondary mb-2">
              Operador Autorizado <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <UserCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
              <select
                required
                value={selectedUserId}
                onChange={e => {
                  setSelectedUserId(e.target.value);
                  if (error) setError('');
                }}
                className="w-full bg-main border border-line rounded-xl py-3 pl-10 pr-4 text-txt-primary focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="" disabled className="bg-surface text-txt-secondary">
                  Selecione seu nome na lista...
                </option>
                {activeUsers.map(user => (
                  <option key={user.id} value={user.id} className="bg-surface text-txt-primary">
                    {user.name} ({user.role === 'ADMIN' ? 'Admin' : 'Operador'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-txt-secondary mb-2">
              PIN do Operador <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary" />
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
                className="w-full bg-main border border-line rounded-xl py-3 pl-10 pr-4 text-txt-primary tracking-widest focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl border border-line text-txt-secondary font-medium hover:bg-line/50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-colors shadow-lg active:scale-95 cursor-pointer"
            >
              Confirmar e Gerar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}