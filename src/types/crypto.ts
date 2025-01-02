export type CryptoSymbol = 'BTC' | 'ETH' | 'BNB' | 'XRP' | 'SOL' | 'ADA' | 'DOGE' | 'DOT' | 'MATIC' | 'LINK' | 'GOLD';

export const CRYPTO_OPTIONS: { value: CryptoSymbol; label: string; name: string }[] = [
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
  { value: 'LINK', label: 'LINK', name: 'Chainlink' }
]; 