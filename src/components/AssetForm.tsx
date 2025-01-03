import React, { useState, useEffect } from 'react';
import { saveAsset } from '../utils/db';
import { CryptoSymbolInfo, loadCryptoSymbols } from '../types/crypto';
import { AssetFormData, Currency, TransactionType } from '../types/asset';
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

interface AssetFormProps {
  onSubmit: (data: AssetFormData) => Promise<void>;
  onError: (error: Error) => void;
}

export function AssetForm({ onSubmit, onError }: AssetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cryptoOptions, setCryptoOptions] = useState<CryptoSymbolInfo[]>([]);
  const [formData, setFormData] = useState<AssetFormData>({
    symbol: '',
    name: '',
    purchaseQuantity: 0,
    purchasePrice: 0,
    purchaseCurrency: 'USD',
    purchaseDate: new Date(),
    transactionType: 'BUY',
  });

  // Load crypto symbols and set initial form data
  useEffect(() => {
    const loadSymbols = () => {
      try {
        const symbols = loadCryptoSymbols();
        console.log('Loaded symbols in AssetForm:', symbols);
        setCryptoOptions(symbols);
        
        // Set initial symbol and name if available and not already set
        if (symbols.length > 0 && !formData.symbol) {
          setFormData(prev => ({
            ...prev,
            symbol: symbols[0].value,
            name: symbols[0].name,
          }));
        }
      } catch (error) {
        console.error('Failed to load crypto symbols:', error);
        onError(new Error('Failed to load available cryptocurrencies'));
      }
    };

    loadSymbols();

    // Set up an interval to check for symbol changes
    const interval = setInterval(loadSymbols, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.name) {
      onError(new Error('Please select a cryptocurrency'));
      return;
    }

    setIsLoading(true);
    try {
      await saveAsset(formData);
      
      // Fetch historical prices in the background
      if (formData.symbol === 'GOLD') {
        fetchHistoricalGoldPrices(formData.purchaseDate).catch(error => {
          console.error('Failed to fetch historical gold prices:', error);
        });
      } else {
        fetchHistoricalCryptoPrices(formData.symbol, formData.purchaseDate).catch(error => {
          console.error(`Failed to fetch historical ${formData.symbol} prices:`, error);
        });
      }
      
      await onSubmit(formData);
      // Reset form but keep the current symbol
      setFormData(prev => ({
        ...prev,
        purchaseQuantity: 0,
        purchasePrice: 0,
        purchaseCurrency: 'USD',
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
    const selectedAsset = cryptoOptions.find(option => option.value === value);
    if (selectedAsset) {
      console.log('Selected asset:', selectedAsset);
      setFormData(prev => ({
        ...prev,
        symbol: selectedAsset.value,
        name: selectedAsset.name,
        purchasePrice: prev.transactionType === 'EARN' ? 0 : prev.purchasePrice,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          options={cryptoOptions}
          value={formData.symbol}
          onValueChange={handleAssetSelect}
          placeholder="Select an asset"
        />
        {cryptoOptions.length === 0 && (
          <div className="text-sm text-yellow-600">
            No cryptocurrencies available. Please add some in settings.
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
          placeholder={formData.symbol === 'GOLD' ? 'Enter amount in grams (e.g., 4.25)' : 'Enter quantity'}
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
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="MYR">MYR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Purchase Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.purchaseDate instanceof Date && !isNaN(formData.purchaseDate.getTime()) 
            ? formData.purchaseDate.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]}
          onChange={e => setFormData(prev => ({
            ...prev,
            purchaseDate: new Date(e.target.value)
          }))}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || cryptoOptions.length === 0}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {formData.transactionType === 'BUY' ? 'Adding Asset...' : 
             formData.transactionType === 'SELL' ? 'Selling Asset...' : 
             'Recording Earnings...'}
          </>
        ) : (
          formData.transactionType === 'BUY' ? 'Add Asset' : 
          formData.transactionType === 'SELL' ? 'Sell Asset' : 
          'Record Earnings'
        )}
      </Button>
    </form>
  );
}