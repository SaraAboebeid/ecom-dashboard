import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, NODE_COLORS } from '../../types';

interface GraphParticlesProps {
  containerRef: React.RefObject<SVGGElement | null>;
  data: GraphData;
  currentHour: number;
  isPlaying?: boolean;
}

/**
 * Component responsible for particle animations representing energy flow
 * Creates animated particles that move along links to visualize energy transfer
 */
export const GraphParticles: React.FC<GraphParticlesProps> = ({
  containerRef,
  data,
  currentHour,
  isPlaying = false
}) => {
  const particleTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = d3.select(containerRef.current);
    
    // Create particles container if it doesn't exist
    let particleContainer = container.select('.particles');
    if (particleContainer.empty()) {
      particleContainer = container.append('g').attr('class', 'particles') as any;
    }

    // Clear existing timeouts and particles
    particleTimeoutsRef.current.forEach(clearTimeout);
    particleTimeoutsRef.current = [];
    particleContainer.selectAll('.particle').remove();

    // Only show animated particles if timeline is playing
    if (!isPlaying) {
      return;
    }

    const createParticles = () => {
      // Filter for significant flows and limit total particles for performance
      const significantLinks = data.links
        .filter(link => Math.abs(link.flow[currentHour]) > 0.01)
        .sort((a, b) => Math.abs(b.flow[currentHour]) - Math.abs(a.flow[currentHour]))
        .slice(0, 15); // Limit to top 15 flows

      significantLinks.forEach((link, linkIndex) => {
        const flowValue = Math.abs(link.flow[currentHour]);
        
        // Find source and target nodes with positions
        const sourceNode = data.nodes.find(n => n.id === link.source);
        const targetNode = data.nodes.find(n => n.id === link.target);
        
        // Skip if nodes don't have positions
        if (!sourceNode || !targetNode || 
            sourceNode.x === undefined || sourceNode.y === undefined ||
            targetNode.x === undefined || targetNode.y === undefined) {
          return;
        }

        const linkWithPositions = {
          source: sourceNode,
          target: targetNode
        };

        // Number of particles based on flow intensity (1-3 particles)
        const numParticles = Math.min(3, Math.max(1, Math.floor(flowValue * 2)));
        
        // Get source node color for particles
        const particleColor = sourceNode ? NODE_COLORS[sourceNode.type] : '#999';
        
        for (let i = 0; i < numParticles; i++) {
          // Calculate proportional particle size based on flow
          const baseNodeRadius = 32;
          const maxParticleSize = 4;
          const minParticleSize = 1;
          const flowBasedSize = Math.min(maxParticleSize, minParticleSize + (flowValue * 1.5));
          const proportionalSize = Math.min(maxParticleSize, flowBasedSize * (baseNodeRadius / 50));
          
          const particle = particleContainer.append('circle')
            .attr('class', `particle particle-${linkIndex}-${i}`)
            .attr('r', proportionalSize)
            .attr('fill', particleColor)
            .attr('stroke', particleColor)
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.8)
            .attr('filter', 'url(#glow)')
            .style('pointer-events', 'none');
          
          // Initial position offset for multiple particles on same link
          const offset = (i / numParticles) * 1.0;
          
          // Animation function for particle movement
          const animateParticle = () => {
            const sourceX = linkWithPositions.source.x || 0;
            const sourceY = linkWithPositions.source.y || 0;
            const targetX = linkWithPositions.target.x || 0;
            const targetY = linkWithPositions.target.y || 0;
            
            // Calculate direction based on flow direction
            const isReverse = link.flow[currentHour] < 0;
            const startX = isReverse ? targetX : sourceX;
            const startY = isReverse ? targetY : sourceY;
            const endX = isReverse ? sourceX : targetX;
            const endY = isReverse ? sourceY : targetY;
            
            // Calculate node radius to start/end particles at edge of nodes
            const nodeRadius = 35;
            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) return;
            
            const unitX = dx / distance;
            const unitY = dy / distance;
            
            // Adjust start and end positions to node edges
            const adjustedStartX = startX + (unitX * nodeRadius);
            const adjustedStartY = startY + (unitY * nodeRadius);
            const adjustedEndX = endX - (unitX * nodeRadius);
            const adjustedEndY = endY - (unitY * nodeRadius);
            
            // Set initial position with offset
            const initialProgress = offset;
            const initialX = adjustedStartX + (adjustedEndX - adjustedStartX) * initialProgress;
            const initialY = adjustedStartY + (adjustedEndY - adjustedStartY) * initialProgress;
            
            particle
              .attr('cx', initialX)
              .attr('cy', initialY);
            
            // Animation duration based on flow intensity (faster for higher flow)
            const duration = Math.max(1000, 3000 - (flowValue * 500));
            
            // Animate particle movement
            particle
              .transition()
              .duration(duration)
              .ease(d3.easeLinear)
              .attr('cx', adjustedEndX)
              .attr('cy', adjustedEndY)
              .on('end', function() {
                // Only restart if particle still exists and we're still playing
                if (particleContainer.select(`.particle-${linkIndex}-${i}`).empty() || !isPlaying) return;
                
                // Reset particle to start position and restart animation
                d3.select(this)
                  .attr('cx', adjustedStartX)
                  .attr('cy', adjustedStartY);
                
                // Restart animation after a small delay
                const restartTimeoutId = setTimeout(animateParticle, i * 200); // Stagger restart times
                particleTimeoutsRef.current.push(restartTimeoutId);
              });
          };
          
          // Start animation with initial delay
          const timeoutId = setTimeout(animateParticle, i * 200);
          particleTimeoutsRef.current.push(timeoutId);
        }
      });
    };

    // Create particles with a slight delay to ensure links are updated first
    const initTimeoutId = setTimeout(createParticles, 100);
    particleTimeoutsRef.current.push(initTimeoutId);

  }, [containerRef, data, currentHour, isPlaying]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      particleTimeoutsRef.current.forEach(clearTimeout);
      particleTimeoutsRef.current = [];
    };
  }, []);

  return null; // This component renders directly to SVG via D3
};

export default GraphParticles;
