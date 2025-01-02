import React, { useState } from 'react';
import { saveAsset } from '../utils/db';
import { CRYPTO_OPTIONS } from '../types/crypto';
import { AssetFormData } from '../types/asset';
import { Label } from './ui/label';
import { Input } from './ui/Input';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

interface AssetFormProps {
  onSubmit: (data: AssetFormData) => Promise<void>;
  onError: (error: Error) => void;
}

export function AssetForm({ onSubmit, onError }: AssetFormProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    symbol: '',
    name: '',
    purchaseQuantity: 0,
    purchasePrice: 0,
    purchaseDate: new Date(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveAsset(formData);
      await onSubmit(formData);
      // Reset form
      setFormData({
        symbol: '',
        name: '',
        purchaseQuantity: 0,
        purchasePrice: 0,
        purchaseDate: new Date(),
      });
    } catch (error) {
      onError(error as Error);
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
          step={formData.symbol === 'GOLD' ? '0.01' : '0.00000001'}
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
        <Label htmlFor="price">Total Purchase Price (USD)</Label>
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
          placeholder="Enter total purchase price in USD"
        />
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

      <Button type="submit" className="w-full">
        Add Asset
      </Button>
    </form>
  );
}