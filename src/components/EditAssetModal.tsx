import React, { useState } from 'react';
import { Asset, EditAssetData } from '../types/asset';
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

interface EditAssetModalProps {
  asset: Asset;
  onSave: (id: string, data: EditAssetData) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

export function EditAssetModal({ asset, onSave, onClose, isOpen }: EditAssetModalProps) {
  const [formData, setFormData] = useState<EditAssetData>({
    purchaseQuantity: asset.purchaseQuantity,
    purchasePrice: asset.purchasePrice,
    purchaseDate: asset.purchaseDate,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(asset.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save asset:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              placeholder={asset.symbol === 'GOLD' ? 'Enter amount in grams (e.g., 4.25)' : 'Enter quantity'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Total Purchase Price (USD)</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
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