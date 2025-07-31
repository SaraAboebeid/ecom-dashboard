import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Link, NODE_COLORS } from '../types';
import { iconToString } from './NodeIcons';

interface GraphProps {
  data: GraphData;
  currentHour: number;
  filters: {
    nodeTypes: Set<string>;
    minFlow: number;
  };
  onKPICalculated?: (kpis: {
    totalPVCapacity: number;
    totalEnergyDemand: number;
    totalBatteryCapacity: number;
    totalPVProduction: number;
    totalEmbodiedCO2: number;
  }) => void;
}

export const Graph = ({ data, currentHour, filters, onKPICalculated }: GraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  // Tooltip div ref (created only once)
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  // State for selected node to show in slide panel
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  // Create a stable key for the graph structure
  const graphStructureKey = `${data.nodes.map(n => n.id).sort().join(',')}-${data.links.map(l => `${l.source}-${l.target}`).sort().join(',')}`;
  
  // Create stable keys for filters to prevent unnecessary re-renders
  const nodeTypesKey = Array.from(filters.nodeTypes).sort().join(',');
  const filtersKey = `${nodeTypesKey}-${filters.minFlow}`;
  
  // Helper function to calculate KPIs and summarize data
  const calculateKPIs = () => {
    if (!data.nodes.length) return null;
    
    const kpis = {
      totalPVCapacity: 0,
      totalEnergyDemand: 0,
      totalBatteryCapacity: 0,
      totalPVProduction: 0,
      totalEmbodiedCO2: 0
    };
    
    data.nodes.forEach(node => {
      if (node.type === 'pv') {
        kpis.totalPVCapacity += node.installed_capacity || 0;
        kpis.totalPVProduction += node.annual_production || 0;
        kpis.totalEmbodiedCO2 += node.total_embodied_co2 || 0;
      }
      else if (node.type === 'building') {
        kpis.totalEnergyDemand += node.total_energy_demand || 0;
      }
      else if (node.type === 'battery') {
        kpis.totalBatteryCapacity += node.capacity || 0;
        kpis.totalEmbodiedCO2 += node.total_embodied_co2 || 0;
      }
    });
    
    return kpis;
  };
  
  // Calculate KPIs when data changes
  const kpis = calculateKPIs();
  
  // Notify parent component of calculated KPIs
  useEffect(() => {
    if (kpis && onKPICalculated) {
      onKPICalculated(kpis);
    }
  }, [kpis, onKPICalculated]);

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const { width, height } = svgRef.current.getBoundingClientRect();
        setDimensions(prev => {
          // Only update if dimensions actually changed to prevent unnecessary re-renders
          if (prev.width !== width || prev.height !== height) {
            return { width, height };
          }
          return prev;
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create tooltip div only once
  useEffect(() => {
    if (!tooltipRef.current) {
      const div = document.createElement('div');
      div.className = 'tooltip';
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      
      // Check if dark mode is active to set appropriate tooltip styles
      const isDarkMode = document.documentElement.classList.contains('dark');
      div.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0, 0, 0, 0.8)';
      div.style.color = 'white';
      div.style.padding = '8px';
      div.style.borderRadius = '4px';
      div.style.fontSize = '12px';
      div.style.pointerEvents = 'none'; // Ensures tooltip never captures pointer events
      div.style.zIndex = '1000';
      div.style.userSelect = 'none'; // Prevent text selection
      div.style.maxWidth = '200px';
      div.style.wordWrap = 'break-word';
      div.style.boxShadow = isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.3)';
      div.style.border = isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : 'none';
      document.body.appendChild(div);
      tooltipRef.current = div;
    } else {
      // Always ensure pointer-events is none
      tooltipRef.current.style.pointerEvents = 'none';
    }
    // Add a MutationObserver to update tooltip styles when dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && tooltipRef.current) {
          const isDarkMode = document.documentElement.classList.contains('dark');
          tooltipRef.current.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(0, 0, 0, 0.8)';
          tooltipRef.current.style.boxShadow = isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.3)';
          tooltipRef.current.style.border = isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : 'none';
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
      observer.disconnect();
    };
  }, []);

  // Add an event listener to handle clicks outside the panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If panel is open and click is outside panel and not on a node
      if (selectedNode && 
          event.target instanceof Element && 
          !event.target.closest('.node') && 
          !event.target.closest('.node-details-panel')) {
        setSelectedNode(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedNode]);
  
  // Initialize the simulation only once
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create deep copies to avoid modifying original data
    const nodeData = data.nodes.map(d => ({ ...d }));
    const linkData = data.links.map(d => ({ ...d }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodeData as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(linkData).id((d: any) => d.id).distance(300)) // Increased distance between connected nodes
      .force('charge', d3.forceManyBody().strength(-600)) // Increased repulsion between nodes
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(55)); // Increased collision radius for larger nodes

    simulationRef.current = simulation;

    // Create container for zoom
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create SVG filter for glow effect
    const defs = svg.append('defs');
    
    // Create enhanced glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    // Add blur effect with higher quality
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'blur');
      
    // Add color overlay with enhanced glow
    filter.append('feFlood')
      .attr('flood-color', '#4db8ff')
      .attr('flood-opacity', '0.4')
      .attr('result', 'color');
      
    filter.append('feComposite')
      .attr('in', 'color')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'coloredBlur');
      
    // Merge the original and the colored blur
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'coloredBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');

    // Create node-type specific neon glow filters with pulse animation
    const nodeTypes = ['building', 'pv', 'grid', 'battery', 'charge_point'];
    nodeTypes.forEach(type => {
      const nodeColor = NODE_COLORS[type];
      const filter = defs.append('filter')
        .attr('id', `neon-glow-${type}`)
        .attr('x', '-60%')
        .attr('y', '-60%')
        .attr('width', '220%')
        .attr('height', '220%');
      const typeFilter = defs.append('filter')
        .attr('id', `glow-${type}`)
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
      typeFilter.append('feGaussianBlur')
        .attr('stdDeviation', '12')
        .attr('result', 'blur');
      typeFilter.append('feFlood')
        .attr('flood-color', NODE_COLORS[type])
        .attr('flood-opacity', '1')
        .attr('result', 'color');
      typeFilter.append('feComposite')
        .attr('in', 'color')
        .attr('in2', 'blur')
        .attr('operator', 'in')
        .attr('result', 'coloredBlur');
      const merge = typeFilter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });
      
    // Create linear gradients for each node type's flow
    // PV gradient (neon yellow)
    const pvGradient = defs.append('linearGradient')
      .attr('id', 'gradient-pv')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
      
    pvGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', NODE_COLORS.pv)
      .attr('stop-opacity', 0.7);
    pvGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', NODE_COLORS.pv)
      .attr('stop-opacity', 0.9);
    pvGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', NODE_COLORS.pv)
      .attr('stop-opacity', 0.7);
      
    // Grid gradient (neon green)
    const gridGradient = defs.append('linearGradient')
      .attr('id', 'gradient-grid')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
      
    gridGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', NODE_COLORS.grid)
      .attr('stop-opacity', 0.7);
    gridGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', NODE_COLORS.grid)
      .attr('stop-opacity', 0.9);
    gridGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', NODE_COLORS.grid)
      .attr('stop-opacity', 0.7);
      
    // Battery gradient (neon cyan)
    const batteryGradient = defs.append('linearGradient')
      .attr('id', 'gradient-battery')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
      
    batteryGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', NODE_COLORS.battery)
      .attr('stop-opacity', 0.7);
    batteryGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', NODE_COLORS.battery)
      .attr('stop-opacity', 0.9);
    batteryGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', NODE_COLORS.battery)
      .attr('stop-opacity', 0.7);
      
    // Building gradient (neon magenta)
    const buildingGradient = defs.append('linearGradient')
      .attr('id', 'gradient-building')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
      
    buildingGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', NODE_COLORS.building)
      .attr('stop-opacity', 0.7);
    buildingGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', NODE_COLORS.building)
      .attr('stop-opacity', 0.9);
    buildingGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', NODE_COLORS.building)
      .attr('stop-opacity', 0.7);
      
    // Charge point gradient (neon orange)
    const chargeGradient = defs.append('linearGradient')
      .attr('id', 'gradient-charge')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
      
    chargeGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', NODE_COLORS.charge_point)
      .attr('stop-opacity', 0.7);
    chargeGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', NODE_COLORS.charge_point)
      .attr('stop-opacity', 0.9);
    chargeGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', NODE_COLORS.charge_point)
      .attr('stop-opacity', 0.7);
    
    // Create arrow markers for links with different colors based on node type
    const markerTypes = [
      { id: 'flow-pv', color: NODE_COLORS.pv },
      { id: 'flow-grid', color: NODE_COLORS.grid },
      { id: 'flow-battery', color: NODE_COLORS.battery },
      { id: 'flow-building', color: NODE_COLORS.building },
      { id: 'flow-charge', color: NODE_COLORS.charge_point },
      { id: 'flow', color: '#999' } // Default marker
    ];
    
    defs.selectAll(null)
      .data(markerTypes)
      .enter().append('marker')
      .attr('id', d => d.id)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 40) // Increased to position arrows properly with larger nodes
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', d => d.color)
      .attr('d', 'M0,-5L10,0L0,5');

    // Draw links
    const linkSelection = container.append('g')
      .selectAll('path')
      .data(linkData)
      .enter().append('path')
      .attr('class', (d: Link) => {
        // Set appropriate class based on flow direction
        if (Math.abs(d.flow[currentHour]) > 0) {
          return d.flow[currentHour] > 0 ? 'link link-flow' : 'link link-flow-reverse';
        }
        return 'link';
      })
      .attr('stroke', (d: any) => {
        // Determine the gradient to use based on source node type
        const sourceNode = d.source.type ? d.source : data.nodes.find(n => n.id === d.source);
        const targetNode = d.target.type ? d.target : data.nodes.find(n => n.id === d.target);
        
        if (!sourceNode || !targetNode) return '#999';
        
        // Use appropriate gradient based on energy flow type
        if (sourceNode.type === 'pv') return 'url(#gradient-pv)';
        if (sourceNode.type === 'grid') return 'url(#gradient-grid)';
        if (sourceNode.type === 'battery') return 'url(#gradient-battery)';
        if (sourceNode.type === 'building') return 'url(#gradient-building)';
        if (sourceNode.type === 'charge_point') return 'url(#gradient-charge)';
        
        return '#999';
      })
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', (d: Link) => Math.max(1, Math.abs(d.flow[currentHour]) * 2))
      .attr('marker-end', (d: any) => {
        // Determine the marker to use based on source node type
        const sourceNode = d.source.type ? d.source : data.nodes.find(n => n.id === d.source);
        if (!sourceNode) return 'url(#flow)';
        
        // Use appropriate marker based on energy source type
        if (sourceNode.type === 'pv') return 'url(#flow-pv)';
        if (sourceNode.type === 'grid') return 'url(#flow-grid)';
        if (sourceNode.type === 'battery') return 'url(#flow-battery)';
        if (sourceNode.type === 'building') return 'url(#flow-building)';
        if (sourceNode.type === 'charge_point') return 'url(#flow-charge)';
        
        return 'url(#flow)';
      })
      .attr('stroke-dasharray', '12 12')  // Create dashed line pattern for animation
      .attr('fill', 'none');

    // Draw nodes
    const nodeSelection = container.append('g')
      .selectAll('g')
      .data(nodeData)
      .enter().append('g')
      .attr('class', d => `node node-${d.type}`)
      .classed('pulse', d => {
        // Add pulse animation for active nodes (those with energy flowing in or out)
        const hasActiveLinks = data.links.some(link => 
          (link.source === d.id || link.target === d.id) && 
          Math.abs(link.flow[currentHour]) > 0
        );
        return hasActiveLinks;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d: Node) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .on('mouseover', function() {
        d3.select(this).classed('hover', true);
      })
      .on('mouseout', function() {
        d3.select(this).classed('hover', false);
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add neon outer aura ring with animated glow (smaller, fits icon/text)
    nodeSelection.append('circle')
      .attr('class', d => `node-aura node-aura-${d.type} neon-glow`)
      .attr('r', (d: Node) => {
        // Outer ring is 1.25x the main node radius, base radius reduced for compactness
        let baseRadius = 32;
        let r = baseRadius;
        switch(d.type) {
          case 'building':
            r = d.total_energy_demand ? baseRadius + Math.min(6, Math.sqrt(d.total_energy_demand) / 30) : baseRadius;
            break;
          case 'pv':
            r = d.installed_capacity ? baseRadius + Math.min(8, d.installed_capacity / 2) : baseRadius;
            break;
          case 'battery':
            r = d.capacity ? baseRadius + Math.min(10, d.capacity / 10) : baseRadius;
            break;
          case 'charge_point':
            r = d.total_connected_evs ? baseRadius + Math.min(6, d.total_connected_evs * 2) : baseRadius;
            break;
          default:
            r = baseRadius;
        }
        return r * 1.25;
      })
      .attr('fill', 'none')
      .attr('stroke', d => NODE_COLORS[d.type])
      .attr('stroke-width', 4)
      .attr('opacity', 1)
      .attr('filter', d => `url(#neon-glow-${d.type})`);

    // Main node circle (smaller, neon fill, fits icon/text)
    nodeSelection.append('circle')
      .attr('class', d => `node-main node-main-${d.type}`)
      .attr('r', (d: Node) => {
        // Base radius reduced for compactness
        let baseRadius = 32;
        switch(d.type) {
          case 'building':
            return d.total_energy_demand ? baseRadius + Math.min(6, Math.sqrt(d.total_energy_demand) / 30) : baseRadius;
          case 'pv':
            return d.installed_capacity ? baseRadius + Math.min(8, d.installed_capacity / 2) : baseRadius;
          case 'battery':
            return d.capacity ? baseRadius + Math.min(10, d.capacity / 10) : baseRadius;
          case 'charge_point':
            return d.total_connected_evs ? baseRadius + Math.min(6, d.total_connected_evs * 2) : baseRadius;
          default:
            return baseRadius;
        }
      })
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('stroke', d => NODE_COLORS[d.type])
      .attr('stroke-width', 2)
      .attr('filter', d => `url(#neon-glow-${d.type})`);

    // Add SVG icons inside nodes
    nodeSelection.each(function(d: Node) {
      const node = d3.select(this);
      const nodeType = d.type;
      
      // Insert SVG icon in the center of the node
      const iconSvgString = iconToString(nodeType);
      const iconSize = 24; // Increased icon size to match larger nodes
      
      if (iconSvgString) {
        const parser = new DOMParser();
        const iconDoc = parser.parseFromString(iconSvgString, 'image/svg+xml');
        const iconNode = iconDoc.documentElement;
        
        // Append the icon to the node
        node.node()?.appendChild(iconNode);
        
        // Position the icon in the center but slightly above center to make room for text
        d3.select(iconNode)
          .attr('width', iconSize * 2)
          .attr('height', iconSize * 2)
          .attr('x', -iconSize)
          .attr('y', -iconSize - 8) // Move icon slightly more upward for larger node
          .attr('fill', 'white');
      }
      
      // Add text label inside the node (short name or first letter of ID)
      node.append('text')
        .attr('class', 'node-inner-label')
        .attr('text-anchor', 'middle')
        .attr('dy', '20px') // Position even lower below the icon
        .attr('fill', 'white')
        .attr('font-size', '12px') // Increased font size for better visibility
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text(() => {
          // Use first two characters of name or id for the inner label
          const label = d.name || d.id;
          return label.substring(0, 2);
        });
        
      // Add power value inside the node
      node.append('text')
        .attr('class', 'node-power-value')
        .attr('text-anchor', 'middle')
        .attr('dy', '35px') // Position further below the text label
        .attr('fill', 'white')
        .attr('font-size', '11px') // Larger font size for better readability
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text(() => {
          // Return the appropriate power value based on node type
          switch(d.type) {
            case 'pv':
              return d.installed_capacity ? `${d.installed_capacity.toFixed(1)} kW` : '';
            case 'building':
              // For buildings we might show demand in kW (assuming it's per hour) or use another appropriate measure
              return d.total_pv_capacity ? `${d.total_pv_capacity.toFixed(1)} kW` : '';
            case 'battery':
              return d.capacity ? `${d.capacity.toFixed(1)} kW` : '';
            case 'charge_point':
              return d.capacity ? `${d.capacity.toFixed(1)} kW` : '';
            default:
              return '';
          }
        });
      
      // Add feature indicators (small dots)
      if (d.type === 'building' && d.total_pv_capacity && d.total_pv_capacity > 0) {
        // Add small solar indicator for buildings with PV
        node.append('circle')
          .attr('r', 8) // Slightly larger indicator for bigger nodes
          .attr('cx', 25) // Adjusted position for larger node
          .attr('cy', -25) // Adjusted position for larger node
          .attr('fill', NODE_COLORS['pv'])
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#glow)');
      }
      
      if (d.type === 'charge_point' && d.is_v2g) {
        // Add V2G indicator for charge points with V2G capability
        node.append('circle')
          .attr('r', 8) // Slightly larger indicator for bigger nodes
          .attr('cx', 25) // Adjusted position for larger node
          .attr('cy', -25) // Adjusted position for larger node
          .attr('fill', '#10B981')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#glow)');
      }
    });
    
    // Add labels below nodes (now smaller since we have internal labels)
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '4em') // Moved further down to account for larger node size 
      .attr('fill', d => {
        // Use dark text for bright nodes and light text for dark nodes
        return d.type === 'pv' ? '#333' : '#fff';
      })
      .attr('font-size', '12px') // Larger font for better visibility with bigger nodes
      .attr('font-weight', 'bold')
      .attr('class', 'node-label')
      .text((d: Node) => d.name || d.id);
      
    // Add type labels (instead of power values which are now inside the node)
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '5.5em') // Moved further down to account for larger node size
      .attr('fill', '#fff')
      .attr('font-size', '10px') // Larger font for better visibility with bigger nodes
      .attr('class', 'node-metric')
      .text((d: Node) => {
        // Show the node type in a more human-readable format
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

    // Use tooltipRef for tooltip
    const tooltip = tooltipRef.current;
    let hideTooltipTimeout: number | null = null;

    // Helper to show tooltip
    function showTooltip(html: string, event: any) {
      if (!tooltip) return;
      if (hideTooltipTimeout) {
        clearTimeout(hideTooltipTimeout);
        hideTooltipTimeout = null;
      }
      tooltip.innerHTML = html;
      tooltip.style.visibility = 'visible';
      // Position tooltip away from cursor to prevent interference
      tooltip.style.left = (event.pageX + 15) + 'px';
      tooltip.style.top = (event.pageY - 35) + 'px';
    }
    // Helper to hide tooltip with debounce
    function hideTooltip() {
      if (!tooltip) return;
      if (hideTooltipTimeout) clearTimeout(hideTooltipTimeout);
      hideTooltipTimeout = setTimeout(() => {
        if (tooltip) tooltip.style.visibility = 'hidden';
      }, 80); // 80ms debounce
    }

    // Add hover events to links with enhanced flow information
    linkSelection
      .on('mouseover', (event, d: any) => {
        event.stopPropagation();
        const currentFlow = Math.abs(d.flow[currentHour]).toFixed(2);
        const sourceName = d.source.name || d.source.id;
        const targetName = d.target.name || d.target.id;
        
        // Calculate average and max flow for context
        const nonZeroFlows = d.flow.filter((f: number) => f > 0);
        const avgFlow = nonZeroFlows.length > 0 
          ? (nonZeroFlows.reduce((sum: number, val: number) => sum + val, 0) / nonZeroFlows.length).toFixed(2) 
          : 0;
        const maxFlow = Math.max(...d.flow).toFixed(2);
        
        // Get source and target node types for additional context
        const sourceType = d.source.type;
        const targetType = d.target.type;
        
        // Build tooltip content
        let tooltipContent = `<strong>${sourceName} → ${targetName}</strong><br/>`;
        tooltipContent += `Current Flow: ${currentFlow} kWh<br/>`;
        tooltipContent += `Average Flow: ${avgFlow} kWh<br/>`;
        tooltipContent += `Max Flow: ${maxFlow} kWh<br/>`;
        
        // Add energy flow description based on node types
        if (sourceType === 'pv' && targetType === 'building') {
          tooltipContent += `<br/><span style="color:#F59E0B">Solar energy supplying building</span>`;
        } else if (sourceType === 'building' && targetType === 'battery') {
          tooltipContent += `<br/><span style="color:#3B82F6">Building energy to battery storage</span>`;
        } else if (sourceType === 'building' && targetType === 'grid') {
          tooltipContent += `<br/><span style="color:#10B981">Building exporting to grid</span>`;
        } else if (sourceType === 'battery' && targetType === 'building') {
          tooltipContent += `<br/><span style="color:#3B82F6">Battery supplying building</span>`;
        } else if (sourceType === 'grid' && targetType === 'building') {
          tooltipContent += `<br/><span style="color:#10B981">Grid supplying building</span>`;
        }
        
        showTooltip(tooltipContent, event);
      })
      .on('mousemove', (event) => {
        event.stopPropagation();
        if (!tooltip) return;
        tooltip.style.left = (event.pageX + 15) + 'px';
        tooltip.style.top = (event.pageY - 35) + 'px';
      })
      .on('mouseout', (event) => {
        event.stopPropagation();
        hideTooltip();
      });

    // Add hover events to nodes with enhanced data display
    nodeSelection
      .on('mouseover', (event, d: Node) => {
        // Prevent event bubbling that could cause flickering
        event.stopPropagation();
        // Don't show tooltip if panel is open
        if (selectedNode) return;
        const displayName = d.name || d.id;
        
        // Build tooltip content based on node type and available data
        let tooltipContent = `<strong>${displayName}</strong><br/>Type: ${d.type}<br/>ID: ${d.id}`;
        
        // Add type-specific information
        switch(d.type) {
          case 'building':
            if (d.building_type) tooltipContent += `<br/>Building Type: ${d.building_type}`;
            if (d.area) tooltipContent += `<br/>Area: ${d.area.toFixed(2)} m²`;
            if (d.owner) tooltipContent += `<br/>Owner: ${d.owner}`;
            if (d.total_energy_demand) tooltipContent += `<br/>Energy Demand: ${d.total_energy_demand.toFixed(2)} kWh`;
            break;
          
          case 'pv':
            if (d.installed_capacity) tooltipContent += `<br/>Capacity: ${d.installed_capacity.toFixed(2)} kW`;
            if (d.annual_production) tooltipContent += `<br/>Annual Production: ${d.annual_production.toFixed(2)} kWh`;
            if (d.total_cost) tooltipContent += `<br/>Total Cost: ${d.total_cost.toFixed(2)} SEK`;
            if (d.total_embodied_co2) tooltipContent += `<br/>Embodied CO₂: ${d.total_embodied_co2.toFixed(2)} kgCO₂e`;
            break;
          
          case 'battery':
            if (d.capacity) tooltipContent += `<br/>Capacity: ${d.capacity.toFixed(2)} kWh`;
            if (d.total_cost) tooltipContent += `<br/>Cost: ${d.total_cost.toFixed(2)} SEK`;
            if (d.total_embodied_co2) tooltipContent += `<br/>Embodied CO₂: ${d.total_embodied_co2.toFixed(2)} kgCO₂e`;
            break;
          
          case 'charge_point':
            if (d.capacity) tooltipContent += `<br/>Capacity: ${d.capacity.toFixed(2)} kW`;
            if (d.is_v2g !== undefined) tooltipContent += `<br/>V2G Enabled: ${d.is_v2g ? 'Yes' : 'No'}`;
            if (d.total_connected_evs) tooltipContent += `<br/>Connected EVs: ${d.total_connected_evs}`;
            if (d.owner) tooltipContent += `<br/>Owner: ${d.owner}`;
            break;
          
          case 'grid':
            // Grid-specific data if available
            break;
        }
        
        showTooltip(tooltipContent, event);
      })
      .on('mousemove', (event) => {
        event.stopPropagation();
        if (!tooltip) return;
        tooltip.style.left = (event.pageX + 15) + 'px';
        tooltip.style.top = (event.pageY - 35) + 'px';
      })
      .on('mouseout', (event) => {
        event.stopPropagation();
        hideTooltip();
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkSelection.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      nodeSelection.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup function
    return () => {
      simulation.stop();
      // Do not remove tooltip here; it's managed by the outer effect
    };
  }, [graphStructureKey, dimensions.width, dimensions.height, filtersKey, selectedNode]); // Only recreate when actual structure or filters change

  // Update link widths and colors when currentHour changes (without recreating the entire graph)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const linkSelection = svg.selectAll('.link');
    const nodeSelection = svg.selectAll('.node');
    
    // Update links
    linkSelection
      .transition()
      .duration(300)
      .attr('stroke-width', (d: any) => Math.max(1, Math.abs(d.flow[currentHour]) * 2))
      .attr('stroke-opacity', (d: any) => Math.abs(d.flow[currentHour]) > 0 ? 0.8 : 0.3)
      .attr('class', (d: any) => {
        // Update animation class based on flow direction
        if (Math.abs(d.flow[currentHour]) > 0) {
          return d.flow[currentHour] > 0 ? 'link link-flow' : 'link link-flow-reverse';
        }
        return 'link';
      })
      .attr('stroke', (d: any) => {
        // Determine the gradient to use based on source node type
        const sourceNode = d.source.type ? d.source : data.nodes.find((n: any) => n.id === d.source);
        const targetNode = d.target.type ? d.target : data.nodes.find((n: any) => n.id === d.target);
        
        if (!sourceNode || !targetNode) return '#999';
        
        // If flow is too low, use a neutral color
        if (Math.abs(d.flow[currentHour]) < 0.01) return '#999';
        
        // Use appropriate gradient based on energy flow type
        if (sourceNode.type === 'pv') return 'url(#gradient-pv)';
        if (sourceNode.type === 'grid') return 'url(#gradient-grid)';
        if (sourceNode.type === 'battery') return 'url(#gradient-battery)';
        if (sourceNode.type === 'building') return 'url(#gradient-building)';
        if (sourceNode.type === 'charge_point') return 'url(#gradient-charge)';
        
        return '#999';
      })
      .attr('marker-end', (d: any) => {
        // Determine the marker to use based on source node type
        const sourceNode = d.source.type ? d.source : data.nodes.find((n: any) => n.id === d.source);
        if (!sourceNode) return 'url(#flow)';
        
        // If flow is too low, use the default marker
        if (Math.abs(d.flow[currentHour]) < 0.01) return 'url(#flow)';
        
        // Use appropriate marker based on energy source type
        if (sourceNode.type === 'pv') return 'url(#flow-pv)';
        if (sourceNode.type === 'grid') return 'url(#flow-grid)';
        if (sourceNode.type === 'battery') return 'url(#flow-battery)';
        if (sourceNode.type === 'building') return 'url(#flow-building)';
        if (sourceNode.type === 'charge_point') return 'url(#flow-charge)';
        
        return 'url(#flow)';
      });
      
    // Update nodes - add/remove pulse animation class based on active connections
    nodeSelection.each(function(d: any) {
      // Check if this node has any active flows in the current hour
      const hasActiveFlow = data.links.some((link: Link) => {
        return (link.source === d.id || link.target === d.id) && 
               Math.abs(link.flow[currentHour]) >= 0.1;
      });
      
      // Apply the pulse animation class if the node has active flows
      d3.select(this)
        .classed('pulse', hasActiveFlow);
    });

  }, [currentHour, data.nodes, data.links]); // Only update visual properties when hour changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      // Tooltip is removed by the tooltip effect above
    };
  }, []);

  // Node details slide-in panel
  const renderNodeDetailsPanel = () => {
    if (!selectedNode) return null;
    
    const getAttributesByNodeType = () => {
      switch(selectedNode.type) {
        case 'building':
          return (
            <>
              {selectedNode.building_type && (
                <div className="mb-2">
                  <span className="font-semibold">Building Type:</span> {selectedNode.building_type}
                </div>
              )}
              {selectedNode.area !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Area:</span> {selectedNode.area.toFixed(2)} m²
                </div>
              )}
              {selectedNode.owner && (
                <div className="mb-2">
                  <span className="font-semibold">Owner:</span> {selectedNode.owner}
                </div>
              )}
              {selectedNode.total_energy_demand !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Energy Demand:</span> {selectedNode.total_energy_demand.toFixed(2)} kWh
                </div>
              )}
              {selectedNode.total_pv_capacity !== undefined && selectedNode.total_pv_capacity > 0 && (
                <div className="mb-2">
                  <span className="font-semibold">PV Capacity:</span> {selectedNode.total_pv_capacity.toFixed(2)} kW
                </div>
              )}
            </>
          );
        case 'pv':
          return (
            <>
              {selectedNode.installed_capacity !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Capacity:</span> {selectedNode.installed_capacity.toFixed(2)} kW
                </div>
              )}
              {selectedNode.annual_production !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Annual Production:</span> {selectedNode.annual_production.toFixed(2)} kWh
                </div>
              )}
              {selectedNode.total_cost !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Total Cost:</span> {selectedNode.total_cost.toFixed(2)} SEK
                </div>
              )}
              {selectedNode.total_embodied_co2 !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Embodied CO₂:</span> {selectedNode.total_embodied_co2.toFixed(2)} kgCO₂e
                </div>
              )}
            </>
          );
        case 'battery':
          return (
            <>
              {selectedNode.capacity !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Capacity:</span> {selectedNode.capacity.toFixed(2)} kWh
                </div>
              )}
              {selectedNode.total_cost !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Cost:</span> {selectedNode.total_cost.toFixed(2)} SEK
                </div>
              )}
              {selectedNode.total_embodied_co2 !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Embodied CO₂:</span> {selectedNode.total_embodied_co2.toFixed(2)} kgCO₂e
                </div>
              )}
            </>
          );
        case 'charge_point':
          return (
            <>
              {selectedNode.capacity !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Capacity:</span> {selectedNode.capacity.toFixed(2)} kW
                </div>
              )}
              {selectedNode.is_v2g !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">V2G Enabled:</span> {selectedNode.is_v2g ? 'Yes' : 'No'}
                </div>
              )}
              {selectedNode.total_connected_evs !== undefined && (
                <div className="mb-2">
                  <span className="font-semibold">Connected EVs:</span> {selectedNode.total_connected_evs}
                </div>
              )}
              {selectedNode.owner && (
                <div className="mb-2">
                  <span className="font-semibold">Owner:</span> {selectedNode.owner}
                </div>
              )}
            </>
          );
        case 'grid':
          return (
            <div className="mb-2">
              <span className="font-semibold">Type:</span> Electrical Grid
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div 
        className={`node-details-panel fixed top-0 right-0 h-full bg-white dark:bg-gray-800 w-80 shadow-lg transform transition-transform duration-300 ease-in-out ${
          selectedNode ? 'translate-x-0' : 'translate-x-full'
        } z-10 overflow-y-auto`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedNode.name || selectedNode.id}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <div className="mb-4 inline-block px-3 py-1 rounded-full text-sm font-medium text-white" 
               style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}>
            {selectedNode.type.replace('_', ' ')}
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Attributes</h4>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <div className="mb-2">
                  <span className="font-semibold">ID:</span> {selectedNode.id}
                </div>
                {getAttributesByNodeType()}
              </div>
            </div>
            
            {selectedNode.type === 'pv' && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">KPIs</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                    <div className="text-xl font-bold">{selectedNode.annual_production?.toFixed(2) || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Annual Production (kWh)</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
                    <div className="text-xl font-bold">{selectedNode.installed_capacity?.toFixed(2) || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Installed Capacity (kW)</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
                    <div className="text-xl font-bold">{selectedNode.total_embodied_co2?.toFixed(2) || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Embodied CO₂ (kgCO₂e)</div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedNode.type === 'building' && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">KPIs</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-lg">
                    <div className="text-xl font-bold">{selectedNode.total_energy_demand?.toFixed(2) || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Energy Demand (kWh)</div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedNode.type === 'battery' && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">KPIs</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                    <div className="text-xl font-bold">{selectedNode.capacity?.toFixed(2) || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Capacity (kWh)</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
                    <div className="text-xl font-bold">{selectedNode.total_embodied_co2?.toFixed(2) || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Embodied CO₂ (kgCO₂e)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add neon-glow pulse animation style
  // This style is injected only once
  useEffect(() => {
    if (!document.getElementById('neon-glow-style')) {
      const style = document.createElement('style');
      style.id = 'neon-glow-style';
      style.innerHTML = `
        .neon-glow {
          filter: none;
          animation: neon-pulse 2.2s infinite alternate;
        }
        @keyframes neon-pulse {
          0% { filter: brightness(1.1) drop-shadow(0 0 16px #fff); }
          50% { filter: brightness(1.6) drop-shadow(0 0 32px #fff); }
          100% { filter: brightness(1.1) drop-shadow(0 0 16px #fff); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full bg-gray-900 dark:bg-black transition-colors duration-300"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      />
      {/* Add background overlay when panel is open */}
      <div 
        className={`fixed inset-0 bg-black dark:bg-gray-950 transition-opacity duration-300 ease-in-out ${
          selectedNode ? 'opacity-30 z-10' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSelectedNode(null)}
      />
      {renderNodeDetailsPanel()}
    </div>
  );
};
