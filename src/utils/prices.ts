import { CryptoSymbol } from '../types/crypto';

type PriceMap = Record<CryptoSymbol, number>;

let lastGoldPrice: number | null = null;
let lastGoldFetchTime: number | null = null;
const GOLD_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

let lastFetchTime: number | null = null;

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

    // Fetch crypto prices
    if (cryptoSymbols.length > 0) {
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${cryptoSymbols.join(',')}&tsyms=USD`
      );
      const data = await response.json();
      
      // Extract USD prices
      cryptoSymbols.forEach(symbol => {
        if (data[symbol]) {
          prices[symbol] = data[symbol].USD;
        }
      });
    }

    // Fetch gold price with caching
    if (goldSymbol) {
      const now = Date.now();
      
      // Use cached price if available and not expired
      if (lastGoldPrice !== null && lastGoldFetchTime !== null && 
          now - lastGoldFetchTime < GOLD_CACHE_DURATION) {
        prices.GOLD = lastGoldPrice;
      } else {
        try {
          const API_KEY = process.env.GOLD_API_KEY;
          if (!API_KEY) {
            throw new Error('Gold API key not found in environment variables');
          }
          
          const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
            headers: {
              'x-access-token': API_KEY
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
          } else {
            // Use cached price if available, otherwise fallback
            prices.GOLD = lastGoldPrice ?? 60;
          }
        } catch (error) {
          console.warn('Failed to fetch gold price, using cached or fallback price');
          prices.GOLD = lastGoldPrice ?? 60; // Use cached price if available, otherwise fallback
        }
      }
    }

    return prices;
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return prices;
  }
} 