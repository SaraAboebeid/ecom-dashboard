import { Node } from '../types';

/**
 * Fixed positions for specific nodes in the graph
 * These coordinates align with the background image coordinate system
 */
export const FIXED_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'SB1': { x: 184.397, y: 717.074 },
  'Edit': { x: 319.370, y: 759.348 },
  'HA': { x: 374.170, y: 593.310 },
  'HB': { x: 378.120, y: 675.705 },
  'HC': { x: 381.956, y: 762.279 },
  'Idelara': { x: 1101.542, y: 64.525 },
  'Vasa 1': { x: 266.653, y: 115.389 },
  'Vasa 2-3': { x: 322.973, y: 109.4473 },
  'Vasa 12': { x: 379.136, y: 157.676 },
  'Vasa 8': { x: 311.158, y: 205.436 },
  'Vasa 10': { x: 391.937, y: 199.993 },
  'Vasa 5': { x: 284.958, y: 244.593 },
  'Vasa 9': { x: 339.721, y: 237.915 },
  'CSB Chabo': { x: 346.427, y: 301.608 },
  'MC2': { x: 234.252, y: 347.819 },
  'Kemi': { x: 352.798, y: 405.317 },
  'Emils kårhus': { x: 405.376, y: 407.888 },
  'Nya Matte': { x: 302.303, y: 499.262 },
  'bibliotek': { x: 402.648, y: 484.516 },
  'Kårhus entré': { x: 114.806, y: 562.152 },
  'Maskinteknik': { x: 319.243, y: 651.008 },
  'Lokalkontor': { x: 287.304, y: 586.620 },
  'Fysik origo': { x: 227.567, y: 431.054 },
  'Kårhus': { x: 120.991, y: 601.520 },
  'SB2': { x: 185.481, y: 768.882 },
  'SB3': { x: 191.425, y: 888.985 },
  'AWL': { x: 195.544, y: 962.640 },
  'JSP': { x: 188.056, y: 1016.338 },
  'Teknikparken': { x: 130.388, y: 1081.455 },
  'Elkraftteknik': { x: 341.186, y: 819.325 },
  'Vasa 13': { x: 235.464, y: 172.473 },
  'Gamla matte': { x: 415.010, y: 1086.740 },
  'Idélära': { x: 283.060, y: 822.095 },
  'IT': { x: 140.424, y: 1157.231 },
  'CA-Huset': { x: 136.279, y: 463.660 },
  'Reaktorfysik': { x: 244.771, y: 411.121 },
  'CSB Gibraltarvallen': { x: 427.087, y: 559.410 },
  'Vasa 4': { x: 247.271, y: 258.770 },
  'Vasa 7': { x: 245.196, y: 236.308 },
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
