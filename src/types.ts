export interface Node {
  id: string;
  type: 'building' | 'pv' | 'grid' | 'battery' | 'charge_point';
  name?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
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
  VALID_OWNERS?: string[];
  // For charge points
  is_v2g?: boolean;
  total_connected_evs?: number;
  charger_type?: string;
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
    owners: Set<string>;
    buildingTypes: Set<string>;
    capacityRange: { min: number; max: number };
  };
}

// Color scheme for different node types - Neon colors
export const NODE_COLORS = {
  building: '#FF00FF',    // Neon Magenta/Pink
  pv: '#FFFF00',          // Neon Yellow
  grid: '#00FF00',        // Neon Green
  battery: '#00FFFF',     // Neon Cyan
  charge_point: '#FF6600' // Neon Orange
};
