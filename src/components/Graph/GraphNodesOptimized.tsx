import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, NODE_COLORS } from '../../types';

interface GraphNodesOptimizedProps {
  containerRef: React.RefObject<SVGGElement | null>;
  data: GraphData;
  currentHour: number;
  simulation: d3.Simulation<d3.SimulationNodeDatum, undefined> | null;
  selectedNode: Node | null;
  onNodeClick: (node: Node) => void;
  tooltip: {
    showTooltip: (html: string, event: MouseEvent) => void;
    hideTooltip: (delay?: number) => void;
    updateTooltipPosition: (event: MouseEvent) => void;
  };
}

/**
 * Performance-optimized version of GraphNodes with minimal DOM operations
 */
export const GraphNodesOptimized: React.FC<GraphNodesOptimizedProps> = ({
  containerRef,
  data,
  currentHour,
  simulation,
  selectedNode,
  onNodeClick,
  tooltip
}) => {
  
  const nodesContainerRef = useRef<SVGGElement | null>(null);
  const isInitializedRef = useRef(false);
  
  // Memoize node data structure to prevent unnecessary re-renders
  const nodeDataKey = useMemo(() => 
    data.nodes.map(n => `${n.id}-${n.type}`).join(','), 
    [data.nodes]
  );
  
  // Initialize nodes only when structure changes
  useEffect(() => {
    if (!containerRef.current || !simulation || !data.nodes.length) return;

    const container = d3.select(containerRef.current);
    
    // Only recreate if structure changed or not initialized
    if (isInitializedRef.current && container.selectAll('.node').size() === data.nodes.length) {
      return;
    }

    // Clear existing nodes
    container.selectAll('.nodes-container').remove();
    
    // Create nodes container
    const nodesContainer = container.append('g')
      .attr('class', 'nodes-container');
    
    nodesContainerRef.current = nodesContainer.node();

    // Get node data from simulation to ensure positions are synchronized
    const nodeData = simulation.nodes() as any[];

    // Simplified drag functions
    const dragstarted = (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };

    const dragged = (event: any, d: any) => {
      d.fx = event.x;
      d.fy = event.y;
    };

    const dragended = (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    };

    // Create simplified node groups
    const nodeSelection = nodesContainer
      .selectAll('g')
      .data(nodeData)
      .enter().append('g')
      .attr('class', d => `node node-${d.type}`)
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: Node) => {
        event.stopPropagation();
        onNodeClick(d);
      })
      .on('mouseover', function(this: SVGGElement, event: MouseEvent, d: Node) {
        if (selectedNode) return;
        
        // Simplified tooltip content
        const displayName = d.name || d.id;
        let tooltipContent = `<div class="font-semibold">${displayName}</div>`;
        tooltipContent += `<div>Type: ${d.type.replace('_', ' ')}</div>`;
        
        // Add key metrics only
        if (d.type === 'pv' && d.installed_capacity) {
          tooltipContent += `<br/>Capacity: ${d.installed_capacity.toFixed(1)} kW`;
        } else if (d.type === 'building' && d.total_energy_demand) {
          tooltipContent += `<br/>Demand: ${d.total_energy_demand.toFixed(0)} kWh/year`;
        } else if (d.type === 'battery' && d.capacity) {
          tooltipContent += `<br/>Capacity: ${d.capacity.toFixed(1)} kWh`;
        }
        
        tooltip.showTooltip(tooltipContent, event);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip.updateTooltipPosition(event);
      })
      .on('mouseout', () => {
        tooltip.hideTooltip();
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Main node circle with consistent sizing
    nodeSelection.append('circle')
      .attr('class', d => `node-main node-main-${d.type}`)
      .attr('r', 32) // Fixed radius for better performance
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('stroke', d => d3.color(NODE_COLORS[d.type])?.brighter(0.3)?.toString() || NODE_COLORS[d.type])
      .attr('stroke-width', 2);

    // Simplified text labels - only essential information
    nodeSelection.append('text')
      .attr('class', 'node-label-simple')
      .attr('text-anchor', 'middle')
      .attr('dy', '5px')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d: Node) => {
        const label = d.name || d.id;
        return label.length > 4 ? label.substring(0, 3) + '.' : label;
      });

    // Essential metrics only
    nodeSelection.append('text')
      .attr('class', 'node-metric-simple')
      .attr('text-anchor', 'middle')
      .attr('dy', '20px')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text((d: Node) => {
        switch(d.type) {
          case 'pv':
            return d.installed_capacity ? `${d.installed_capacity.toFixed(0)}kW` : '';
          case 'building':
            return 'BLD';
          case 'battery':
            return d.capacity ? `${d.capacity.toFixed(0)}kWh` : 'BAT';
          case 'charge_point':
            return 'CHG';
          case 'grid':
            return 'GRID';
          default:
            return '';
        }
      });

    // Set up tick function for position updates
    if (simulation) {
      // Optimized tick function with requestAnimationFrame throttling
      let tickScheduled = false;
      simulation.on('tick', () => {
        if (!tickScheduled) {
          tickScheduled = true;
          requestAnimationFrame(() => {
            nodeSelection.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
            tickScheduled = false;
          });
        }
      });
    }

    isInitializedRef.current = true;

  }, [containerRef, simulation, nodeDataKey, selectedNode, onNodeClick, tooltip]);

  return null; // This component renders directly to SVG via D3
};

export default GraphNodesOptimized;
