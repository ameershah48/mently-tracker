import React, { useState, useEffect } from 'react';
import { saveAsset } from '../utils/db';
import { CryptoSymbolInfo } from '../types/crypto';
import { CommodityInfo } from '../types/commodities';
import { AssetFormData, Currency, TransactionType, AssetType } from '../types/asset';
import { Label } from './ui/label';
import { Input } from './ui/Input';
import { Button } from './ui/button';
import { fetchHistoricalGoldPrices, fetchHistoricalCryptoPrices } from '../utils/prices';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import { Loader2 } from "lucide-react";
import { Combobox } from './ui/combobox';
import { useCryptoSymbols } from '../contexts/CryptoSymbolsContext';
import { useCommodities } from '../contexts/CommoditiesContext';
import { useCurrencySymbols } from '../contexts/CurrencySymbolsContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface AssetFormProps {
  onSubmit: (data: AssetFormData) => Promise<void>;
  onError: (error: Error) => void;
}

export function AssetForm({ onSubmit, onError }: AssetFormProps) {
  const { cryptoSymbols } = useCryptoSymbols();
  const { commodities } = useCommodities();
  const { currencySymbols } = useCurrencySymbols();
  const { displayCurrency } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('CRYPTO');

  // Filter out any commodity symbols that might have been cached in crypto symbols
  const filteredCryptoSymbols = cryptoSymbols.filter(s => !commodities.some(c => c.value === s.value));

  const allAssetOptions = [
    ...filteredCryptoSymbols.map(s => ({ ...s, type: 'CRYPTO' as AssetType })),
    ...commodities.map(c => ({ ...c, type: 'COMMODITY' as AssetType }))
  ];

  const [formData, setFormData] = useState<AssetFormData>({
    symbol: filteredCryptoSymbols[0] || { value: '', label: '', name: '' },
    name: filteredCryptoSymbols[0]?.name || '',
    assetType: 'CRYPTO',
    purchaseQuantity: 0,
    purchasePrice: 0,
    purchaseCurrency: displayCurrency,
    purchaseDate: new Date(),
    transactionType: 'BUY',
  });

  // Update form data when cryptoSymbols changes and formData.symbol is not in the list
  useEffect(() => {
    const currentSymbol = formData.symbol.value;
    const isValidSymbol = selectedAssetType === 'CRYPTO' 
      ? filteredCryptoSymbols.some(s => s.value === currentSymbol)
      : commodities.some(c => c.value === currentSymbol);

    if (!isValidSymbol) {
      const defaultSymbol = selectedAssetType === 'CRYPTO' 
        ? filteredCryptoSymbols[0] 
        : commodities[0];

      if (defaultSymbol) {
        setFormData(prev => ({
          ...prev,
          symbol: defaultSymbol,
          name: defaultSymbol.name,
          assetType: selectedAssetType
        }));
      }
    }
  }, [cryptoSymbols, commodities, selectedAssetType, formData.symbol.value]);

  // Update form data when displayCurrency changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      purchaseCurrency: displayCurrency
    }));
  }, [displayCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.name) {
      onError(new Error('Please select an asset'));
      return;
    }

    setIsLoading(true);
    try {
      // Fetch historical prices in the background
      if (formData.assetType === 'COMMODITY' && formData.symbol.value === 'GOLD') {
        fetchHistoricalGoldPrices(formData.purchaseDate).catch(error => {
          console.error('Failed to fetch historical gold prices:', error);
        });
      } else if (formData.assetType === 'CRYPTO') {
        fetchHistoricalCryptoPrices(formData.symbol.value, formData.purchaseDate).catch(error => {
          console.error(`Failed to fetch historical ${formData.symbol.value} prices:`, error);
        });
      }
      
      await onSubmit(formData);
      // Reset form but keep the current symbol and type
      setFormData(prev => ({
        ...prev,
        purchaseQuantity: 0,
        purchasePrice: 0,
        purchaseCurrency: displayCurrency,
        purchaseDate: new Date(),
        transactionType: 'BUY',
      }));
    } catch (error: any) {
      console.error('Form submission error:', error);
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssetSelect = (value: string) => {
    const selectedAsset = allAssetOptions.find(option => option.value === value);
    if (selectedAsset) {
      console.log('Selected asset:', selectedAsset);
      setFormData(prev => ({
        ...prev,
        symbol: selectedAsset,
        name: selectedAsset.name,
        assetType: selectedAsset.type,
        purchasePrice: prev.transactionType === 'EARN' ? 0 : prev.purchasePrice,
      }));
      setSelectedAssetType(selectedAsset.type);
    }
  };

  const getQuantityPlaceholder = () => {
    if (formData.assetType === 'COMMODITY') {
      const commodity = commodities.find(c => c.value === formData.symbol.value);
      return `Enter amount in ${commodity?.unit || 'units'} (e.g., 4.25)`;
    }
    return 'Enter quantity';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="assetType">Asset Type</Label>
        <Select
          value={selectedAssetType}
          onValueChange={(value: AssetType) => {
            setSelectedAssetType(value);
            const defaultSymbol = value === 'CRYPTO' ? cryptoSymbols[0] : commodities[0];
            if (defaultSymbol) {
              setFormData(prev => ({
                ...prev,
                symbol: defaultSymbol,
                name: defaultSymbol.name,
                assetType: value
              }));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select asset type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CRYPTO">Cryptocurrency</SelectItem>
            <SelectItem value="COMMODITY">Commodity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="transactionType">Transaction Type</Label>
        <Select
          value={formData.transactionType}
          onValueChange={(value: TransactionType) => setFormData(prev => ({
            ...prev,
            transactionType: value,
            purchasePrice: value === 'EARN' ? 0 : prev.purchasePrice
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select transaction type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUY">Buy</SelectItem>
            <SelectItem value="SELL">Sell</SelectItem>
            <SelectItem value="EARN">Earn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset">Asset</Label>
        <Combobox
          options={selectedAssetType === 'CRYPTO' ? filteredCryptoSymbols : commodities}
          value={formData.symbol.value}
          onValueChange={handleAssetSelect}
          placeholder="Select an asset"
        />
        {selectedAssetType === 'CRYPTO' && filteredCryptoSymbols.length === 0 && (
          <div className="text-sm text-yellow-600">
            No cryptocurrencies available. Please add some in settings.
          </div>
        )}
        {selectedAssetType === 'COMMODITY' && commodities.length === 0 && (
          <div className="text-sm text-yellow-600">
            No commodities available. Please add some in settings.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          step="0.00000001"
          min="0"
          value={formData.purchaseQuantity || ''}
          onChange={e => setFormData(prev => ({
            ...prev,
            purchaseQuantity: parseFloat(e.target.value) || 0
          }))}
          placeholder={getQuantityPlaceholder()}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Purchase Price</Label>
        <div className="flex gap-2">
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.purchasePrice || ''}
            onChange={e => setFormData(prev => ({
              ...prev,
              purchasePrice: parseFloat(e.target.value) || 0
            }))}
            className="flex-1"
            disabled={formData.transactionType === 'EARN'}
          />
          <Select
            value={formData.purchaseCurrency}
            onValueChange={(value: Currency) => setFormData(prev => ({
              ...prev,
              purchaseCurrency: value
            }))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencySymbols.map(currency => (
                <SelectItem key={currency.value} value={currency.value}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currency.icon}</span>
                    <span>{currency.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Purchase Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.purchaseDate.toISOString().split('T')[0]}
          onChange={e => setFormData(prev => ({
            ...prev,
            purchaseDate: new Date(e.target.value)
          }))}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding Asset...
          </>
        ) : (
          'Add Asset'
        )}
      </Button>
    </form>
  );
}