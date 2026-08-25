import { Tag } from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory
}: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none snap-x">
      <button
        onClick={() => onSelectCategory('TODAS')}
        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all snap-start flex items-center gap-1.5 active:scale-95 ${
          selectedCategory === 'TODAS'
            ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20 font-semibold'
            : 'bg-surface text-slate-400 hover:text-slate-200 border border-slate-800'
        }`}
      >
        <Tag size={14} />
        <span>Todas</span>
      </button>

      {categories.map(category => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all snap-start active:scale-95 ${
            selectedCategory === category
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20 font-semibold'
              : 'bg-surface text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}