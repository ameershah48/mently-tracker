import React, { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/Input';
import { Button } from './ui/button';
import { Plus, X, Loader2, Key, Coins, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CryptoSymbolInfo, saveCryptoSymbols } from '../types/crypto';
import { CurrencySymbolInfo, loadCurrencySymbols, saveCurrencySymbols, Currency } from '../types/asset';
import { useCurrencySymbols } from '../contexts/CurrencySymbolsContext';
import { useCryptoSymbols } from '../contexts/CryptoSymbolsContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';

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
  const { refreshCurrencySymbols } = useCurrencySymbols();
  const { cryptoSymbols, refreshCryptoSymbols } = useCryptoSymbols();
  const { displayCurrency, setDefaultCurrency } = useCurrency();
  const [openExchangeKey, setOpenExchangeKey] = useState('');
  const [goldApiKey, setGoldApiKey] = useState('');
  const [localCryptoSymbols, setLocalCryptoSymbols] = useState<CryptoSymbolInfo[]>([]);
  const [currencySymbols, setCurrencySymbols] = useState<CurrencySymbolInfo[]>([]);
  const [newSymbol, setNewSymbol] = useState({ value: '', label: '', name: '' });
  const [newCurrency, setNewCurrency] = useState<Omit<CurrencySymbolInfo, 'value'> & { value: string }>({ 
    value: '', 
    label: '', 
    name: '', 
    icon: '' 
  });
  const [validationError, setValidationError] = useState('');
  const [currencyValidationError, setCurrencyValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValidatingCurrency, setIsValidatingCurrency] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load existing API keys from localStorage
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const settings: Settings = JSON.parse(storedSettings);
        setOpenExchangeKey(settings.openExchangeKey || '');
        setGoldApiKey(settings.goldApiKey || '');
      }

      // Initialize local state with current crypto symbols
      setLocalCryptoSymbols(cryptoSymbols);
      // Load currency symbols
      setCurrencySymbols(loadCurrencySymbols());
    }
  }, [isOpen, cryptoSymbols]);

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

  const validateCurrency = async (currency: string): Promise<boolean> => {
    try {
      const { openExchangeKey } = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (!openExchangeKey) {
        setCurrencyValidationError('OpenExchange API key is required to validate currencies');
        return false;
      }

      const response = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${openExchangeKey}&base=USD&symbols=${currency}`
      );
      const data = await response.json();
      
      if (data.error) {
        setCurrencyValidationError(`Currency ${currency} not found`);
        return false;
      }
      
      if (!data.rates || !data.rates[currency]) {
        setCurrencyValidationError(`Could not get rate for ${currency}`);
        return false;
      }
      
      setCurrencyValidationError('');
      return true;
    } catch (error) {
      setCurrencyValidationError('Failed to validate currency');
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

      // Save crypto and currency symbols
      saveCryptoSymbols(localCryptoSymbols);
      saveCurrencySymbols(currencySymbols);
      refreshCryptoSymbols(); // Refresh the global crypto symbols
      refreshCurrencySymbols(); // Refresh the global currency symbols
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
        if (localCryptoSymbols.some(s => s.value === newSymbol.value)) {
          setValidationError('Symbol already exists');
          setIsValidating(false);
          return;
        }

        // Validate symbol exists in market
        const isValid = await validateSymbol(newSymbol.value);
        
        if (isValid) {
          setLocalCryptoSymbols([...localCryptoSymbols, newSymbol]);
          setNewSymbol({ value: '', label: '', name: '' });
        }
      } catch (error) {
        setValidationError('Failed to validate symbol');
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleAddCurrency = async () => {
    if (newCurrency.value && newCurrency.name && newCurrency.icon) {
      setIsValidatingCurrency(true);
      setCurrencyValidationError('');
      
      try {
        // Check if currency already exists
        if (currencySymbols.some(c => c.value === newCurrency.value)) {
          setCurrencyValidationError('Currency already exists');
          setIsValidatingCurrency(false);
          return;
        }

        // Validate currency exists in market
        const isValid = await validateCurrency(newCurrency.value);
        
        if (isValid) {
          const currencyToAdd: CurrencySymbolInfo = {
            value: newCurrency.value as Currency,
            label: newCurrency.label,
            name: newCurrency.name,
            icon: newCurrency.icon
          };
          setCurrencySymbols([...currencySymbols, currencyToAdd]);
          setNewCurrency({ value: '', label: '', name: '', icon: '' });
        }
      } catch (error) {
        setCurrencyValidationError('Failed to validate currency');
      } finally {
        setIsValidatingCurrency(false);
      }
    }
  };

  const handleRemoveSymbol = (symbolValue: string) => {
    setLocalCryptoSymbols(localCryptoSymbols.filter(s => s.value !== symbolValue));
  };

  const handleRemoveCurrency = (currencyValue: string) => {
    setCurrencySymbols(currencySymbols.filter(c => c.value !== currencyValue));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="crypto" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Crypto Symbols
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Currencies
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-4 mt-4">
            <div className="space-y-4">
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
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4 mt-4">
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
            <div className="h-[300px] overflow-y-auto border rounded-md p-2">
              {localCryptoSymbols.map((symbol) => (
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
          </TabsContent>

          <TabsContent value="currency" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select
                  value={displayCurrency}
                  onValueChange={(value: Currency) => setDefaultCurrency(value)}
                >
                  <SelectTrigger className="w-full">
                    {currencySymbols.find(c => c.value === displayCurrency)?.label || "Select default currency"}
                  </SelectTrigger>
                  <SelectContent>
                    {currencySymbols.map(currency => (
                      <SelectItem key={currency.value} value={currency.value}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{currency.icon}</span>
                          <span>{currency.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This currency will be used as the default when you start the application.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Manage Currencies</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Symbol (e.g., EUR)"
                    value={newCurrency.value}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setNewCurrency({ ...newCurrency, value, label: value });
                      setCurrencyValidationError('');
                    }}
                  />
                  <Input
                    placeholder="Name (e.g., Euro)"
                    value={newCurrency.name}
                    onChange={(e) => {
                      setNewCurrency({ ...newCurrency, name: e.target.value });
                      setCurrencyValidationError('');
                    }}
                  />
                  <Input
                    placeholder="Icon (e.g., 🇪🇺)"
                    value={newCurrency.icon}
                    onChange={(e) => {
                      setNewCurrency({ ...newCurrency, icon: e.target.value });
                      setCurrencyValidationError('');
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddCurrency}
                    disabled={!newCurrency.value || !newCurrency.name || !newCurrency.icon || isValidatingCurrency}
                    className="w-full"
                  >
                    {isValidatingCurrency ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Currency
                      </>
                    )}
                  </Button>
                </div>
                {currencyValidationError && (
                  <div className="text-sm text-red-500">{currencyValidationError}</div>
                )}
                <div className="h-[300px] overflow-y-auto border rounded-md p-2">
                  {currencySymbols.map((currency) => (
                    <div
                      key={currency.value}
                      className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md"
                    >
                      <div>
                        <span className="text-lg mr-2">{currency.icon}</span>
                        <span className="font-medium">{currency.value}</span>
                        <span className="text-gray-500 ml-2">({currency.name})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCurrency(currency.value)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
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