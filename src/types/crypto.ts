export interface CryptoSymbolInfo {
  value: string;
  label: string;
  name: string;
}

export type CryptoSymbol = string;

export const DEFAULT_CRYPTO_SYMBOLS: CryptoSymbolInfo[] = [
  { value: 'GOLD', label: 'GOLD', name: 'Gold' },
  { value: 'BTC', label: 'BTC', name: 'Bitcoin' },
  { value: 'ETH', label: 'ETH', name: 'Ethereum' },
  { value: 'BNB', label: 'BNB', name: 'Binance Coin' },
  { value: 'XRP', label: 'XRP', name: 'Ripple' },
  { value: 'SOL', label: 'SOL', name: 'Solana' },
  { value: 'ADA', label: 'ADA', name: 'Cardano' },
  { value: 'DOGE', label: 'DOGE', name: 'Dogecoin' },
  { value: 'DOT', label: 'DOT', name: 'Polkadot' },
  { value: 'MATIC', label: 'MATIC', name: 'Polygon' },
  { value: 'LINK', label: 'LINK', name: 'Chainlink' },
  { value: 'WLD', label: 'WLD', name: 'Worldcoin' },
  { value: 'CELO', label: 'CELO', name: 'Celo' },
  { value: 'SUI', label: 'SUI', name: 'Sui' },
  { value: 'XLM', label: 'XLM', name: 'Stellar Lumens' },
  { value: 'LTC', label: 'LTC', name: 'Litecoin' }
];

const STORAGE_KEY = 'cryptoSymbols';

// Initialize crypto symbols in localStorage if not present
export function initializeCryptoSymbols(): void {
  const storedSymbols = localStorage.getItem(STORAGE_KEY);
  if (!storedSymbols) {
    console.log('Initializing default crypto symbols');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CRYPTO_SYMBOLS));
  }
}

export function loadCryptoSymbols(): CryptoSymbolInfo[] {
  const storedSymbols = localStorage.getItem(STORAGE_KEY);
  if (!storedSymbols) {
    console.log('No stored symbols found, using defaults');
    return DEFAULT_CRYPTO_SYMBOLS;
  }
  try {
    const symbols = JSON.parse(storedSymbols);
    console.log('Loaded crypto symbols:', symbols);
    return symbols;
  } catch (error) {
    console.error('Failed to parse stored symbols:', error);
    return DEFAULT_CRYPTO_SYMBOLS;
  }
}

export function saveCryptoSymbols(symbols: CryptoSymbolInfo[]): void {
  try {
    console.log('Saving crypto symbols:', symbols);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch (error) {
    console.error('Failed to save crypto symbols:', error);
    throw new Error('Failed to save crypto symbols');
  }
}

// Get all available crypto symbols for type checking
export function getCryptoSymbols(): CryptoSymbolInfo[] {
  return loadCryptoSymbols();
}

// Helper to check if a symbol exists
export function isValidCryptoSymbol(symbol: string): boolean {
  const symbols = loadCryptoSymbols();
  const isValid = symbols.some(s => s.value === symbol);
  console.log(`Validating symbol ${symbol}:`, isValid);
  return isValid;
} 