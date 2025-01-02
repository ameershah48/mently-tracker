import React, { useState, useEffect } from 'react';
import { LineChart, Wallet } from 'lucide-react';
import { Asset, AssetFormData, EditAssetData } from './types/asset';
import { AssetForm } from './components/AssetForm';
import { AssetList } from './components/AssetList';
import { AssetChart } from './components/AssetChart';
import { AssetPieChart } from './components/AssetPieChart';
import { getAllAssets, deleteAsset, updateAssetPrice, updateAsset } from './utils/db';
import { fetchPrices } from './utils/prices';
import { addPriceEntry } from './utils/priceHistory';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  // Auto-update prices every 30 seconds
  useEffect(() => {
    const updatePrices = async () => {
      if (assets.length === 0) return;

      try {
        const symbols = [...new Set(assets.map(asset => asset.symbol))];
        const prices = await fetchPrices(symbols);
        
        // Update prices in database and state
        for (const asset of assets) {
          const newPrice = prices[asset.symbol];
          if (newPrice !== undefined) {
            await updateAssetPrice(asset.id, newPrice);
            // Store the price in history
            addPriceEntry(asset.symbol, newPrice);
          }
        }

        setAssets(prev => prev.map(asset => ({
          ...asset,
          currentPrice: prices[asset.symbol] ?? asset.currentPrice
        })));

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to update prices:', error);
      }
    };

    // Initial update
    updatePrices();

    // Set up interval
    const interval = setInterval(updatePrices, 30000);

    // Cleanup
    return () => clearInterval(interval);
  }, [assets]);

  const loadAssets = async () => {
    try {
      const loadedAssets = await getAllAssets();
      setAssets(loadedAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = async (data: AssetFormData) => {
    await loadAssets();
  };

  const handleEditAsset = async (id: string, data: EditAssetData) => {
    try {
      await updateAsset(id, data);
      setAssets(prev => prev.map(asset =>
        asset.id === id
          ? { ...asset, ...data }
          : asset
      ));
    } catch (error) {
      console.error('Failed to edit asset:', error);
      throw error;
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteAsset(id);
      setAssets((prev) => prev.filter((asset) => asset.id !== id));
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const calculateTotalProfit = () => {
    return assets.reduce((total, asset) => {
      // Current total value
      const currentValue = asset.currentPrice * asset.purchaseQuantity;
      // Purchase price is already the total amount paid
      const purchaseValue = asset.purchasePrice;
      const profit = currentValue - purchaseValue;
      return total + profit;
    }, 0);
  };

  const totalProfit = calculateTotalProfit();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading assets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center">
              <LineChart className="h-8 w-8 text-primary mr-2" />
              <CardTitle>Asset Tracker</CardTitle>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center bg-muted px-4 py-2 rounded-lg">
                <Wallet className="h-5 w-5 text-muted-foreground mr-2" />
                <span className="text-sm font-medium text-muted-foreground">Total Profit:</span>
                <span className={`ml-2 font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalProfit.toFixed(2)}
                </span>
              </div>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Add Asset</CardTitle>
              </CardHeader>
              <CardContent>
                <AssetForm
                  onSubmit={handleAddAsset}
                  onError={(error) => console.error('Form error:', error)}
                />
              </CardContent>
            </Card>
            {assets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <AssetPieChart assets={assets} />
                </CardContent>
              </Card>
            )}
          </div>

          {assets.length > 0 ? (
            <>
              <AssetChart assets={assets} />
              <Card>
                <CardHeader>
                  <CardTitle>Asset List</CardTitle>
                </CardHeader>
                <CardContent>
                  <AssetList
                    assets={assets}
                    onDelete={handleDeleteAsset}
                    onEdit={handleEditAsset}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No assets added yet. Add your first asset above!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;