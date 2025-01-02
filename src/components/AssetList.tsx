import React, { useState } from 'react';
import { Asset, EditAssetData, Currency } from '../types/asset';
import { EditAssetDialog } from './EditAssetDialog';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDate } from '../utils/date';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Edit2, Trash2, ArrowUpDown } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  onEdit: (id: string, data: EditAssetData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type SortDirection = 'asc' | 'desc';

export function AssetList({ assets, onEdit, onDelete }: AssetListProps) {
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { displayCurrency, convertAmount } = useCurrency();

  const formatValue = (amount: number, currency: Currency) => {
    const convertedAmount = convertAmount(amount, currency, displayCurrency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(convertedAmount);
  };

  const calculateGainLoss = (asset: Asset) => {
    // Convert total current value to display currency
    const currentValue = convertAmount(
      asset.currentPrice * asset.purchaseQuantity,
      asset.currentPriceCurrency,
      displayCurrency
    );
    
    // Convert total purchase value to display currency
    // Note: purchasePrice is already the total price for the quantity
    const purchaseValue = convertAmount(
      asset.purchasePrice,
      asset.purchaseCurrency,
      displayCurrency
    );

    const gainLoss = currentValue - purchaseValue;
    const gainLossPercentage = (gainLoss / purchaseValue) * 100;

    return {
      value: formatValue(gainLoss, displayCurrency),
      percentage: gainLossPercentage.toFixed(2),
      isPositive: gainLoss >= 0
    };
  };

  const handleDateSort = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const sortedAssets = [...assets].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return direction * (new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
  });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Purchase Price (Total)</TableHead>
            <TableHead>Current Price (Per Unit)</TableHead>
            <TableHead>Total Value</TableHead>
            <TableHead>Gain/Loss</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100"
              onClick={handleDateSort}
            >
              <div className="flex items-center gap-2">
                Purchase Date
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssets.map(asset => {
            const gainLoss = calculateGainLoss(asset);
            return (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>
                  {asset.symbol === 'GOLD'
                    ? `${asset.purchaseQuantity.toFixed(2)} grams`
                    : asset.purchaseQuantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </TableCell>
                <TableCell>{formatValue(asset.purchasePrice, asset.purchaseCurrency)}</TableCell>
                <TableCell>{formatValue(asset.currentPrice, asset.currentPriceCurrency)}</TableCell>
                <TableCell>
                  {formatValue(
                    asset.currentPrice * asset.purchaseQuantity,
                    asset.currentPriceCurrency
                  )}
                </TableCell>
                <TableCell>
                  <span className={gainLoss.isPositive ? 'text-green-600' : 'text-red-600'}>
                    {gainLoss.value} ({gainLoss.percentage}%)
                  </span>
                </TableCell>
                <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingAsset(asset)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onDelete(asset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editingAsset && (
        <EditAssetDialog
          asset={editingAsset}
          onSave={async (data) => {
            await onEdit(editingAsset.id, data);
            setEditingAsset(null);
          }}
          onCancel={() => setEditingAsset(null)}
        />
      )}
    </>
  );
}