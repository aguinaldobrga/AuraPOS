import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface DemoLockGateProps {
  children: React.ReactNode;
}

export const DemoLockGate: React.FC<DemoLockGateProps> = ({ children }) => {
  const isLockEnabled = import.meta.env.VITE_DEMO_LOCK_ENABLED === 'true';
  const expectedPassphrase = import.meta.env.VITE_DEMO_PASSPHRASE || 'gui2026';

  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (!isLockEnabled) return true;
    return localStorage.getItem('aurapos_demo_unlocked') === 'true';
  });

  const [inputPassphrase, setInputPassphrase] = useState('');
  const [error, setError] = useState(false);

  if (isUnlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassphrase.trim() === expectedPassphrase.trim()) {
      localStorage.setItem('aurapos_demo_unlocked', 'true');
      setIsUnlocked(true);
    } else {
      setError(true);
      setInputPassphrase('');
    }
  };

  return (
    <div className="min-h-screen bg-main flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-surface border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-12 h-12 bg-teal-500/10 text-teal-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
          <Lock size={24} />
        </div>

        <h2 className="text-xl font-bold mb-1">AuraPOS — Demonstração</h2>
        <p className="text-sm text-slate-400 mb-6">
          Este ambiente está restrito para apresentação técnica. Insira a chave de acesso.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Chave de Acesso"
              value={inputPassphrase}
              onChange={(e) => {
                setError(false);
                setInputPassphrase(e.target.value);
              }}
              className="w-full bg-main border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono text-teal-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
            {error && (
              <p className="text-rose-400 text-xs mt-2 font-medium">
                Chave incorreta. Tente novamente.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
          >
            Acessar Sistema
          </button>
        </form>
      </div>
    </div>
  );
};