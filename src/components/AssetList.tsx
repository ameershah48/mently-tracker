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
      const quantityChange = asset.transactionType === 'SELL' || asset.transactionType === 'CONVERT' 
        ? -asset.purchaseQuantity 
        : asset.transactionType === 'CONVERT_FROM'
        ? asset.purchaseQuantity
        : asset.purchaseQuantity;
      existing.netQuantity += quantityChange;

      // Only add to total buy value for buy transactions (not EARN, CONVERT, or CONVERT_FROM)
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
    
    // Sort transactions by date for FIFO calculation
    const sortedTransactions = [...assetTransactions].sort(
      (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
    );

    // Keep track of available lots for cost basis calculation
    let availableLots: { quantity: number; price: number; currency: Currency }[] = [];
    let realizedGains = 0;

    // Process each transaction in chronological order
    sortedTransactions.forEach(transaction => {
      if (transaction.transactionType === 'BUY' || transaction.transactionType === 'EARN' || 
          transaction.transactionType === 'CONVERT' || transaction.transactionType === 'CONVERT_FROM') {
        // Add to available lots
        availableLots.push({
          quantity: transaction.purchaseQuantity,
          price: transaction.purchasePrice / transaction.purchaseQuantity,
          currency: transaction.purchaseCurrency
        });
      } else if (transaction.transactionType === 'SELL') {
        let remainingToSell = transaction.purchaseQuantity;
        const salePrice = transaction.purchasePrice / transaction.purchaseQuantity;
        
        // Calculate realized gains using FIFO
        while (remainingToSell > 0 && availableLots.length > 0) {
          const lot = availableLots[0];
          const soldFromLot = Math.min(lot.quantity, remainingToSell);
          
          // Calculate gain/loss for this portion
          const costBasis = convertAmount(
            lot.price * soldFromLot,
            lot.currency,
            displayCurrency
          );
          const saleValue = convertAmount(
            salePrice * soldFromLot,
            transaction.purchaseCurrency,
            displayCurrency
          );
          
          realizedGains += saleValue - costBasis;
          
          // Update or remove the lot
          lot.quantity -= soldFromLot;
          remainingToSell -= soldFromLot;
          
          if (lot.quantity === 0) {
            availableLots.shift();
          }
        }
      }
    });

    // Calculate unrealized gains on remaining position
    const currentValue = convertAmount(
      position.currentPrice * position.netQuantity,
      position.currentPriceCurrency,
      displayCurrency
    );
    
    const remainingCostBasis = availableLots.reduce((sum, lot) => 
      sum + convertAmount(lot.price * lot.quantity, lot.currency, displayCurrency),
      0
    );

    const unrealizedGain = currentValue - remainingCostBasis;
    
    // Total gain is realized + unrealized
    const totalGain = realizedGains + unrealizedGain;
    const totalCost = position.netQuantity > 0 ? remainingCostBasis : position.totalBuyValue;
    const gainLossPercentage = totalCost !== 0 ? (totalGain / totalCost) * 100 : 0;

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
            <TableHead>
              <Button
                variant="ghost"
                onClick={handleDateSort}
                className="flex items-center gap-1"
              >
                Last Transaction Date
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
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
                            {transactions
                              .sort((a, b) => {
                                const direction = sortDirection === 'asc' ? 1 : -1;
                                return direction * (new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
                              })
                              .map(transaction => (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  <span className={
                                    transaction.transactionType === 'BUY' ? 'text-green-600' : 
                                    transaction.transactionType === 'SELL' ? 'text-red-600' : 
                                    'text-blue-600'
                                  }>
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