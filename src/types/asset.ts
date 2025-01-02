import { CryptoSymbol } from './crypto';

export type Currency = 'USD' | 'MYR';

export interface Asset {
  id: string;
  symbol: CryptoSymbol;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
  currentPrice: number;
  currentPriceCurrency: Currency;
  createdAt: Date;
}

export interface AssetFormData {
  symbol: CryptoSymbol;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
}

export interface EditAssetData {
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
}