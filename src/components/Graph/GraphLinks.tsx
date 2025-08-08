import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData } from '../../types';

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
  const lastDataRef = useRef<string>('');

  useEffect(() => {
    if (!containerRef.current || !simulation || !data.links.length) return;

    const container = d3.select(containerRef.current);
    
    // Get both node and link data from simulation to ensure consistent references
    const linkForce = simulation.force('link') as d3.ForceLink<any, any>;
    const linkData = linkForce ? linkForce.links() : [];
    const nodeData = simulation.nodes() as any[]; // Use simulation.nodes() instead of cached data
    
    // Check if data actually changed to prevent unnecessary updates
    const currentDataKey = JSON.stringify(data.links.map(l => ({ source: l.source, target: l.target })));
    if (currentDataKey === lastDataRef.current && container.selectAll('.link').size() > 0) {
      // Even if structure hasn't changed, we still need to update the tick function
      // to ensure synchronization with current simulation state
      const existingLinks = container.selectAll('.link');
      const updateLinkPositions = () => {
        existingLinks
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);
      };
      
      // Re-attach tick listener to ensure synchronization
      simulation.on('tick.links', updateLinkPositions);
      updateLinkPositions(); // Initial update
      return;
    }
    lastDataRef.current = currentDataKey;

    // Remove existing links
    container.selectAll('.links-container').remove();

    // Create links container
    const linksContainer = container.append('g')
      .attr('class', 'links-container');

    // Create link lines using simulation's link data
    const linkSelection = linksContainer
      .selectAll('line')
      .data(linkData)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-dasharray', '12 12')
      .attr('stroke-opacity', d => {
        // Hide links with no energy flow
        const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
        return flowValue > 0 ? 0.6 : 0;
      })
      .attr('stroke-width', d => {
        // Use current hour's flow value for stroke width
        const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
        return flowValue > 0 ? Math.sqrt(flowValue) * 2 + 1 : 0;
      })
      .style('cursor', d => {
        // Only show pointer cursor for links with energy flow
        const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
        return flowValue > 0 ? 'pointer' : 'default';
      })
      .style('transition', 'all 300ms ease')
      .on('mouseover', function(this: SVGLineElement, event: MouseEvent, d: any) {
        // Only show tooltip for links with energy flow
        const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
        if (flowValue === 0) return;
        
        // Enhanced hover effect
        d3.select(this)
          .attr('stroke-width', Math.max(4, parseInt(d3.select(this).attr('stroke-width')) * 1.5))
          .style('filter', 'brightness(1.3) drop-shadow(0 0 8px currentColor)');
        
        // Show link tooltip - use nodeData from simulation for consistent references
        const sourceNode = nodeData.find(n => n.id === (d.source.id || d.source));
        const targetNode = nodeData.find(n => n.id === (d.target.id || d.target));
        
        if (sourceNode && targetNode) {
          let tooltipContent = `<div class="font-semibold">Energy Flow</div>`;
          tooltipContent += `<div>From: ${sourceNode.name || sourceNode.id}</div>`;
          tooltipContent += `<div>To: ${targetNode.name || targetNode.id}</div>`;
          if (d.flow && d.flow[currentHour] !== undefined) {
            tooltipContent += `<div>Flow: ${d.flow[currentHour].toFixed(2)} kW</div>`;
          }
          
          tooltip.showTooltip(tooltipContent, event);
        }
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.updateTooltipPosition(event);
      })
      .on('mouseout', function(this: SVGLineElement) {
        // Reset hover styling
        const flowValue = linkData.find(l => l === d3.select(this).datum())?.flow?.[currentHour] || 0;
        const originalWidth = flowValue > 0 ? Math.sqrt(Math.abs(flowValue)) * 2 + 1 : 0;
        
        d3.select(this)
          .attr('stroke-width', originalWidth)
          .style('filter', null);
          
        tooltip.hideTooltip();
      });

    // Update link positions on simulation tick
    const updateLinkPositions = () => {
      linkSelection
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
    };

    // Listen to simulation ticks - use namespaced event to avoid conflicts
    simulation.on('tick.links', updateLinkPositions);

    // Initial position update
    updateLinkPositions();

  }, [containerRef, simulation, data.links, data.nodes, tooltip, currentHour]);

  return null; // This component renders directly to SVG via D3
};

export default GraphLinks;
