import { useState, useEffect } from 'react';
import { Graph } from './components/Graph';
import { Timeline } from './components/Timeline';
import { Legend } from './components/Legend';
import { GraphData } from './types';

function App() {
  const [data, setData] = useState<GraphData | null>(null);
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(['building', 'pv', 'grid', 'battery', 'charge_point']));
  const [minFlow, setMinFlow] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    fetch('/graph.json')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
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

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredData = {
    nodes: data.nodes.filter(node => activeTypes.has(node.type)),
    links: data.links.filter(link => {
      const sourceNode = data.nodes.find(n => n.id === link.source);
      const targetNode = data.nodes.find(n => n.id === link.target);
      return (
        sourceNode &&
        targetNode &&
        activeTypes.has(sourceNode.type) &&
        activeTypes.has(targetNode.type) &&
        link.flow[currentHour] >= minFlow
      );
    }),
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="relative w-full h-screen bg-gray-100 dark:bg-gray-900">
        <button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
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
          filters={{ nodeTypes: activeTypes, minFlow }}
        />

        <Legend
          activeTypes={activeTypes}
          onToggleType={toggleNodeType}
          minFlow={minFlow}
          onMinFlowChange={setMinFlow}
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
