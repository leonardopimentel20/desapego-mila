'use client';

import { useState } from 'react';

interface PriceInputProps {
  initialValue?: number;
}

export function PriceInput({ initialValue = 0 }: PriceInputProps) {
  const [value, setValue] = useState<string>(
    initialValue ? (initialValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setValue('');
      return;
    }
    const numberValue = Number(rawValue) / 100;
    setValue(
      numberValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const numericValue = value
    ? Number(value.replace(/\./g, '').replace(',', '.'))
    : 0;

  return (
    <div className="relative"> 
      <input
        type="text"
        value={value ? `R$ ${value}` : ''}
        onChange={handleChange}
        placeholder="R$ 0,00"
        required
        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-pink-600 focus:bg-white outline-none transition-all"
      />
      <input type="hidden" name="price" value={numericValue} />
    </div>
  );
}