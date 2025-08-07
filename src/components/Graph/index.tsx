import { useRef, useState } from 'react';
import { GraphData, Node } from '../../types';
import { useGraphData } from '../../hooks/useGraphData';
import { useGraphDimensions } from '../../hooks/useGraphDimensions';
import { useGraphTooltip } from '../../hooks/useGraphTooltip';
import { GraphCanvas } from './GraphCanvas';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import '../../simple-animations.css';

interface GraphProps {
  data: GraphData;
  currentHour: number;
  filters: {
    nodeTypes: Set<string>;
    minFlow: number;
    owners: Set<string>;
    v2gFilter: 'all' | 'v2g-only' | 'no-v2g';
    capacityRange: { min: number; max: number };
  };
  isTimelinePlaying?: boolean;
  performanceMode?: 'auto' | 'high_performance' | 'balanced' | 'high_quality';
  onKPICalculated?: (kpis: {
    totalPVCapacity: number;
    totalEnergyDemand: number;
    totalBatteryCapacity: number;
    totalPVProduction: number;
    totalEmbodiedCO2: number;
  }) => void;
}

/**
 * Main Graph component that orchestrates all graph functionality
 * This is the new modular version that replaces the monolithic Graph.tsx
 */
export const Graph: React.FC<GraphProps> = ({ 
  data, 
  currentHour, 
  filters, 
  isTimelinePlaying, 
  performanceMode = 'auto',
  onKPICalculated 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Use custom hooks for modular functionality
  const { processedData, kpis, graphStructureKey, filtersKey } = useGraphData({
    data,
    filters,
    onKPICalculated
  });

  const dimensions = useGraphDimensions(svgRef);
  const tooltip = useGraphTooltip();

  // Handle node selection
  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
  };

  // Handle closing node details panel
  const handleCloseNodeDetails = () => {
    setSelectedNode(null);
  };

  return (
    <div className="relative w-full h-full">
      {/* Main graph canvas */}
      <GraphCanvas
        svgRef={svgRef}
        data={processedData}
        currentHour={currentHour}
        dimensions={dimensions}
        isTimelinePlaying={isTimelinePlaying}
        graphStructureKey={graphStructureKey}
        filtersKey={filtersKey}
        selectedNode={selectedNode}
        onNodeClick={handleNodeClick}
        tooltip={tooltip}
        performanceMode={performanceMode}
      />

      {/* Node details panel */}
      <NodeDetailsPanel
        selectedNode={selectedNode}
        onClose={handleCloseNodeDetails}
      />
    </div>
  );
};

export default Graph;
