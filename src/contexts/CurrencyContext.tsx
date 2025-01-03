import React, { createContext, useContext, useState, useEffect } from 'react';
import { Currency } from '../types/asset';

const SETTINGS_KEY = 'settings';

interface Settings {
  openExchangeKey: string;
  goldApiKey: string;
}

function getSettings(): Settings {
  const storedSettings = localStorage.getItem(SETTINGS_KEY);
  if (!storedSettings) return { openExchangeKey: '', goldApiKey: '' };
  return JSON.parse(storedSettings);
}

interface CurrencyContextType {
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
  convertAmount: (amount: number, fromCurrency: Currency, toCurrency: Currency) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [exchangeRates, setExchangeRates] = useState<Record<Currency, number>>({
    USD: 1,
    MYR: 4.71, // Default rate, will be updated by API
  });

  useEffect(() => {
    // Fetch exchange rates from an API
    const fetchExchangeRates = async () => {
      try {
        const { openExchangeKey } = getSettings();
        if (!openExchangeKey) {
          console.warn('OpenExchange API key not found in settings');
          return;
        }

        const response = await fetch(
          `https://openexchangerates.org/api/latest.json?app_id=${openExchangeKey}&base=USD&symbols=MYR`
        );
        const data = await response.json();
        if (data.rates) {
          setExchangeRates({
            USD: 1,
            MYR: data.rates.MYR,
          });
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    };

    // Fetch rates initially and then every hour
    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const convertAmount = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to USD first (as base currency)
    const amountInUSD = amount / exchangeRates[fromCurrency];
    // Then convert to target currency
    return amountInUSD * exchangeRates[toCurrency];
  };

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, convertAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
} 