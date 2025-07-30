import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Link, NODE_COLORS } from '../types';

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
      .force('link', d3.forceLink(linkData).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

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
    
    // Create filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-40%')
      .attr('y', '-40%')
      .attr('width', '180%')
      .attr('height', '180%');
    
    // Add blur effect
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
      
    // Add color overlay
    filter.append('feFlood')
      .attr('flood-color', '#4db8ff')
      .attr('flood-opacity', '0.3')
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
    
    // Create arrow marker for links
    defs.selectAll('marker')
      .data(['flow'])
      .enter().append('marker')
      .attr('id', d => d)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#999')
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
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: Link) => Math.max(1, Math.abs(d.flow[currentHour]) * 2))
      .attr('marker-end', 'url(#flow)')
      .attr('stroke-dasharray', '12 12')  // Create dashed line pattern for animation
      .attr('fill', 'none');

    // Draw nodes
    const nodeSelection = container.append('g')
      .selectAll('g')
      .data(nodeData)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (event, d: Node) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add circles for nodes with size based on capacity/demand
    nodeSelection.append('circle')
      .attr('r', (d: Node) => {
        // Base radius is 15, scale up based on node type and properties
        let baseRadius = 15;
        
        switch(d.type) {
          case 'building':
            // Scale by total energy demand if available
            return d.total_energy_demand ? 
              baseRadius + Math.min(10, Math.sqrt(d.total_energy_demand) / 30) : baseRadius;
          
          case 'pv':
            // Scale by installed capacity
            return d.installed_capacity ? 
              baseRadius + Math.min(12, d.installed_capacity / 2) : baseRadius;
          
          case 'battery':
            // Scale by capacity
            return d.capacity ?
              baseRadius + Math.min(15, d.capacity / 10) : baseRadius;
              
          case 'charge_point':
            // Scale by capacity or number of EVs
            return d.capacity ?
              baseRadius + Math.min(10, d.capacity / 20) : baseRadius;
              
          default:
            return baseRadius;
        }
      })
      .attr('fill', (d: Node) => NODE_COLORS[d.type])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add visual indicators for node capabilities/properties
    nodeSelection.each(function(d: Node) {
      const node = d3.select(this);
      
      // Add small indicators based on node properties
      if (d.type === 'building' && d.total_pv_capacity && d.total_pv_capacity > 0) {
        // Add small solar indicator for buildings with PV
        node.append('circle')
          .attr('r', 5)
          .attr('cx', 15)
          .attr('cy', -15)
          .attr('fill', NODE_COLORS['pv'])
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      }
      
      if (d.type === 'charge_point' && d.is_v2g) {
        // Add V2G indicator for charge points with V2G capability
        node.append('circle')
          .attr('r', 5)
          .attr('cx', 15)
          .attr('cy', -15)
          .attr('fill', '#10B981')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      }
    });
    
    // Add labels with enhanced information
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text((d: Node) => {
        // Show name with additional info based on node type
        const name = d.name || d.id;
        
        // Keep label simple for readability, details will be in tooltip
        return name;
      });
      
    // Add secondary labels with key metrics
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.6em')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .text((d: Node) => {
        // Show relevant metrics based on node type
        switch(d.type) {
          case 'pv':
            return d.installed_capacity ? `${d.installed_capacity.toFixed(1)} kW` : '';
          case 'building':
            return d.total_energy_demand ? `${Math.round(d.total_energy_demand)} kWh` : '';
          case 'battery':
            return d.capacity ? `${d.capacity.toFixed(1)} kWh` : '';
          case 'charge_point':
            return d.capacity ? `${d.capacity.toFixed(1)} kW` : '';
          default:
            return '';
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
      });

  }, [currentHour]); // Only update visual properties when hour changes

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

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full bg-gray-100 dark:bg-gray-900 transition-colors duration-300"
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
