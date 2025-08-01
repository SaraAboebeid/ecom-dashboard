import { useState, useEffect, useMemo } from 'react';
import { Graph } from './components/Graph';
import { Timeline } from './components/Timeline';
import { Legend } from './components/Legend';
import { GraphData } from './types';

function App() {
  const [data, setData] = useState<GraphData | null>(null);
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(['building', 'pv', 'grid', 'battery', 'charge_point']));
  const [activeOwners, setActiveOwners] = useState<Set<string>>(new Set());
  const [v2gFilter, setV2gFilter] = useState<'all' | 'v2g-only' | 'no-v2g'>('all');
  const [capacityRange, setCapacityRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [minFlow, setMinFlow] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    fetch('/graph.json')
      .then(res => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        
        // Initialize available owners and building types
        if (fetchedData && fetchedData.nodes) {
          const owners = new Set<string>();
          
          fetchedData.nodes.forEach((node: any) => {
            // Collect from current owner field
            if (node.owner) {
              owners.add(node.owner);
            }
            // Also collect from VALID_OWNERS array if it exists
            if (node.VALID_OWNERS && Array.isArray(node.VALID_OWNERS)) {
              node.VALID_OWNERS.forEach((owner: string) => {
                owners.add(owner);
              });
            }
          });
          
          // Initialize all owners as active
          setActiveOwners(new Set(owners));
          
          // Set capacity range based on actual data
          const capacities = fetchedData.nodes
            .filter((node: any) => node.capacity || node.installed_capacity)
            .map((node: any) => node.capacity || node.installed_capacity || 0);
          
          if (capacities.length > 0) {
            const maxCapacity = Math.max(...capacities);
            setCapacityRange({ min: 0, max: Math.ceil(maxCapacity / 10) * 10 });
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Check localStorage first, then system preference
    const storedTheme = localStorage.getItem('theme');
    
    if (storedTheme) {
      setIsDarkMode(storedTheme === 'dark');
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const isDark = mediaQuery.matches;
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }

    // Listen for system preference changes
    const handler = (e: MediaQueryListEvent) => {
      // Only update if no theme is stored in localStorage
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    // Save preference to localStorage
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  const toggleNodeType = (type: string) => {
    const newTypes = new Set(activeTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setActiveTypes(newTypes);
  };

  const toggleOwner = (owner: string) => {
    const newOwners = new Set(activeOwners);
    if (newOwners.has(owner)) {
      newOwners.delete(owner);
    } else {
      newOwners.add(owner);
    }
    setActiveOwners(newOwners);
  };

  const handleV2gFilterChange = (filter: 'all' | 'v2g-only' | 'no-v2g') => {
    setV2gFilter(filter);
  };

  const handleCapacityRangeChange = (range: { min: number; max: number }) => {
    setCapacityRange(range);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const filteredData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    return {
      nodes: data.nodes.filter(node => {
        // Filter by node type
        if (!activeTypes.has(node.type)) return false;
        
        // Filter by owner (if owner filter is applied and node has owner)
        if (node.owner && activeOwners.size > 0 && !activeOwners.has(node.owner)) {
          return false;
        }
        
        // Filter by V2G capability (for charge points)
        if (node.type === 'charge_point' && v2gFilter !== 'all') {
          if (v2gFilter === 'v2g-only' && !node.is_v2g) return false;
          if (v2gFilter === 'no-v2g' && node.is_v2g) return false;
        }
        
        // Filter by capacity range
        const nodeCapacity = node.capacity || node.installed_capacity || 0;
        if (nodeCapacity > 0 && (nodeCapacity < capacityRange.min || nodeCapacity > capacityRange.max)) {
          return false;
        }
        
        return true;
      }),
      links: data.links.filter(link => {
        const sourceNode = data.nodes.find(n => n.id === link.source);
        const targetNode = data.nodes.find(n => n.id === link.target);
        return (
          sourceNode &&
          targetNode &&
          activeTypes.has(sourceNode.type) &&
          activeTypes.has(targetNode.type) &&
          (!sourceNode.owner || activeOwners.size === 0 || activeOwners.has(sourceNode.owner)) &&
          (!targetNode.owner || activeOwners.size === 0 || activeOwners.has(targetNode.owner)) &&
          Math.abs(link.flow[currentHour]) >= minFlow
        );
      }),
    };
  }, [data, activeTypes, activeOwners, v2gFilter, capacityRange, currentHour, minFlow]);

  const filters = useMemo(() => ({
    nodeTypes: activeTypes,
    minFlow,
    owners: activeOwners,
    v2gFilter,
    capacityRange
  }), [activeTypes, minFlow, activeOwners, v2gFilter, capacityRange]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="relative w-full h-screen">
        <button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md transition-all duration-300 z-50"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <SunIcon className="w-6 h-6 text-yellow-500" />
          ) : (
            <MoonIcon className="w-6 h-6 text-gray-700" />
          )}
        </button>

        <Graph
          data={filteredData}
          currentHour={currentHour}
          filters={filters}
        />

        <Legend
          activeTypes={activeTypes}
          onToggleType={toggleNodeType}
          minFlow={minFlow}
          onMinFlowChange={setMinFlow}
          activeOwners={activeOwners}
          onToggleOwner={toggleOwner}
          availableOwners={data ? [...new Set(data.nodes.flatMap(n => {
            const owners: string[] = [];
            if (n.owner) owners.push(n.owner);
            if (n.VALID_OWNERS && Array.isArray(n.VALID_OWNERS)) {
              owners.push(...n.VALID_OWNERS);
            }
            return owners;
          }))] : []}
          v2gFilter={v2gFilter}
          onV2gFilterChange={handleV2gFilterChange}
          capacityRange={capacityRange}
          onCapacityRangeChange={handleCapacityRangeChange}
          maxCapacity={data ? Math.max(...data.nodes.map(n => n.capacity || n.installed_capacity || 0)) : 100}
        />

        <Timeline
          currentHour={currentHour}
          isPlaying={isPlaying}
          onHourChange={setCurrentHour}
          onPlayPause={togglePlayPause}
        />
      </div>
    </div>
  );
}

const SunIcon = ({ className = "w-6 h-6" }) => (
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
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MoonIcon = ({ className = "w-6 h-6" }) => (
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
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

export default App;
