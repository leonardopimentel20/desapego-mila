'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchBoxProps {
  initialValue?: string;
  placeholder?: string;
  isAdmin?: boolean;
}

interface Suggestion {
  id: string;
  title: string;
}

export function SearchBox({ initialValue = "", placeholder = "Buscar...", isAdmin = false }: SearchBoxProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  // Busca sugestões conforme o usuário digita
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setIsOpen(data.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    setIsOpen(false);
    startTransition(() => {
      if (isAdmin) {
        router.push(`/admin?search=${encodeURIComponent(searchQuery)}`);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        if (searchQuery) {
          params.set('search', searchQuery);
        } else {
          params.delete('search');
        }
        router.push(`/?${params.toString()}`);
      }
    });
  };

  // Suporte a navegação por teclado (Setas, Enter e Esc)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(query);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        const selected = suggestions[selectedIndex];
        setQuery(selected.title);
        handleSearch(selected.title);
      } else {
        handleSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-white border border-neutral-300 rounded-full px-5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-pink-600 transition-all shadow-xs"
        />
        <button
          type="button"
          onClick={() => handleSearch(query)}
          className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-all shadow-sm cursor-pointer whitespace-nowrap"
        >
          {isPending ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden z-50">
          <ul className="py-2">
            {suggestions.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(item.title);
                    handleSearch(item.title);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-5 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    selectedIndex === index ? 'bg-pink-50 text-pink-600 font-bold' : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}