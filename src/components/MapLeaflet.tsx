import type { Feature, FeatureCollection, Geometry } from 'geojson';
import L from 'leaflet';
import { Church, GraduationCap, Layers, Store } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChurchData, CountyFilter, RetailerData, SchoolData, ShadingMode, TractData } from '../types';

type TractFeature = Feature<Geometry, { GEOID?: string }>;
type TractCollection = FeatureCollection<Geometry, { GEOID?: string }>;

interface MapLeafletProps {
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
}

export const MapLeaflet: React.FC<MapLeafletProps> = ({
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const retailerLayerRef = useRef<L.LayerGroup | null>(null);
  const churchLayerRef = useRef<L.LayerGroup | null>(null);
  const schoolLayerRef = useRef<L.LayerGroup | null>(null);

  const [showRetailers, setShowRetailers] = useState<boolean>(false);
  const [showChurches, setShowChurches] = useState<boolean>(false);
  const [showSchools, setShowSchools] = useState<boolean>(false);
  const [geojsonData, setGeojsonData] = useState<TractCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Map of tracts by GEOID
  const tractMap = useRef<Map<string, TractData>>(new Map());
  useEffect(() => {
    const map = new Map<string, TractData>();
    for (const t of tracts) map.set(t.GEOID, t);
    tractMap.current = map;
  }, [tracts]);

  // Fetch GeoJSON boundary file once
  useEffect(() => {
    fetch('/data/central_fl_tracts.geojson')
      .then((res) => res.json() as Promise<TractCollection>)
      .then((data) => {
        setGeojsonData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading GeoJSON:', err);
        setLoading(false);
      });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.5383, -81.3792], // Orlando, FL center
      zoom: 9,
      minZoom: 8,
      maxZoom: 16,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Use Esri World Gray Canvas (light/dark) - zero watermark, designed for choropleth GIS maps
    const tileUrl = isDark
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    const tiles = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, USGS, Census 2020 TIGER',
      maxZoom: 16,
    });
    tiles.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isDark]);

  // Style function for GeoJSON polygons based on shadingMode
  const getFeatureStyle = useCallback(
    (feature?: TractFeature): L.PathOptions => {
      const geoid = feature?.properties?.GEOID;
      const tract = tractMap.current.get(geoid ?? '');
      const isSelected = selectedTract && selectedTract.GEOID === geoid;

      let fillColor = isDark ? '#1e293b' : '#f1f5f9';
      let fillOpacity = 0.8;
      let strokeColor = isDark ? '#334155' : '#cbd5e1';
      let weight = 1;

      if (!tract) {
        return { fillColor, fillOpacity, color: strokeColor, weight };
      }

      // Check if filtered out by county
      if (selectedCounty !== 'All' && tract.county !== selectedCounty) {
        return {
          fillColor: isDark ? '#0f172a' : '#f8fafc',
          fillOpacity: 0.15,
          color: isDark ? '#1e293b' : '#e2e8f0',
          weight: 0.5,
        };
      }

      if (shadingMode === 'severity') {
        switch (tract.primary_gap) {
          case 'Classic food desert':
            fillColor = '#991b1b'; // Dark Crimson
            fillOpacity = 0.9;
            break;
          case 'Vehicle-compounded gap':
            fillColor = '#dc2626'; // Vivid Red
            fillOpacity = 0.85;
            break;
          case 'SNAP enrollment gap':
            fillColor = '#f87171'; // Light Red / Coral
            fillOpacity = 0.8;
            break;
          case 'Possible blind spot':
            fillColor = '#fca5a5'; // Lightest red / Salmon (monochromatic red scale)
            fillOpacity = 0.8;
            break;
          case 'Insufficient data':
            fillColor = '#94a3b8'; // Slate
            fillOpacity = 0.6;
            break;
          default:
            fillColor = isDark ? '#1e293b' : '#e2e8f0';
            fillOpacity = 0.5;
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
        const vehShare = tract.no_vehicle_low_access_pct ?? 0;
        if (vehShare >= 0.75) fillColor = '#581c87';
        else if (vehShare >= 0.5) fillColor = '#7e22ce';
        else if (vehShare >= 0.25) fillColor = '#a855f7';
        else if (vehShare > 0) fillColor = '#d8b4fe';
        else fillColor = isDark ? '#1e293b' : '#f3e8ff';
        fillOpacity = 0.85;
      } else if (shadingMode === 'confidence') {
        if (tract.review_tier === 'Tier 1') {
          fillColor = '#15803d'; // Green (Ready to act)
        } else if (tract.review_tier === 'Tier 2') {
          fillColor = '#eab308'; // Yellow (Team review)
        } else {
          fillColor = '#dc2626'; // Red (Review required)
        }
        fillOpacity = 0.8;
      }

      if (isSelected) {
        strokeColor = '#2563eb'; // Blue highlight
        weight = 3;
        fillOpacity = 0.95;
      }

      return {
        fillColor,
        fillOpacity,
        color: strokeColor,
        weight,
      };
    },
    [isDark, selectedCounty, selectedTract, shadingMode],
  );

  // Render GeoJSON Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonData) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }

    const geoLayer = L.geoJSON(geojsonData, {
      style: getFeatureStyle,
      onEachFeature: (feature, layer) => {
        const geoid = feature?.properties?.GEOID;
        const tract = tractMap.current.get(geoid ?? '');

        if (tract) {
          // FR-04: Tooltip with key specs
          const povText =
            tract.poverty_rate !== null
              ? `${tract.poverty_rate.toFixed(1)}% (±${tract.poverty_rate_moe?.toFixed(1) || '0'}%)`
              : 'N/A';
          const snapText = tract.snap_rate !== null ? `${tract.snap_rate.toFixed(1)}%` : 'N/A';

          const tooltipContent = `
            <div style="font-size: 12px; line-height: 1.4; padding: 2px;">
              <div style="font-weight: 600; color: #0f172a;">${tract.tract_name}</div>
              <div style="color: #64748b; margin-bottom: 4px;">${tract.county} County · GEOID ${tract.GEOID}</div>
              <div><b>Gap:</b> <span style="color: ${tract.has_gap ? '#dc2626' : '#1e293b'}">${tract.primary_gap}</span></div>
              <div><b>Population:</b> ${tract.population.toLocaleString()}</div>
              <div><b>Poverty:</b> ${povText} · <b>SNAP:</b> ${snapText}</div>
              <div><b>Confidence:</b> ${tract.confidence} (${tract.review_tier})</div>
              <div style="color: #0369a1; margin-top: 4px;"><b>Response:</b> ${tract.recommended_resource}</div>
            </div>
          `;

          layer.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          });

          layer.on({
            click: () => {
              onSelectTract(tract);
            },
            mouseover: (e) => {
              const target = e.target;
              target.setStyle({ weight: 2.5, color: '#0284c7' });
              target.bringToFront();
            },
            mouseout: (e) => {
              geoLayer.resetStyle(e.target);
            },
          });
        }
      },
    });

    geoLayer.addTo(map);
    geojsonLayerRef.current = geoLayer;

    // Adjust bounds if county is filtered
    if (selectedCounty === 'All') {
      map.setView([28.5383, -81.3792], 9);
    } else {
      const countyFeatures = geojsonData.features.filter(
        (f) => (tractMap.current.get(f.properties?.GEOID ?? '')?.county as string) === selectedCounty,
      );
      if (countyFeatures.length > 0) {
        const subset: TractCollection = { type: 'FeatureCollection', features: countyFeatures };
        const tempLayer = L.geoJSON(subset);
        map.fitBounds(tempLayer.getBounds(), { padding: [20, 20] });
      }
    }
  }, [geojsonData, selectedCounty, onSelectTract, getFeatureStyle]);

  // Render SNAP Retailers Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (retailerLayerRef.current) {
      map.removeLayer(retailerLayerRef.current);
      retailerLayerRef.current = null;
    }

    if (showRetailers && retailers.length > 0) {
      const markers: L.CircleMarker[] = [];
      const filteredRetailers =
        selectedCounty === 'All' ? retailers : retailers.filter((r) => r.county === selectedCounty);

      filteredRetailers.forEach((r) => {
        const marker = L.circleMarker([r.latitude, r.longitude], {
          radius: 4,
          fillColor: '#10b981',
          color: '#047857',
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.85,
        });

        marker.bindTooltip(
          `<div style="font-size: 11px;"><b>🛒 ${r.store_name}</b><br/>${r.address}, ${r.city}<br/><span style="color:#059669; font-weight:600;">Authorized SNAP Retailer</span></div>`,
          { sticky: true },
        );
        markers.push(marker);
      });

      const layerGroup = L.layerGroup(markers);
      layerGroup.addTo(map);
      retailerLayerRef.current = layerGroup;
    }
  }, [showRetailers, retailers, selectedCounty]);

  // Render Churches Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (churchLayerRef.current) {
      map.removeLayer(churchLayerRef.current);
      churchLayerRef.current = null;
    }

    if (showChurches && churches && churches.length > 0) {
      const markers: L.CircleMarker[] = [];
      const filteredChurches =
        selectedCounty === 'All' ? churches : churches.filter((c) => c.county === selectedCounty);

      filteredChurches.forEach((c) => {
        const marker = L.circleMarker([c.latitude, c.longitude], {
          radius: 5,
          fillColor: '#8b5cf6',
          color: '#5b21b6',
          weight: 2,
          opacity: 0.95,
          fillOpacity: 0.9,
        });

        marker.bindTooltip(
          `<div style="font-size: 11px;"><b>✝️ ${c.name}</b><br/>${c.address}, ${c.city}<br/><span style="color:#7c3aed; font-weight:600;">${c.type}</span></div>`,
          { sticky: true },
        );
        markers.push(marker);
      });

      const layerGroup = L.layerGroup(markers);
      layerGroup.addTo(map);
      churchLayerRef.current = layerGroup;
    }
  }, [showChurches, churches, selectedCounty]);

  // Render Schools Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (schoolLayerRef.current) {
      map.removeLayer(schoolLayerRef.current);
      schoolLayerRef.current = null;
    }

    if (showSchools && schools && schools.length > 0) {
      const markers: L.CircleMarker[] = [];
      const filteredSchools = selectedCounty === 'All' ? schools : schools.filter((s) => s.county === selectedCounty);

      filteredSchools.forEach((s) => {
        const marker = L.circleMarker([s.latitude, s.longitude], {
          radius: 5,
          fillColor: '#f59e0b',
          color: '#b45309',
          weight: 2,
          opacity: 0.95,
          fillOpacity: 0.9,
        });

        marker.bindTooltip(
          `<div style="font-size: 11px;"><b>🏫 ${s.name}</b><br/>${s.address}, ${s.city}<br/><span style="color:#d97706; font-weight:600;">${s.type}</span></div>`,
          { sticky: true },
        );
        markers.push(marker);
      });

      const layerGroup = L.layerGroup(markers);
      layerGroup.addTo(map);
      schoolLayerRef.current = layerGroup;
    }
  }, [showSchools, schools, selectedCounty]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Map Control Bar Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg shadow-sm border border-slate-200/80 dark:border-slate-700/80">
        <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Shading:</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShadingMode('severity')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              shadingMode === 'severity'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Gap Severity (Red Scale)
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('poverty')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              shadingMode === 'poverty'
                ? 'bg-red-800 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Poverty Rate
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('snap')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              shadingMode === 'snap'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            SNAP Rate
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('vehicle')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              shadingMode === 'vehicle'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Vehicle Low Access
          </button>
          <button
            type="button"
            onClick={() => setShadingMode('confidence')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              shadingMode === 'confidence'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Confidence Tier
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Retailer Layer Toggle */}
        <button
          type="button"
          onClick={() => setShowRetailers(!showRetailers)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
            showRetailers
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>SNAP Stores ({retailers.length.toLocaleString()})</span>
        </button>

        {/* Churches Layer Toggle */}
        <button
          type="button"
          onClick={() => setShowChurches(!showChurches)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
            showChurches
              ? 'bg-purple-600 text-white border-purple-700'
              : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Church className="w-3.5 h-3.5" />
          <span>Churches ({churches.length.toLocaleString()})</span>
        </button>

        {/* Schools Layer Toggle */}
        <button
          type="button"
          onClick={() => setShowSchools(!showSchools)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
            showSchools
              ? 'bg-amber-600 text-white border-amber-700'
              : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Schools ({schools.length.toLocaleString()})</span>
        </button>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />

      {/* Legend Card Bottom Right */}
      <div className="absolute bottom-4 right-4 z-[1000] p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-xs max-w-xs transition-colors">
        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center justify-between">
          <span>
            {shadingMode === 'severity'
              ? 'Gap Severity Legend (FR-02)'
              : shadingMode === 'poverty'
                ? 'Poverty Rate Legend (FR-03)'
                : shadingMode === 'snap'
                  ? 'SNAP Participation Rate'
                  : shadingMode === 'vehicle'
                    ? 'No-Vehicle Access Share'
                    : 'Review Tier Legend'}
          </span>
        </div>

        {shadingMode === 'severity' ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#991b1b] shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">Classic food desert (68 tracts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#dc2626] shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">Vehicle-compounded gap (74-76 tracts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#f87171] shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">SNAP enrollment gap (5-6 tracts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#fca5a5] shrink-0 border border-slate-300 dark:border-slate-600" />
              <span className="text-slate-700 dark:text-slate-300">Possible blind spot</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#94a3b8] shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">Insufficient data (2 tracts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-slate-200 dark:bg-slate-700 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">No gap identified (283 tracts)</span>
            </div>
          </div>
        ) : shadingMode === 'poverty' ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#7f1d1d]" />
              <span className="text-slate-700 dark:text-slate-300">25.0%+ (Severe poverty)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#b91c1c]" />
              <span className="text-slate-700 dark:text-slate-300">18.0% – 24.9% (Q4 regional)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#ef4444]" />
              <span className="text-slate-700 dark:text-slate-300">12.0% – 17.9% (Q3 elevated)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#fca5a5]" />
              <span className="text-slate-700 dark:text-slate-300">7.0% – 11.9% (Q2)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-red-100 dark:bg-slate-800" />
              <span className="text-slate-700 dark:text-slate-300">&lt; 7.0% (Q1 lowest)</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#15803d]" />
              <span className="text-slate-700 dark:text-slate-300">Tier 1: High confidence (Ready to act)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#eab308]" />
              <span className="text-slate-700 dark:text-slate-300">Tier 2: Medium confidence (Team review)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#dc2626]" />
              <span className="text-slate-700 dark:text-slate-300">Review required: Blind spots / wide MOE</span>
            </div>
          </div>
        )}

        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
          Click any tract for complete demographic breakdown and action plan.
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading 490 Central Florida Census Tracts...</span>
          </div>
        </div>
      )}
    </div>
  );
};
