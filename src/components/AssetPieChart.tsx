import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Asset } from '../types/asset';
import { Wallet } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

interface AssetPieChartProps {
  assets: Asset[];
}

interface MergedAsset {
  symbol: string;
  name: string;
  fullName: string;
  totalQuantity: number;
  totalValue: number;
  percentage: number;
  buyQuantity: number;
  sellQuantity: number;
  earnQuantity: number;
}

export const AssetPieChart: React.FC<AssetPieChartProps> = ({ assets }) => {
  const { displayCurrency, convertAmount } = useCurrency();

  // Merge assets with the same symbol
  const mergedAssets = assets.reduce<Record<string, MergedAsset>>((acc, asset) => {
    const valueInUSD = asset.currentPrice * Math.max(0, asset.purchaseQuantity * (asset.transactionType === 'SELL' ? -1 : 1));
    const currentValue = convertAmount(valueInUSD, 'USD', displayCurrency);
    const symbolValue = typeof asset.symbol === 'string' ? asset.symbol : asset.symbol.value;
    
    if (!acc[symbolValue]) {
      acc[symbolValue] = {
        symbol: symbolValue,
        name: symbolValue,
        fullName: asset.name,
        totalQuantity: asset.transactionType === 'SELL' ? -asset.purchaseQuantity : asset.purchaseQuantity,
        totalValue: currentValue,
        percentage: 0,
        buyQuantity: asset.transactionType === 'BUY' ? asset.purchaseQuantity : 0,
        sellQuantity: asset.transactionType === 'SELL' ? asset.purchaseQuantity : 0,
        earnQuantity: asset.transactionType === 'EARN' ? asset.purchaseQuantity : 0
      };
    } else {
      acc[symbolValue].totalQuantity += asset.transactionType === 'SELL' ? -asset.purchaseQuantity : asset.purchaseQuantity;
      acc[symbolValue].totalValue += currentValue;
      if (asset.transactionType === 'BUY') acc[symbolValue].buyQuantity += asset.purchaseQuantity;
      if (asset.transactionType === 'SELL') acc[symbolValue].sellQuantity += asset.purchaseQuantity;
      if (asset.transactionType === 'EARN') acc[symbolValue].earnQuantity += asset.purchaseQuantity;
    }
    
    return acc;
  }, {});

  // Calculate total portfolio value
  const totalValue = Object.values(mergedAssets).reduce(
    (sum, asset) => sum + asset.totalValue,
    0
  );

  // Calculate percentages and prepare data for the chart
  const chartData = Object.values(mergedAssets).map(asset => ({
    ...asset,
    percentage: (asset.totalValue / totalValue) * 100
  }));

  // Sort by value (largest first)
  chartData.sort((a, b) => b.totalValue - a.totalValue);

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

  const formatQuantity = (value: number, symbol: string) => {
    if (symbol === 'GOLD') {
      return `${value.toFixed(2)} grams`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Net Quantity:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatQuantity(data.totalQuantity, data.symbol)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Bought:</span>
              <span className="text-sm font-medium text-green-600">
                {formatQuantity(data.buyQuantity, data.symbol)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Sold:</span>
              <span className="text-sm font-medium text-red-600">
                {formatQuantity(data.sellQuantity, data.symbol)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Earned:</span>
              <span className="text-sm font-medium text-blue-600">
                {formatQuantity(data.earnQuantity, data.symbol)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Value:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(data.totalValue)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">Share:</span>
              <span className="text-sm font-medium text-gray-900">
                {data.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegendText = (value: string, entry: any) => {
    const data = entry.payload;
    return (
      <span className="text-sm text-gray-600">
        {data.fullName} ({formatQuantity(data.totalQuantity, data.symbol)}) - {data.percentage.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={80}
            outerRadius={140}
            paddingAngle={2}
            dataKey="totalValue"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={renderLegendText}
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}; 