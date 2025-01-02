import React, { useState, useMemo } from 'react';
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
import { Edit2, Trash2, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  onEdit: (id: string, data: EditAssetData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type SortDirection = 'asc' | 'desc';

export function AssetList({ assets, onEdit, onDelete }: AssetListProps) {
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const { displayCurrency, convertAmount } = useCurrency();

  // Calculate net positions for each asset
  const netPositions = useMemo(() => {
    const positions = new Map<string, {
      symbol: string;
      name: string;
      netQuantity: number;
      totalBuyValue: number;
      totalBuyCurrency: Currency;
      currentPrice: number;
      currentPriceCurrency: Currency;
      lastPurchaseDate: Date;
    }>();

    assets.forEach(asset => {
      const key = asset.symbol;
      const existing = positions.get(key) || {
        symbol: asset.symbol,
        name: asset.name,
        netQuantity: 0,
        totalBuyValue: 0,
        totalBuyCurrency: asset.purchaseCurrency,
        currentPrice: asset.currentPrice,
        currentPriceCurrency: asset.currentPriceCurrency,
        lastPurchaseDate: asset.purchaseDate,
      };

      // Update quantity based on transaction type
      const quantityChange = asset.transactionType === 'SELL' ? -asset.purchaseQuantity : asset.purchaseQuantity;
      existing.netQuantity += quantityChange;

      // Only add to total buy value for buy transactions (not EARN)
      if (asset.transactionType === 'BUY') {
        const convertedBuyValue = convertAmount(
          asset.purchasePrice,
          asset.purchaseCurrency,
          existing.totalBuyCurrency
        );
        existing.totalBuyValue += convertedBuyValue;
      }

      // Update last purchase date if this is more recent
      if (asset.purchaseDate > existing.lastPurchaseDate) {
        existing.lastPurchaseDate = asset.purchaseDate;
      }

      positions.set(key, existing);
    });

    return Array.from(positions.values());
  }, [assets, convertAmount]);

  const formatValue = (amount: number, currency: Currency) => {
    const convertedAmount = convertAmount(amount, currency, displayCurrency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(convertedAmount);
  };

  const calculateGainLoss = (position: typeof netPositions[0]) => {
    // Get all transactions for this asset
    const assetTransactions = assets.filter(a => a.symbol === position.symbol);
    
    // Calculate realized gains from SELL transactions
    const realizedGains = assetTransactions
      .filter(a => a.transactionType === 'SELL')
      .reduce((sum, sale) => {
        const saleValue = convertAmount(
          sale.purchasePrice,
          sale.purchaseCurrency,
          displayCurrency
        );
        // Calculate cost basis for the sold amount
        const costBasis = (position.totalBuyValue / position.netQuantity) * sale.purchaseQuantity;
        return sum + (saleValue - costBasis);
      }, 0);

    // Calculate unrealized gains on remaining position
    const currentValue = convertAmount(
      position.currentPrice * position.netQuantity,
      position.currentPriceCurrency,
      displayCurrency
    );
    
    const purchaseValue = convertAmount(
      position.totalBuyValue,
      position.totalBuyCurrency,
      displayCurrency
    );

    const unrealizedGain = currentValue - purchaseValue;
    
    // Total gain is realized + unrealized
    const totalGain = realizedGains + unrealizedGain;
    const gainLossPercentage = purchaseValue !== 0 ? (totalGain / purchaseValue) * 100 : 0;

    return {
      value: formatValue(totalGain, displayCurrency),
      percentage: gainLossPercentage.toFixed(2),
      isPositive: totalGain >= 0,
      realizedGains,
      unrealizedGain
    };
  };

  const handleDateSort = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const sortedPositions = [...netPositions].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return direction * (new Date(a.lastPurchaseDate).getTime() - new Date(b.lastPurchaseDate).getTime());
  });

  const toggleAssetExpanded = (symbol: string) => {
    const newExpanded = new Set(expandedAssets);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedAssets(newExpanded);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]"></TableHead>
            <TableHead>Asset Name</TableHead>
            <TableHead>Holdings</TableHead>
            <TableHead>Total Purchase Value</TableHead>
            <TableHead>Current Market Price</TableHead>
            <TableHead>Total Market Value</TableHead>
            <TableHead>Total Return
              <div className="text-xs font-normal text-gray-500">Realized + Unrealized</div>
            </TableHead>
            <TableHead>Last Transaction Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPositions.map(position => {
            const gainLoss = calculateGainLoss(position);
            const isExpanded = expandedAssets.has(position.symbol);
            const transactions = assets.filter(a => a.symbol === position.symbol);
            
            return (
              <React.Fragment key={position.symbol}>
                <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => toggleAssetExpanded(position.symbol)}>
                  <TableCell>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell>{position.name}</TableCell>
                  <TableCell>
                    {position.symbol === 'GOLD'
                      ? `${position.netQuantity.toFixed(2)} grams`
                      : position.netQuantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  </TableCell>
                  <TableCell>{formatValue(position.totalBuyValue, position.totalBuyCurrency)}</TableCell>
                  <TableCell>{formatValue(position.currentPrice, position.currentPriceCurrency)}</TableCell>
                  <TableCell>
                    {formatValue(
                      position.currentPrice * position.netQuantity,
                      position.currentPriceCurrency
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={gainLoss.isPositive ? 'text-green-600' : 'text-red-600'}>
                      {gainLoss.value} ({gainLoss.percentage}%)
                      <div className="text-xs mt-1 space-y-1">
                        <div className="text-gray-500">
                          Realized Return: {formatValue(gainLoss.realizedGains, displayCurrency)}
                        </div>
                        <div className="text-gray-500">
                          Unrealized Return: {formatValue(gainLoss.unrealizedGain, displayCurrency)}
                        </div>
                      </div>
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(position.lastPurchaseDate)}</TableCell>
                </TableRow>
                
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <div className="bg-gray-50 p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map(transaction => (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  <span className={transaction.transactionType === 'BUY' ? 'text-green-600' : 'text-red-600'}>
                                    {transaction.transactionType}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {transaction.symbol === 'GOLD'
                                    ? `${transaction.purchaseQuantity.toFixed(2)} grams`
                                    : transaction.purchaseQuantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                </TableCell>
                                <TableCell>{formatValue(transaction.purchasePrice / transaction.purchaseQuantity, transaction.purchaseCurrency)}</TableCell>
                                <TableCell>{formatValue(transaction.purchasePrice, transaction.purchaseCurrency)}</TableCell>
                                <TableCell>{formatDate(transaction.purchaseDate)}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingAsset(transaction);
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(transaction.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
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