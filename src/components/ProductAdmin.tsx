import { useState, FormEvent, useMemo } from 'react';
import { usePos } from '@/context/PosContext';
import { formatCurrency } from '@/utils';
import { PackagePlus, Trash2, Tag, PlusCircle } from 'lucide-react';

const DEFAULT_CATEGORIES = ['Bebidas', 'Lanches', 'Sobremesas', 'Combos'];
const COLOR_OPTIONS = ['#14b8a6', '#3b82f6', '#ef4444', '#eab308', '#8b5cf6', '#ec4899'];

export function ProductAdmin() {
  const { products, addProduct, deleteProduct } = usePos();
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  // Agrupa categorias únicas do banco + lista padrão
  const availableCategories = useMemo(() => {
    const existing = products.map(p => p.category).filter(Boolean);
    const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...existing]));
    return combined;
  }, [products]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price.replace(',', '.'));
    
    if (!name.trim() || isNaN(numPrice) || numPrice <= 0) return;

    const finalCategory = isCustomCategory ? customCategory.trim() : category;

    await addProduct({
      name: name.trim(),
      price: numPrice,
      category: finalCategory || 'Geral',
      color
    });

    // Reset do formulário
    setName('');
    setPrice('');
    setCustomCategory('');
    setIsCustomCategory(false);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <PackagePlus className="text-teal-400" />
        <span>Catálogo de Produtos</span>
      </h2>

      {/* Formulário de Cadastro */}
      <div className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl mb-8 shadow-xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Nome do Produto <span className="text-teal-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Coca-Cola 350ml"
              className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Preço de Venda (R$) <span className="text-teal-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">
                Categoria
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
              >
                <PlusCircle size={12} />
                <span>{isCustomCategory ? 'Usar Existente' : 'Nova Categoria'}</span>
              </button>
            </div>

            {isCustomCategory ? (
              <input
                type="text"
                required
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="Digite a nova categoria..."
                className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            ) : (
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#0D1117] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-[#161B22]">
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Cor do Badge Visual
            </label>
            <div className="flex gap-2 items-center h-11">
              {COLOR_OPTIONS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#161B22]' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-all"
            >
              Cadastrar Produto
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Produtos Cadastrados */}
      <h3 className="text-xl font-bold text-slate-100 mb-4">Itens no Catálogo</h3>
      <div className="space-y-3">
        {products.map(product => (
          <div
            key={product.id}
            className="bg-[#161B22] border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: product.color || '#14b8a6' }}
              />
              <div>
                <div className="font-bold text-slate-100">{product.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Tag size={12} />
                  <span>{product.category}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-bold text-teal-400">
                {formatCurrency(product.price)}
              </span>
              <button
                onClick={() => {
                  if (confirm(`Remover o produto ${product.name}?`)) deleteProduct(product.id);
                }}
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
