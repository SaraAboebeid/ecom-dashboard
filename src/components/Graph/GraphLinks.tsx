import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, NODE_COLORS } from '../../types';

interface GraphLinksProps {
  containerRef: React.RefObject<SVGGElement | null>;
  data: GraphData;
  currentHour: number;
  simulation: d3.Simulation<d3.SimulationNodeDatum, undefined> | null;
  isPlaying?: boolean;
  tooltip: {
    showTooltip: (html: string, event: MouseEvent) => void;
    hideTooltip: (delay?: number) => void;
    updateTooltipPosition: (event: MouseEvent) => void;
  };
}

/**
 * Component responsible for rendering graph links with energy flow visualization
 */
export const GraphLinks: React.FC<GraphLinksProps> = ({
  containerRef,
  data,
  currentHour,
  simulation,
  isPlaying = false,
  tooltip
}) => {
  
  // Memoize node lookups for performance
  const nodeMap = useRef<Map<string, any>>(new Map());
  useEffect(() => {
    const map = new Map();
    data.nodes.forEach(node => {
      map.set(node.id, node);
    });
    nodeMap.current = map;
  }, [data.nodes]);

  // Create links when simulation or data changes
  useEffect(() => {
    if (!containerRef.current || !simulation || !data.links.length) return;

    const container = d3.select(containerRef.current);
    // Remove existing links
    container.selectAll('.link').remove();

    // Create deep copies to avoid modifying original data
    const linkData = data.links.map(d => ({ ...d }));

    // Create simple link elements (no effects, gradients, or markers)
    const linkSelection = container.append('g')
      .attr('class', 'links-container')
      .selectAll('line')
      .data(linkData)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke-opacity', 0.8)
      .attr('stroke', '#888')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', 0);

    // Update simulation link force with new data
    if (simulation) {
      const linkForce = simulation.force('link') as d3.ForceLink<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>;
      if (linkForce) {
        linkForce.links(linkData);
      }
      
      // Only update positions during simulation tick if playing
      if (isPlaying) {
        simulation.on('tick', () => {
          linkSelection
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);
        });
      } else {
        // Stop simulation and set static positions
        simulation.stop();
        linkSelection
          .attr('x1', (d: any) => d.source.x || 0)
          .attr('y1', (d: any) => d.source.y || 0)
          .attr('x2', (d: any) => d.target.x || 0)
          .attr('y2', (d: any) => d.target.y || 0);
      }
    }

    // Initial update with current hour styling
    updateLinkStyling(linkSelection, currentHour);
  }, [containerRef, simulation, data.links, data.nodes, currentHour, isPlaying]);

  // Update link styling when currentHour changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = d3.select(containerRef.current);
    const linkSelection = container.selectAll('.link');
    
    updateLinkStyling(linkSelection, currentHour);

  }, [currentHour, containerRef]);

  // Helper function to update link styling based on current hour
  const updateLinkStyling = (linkSelection: d3.Selection<any, any, any, any>, hour: number) => {
    linkSelection
      .attr('stroke-opacity', 0.8)
      .attr('stroke', '#888')
      .attr('class', 'link');
  };

  return null; // This component renders directly to SVG via D3
};

export default GraphLinks;
