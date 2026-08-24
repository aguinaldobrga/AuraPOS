// Formatação de Moeda (BRL)
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Formatação de Hora (ex: 14:30)
export const formatTime = (timestamp: number): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
};

// Formatação de Data Completa (ex: 24/08/2026)
export const formatDate = (timestamp: number | Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(timestamp);
};

// Formatação Combinada de Data e Hora (ex: 24/08/2026 às 14:30)
export const formatDateTime = (timestamp: number | Date): string => {
  return `${formatDate(timestamp)} às ${formatTime(typeof timestamp === 'number' ? timestamp : timestamp.getTime())}`;
};
