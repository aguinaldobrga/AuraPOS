import { useState, useEffect } from 'react';
import { PosProvider, usePos } from '@/context/PosContext';
import { Header } from '@/components/Header';
import { ProductGrid } from '@/components/ProductGrid';
import { Cart } from '@/components/Cart';
import { Dashboard } from '@/components/Dashboard';
import { ProductAdmin } from '@/components/ProductAdmin';
import { UserAdmin } from '@/components/UserAdmin';
import { AdminPinModal } from '@/components/AdminPinModal';
import { PinLockScreen } from '@/components/PinLockScreen';
import { Package, Users, LogOut } from 'lucide-react';
import { ReloadPrompt } from '@/components/ReloadPrompt';
import { DemoLockGate } from '@/components/DemoLockGate';

function MainLayout() {
  const { isLoading, currentUser, setCurrentUser } = usePos();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('pdv');
  const [adminSubTab, setAdminSubTab] = useState<'products' | 'users'>('products');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Redireciona o Operador para o PDV se tentar acessar a aba 'admin' indevidamente
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('pdv');
    }
  }, [activeTab, isAdmin]);

  // 1. Tela de Carregamento Inicial do Banco de Dados
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center text-slate-400 font-medium">
        Inicializando o AuraPOS...
      </div>
    );
  }

  // 2. Barreira Obrigatória: Exige PIN antes de liberar o sistema
  if (!isAuthenticated || !currentUser) {
    return (
      <PinLockScreen
        onSuccess={() => {
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Trata a navegação das abas com validação de segurança
  const handleTabChange = (tab: string) => {
    if (tab === 'admin') {
      if (!isAdmin) {
        setIsPinModalOpen(true);
      } else {
        setActiveTab('admin');
      }
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col antialiased">
      {/* Topo da Aplicação com Indicador e Botão de Bloqueio */}
      <div className="bg-[#161B22] border-b border-slate-800 px-4 py-2 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-slate-400">
            Sessão Ativa: <strong className="text-slate-200">{currentUser.name}</strong> 
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold uppercase">
              {currentUser.role}
            </span>
          </span>
        </div>

        <button
          onClick={() => {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setActiveTab('pdv');
          }}
          className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 py-1 px-3 rounded-lg bg-slate-800/50 hover:bg-rose-500/10 border border-slate-700/50 transition-colors cursor-pointer font-medium"
        >
          <LogOut size={13} />
          <span>Bloquear / Trocar Caixa</span>
        </button>
      </div>

      <Header activeTab={activeTab} setActiveTab={handleTabChange} />
      
      <main className="flex-1 flex md:flex-row relative">
        {activeTab === 'pdv' && (
          <>
            <div className="flex-1 md:pr-96 overflow-y-auto">
              <ProductGrid />
            </div>
            <Cart />
          </>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto w-full">
            <Dashboard />
          </div>
        )}

        {/* Área Administrativa Exclusiva para ADMIN */}
        {activeTab === 'admin' && isAdmin && (
          <div className="flex-1 overflow-y-auto w-full">
            <div className="max-w-4xl mx-auto p-4 pb-0 flex gap-2">
              <button
                onClick={() => setAdminSubTab('products')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  adminSubTab === 'products'
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'bg-[#161B22] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Package size={18} />
                <span>Catálogo de Produtos</span>
              </button>

              <button
                onClick={() => setAdminSubTab('users')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  adminSubTab === 'users'
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'bg-[#161B22] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users size={18} />
                <span>Operadores e Acessos</span>
              </button>
            </div>

            {adminSubTab === 'products' ? <ProductAdmin /> : <UserAdmin />}
          </div>
        )}
      </main>

      {/* Modal de confirmação por PIN do Administrador */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsPinModalOpen(false);
          setActiveTab('admin');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <PosProvider>
      <DemoLockGate>
        <MainLayout />
        <ReloadPrompt />
      </DemoLockGate>
    </PosProvider>
  );
}