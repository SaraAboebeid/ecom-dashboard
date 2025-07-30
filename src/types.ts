export interface Node {
  id: string;
  type: 'building' | 'pv' | 'grid' | 'battery' | 'charge_point';
  name?: string;
  x?: number;
  y?: number;
  // Additional properties
  total_energy_demand?: number;
  total_installed_capacity?: number;
  total_pv_capacity?: number;
  annual_production?: number;
  installed_capacity?: number;
  capacity?: number;
  total_cost?: number;
  total_embodied_co2?: number;
  owner?: string;
  // For charge points
  is_v2g?: boolean;
  total_connected_evs?: number;
  // For buildings
  building_type?: string;
  area?: number;
}

export interface Link {
  source: string;
  target: string;
  type?: string;
  flow: number[];  // Array of 48 hourly values
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface GraphState {
  currentHour: number;
  isPlaying: boolean;
  filters: {
    nodeTypes: Set<string>;
    minFlow: number;
  };
}

// Color scheme for different node types
export const NODE_COLORS = {
  building: '#4B5563',    // Gray
  pv: '#F59E0B',         // Yellow
  grid: '#10B981',       // Green
  battery: '#3B82F6',    // Blue
  charge_point: '#8B5CF6' // Purple
};
