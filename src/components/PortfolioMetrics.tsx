import React, { useMemo } from 'react';
import { Asset } from '../types/asset';
import { useCurrency } from '../contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Coins } from 'lucide-react';
import { Currency } from '../types/asset';

interface PortfolioMetricsProps {
  assets: Asset[];
}

export function PortfolioMetrics({ assets }: PortfolioMetricsProps) {
  const { displayCurrency, convertAmount } = useCurrency();

  const metrics = useMemo(() => {
    // First calculate net positions for each asset
    const positions = new Map<string, {
      symbol: string;
      netQuantity: number;
      totalBuyValue: number;
      totalBuyCurrency: Currency;
      currentPrice: number;
      currentPriceCurrency: Currency;
    }>();

    assets.forEach(asset => {
      const key = asset.symbol;
      const existing = positions.get(key) || {
        symbol: asset.symbol,
        netQuantity: 0,
        totalBuyValue: 0,
        totalBuyCurrency: asset.purchaseCurrency,
        currentPrice: asset.currentPrice,
        currentPriceCurrency: asset.currentPriceCurrency,
      };

      // Update quantity based on transaction type
      const quantityChange = asset.transactionType === 'SELL' ? -asset.purchaseQuantity : asset.purchaseQuantity;
      existing.netQuantity += quantityChange;

      // Only add to total buy value for buy transactions
      if (asset.transactionType === 'BUY') {
        const convertedBuyValue = convertAmount(
          asset.purchasePrice,
          asset.purchaseCurrency,
          existing.totalBuyCurrency
        );
        existing.totalBuyValue += convertedBuyValue;
      }

      positions.set(key, existing);
    });

    // Calculate total buy value
    const totalBuyValue = Array.from(positions.values()).reduce((total: number, position) => {
      const buyValue = convertAmount(
        position.totalBuyValue,
        position.totalBuyCurrency,
        displayCurrency
      );
      return total + buyValue;
    }, 0);

    // Calculate total current value
    const totalCurrentValue = assets.reduce((total, asset) => {
      const valueInUSD = asset.currentPrice * Math.max(0, asset.purchaseQuantity * (asset.transactionType === 'SELL' ? -1 : 1));
      return total + convertAmount(valueInUSD, asset.currentPriceCurrency, displayCurrency);
    }, 0);

    // Calculate total earnings from EARN transactions
    const totalEarnings = assets
      .filter(asset => asset.transactionType === 'EARN')
      .reduce((total, asset) => {
        const earnValue = asset.purchaseQuantity * asset.currentPrice;
        return total + convertAmount(earnValue, asset.currentPriceCurrency, displayCurrency);
      }, 0);

    return {
      totalBuyValue,
      totalCurrentValue,
      totalProfit: totalCurrentValue - totalBuyValue,
      totalEarnings
    };
  }, [assets, convertAmount, displayCurrency]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Buy Value</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalBuyValue)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.totalEarnings)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalCurrentValue)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Profit/Loss</CardTitle>
          <div className="flex gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <TrendingUp className={`h-4 w-4 ${metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(metrics.totalProfit)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Trading: {formatCurrency(metrics.totalProfit - metrics.totalEarnings)} | Earnings: {formatCurrency(metrics.totalEarnings)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 