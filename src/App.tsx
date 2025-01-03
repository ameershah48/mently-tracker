import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Wallet, Download, Upload, Settings } from 'lucide-react';
import { Asset, AssetFormData, EditAssetData } from './types/asset';
import { AssetForm } from './components/AssetForm';
import { AssetList } from './components/AssetList';
import { AssetChart } from './components/AssetChart';
import { AssetPieChart } from './components/AssetPieChart';
import { PortfolioMetrics } from './components/PortfolioMetrics';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { CurrencySymbolsProvider } from './contexts/CurrencySymbolsContext';
import { CryptoSymbolsProvider } from './contexts/CryptoSymbolsContext';
import { CurrencySelector } from './components/CurrencySelector';
import { getAllAssets, deleteAsset, updateAssetPrice, updateAsset, saveAsset } from './utils/db';
import { fetchPrices } from './utils/prices';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { SettingsDialog } from './components/SettingsDialog';
import { initializeCryptoSymbols } from './types/crypto';
import { initializeCurrencySymbols } from './types/asset';

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize crypto symbols and load assets on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        initializeCryptoSymbols();
        initializeCurrencySymbols();
        await loadAssets();
      } catch (error) {
        console.error('Failed to initialize:', error);
        setError('Failed to initialize application. Please refresh the page.');
      }
    };
    initialize();
  }, []);

  // Memoize the price update function
  const updatePrices = useCallback(async () => {
    if (assets.length === 0) return;

    try {
      const symbols = [...new Set(assets.map(asset => asset.symbol.value))];
      const prices = await fetchPrices(symbols);

      let hasUpdates = false;
      const updatedAssets = assets.map(asset => {
        const newPrice = prices[asset.symbol.value];
        if (newPrice !== undefined && newPrice !== asset.currentPrice) {
          hasUpdates = true;
          updateAssetPrice(asset.id, newPrice);
          return { ...asset, currentPrice: newPrice };
        }
        return asset;
      });

      if (hasUpdates) {
        setAssets(updatedAssets);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to update prices:', error);
      setError('Failed to update prices. Please try again later.');
    }
  }, [assets]);

  // Set up price update interval
  useEffect(() => {
    // Clear any existing interval
    if (priceUpdateTimeoutRef.current) {
      clearInterval(priceUpdateTimeoutRef.current);
    }

    // Initial update
    updatePrices();

    // Set up new interval
    priceUpdateTimeoutRef.current = setInterval(updatePrices, 30000);

    // Cleanup
    return () => {
      if (priceUpdateTimeoutRef.current) {
        clearInterval(priceUpdateTimeoutRef.current);
      }
    };
  }, [updatePrices]);

  const loadAssets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedAssets = getAllAssets();
      console.log('Loaded assets:', loadedAssets);
      setAssets(loadedAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
      setError('Failed to load assets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = async (data: AssetFormData) => {
    setError(null);
    try {
      console.log('Adding asset:', data);
      await saveAsset(data);
      const updatedAssets = getAllAssets();
      console.log('Updated assets after add:', updatedAssets);
      setAssets(updatedAssets);
    } catch (error: any) {
      console.error('Failed to add asset:', error);
      setError(error.message || 'Failed to add asset. Please try again.');
      throw error;
    }
  };

  const handleEditAsset = async (id: string, data: EditAssetData) => {
    setError(null);
    try {
      console.log('Editing asset:', id, data);
      await updateAsset(id, data);
      const updatedAssets = getAllAssets();
      console.log('Updated assets after edit:', updatedAssets);
      setAssets(updatedAssets);
    } catch (error: any) {
      console.error('Failed to edit asset:', error);
      setError(error.message || 'Failed to edit asset. Please try again.');
      throw error;
    }
  };

  const handleDeleteAsset = async (id: string) => {
    setError(null);
    try {
      console.log('Deleting asset:', id);
      await deleteAsset(id);
      const updatedAssets = getAllAssets();
      console.log('Updated assets after delete:', updatedAssets);
      setAssets(updatedAssets);
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      setError(error.message || 'Failed to delete asset. Please try again.');
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    // Reload assets after settings change in case crypto symbols were modified
    loadAssets();
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
    <CryptoSymbolsProvider>
      <CurrencySymbolsProvider>
        <CurrencyProvider>
          <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
                  {error}
                </div>
              )}

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
                    <CardTitle>Add New Asset</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AssetForm
                      onSubmit={handleAddAsset}
                      onError={(error) => setError(error.message)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Distribution</CardTitle>
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

            <SettingsDialog
              isOpen={isSettingsOpen}
              onClose={handleSettingsClose}
            />
          </div>
        </CurrencyProvider>
      </CurrencySymbolsProvider>
    </CryptoSymbolsProvider>
  );
}

export default App;