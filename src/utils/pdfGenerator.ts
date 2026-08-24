import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, User } from '@/types';
import { formatCurrency, formatDateTime, formatDate } from '@/utils';

interface ReportOptions {
  dateLabel?: string;
  cashierPrefix?: string;
  operator: User;
}

export function generateDailyReportPDF(sales: Sale[], options: ReportOptions) {
  const doc = new jsPDF();
  const validSales = sales.filter(s => s.status === 'APROVADA');

  const {
    dateLabel = formatDate(new Date()),
    cashierPrefix = 'Caixa 01',
    operator
  } = options;

  const fullCashierLabel = `${cashierPrefix} — ${operator.name}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  // Totais Financeiros
  const totalPix = validSales.filter(s => s.method === 'PIX').reduce((acc, s) => acc + s.total, 0);
  const totalCartao = validSales.filter(s => s.method === 'CARTAO').reduce((acc, s) => acc + s.total, 0);
  const totalDinheiro = validSales.filter(s => s.method === 'DINHEIRO').reduce((acc, s) => acc + s.total, 0);
  const totalGeral = totalPix + totalCartao + totalDinheiro;

  // Agrupamento de Vendas por Produto (Apenas vendas aprovadas)
  const productSummaryMap = new Map<string, { name: string; quantity: number; total: number }>();

  validSales.forEach(sale => {
    sale.items.forEach(item => {
      const existing = productSummaryMap.get(item.id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.price * item.quantity;
      } else {
        productSummaryMap.set(item.id, {
          name: item.name,
          quantity: item.quantity,
          total: item.price * item.quantity
        });
      }
    });
  });

  const productSummary = Array.from(productSummaryMap.values());

  // Cabeçalho / Branding
  doc.setFontSize(18);
  doc.setTextColor(13, 17, 23);
  doc.text('AuraPOS — Fechamento de Caixa', centerX, 20, { align: 'center' });

  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.5);
  doc.line(14, 25, pageWidth - 14, 25);

  // Informações de Cabeçalho
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Identificação do Caixa: ${fullCashierLabel}`, 14, 33);
  doc.text(`Data do Relatório: ${dateLabel}`, 14, 39);
  doc.text(`Gerado em: ${formatDateTime(new Date())}`, 14, 45);
  doc.text(`Total de Transações: ${sales.length} (${validSales.length} Aprovadas)`, 14, 51);

  // Quadro de Resumo Financeiro
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Total Vendido: ${formatCurrency(totalGeral)}`, 14, 61);
  doc.text(`Pix: ${formatCurrency(totalPix)}  |  Cartão: ${formatCurrency(totalCartao)}  |  Dinheiro: ${formatCurrency(totalDinheiro)}`, 14, 68);

  // Seção 1: Consolidado por Produto
  doc.setFontSize(12);
  doc.setTextColor(13, 17, 23);
  doc.text('Resumo de Vendas por Produto', 14, 78);

  const productTableData = productSummary.map(item => [
    item.name,
    item.quantity.toString(),
    formatCurrency(item.total)
  ]);

  // Adiciona a linha do Total Geral no fim da tabela de produtos
  productTableData.push([
    'TOTAL GERAL VENDIDO',
    productSummary.reduce((acc, i) => acc + i.quantity, 0).toString(),
    formatCurrency(totalGeral)
  ]);

  autoTable(doc, {
    startY: 82,
    head: [['Produto', 'Qtd. Total Vendida', 'Valor Acumulado']],
    body: productTableData,
    theme: 'striped',
    headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255] }, // Cor Teal
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 45, halign: 'center' },
      2: { cellWidth: 45, halign: 'right' }
    },
    didParseCell: (data) => {
      // Destaca a última linha (Total Geral) em negrito
      if (data.row.index === productTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 250];
      }
    }
  });

  // Seção 2: Histórico de Transações
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 140;

  doc.setFontSize(12);
  doc.setTextColor(13, 17, 23);
  doc.text('Histórico Detalhado de Transações', 14, finalY + 12);

  const salesTableData = sales.map(sale => [
    formatDateTime(sale.timestamp),
    sale.method,
    sale.status,
    sale.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
    formatCurrency(sale.total)
  ]);

  autoTable(doc, {
    startY: finalY + 16,
    head: [['Data/Hora', 'Método', 'Status', 'Itens', 'Total']],
    body: salesTableData,
    theme: 'striped',
    headStyles: { fillColor: [13, 17, 23], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 22 },
      2: { cellWidth: 25 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28, halign: 'right' }
    }
  });

  doc.save(`AuraPOS_Fechamento_${dateLabel.replace(/\//g, '-')}.pdf`);
}