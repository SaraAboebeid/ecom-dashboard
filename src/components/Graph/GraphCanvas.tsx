import { useRef } from 'react';
import { GraphData, Node } from '../../types';
import { SVGFilters } from '../effects/SVGFilters';
import { GradientDefinitions } from '../effects/GradientDefinitions';
import { ArrowMarkers } from '../effects/ArrowMarkers';
import { GraphNodes } from './GraphNodes';
import { GraphLinks } from './GraphLinks';
import { GraphParticles } from './GraphParticles';
import { useGraphSimulation } from '../../hooks/useGraphSimulation';

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
  tooltip
}) => {
  const containerRef = useRef<SVGGElement>(null);

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

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    >
      {/* SVG definitions for filters, gradients, and markers */}
      <SVGFilters svgRef={svgRef} />
      <GradientDefinitions svgRef={svgRef} />
      <ArrowMarkers svgRef={svgRef} />

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

        {/* Particles layer */}
        <GraphParticles
          containerRef={containerRef}
          data={data}
          currentHour={currentHour}
          isPlaying={isTimelinePlaying}
        />

        {/* Nodes layer */}
        <GraphNodes
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
