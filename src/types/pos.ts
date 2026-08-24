export type Product = {
  id: string;
  name: string;
  price: number;
  color: string;
  category: string;
};

export type CartItem = Product & {
  quantity: number;
};

export type PaymentMethod = 'PIX' | 'CARTAO' | 'DINHEIRO';

export type SaleStatus = 'APROVADA' | 'CANCELADA';

export type Sale = {
  id: string;
  items: CartItem[];
  total: number;
  method: PaymentMethod;
  timestamp: number;
  status: SaleStatus;
  synced: boolean; // Controla se a venda já subiu pro servidor
  operatorId?: string;   // ID do usuário que realizou a venda
  operatorName?: string;
  cashReceived?: number;
  change?: number;
};

export type UserRole = 'OPERATOR' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // PIN de 4 a 6 dígitos para troca rápida de caixa
  active: boolean;
  createdAt: number;
};

// Atualizamos a opção do relatório para aceitar a entidade inteira
export interface ReportOptions {
  dateLabel?: string;
  cashierPrefix?: string;
  operator: User; // <- Exige estritamente um usuário válido cadastrado
}