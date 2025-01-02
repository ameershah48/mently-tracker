import { CryptoSymbol } from './crypto';

export type Currency = 'USD' | 'MYR';

export type TransactionType = 'BUY' | 'SELL';

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
  transactionType: TransactionType;
}

export interface AssetFormData {
  symbol: CryptoSymbol;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
  transactionType: TransactionType;
}

export interface EditAssetData {
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseCurrency: Currency;
  purchaseDate: Date;
}