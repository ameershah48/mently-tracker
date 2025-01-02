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
  const existingEntryIndex = assetHistory.prices.findIndex(entry => {
    const existingDate = new Date(entry.date);
    const existingMonth = `${existingDate.getFullYear()}-${String(existingDate.getMonth() + 1).padStart(2, '0')}`;
    return existingMonth === entryMonth;
  });

  // Only update if price has changed significantly (more than 0.1% difference)
  const shouldUpdate = existingEntryIndex === -1 || 
    Math.abs(assetHistory.prices[existingEntryIndex].price - price) / assetHistory.prices[existingEntryIndex].price > 0.001;

  if (shouldUpdate) {
    if (existingEntryIndex !== -1) {
      // Update existing entry if price changed significantly
      assetHistory.prices[existingEntryIndex] = {
        date: entryDate.toISOString(),
        price
      };
    } else {
      // Add new entry for new month
      assetHistory.prices.push({
        date: entryDate.toISOString(),
        price
      });
    }

    data.lastUpdated = new Date().toISOString();
    savePriceHistory(data);
  }
}

// Add a new function to batch update price history
export function batchAddPriceEntries(entries: { symbol: string; price: number; date?: Date }[]): void {
  const data = loadPriceHistory();
  let hasUpdates = false;

  entries.forEach(({ symbol, price, date }) => {
    const entryDate = date || new Date();
    const entryMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

    let assetHistory = data.assets.find(a => a.symbol === symbol);
    if (!assetHistory) {
      assetHistory = {
        symbol,
        prices: []
      };
      data.assets.push(assetHistory);
      hasUpdates = true;
    }

    const existingEntryIndex = assetHistory.prices.findIndex(entry => {
      const existingDate = new Date(entry.date);
      const existingMonth = `${existingDate.getFullYear()}-${String(existingDate.getMonth() + 1).padStart(2, '0')}`;
      return existingMonth === entryMonth;
    });

    const shouldUpdate = existingEntryIndex === -1 || 
      Math.abs(assetHistory.prices[existingEntryIndex].price - price) / assetHistory.prices[existingEntryIndex].price > 0.001;

    if (shouldUpdate) {
      if (existingEntryIndex !== -1) {
        assetHistory.prices[existingEntryIndex] = {
          date: entryDate.toISOString(),
          price
        };
      } else {
        assetHistory.prices.push({
          date: entryDate.toISOString(),
          price
        });
      }
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
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