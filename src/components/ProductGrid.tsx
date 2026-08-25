import { useState, useMemo } from 'react';
import { usePos } from '@/context/PosContext';
import { CategoryFilter } from './CategoryFilter';
import { formatCurrency } from '@/utils';
import { Plus } from 'lucide-react';

export function ProductGrid() {
  const { products, addToCart } = usePos();
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  // Extrai lista única de categorias dinamicamente
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(set);
  }, [products]);

  // Filtra produtos de forma reativa
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'TODAS') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <div className="p-4">
      {/* Filtro por Categorias */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}

      {/* Grid de Produtos com Toque Grande */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map(product => (
          <button
            key={product.id}
            onClick={() => addToCart(product)}
            style={{ borderColor: `${product.color}40` }}
            className="group relative bg-surface border rounded-2xl p-4 flex flex-col justify-between text-left transition-all active:scale-95 hover:border-teal-500/50 shadow-md"
          >
            {/* Indicador sutil de cor da categoria */}
            <div
              className="w-2 h-2 rounded-full mb-2"
              style={{ backgroundColor: product.color || '#14b8a6' }}
            />

            <div>
              <h4 className="font-bold text-slate-100 text-base leading-snug line-clamp-2">
                {product.name}
              </h4>
              <p className="text-xs text-slate-400 mt-1">{product.category}</p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-teal-400">
                {formatCurrency(product.price)}
              </span>
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                <Plus size={16} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center text-slate-500 py-12">
          Nenhum produto encontrado nesta categoria.
        </div>
      )}
    </div>
  );
}