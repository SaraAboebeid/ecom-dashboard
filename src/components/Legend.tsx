import { NODE_COLORS } from '../types';

interface LegendProps {
  activeTypes: Set<string>;
  onToggleType: (type: string) => void;
  minFlow: number;
  onMinFlowChange: (value: number) => void;
  activeOwners: Set<string>;
  onToggleOwner: (owner: string) => void;
  availableOwners: string[];
  v2gFilter: 'all' | 'v2g-only' | 'no-v2g';
  onV2gFilterChange: (filter: 'all' | 'v2g-only' | 'no-v2g') => void;
  capacityRange: { min: number; max: number };
  onCapacityRangeChange: (range: { min: number; max: number }) => void;
  maxCapacity: number;
}

export const Legend = ({
  activeTypes,
  onToggleType,
  minFlow,
  onMinFlowChange,
  activeOwners,
  onToggleOwner,
  availableOwners,
  v2gFilter,
  onV2gFilterChange,
  capacityRange,
  onCapacityRangeChange,
  maxCapacity,
}: LegendProps) => {
  const nodeTypes = Object.entries(NODE_COLORS);

  return (
    <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filters
        </h3>
        
        {/* Node Type Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Type
          </h4>
          <div className="space-y-2">
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
            <div className="space-y-2">
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

        {/* V2G Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            V2G Capability
          </h4>
          <select
            value={v2gFilter}
            onChange={(e) => onV2gFilterChange(e.target.value as 'all' | 'v2g-only' | 'no-v2g')}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Charge Points</option>
            <option value="v2g-only">V2G Enabled Only</option>
            <option value="no-v2g">Non-V2G Only</option>
          </select>
        </div>

        {/* Capacity Range Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Capacity Range (kW)
          </h4>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                max={maxCapacity}
                value={capacityRange.min}
                onChange={(e) => onCapacityRangeChange({ ...capacityRange, min: parseFloat(e.target.value) || 0 })}
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Min"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">to</span>
              <input
                type="number"
                min={capacityRange.min}
                max={maxCapacity}
                value={capacityRange.max}
                onChange={(e) => onCapacityRangeChange({ ...capacityRange, max: parseFloat(e.target.value) || maxCapacity })}
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Max"
              />
            </div>
            <input
              type="range"
              min="0"
              max={maxCapacity}
              value={capacityRange.max}
              onChange={(e) => onCapacityRangeChange({ ...capacityRange, max: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {capacityRange.min} - {capacityRange.max} kW
            </div>
          </div>
        </div>

        {/* Flow Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Minimum Flow (kWh)
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={minFlow}
            onChange={(e) => onMinFlowChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {minFlow.toFixed(1)} kWh
          </div>
        </div>
      </div>
    </div>
  );
};
