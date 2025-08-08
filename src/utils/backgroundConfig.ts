/**
 * Background image configuration
 * Adjust BACKGROUND_SCALE to change the size of the background image and node coordinates
 * Adjust COMPASS_ORIENTATION to rotate the image and node positions (in degrees, clockwise)
 */
export const BACKGROUND_SCALE = 2;
export const COMPASS_ORIENTATION = -90; // Rotation in degrees (counter-clockwise)

/**
 * Original background image dimensions
 */
export const ORIGINAL_IMAGE_WIDTH = 565.752;
export const ORIGINAL_IMAGE_HEIGHT = 1276.608;

/**
 * Calculated scaled dimensions
 */
export const getScaledImageDimensions = () => ({
  width: ORIGINAL_IMAGE_WIDTH * BACKGROUND_SCALE,
  height: ORIGINAL_IMAGE_HEIGHT * BACKGROUND_SCALE
});

/**
 * Rotate a point around the center of the image
 * @param x - Original x coordinate
 * @param y - Original y coordinate
 * @param rotation - Rotation angle in degrees (clockwise)
 * @param centerX - Center x coordinate for rotation
 * @param centerY - Center y coordinate for rotation
 * @returns Rotated coordinates
 */
export const rotatePoint = (
  x: number, 
  y: number, 
  rotation: number, 
  centerX: number, 
  centerY: number
): { x: number; y: number } => {
  if (rotation === 0) return { x, y };
  
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Translate to origin
  const translatedX = x - centerX;
  const translatedY = y - centerY;
  
  // Rotate
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;
  
  // Translate back
  return {
    x: rotatedX + centerX,
    y: rotatedY + centerY
  };
};

/**
 * Get the center point of the scaled image for rotation calculations
 */
export const getImageCenter = () => {
  const dimensions = getScaledImageDimensions();
  return {
    x: dimensions.width / 2,
    y: dimensions.height / 2
  };
};
