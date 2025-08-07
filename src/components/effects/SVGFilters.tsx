import { useEffect } from 'react';
import * as d3 from 'd3';
import { NODE_COLORS } from '../../types';

interface SVGFiltersProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

/**
 * Component that creates and manages all SVG filters for the graph
 */
export const SVGFilters: React.FC<SVGFiltersProps> = ({ svgRef }) => {
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');

    // Clear existing filters
    defs.selectAll('*').remove() as any;

    // Create enhanced glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'blur');
      
    glowFilter.append('feFlood')
      .attr('flood-color', '#4db8ff')
      .attr('flood-opacity', '0.4')
      .attr('result', 'color');
      
    glowFilter.append('feComposite')
      .attr('in', 'color')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'coloredBlur');
      
    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create 3D depth shadow filter for nodes
    const depthShadowFilter = defs.append('filter')
      .attr('id', 'depth-shadow')
      .attr('x', '-60%')
      .attr('y', '-60%')
      .attr('width', '220%')
      .attr('height', '220%');
    
    depthShadowFilter.append('feDropShadow')
      .attr('dx', '3')
      .attr('dy', '5')
      .attr('stdDeviation', '4')
      .attr('flood-color', '#000000')
      .attr('flood-opacity', '0.3')
      .attr('result', 'dropShadow');
    
    depthShadowFilter.append('feOffset')
      .attr('in', 'SourceGraphic')
      .attr('dx', '-1')
      .attr('dy', '-2')
      .attr('result', 'offset');
    
    depthShadowFilter.append('feGaussianBlur')
      .attr('in', 'offset')
      .attr('stdDeviation', '2')
      .attr('result', 'blur');
    
    depthShadowFilter.append('feFlood')
      .attr('flood-color', '#ffffff')
      .attr('flood-opacity', '0.15')
      .attr('result', 'highlight');
    
    depthShadowFilter.append('feComposite')
      .attr('in', 'highlight')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'innerHighlight');
    
    const depthMerge = depthShadowFilter.append('feMerge');
    depthMerge.append('feMergeNode').attr('in', 'dropShadow');
    depthMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    depthMerge.append('feMergeNode').attr('in', 'innerHighlight');

    // Create subtle line shadow filter
    const lineShadowFilter = defs.append('filter')
      .attr('id', 'line-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    lineShadowFilter.append('feDropShadow')
      .attr('dx', '1')
      .attr('dy', '2')
      .attr('stdDeviation', '2')
      .attr('flood-color', '#000000')
      .attr('flood-opacity', '0.2');

    // Create node-type specific neon glow filters
    const nodeTypes = ['building', 'pv', 'grid', 'battery', 'charge_point'];
    nodeTypes.forEach(type => {
      const nodeColor = NODE_COLORS[type];
      
      // Enhanced neon glow filter with 3D depth
      const neonFilter = defs.append('filter')
        .attr('id', `neon-glow-${type}`)
        .attr('x', '-80%')
        .attr('y', '-80%')
        .attr('width', '260%')
        .attr('height', '260%');
      
      // Create layered shadow for depth
      neonFilter.append('feDropShadow')
        .attr('dx', '4')
        .attr('dy', '6')
        .attr('stdDeviation', '3')
        .attr('flood-color', '#000000')
        .attr('flood-opacity', '0.4')
        .attr('result', 'shadow1');
      
      neonFilter.append('feDropShadow')
        .attr('dx', '2')
        .attr('dy', '3')
        .attr('stdDeviation', '2')
        .attr('flood-color', nodeColor)
        .attr('flood-opacity', '0.6')
        .attr('result', 'shadow2');
      
      // Create the main glow effect
      neonFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', '6')
        .attr('result', 'glow');
      
      neonFilter.append('feFlood')
        .attr('flood-color', nodeColor)
        .attr('flood-opacity', '0.8')
        .attr('result', 'glowColor');
      
      neonFilter.append('feComposite')
        .attr('in', 'glowColor')
        .attr('in2', 'glow')
        .attr('operator', 'in')
        .attr('result', 'coloredGlow');
      
      // Add inner highlight for 3D effect
      neonFilter.append('feOffset')
        .attr('in', 'SourceGraphic')
        .attr('dx', '-1')
        .attr('dy', '-2')
        .attr('result', 'highlight');
      
      neonFilter.append('feGaussianBlur')
        .attr('in', 'highlight')
        .attr('stdDeviation', '1')
        .attr('result', 'softHighlight');
      
      neonFilter.append('feFlood')
        .attr('flood-color', '#ffffff')
        .attr('flood-opacity', '0.3')
        .attr('result', 'white');
      
      neonFilter.append('feComposite')
        .attr('in', 'white')
        .attr('in2', 'softHighlight')
        .attr('operator', 'in')
        .attr('result', 'innerLight');
      
      // Merge all effects for layered 3D appearance
      const neonMerge = neonFilter.append('feMerge');
      neonMerge.append('feMergeNode').attr('in', 'shadow1');
      neonMerge.append('feMergeNode').attr('in', 'shadow2');
      neonMerge.append('feMergeNode').attr('in', 'coloredGlow');
      neonMerge.append('feMergeNode').attr('in', 'SourceGraphic');
      neonMerge.append('feMergeNode').attr('in', 'innerLight');
      
      // Create standard glow filter for smaller elements
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
        
      const typeFilterMerge = typeFilter.append('feMerge');
      typeFilterMerge.append('feMergeNode').attr('in', 'coloredBlur');
      typeFilterMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

  }, [svgRef]);

  return null; // This component only creates SVG filters, no JSX
};

export default SVGFilters;
