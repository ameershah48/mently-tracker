import { CryptoSymbol } from './crypto';

export interface Asset {
  id: string;
  symbol: CryptoSymbol;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseDate: Date;
  currentPrice: number;
  createdAt: Date;
}

export interface AssetFormData {
  symbol: CryptoSymbol;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseDate: Date;
}

export interface EditAssetData {
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseDate: Date;
}