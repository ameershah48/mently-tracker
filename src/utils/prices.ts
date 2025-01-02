import { CryptoSymbol } from '../types/crypto';

type PriceMap = Record<CryptoSymbol, number>;

export async function fetchPrices(symbols: CryptoSymbol[]): Promise<PriceMap> {
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

    // Fetch gold price
    if (goldSymbol) {
      try {
        const response = await fetch('https://api.metals.live/v1/spot/gold');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Convert from troy ounce to grams (1 troy ounce = 31.1034768 grams)
          prices.GOLD = data[0].price / 31.1034768;
        } else {
          // Fallback price if API fails
          prices.GOLD = 60; // Approximate price per gram in USD
        }
      } catch (error) {
        console.error('Failed to fetch gold price:', error);
        prices.GOLD = 60; // Fallback price
      }
    }

    return prices;
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return prices;
  }
} 