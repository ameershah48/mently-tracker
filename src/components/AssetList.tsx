import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Asset, EditAssetData } from '../types/asset';
import { EditAssetModal } from './EditAssetModal';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface AssetListProps {
  assets: Asset[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, data: EditAssetData) => Promise<void>;
}

export function AssetList({ assets, onDelete, onEdit }: AssetListProps) {
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatQuantity = (asset: Asset) => {
    if (asset.symbol === 'GOLD') {
      return `${asset.purchaseQuantity.toFixed(2)} grams`;
    }
    return asset.purchaseQuantity.toLocaleString(undefined, { maximumFractionDigits: 8 });
  };

  const calculateProfit = (asset: Asset) => {
    const currentValue = asset.currentPrice * asset.purchaseQuantity;
    const profit = currentValue - asset.purchasePrice;
    const percentage = (profit / asset.purchasePrice) * 100;
    return { profit, percentage };
  };

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Total Purchase Price</TableHead>
            <TableHead>Current Price</TableHead>
            <TableHead>Current Value</TableHead>
            <TableHead>Profit/Loss</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map(asset => {
            const { profit, percentage } = calculateProfit(asset);
            const currentValue = asset.currentPrice * asset.purchaseQuantity;

            return (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">
                  {asset.name} ({asset.symbol})
                </TableCell>
                <TableCell>{formatQuantity(asset)}</TableCell>
                <TableCell>{formatCurrency(asset.purchasePrice)}</TableCell>
                <TableCell>{formatCurrency(asset.currentPrice)}</TableCell>
                <TableCell>{formatCurrency(currentValue)}</TableCell>
                <TableCell>
                  <div className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(profit)}
                    <span className="text-sm ml-1">
                      ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingAsset(asset)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onDelete(asset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editingAsset && (
        <EditAssetModal
          asset={editingAsset}
          isOpen={true}
          onClose={() => setEditingAsset(null)}
          onSave={onEdit}
        />
      )}
    </div>
  );
}