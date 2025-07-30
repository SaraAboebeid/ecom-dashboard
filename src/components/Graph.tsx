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
}

export const Graph = ({ data, currentHour, filters }: GraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  // Tooltip div ref (created only once)
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  
  // Create a stable key for the graph structure
  const graphStructureKey = `${data.nodes.map(n => n.id).sort().join(',')}-${data.links.map(l => `${l.source}-${l.target}`).sort().join(',')}`;
  
  // Create stable keys for filters to prevent unnecessary re-renders
  const nodeTypesKey = Array.from(filters.nodeTypes).sort().join(',');
  const filtersKey = `${nodeTypesKey}-${filters.minFlow}`;

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
      div.style.background = 'rgba(0, 0, 0, 0.8)';
      div.style.color = 'white';
      div.style.padding = '8px';
      div.style.borderRadius = '4px';
      div.style.fontSize = '12px';
      div.style.pointerEvents = 'none'; // Ensures tooltip never captures pointer events
      div.style.zIndex = '1000';
      div.style.userSelect = 'none'; // Prevent text selection
      div.style.maxWidth = '200px';
      div.style.wordWrap = 'break-word';
      document.body.appendChild(div);
      tooltipRef.current = div;
    } else {
      // Always ensure pointer-events is none
      tooltipRef.current.style.pointerEvents = 'none';
    }
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
    };
  }, []);

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

    // Create arrow marker for links
    svg.append('defs').selectAll('marker')
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
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: Link) => Math.max(1, Math.abs(d.flow[currentHour]) * 2))
      .attr('marker-end', 'url(#flow)')
      .attr('fill', 'none');

    // Draw nodes
    const nodeSelection = container.append('g')
      .selectAll('g')
      .data(nodeData)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add circles for nodes
    nodeSelection.append('circle')
      .attr('r', 20)
      .attr('fill', (d: Node) => NODE_COLORS[d.type])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels
    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text((d: Node) => d.name || d.id);

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

    // Add hover events to links
    linkSelection
      .on('mouseover', (event, d: any) => {
        event.stopPropagation();
        const flow = Math.abs(d.flow[currentHour]).toFixed(2);
        const sourceName = d.source.name || d.source.id;
        const targetName = d.target.name || d.target.id;
        showTooltip(`${sourceName} → ${targetName}<br/>${flow} kWh`, event);
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

    // Add hover events to nodes
    nodeSelection
      .on('mouseover', (event, d: Node) => {
        // Prevent event bubbling that could cause flickering
        event.stopPropagation();
        const displayName = d.name || d.id;
        showTooltip(`${displayName}<br/>Type: ${d.type}<br/>ID: ${d.id}`, event);
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
  }, [graphStructureKey, dimensions.width, dimensions.height, filtersKey]); // Only recreate when actual structure or filters change

  // Update link widths and colors when currentHour changes (without recreating the entire graph)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const linkSelection = svg.selectAll('.link');
    
    linkSelection
      .transition()
      .duration(300)
      .attr('stroke-width', (d: any) => Math.max(1, Math.abs(d.flow[currentHour]) * 2))
      .attr('stroke-opacity', (d: any) => Math.abs(d.flow[currentHour]) > 0 ? 0.8 : 0.3);

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

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full bg-gray-100 dark:bg-gray-900"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};
