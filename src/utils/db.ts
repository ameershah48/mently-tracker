import { Asset, AssetFormData, EditAssetData } from '../types/asset';

const STORAGE_KEY = 'assets';

export function getAllAssets(): Asset[] {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (!storedData) return [];
  return JSON.parse(storedData);
}

export function saveAsset(data: AssetFormData): void {
  const assets = getAllAssets();
  
  // For sell transactions, verify we have enough assets to sell
  if (data.transactionType === 'SELL') {
    // Get total quantity of this asset from previous buys
    const totalBought = assets
      .filter(a => a.symbol === data.symbol && a.transactionType === 'BUY')
      .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
      
    // Get total quantity already sold
    const totalSold = assets
      .filter(a => a.symbol === data.symbol && a.transactionType === 'SELL')
      .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
      
    const availableQuantity = totalBought - totalSold;
    
    if (data.purchaseQuantity > availableQuantity) {
      throw new Error(`Cannot sell ${data.purchaseQuantity} ${data.symbol}. Only ${availableQuantity} available.`);
    }
  }

  const newAsset: Asset = {
    id: crypto.randomUUID(),
    ...data,
    currentPrice: 0,
    currentPriceCurrency: 'USD',
    createdAt: new Date(),
  };
  
  assets.push(newAsset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

export function updateAsset(id: string, data: EditAssetData): void {
  const assets = getAllAssets();
  const index = assets.findIndex(asset => asset.id === id);
  if (index !== -1) {
    assets[index] = {
      ...assets[index],
      ...data,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  }
}

export function updateAssetPrice(id: string, currentPrice: number): void {
  const assets = getAllAssets();
  const index = assets.findIndex(asset => asset.id === id);
  if (index !== -1) {
    assets[index] = {
      ...assets[index],
      currentPrice,
      currentPriceCurrency: 'USD', // Prices from API are always in USD
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  }
}

export function deleteAsset(id: string): void {
  const assets = getAllAssets();
  const filteredAssets = assets.filter(asset => asset.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredAssets));
}

// Add a new helper function to get available quantity
export function getAvailableQuantity(symbol: string): number {
  const assets = getAllAssets();
  
  const totalBought = assets
    .filter(a => a.symbol === symbol && a.transactionType === 'BUY')
    .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
    
  const totalSold = assets
    .filter(a => a.symbol === symbol && a.transactionType === 'SELL')
    .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
    
  return totalBought - totalSold;
}

// Add a new helper function to calculate average purchase price
export function getAveragePurchasePrice(symbol: string): number {
  const assets = getAllAssets();
  
  const buyTransactions = assets.filter(a => a.symbol === symbol && a.transactionType === 'BUY');
  if (buyTransactions.length === 0) return 0;
  
  const totalValue = buyTransactions.reduce((sum, asset) => sum + asset.purchasePrice, 0);
  const totalQuantity = buyTransactions.reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
  
  return totalValue / totalQuantity;
} 