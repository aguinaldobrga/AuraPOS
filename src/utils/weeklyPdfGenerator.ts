import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, User } from '@/types';
import { formatCurrency, formatDateTime, formatDate } from '@/utils';

interface WeeklyReportOptions {
  weekLabel: string;
  cashierPrefix?: string;
  operator: User;
}

function getDayLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(timestamp);
}

export function generateWeeklyReportPDF(sales: Sale[], options: WeeklyReportOptions) {
  const doc = new jsPDF();
  const validSales = sales.filter(s => s.status === 'APROVADA');

  const {
    weekLabel,
    cashierPrefix = 'Caixa 01',
    operator
  } = options;

  const fullCashierLabel = `${cashierPrefix} — ${operator.name}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  // Totais Gerais da Semana
  const totalPix = validSales.filter(s => s.method === 'PIX').reduce((acc, s) => acc + s.total, 0);
  const totalCartao = validSales.filter(s => s.method === 'CARTAO').reduce((acc, s) => acc + s.total, 0);
  const totalDinheiro = validSales.filter(s => s.method === 'DINHEIRO').reduce((acc, s) => acc + s.total, 0);
  const totalGeral = totalPix + totalCartao + totalDinheiro;

  // Agrupa vendas aprovadas por dia (chave: data em string YYYY-MM-DD)
  const byDay = new Map<string, Sale[]>();
  validSales.forEach(sale => {
    const d = new Date(sale.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = byDay.get(key);
    if (existing) {
      existing.push(sale);
    } else {
      byDay.set(key, [sale]);
    }
  });

  const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  // ── Cabeçalho ──────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setTextColor(13, 17, 23);
  doc.text('AuraPOS — Relatório Semanal de Vendas', centerX, 20, { align: 'center' });

  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.5);
  doc.line(14, 25, pageWidth - 14, 25);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Identificação do Caixa: ${fullCashierLabel}`, 14, 33);
  doc.text(`Semana: ${weekLabel}`, 14, 39);
  doc.text(`Gerado em: ${formatDateTime(new Date())}`, 14, 45);
  doc.text(`Total de Transações: ${sales.length} (${validSales.length} Aprovadas)`, 14, 51);

  // ── Resumo Financeiro da Semana ─────────────────────────────────────
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Total da Semana: ${formatCurrency(totalGeral)}`, 14, 61);
  doc.text(`Pix: ${formatCurrency(totalPix)}  |  Cartão: ${formatCurrency(totalCartao)}  |  Dinheiro: ${formatCurrency(totalDinheiro)}`, 14, 68);

  // ── Tabela de Resumo por Dia ────────────────────────────────────────
  doc.setFontSize(12);
  doc.setTextColor(13, 17, 23);
  doc.text('Resumo por Dia da Semana', 14, 78);

  const daysSummaryData = sortedDays.map(([, daySales]) => {
    const dayPix = daySales.filter(s => s.method === 'PIX').reduce((acc, s) => acc + s.total, 0);
    const dayCartao = daySales.filter(s => s.method === 'CARTAO').reduce((acc, s) => acc + s.total, 0);
    const dayDinheiro = daySales.filter(s => s.method === 'DINHEIRO').reduce((acc, s) => acc + s.total, 0);
    const dayTotal = dayPix + dayCartao + dayDinheiro;
    const dayLabel = getDayLabel(daySales[0].timestamp);

    return [
      dayLabel,
      daySales.length.toString(),
      formatCurrency(dayPix),
      formatCurrency(dayCartao),
      formatCurrency(dayDinheiro),
      formatCurrency(dayTotal)
    ];
  });

  // Linha de totais no rodapé da tabela de dias
  daysSummaryData.push([
    'TOTAL GERAL',
    validSales.length.toString(),
    formatCurrency(totalPix),
    formatCurrency(totalCartao),
    formatCurrency(totalDinheiro),
    formatCurrency(totalGeral)
  ]);

  autoTable(doc, {
    startY: 82,
    head: [['Dia', 'Vendas', 'Pix', 'Cartão', 'Dinheiro', 'Total do Dia']],
    body: daysSummaryData,
    theme: 'striped',
    headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' }
    },
    didParseCell: (data) => {
      if (data.row.index === daysSummaryData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 250];
      }
    }
  });

  // ── Histórico Detalhado por Dia ─────────────────────────────────────
  let cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 140;

  sortedDays.forEach(([, daySales]) => {
    const dayLabel = getDayLabel(daySales[0].timestamp);
    const dayTotal = daySales.reduce((acc, s) => acc + s.total, 0);
    const allSalesForDay = sales.filter(s => {
      const d = new Date(s.timestamp);
      const sd = new Date(daySales[0].timestamp);
      return d.getFullYear() === sd.getFullYear() &&
             d.getMonth() === sd.getMonth() &&
             d.getDate() === sd.getDate();
    });

    cursor += 14;

    // Adiciona nova página se estiver quase no fim
    if (cursor > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      cursor = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(13, 17, 23);
    doc.text(`${dayLabel}  —  Total: ${formatCurrency(dayTotal)}  (${daySales.length} vendas aprovadas)`, 14, cursor);

    const salesTableData = allSalesForDay.map(sale => [
      formatDateTime(sale.timestamp),
      sale.operatorName || '—',
      sale.method,
      sale.status,
      sale.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
      formatCurrency(sale.total)
    ]);

    autoTable(doc, {
      startY: cursor + 4,
      head: [['Hora', 'Operador', 'Método', 'Status', 'Itens', 'Total']],
      body: salesTableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 17, 23], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 25, halign: 'right' }
      }
    });

    cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || cursor + 20;
  });

  const safeWeekLabel = weekLabel.replace(/[\/\\]/g, '-').replace(/\s/g, '_');
  doc.save(`AuraPOS_Semana_${safeWeekLabel}.pdf`);
}
