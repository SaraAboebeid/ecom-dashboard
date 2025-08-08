import { useState, useEffect, useMemo } from 'react';
import { Graph } from './components/Graph/';
import { Timeline } from './components/Timeline';
import { Legend } from './components/Legend';
import { DashboardHeader } from './components/DashboardHeader';
import { FpsCounter } from './components/FpsCounter';
import { SankeyDrawer } from './components/SankeyDrawer';
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
  const [fitToViewFn, setFitToViewFn] = useState<(() => void) | null>(null);
  const [isSankeyOpen, setIsSankeyOpen] = useState(false);

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
    // 1. First update the state (this doesn't cause immediate DOM updates)
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // 2. Schedule DOM updates for the next frame
    requestAnimationFrame(() => {
      // Add a class that will temporarily disable transitions
      document.documentElement.classList.add('disable-transitions');
      
      // Toggle dark mode class
      document.documentElement.classList.toggle('dark', newDarkMode);
      
      // Save preference to localStorage
      localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
      
      // Force a reflow to ensure disable-transitions takes effect
      document.documentElement.scrollTop;
      
      // Remove the class that disables transitions after the update
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('disable-transitions');
      });
    });
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

  const handleFitToView = (fitFn: () => void) => {
    setFitToViewFn(() => fitFn);
  };

  const onFitToViewClick = () => {
    if (fitToViewFn) {
      fitToViewFn();
    }
  };

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
    <div className="h-screen overflow-hidden contain-layout bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* FPS Counter */}
      <FpsCounter />
      
      {/* Dashboard Header */}
      <DashboardHeader data={data} currentHour={currentHour} />
      
      <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="absolute top-4 right-4 flex gap-2 z-50">
          <button
            onClick={onFitToViewClick}
            disabled={!fitToViewFn}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Fit graph to view"
            title="Fit graph to view"
          >
            <FitToViewIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md transition-all duration-300"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <SunIcon className="w-6 h-6 text-yellow-500" />
            ) : (
              <MoonIcon className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        <Graph
          data={data}
          currentHour={currentHour}
          filters={filters}
          isTimelinePlaying={isPlaying}
          onFitToView={handleFitToView}
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

        <div className="relative">
          <button
            onClick={() => setIsSankeyOpen(!isSankeyOpen)}
            className="fixed left-1/2 transform -translate-x-1/2 bg-blue-500 dark:bg-blue-600 text-white rounded-t-md px-4 py-2 text-sm font-medium shadow-md z-50 hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            style={{ bottom: 'calc(var(--timeline-height, 96px) + 8px)' }}
          >
            {isSankeyOpen ? 'Hide' : 'Show'} Energy Flow Diagram
          </button>
          <Timeline
            currentHour={currentHour}
            isPlaying={isPlaying}
            onHourChange={setCurrentHour}
            onPlayPause={togglePlayPause}
            isSankeyOpen={isSankeyOpen}
          />
        </div>
        
        {/* Sankey Diagram Drawer */}
        {data && (
          <SankeyDrawer
            isOpen={isSankeyOpen}
            onClose={() => setIsSankeyOpen(false)}
            data={data}
            currentHour={currentHour}
            isDarkMode={isDarkMode}
          />
        )}
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

const FitToViewIcon = ({ className = "w-6 h-6" }) => (
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
      d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
    />
  </svg>
);

export default App;
