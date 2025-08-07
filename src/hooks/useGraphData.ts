import { useEffect, useMemo } from 'react';
import { GraphData } from '../types';
import { calculateKPIs, createGraphStructureKey, createFiltersKey, KPIData } from '../utils/graphCalculations';

interface GraphFilters {
  nodeTypes: Set<string>;
  minFlow: number;
  owners: Set<string>;
  v2gFilter: 'all' | 'v2g-only' | 'no-v2g';
  capacityRange: { min: number; max: number };
}

interface UseGraphDataProps {
  data: GraphData;
  filters: GraphFilters;
  onKPICalculated?: (kpis: KPIData) => void;
}

/**
 * Custom hook for processing graph data and calculating KPIs
 * @param data Graph data
 * @param filters Graph filters
 * @param onKPICalculated Callback for KPI calculations
 * @returns Processed data and stable keys
 */
export const useGraphData = ({ data, filters, onKPICalculated }: UseGraphDataProps) => {
  // Create stable keys for the graph structure to prevent unnecessary re-renders
  const graphStructureKey = useMemo(() => 
    createGraphStructureKey(data.nodes, data.links), 
    [data.nodes, data.links]
  );
  
  // Create stable keys for filters to prevent unnecessary re-renders
  const filtersKey = useMemo(() => 
    createFiltersKey(filters), 
    [filters]
  );
  
  // Calculate KPIs when data changes
  const kpis = useMemo(() => 
    calculateKPIs(data.nodes), 
    [data.nodes]
  );
  
  // Notify parent component of calculated KPIs
  useEffect(() => {
    if (kpis && onKPICalculated) {
      onKPICalculated(kpis);
    }
  }, [kpis, onKPICalculated]);

  // Create deep copies to avoid modifying original data
  const processedData = useMemo(() => ({
    nodes: data.nodes.map(d => ({ ...d })),
    links: data.links.map(d => ({ ...d }))
  }), [data]);

  return {
    processedData,
    kpis,
    graphStructureKey,
    filtersKey
  };
};

export default useGraphData;
