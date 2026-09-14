import { useState, useMemo } from 'react';
import { usePos } from '@/context/PosContext';
import { formatCurrency, formatTime, formatDate } from '@/utils';
import { XCircle, CheckCircle2, Download, UserCheck, Shield, CalendarDays, ChevronDown } from 'lucide-react';
import { WeeklyReportModal } from './WeeklyReportModal';

// Retorna o início da semana (segunda-feira) e o fim (domingo) da semana atual
function getWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab

  // Ajusta para iniciar na Segunda-feira (ISO week)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

const DAY_OPTIONS = [
  { label: 'Todos os dias', value: 'ALL' },
  { label: 'Segunda-feira', value: '1' },
  { label: 'Terça-feira', value: '2' },
  { label: 'Quarta-feira', value: '3' },
  { label: 'Quinta-feira', value: '4' },
  { label: 'Sexta-feira', value: '5' },
  { label: 'Sábado', value: '6' },
  { label: 'Domingo', value: '0' }
];

export function WeeklyReport() {
  const { sales, cancelSale, currentUser, users } = usePos();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('TODOS');

  const { monday, sunday } = useMemo(() => getWeekBounds(), []);

  // Label da semana para exibição e PDF
  const weekLabel = useMemo(() => {
    return `${formatDate(monday.getTime())} a ${formatDate(sunday.getTime())}`;
  }, [monday, sunday]);

  // Filtra vendas da semana atual com Role-Based Visibility
  const weekSales = useMemo(() => {
    return sales.filter(s => {
      const ts = s.timestamp;
      const isThisWeek = ts >= monday.getTime() && ts <= sunday.getTime();
      if (!isThisWeek) return false;

      // OPERADOR vê apenas as próprias vendas
      if (currentUser?.role === 'OPERATOR') {
        return s.operatorId === currentUser.id;
      }

      // Filtro de dia
      if (selectedDayFilter !== 'ALL') {
        const saleDay = new Date(ts).getDay().toString();
        if (saleDay !== selectedDayFilter) return false;
      }

      // ADMIN com filtro de operador
      if (selectedOperatorFilter !== 'TODOS') {
        return s.operatorId === selectedOperatorFilter;
      }

      return true;
    });
  }, [sales, monday, sunday, currentUser, selectedDayFilter, selectedOperatorFilter]);

  // Métricas totais das vendas filtradas (apenas APROVADAS)
  const validWeekSales = weekSales.filter(s => s.status === 'APROVADA');
  const totalPix = validWeekSales.filter(s => s.method === 'PIX').reduce((acc, s) => acc + s.total, 0);
  const totalCartao = validWeekSales.filter(s => s.method === 'CARTAO').reduce((acc, s) => acc + s.total, 0);
  const totalDinheiro = validWeekSales.filter(s => s.method === 'DINHEIRO').reduce((acc, s) => acc + s.total, 0);
  const totalGeral = totalPix + totalCartao + totalDinheiro;

  // Agrupa vendas por dia para exibição (chave: timestamp zerado no início do dia)
  const groupedByDay = useMemo(() => {
    const map = new Map<string, { label: string; dateKey: string; items: typeof weekSales }>();

    weekSales.forEach(sale => {
      const d = new Date(sale.timestamp);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          label: formatDate(d.getTime()),
          dateKey,
          items: []
        });
      }
      map.get(dateKey)!.items.push(sale);
    });

    // Ordena os dias do mais recente para o mais antigo
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [weekSales]);

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-txt-primary">Histórico da Semana</h2>
          <div className="flex items-center gap-2 text-xs text-primary mt-1 font-medium">
            <CalendarDays size={14} />
            <span>{weekLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-txt-secondary mt-0.5">
            {currentUser?.role === 'ADMIN' ? <Shield size={13} /> : <UserCheck size={13} />}
            <span>
              {currentUser?.role === 'ADMIN'
                ? 'Visão Geral do Administrador'
                : `Operador: ${currentUser?.name || 'Caixa Local'}`}
            </span>
          </div>
        </div>

        {weekSales.length > 0 && (
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-black font-bold px-4 py-2 rounded-xl transition-transform active:scale-95 shadow-lg cursor-pointer"
          >
            <Download size={18} />
            <span>Baixar PDF Semanal</span>
          </button>
        )}
      </div>

      {/* Filtros — Somente para ADMIN */}
      {currentUser?.role === 'ADMIN' && (
        <div className="mb-6 bg-surface p-4 rounded-xl border border-line space-y-3">
          <span className="text-xs text-txt-secondary font-semibold uppercase tracking-wider">Filtros</span>
          <div className="flex flex-wrap gap-3">
            {/* Filtro de Dia */}
            <div className="relative flex-1 min-w-[180px]">
              <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
              <select
                value={selectedDayFilter}
                onChange={e => setSelectedDayFilter(e.target.value)}
                className="w-full appearance-none bg-main border border-line text-txt-primary rounded-lg py-2 pl-10 pr-8 text-sm focus:outline-none focus:border-primary cursor-pointer"
              >
                {DAY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Operador */}
            {users.length > 0 && (
              <div className="relative flex-1 min-w-[200px]">
                <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
                <select
                  value={selectedOperatorFilter}
                  onChange={e => setSelectedOperatorFilter(e.target.value)}
                  className="w-full appearance-none bg-main border border-line text-txt-primary rounded-lg py-2 pl-10 pr-8 text-sm focus:outline-none focus:border-primary cursor-pointer"
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
          </div>
        </div>
      )}

      {/* Cards de Métricas Totais */}
      <div className="bg-surface p-6 rounded-2xl border border-line mb-4 text-center shadow-sm">
        <div className="text-txt-secondary mb-1 text-sm">Total Vendido na Semana</div>
        <div className="text-4xl font-bold text-txt-primary">{formatCurrency(totalGeral)}</div>
        <div className="text-xs text-txt-secondary mt-1">{validWeekSales.length} vendas aprovadas</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface p-4 rounded-xl border border-line text-center shadow-sm">
          <div className="text-txt-secondary text-sm mb-1">Pix</div>
          <div className="font-bold text-txt-primary">{formatCurrency(totalPix)}</div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-line text-center shadow-sm">
          <div className="text-txt-secondary text-sm mb-1">Cartão</div>
          <div className="font-bold text-txt-primary">{formatCurrency(totalCartao)}</div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-line text-center shadow-sm">
          <div className="text-txt-secondary text-sm mb-1">Dinheiro</div>
          <div className="font-bold text-txt-primary">{formatCurrency(totalDinheiro)}</div>
        </div>
      </div>

      {/* Histórico por Dia */}
      {groupedByDay.length === 0 ? (
        <div className="text-center text-txt-secondary py-16 bg-surface rounded-2xl border border-line">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma venda encontrada para este filtro na semana atual.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDay.map(group => {
            const groupValid = group.items.filter(s => s.status === 'APROVADA');
            const groupTotal = groupValid.reduce((acc, s) => acc + s.total, 0);

            return (
              <div key={group.dateKey}>
                {/* Cabeçalho do Dia */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-primary" />
                    <h3 className="text-base font-bold text-txt-primary">{group.label}</h3>
                  </div>
                  <div className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {formatCurrency(groupTotal)}
                  </div>
                </div>

                {/* Vendas do Dia */}
                <div className="space-y-3">
                  {group.items.map(sale => (
                    <div
                      key={sale.id}
                      className={`p-4 rounded-xl border transition-all ${
                        sale.status === 'CANCELADA'
                          ? 'border-rose-900/50 bg-rose-950/20 opacity-70'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-txt-secondary text-sm">{formatTime(sale.timestamp)}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                              {sale.operatorName}
                            </span>
                          </div>
                          <div className="font-bold text-txt-primary mt-1">{formatCurrency(sale.total)}</div>
                          <div className="text-sm text-txt-secondary mt-1 flex items-center gap-1">
                            {sale.status === 'APROVADA' ? (
                              <CheckCircle2 size={14} className="text-success" />
                            ) : (
                              <XCircle size={14} className="text-rose-500" />
                            )}
                            <span>{sale.method} - {sale.status}</span>
                          </div>
                        </div>

                        {sale.status === 'APROVADA' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja cancelar esta venda?')) {
                                cancelSale(sale.id);
                              }
                            }}
                            className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>

                      <div className="text-sm text-txt-secondary border-t border-line pt-2 mt-2">
                        {sale.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de PDF Semanal */}
      <WeeklyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        sales={weekSales}
        weekLabel={weekLabel}
      />
    </div>
  );
}
