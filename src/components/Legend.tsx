import { useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isTypeFilterCollapsed, setIsTypeFilterCollapsed] = useState(false);
  const [isOwnerFilterCollapsed, setIsOwnerFilterCollapsed] = useState(false);
  const nodeTypes = Object.entries(NODE_COLORS);

  return (
    <div className={`absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
      isCollapsed ? 'max-w-fit' : 'max-w-[calc(100vw-2rem)]'
    }`}>
      {/* Header with toggle button */}
      <div className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isCollapsed ? 'p-3' : 'p-4'
      }`}>
        <h3 className={`font-semibold text-gray-900 dark:text-white transition-all duration-300 ${
          isCollapsed ? 'text-sm' : 'text-lg'
        }`}>
          {isCollapsed ? 'Filters' : 'Filters'}
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
        >
          <ChevronIcon className={`w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform duration-300 ${
            isCollapsed ? 'rotate-180' : 'rotate-0'
          }`} />
        </button>
      </div>

      {/* Collapsible content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[calc(100vh-200px)] opacity-100'
      }`}>
        <div 
          className="p-2 space-y-3 overflow-y-auto w-64 custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(156 163 175) transparent'
          }}>
          <style dangerouslySetInnerHTML={{
            __html: `
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: rgb(156 163 175);
                border-radius: 3px;
                transition: background-color 0.2s ease;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: rgb(107 114 128);
              }
              .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: rgb(75 85 99);
              }
              .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: rgb(107 114 128);
              }
            `
          }} />
          {/* Node Type Filter */}
          <div className="space-y-1">
            <button
              onClick={() => setIsTypeFilterCollapsed(!isTypeFilterCollapsed)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Type Filter ({Object.keys(NODE_COLORS).filter(type => activeTypes.has(type)).length}/{Object.keys(NODE_COLORS).length})</span>
              </div>
              <ChevronIcon className={`w-3 h-3 transform transition-transform duration-200 ${
                isTypeFilterCollapsed ? 'rotate-180' : 'rotate-0'
              }`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
              isTypeFilterCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
            }`}>
              <div className="space-y-0.5 bg-gray-50 dark:bg-gray-700/50 rounded p-1.5">
                {nodeTypes.map(([type, color]) => (
                  <label
                    key={type}
                    className="flex items-center gap-1.5 cursor-pointer hover:bg-white dark:hover:bg-gray-600/50 rounded p-1 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={activeTypes.has(type)}
                      onChange={() => onToggleType(type)}
                      className="rounded text-blue-500 focus:ring-blue-500 focus:ring-1 w-3 h-3"
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-white dark:border-gray-800 shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 capitalize font-medium leading-tight">
                      {type.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Owner Filter */}
          {availableOwners.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => setIsOwnerFilterCollapsed(!isOwnerFilterCollapsed)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  <span>Owner Filter ({availableOwners.filter(owner => activeOwners.has(owner)).length}/{availableOwners.length})</span>
                </div>
                <ChevronIcon className={`w-3 h-3 transform transition-transform duration-200 ${
                  isOwnerFilterCollapsed ? 'rotate-180' : 'rotate-0'
                }`} />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isOwnerFilterCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
              }`}>
                <div className="space-y-0.5 bg-gray-50 dark:bg-gray-700/50 rounded p-1.5">
                  {availableOwners.map((owner) => (
                    <label
                      key={owner}
                      className="flex items-center gap-1.5 cursor-pointer hover:bg-white dark:hover:bg-gray-600/50 rounded p-1 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={activeOwners.has(owner)}
                        onChange={() => onToggleOwner(owner)}
                        className="rounded text-blue-500 focus:ring-blue-500 focus:ring-1 w-3 h-3"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-tight">
                        {owner}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Energy Flow Colors */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 p-1.5">
              <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
              Energy Flow Legend
            </h4>
            <div className="space-y-0.5 bg-gray-50 dark:bg-gray-700/50 rounded p-1.5">
              <div className="flex items-center gap-1.5 p-0.5">
                <div className="w-4 h-1 bg-green-500 rounded-full shadow-sm flex-shrink-0"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">Grid</span>
              </div>
              <div className="flex items-center gap-1.5 p-0.5">
                <div className="w-4 h-1 bg-amber-500 rounded-full shadow-sm flex-shrink-0"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">Solar</span>
              </div>
              <div className="flex items-center gap-1.5 p-0.5">
                <div className="w-4 h-1 bg-blue-500 rounded-full shadow-sm flex-shrink-0"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">Battery</span>
              </div>
              <div className="flex items-center gap-1.5 p-0.5">
                <div className="w-4 h-1 bg-purple-500 rounded-full shadow-sm flex-shrink-0"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">Building</span>
              </div>
              <div className="flex items-center gap-1.5 p-0.5">
                <div className="w-4 h-1 bg-pink-500 rounded-full shadow-sm flex-shrink-0"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">Charging</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1.5 p-1 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-300 dark:border-blue-600 leading-tight">
                💡 Opacity = flow intensity
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ChevronIcon component with improved styling
const ChevronIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="m6 9 6 6 6-6"
    />
  </svg>
);
