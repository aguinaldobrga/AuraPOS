import { usePos } from '@/context/PosContext';
import { History, ShoppingBag, Settings } from 'lucide-react';
import LOGO from '@/assets/icon-512x512.png';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { currentUser } = usePos();
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between p-4 bg-[var(--bg-overlay)] backdrop-blur-md border-b border-[var(--border-color)]">
      {/* Logo e Nome da Aplicação */}
      <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-lg">
        <img src={LOGO} alt="Logo AuraPOS" className="w-10 h-10 object-contain" />
        <span className="tracking-tight">AuraPOS</span>
      </div>

      {/* Navegação Protegida por Perfil */}
      <nav className="flex items-center gap-2">
        <button 
          onClick={() => setActiveTab('pdv')}
          aria-label="Ponto de Venda"
          title="Ponto de Venda"
          className={`p-2.5 rounded-xl transition-colors ${
            activeTab === 'pdv' 
              ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20' 
              : 'text-[var(--text-secondary)] hover:text-slate-100'
          }`}
        >
          <ShoppingBag size={22} />
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          aria-label="Histórico de Vendas"
          title="Histórico de Vendas"
          className={`p-2.5 rounded-xl transition-colors ${
            activeTab === 'history' 
              ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20' 
              : 'text-[var(--text-secondary)] hover:text-slate-100'
          }`}
        >
          <History size={22} />
        </button>

        {/* Exibe o Painel de Configurações APENAS para o Administrador */}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('admin')}
            aria-label="Painel Administrativo"
            title="Painel Administrativo"
            className={`p-2.5 rounded-xl transition-colors ${
              activeTab === 'admin' 
                ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20' 
                : 'text-[var(--text-secondary)] hover:text-slate-100'
            }`}
          >
            <Settings size={22} />
          </button>
        )}
      </nav>
    </header>
  );
}