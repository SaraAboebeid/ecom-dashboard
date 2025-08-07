import { useEffect } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Link, NODE_COLORS } from '../../types';
import { iconToString } from '../NodeIcons';

interface GraphNodesProps {
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
 * Component responsible for rendering graph nodes with full interactive features
 */
export const GraphNodes: React.FC<GraphNodesProps> = ({
  containerRef,
  data,
  currentHour,
  simulation,
  selectedNode,
  onNodeClick,
  tooltip
}) => {
  
  // Create nodes when simulation or data changes
  useEffect(() => {
    if (!containerRef.current || !simulation || !data.nodes.length) return;

    const container = d3.select(containerRef.current);
    
    // Remove existing nodes
    container.selectAll('.node').remove();

    // Create deep copies to avoid modifying original data
    const nodeData = data.nodes.map(d => ({ ...d }));

    // Drag functions
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

    // Create node groups
    const nodeSelection = container.append('g')
      .attr('class', 'nodes-container')
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
        // Don't show tooltip if panel is open
        if (selectedNode) return;
        
        const displayName = d.name || d.id;
        let tooltipContent = `<div class="font-semibold">${displayName}</div>`;
        tooltipContent += `<div>Type: ${d.type.replace('_', ' ')}</div>`;
        
        // Add type-specific information
        switch(d.type) {
          case 'building':
            if (d.total_energy_demand !== undefined) {
              tooltipContent += `<br/>Energy Demand: ${d.total_energy_demand.toFixed(2)} kWh/year`;
            }
            if (d.total_pv_capacity !== undefined && d.total_pv_capacity > 0) {
              tooltipContent += `<br/>PV Capacity: ${d.total_pv_capacity.toFixed(2)} kW`;
            }
            if (d.building_type) tooltipContent += `<br/>Building Type: ${d.building_type}`;
            if (d.owner) tooltipContent += `<br/>Owner: ${d.owner}`;
            break;
          
          case 'pv':
            if (d.installed_capacity !== undefined) {
              tooltipContent += `<br/>Capacity: ${d.installed_capacity.toFixed(2)} kW`;
            }
            if (d.annual_production !== undefined) {
              tooltipContent += `<br/>Annual Production: ${d.annual_production.toFixed(2)} kWh/year`;
            }
            if (d.total_embodied_co2 !== undefined) {
              tooltipContent += `<br/>Embodied CO₂: ${d.total_embodied_co2.toFixed(2)} kgCO₂e`;
            }
            if (d.owner) tooltipContent += `<br/>Owner: ${d.owner}`;
            break;
          
          case 'battery':
            if (d.capacity !== undefined) {
              tooltipContent += `<br/>Capacity: ${d.capacity.toFixed(2)} kWh`;
            }
            if (d.total_cost !== undefined) {
              tooltipContent += `<br/>Cost: ${d.total_cost.toFixed(2)} SEK`;
            }
            if (d.total_embodied_co2 !== undefined) {
              tooltipContent += `<br/>Embodied CO₂: ${d.total_embodied_co2.toFixed(2)} kgCO₂e`;
            }
            if (d.owner) tooltipContent += `<br/>Owner: ${d.owner}`;
            break;
          
          case 'charge_point':
            if (d.capacity !== undefined) {
              tooltipContent += `<br/>Capacity: ${d.capacity.toFixed(2)} kW`;
            }
            if (d.is_v2g !== undefined) {
              tooltipContent += `<br/>V2G Enabled: ${d.is_v2g ? 'Yes' : 'No'}`;
            }
            if (d.total_connected_evs) {
              tooltipContent += `<br/>Connected EVs: ${d.total_connected_evs}`;
            }
            if (d.owner) tooltipContent += `<br/>Owner: ${d.owner}`;
            break;
          
          case 'grid':
            // Grid-specific data if available
            break;
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

    // Outer aura ring
    nodeSelection.append('circle')
      .attr('class', d => `node-aura node-aura-${d.type}`)
      .attr('r', (d: Node) => {
        const baseRadius = 30;
        return baseRadius * 1.2;
      })
      .attr('fill', 'none')
      .attr('stroke', d => NODE_COLORS[d.type])
      .attr('stroke-width', 2)
      .attr('opacity', 0.5)
      .attr('filter', 'none');

    // Main node circle
    nodeSelection.append('circle')
      .attr('class', d => `node-main node-main-${d.type}`)
      .attr('r', (d: Node) => {
        let baseRadius = 30;
        switch(d.type) {
          case 'building':
            return baseRadius + 2;
          case 'pv':
            return baseRadius + 2;
          case 'battery':
            return baseRadius + 2;
          case 'charge_point':
            return baseRadius + 2;
          default:
            return baseRadius;
        }
      })
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('stroke', d => d3.color(NODE_COLORS[d.type])?.brighter(0.3)?.toString() || NODE_COLORS[d.type])
      .attr('stroke-width', 2)
      .attr('filter', 'none');

    // Add SVG icons inside nodes
    nodeSelection.each(function(d: Node) {
      const node = d3.select(this);
      const nodeType = d.type;
      
      // Insert SVG icon in the center of the node
      const iconSvgString = iconToString(nodeType);
      const iconSize = 24;
      
      if (iconSvgString) {
        const parser = new DOMParser();
        const iconDoc = parser.parseFromString(iconSvgString, 'image/svg+xml');
        const iconNode = iconDoc.documentElement;
        
        // Append the icon to the node
        node.node()?.appendChild(iconNode);
        
        // Position the icon in the center
        d3.select(iconNode)
          .attr('width', iconSize * 2)
          .attr('height', iconSize * 2)
          .attr('x', -iconSize)
          .attr('y', -iconSize - 8)
          .attr('fill', 'white');
      }
      
      // Add text label inside the node
      node.append('text')
        .attr('class', 'node-inner-label')
        .attr('text-anchor', 'middle')
        .attr('dy', '20px')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text(() => {
          const label = d.name || d.id;
          return label.substring(0, 2);
        });
        
      // Add power value inside the node
      node.append('text')
        .attr('class', 'node-power-value')
        .attr('text-anchor', 'middle')
        .attr('dy', '35px')
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text(() => {
          switch(d.type) {
            case 'pv':
              return d.installed_capacity ? `${d.installed_capacity.toFixed(1)} kW` : '';
            case 'building':
              return d.total_pv_capacity ? `${d.total_pv_capacity.toFixed(1)} kW` : '';
            case 'battery':
              return d.capacity ? `${d.capacity.toFixed(1)} kW` : '';
            case 'charge_point':
              return d.capacity ? `${d.capacity.toFixed(1)} kW` : '';
            default:
              return '';
          }
        });
      
      // Add feature indicators
      if (d.type === 'building' && d.total_pv_capacity && d.total_pv_capacity > 0) {
        node.append('circle')
          .attr('r', 8)
          .attr('cx', 25)
          .attr('cy', -25)
          .attr('fill', NODE_COLORS['pv'])
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#glow)');
      }
      
      if (d.type === 'charge_point' && d.is_v2g) {
        node.append('circle')
          .attr('r', 8)
          .attr('cx', 25)
          .attr('cy', -25)
          .attr('fill', '#10B981')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#glow)');
      }
    });

    // Add labels below nodes
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '4em')
      .attr('fill', d => {
        return d.type === 'pv' ? '#333' : '#fff';
      })
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('class', 'node-label')
      .text((d: Node) => d.name || d.id);
      
    // Add type labels
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '5.5em')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('class', 'node-metric')
      .text((d: Node) => {
        switch(d.type) {
          case 'pv':
            return 'Solar PV';
          case 'building':
            return d.building_type || 'Building';
          case 'battery':
            return 'Battery';
          case 'charge_point':
            return 'Charging';
          case 'grid':
            return 'Grid';
          default:
            return d.type;
        }
      });

    // Update simulation node force with new data
    if (simulation) {
      simulation.nodes(nodeData as d3.SimulationNodeDatum[]);
      
      // Update node positions on simulation tick
      simulation.on('tick', () => {
        nodeSelection.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });
    }

    // Initial update with current hour styling
    updateNodeStyling(nodeSelection, currentHour);

  }, [containerRef, simulation, data.nodes, data.links, selectedNode, onNodeClick, tooltip]);

  // Update node styling when currentHour changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = d3.select(containerRef.current);
    const nodeSelection = container.selectAll('.node');
    
    updateNodeStyling(nodeSelection, currentHour);

  }, [currentHour, containerRef]);

  // Helper function to update node styling based on current hour and energy flows
  const updateNodeStyling = (nodeSelection: d3.Selection<any, any, any, any>, hour: number) => {
    nodeSelection.each(function(d: any) {
      // Check if this node has any active flows in the current hour
      const hasActiveFlow = data.links.some((link: Link) => {
        return (link.source === d.id || link.target === d.id) && 
               Math.abs(link.flow[hour]) >= 0.1;
      });
      
      // Calculate total energy flow for this node at current hour
      const totalEnergyFlow = data.links
        .filter((link: Link) => link.source === d.id || link.target === d.id)
        .reduce((sum, link) => sum + Math.abs(link.flow[hour]), 0);

      // Base radius for calculations
      const baseRadius = 30;
      
      // Add dynamic scaling based on energy flow (max 20% increase)
      const flowScaling = Math.min(0.2, totalEnergyFlow * 0.05);
      const dynamicRadius = baseRadius * (1 + flowScaling);
      const dynamicAuraRadius = dynamicRadius * 1.25;
      
      // Apply the pulse animation class if the node has active flows
      d3.select(this).classed('pulse', hasActiveFlow);
        
      // Apply elastic animations to node circles with energy flow-based sizing
      d3.select(this).select('.node-main')
        .transition()
        .duration(800)
        .ease(d3.easeElastic.period(0.3))
        .attr('r', dynamicRadius);
        
      d3.select(this).select('.node-aura')
        .transition()
        .duration(800)
        .ease(d3.easeElastic.period(0.3))
        .attr('r', dynamicAuraRadius);
    });
  };

  return null; // This component renders directly to SVG via D3
};

export default GraphNodes;
