import { Node } from '../types';

/**
 * Fixed positions for specific nodes in the graph
 */
export const FIXED_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'SB1': { x: 0, y: 0 },
  'Edit': { x: 319.370, y: 759.348 },
  'HA': { x: 856, y: 158 },
  'HB': { x: 931.232, y: 20.418 },
  'HC': { x: 1009.722, y: 9.556 },
  'Idelara': { x: 1101.542, y: 64.525 }
};

/**
 * Apply fixed positions to nodes that have predefined locations
 * @param nodes Array of nodes to process
 * @returns Modified nodes with fixed positions applied
 */
export const applyFixedPositions = (nodes: Node[]): Node[] => {
  return nodes.map(node => {
    const fixedPosition = FIXED_NODE_POSITIONS[node.id];
    if (fixedPosition) {
      return {
        ...node,
        fx: fixedPosition.x,
        fy: fixedPosition.y
      };
    }
    return node;
  });
};

/**
 * Check if a node has a fixed position
 * @param nodeId ID of the node
 * @returns True if the node has a fixed position
 */
export const hasFixedPosition = (nodeId: string): boolean => {
  return nodeId in FIXED_NODE_POSITIONS;
};

/**
 * Get the fixed position for a node if it exists
 * @param nodeId ID of the node
 * @returns Fixed position or null if not found
 */
export const getFixedPosition = (nodeId: string): { x: number; y: number } | null => {
  return FIXED_NODE_POSITIONS[nodeId] || null;
};
