import {
  APILoadingStatus,
  APIProvider,
  Map as GoogleMapComponent,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { AlertTriangle, ArrowRight, Church, Globe, GraduationCap, Layers, Store } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChurchData, CountyFilter, RetailerData, SchoolData, ShadingMode, TractData } from '../types';

interface MapGoogleProps {
  tracts: TractData[];
  retailers: RetailerData[];
  churches?: ChurchData[];
  schools?: SchoolData[];
  selectedCounty: CountyFilter;
  selectedTract: TractData | null;
  onSelectTract: (tract: TractData) => void;
  shadingMode: ShadingMode;
  setShadingMode: (mode: ShadingMode) => void;
  isDark: boolean;
  onSwitchToLeaflet?: () => void;
}

// Sub-component to manage GeoJSON Data Layer and interactions on the google.maps.Map instance
const GoogleMapDataLayer: React.FC<{
  tracts: TractData[];
  retailers: RetailerData[];
  churches?: ChurchData[];
  schools?: SchoolData[];
  selectedCounty: CountyFilter;
  selectedTract: TractData | null;
  onSelectTract: (tract: TractData) => void;
  shadingMode: ShadingMode;
  showRetailers: boolean;
  showChurches: boolean;
  showSchools: boolean;
  isDark: boolean;
  onHoverTract: (tract: TractData | null, clientPos: { x: number; y: number } | null) => void;
}> = ({
  tracts,
  retailers,
  churches = [],
  schools = [],
  selectedCounty,
  selectedTract,
  onSelectTract,
  shadingMode,
  showRetailers,
  showChurches,
  showSchools,
  isDark,
  onHoverTract,
}) => {
  const map = useMap();
  const [geoJsonLoaded, setGeoJsonLoaded] = useState(false);
  const hoveredGeoidRef = useRef<string | null>(null);
  const retailerMarkersRef = useRef<google.maps.Circle[]>([]);
  const churchMarkersRef = useRef<google.maps.Circle[]>([]);
  const schoolMarkersRef = useRef<google.maps.Circle[]>([]);

  // Use Record<string, TractData> dictionary instead of new Map() to avoid identifier shadowing
  const tractLookup = useMemo(() => {
    const dict: Record<string, TractData> = {};
    tracts.forEach((t) => {
      dict[t.GEOID] = t;
    });
    return dict;
  }, [tracts]);

  // Load GeoJSON into Google Maps Data Layer
  useEffect(() => {
    if (!map) return;

    fetch('/data/central_fl_tracts.geojson')
      .then((res) => res.json())
      .then((geoJson) => {
        // Clear any prior features
        map.data.forEach((f: google.maps.Data.Feature) => {
          map.data.remove(f);
        });
        map.data.addGeoJson(geoJson);
        setGeoJsonLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load Central FL GeoJSON for Google Maps:', err);
      });
  }, [map]);

  // Update styles whenever shadingMode, selectedCounty, selectedTract, or dark mode changes
  useEffect(() => {
    if (!map || !geoJsonLoaded) return;

    map.data.setStyle((feature: google.maps.Data.Feature) => {
      const geoid = feature.getProperty('GEOID') as string;
      const tract = tractLookup[geoid];
      const isSelected = selectedTract && selectedTract.GEOID === geoid;
      const isHovered = hoveredGeoidRef.current === geoid;

      let fillColor = isDark ? '#1e293b' : '#f1f5f9';
      let fillOpacity = 0.78;
      let strokeColor = isDark ? '#475569' : '#94a3b8';
      let strokeWeight = 1;
      let zIndex = 1;

      if (!tract) {
        return {
          fillColor,
          fillOpacity: 0.3,
          strokeColor,
          strokeWeight: 0.5,
          zIndex,
        };
      }

      // Filtered out by county
      if (selectedCounty !== 'All' && tract.county !== selectedCounty) {
        return {
          fillColor: isDark ? '#090d16' : '#f8fafc',
          fillOpacity: 0.12,
          strokeColor: isDark ? '#1e293b' : '#e2e8f0',
          strokeWeight: 0.5,
          zIndex: 0,
        };
      }

      if (shadingMode === 'severity') {
        switch (tract.primary_gap) {
          case 'Classic food desert':
            fillColor = '#991b1b'; // Dark Crimson (Section 4.1)
            fillOpacity = 0.9;
            break;
          case 'Vehicle-compounded gap':
            fillColor = '#dc2626'; // Vivid Red (Section 4.1)
            fillOpacity = 0.85;
            break;
          case 'SNAP enrollment gap':
            fillColor = '#f87171'; // Light Red / Coral (Section 4.1)
            fillOpacity = 0.8;
            break;
          case 'Possible blind spot':
            fillColor = '#fca5a5'; // Lightest red / Salmon (monochromatic red scale)
            fillOpacity = 0.8;
            break;
          case 'Insufficient data':
            fillColor = '#94a3b8'; // Slate Gray
            fillOpacity = 0.6;
            break;
          default:
            fillColor = isDark ? '#1e293b' : '#e2e8f0';
            fillOpacity = 0.45;
            break;
        }
      } else if (shadingMode === 'poverty') {
        const pov = tract.poverty_rate ?? 0;
        if (pov >= 25) fillColor = '#7f1d1d';
        else if (pov >= 18) fillColor = '#b91c1c';
        else if (pov >= 12) fillColor = '#ef4444';
        else if (pov >= 7) fillColor = '#fca5a5';
        else fillColor = isDark ? '#1e293b' : '#fee2e2';
        fillOpacity = 0.85;
      } else if (shadingMode === 'snap') {
        const snap = tract.snap_rate ?? 0;
        if (snap >= 25) fillColor = '#1e3a8a';
        else if (snap >= 18) fillColor = '#2563eb';
        else if (snap >= 10) fillColor = '#60a5fa';
        else if (snap >= 5) fillColor = '#93c5fd';
        else fillColor = isDark ? '#1e293b' : '#dbeafe';
        fillOpacity = 0.85;
      } else if (shadingMode === 'vehicle') {
        const veh = tract.no_vehicle_low_access_pct ?? 0;
        if (veh >= 25) fillColor = '#4c1d95';
        else if (veh >= 15) fillColor = '#7c3aed';
        else if (veh >= 8) fillColor = '#a78bfa';
        else if (veh >= 4) fillColor = '#c4b5fd';
        else fillColor = isDark ? '#1e293b' : '#ede9fe';
        fillOpacity = 0.85;
      } else if (shadingMode === 'confidence') {
        const score = tract.confidence_score ?? 4;
        if (score === 4)
          fillColor = '#059669'; // High
        else if (score === 3)
          fillColor = '#0d9488'; // Moderate
        else if (score === 2)
          fillColor = '#d97706'; // Low
        else fillColor = '#dc2626'; // Very Low
        fillOpacity = 0.8;
      }

      // Highlight selected or hovered state
      if (isSelected) {
        strokeColor = '#ffffff';
        strokeWeight = 3;
        zIndex = 10;
        fillOpacity = Math.min(1, fillOpacity + 0.15);
      } else if (isHovered) {
        strokeColor = '#facc15';
        strokeWeight = 2.5;
        zIndex = 5;
        fillOpacity = Math.min(1, fillOpacity + 0.1);
      }

      return {
        fillColor,
        fillOpacity,
        strokeColor,
        strokeWeight,
        zIndex,
      };
    });
  }, [map, geoJsonLoaded, shadingMode, selectedCounty, selectedTract, isDark, tractLookup]);

  // Set up mouse events on map.data
  useEffect(() => {
    if (!map || !geoJsonLoaded) return;

    const mouseOverListener = map.data.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
      const geoid = e.feature.getProperty('GEOID') as string;
      hoveredGeoidRef.current = geoid;
      const tract = tractLookup[geoid] || null;

      // Trigger dynamic styling re-eval for the hovered item
      map.data.revertStyle();
      map.data.overrideStyle(e.feature, {
        strokeColor: '#facc15',
        strokeWeight: 2.5,
        zIndex: 5,
      });

      if (e.domEvent && 'clientX' in e.domEvent) {
        const mouseEv = e.domEvent as MouseEvent;
        onHoverTract(tract, { x: mouseEv.clientX, y: mouseEv.clientY });
      } else {
        onHoverTract(tract, null);
      }
    });

    const mouseOutListener = map.data.addListener('mouseout', () => {
      hoveredGeoidRef.current = null;
      map.data.revertStyle();
      onHoverTract(null, null);
    });

    const clickListener = map.data.addListener('click', (e: google.maps.Data.MouseEvent) => {
      const geoid = e.feature.getProperty('GEOID') as string;
      const tract = tractLookup[geoid];
      if (tract) {
        onSelectTract(tract);
      }
    });

    return () => {
      google.maps.event.removeListener(mouseOverListener);
      google.maps.event.removeListener(mouseOutListener);
      google.maps.event.removeListener(clickListener);
    };
  }, [map, geoJsonLoaded, tractLookup, onSelectTract, onHoverTract]);

  // Fit bounds when selectedCounty changes
  useEffect(() => {
    if (!map) return;

    const countyCenters: Record<string, { lat: number; lng: number; zoom: number }> = {
      Orange: { lat: 28.5383, lng: -81.3792, zoom: 10 },
      Osceola: { lat: 28.2, lng: -81.15, zoom: 10 },
      Seminole: { lat: 28.71, lng: -81.25, zoom: 11 },
      Lake: { lat: 28.8, lng: -81.75, zoom: 10 },
      All: { lat: 28.5383, lng: -81.3792, zoom: 9 },
    };

    const target = countyCenters[selectedCounty] ?? { lat: 28.5383, lng: -81.3792, zoom: 9 };
    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(target.zoom);
  }, [map, selectedCounty]);

  // Manage SNAP Retailer Markers
  useEffect(() => {
    if (!map) return;

    // Clean up old markers
    retailerMarkersRef.current.forEach((m) => {
      m.setMap(null);
    });
    retailerMarkersRef.current = [];

    if (!showRetailers) return;

    // Filter retailers to current county
    const activeRetailers =
      selectedCounty === 'All'
        ? retailers.slice(0, 400) // Cap for render performance
        : retailers.filter((r) => r.county === selectedCounty);

    const circles: google.maps.Circle[] = [];

    activeRetailers.forEach((r) => {
      if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return;
      const circle = new google.maps.Circle({
        strokeColor: '#047857',
        strokeOpacity: 0.9,
        strokeWeight: 1.5,
        fillColor: '#10b981',
        fillOpacity: 0.85,
        map,
        center: { lat: r.latitude, lng: r.longitude },
        radius: 120, // meters
        zIndex: 20,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding:4px; font-family:sans-serif; color:#111;">
          <div style="font-weight:600; font-size:12px; color:#047857;">🛒 ${r.store_name}</div>
          <div style="font-size:11px; color:#4b5563;">${r.address}, ${r.city}</div>
          <div style="font-size:10px; font-weight:500; color:#059669; margin-top:2px;">Authorized SNAP Retailer (${r.county} Co.)</div>
        </div>`,
      });

      circle.addListener('click', (e: google.maps.MapMouseEvent) => {
        infoWindow.setPosition(e.latLng || { lat: r.latitude, lng: r.longitude });
        infoWindow.open(map);
      });

      circles.push(circle);
    });

    retailerMarkersRef.current = circles;

    return () => {
      circles.forEach((c) => {
        c.setMap(null);
      });
    };
  }, [map, showRetailers, retailers, selectedCounty]);

  // Manage Church Markers
  useEffect(() => {
    if (!map) return;

    churchMarkersRef.current.forEach((m) => {
      m.setMap(null);
    });
    churchMarkersRef.current = [];

    if (!showChurches || !churches) return;

    const activeChurches = selectedCounty === 'All' ? churches : churches.filter((c) => c.county === selectedCounty);

    const circles: google.maps.Circle[] = [];

    activeChurches.forEach((c) => {
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
      const circle = new google.maps.Circle({
        strokeColor: '#5b21b6',
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: '#8b5cf6',
        fillOpacity: 0.9,
        map,
        center: { lat: c.latitude, lng: c.longitude },
        radius: 160, // meters
        zIndex: 25,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding:4px; font-family:sans-serif; color:#111;">
          <div style="font-weight:600; font-size:12px; color:#5b21b6;">✝️ ${c.name}</div>
          <div style="font-size:11px; color:#4b5563;">${c.address}, ${c.city}</div>
          <div style="font-size:10px; font-weight:500; color:#7c3aed; margin-top:2px;">${c.type} (${c.county} Co.)</div>
        </div>`,
      });

      circle.addListener('click', (e: google.maps.MapMouseEvent) => {
        infoWindow.setPosition(e.latLng || { lat: c.latitude, lng: c.longitude });
        infoWindow.open(map);
      });

      circles.push(circle);
    });

    churchMarkersRef.current = circles;

    return () => {
      circles.forEach((c) => {
        c.setMap(null);
      });
    };
  }, [map, showChurches, churches, selectedCounty]);

  // Manage School Markers
  useEffect(() => {
    if (!map) return;

    schoolMarkersRef.current.forEach((m) => {
      m.setMap(null);
    });
    schoolMarkersRef.current = [];

    if (!showSchools || !schools) return;

    const activeSchools = selectedCounty === 'All' ? schools : schools.filter((s) => s.county === selectedCounty);

    const circles: google.maps.Circle[] = [];

    activeSchools.forEach((s) => {
      if (typeof s.latitude !== 'number' || typeof s.longitude !== 'number') return;
      const circle = new google.maps.Circle({
        strokeColor: '#b45309',
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.9,
        map,
        center: { lat: s.latitude, lng: s.longitude },
        radius: 160, // meters
        zIndex: 24,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding:4px; font-family:sans-serif; color:#111;">
          <div style="font-weight:600; font-size:12px; color:#b45309;">🏫 ${s.name}</div>
          <div style="font-size:11px; color:#4b5563;">${s.address}, ${s.city}</div>
          <div style="font-size:10px; font-weight:500; color:#d97706; margin-top:2px;">${s.type} (${s.county} Co.)</div>
        </div>`,
      });

      circle.addListener('click', (e: google.maps.MapMouseEvent) => {
        infoWindow.setPosition(e.latLng || { lat: s.latitude, lng: s.longitude });
        infoWindow.open(map);
      });

      circles.push(circle);
    });

    schoolMarkersRef.current = circles;

    return () => {
      circles.forEach((c) => {
        c.setMap(null);
      });
    };
  }, [map, showSchools, schools, selectedCounty]);

  return null;
};

// Loading and Status wrapper
const MapLoadingChecker: React.FC<{
  onSwitchToLeaflet?: () => void;
  children: React.ReactNode;
}> = ({ onSwitchToLeaflet, children }) => {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold mb-1">Google Maps Platform Notice</h3>
        <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
          Google Maps Platform requires an active API key with Maps JavaScript API enabled. You can continue using our
          built-in high-performance Canvas GIS (Esri) basemap which requires zero API keys.
        </p>
        {onSwitchToLeaflet && (
          <button
            type="button"
            onClick={onSwitchToLeaflet}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <span>Switch to Free Canvas GIS (Esri)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export const MapGoogle: React.FC<MapGoogleProps> = ({
  tracts,
  retailers,
  churches = [],
  schools = [],
  selectedCounty,
  selectedTract,
  onSelectTract,
  shadingMode,
  setShadingMode,
  isDark,
  onSwitchToLeaflet,
}) => {
  const [showRetailers, setShowRetailers] = useState<boolean>(false);
  const [showChurches, setShowChurches] = useState<boolean>(false);
  const [showSchools, setShowSchools] = useState<boolean>(false);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [hoveredTract, setHoveredTract] = useState<TractData | null>(null);
  const [_tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Read Google Maps API Key from environment or local storage
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('GOOGLE_MAPS_API_KEY') || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  });
  const [keyInput, setKeyInput] = useState<string>('');
  const [_showKeyModal, setShowKeyModal] = useState<boolean>(false);

  useEffect(() => {
    const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (envKey && envKey !== apiKey) {
      setApiKey(envKey);
    }
  }, [apiKey]);

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      localStorage.setItem('GOOGLE_MAPS_API_KEY', keyInput.trim());
      setApiKey(keyInput.trim());
      setShowKeyModal(false);
    }
  };

  // If no API Key is available at all, offer prompt or quick fallback to Canvas GIS
  if (!apiKey) {
    return (
      <div className="relative w-full h-[600px] min-h-[520px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
        <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mb-4">
          <Globe className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold mb-2">Google Maps Platform Setup</h3>
        <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
          To view this map using Google Maps Platform (Roadmap, Satellite, Terrain), please provide a Google Maps API
          Key, or switch to the built-in Canvas GIS map which requires no key and has zero watermarks.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mb-4">
          <input
            type="text"
            placeholder="Paste Google Maps API Key (AIza...)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500"
          />
          <button
            type="button"
            onClick={handleSaveKey}
            disabled={!keyInput.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs whitespace-nowrap transition-colors"
          >
            Apply Key
          </button>
        </div>

        {onSwitchToLeaflet && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onSwitchToLeaflet}
              className="text-xs text-slate-400 hover:text-white underline flex items-center gap-1.5 transition-colors"
            >
              <span>Or switch directly to Canvas GIS (Esri World Canvas)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] min-h-[520px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col bg-slate-900">
      {/* 1. Top Map Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Shading Mode Selector */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-xs">
          <span className="px-2 font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Layer:</span>
          </span>
          <button
            type="button"
            onClick={() => setShadingMode('severity')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              shadingMode === 'severity'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Gap Severity
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('poverty')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              shadingMode === 'poverty'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Poverty Rate
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('vehicle')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              shadingMode === 'vehicle'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Vehicle Low Access
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('snap')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              shadingMode === 'snap'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            SNAP Rate
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('confidence')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              shadingMode === 'confidence'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Confidence
          </button>
        </div>

        {/* Right Controls: Retailer Toggle & Basemap Switcher */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Basemap type selector */}
          <div className="flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-xs">
            <button
              type="button"
              onClick={() => setMapTypeId('roadmap')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                mapTypeId === 'roadmap'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('satellite')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                mapTypeId === 'satellite'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('terrain')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                mapTypeId === 'terrain'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* SNAP Retailer Toggle */}
          <button
            type="button"
            onClick={() => setShowRetailers(!showRetailers)}
            className={`pointer-events-auto px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors ${
              showRetailers
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>SNAP Stores ({retailers.length})</span>
          </button>

          {/* Churches Toggle */}
          <button
            type="button"
            onClick={() => setShowChurches(!showChurches)}
            className={`pointer-events-auto px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors ${
              showChurches
                ? 'bg-purple-600 text-white border-purple-700'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Church className="w-3.5 h-3.5" />
            <span>Churches ({churches.length})</span>
          </button>

          {/* Schools Toggle */}
          <button
            type="button"
            onClick={() => setShowSchools(!showSchools)}
            className={`pointer-events-auto px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors ${
              showSchools
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Schools ({schools.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Google Map Instance */}
      <div className="w-full h-full flex-1 min-h-[500px]">
        <APIProvider apiKey={apiKey}>
          <MapLoadingChecker onSwitchToLeaflet={onSwitchToLeaflet}>
            <GoogleMapComponent
              style={{ width: '100%', height: '100%', minHeight: '500px' }}
              defaultCenter={{ lat: 28.5383, lng: -81.3792 }} // Central Florida / Orlando
              defaultZoom={9}
              mapTypeId={mapTypeId}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="greedy"
              disableDefaultUI={false}
              streetViewControl={false}
              mapTypeControl={false}
            >
              <GoogleMapDataLayer
                tracts={tracts}
                retailers={retailers}
                churches={churches}
                schools={schools}
                selectedCounty={selectedCounty}
                selectedTract={selectedTract}
                onSelectTract={onSelectTract}
                shadingMode={shadingMode}
                showRetailers={showRetailers}
                showChurches={showChurches}
                showSchools={showSchools}
                isDark={isDark}
                onHoverTract={(tract, pos) => {
                  setHoveredTract(tract);
                  setTooltipPos(pos);
                }}
              />
            </GoogleMapComponent>
          </MapLoadingChecker>
        </APIProvider>
      </div>

      {/* 3. Dynamic Tooltip on Hover */}
      {hoveredTract && (
        <div className="absolute top-16 left-4 z-20 pointer-events-none bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 backdrop-blur-md max-w-xs transition-opacity animate-fade-in">
          <div className="text-xs font-bold text-white mb-0.5">{hoveredTract.tract_name}</div>
          <div className="text-[11px] text-slate-300 font-medium">
            {hoveredTract.county} County · GEOID: {hoveredTract.GEOID}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Primary Classification:</span>
              <span className="font-semibold text-amber-300">{hoveredTract.primary_gap}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tract Population:</span>
              <span className="font-mono font-medium">{hoveredTract.population.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Poverty Rate:</span>
              <span className="font-mono font-medium">{hoveredTract.poverty_rate?.toFixed(1) || '0'}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SNAP Enrollment:</span>
              <span className="font-mono font-medium">{hoveredTract.snap_rate?.toFixed(1) || '0'}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence Score:</span>
              <span className="font-mono font-medium">{hoveredTract.confidence_score}/4</span>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 italic">Click polygon to view complete tract profile</div>
        </div>
      )}

      {/* 4. Bottom Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-xs">
        <div className="font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between gap-4">
          <span>
            {shadingMode === 'severity' && 'Gap Classification (Red-Scale)'}
            {shadingMode === 'poverty' && 'Poverty Rate (% Pop)'}
            {shadingMode === 'vehicle' && 'Vehicle Low Access Rate (%)'}
            {shadingMode === 'snap' && 'SNAP Participation Rate (%)'}
            {shadingMode === 'confidence' && 'Data Confidence Level (4-Point)'}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">Google Maps Engine</span>
        </div>

        {shadingMode === 'severity' && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#991b1b]" />
              <span className="text-slate-700 dark:text-slate-300">Classic food desert (68)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#dc2626]" />
              <span className="text-slate-700 dark:text-slate-300">Vehicle gap (75)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#f87171]" />
              <span className="text-slate-700 dark:text-slate-300">SNAP gap (5)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#f59e0b]" />
              <span className="text-slate-700 dark:text-slate-300">Blind spot (58)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#94a3b8]" />
              <span className="text-slate-700 dark:text-slate-300">Insufficient data (2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-700 dark:text-slate-300">No gap / High access</span>
            </div>
          </div>
        )}

        {shadingMode === 'poverty' && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 mr-1">&lt;7%</span>
            <span className="w-5 h-3 rounded-xs bg-[#fee2e2]" />
            <span className="w-5 h-3 rounded-xs bg-[#fca5a5]" />
            <span className="w-5 h-3 rounded-xs bg-[#ef4444]" />
            <span className="w-5 h-3 rounded-xs bg-[#b91c1c]" />
            <span className="w-5 h-3 rounded-xs bg-[#7f1d1d]" />
            <span className="text-slate-500 ml-1">&gt;25%</span>
          </div>
        )}

        {shadingMode === 'vehicle' && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 mr-1">&lt;4%</span>
            <span className="w-5 h-3 rounded-xs bg-[#ede9fe]" />
            <span className="w-5 h-3 rounded-xs bg-[#c4b5fd]" />
            <span className="w-5 h-3 rounded-xs bg-[#a78bfa]" />
            <span className="w-5 h-3 rounded-xs bg-[#7c3aed]" />
            <span className="w-5 h-3 rounded-xs bg-[#4c1d95]" />
            <span className="text-slate-500 ml-1">&gt;25%</span>
          </div>
        )}

        {shadingMode === 'snap' && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 mr-1">&lt;5%</span>
            <span className="w-5 h-3 rounded-xs bg-[#dbeafe]" />
            <span className="w-5 h-3 rounded-xs bg-[#93c5fd]" />
            <span className="w-5 h-3 rounded-xs bg-[#60a5fa]" />
            <span className="w-5 h-3 rounded-xs bg-[#2563eb]" />
            <span className="w-5 h-3 rounded-xs bg-[#1e3a8a]" />
            <span className="text-slate-500 ml-1">&gt;25%</span>
          </div>
        )}

        {shadingMode === 'confidence' && (
          <div className="flex items-center gap-2 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-[#059669]" />
              <span className="text-slate-600 dark:text-slate-300">High (4)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-[#0d9488]" />
              <span className="text-slate-600 dark:text-slate-300">Moderate (3)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-[#d97706]" />
              <span className="text-slate-600 dark:text-slate-300">Low (2)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-[#dc2626]" />
              <span className="text-slate-600 dark:text-slate-300">Very Low (1)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
