import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, Node } from '../types';
import { applyFixedPositions } from '../utils/nodePositioning';

interface UseGraphSimulationProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  containerRef: React.RefObject<SVGGElement | null>;
  data: GraphData;
  dimensions: { width: number; height: number };
  graphStructureKey: string;
  filtersKey: string;
  selectedNode: Node | null;
}

/**
 * Custom hook for managing D3 force simulation with zoom/pan functionality
 */
export const useGraphSimulation = ({
  svgRef,
  containerRef,
  data,
  dimensions,
  graphStructureKey,
  filtersKey,
  selectedNode
}: UseGraphSimulationProps) => {
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const container = d3.select(containerRef.current);
    const { width, height } = dimensions;

    // Apply fixed positions to nodes
    const nodeData = applyFixedPositions(data.nodes.map(d => ({ ...d })));
    const linkData = data.links.map(d => ({ ...d }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodeData as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(linkData).id((d: any) => d.id).distance(600))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02))
      .force('collision', d3.forceCollide().radius(110))
      .alphaDecay(0.0228)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Apply initial zoom immediately with a reasonable default view
    const initialScale = 0.6;
    const initialTransform = d3.zoomIdentity
      .translate(width * 0.15, height * 0.15)
      .scale(initialScale);
    
    svg.call(zoom.transform as any, initialTransform);

    // Set a better zoom after nodes have settled
    setTimeout(() => {
      const nodes = nodeData as any[];
      if (nodes.length === 0) return;
      
      const padding = 120;
      const minX = Math.min(...nodes.map(d => d.x || 0)) - padding;
      const maxX = Math.max(...nodes.map(d => d.x || 0)) + padding;
      const minY = Math.min(...nodes.map(d => d.y || 0)) - padding;
      const maxY = Math.max(...nodes.map(d => d.y || 0)) + padding;
      
      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;
      
      // Calculate scale to fit the graph with some margin
      const scaleX = (width * 0.8) / graphWidth;
      const scaleY = (height * 0.8) / graphHeight;
      const scale = Math.min(scaleX, scaleY, 0.7);
      
      // Calculate translation to center the graph
      const translateX = (width - graphWidth * scale) / 2 - minX * scale;
      const translateY = (height - graphHeight * scale) / 2 - minY * scale;
      
      const optimizedTransform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);
      
      svg.transition()
        .duration(1500)
        .ease(d3.easeQuadOut)
        .call(zoom.transform as any, optimizedTransform);
    }, 1000);

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [svgRef, containerRef, data, dimensions, graphStructureKey, filtersKey, selectedNode]);

  return {
    simulation: simulationRef.current
  };
};

export default useGraphSimulation;
