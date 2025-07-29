import { NODE_COLORS } from '../types';

interface LegendProps {
  activeTypes: Set<string>;
  onToggleType: (type: string) => void;
  minFlow: number;
  onMinFlowChange: (value: number) => void;
}

export const Legend = ({
  activeTypes,
  onToggleType,
  minFlow,
  onMinFlowChange,
}: LegendProps) => {
  const nodeTypes = Object.entries(NODE_COLORS);

  return (
    <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filter by Type
        </h3>
        
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
