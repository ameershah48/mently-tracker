import React, { useState } from 'react';
import { Asset, EditAssetData, Currency } from '../types/asset';
import { Label } from './ui/label';
import { Input } from './ui/Input';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

interface EditAssetDialogProps {
  asset: Asset;
  onSave: (data: EditAssetData) => Promise<void>;
  onCancel: () => void;
}

export function EditAssetDialog({ asset, onSave, onCancel }: EditAssetDialogProps) {
  const [formData, setFormData] = useState<EditAssetData>({
    purchaseQuantity: asset.purchaseQuantity,
    purchasePrice: asset.purchasePrice,
    purchaseCurrency: asset.purchaseCurrency,
    purchaseDate: asset.purchaseDate,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
      onCancel();
    } catch (error) {
      console.error('Failed to save asset:', error);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {asset.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step={asset.symbol === 'GOLD' ? '0.01' : '0.00000001'}
              min="0"
              value={formData.purchaseQuantity}
              onChange={e => setFormData(prev => ({
                ...prev,
                purchaseQuantity: parseFloat(e.target.value) || 0
              }))}
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
                value={formData.purchasePrice}
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
              value={formData.purchaseDate.toISOString().split('T')[0]}
              onChange={e => setFormData(prev => ({
                ...prev,
                purchaseDate: new Date(e.target.value)
              }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 