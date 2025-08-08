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
      // Even if structure hasn't changed, we still need to update the visual properties
      // for the current hour and update the tick function
      const existingLinks = container.selectAll('.link');
      
      // Update visual properties based on current hour flow values
      existingLinks
        .attr('stroke-opacity', (d: any) => {
          const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
          if (flowValue === 0) return 0;
          // Use opacity to show flow intensity (0.3 to 1.0 range)
          const normalizedFlow = Math.min(flowValue / 10, 1); // Normalize to max 10kW
          return 0.3 + (normalizedFlow * 0.7);
        })
        .attr('stroke-width', (d: any) => {
          const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
          if (flowValue === 0) return 0;
          // Subtle width variation (2-4px range)
          const normalizedFlow = Math.min(flowValue / 10, 1);
          return 2 + (normalizedFlow * 2);
        })
        .attr('stroke', (d: any) => {
          const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
          if (flowValue === 0) return '#999';
          
          // Color based on source node type
          const sourceNode = nodeData.find(n => n.id === (d.source.id || d.source));
          if (!sourceNode) return '#999';
          
          switch (sourceNode.type) {
            case 'grid': return '#10B981'; // Green
            case 'pv': return '#F59E0B';   // Yellow/Amber
            case 'battery': return '#3B82F6'; // Blue
            case 'building': return '#8B5CF6'; // Purple
            case 'charge_point': return '#EC4899'; // Pink
            default: return '#6B7280'; // Gray
          }
        })
        .attr('class', (d: any) => {
          const flowValue = d.flow && d.flow[currentHour] ? d.flow[currentHour] : 0;
          if (Math.abs(flowValue) === 0) return 'link';
          
          // Determine animation speed based on flow intensity
          const absFlow = Math.abs(flowValue);
          let speedClass = '';
          if (absFlow > 5) speedClass = '-fast';
          else if (absFlow < 1) speedClass = '-slow';
          
          // Add animation class based on flow direction and speed
          return flowValue > 0 ? `link link-flow${speedClass}` : `link link-flow-reverse${speedClass}`;
        })
        .style('cursor', (d: any) => {
          const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
          return flowValue > 0 ? 'pointer' : 'default';
        });
      
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
      .attr('stroke-dasharray', '12 12')
      .attr('stroke-opacity', d => {
        const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
        if (flowValue === 0) return 0;
        // Use opacity to show flow intensity (0.3 to 1.0 range)
        const normalizedFlow = Math.min(flowValue / 10, 1); // Normalize to max 10kW
        return 0.3 + (normalizedFlow * 0.7);
      })
      .attr('stroke-width', d => {
        const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
        if (flowValue === 0) return 0;
        // Subtle width variation (2-4px range)
        const normalizedFlow = Math.min(flowValue / 10, 1);
        return 2 + (normalizedFlow * 2);
      })
      .attr('stroke', d => {
        const flowValue = d.flow && d.flow[currentHour] ? Math.abs(d.flow[currentHour]) : 0;
        if (flowValue === 0) return '#999';
        
        // Color based on source node type
        const sourceNode = nodeData.find(n => n.id === (d.source.id || d.source));
        if (!sourceNode) return '#999';
        
        switch (sourceNode.type) {
          case 'grid': return '#10B981'; // Green
          case 'pv': return '#F59E0B';   // Yellow/Amber  
          case 'battery': return '#3B82F6'; // Blue
          case 'building': return '#8B5CF6'; // Purple
          case 'charge_point': return '#EC4899'; // Pink
          default: return '#6B7280'; // Gray
        }
      })
      .attr('class', d => {
        const flowValue = d.flow && d.flow[currentHour] ? d.flow[currentHour] : 0;
        if (Math.abs(flowValue) === 0) return 'link';
        
        // Determine animation speed based on flow intensity
        const absFlow = Math.abs(flowValue);
        let speedClass = '';
        if (absFlow > 5) speedClass = '-fast';
        else if (absFlow < 1) speedClass = '-slow';
        
        // Add animation class based on flow direction and speed
        return flowValue > 0 ? `link link-flow${speedClass}` : `link link-flow-reverse${speedClass}`;
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
          
          // Add energy source type
          const sourceTypeLabel = {
            'grid': 'Grid Energy',
            'pv': 'Solar Energy',
            'battery': 'Battery Energy',
            'building': 'Building Energy',
            'charge_point': 'Charging Energy'
          }[sourceNode.type] || 'Energy';
          tooltipContent += `<div class="text-sm text-gray-500">Source: ${sourceTypeLabel}</div>`;
          
          tooltip.showTooltip(tooltipContent, event);
        }
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.updateTooltipPosition(event);
      })
      .on('mouseout', function(this: SVGLineElement) {
        // Reset hover styling using current hour's flow value
        const linkDatum = d3.select(this).datum() as any;
        const flowValue = linkDatum?.flow?.[currentHour] || 0;
        let originalWidth = 0;
        if (Math.abs(flowValue) > 0) {
          const normalizedFlow = Math.min(Math.abs(flowValue) / 10, 1);
          originalWidth = 2 + (normalizedFlow * 2);
        }
        
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
