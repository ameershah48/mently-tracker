import React, { useState } from 'react';
import { saveAsset } from '../utils/db';
import { CRYPTO_OPTIONS } from '../types/crypto';
import { AssetFormData, Currency } from '../types/asset';
import { Label } from './ui/label';
import { Input } from './ui/Input';
import { Button } from './ui/button';
import { fetchHistoricalGoldPrices } from '../utils/prices';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import { Loader2 } from "lucide-react";

interface AssetFormProps {
  onSubmit: (data: AssetFormData) => Promise<void>;
  onError: (error: Error) => void;
}

export function AssetForm({ onSubmit, onError }: AssetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<AssetFormData>({
    symbol: 'BTC',
    name: 'Bitcoin',
    purchaseQuantity: 0,
    purchasePrice: 0,
    purchaseCurrency: 'USD',
    purchaseDate: new Date(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await saveAsset(formData);
      
      // If this is a gold asset, fetch historical prices in the background
      if (formData.symbol === 'GOLD') {
        fetchHistoricalGoldPrices(formData.purchaseDate).catch(error => {
          console.error('Failed to fetch historical gold prices:', error);
        });
      }
      
      await onSubmit(formData);
      // Reset form
      setFormData({
        symbol: 'BTC',
        name: 'Bitcoin',
        purchaseQuantity: 0,
        purchasePrice: 0,
        purchaseCurrency: 'USD',
        purchaseDate: new Date(),
      });
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssetSelect = (value: string) => {
    const selectedAsset = CRYPTO_OPTIONS.find(option => option.value === value);
    if (selectedAsset) {
      setFormData(prev => ({
        ...prev,
        symbol: selectedAsset.value,
        name: selectedAsset.name,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="asset">Asset</Label>
        <Select
          value={formData.symbol}
          onValueChange={handleAssetSelect}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an asset" />
          </SelectTrigger>
          <SelectContent>
            {CRYPTO_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding Asset...
          </>
        ) : (
          'Add Asset'
        )}
      </Button>
    </form>
  );
}