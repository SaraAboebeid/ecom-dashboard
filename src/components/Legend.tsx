import { NODE_COLORS } from '../types';

interface LegendProps {
  activeTypes: Set<string>;
  onToggleType: (type: string) => void;
  activeOwners: Set<string>;
  onToggleOwner: (owner: string) => void;
  availableOwners: string[];
}

export const Legend = ({
  activeTypes,
  onToggleType,
  activeOwners,
  onToggleOwner,
  availableOwners,
}: LegendProps) => {
  const nodeTypes = Object.entries(NODE_COLORS);

  return (
    <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-h-[calc(100vh-200px)] overflow-y-auto w-80 max-w-[calc(100vw-2rem)]">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filters
        </h3>
        
        {/* Node Type Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Type
          </h4>
          <div className="space-y-1">
            {nodeTypes.map(([type, color]) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={activeTypes.has(type)}
                  onChange={() => onToggleType(type)}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {type.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Owner Filter */}
        {availableOwners.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Owner
            </h4>
            <div className="space-y-1">
              {availableOwners.map((owner) => (
                <label
                  key={owner}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={activeOwners.has(owner)}
                    onChange={() => onToggleOwner(owner)}
                    className="rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {owner}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Energy Flow Colors */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Energy Flow Colors
          </h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-500 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Grid Energy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-amber-500 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Solar Energy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Battery Energy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-purple-500 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Building Energy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-pink-500 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Charging Energy</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              * Opacity indicates flow intensity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
