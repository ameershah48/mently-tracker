import React, { createContext, useContext, useState, useEffect } from 'react';
import { CommodityInfo, loadCommodities } from '../types/commodities';

interface CommoditiesContextType {
  commodities: CommodityInfo[];
  refreshCommodities: () => void;
}

const CommoditiesContext = createContext<CommoditiesContextType | undefined>(undefined);

export function CommoditiesProvider({ children }: { children: React.ReactNode }) {
  const [commodities, setCommodities] = useState<CommodityInfo[]>([]);

  const refreshCommodities = () => {
    setCommodities(loadCommodities());
  };

  useEffect(() => {
    refreshCommodities();
  }, []);

  return (
    <CommoditiesContext.Provider value={{ commodities, refreshCommodities }}>
      {children}
    </CommoditiesContext.Provider>
  );
}

export function useCommodities() {
  const context = useContext(CommoditiesContext);
  if (context === undefined) {
    throw new Error('useCommodities must be used within a CommoditiesProvider');
  }
  return context;
} 