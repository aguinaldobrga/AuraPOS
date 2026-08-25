import { useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatCurrency } from '@/utils';
import { QrCode, CreditCard, Banknote, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function CheckoutModal({ onClose }: { onClose: () => void }) {
  const { cartTotal, registerSale } = usePos();
  const [method, setMethod] = useState<'PIX' | 'CARTAO' | 'DINHEIRO' | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFinish = () => {
    if (method === 'DINHEIRO') {
      const received = parseFloat(cashReceived.replace(',', '.'));
      const change = received - cartTotal;
      registerSale('DINHEIRO', received, change);
    } else {
      registerSale(method!);
    }
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-main flex flex-col items-center justify-center p-4">
        <CheckCircle2 size={80} className="text-success mb-4" />
        <h2 className="text-3xl font-bold text-txt-primary mb-2">Venda Concluída!</h2>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-main flex flex-col">
      {/* Cabeçalho */}
      <div className="p-4 flex items-center border-b border-line bg-main">
        <button 
          type="button"
          onClick={() => (method ? setMethod(null) : onClose())} 
          className="p-2 -ml-2 text-txt-secondary hover:text-txt-primary cursor-pointer transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-txt-primary ml-2">Pagamento</h2>
      </div>

      {/* Conteúdo do Modal */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center bg-main">
        <div className="text-center mb-8 mt-4">
          <div className="text-txt-secondary mb-1">Total a Pagar</div>
          <div className="text-5xl font-bold text-txt-primary">{formatCurrency(cartTotal)}</div>
        </div>

        {!method && (
          <div className="w-full max-w-md space-y-4">
            <button 
              type="button"
              onClick={() => setMethod('PIX')} 
              className="w-full flex items-center p-6 bg-surface border border-line rounded-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <QrCode size={32} className="text-primary mr-4" />
              <span className="text-xl font-bold text-txt-primary">Pix</span>
            </button>

            <button 
              type="button"
              onClick={() => setMethod('CARTAO')} 
              className="w-full flex items-center p-6 bg-surface border border-line rounded-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <CreditCard size={32} className="text-blue-500 mr-4" />
              <span className="text-xl font-bold text-txt-primary">Cartão (Débito/Crédito)</span>
            </button>

            <button 
              type="button"
              onClick={() => setMethod('DINHEIRO')} 
              className="w-full flex items-center p-6 bg-surface border border-line rounded-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <Banknote size={32} className="text-success mr-4" />
              <span className="text-xl font-bold text-txt-primary">Dinheiro</span>
            </button>
          </div>
        )}

        {method === 'PIX' && (
          <div className="flex flex-col items-center w-full max-w-md">
            <div className="bg-white p-4 rounded-xl mb-6 shadow-md">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX-${cartTotal}`} 
                alt="QR Code Pix" 
                className="w-48 h-48" 
              />
            </div>
            <div className="text-txt-secondary text-center mb-8">
              Escaneie o QR Code para pagar.<br />Confirme o recebimento no seu app do banco.
            </div>
            <button 
              type="button"
              onClick={handleFinish} 
              className="w-full bg-primary text-black font-bold text-xl py-4 rounded-xl active:scale-[0.98] cursor-pointer shadow-lg"
            >
              Confirmar Recebimento
            </button>
          </div>
        )}

        {method === 'CARTAO' && (
          <div className="flex flex-col items-center w-full max-w-md mt-10">
            <CreditCard size={64} className="text-txt-secondary mb-6 opacity-50" />
            <div className="text-txt-primary text-xl text-center mb-8">
              Passe o cartão ou aproxime na maquininha.
            </div>
            <button 
              type="button"
              onClick={handleFinish} 
              className="w-full bg-primary text-black font-bold text-xl py-4 rounded-xl active:scale-[0.98] cursor-pointer shadow-lg"
            >
              Pagamento Aprovado
            </button>
          </div>
        )}

        {method === 'DINHEIRO' && (
          <div className="w-full max-w-md flex flex-col h-full">
            <div className="mb-6">
              <label className="text-txt-secondary block mb-2 font-medium">Valor Recebido</label>
              <input 
                type="number" 
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="w-full bg-surface border border-line text-txt-primary text-3xl p-4 rounded-xl text-center focus:outline-none focus:border-primary font-bold"
                placeholder="0.00"
                autoFocus
              />
            </div>
            
            {(() => {
              const received = parseFloat(cashReceived.replace(',', '.'));
              if (!isNaN(received) && received >= cartTotal) {
                const change = received - cartTotal;
                return (
                  <div className="mb-8 p-4 bg-surface rounded-xl border border-line text-center">
                    <div className="text-txt-secondary mb-1">Troco a devolver</div>
                    <div className="text-4xl font-bold text-accent">{formatCurrency(change)}</div>
                  </div>
                );
              } else if (!isNaN(received) && received > 0 && received < cartTotal) {
                return (
                  <div className="mb-8 p-4 text-center text-rose-500 font-medium">
                    Valor insuficiente
                  </div>
                );
              }
              return null;
            })()}

            <div className="mt-auto pb-4">
              <button 
                type="button"
                onClick={handleFinish} 
                disabled={!cashReceived || parseFloat(cashReceived.replace(',', '.')) < cartTotal}
                className="w-full bg-primary text-black font-bold text-xl py-4 rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
              >
                Finalizar Venda
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}