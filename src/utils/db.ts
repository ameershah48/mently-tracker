import { Asset, AssetFormData, EditAssetData } from '../types/asset';
import { isValidCryptoSymbol } from '../types/crypto';

const STORAGE_KEY = 'assets';

export function getAllAssets(): Asset[] {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (!storedData) return [];
  
  try {
    const assets = JSON.parse(storedData);
    // Validate dates are properly parsed
    return assets.map((asset: any) => ({
      ...asset,
      purchaseDate: new Date(asset.purchaseDate),
      createdAt: new Date(asset.createdAt)
    }));
  } catch (error) {
    console.error('Failed to parse stored assets:', error);
    return [];
  }
}

export function saveAsset(data: AssetFormData): void {
  // Validate the crypto symbol exists
  if (!isValidCryptoSymbol(data.symbol)) {
    throw new Error(`Invalid crypto symbol: ${data.symbol}`);
  }

  const assets = getAllAssets();
  
  // For sell transactions, verify we have enough assets to sell
  if (data.transactionType === 'SELL') {
    // Get total quantity of this asset from previous buys and earnings
    const totalBought = assets
      .filter(a => a.symbol === data.symbol && (a.transactionType === 'BUY' || a.transactionType === 'EARN'))
      .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
      
    // Get total quantity already sold
    const totalSold = assets
      .filter(a => a.symbol === data.symbol && a.transactionType === 'SELL')
      .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
      
    const availableQuantity = totalBought - totalSold;
    
    if (data.purchaseQuantity > availableQuantity) {
      throw new Error(`Cannot sell ${data.purchaseQuantity} ${data.symbol}. Only ${availableQuantity.toFixed(8)} available.`);
    }
  }

  const newAsset: Asset = {
    id: crypto.randomUUID(),
    ...data,
    currentPrice: 0,
    currentPriceCurrency: 'USD',
    createdAt: new Date(),
  };
  
  try {
    assets.push(newAsset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Failed to save asset:', error);
    throw new Error('Failed to save asset. Please try again.');
  }
}

export function updateAsset(id: string, data: EditAssetData): void {
  const assets = getAllAssets();
  const index = assets.findIndex(asset => asset.id === id);
  
  if (index === -1) {
    throw new Error('Asset not found');
  }

  // For sell transactions, verify we have enough assets to sell
  if (data.transactionType === 'SELL') {
    const symbol = assets[index].symbol;
    const currentQuantity = assets[index].purchaseQuantity;
    
    // Calculate available quantity excluding the current asset
    const otherAssets = assets.filter(a => a.id !== id);
    const totalBought = otherAssets
      .filter(a => a.symbol === symbol && (a.transactionType === 'BUY' || a.transactionType === 'EARN'))
      .reduce((sum, a) => sum + a.purchaseQuantity, 0);
    
    const totalSold = otherAssets
      .filter(a => a.symbol === symbol && a.transactionType === 'SELL')
      .reduce((sum, a) => sum + a.purchaseQuantity, 0);
    
    const availableQuantity = totalBought - totalSold;
    
    if (data.purchaseQuantity > availableQuantity + currentQuantity) {
      throw new Error(`Cannot update to ${data.purchaseQuantity} ${symbol}. Only ${(availableQuantity + currentQuantity).toFixed(8)} available.`);
    }
  }

  try {
    assets[index] = {
      ...assets[index],
      ...data,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Failed to update asset:', error);
    throw new Error('Failed to update asset. Please try again.');
  }
}

export function updateAssetPrice(id: string, currentPrice: number): void {
  const assets = getAllAssets();
  const index = assets.findIndex(asset => asset.id === id);
  
  if (index === -1) return;

  try {
    assets[index] = {
      ...assets[index],
      currentPrice,
      currentPriceCurrency: 'USD', // Prices from API are always in USD
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Failed to update asset price:', error);
  }
}

export function deleteAsset(id: string): void {
  const assets = getAllAssets();
  const filteredAssets = assets.filter(asset => asset.id !== id);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredAssets));
  } catch (error) {
    console.error('Failed to delete asset:', error);
    throw new Error('Failed to delete asset. Please try again.');
  }
}

// Add a new helper function to get available quantity
export function getAvailableQuantity(symbol: string): number {
  const assets = getAllAssets();
  
  const totalBought = assets
    .filter(a => a.symbol === symbol && (a.transactionType === 'BUY' || a.transactionType === 'EARN'))
    .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
    
  const totalSold = assets
    .filter(a => a.symbol === symbol && a.transactionType === 'SELL')
    .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
    
  return totalBought - totalSold;
}

// Add a new helper function to calculate average purchase price
export function getAveragePurchasePrice(symbol: string): number {
  const assets = getAllAssets();
  
  const buyTransactions = assets.filter(a => 
    a.symbol === symbol && 
    (a.transactionType === 'BUY' || a.transactionType === 'EARN')
  );
  
  if (buyTransactions.length === 0) return 0;
  
  const totalValue = buyTransactions.reduce((sum, asset) => {
    // For EARN transactions, use current price as purchase price
    const price = asset.transactionType === 'EARN' ? asset.currentPrice : asset.purchasePrice;
    return sum + (price * asset.purchaseQuantity);
  }, 0);
  
  const totalQuantity = buyTransactions.reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
  
  return totalValue / totalQuantity;
} 