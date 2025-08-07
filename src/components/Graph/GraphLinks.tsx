import { useEffect } from 'react';
import * as d3 from 'd3';
import { GraphData, NODE_COLORS } from '../../types';

interface GraphLinksProps {
  containerRef: React.RefObject<SVGGElement | null>;
  data: GraphData;
  currentHour: number;
  simulation: d3.Simulation<d3.SimulationNodeDatum, undefined> | null;
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
  tooltip
}) => {
  
  // Create links when simulation or data changes
  useEffect(() => {
    if (!containerRef.current || !simulation || !data.links.length) return;

    const container = d3.select(containerRef.current);
    
    // Remove existing links
    container.selectAll('.link').remove();
    
    // Create deep copies to avoid modifying original data
    const linkData = data.links.map(d => ({ ...d }));

    // Create link elements
    const linkSelection = container.append('g')
      .attr('class', 'links-container')
      .selectAll('line')
      .data(linkData)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke-opacity', 0.6)
      .attr('filter', 'url(#line-shadow)')
      .attr('marker-end', 'url(#flow)')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', 0)
      .on('mouseover', function(event: MouseEvent, d: any) {
        const flowValue = d.flow[currentHour];
        const sourceNode = data.nodes.find(n => n.id === d.source);
        const targetNode = data.nodes.find(n => n.id === d.target);
        
        const tooltipHtml = `
          <div class="text-sm">
            <div class="font-semibold">${sourceNode?.name || d.source} → ${targetNode?.name || d.target}</div>
            <div>Flow: ${flowValue.toFixed(2)} kW</div>
            <div>Direction: ${flowValue >= 0 ? 'Forward' : 'Reverse'}</div>
          </div>
        `;
        
        tooltip.showTooltip(tooltipHtml, event);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.updateTooltipPosition(event);
      })
      .on('mouseout', () => {
        tooltip.hideTooltip(200);
      });

    // Update simulation link force with new data
    if (simulation) {
      const linkForce = simulation.force('link') as d3.ForceLink<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>;
      if (linkForce) {
        linkForce.links(linkData);
      }
      
      // Update link positions on simulation tick
      simulation.on('tick', () => {
        linkSelection
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);
      });
    }

    // Initial update with current hour styling
    updateLinkStyling(linkSelection, currentHour);

  }, [containerRef, simulation, data.links, data.nodes]);

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
      .transition()
      .duration(300)
      .attr('stroke-width', (d: any) => Math.max(1, Math.abs(d.flow[hour]) * 1.5))
      .attr('stroke-opacity', (d: any) => Math.abs(d.flow[hour]) > 0 ? 0.7 : 0.3)
      .attr('stroke', (d: any) => {
        // Find source node for color
        const sourceNode = data.nodes.find(n => n.id === d.source);
        if (!sourceNode) return '#999';
        
        // If flow is too low, use a neutral color
        if (Math.abs(d.flow[hour]) < 0.01) return '#666';
        
        // Use gradient based on source node type
        switch (sourceNode.type) {
          case 'pv': return 'url(#gradient-pv)';
          case 'grid': return 'url(#gradient-grid)';
          case 'battery': return 'url(#gradient-battery)';
          case 'building': return 'url(#gradient-building)';
          case 'charge_point': return 'url(#gradient-charge)';
          default: return NODE_COLORS[sourceNode.type] || '#999';
        }
      })
      .attr('class', (d: any) => {
        // Add animation class based on flow direction
        if (Math.abs(d.flow[hour]) > 0) {
          return d.flow[hour] > 0 ? 'link link-flow' : 'link link-flow-reverse';
        }
        return 'link';
      });
  };

  return null; // This component renders directly to SVG via D3
};

export default GraphLinks;
