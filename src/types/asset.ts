import { CryptoSymbolInfo } from './crypto';

export type Currency = string;

export interface CurrencySymbolInfo {
  value: Currency;
  label: string;
  name: string;
  icon: string;
}

export const DEFAULT_CURRENCY_SYMBOLS: CurrencySymbolInfo[] = [
  { value: 'USD', label: 'USD', name: 'US Dollar', icon: '🇺🇸' },
  { value: 'MYR', label: 'MYR', name: 'Malaysian Ringgit', icon: '🇲🇾' },
];

const CURRENCY_STORAGE_KEY = 'currencySymbols';

export function initializeCurrencySymbols(): void {
  const storedSymbols = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (!storedSymbols) {
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(DEFAULT_CURRENCY_SYMBOLS));
  }
}

export function loadCurrencySymbols(): CurrencySymbolInfo[] {
  const storedSymbols = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (!storedSymbols) {
    return DEFAULT_CURRENCY_SYMBOLS;
  }
  try {
    return JSON.parse(storedSymbols);
  } catch (error) {
    console.error('Failed to parse stored currency symbols:', error);
    return DEFAULT_CURRENCY_SYMBOLS;
  }
}

export function saveCurrencySymbols(symbols: CurrencySymbolInfo[]): void {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(symbols));
  } catch (error) {
    console.error('Failed to save currency symbols:', error);
    throw new Error('Failed to save currency symbols');
  }
}

export type TransactionType = 'BUY' | 'SELL' | 'EARN';

export interface Asset {
  id: string;
  symbol: CryptoSymbolInfo;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
  currentPrice: number;
  currentPriceCurrency: Currency;
  createdAt: Date;
  transactionType: TransactionType;
}

export interface AssetFormData {
  symbol: CryptoSymbolInfo;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
  transactionType: TransactionType;
}

export interface EditAssetData {
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
  transactionType: TransactionType;
}