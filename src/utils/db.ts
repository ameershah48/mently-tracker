import { Asset, AssetFormData, EditAssetData } from '../types/asset';

const STORAGE_KEY = 'assets';

export function getAllAssets(): Asset[] {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (!storedData) return [];
  return JSON.parse(storedData);
}

export function saveAsset(data: AssetFormData): void {
  const assets = getAllAssets();
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