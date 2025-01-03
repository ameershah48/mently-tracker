import React, { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/Input';
import { Button } from './ui/button';
import { Plus, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { CryptoSymbolInfo, loadCryptoSymbols, saveCryptoSymbols } from '../types/crypto';

const SETTINGS_KEY = 'settings';

interface Settings {
  openExchangeKey: string;
  goldApiKey: string;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [openExchangeKey, setOpenExchangeKey] = useState('');
  const [goldApiKey, setGoldApiKey] = useState('');
  const [cryptoSymbols, setCryptoSymbols] = useState<CryptoSymbolInfo[]>([]);
  const [newSymbol, setNewSymbol] = useState({ value: '', label: '', name: '' });
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Load existing API keys from localStorage
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const settings: Settings = JSON.parse(storedSettings);
      setOpenExchangeKey(settings.openExchangeKey || '');
      setGoldApiKey(settings.goldApiKey || '');
    }

    // Load crypto symbols
    setCryptoSymbols(loadCryptoSymbols());
  }, []);

  const validateSymbol = async (symbol: string): Promise<boolean> => {
    if (symbol === 'GOLD') return true; // GOLD is always valid as it's handled separately
    
    try {
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`
      );
      const data = await response.json();
      
      if (data.Response === 'Error') {
        setValidationError(`Symbol ${symbol} not found in market`);
        return false;
      }
      
      if (!data.USD) {
        setValidationError(`Could not get price for ${symbol}`);
        return false;
      }
      
      setValidationError('');
      return true;
    } catch (error) {
      setValidationError('Failed to validate symbol');
      return false;
    }
  };

  const handleSave = () => {
    try {
      // Save API keys to localStorage
      const settings: Settings = {
        openExchangeKey,
        goldApiKey,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Save crypto symbols
      saveCryptoSymbols(cryptoSymbols);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleAddSymbol = async () => {
    if (newSymbol.value && newSymbol.name) {
      setIsValidating(true);
      setValidationError('');
      
      try {
        // Check if symbol already exists
        if (cryptoSymbols.some(s => s.value === newSymbol.value)) {
          setValidationError('Symbol already exists');
          setIsValidating(false);
          return;
        }

        // Validate symbol exists in market
        const isValid = await validateSymbol(newSymbol.value);
        
        if (isValid) {
          setCryptoSymbols([...cryptoSymbols, newSymbol]);
          setNewSymbol({ value: '', label: '', name: '' });
        }
      } catch (error) {
        setValidationError('Failed to validate symbol');
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleRemoveSymbol = (symbolValue: string) => {
    setCryptoSymbols(cryptoSymbols.filter(s => s.value !== symbolValue));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">API Keys</h3>
            <div className="space-y-2">
              <Label htmlFor="openexchange">OpenExchange API Key</Label>
              <Input
                id="openexchange"
                type="text"
                value={openExchangeKey}
                onChange={(e) => setOpenExchangeKey(e.target.value)}
                placeholder="Enter OpenExchange API key"
              />
              <a
                href="https://openexchangerates.org/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                Register for OpenExchange API key
              </a>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goldapi">Gold API Key</Label>
              <Input
                id="goldapi"
                type="text"
                value={goldApiKey}
                onChange={(e) => setGoldApiKey(e.target.value)}
                placeholder="Enter Gold API key"
              />
              <a
                href="https://www.goldapi.io/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                Register for Gold API key
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Manage Crypto Symbols</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Symbol (e.g., BTC)"
                  value={newSymbol.value}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setNewSymbol({ ...newSymbol, value, label: value });
                    setValidationError('');
                  }}
                />
                <Input
                  placeholder="Name (e.g., Bitcoin)"
                  value={newSymbol.name}
                  onChange={(e) => {
                    setNewSymbol({ ...newSymbol, name: e.target.value });
                    setValidationError('');
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddSymbol}
                  disabled={!newSymbol.value || !newSymbol.name || isValidating}
                  className="w-full"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Symbol
                    </>
                  )}
                </Button>
              </div>
              {validationError && (
                <div className="text-sm text-red-500">{validationError}</div>
              )}
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                {cryptoSymbols.map((symbol) => (
                  <div
                    key={symbol.value}
                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md"
                  >
                    <div>
                      <span className="font-medium">{symbol.value}</span>
                      <span className="text-gray-500 ml-2">({symbol.name})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSymbol(symbol.value)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 