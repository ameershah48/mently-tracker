import { CryptoSymbol } from '../types/crypto';

export interface PriceHistoryEntry {
  date: string;
  price: number;
}

export interface AssetPriceHistory {
  symbol: string;
  prices: PriceHistoryEntry[];
}

export interface PriceHistoryData {
  lastUpdated: string;
  assets: AssetPriceHistory[];
}

const STORAGE_KEY = 'priceHistory';

export function loadPriceHistory(): PriceHistoryData {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (!storedData) {
    return {
      lastUpdated: new Date().toISOString(),
      assets: []
    };
  }
  return JSON.parse(storedData);
}

export function savePriceHistory(data: PriceHistoryData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addPriceEntry(symbol: string, price: number, date?: Date): void {
  const data = loadPriceHistory();
  const entryDate = date || new Date();
  const entryMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

  let assetHistory = data.assets.find(a => a.symbol === symbol);
  if (!assetHistory) {
    assetHistory = {
      symbol,
      prices: []
    };
    data.assets.push(assetHistory);
  }

  // Check if we already have an entry for this month
  const hasEntryForMonth = assetHistory.prices.some(entry => {
    const existingDate = new Date(entry.date);
    const existingMonth = `${existingDate.getFullYear()}-${String(existingDate.getMonth() + 1).padStart(2, '0')}`;
    return existingMonth === entryMonth;
  });

  // Only add new entry if it's a new month or the first entry
  if (!hasEntryForMonth || assetHistory.prices.length === 0) {
    assetHistory.prices.push({
      date: entryDate.toISOString(),
      price
    });

    data.lastUpdated = new Date().toISOString();
    savePriceHistory(data);
  }
}

export function getAssetPriceHistory(symbol: string): PriceHistoryEntry[] {
  const data = loadPriceHistory();
  const assetHistory = data.assets.find(a => a.symbol === symbol);
  return assetHistory?.prices || [];
}

export function getAllPriceHistory(): PriceHistoryData {
  return loadPriceHistory();
} 