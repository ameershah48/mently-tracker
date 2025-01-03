import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrencySymbolInfo, loadCurrencySymbols } from '../types/asset';

interface CurrencySymbolsContextType {
  currencySymbols: CurrencySymbolInfo[];
  refreshCurrencySymbols: () => void;
}

const CurrencySymbolsContext = createContext<CurrencySymbolsContextType | undefined>(undefined);

export function CurrencySymbolsProvider({ children }: { children: React.ReactNode }) {
  const [currencySymbols, setCurrencySymbols] = useState<CurrencySymbolInfo[]>([]);

  const refreshCurrencySymbols = () => {
    setCurrencySymbols(loadCurrencySymbols());
  };

  useEffect(() => {
    refreshCurrencySymbols();
  }, []);

  return (
    <CurrencySymbolsContext.Provider value={{ currencySymbols, refreshCurrencySymbols }}>
      {children}
    </CurrencySymbolsContext.Provider>
  );
}

export function useCurrencySymbols() {
  const context = useContext(CurrencySymbolsContext);
  if (context === undefined) {
    throw new Error('useCurrencySymbols must be used within a CurrencySymbolsProvider');
  }
  return context;
} 