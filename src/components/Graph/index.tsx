import { useRef, useState, useEffect, useCallback } from 'react';
import { GraphData, Node } from '../../types';
import { useGraphData } from '../../hooks/useGraphData';
import { useGraphDimensions } from '../../hooks/useGraphDimensions';
import { useGraphTooltip } from '../../hooks/useGraphTooltip';
import { GraphCanvas } from './GraphCanvas';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import '../../simple-animations.css';
import * as d3 from 'd3';

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
  onFitToView?: (fitFn: () => void) => void;
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
  onKPICalculated,
  onFitToView
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Use custom hooks for modular functionality
  const { processedData, kpis, graphStructureKey, filtersKey } = useGraphData({
    data,
    filters,
    currentHour,
    onKPICalculated
  });

  const dimensions = useGraphDimensions(svgRef);
  const tooltip = useGraphTooltip();

  // Function to fit graph to view (can be called manually)
  const fitGraphToView = useCallback(() => {
    if (!svgRef.current) return;
    
    // Get the current SVG element
    const svg = d3.select(svgRef.current);
    
    // Get all nodes from the processed data
    const nodes = processedData.nodes;
    
    if (nodes.length === 0) return;
    
    const padding = 120;
    // Use initial positions or simulate positions if needed
    const minX = Math.min(...nodes.map(d => d.x || 0)) - padding;
    const maxX = Math.max(...nodes.map(d => d.x || 0)) + padding;
    const minY = Math.min(...nodes.map(d => d.y || 0)) - padding;
    const maxY = Math.max(...nodes.map(d => d.y || 0)) + padding;
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    // Calculate scale to fit the graph with some margin
    const scaleX = (dimensions.width * 0.8) / graphWidth;
    const scaleY = (dimensions.height * 0.8) / graphHeight;
    const scale = Math.min(scaleX, scaleY, 0.7); // Max scale of 0.7
    
    // Calculate translation to center the graph
    const translateX = (dimensions.width - graphWidth * scale) / 2 - minX * scale;
    const translateY = (dimensions.height - graphHeight * scale) / 2 - minY * scale;
    
    const optimizedTransform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);
    
    // Create a temporary zoom behavior just for this transform if needed
    // We're not storing this zoom instance as it's just for the transform
    const tempZoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        const g = d3.select(svgRef.current!.querySelector('g'));
        g.attr('transform', event.transform);
      });
    
    svg.call(tempZoom as any)
       .transition()
       .duration(1500)
       .ease(d3.easeQuadOut)
       .call(tempZoom.transform as any, optimizedTransform);
       
    // This fix makes sure our zoom events keep working after fitting
    tempZoom.on('end', () => {
      // Re-enable the original zoom behavior after transition completes
      svg.on('.zoom', null); // Clear any zoom handlers
      
      // Re-initialize the original zoom behavior
      const newZoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
          const g = d3.select(svgRef.current!.querySelector('g'));
          g.attr('transform', event.transform);
        });
      
      svg.call(newZoom as any)
         .call(newZoom.transform as any, optimizedTransform);
    });
  }, [processedData.nodes, dimensions]);

  // Expose fitGraphToView function to parent component
  useEffect(() => {
    if (onFitToView) {
      onFitToView(fitGraphToView);
    }
  }, [onFitToView, fitGraphToView]);

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
        links={data.links}
      />
    </div>
  );
};

export default Graph;
