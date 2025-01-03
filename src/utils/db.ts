import { Asset, AssetFormData, EditAssetData, AssetSymbolInfo } from '../types/asset';
import { isValidCryptoSymbol } from '../types/crypto';
import { isValidCommoditySymbol } from '../types/commodities';

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
  // Validate the symbol exists based on asset type
  const isValid = data.assetType === 'CRYPTO' 
    ? isValidCryptoSymbol(data.symbol.value)
    : isValidCommoditySymbol(data.symbol.value);

  if (!isValid) {
    throw new Error(`Invalid ${data.assetType.toLowerCase()} symbol: ${data.symbol.value}`);
  }

  const assets = getAllAssets();
  
  // For sell transactions, verify we have enough assets to sell
  if (data.transactionType === 'SELL') {
    // Get total quantity of this asset from previous buys and earnings
    const totalBought = assets
      .filter(a => isSameSymbol(a.symbol, data.symbol) && (a.transactionType === 'BUY' || a.transactionType === 'EARN'))
      .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
      
    // Get total quantity already sold
    const totalSold = assets
      .filter(a => isSameSymbol(a.symbol, data.symbol) && a.transactionType === 'SELL')
      .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
      
    const availableQuantity = totalBought - totalSold;
    
    if (data.purchaseQuantity > availableQuantity) {
      throw new Error(`Cannot sell ${data.purchaseQuantity} ${data.symbol.value}. Only ${availableQuantity.toFixed(8)} available.`);
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

// Helper function to compare asset symbols
function isSameSymbol(a: AssetSymbolInfo, b: AssetSymbolInfo): boolean {
  return a.value === b.value;
}

export function updateAsset(id: string, data: EditAssetData): void {
  const assets = getAllAssets();
  const index = assets.findIndex(asset => asset.id === id);
  
  if (index === -1) {
    throw new Error('Asset not found');
  }

  const asset = assets[index];
  
  // For sell transactions, verify we have enough assets to sell
  if (data.transactionType === 'SELL') {
    // Get total quantity of this asset from previous buys and earnings
    const totalBought = assets
      .filter(a => isSameSymbol(a.symbol, asset.symbol) && (a.transactionType === 'BUY' || a.transactionType === 'EARN'))
      .reduce((sum, a) => sum + a.purchaseQuantity, 0);
      
    // Get total quantity already sold
    const totalSold = assets
      .filter(a => isSameSymbol(a.symbol, asset.symbol) && a.transactionType === 'SELL' && a.id !== id)
      .reduce((sum, a) => sum + a.purchaseQuantity, 0);
      
    const availableQuantity = totalBought - totalSold;
    
    if (data.purchaseQuantity > availableQuantity) {
      throw new Error(`Cannot sell ${data.purchaseQuantity} ${asset.symbol.value}. Only ${availableQuantity.toFixed(8)} available.`);
    }
  }

  try {
    assets[index] = {
      ...asset,
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
export function getAvailableQuantity(symbol: AssetSymbolInfo): number {
  const assets = getAllAssets();
  
  const totalBought = assets
    .filter(a => isSameSymbol(a.symbol, symbol) && (a.transactionType === 'BUY' || a.transactionType === 'EARN'))
    .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
    
  const totalSold = assets
    .filter(a => isSameSymbol(a.symbol, symbol) && a.transactionType === 'SELL')
    .reduce((sum, asset) => sum + asset.purchaseQuantity, 0);
    
  return totalBought - totalSold;
}

// Add a new helper function to calculate average purchase price
export function getAveragePurchasePrice(symbol: AssetSymbolInfo): number {
  const assets = getAllAssets();
  
  const buyTransactions = assets.filter(a => 
    isSameSymbol(a.symbol, symbol) && 
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