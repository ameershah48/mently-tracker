export interface CommodityInfo {
  value: string;
  label: string;
  name: string;
  unit: string;
  category: 'PRECIOUS_METAL' | 'ENERGY' | 'AGRICULTURE'; // For future expansion
}

export type CommoditySymbol = string;

export const DEFAULT_COMMODITIES: CommodityInfo[] = [
  { 
    value: 'GOLD', 
    label: 'GOLD', 
    name: 'Gold', 
    unit: 'grams',
    category: 'PRECIOUS_METAL'
  },
  // Can add more commodities in the future like:
  // { value: 'SILVER', label: 'SILVER', name: 'Silver', unit: 'grams', category: 'PRECIOUS_METAL' },
  // { value: 'OIL', label: 'OIL', name: 'Crude Oil', unit: 'barrels', category: 'ENERGY' },
  // { value: 'WHEAT', label: 'WHEAT', name: 'Wheat', unit: 'bushels', category: 'AGRICULTURE' },
];

const STORAGE_KEY = 'commodities';

// Initialize commodities in localStorage if not present
export function initializeCommodities(): void {
  const storedCommodities = localStorage.getItem(STORAGE_KEY);
  if (!storedCommodities) {
    console.log('Initializing default commodities');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COMMODITIES));
  }
}

export function loadCommodities(): CommodityInfo[] {
  const storedCommodities = localStorage.getItem(STORAGE_KEY);
  if (!storedCommodities) {
    console.log('No stored commodities found, using defaults');
    return DEFAULT_COMMODITIES;
  }
  try {
    const commodities = JSON.parse(storedCommodities);
    console.log('Loaded commodities:', commodities);
    return commodities;
  } catch (error) {
    console.error('Failed to parse stored commodities:', error);
    return DEFAULT_COMMODITIES;
  }
}

export function saveCommodities(commodities: CommodityInfo[]): void {
  try {
    console.log('Saving commodities:', commodities);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commodities));
  } catch (error) {
    console.error('Failed to save commodities:', error);
    throw new Error('Failed to save commodities');
  }
}

// Get all available commodities for type checking
export function getCommodities(): CommodityInfo[] {
  return loadCommodities();
}

// Helper to check if a symbol exists
export function isValidCommoditySymbol(symbol: string): boolean {
  const commodities = loadCommodities();
  const isValid = commodities.some(c => c.value === symbol);
  console.log(`Validating commodity symbol ${symbol}:`, isValid);
  return isValid;
} 