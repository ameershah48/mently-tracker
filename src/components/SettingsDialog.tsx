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
import { CommodityInfo, saveCommodities } from '../types/commodities';
import { CurrencySymbolInfo, loadCurrencySymbols, saveCurrencySymbols, Currency } from '../types/asset';
import { useCurrencySymbols } from '../contexts/CurrencySymbolsContext';
import { useCryptoSymbols } from '../contexts/CryptoSymbolsContext';
import { useCommodities } from '../contexts/CommoditiesContext';
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
  const { commodities, refreshCommodities } = useCommodities();
  const { displayCurrency, setDefaultCurrency } = useCurrency();
  const [openExchangeKey, setOpenExchangeKey] = useState('');
  const [goldApiKey, setGoldApiKey] = useState('');
  const [localCryptoSymbols, setLocalCryptoSymbols] = useState<CryptoSymbolInfo[]>([]);
  const [localCommodities, setLocalCommodities] = useState<CommodityInfo[]>([]);
  const [currencySymbols, setCurrencySymbols] = useState<CurrencySymbolInfo[]>([]);
  const [newSymbol, setNewSymbol] = useState({ value: '', label: '', name: '' });
  const [newCommodity, setNewCommodity] = useState<Omit<CommodityInfo, 'category'> & { category?: string }>({ 
    value: '', 
    label: '', 
    name: '', 
    unit: '' 
  });
  const [newCurrency, setNewCurrency] = useState<Omit<CurrencySymbolInfo, 'value'> & { value: string }>({ 
    value: '', 
    label: '', 
    name: '', 
    icon: '' 
  });
  const [validationError, setValidationError] = useState('');
  const [commodityValidationError, setCommodityValidationError] = useState('');
  const [currencyValidationError, setCurrencyValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValidatingCommodity, setIsValidatingCommodity] = useState(false);
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

      // Initialize local state
      setLocalCryptoSymbols(cryptoSymbols);
      setLocalCommodities(commodities);
      setCurrencySymbols(loadCurrencySymbols());
    }
  }, [isOpen, cryptoSymbols, commodities]);

  const validateSymbol = async (symbol: string): Promise<boolean> => {
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

  const validateCommodity = async (symbol: string): Promise<boolean> => {
    if (symbol === 'GOLD') {
      try {
        const { goldApiKey } = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (!goldApiKey) {
          setCommodityValidationError('Gold API key is required to validate gold prices');
          return false;
        }
        
        const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
          headers: {
            'x-access-token': goldApiKey
          }
        });
        
        if (!response.ok) {
          setCommodityValidationError('Could not validate gold price');
          return false;
        }
        
        setCommodityValidationError('');
        return true;
      } catch (error) {
        setCommodityValidationError('Failed to validate gold price');
        return false;
      }
    }
    // Add validation for other commodities here
    return true;
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

      // Save symbols
      saveCryptoSymbols(localCryptoSymbols);
      saveCommodities(localCommodities);
      saveCurrencySymbols(currencySymbols);
      
      // Refresh contexts
      refreshCryptoSymbols();
      refreshCommodities();
      refreshCurrencySymbols();
      
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

  const handleAddCommodity = async () => {
    if (newCommodity.value && newCommodity.name && newCommodity.unit) {
      setIsValidatingCommodity(true);
      setCommodityValidationError('');
      
      try {
        // Check if commodity already exists
        if (localCommodities.some(c => c.value === newCommodity.value)) {
          setCommodityValidationError('Commodity already exists');
          setIsValidatingCommodity(false);
          return;
        }

        // Validate commodity if needed
        const isValid = await validateCommodity(newCommodity.value);
        
        if (isValid) {
          const commodityToAdd: CommodityInfo = {
            value: newCommodity.value,
            label: newCommodity.label || newCommodity.value,
            name: newCommodity.name,
            unit: newCommodity.unit,
            category: newCommodity.category as any || 'PRECIOUS_METAL'
          };
          setLocalCommodities([...localCommodities, commodityToAdd]);
          setNewCommodity({ value: '', label: '', name: '', unit: '' });
        }
      } catch (error) {
        setCommodityValidationError('Failed to validate commodity');
      } finally {
        setIsValidatingCommodity(false);
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

  const handleRemoveCommodity = (commodityValue: string) => {
    setLocalCommodities(localCommodities.filter(c => c.value !== commodityValue));
  };

  const handleRemoveCurrency = (currencyValue: string) => {
    setCurrencySymbols(currencySymbols.filter(c => c.value !== currencyValue));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="api">
          <TabsList>
            <TabsTrigger value="api">
              <Key className="h-4 w-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="crypto">
              <Coins className="h-4 w-4 mr-2" />
              Cryptocurrencies
            </TabsTrigger>
            <TabsTrigger value="commodities">
              <Globe className="h-4 w-4 mr-2" />
              Commodities
            </TabsTrigger>
            <TabsTrigger value="currency">
              <Globe className="h-4 w-4 mr-2" />
              Currencies
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>OpenExchange API Key</Label>
              <Input
                type="password"
                value={openExchangeKey}
                onChange={(e) => setOpenExchangeKey(e.target.value)}
                placeholder="Enter your OpenExchange API key"
              />
              <p className="text-sm text-muted-foreground">
                Required for currency conversion. Get your key at{' '}
                <a
                  href="https://openexchangerates.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openexchangerates.org
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Gold API Key</Label>
              <Input
                type="password"
                value={goldApiKey}
                onChange={(e) => setGoldApiKey(e.target.value)}
                placeholder="Enter your Gold API key"
              />
              <p className="text-sm text-muted-foreground">
                Required for gold price tracking. Get your key at{' '}
                <a
                  href="https://www.goldapi.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  goldapi.io
                </a>
              </p>
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

          <TabsContent value="commodities" className="space-y-4 mt-4">
            <div className="grid grid-cols-4 gap-2">
              <Input
                placeholder="Symbol (e.g., GOLD)"
                value={newCommodity.value}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setNewCommodity({ ...newCommodity, value, label: value });
                  setCommodityValidationError('');
                }}
              />
              <Input
                placeholder="Name (e.g., Gold)"
                value={newCommodity.name}
                onChange={(e) => {
                  setNewCommodity({ ...newCommodity, name: e.target.value });
                  setCommodityValidationError('');
                }}
              />
              <Input
                placeholder="Unit (e.g., grams)"
                value={newCommodity.unit}
                onChange={(e) => {
                  setNewCommodity({ ...newCommodity, unit: e.target.value });
                  setCommodityValidationError('');
                }}
              />
              <Button
                type="button"
                onClick={handleAddCommodity}
                disabled={!newCommodity.value || !newCommodity.name || !newCommodity.unit || isValidatingCommodity}
                className="w-full"
              >
                {isValidatingCommodity ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Commodity
                  </>
                )}
              </Button>
            </div>
            {commodityValidationError && (
              <div className="text-sm text-red-500">{commodityValidationError}</div>
            )}
            <div className="h-[300px] overflow-y-auto border rounded-md p-2">
              {localCommodities.map((commodity) => (
                <div
                  key={commodity.value}
                  className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md"
                >
                  <div>
                    <span className="font-medium">{commodity.value}</span>
                    <span className="text-gray-500 ml-2">
                      ({commodity.name} - {commodity.unit})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCommodity(commodity.value)}
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

              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Code (e.g., EUR)"
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
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{currency.icon}</span>
                      <span className="font-medium">{currency.value}</span>
                      <span className="text-gray-500">({currency.name})</span>
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
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 