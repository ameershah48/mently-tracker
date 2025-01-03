import { CryptoSymbol } from '../types/crypto';
import { addPriceEntry } from './priceHistory';

type PriceMap = Record<CryptoSymbol, number>;

let lastGoldPrice: number | null = null;
let lastGoldFetchTime: number | null = null;
const GOLD_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

let lastFetchTime: number | null = null;
let lastCryptoPrices: PriceMap = {} as PriceMap;
let lastCryptoFetchTime: number | null = null;
const CRYPTO_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const SETTINGS_KEY = 'settings';

interface Settings {
  openExchangeKey: string;
  goldApiKey: string;
}

function getSettings(): Settings {
  const storedSettings = localStorage.getItem(SETTINGS_KEY);
  if (!storedSettings) return { openExchangeKey: '', goldApiKey: '' };
  return JSON.parse(storedSettings);
}

export async function fetchHistoricalGoldPrices(startDate: Date): Promise<void> {
  try {
    const { goldApiKey } = getSettings();
    if (!goldApiKey) {
      throw new Error('Gold API key not found in settings');
    }

    const currentMonthFirstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Use exact start date and current date
    const dates = [startDate, currentMonthFirstDay];

    // Fetch prices for start date and current date
    for (const date of dates) {
      const formattedDate = date.toISOString().split('T')[0];
      
      try {
        const response = await fetch(`https://www.goldapi.io/api/XAU/USD/${formattedDate}`, {
          headers: {
            'x-access-token': goldApiKey
          }
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch gold price for ${formattedDate}`);
          continue;
        }

        const data = await response.json();
        if (data && data.price) {
          // Price is in USD per troy ounce, convert to grams
          const goldPrice = data.price / 31.1034768;
          // Store the historical price
          addPriceEntry('GOLD', goldPrice, new Date(formattedDate));
        }
      } catch (error) {
        console.warn(`Failed to fetch gold price for ${formattedDate}:`, error);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Failed to fetch historical gold prices:', error);
  }
}

export async function fetchHistoricalCryptoPrices(symbol: CryptoSymbol, startDate: Date): Promise<void> {
  try {
    const currentMonthFirstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    // Use exact start date and current date
    const dates = [startDate, currentMonthFirstDay];

    // Fetch prices for start date and current date
    for (const date of dates) {
      const timestamp = Math.floor(date.getTime() / 1000);
      
      try {
        const response = await fetch(
          `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${symbol}&tsyms=USD&ts=${timestamp}`
        );
        
        if (!response.ok) {
          console.warn(`Failed to fetch crypto price for ${date.toISOString()}`);
          continue;
        }

        const data = await response.json();
        if (data && data[symbol] && data[symbol].USD) {
          // Store the historical price
          addPriceEntry(symbol, data[symbol].USD, new Date(timestamp * 1000));
        }
      } catch (error) {
        console.warn(`Failed to fetch crypto price for ${date.toISOString()}:`, error);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error(`Failed to fetch historical ${symbol} prices:`, error);
  }
}

export async function fetchPrices(symbols: CryptoSymbol[]): Promise<PriceMap> {
  const now = Date.now();
  const timeSinceLastFetch = lastFetchTime ? now - lastFetchTime : null;
  console.log(`Fetching prices... Time since last fetch: ${timeSinceLastFetch ? Math.round(timeSinceLastFetch/1000) + 's' : 'First fetch'}`);
  lastFetchTime = now;

  const prices: PriceMap = {} as PriceMap;

  try {
    // Filter out GOLD as it needs special handling
    const cryptoSymbols = symbols.filter(symbol => symbol !== 'GOLD');
    const goldSymbol = symbols.includes('GOLD');

    // Check crypto cache first
    if (cryptoSymbols.length > 0) {
      const shouldFetchCrypto = !lastCryptoFetchTime || now - lastCryptoFetchTime >= CRYPTO_CACHE_DURATION;
      
      if (shouldFetchCrypto) {

        console.log('Fetching crypto prices', cryptoSymbols);

        const response = await fetch(
          `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${cryptoSymbols.join(',')}&tsyms=USD`
        );
        const data = await response.json();
        
        // Extract USD prices and update cache
        cryptoSymbols.forEach(symbol => {
          if (data[symbol]) {
            prices[symbol] = data[symbol].USD;
            lastCryptoPrices[symbol] = data[symbol].USD;
          }
        });
        lastCryptoFetchTime = now;
      } else {
        // Use cached prices
        cryptoSymbols.forEach(symbol => {
          if (lastCryptoPrices[symbol] !== undefined) {
            prices[symbol] = lastCryptoPrices[symbol];
          }
        });
      }
    }

    // Fetch gold price with caching
    if (goldSymbol) {
      // Use cached gold price if available and not expired
      if (lastGoldPrice !== null && lastGoldFetchTime !== null && 
          now - lastGoldFetchTime < GOLD_CACHE_DURATION) {
        prices.GOLD = lastGoldPrice;
      } else {
        try {
          const { goldApiKey } = getSettings();
          if (!goldApiKey) {
            throw new Error('Gold API key not found in settings');
          }
          
          const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
            headers: {
              'x-access-token': goldApiKey
            }
          });
          const data = await response.json();
          if (data && data.price) {
            // Price is in USD per troy ounce, convert to grams
            const goldPrice = data.price / 31.1034768;
            prices.GOLD = goldPrice;
            // Update cache
            lastGoldPrice = goldPrice;
            lastGoldFetchTime = now;
            // Store the current price in history
            addPriceEntry('GOLD', goldPrice);
          } else {
            // Use cached price if available, otherwise fallback
            prices.GOLD = lastGoldPrice ?? 60;
          }
        } catch (error) {
          console.warn('Failed to fetch gold price, using cached or fallback price');
          prices.GOLD = lastGoldPrice ?? 60;
        }
      }
    }

    return prices;
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    // Return cached prices if available
    return { ...lastCryptoPrices, ...(goldSymbol && lastGoldPrice ? { GOLD: lastGoldPrice } : {}) };
  }
} 