import React, { useState, useEffect } from 'react';
import { LineChart, Wallet, Download, Upload, Settings } from 'lucide-react';
import { Asset, AssetFormData, EditAssetData } from './types/asset';
import { AssetForm } from './components/AssetForm';
import { AssetList } from './components/AssetList';
import { AssetChart } from './components/AssetChart';
import { AssetPieChart } from './components/AssetPieChart';
import { PortfolioMetrics } from './components/PortfolioMetrics';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import { CurrencySelector } from './components/CurrencySelector';
import { getAllAssets, deleteAsset, updateAssetPrice, updateAsset, saveAsset } from './utils/db';
import { fetchPrices } from './utils/prices';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { SettingsDialog } from './components/SettingsDialog';

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  // Auto-update prices every 30 seconds
  useEffect(() => {
    const updatePrices = async () => {
      const currentAssets = assets;  // Capture current assets value
      if (currentAssets.length === 0) return;

      try {
        // Get unique symbols and filter out assets with recent updates
        const symbols = [...new Set(currentAssets.map(asset => asset.symbol))];
        const prices = await fetchPrices(symbols);
        
        // Batch update prices in database
        const updates = currentAssets.map(asset => {
          const newPrice = prices[asset.symbol];
          if (newPrice !== undefined && newPrice !== asset.currentPrice) {
            return updateAssetPrice(asset.id, newPrice);
          }
          return Promise.resolve();
        });
        
        await Promise.all(updates);

        // Batch update state
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

    // Set up interval with the same duration as crypto cache
    const interval = setInterval(updatePrices, 30000); // 30 seconds

    // Cleanup
    return () => clearInterval(interval);
  }, [assets.length]); // Only re-create effect when number of assets changes

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
    try {
      await saveAsset(data);
      await loadAssets();
    } catch (error) {
      console.error('Failed to add asset:', error);
      throw error;
    }
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

  const handleExport = () => {
    const exportData = {
      assets: assets,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.error('No file selected for import');
      return;
    }

    try {
      console.log('Starting import process...');
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.assets || !Array.isArray(importData.assets)) {
        const error = 'Invalid import file format: missing assets array';
        console.error(error);
        alert(error);
        return;
      }

      console.log(`Importing ${importData.assets.length} assets...`);

      // Import each asset
      for (const asset of importData.assets) {
        try {
          const assetData = {
            symbol: asset.symbol,
            name: asset.name,
            purchasePrice: asset.purchasePrice,
            purchaseQuantity: asset.purchaseQuantity,
            purchaseDate: new Date(asset.purchaseDate),
            purchaseCurrency: asset.purchaseCurrency,
            transactionType: asset.transactionType
          };
          
          console.log('Importing asset:', assetData);
          await handleAddAsset(assetData);
        } catch (assetError: any) {
          console.error('Failed to import asset:', asset, assetError);
          alert(`Failed to import asset ${asset.symbol}: ${assetError.message}`);
        }
      }

      console.log('Import completed, reloading assets...');
      await loadAssets();
      alert('Assets imported successfully!');
    } catch (error) {
      const errorMessage = 'Failed to import assets. Please check the file format.';
      console.error(errorMessage, error);
      alert(errorMessage);
    }
    
    // Reset the input
    event.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading assets...</div>
      </div>
    );
  }

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <LineChart className="h-8 w-8 text-primary" />
                <CardTitle>Asset Tracker</CardTitle>
                <CurrencySelector />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex items-center gap-2 min-w-[100px]"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 min-w-[100px]"
                    >
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-2 min-w-[100px]"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="mb-8">
            <PortfolioMetrics assets={assets} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Portfolio Distribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <AssetPieChart assets={assets} />
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <AssetChart assets={assets} />
          </div>

          {assets.length > 0 ? (
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
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No assets added yet. Add your first asset above!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </CurrencyProvider>
  );
}

export default App;