import React, { useState } from 'react';

interface DashboardHeaderProps {
  data?: {
    nodes: any[];
    links: any[];
    kpis?: {
      total_demand: number;
      total_grid_import: number;
      total_grid_export: number;
      total_pv_used: number;
      total_pv_gen: number;
      self_sufficiency: number;
      self_consumption: number;
      avg_grid_carbon_intensity: number;
      total_grid_carbon_import: number;
      avg_grid_price_import: number;
      avg_building_self_consumption: number;
      building_self_consumption: Record<string, number>;
    };
  };
  currentHour: number;
  onKPICalculated?: (kpis: {
    totalPVCapacity: number;
    totalEnergyDemand: number;
    totalBatteryCapacity: number;
    totalPVProduction: number;
    totalEmbodiedCO2: number;
  }) => void;
}

export const DashboardHeader = ({ data, currentHour }: DashboardHeaderProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate community-wide KPIs
  const calculateKPIs = () => {
    if (!data?.nodes.length) return null;

    const kpis = {
      totalNodes: data.nodes.length,
      totalConnections: data.links.length,
      pvNodes: data.nodes.filter(n => n.type === 'pv').length,
      batteryNodes: data.nodes.filter(n => n.type === 'battery').length,
      buildingNodes: data.nodes.filter(n => n.type === 'building').length,
      chargePointNodes: data.nodes.filter(n => n.type === 'charge_point').length,
      totalPVCapacity: data.nodes
        .filter(n => n.type === 'pv')
        .reduce((sum, n) => sum + (n.total_pv_capacity || n.installed_capacity || 0), 0),
      totalBatteryCapacity: data.nodes
        .filter(n => n.type === 'battery')
        .reduce((sum, n) => sum + (n.capacity || n.installed_capacity || 0), 0),
      totalChargePoints: data.nodes
        .filter(n => n.type === 'charge_point')
        .reduce((sum, n) => sum + (n.total_connected_evs || 1), 0),
      v2gCapableChargers: data.nodes
        .filter(n => n.type === 'charge_point' && n.is_v2g).length,
      totalEnergyDemand: data.nodes
        .filter(n => n.type === 'building')
        .reduce((sum, n) => sum + (n.total_energy_demand || 0), 0),
      owners: [...new Set(data.nodes.flatMap(n => {
        const owners: string[] = [];
        if (n.owner) owners.push(n.owner);
        if (n.VALID_OWNERS && Array.isArray(n.VALID_OWNERS)) {
          owners.push(...n.VALID_OWNERS);
        }
        return owners;
      }))].length
    };

    return kpis;
  };

  const kpis = calculateKPIs();

  const formatTime = (hour: number) => {
    const period = hour % 24;
    const ampm = period < 12 ? 'AM' : 'PM';
    const displayHour = period % 12 || 12;
    const day = Math.floor(hour / 24) + 1;
    return `Day ${day}, ${displayHour}:00 ${ampm}`;
  };

  const formatNumber = (num: number, unit = '') => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}M${unit}`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}k${unit}`;
    }
    return `${num.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${unit}`;
  };
  
  const formatEnergyToMWh = (kWh: number) => {
    const mWh = kWh / 1000;
    return `${mWh.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} MWh`;
  };
  
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-2">
          {/* Main Header with Inline Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <EnergyIcon className="w-6 h-6 text-green-500" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Energy Community Dashboard
                </h1>
              </div>
            </div>

            {/* Quick Stats in the middle */}
            {kpis && (
              <div className="hidden lg:flex items-center space-x-2 flex-1 justify-center max-w-2xl">
                <div className="bg-gray-50 dark:bg-gray-700 rounded px-6 py-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assets</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white text-center">{kpis.totalNodes}</p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded px-6 py-1">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">Solar</p>
                  <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300 text-center">
                    {formatNumber(kpis.totalPVCapacity, 'W')}
                  </p>
                </div>
                
                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded px-6 py-1">
                  <p className="text-xs text-cyan-600 dark:text-cyan-400">Battery</p>
                  <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300 text-center">
                    {formatNumber(kpis.totalBatteryCapacity, 'Wh')}
                  </p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded px-6 py-1">
                  <p className="text-xs text-purple-600 dark:text-purple-400">Buildings</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300 text-center">{kpis.buildingNodes}</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded px-6 py-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Self-Sufficiency</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300 text-center">
                    {data.kpis ? formatPercentage(data.kpis.self_sufficiency) : 'N/A'}
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded px-6 py-1">
                  <p className="text-xs text-green-600 dark:text-green-400">Owners</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300 text-center">{kpis.owners}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current Time</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatTime(currentHour)}
                </p>
              </div>
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition-colors duration-200 flex items-center space-x-1"
              >
                <span>{isExpanded ? 'Hide' : 'Details'}</span>
                <ChevronIcon className={`w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mobile Stats (hidden on large screens) */}
          {kpis && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2 lg:hidden">
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Assets</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{kpis.totalNodes}</p>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Solar</p>
                <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                  {formatNumber(kpis.totalPVCapacity, 'W')}
                </p>
              </div>
              
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded p-2">
                <p className="text-xs text-cyan-600 dark:text-cyan-400">Battery</p>
                <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300">
                  {formatNumber(kpis.totalBatteryCapacity, 'Wh')}
                </p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
                <p className="text-xs text-purple-600 dark:text-purple-400">Buildings</p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{kpis.buildingNodes}</p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                <p className="text-xs text-blue-600 dark:text-blue-400">Self-Sufficiency</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {data.kpis ? formatPercentage(data.kpis.self_sufficiency) : 'N/A'}
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                <p className="text-xs text-green-600 dark:text-green-400">Owners</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">{kpis.owners}</p>
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && kpis && (
            <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Energy Community Overview
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Infrastructure Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Infrastructure</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Solar Installations:</span>
                      <span className="font-medium">{kpis.pvNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Battery Systems:</span>
                      <span className="font-medium">{kpis.batteryNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Connected Buildings:</span>
                      <span className="font-medium">{kpis.buildingNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Network Connections:</span>
                      <span className="font-medium">{kpis.totalConnections}</span>
                    </div>
                  </div>
                </div>

                {/* Energy Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Energy</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total Demand:</span>
                      <span className="font-medium">{data.kpis ? formatEnergyToMWh(data.kpis.total_demand) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Grid Import:</span>
                      <span className="font-medium">{data.kpis ? formatEnergyToMWh(data.kpis.total_grid_import) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Grid Export:</span>
                      <span className="font-medium">{data.kpis ? formatEnergyToMWh(data.kpis.total_grid_export) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">PV Generated:</span>
                      <span className="font-medium">{data.kpis ? formatEnergyToMWh(data.kpis.total_pv_gen) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">PV Used:</span>
                      <span className="font-medium">{data.kpis ? formatEnergyToMWh(data.kpis.total_pv_used) : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Efficiency Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Efficiency</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Self-Sufficiency:</span>
                      <span className="font-medium">{data.kpis ? formatPercentage(data.kpis.self_sufficiency) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Self-Consumption:</span>
                      <span className="font-medium">{data.kpis ? formatPercentage(data.kpis.self_consumption) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Avg. Building Self-Consumption:</span>
                      <span className="font-medium">{data.kpis ? formatPercentage(data.kpis.avg_building_self_consumption) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Grid Carbon Intensity:</span>
                      <span className="font-medium">{data.kpis ? formatNumber(data.kpis.avg_grid_carbon_intensity) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Grid Carbon Import:</span>
                      <span className="font-medium">{data.kpis ? formatNumber(data.kpis.total_grid_carbon_import) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Capacity Section */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Capacity</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total PV Capacity:</span>
                      <span className="font-medium">{formatNumber(kpis.totalPVCapacity, 'W')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Battery Storage:</span>
                      <span className="font-medium">{formatNumber(kpis.totalBatteryCapacity, 'Wh')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Energy Demand:</span>
                      <span className="font-medium">{formatNumber(kpis.totalEnergyDemand, 'Wh')}</span>
                    </div>
                  </div>
                </div>

                {/* Mobility Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">E-Mobility</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Charging Stations:</span>
                      <span className="font-medium">{kpis.chargePointNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Connected EVs:</span>
                      <span className="font-medium">{kpis.totalChargePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">V2G Capable:</span>
                      <span className="font-medium">{kpis.v2gCapableChargers}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Pricing</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Avg. Grid Price Import:</span>
                      <span className="font-medium">{data.kpis ? formatNumber(data.kpis.avg_grid_price_import) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Description */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>About this Energy Community:</strong> This dashboard visualizes a digital twin of a distributed energy community 
                  featuring renewable energy generation, energy storage, smart buildings, and electric vehicle charging infrastructure. 
                  The simulation shows real-time energy flows and demonstrates how different stakeholders interact within the community 
                  to optimize energy usage, reduce costs, and minimize environmental impact.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Icons
const EnergyIcon = ({ className = "w-6 h-6" }) => (
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
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

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
      strokeWidth={2}
      d="m19 9-7 7-7-7"
    />
  </svg>
);
