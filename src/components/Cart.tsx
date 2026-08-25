import { useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatCurrency } from '@/utils';
import { Minus, Plus, Trash2, ChevronUp, X } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';

export function Cart() {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = usePos();
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (itemCount === 0 && !isOpen) return null;

  return (
    <>
      {/* Botão Flutuante Mobile (Quando o carrinho está recolhido) */}
      {!isOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-main border-t border-line shadow-xl">
          <button 
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full bg-primary active:bg-primary/90 text-black font-bold text-lg py-4 rounded-xl flex items-center justify-between px-6 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="bg-black/20 px-2 py-1 rounded-md text-sm">{itemCount} itens</span>
            </span>
            <span>{formatCurrency(cartTotal)}</span>
            <ChevronUp />
          </button>
        </div>
      )}

      {/* Overlay Escuro para Mobile (Impede clique ou visualização do catálogo por trás) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/80 z-50 animate-fadeIn"
        />
      )}

      {/* Drawer do Carrinho (Fundo Sólido #161B22 via bg-surface) */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-96 z-50 bg-surface text-txt-primary flex flex-col transition-transform duration-200 border-l border-line shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} ${!isOpen ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Cabeçalho */}
        <div className="p-4 border-b border-line flex justify-between items-center bg-main">
          <h2 className="text-xl font-bold text-txt-primary">Carrinho</h2>
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={clearCart} 
              className="text-txt-secondary hover:text-rose-500 p-2 cursor-pointer transition-colors"
            >
              <Trash2 size={20} />
            </button>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)} 
              className="md:hidden text-txt-primary p-2 cursor-pointer transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-main p-3.5 rounded-xl border border-line shadow-sm">
              <div className="flex-1 pr-2">
                <div className="font-semibold text-txt-primary text-base">{item.name}</div>
                <div className="text-success font-bold text-sm mt-0.5">{formatCurrency(item.price)}</div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => updateQuantity(item.id, -1)} 
                  className="p-2 bg-surface rounded-full text-txt-secondary active:bg-line cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-bold text-txt-primary">{item.quantity}</span>
                <button 
                  type="button"
                  onClick={() => updateQuantity(item.id, 1)} 
                  className="p-2 bg-surface rounded-full text-txt-secondary active:bg-line cursor-pointer"
                >
                  <Plus size={16} />
                </button>
                <button 
                  type="button"
                  onClick={() => removeFromCart(item.id)} 
                  className="p-2 ml-1 text-rose-500 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="text-center text-txt-secondary mt-12 font-medium">
              O carrinho está vazio.
            </div>
          )}
        </div>

        {/* Rodapé com Total */}
        <div className="p-4 border-t border-line bg-main pb-8 md:pb-4 space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-txt-secondary font-medium">Total</span>
            <span className="text-3xl font-bold text-txt-primary">{formatCurrency(cartTotal)}</span>
          </div>
          <button 
            type="button"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-primary active:bg-primary/90 text-black font-extrabold text-xl py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg transition-transform active:scale-[0.98]"
          >
            Cobrar
          </button>
        </div>
      </div>

      {/* Modal de Checkout */}
      {isCheckoutOpen && (
        <CheckoutModal 
          onClose={() => {
            setIsCheckoutOpen(false);
            setIsOpen(false);
          }} 
        />
      )}
    </>
  );
}