import { useRef, useMemo, useState, useEffect } from 'react';
import { GraphData, Node } from '../../types';
import { GraphNodes } from './GraphNodes';
import { GraphNodesOptimized } from './GraphNodesOptimized';
import { GraphLinks } from './GraphLinks';
import { GraphParticles } from './GraphParticles';
import { useGraphSimulation } from '../../hooks/useGraphSimulation';
import { detectPerformanceLevel, PERFORMANCE_PRESETS } from '../../utils/performanceConfig';
import { getScaledImageDimensions, getImageCenter, COMPASS_ORIENTATION } from '../../utils/backgroundConfig';

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

  // State to track dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check dark mode on mount and listen for changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Initial check
    checkDarkMode();

    // Listen for dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Determine performance configuration
  const performanceConfig = useMemo(() => {
    const mode = performanceMode === 'auto' ? detectPerformanceLevel() : performanceMode.toUpperCase();
    return PERFORMANCE_PRESETS[mode as keyof typeof PERFORMANCE_PRESETS] || PERFORMANCE_PRESETS.BALANCED;
  }, [performanceMode]);

  // Use the simulation hook
  const { simulation, zoom } = useGraphSimulation({
    svgRef,
    containerRef,
    data,
    dimensions,
    graphStructureKey,
    filtersKey,
    selectedNode
  });

  // Force GraphNodes with icons for now (instead of checking performance config)
  const NodesComponent = GraphNodes;

  // Background image dimensions (configurable scaling)
  const { width: imageWidth, height: imageHeight } = getScaledImageDimensions();
  const imageCenter = getImageCenter();

  // Choose background image based on theme
  const backgroundImage = isDarkMode ? "/3d_topview_dark.png" : "/3d_topview.png";

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: 'transparent', contain: 'layout paint style' }}
    >
      {/* SVG definitions for filters, gradients, and markers removed for simple edges */}

      {/* Main container group for zoom/pan transforms */}
      <g ref={containerRef}>
        {/* Background image positioned at origin (0,0) with rotation */}
        <image
          href={backgroundImage}
          x={0}
          y={0}
          width={imageWidth}
          height={imageHeight}
          transform={`rotate(${COMPASS_ORIENTATION} ${imageCenter.x} ${imageCenter.y})`}
        />

        {/* Links layer */}
        <GraphLinks
          containerRef={containerRef}
          data={data}
          currentHour={currentHour}
          simulation={simulation}
          isPlaying={isTimelinePlaying}
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
