import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('[AuraPOS SW] Registrado em:', swUrl);
      // Força uma checagem de atualização a cada 1 minuto enquanto o app estiver aberto
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[AuraPOS SW] Erro ao registrar SW:', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center justify-between gap-4 rounded-xl bg-slate-900 p-4 text-white shadow-2xl border border-teal-500/40 backdrop-blur-md">
      <div className="text-sm">
        <p className="font-semibold text-teal-400">Nova versão disponível!</p>
        <p className="text-slate-300">Atualize para sincronizar os dados e correções.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-teal-400 cursor-pointer"
        >
          Atualizar
        </button>
        <button
          onClick={close}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
        >
          Depois
        </button>
      </div>
    </div>
  );
};