import { useState, useMemo } from 'react';
import { usePos } from '@/context/PosContext';
import { formatCurrency, formatTime } from '@/utils';
import { XCircle, CheckCircle2, Download, UserCheck, Shield } from 'lucide-react';
import { CashierReportModal } from './CashierReportModal';

export function Dashboard() {
  const { sales, cancelSale, currentUser, users } = usePos();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('TODOS');

  // 1. Janela de Tempo: Define o início e o fim do dia atual (00:00:00 até 23:59:59)
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // 2. Filtra as vendas de HOJE aplicando a Regra de Perfil (Role-Based Visibility)
  const todaysSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.timestamp);
      const isToday = saleDate >= todayStart && saleDate <= todayEnd;
      if (!isToday) return false;

      // Se for OPERADOR, enxerga APENAS as suas próprias vendas
      if (currentUser?.role === 'OPERATOR') {
        return s.operatorId === currentUser.id;
      }

      // Se for ADMIN e houver um filtro de operador selecionado no dropdown
      if (selectedOperatorFilter !== 'TODOS') {
        return s.operatorId === selectedOperatorFilter;
      }

      // Se for ADMIN e o filtro for 'TODOS', enxerga a feira inteira
      return true;
    });
  }, [sales, todayStart, todayEnd, currentUser, selectedOperatorFilter]);

  // 3. Métricas Financeiras Consolidadas com base no filtro ativo
  const validSales = todaysSales.filter(s => s.status === 'APROVADA');
  const totalPix = validSales.filter(s => s.method === 'PIX').reduce((acc, s) => acc + s.total, 0);
  const totalCartao = validSales.filter(s => s.method === 'CARTAO').reduce((acc, s) => acc + s.total, 0);
  const totalDinheiro = validSales.filter(s => s.method === 'DINHEIRO').reduce((acc, s) => acc + s.total, 0);
  const totalGeral = totalPix + totalCartao + totalDinheiro;

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Fechamento do Dia</h2>
          <div className="flex items-center gap-2 text-xs text-teal-400 mt-1 font-medium">
            {currentUser?.role === 'ADMIN' ? <Shield size={14} /> : <UserCheck size={14} />}
            <span>
              {currentUser?.role === 'ADMIN' 
                ? 'Visão Geral do Administrador' 
                : `Operador: ${currentUser?.name || 'Caixa Local'}`}
            </span>
          </div>
        </div>
        
        {todaysSales.length > 0 && (
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-medium px-4 py-2 rounded-xl transition-colors shadow-lg active:scale-95"
          >
            <Download size={18} />
            <span>Baixar PDF</span>
          </button>
        )}
      </div>

      {/* Seletor de Caixa/Operador para o Administrador */}
      {currentUser?.role === 'ADMIN' && users.length > 0 && (
        <div className="mb-6 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-color)] flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider whitespace-nowrap">
            Filtrar Caixa:
          </span>
          <select
            value={selectedOperatorFilter}
            onChange={e => setSelectedOperatorFilter(e.target.value)}
            className="w-full bg-[#0D1117] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="TODOS">Todas as Bancas / Operadores</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role === 'ADMIN' ? 'Admin' : 'Operador'})
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Cards de Métricas */}
      <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] mb-6 text-center">
        <div className="text-[var(--text-secondary)] mb-2">Total Vendido Hoje</div>
        <div className="text-4xl font-bold text-[var(--text-primary)]">{formatCurrency(totalGeral)}</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] text-center">
          <div className="text-[var(--text-secondary)] text-sm mb-1">Pix</div>
          <div className="font-bold text-[var(--text-primary)]">{formatCurrency(totalPix)}</div>
        </div>
        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] text-center">
          <div className="text-[var(--text-secondary)] text-sm mb-1">Cartão</div>
          <div className="font-bold text-[var(--text-primary)]">{formatCurrency(totalCartao)}</div>
        </div>
        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] text-center">
          <div className="text-[var(--text-secondary)] text-sm mb-1">Dinheiro</div>
          <div className="font-bold text-[var(--text-primary)]">{formatCurrency(totalDinheiro)}</div>
        </div>
      </div>

      {/* Histórico de Vendas */}
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Histórico de Hoje</h3>
      <div className="space-y-4">
        {todaysSales.map(sale => (
          <div 
            key={sale.id} 
            className={`p-4 rounded-xl border transition-all ${
              sale.status === 'CANCELADA' 
                ? 'border-red-900/50 bg-red-950/20 opacity-70' 
                : 'border-[var(--border-color)] bg-[var(--bg-surface)]'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)] text-sm">{formatTime(sale.timestamp)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-medium">
                    {sale.operatorName}
                  </span>
                </div>
                <div className="font-bold text-[var(--text-primary)] mt-1">{formatCurrency(sale.total)}</div>
                <div className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                  {sale.status === 'APROVADA' ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <XCircle size={14} className="text-red-500" />
                  )}
                  <span>{sale.method} - {sale.status}</span>
                </div>
              </div>

              {sale.status === 'APROVADA' && (
                <button 
                  onClick={() => {
                    if (confirm('Tem certeza que deseja cancelar esta venda?')) {
                      cancelSale(sale.id);
                    }
                  }}
                  className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="text-sm text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-2 mt-2">
              {sale.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
            </div>
          </div>
        ))}

        {todaysSales.length === 0 && (
          <div className="text-center text-[var(--text-secondary)] py-12 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)]">
            Nenhuma venda registrada para este filtro hoje.
          </div>
        )}
      </div>

      {/* Modal de PDF com as vendas do filtro ativo */}
      <CashierReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        sales={todaysSales}
      />
    </div>
  );
}