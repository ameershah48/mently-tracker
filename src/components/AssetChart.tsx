import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Asset } from '../types/asset';
import { CryptoSymbol } from '../types/crypto';
import { getAssetPriceHistory, PriceHistoryEntry } from '../utils/priceHistory';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";
import { fetchHistoricalCryptoPrices, fetchHistoricalGoldPrices } from '../utils/prices';

interface AssetChartProps {
  assets: Asset[];
}

type ViewMode = 'MERGED' | 'SEPARATE';
type TimeInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface ChartDataPoint {
  date: string;
  totalValue: number;
  [key: string]: number | string;
}

export function AssetChart({ assets }: AssetChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('SEPARATE');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('MONTHLY');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { displayCurrency, convertAmount } = useCurrency();

  // Group assets by symbol and calculate net quantities considering all transaction types
  const uniqueAssets = assets.reduce((acc, asset) => {
    const symbolValue = typeof asset.symbol === 'string' ? asset.symbol : asset.symbol.value;
    if (!acc[symbolValue]) {
      acc[symbolValue] = {
        ...asset,
        purchaseQuantity: 0,
        name: asset.name,
        transactions: [] as Asset[]
      };
    }
    // Store all transactions for this symbol
    acc[symbolValue].transactions.push(asset);
    return acc;
  }, {} as Record<string, Asset & { transactions: Asset[] }>);

  // Calculate net quantity at any given date
  const getNetQuantityAtDate = (transactions: Asset[], date: Date) => {
    return transactions
      .filter(t => new Date(t.purchaseDate) <= date)
      .reduce((sum, t) => {
        switch (t.transactionType) {
          case 'BUY':
          case 'EARN':
            return sum + t.purchaseQuantity;
          case 'SELL':
            return sum - t.purchaseQuantity;
          default:
            return sum;
        }
      }, 0);
  };

  const COLORS = [
    '#2563eb', // blue
    '#dc2626', // red
    '#16a34a', // green
    '#9333ea', // purple
    '#ea580c', // orange
    '#0891b2', // cyan
    '#4f46e5', // indigo
    '#db2777', // pink
    '#65a30d', // lime
    '#0d9488', // teal
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const generateDateRange = (startDate: Date, endDate: Date, interval: TimeInterval) => {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      switch (interval) {
        case 'DAILY':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'WEEKLY':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'MONTHLY':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'YEARLY':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    switch (timeInterval) {
      case 'DAILY':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'WEEKLY':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'MONTHLY':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      case 'YEARLY':
        return date.toLocaleDateString('en-US', { year: 'numeric' });
    }
  };

  // Find the earliest purchase date
  const earliestDate = new Date(Math.min(...assets.map(asset => new Date(asset.purchaseDate).getTime())));
  const today = new Date();
  const dateRange = generateDateRange(earliestDate, today, timeInterval);

  const generateChartData = () => {
    if (viewMode === 'MERGED') {
      // Generate merged data
      return dateRange.map(date => {
        const dataPoint: ChartDataPoint = {
          date: formatDate(date),
          totalValue: 0
        };

        Object.values(uniqueAssets).forEach(asset => {
          const history = getAssetPriceHistory(asset.symbol);
          let price = asset.currentPrice; // Default to current price

          // Try to find historical price
          const historicalEntry = history.find(entry => 
            new Date(entry.date).toLocaleDateString() === date.toLocaleDateString()
          );
          if (historicalEntry) {
            price = historicalEntry.price;
          }

          // Calculate net quantity at this date
          const netQuantity = getNetQuantityAtDate(asset.transactions, date);
          
          if (netQuantity > 0) {
            // Convert the value to display currency
            const valueInUSD = price * netQuantity;
            dataPoint.totalValue += convertAmount(valueInUSD, 'USD', displayCurrency);
          }
        });

        return dataPoint;
      });
    } else {
      // Generate separate lines for each asset
      return dateRange.map(date => {
        const dataPoint: ChartDataPoint = {
          date: formatDate(date),
          totalValue: 0
        };

        Object.values(uniqueAssets).forEach(asset => {
          const history = getAssetPriceHistory(asset.symbol);
          let price = asset.currentPrice; // Default to current price

          // Try to find historical price
          const historicalEntry = history.find(entry => 
            new Date(entry.date).toLocaleDateString() === date.toLocaleDateString()
          );
          if (historicalEntry) {
            price = historicalEntry.price;
          }

          // Calculate net quantity at this date
          const netQuantity = getNetQuantityAtDate(asset.transactions, date);
          
          if (netQuantity > 0) {
            // Convert the value to display currency
            const valueInUSD = price * netQuantity;
            const symbolValue = typeof asset.symbol === 'string' ? asset.symbol : asset.symbol.value;
            dataPoint[symbolValue] = convertAmount(valueInUSD, 'USD', displayCurrency);
          }
        });

        return dataPoint;
      });
    }
  };

  const chartData = generateChartData();

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      // Get unique assets and their earliest dates
      const uniqueAssetDates = assets.reduce((acc, asset) => {
        if (!acc[asset.symbol]) {
          acc[asset.symbol] = new Date(asset.purchaseDate);
        } else {
          const date = new Date(asset.purchaseDate);
          if (date < acc[asset.symbol]) {
            acc[asset.symbol] = date;
          }
        }
        return acc;
      }, {} as Record<string, Date>);

      // Fetch historical prices for each asset
      const fetchPromises = Object.entries(uniqueAssetDates).map(([symbol, date]) => {
        const symbolValue = typeof symbol === 'string' ? symbol : symbol.value;
        if (symbolValue === 'GOLD') {
          return fetchHistoricalGoldPrices(date);
        } else {
          return fetchHistoricalCryptoPrices(symbolValue as CryptoSymbol, date);
        }
      });

      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Failed to refresh historical prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle>Portfolio Performance</CardTitle>
        <div className="flex gap-4 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Tabs defaultValue={viewMode} onValueChange={(value: string) => setViewMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="MERGED">Combined</TabsTrigger>
              <TabsTrigger value="SEPARATE">Individual</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue={timeInterval} onValueChange={(value: string) => setTimeInterval(value as TimeInterval)}>
            <TabsList>
              <TabsTrigger value="DAILY">Daily</TabsTrigger>
              <TabsTrigger value="WEEKLY">Weekly</TabsTrigger>
              <TabsTrigger value="MONTHLY">Monthly</TabsTrigger>
              <TabsTrigger value="YEARLY">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              {viewMode === 'MERGED' ? (
                <Line
                  type="monotone"
                  dataKey="totalValue"
                  name="Total Portfolio Value"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
              ) : (
                Object.values(uniqueAssets).map((asset, index) => {
                  const symbolValue = typeof asset.symbol === 'string' ? asset.symbol : asset.symbol.value;
                  return (
                    <Line
                      key={symbolValue}
                      type="monotone"
                      dataKey={symbolValue}
                      name={`${asset.name} Value`}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                })
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 