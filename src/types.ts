export interface Node {
  id: string;
  type: 'building' | 'pv' | 'grid' | 'battery' | 'charge_point';
  x?: number;
  y?: number;
}

export interface Link {
  source: string;
  target: string;
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
