"use client";

interface Category {
  value: string;
  label: string;
}

interface CategoryFilterProps {
  categories: Category[];
  active: string;
  onChange: (value: string) => void;
}

export default function CategoryFilter({ categories, active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {categories.map((cat) => {
        const isActive = cat.value === active;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className="text-[12px] tracking-[0.06em] px-5 py-[10px] rounded-[3px] border transition-all duration-200 cursor-pointer"
            style={{
              background: isActive ? "var(--teal)" : "transparent",
              color: isActive ? "white" : "var(--ink-muted)",
              borderColor: isActive ? "var(--teal)" : "rgba(0,0,0,0.15)",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
