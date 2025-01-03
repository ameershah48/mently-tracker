export interface PreciousMetalInfo {
  value: string;
  label: string;
  name: string;
  unit: string;
}

export type PreciousMetalSymbol = string;

export const DEFAULT_PRECIOUS_METALS: PreciousMetalInfo[] = [
  { value: 'GOLD', label: 'GOLD', name: 'Gold', unit: 'grams' },
  // Can add more precious metals in the future like silver, platinum, etc.
];

const STORAGE_KEY = 'preciousMetals';

// Initialize precious metals in localStorage if not present
export function initializePreciousMetals(): void {
  const storedMetals = localStorage.getItem(STORAGE_KEY);
  if (!storedMetals) {
    console.log('Initializing default precious metals');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRECIOUS_METALS));
  }
}

export function loadPreciousMetals(): PreciousMetalInfo[] {
  const storedMetals = localStorage.getItem(STORAGE_KEY);
  if (!storedMetals) {
    console.log('No stored precious metals found, using defaults');
    return DEFAULT_PRECIOUS_METALS;
  }
  try {
    const metals = JSON.parse(storedMetals);
    console.log('Loaded precious metals:', metals);
    return metals;
  } catch (error) {
    console.error('Failed to parse stored precious metals:', error);
    return DEFAULT_PRECIOUS_METALS;
  }
}

export function savePreciousMetals(metals: PreciousMetalInfo[]): void {
  try {
    console.log('Saving precious metals:', metals);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metals));
  } catch (error) {
    console.error('Failed to save precious metals:', error);
    throw new Error('Failed to save precious metals');
  }
}

// Get all available precious metals for type checking
export function getPreciousMetals(): PreciousMetalInfo[] {
  return loadPreciousMetals();
}

// Helper to check if a symbol exists
export function isValidPreciousMetalSymbol(symbol: string): boolean {
  const metals = loadPreciousMetals();
  const isValid = metals.some(m => m.value === symbol);
  console.log(`Validating precious metal symbol ${symbol}:`, isValid);
  return isValid;
} 