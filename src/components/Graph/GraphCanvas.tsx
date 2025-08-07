import { useRef, useMemo } from 'react';
import { GraphData, Node } from '../../types';
import { GraphNodes } from './GraphNodes';
import { GraphNodesOptimized } from './GraphNodesOptimized';
import { GraphLinks } from './GraphLinks';
import { GraphParticles } from './GraphParticles';
import { useGraphSimulation } from '../../hooks/useGraphSimulation';
import { detectPerformanceLevel, PERFORMANCE_PRESETS } from '../../utils/performanceConfig';

interface GraphCanvasProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  data: GraphData;
  currentHour: number;
  dimensions: { width: number; height: number };
  isTimelinePlaying?: boolean;
  graphStructureKey: string;
  filtersKey: string;
  selectedNode: Node | null;
  onNodeClick: (node: Node) => void;
  tooltip: {
    showTooltip: (html: string, event: MouseEvent) => void;
    hideTooltip: (delay?: number) => void;
    updateTooltipPosition: (event: MouseEvent) => void;
  };
  performanceMode?: 'auto' | 'high_performance' | 'balanced' | 'high_quality';
}

/**
 * GraphCanvas component that manages the SVG container and D3 simulation
 */
export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  svgRef,
  data,
  currentHour,
  dimensions,
  isTimelinePlaying,
  graphStructureKey,
  filtersKey,
  selectedNode,
  onNodeClick,
  tooltip,
  performanceMode = 'auto'
}) => {
  const containerRef = useRef<SVGGElement>(null);

  // Determine performance configuration
  const performanceConfig = useMemo(() => {
    const mode = performanceMode === 'auto' ? detectPerformanceLevel() : performanceMode.toUpperCase();
    return PERFORMANCE_PRESETS[mode as keyof typeof PERFORMANCE_PRESETS] || PERFORMANCE_PRESETS.BALANCED;
  }, [performanceMode]);

  // Use the simulation hook
  const { simulation } = useGraphSimulation({
    svgRef,
    containerRef,
    data,
    dimensions,
    graphStructureKey,
    filtersKey,
    selectedNode
  });

  // Choose appropriate nodes component based on performance settings
  const NodesComponent = performanceConfig.enableNodeIcons ? GraphNodes : GraphNodesOptimized;

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    >
      {/* SVG definitions for filters, gradients, and markers removed for simple edges */}

      {/* Main container group for zoom/pan transforms */}
      <g ref={containerRef}>
        {/* Background image */}
        <image
          xlinkHref="/3d_topview.png"
          x={0}
          y={0}
          width={565.752}
          height={1276.608}
        />

        {/* Links layer */}
        <GraphLinks
          containerRef={containerRef}
          data={data}
          currentHour={currentHour}
          simulation={simulation}
          tooltip={tooltip}
        />

      {/* Particles layer removed for simple edges */}

        {/* Nodes layer */}
        <NodesComponent
          containerRef={containerRef}
          data={data}
          currentHour={currentHour}
          simulation={simulation}
          selectedNode={selectedNode}
          onNodeClick={onNodeClick}
          tooltip={tooltip}
        />
      </g>
    </svg>
  );
};

export default GraphCanvas;
