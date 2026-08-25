import { useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatCurrency } from '@/utils';
import { Minus, Plus, Trash2, ChevronUp } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';

export function Cart() {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = usePos();
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (itemCount === 0 && !isOpen) return null;

  return (
    <>
      {/* Mobile collapsed state */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-bg-main border-t border-border-color shadow-xl">
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full bg-primary text-black font-bold text-lg py-4 rounded-xl flex items-center justify-between px-6 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="bg-black/20 px-2 py-1 rounded-md text-sm">{itemCount} itens</span>
          </span>
          <span>{formatCurrency(cartTotal)}</span>
          <ChevronUp />
        </button>
      </div>

      {/* Expanded state (Mobile full screen, Desktop sidebar) */}
      <div className={`fixed inset-0 md:inset-auto md:right-0 md:top-18.25 md:bottom-0 md:w-96 z-50 bg-bg-surface flex flex-col transition-transform ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'} border-l border-border-color`}>
        <div className="p-4 border-b border-border-color flex justify-between items-center bg-bg-overlay">
          <h2 className="text-xl font-bold text-text-primary">Carrinho</h2>
          <div className="flex gap-4">
            <button onClick={clearCart} className="text-text-secondary hover:text-red-500 p-2 cursor-pointer">
              <Trash2 size={20} />
            </button>
            <button onClick={() => setIsOpen(false)} className="md:hidden text-text-primary p-2 cursor-pointer">
              Fechar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-bg-main p-3 rounded-lg border border-border-color">
              <div className="flex-1">
                <div className="font-semibold text-text-primary">{item.name}</div>
                <div className="text-success">{formatCurrency(item.price)}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => updateQuantity(item.id, -1)} className="p-2 bg-bg-surface rounded-full text-text-secondary active:bg-border-color cursor-pointer">
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-bold text-text-primary">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="p-2 bg-bg-surface rounded-full text-text-secondary active:bg-border-color cursor-pointer">
                  <Plus size={16} />
                </button>
                <button onClick={() => removeFromCart(item.id)} className="p-2 ml-2 text-red-500 cursor-pointer">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="text-center text-text-secondary mt-10">
              O carrinho está vazio.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border-color bg-bg-main pb-8 md:pb-4">
          <div className="flex justify-between items-end mb-4">
            <span className="text-text-secondary">Total</span>
            <span className="text-3xl font-bold text-text-primary">{formatCurrency(cartTotal)}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-primary text-black font-bold text-xl py-4 rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
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