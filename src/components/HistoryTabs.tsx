import { useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { WeeklyReport } from './WeeklyReport';

type HistorySubTab = 'today' | 'week';

export function HistoryTabs() {
  const [activeSubTab, setActiveSubTab] = useState<HistorySubTab>('today');

  return (
    <div className="flex-1 overflow-y-auto w-full">
      {/* Sub-abas: Hoje / Semana */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-0 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('today')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
            activeSubTab === 'today'
              ? 'bg-primary text-black shadow-lg'
              : 'bg-surface text-txt-secondary hover:text-txt-primary border border-line'
          }`}
        >
          <Clock size={16} />
          <span>Fechamento do Dia</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('week')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
            activeSubTab === 'week'
              ? 'bg-primary text-black shadow-lg'
              : 'bg-surface text-txt-secondary hover:text-txt-primary border border-line'
          }`}
        >
          <CalendarDays size={16} />
          <span>Histórico da Semana</span>
        </button>
      </div>

      {/* Conteúdo da sub-aba ativa */}
      {activeSubTab === 'today' ? <Dashboard /> : <WeeklyReport />}
    </div>
  );
}
