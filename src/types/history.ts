import { CryptoSymbol } from './crypto';

export interface PriceHistoryEntry {
  date: string;  // ISO string format
  price: number;
}

export interface AssetPriceHistory {
  symbol: CryptoSymbol;
  history: PriceHistoryEntry[];
}

export interface PriceHistoryData {
  lastUpdated: string;  // ISO string format
  assets: AssetPriceHistory[];
} 