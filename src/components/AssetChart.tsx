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
import { getAssetPriceHistory, PriceHistoryEntry } from '../utils/priceHistory';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";

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
      currency: 'USD',
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

        assets.forEach(asset => {
          const history = getAssetPriceHistory(asset.symbol);
          let price = asset.currentPrice; // Default to current price

          // Try to find historical price
          const historicalEntry = history.find(entry => 
            new Date(entry.date).toLocaleDateString() === date.toLocaleDateString()
          );
          if (historicalEntry) {
            price = historicalEntry.price;
          }

          // Only include in total if the asset was purchased by this date
          if (new Date(asset.purchaseDate) <= date) {
            dataPoint.totalValue += price * asset.purchaseQuantity;
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

        assets.forEach(asset => {
          const history = getAssetPriceHistory(asset.symbol);
          let price = asset.currentPrice; // Default to current price

          // Try to find historical price
          const historicalEntry = history.find(entry => 
            new Date(entry.date).toLocaleDateString() === date.toLocaleDateString()
          );
          if (historicalEntry) {
            price = historicalEntry.price;
          }

          // Only include value if the asset was purchased by this date
          if (new Date(asset.purchaseDate) <= date) {
            dataPoint[asset.symbol] = price * asset.purchaseQuantity;
          }
        });

        return dataPoint;
      });
    }
  };

  const chartData = generateChartData();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle>Asset Growth</CardTitle>
        <div className="flex gap-4">
          <Tabs defaultValue={viewMode} onValueChange={(value: string) => setViewMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="MERGED">Merged</TabsTrigger>
              <TabsTrigger value="SEPARATE">Separate</TabsTrigger>
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
                assets.map((asset, index) => (
                  <Line
                    key={asset.symbol}
                    type="monotone"
                    dataKey={asset.symbol}
                    name={`${asset.name} (${asset.symbol})`}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 