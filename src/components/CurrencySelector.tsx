import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { Currency } from '../types/asset';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

const CURRENCY_OPTIONS: { value: Currency; label: string; icon: string }[] = [
  { 
    value: 'USD', 
    label: 'USD - US Dollar',
    icon: '🇺🇸'
  },
  { 
    value: 'MYR', 
    label: 'MYR - Malaysian Ringgit',
    icon: '🇲🇾'
  },
];

export function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const selectedCurrency = CURRENCY_OPTIONS.find(opt => opt.value === displayCurrency);

  return (
    <Select
      value={displayCurrency}
      onValueChange={(value: Currency) => setDisplayCurrency(value)}
    >
      <SelectTrigger className="w-[280px]">
        <div className="flex items-center gap-2">
          <span className="text-lg">{selectedCurrency?.icon}</span>
          <span>{selectedCurrency?.label || "Select currency"}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{option.icon}</span>
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 