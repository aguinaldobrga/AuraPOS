import { useState, FormEvent } from 'react';
import { X, UserCheck, Store, Lock, CalendarDays, ShieldOff, Timer } from 'lucide-react';
import { Sale } from '@/types';
import { usePos } from '@/context/PosContext';
import { generateWeeklyReportPDF } from '@/utils/weeklyPdfGenerator';
import { verifyPin } from '@/utils';
import { usePinGuard } from '@/utils/pinGuard';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  weekLabel: string;
}

export function WeeklyReportModal({ isOpen, onClose, sales, weekLabel }: WeeklyReportModalProps) {
  const { users } = usePos();
  const [cashierPrefix, setCashierPrefix] = useState('Caixa 01');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const guard = usePinGuard(selectedUserId || '__no_user__');

  if (!isOpen) return null;

  const activeUsers = users.filter(u => u.active);

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (guard.isLocked) return;

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
    const isPinValid = await verifyPin(cleanPin, selectedOperator.pin);

    if (!isPinValid) {
      guard.recordFailure();

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

    setError('');
    guard.resetFailures();

    generateWeeklyReportPDF(sales, {
      weekLabel,
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
            <CalendarDays size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-txt-primary">Relatório Semanal</h3>
            <p className="text-sm text-txt-secondary">Autenticação obrigatória de operador</p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <CalendarDays size={15} className="text-primary shrink-0" />
          <span className="text-sm text-primary font-medium">{weekLabel}</span>
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
                disabled={guard.isLocked}
                onChange={e => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••"
                className="w-full bg-main border border-line rounded-xl py-3 pl-10 pr-4 text-txt-primary tracking-widest focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
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
            
            {error && !guard.isLocked && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
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
              disabled={guard.isLocked}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-colors shadow-lg active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Confirmar e Gerar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
