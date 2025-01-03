import React, { createContext, useContext, useState, useEffect } from 'react';
import { CryptoSymbolInfo, loadCryptoSymbols } from '../types/crypto';

interface CryptoSymbolsContextType {
  cryptoSymbols: CryptoSymbolInfo[];
  refreshCryptoSymbols: () => void;
}

const CryptoSymbolsContext = createContext<CryptoSymbolsContextType | undefined>(undefined);

export function CryptoSymbolsProvider({ children }: { children: React.ReactNode }) {
  const [cryptoSymbols, setCryptoSymbols] = useState<CryptoSymbolInfo[]>([]);

  const refreshCryptoSymbols = () => {
    setCryptoSymbols(loadCryptoSymbols());
  };

  useEffect(() => {
    refreshCryptoSymbols();
  }, []);

  return (
    <CryptoSymbolsContext.Provider value={{ cryptoSymbols, refreshCryptoSymbols }}>
      {children}
    </CryptoSymbolsContext.Provider>
  );
}

export function useCryptoSymbols() {
  const context = useContext(CryptoSymbolsContext);
  if (context === undefined) {
    throw new Error('useCryptoSymbols must be used within a CryptoSymbolsProvider');
  }
  return context;
} 