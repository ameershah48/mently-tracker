import Dexie, { Table } from 'dexie';
import { Asset, AssetFormData, EditAssetData } from '../types/asset';

class AssetDatabase extends Dexie {
  assets!: Table<Asset>;

  constructor() {
    super('AssetDatabase');
    this.version(1).stores({
      assets: 'id, symbol, name, purchaseQuantity, purchasePrice, purchaseDate, currentPrice, createdAt'
    });
  }
}

const db = new AssetDatabase();

export const saveAsset = async (data: AssetFormData): Promise<Asset> => {
  const asset: Asset = {
    id: crypto.randomUUID(),
    ...data,
    currentPrice: 0, // Will be updated by API
    createdAt: new Date(),
  };

  await db.assets.add(asset);
  return asset;
};

export const getAllAssets = async (): Promise<Asset[]> => {
  return await db.assets.orderBy('createdAt').reverse().toArray();
};

export const updateAssetPrice = async (id: string, currentPrice: number): Promise<void> => {
  await db.assets.update(id, { currentPrice });
};

export const updateAsset = async (id: string, data: EditAssetData): Promise<void> => {
  const updateData: Partial<Asset> = {
    purchaseQuantity: data.purchaseQuantity,
    purchasePrice: data.purchasePrice,
    purchaseDate: data.purchaseDate
  };
  await db.assets.update(id, updateData);
};

export const deleteAsset = async (id: string): Promise<void> => {
  await db.assets.delete(id);
}; 