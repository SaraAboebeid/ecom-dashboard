import React from 'react';

// SVG Icons for each node type
export const NodeIcons = {
  building: (
    <svg viewBox="0 0 24 24" className="node-icon">
      <path 
        fill="currentColor" 
        d="M12 3L2 12h3v8h14v-8h3L12 3m-3 13h-2v-3h2v3m3 0h-2v-3h2v3m3 0h-2v-3h2v3" 
      />
    </svg>
  ),
  
  pv: (
    <svg viewBox="0 0 24 24" className="node-icon">
      <path 
        fill="currentColor" 
        d="M12,7L17,12H14V16H10V12H7L12,7M12,3L3,12H6V20H18V12H21L12,3Z" 
      />
    </svg>
  ),
  
  grid: (
    <svg viewBox="0 0 24 24" className="node-icon">
      <path 
        fill="currentColor" 
        d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z" 
      />
    </svg>
  ),
  
  battery: (
    <svg viewBox="0 0 24 24" className="node-icon">
      <path 
        fill="currentColor" 
        d="M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z" 
      />
    </svg>
  ),
  
  charge_point: (
    <svg viewBox="0 0 24 24" className="node-icon">
      <path 
        fill="currentColor" 
        d="M8,3V6H4V8H8V11H10V8H14V6H10V3M11,13V21H13V13M7,13A4,4 0 0,0 3,17V21H5V17A2,2 0 0,1 7,15A2,2 0 0,1 9,17V21H11V17A4,4 0 0,0 7,13M17,13A4,4 0 0,0 13,17V21H15V17A2,2 0 0,1 17,15A2,2 0 0,1 19,17V21H21V17A4,4 0 0,0 17,13Z" 
      />
    </svg>
  )
};

// Function to convert React SVG icon to string for D3
export const iconToString = (nodeType: string): string => {
  const iconComponent = NodeIcons[nodeType as keyof typeof NodeIcons];
  if (!iconComponent) return '';
  
  // Convert React element to string
  const serializer = new XMLSerializer();
  const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconElement.setAttribute('viewBox', '0 0 24 24');
  iconElement.setAttribute('class', 'node-icon');
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  // Extract path data from the React SVG component
  let pathData = '';
  
  if (nodeType === 'building') {
    pathData = 'M12 3L2 12h3v8h14v-8h3L12 3m-3 13h-2v-3h2v3m3 0h-2v-3h2v3m3 0h-2v-3h2v3';
  } else if (nodeType === 'pv') {
    pathData = 'M12,7L17,12H14V16H10V12H7L12,7M12,3L3,12H6V20H18V12H21L12,3Z';
  } else if (nodeType === 'grid') {
    pathData = 'M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z';
  } else if (nodeType === 'battery') {
    pathData = 'M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z';
  } else if (nodeType === 'charge_point') {
    pathData = 'M8,3V6H4V8H8V11H10V8H14V6H10V3M11,13V21H13V13M7,13A4,4 0 0,0 3,17V21H5V17A2,2 0 0,1 7,15A2,2 0 0,1 9,17V21H11V17A4,4 0 0,0 7,13M17,13A4,4 0 0,0 13,17V21H15V17A2,2 0 0,1 17,15A2,2 0 0,1 19,17V21H21V17A4,4 0 0,0 17,13Z';
  }
  
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', pathData);
  iconElement.appendChild(path);
  
  return serializer.serializeToString(iconElement);
};
