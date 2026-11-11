import L from 'leaflet';
import {
  CheckCircle2,
  Church,
  Clock,
  FileText,
  GraduationCap,
  Map as MapIcon,
  Navigation,
  Printer,
  RotateCcw,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Truck,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChurchData,
  CountyFilter,
  CountyName,
  FoodTruckRoute,
  RouteDispatchStatus,
  RouteStop,
  SchoolData,
  TractData,
} from '../types';

interface FoodTruckRouteViewProps {
  tracts: TractData[];
  churches: ChurchData[];
  schools: SchoolData[];
  selectedCounty: CountyFilter;
  onSelectCounty: (county: CountyFilter) => void;
  onSelectTract: (tract: TractData) => void;
  isDark?: boolean;
}

// Distribution Depots across Central Florida
interface Depot {
  id: string;
  name: string;
  address: string;
  county: string;
  latitude: number;
  longitude: number;
}

// Non-empty tuple so `DEPOTS[0]` is always defined.
const DEPOTS: [Depot, ...Depot[]] = [
  {
    id: 'second_harvest',
    name: 'Second Harvest Food Bank of Central Florida',
    address: '411 Mercy Dr, Orlando, FL 32805',
    county: 'Orange',
    latitude: 28.5583,
    longitude: -81.4282,
  },
  {
    id: 'osceola_hub',
    name: 'Osceola Community Food Distribution Center',
    address: '1500 US-192, Kissimmee, FL 34744',
    county: 'Osceola',
    latitude: 28.2919,
    longitude: -81.3912,
  },
  {
    id: 'lake_hub',
    name: 'Lake County Mobile Pantry Center',
    address: '315 W Main St, Tavares, FL 32778',
    county: 'Lake',
    latitude: 28.8039,
    longitude: -81.7298,
  },
  {
    id: 'seminole_hub',
    name: 'Seminole Food Outreach Depot',
    address: '515 S Park Ave, Sanford, FL 32771',
    county: 'Seminole',
    latitude: 28.8089,
    longitude: -81.2676,
  },
];

// Helper: Haversine distance in miles
function getHaversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Find surrounding tract for lat/lng to get poverty & gap type
function findSurroundingTract(lat: number, lng: number, tracts: TractData[]): TractData | null {
  let nearest: TractData | null = null;
  let minDist = Infinity;
  for (const t of tracts) {
    if (typeof t.latitude !== 'number' || typeof t.longitude !== 'number') continue;
    const dist = getHaversineMiles(lat, lng, t.latitude, t.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = t;
    }
  }
  return nearest;
}

// Helper to format 24h time to 12h string
function formatTimeStr(minutesFromMidnight: number): string {
  const hrs = Math.floor(minutesFromMidnight / 60) % 24;
  const mins = Math.floor(minutesFromMidnight % 60);
  const period = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
  const displayMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `${displayHrs}:${displayMins} ${period}`;
}

// Interactive Map Sub-Component with Polyline Route & Sequential Stop Markers
const RouteInteractiveMap: React.FC<{
  depot: { name: string; address: string; latitude: number; longitude: number };
  stops: RouteStop[];
  isDark?: boolean;
}> = ({ depot, stops, isDark }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([depot.latitude, depot.longitude], 10);

    mapInstanceRef.current = map;

    // Basemap tiles
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      attribution: '&copy; Esri, OpenStreetMap contributors',
    }).addTo(map);

    // 1. Add Depot Marker
    const depotIcon = L.divIcon({
      className: 'custom-depot-marker',
      html: `<div style="background-color:#991b1b; color:#ffffff; font-weight:bold; font-size:11px; padding:4px 8px; border-radius:6px; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.3); display:flex; items-center; gap:4px; white-space:nowrap;">
        🏢 DEPOT: ${depot.name.slice(0, 18)}...
      </div>`,
      iconSize: [120, 28],
      iconAnchor: [60, 14],
    });

    const depotMarker = L.marker([depot.latitude, depot.longitude], { icon: depotIcon }).addTo(map);
    depotMarker.bindPopup(`
      <div style="font-family:sans-serif; padding:4px;">
        <strong style="color:#991b1b; font-size:12px;">🏢 Depot: ${depot.name}</strong>
        <div style="font-size:11px; color:#4b5563; margin-top:2px;">${depot.address}</div>
        <div style="font-size:10px; color:#059669; font-weight:bold; margin-top:4px;">Route Start &amp; End Hub</div>
      </div>
    `);

    // 2. Add Sequential Stop Markers & Build Polyline Points
    const routeLatLngs: [number, number][] = [[depot.latitude, depot.longitude]];

    stops.forEach((stop) => {
      routeLatLngs.push([stop.latitude, stop.longitude]);

      const isChurch = stop.locationType === 'Church';
      const bgColor = isChurch ? '#8b5cf6' : '#f59e0b';
      const iconSymbol = isChurch ? '✝️' : '🏫';

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `<div style="background-color:${bgColor}; color:#ffffff; width:28px; height:28px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; font-family:sans-serif;">
          ${stop.stopNumber}
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif; padding:4px; max-width:220px;">
          <div style="font-size:10px; font-weight:bold; color:${bgColor}; text-transform:uppercase;">
            Stop #${stop.stopNumber} · ${iconSymbol} ${stop.locationType} Delivery Site
          </div>
          <strong style="font-size:12px; color:#111827; display:block; margin-top:2px;">${stop.locationName}</strong>
          <div style="font-size:11px; color:#4b5563;">${stop.locationAddress}, ${stop.city}</div>
          <div style="margin-top:6px; padding-top:4px; border-top:1px solid #e5e7eb; font-size:11px;">
            <div>🕒 Arrival: <strong>${stop.estimatedArrival} - ${stop.departureTime}</strong></div>
            <div>📊 Poverty Rate: <strong>${stop.surroundingPovertyRate.toFixed(1)}%</strong></div>
            <div>🚨 Food Gap: <span style="color:#dc2626; font-weight:bold;">${stop.surroundingGapType}</span></div>
            <div>🛒 Provisions: <span style="color:#059669;">${stop.keyNeedsSummary}</span></div>
          </div>
        </div>
      `);
    });

    // Close loop back to Depot
    routeLatLngs.push([depot.latitude, depot.longitude]);

    // 3. Draw Route Polyline
    const _routePolyline = L.polyline(routeLatLngs, {
      color: '#a50f15',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
    }).addTo(map);

    // 4. Fit map bounds to contain all stops & depot
    if (routeLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(routeLatLngs), { padding: [40, 40] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [depot, stops, isDark]);

  return (
    <div className="w-full h-[420px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-xs flex items-center gap-2">
        <MapIcon className="w-3.5 h-3.5 text-[#a50f15]" />
        <span className="font-semibold text-slate-900 dark:text-slate-100">Food Truck Driving Circuit Map</span>
        <span className="text-[10px] text-slate-500 font-mono">({stops.length} Church/School Delivery Stops)</span>
      </div>
    </div>
  );
};

export const FoodTruckRouteView: React.FC<FoodTruckRouteViewProps> = ({
  tracts,
  churches = [],
  schools = [],
  selectedCounty,
  onSelectCounty,
  isDark,
}) => {
  // Configurable route parameters
  const [selectedDepotId, setSelectedDepotId] = useState<string>('second_harvest');
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'churches' | 'schools'>('all');
  const [maxStops, setMaxStops] = useState<number>(5);
  const [stopDurationMins, setStopDurationMins] = useState<number>(45);
  const [truckName, setTruckName] = useState<string>('Mobile Market Fleet Truck #04');
  const [driverName, setDriverName] = useState<string>('Marcus Vance');
  const [managerNotes, setManagerNotes] = useState<string>(
    'Priority route serving high-poverty food desert churches and school meal sites. Ensure refrigeration units are set for fresh produce and dairy bins.',
  );

  // Workflow Dispatch Status State
  const [status, setStatus] = useState<RouteDispatchStatus>('Draft');
  const [approvedBy, setApprovedBy] = useState<string>('');
  const [approvalTimestamp, setApprovalTimestamp] = useState<string>('');
  const [dispatchedTimestamp, setDispatchedTimestamp] = useState<string>('');
  const [showManifestModal, setShowManifestModal] = useState<boolean>(false);

  // Selected Depot
  const activeDepot = useMemo(() => {
    return DEPOTS.find((d) => d.id === selectedDepotId) || DEPOTS[0];
  }, [selectedDepotId]);

  // Combine & Filter Candidates: Only Churches and Schools located in Food Gap areas (EXCLUDING "No gap identified")
  const highNeedDeliveryLocations = useMemo(() => {
    const rawLocations: Array<{
      id: string;
      name: string;
      address: string;
      city: string;
      county: string;
      latitude: number;
      longitude: number;
      type: 'Church' | 'School';
      facilityRole: string;
    }> = [];

    if (facilityFilter === 'all' || facilityFilter === 'churches') {
      (churches || []).forEach((c) => {
        rawLocations.push({
          id: c.id,
          name: c.name,
          address: c.address,
          city: c.city,
          county: c.county,
          latitude: c.latitude,
          longitude: c.longitude,
          type: 'Church',
          facilityRole: c.type,
        });
      });
    }

    if (facilityFilter === 'all' || facilityFilter === 'schools') {
      (schools || []).forEach((s) => {
        rawLocations.push({
          id: s.id,
          name: s.name,
          address: s.address,
          city: s.city,
          county: s.county,
          latitude: s.latitude,
          longitude: s.longitude,
          type: 'School',
          facilityRole: s.type,
        });
      });
    }

    // Filter locations by county and EXCLUDE "No gap identified" or "Insufficient data"
    const gapFiltered = rawLocations.filter((loc) => {
      if (selectedCounty !== 'All' && loc.county !== selectedCounty) return false;

      // Find surrounding census tract
      const tract = findSurroundingTract(loc.latitude, loc.longitude, tracts);
      if (!tract) return false;

      // CRITICAL CLIENT REQUIREMENT: REMOVE "No gap identified" and "Insufficient data"
      if (
        tract.primary_gap === 'No gap identified' ||
        tract.primary_gap === 'Insufficient data' ||
        tract.has_gap === 0
      ) {
        return false;
      }

      return true;
    });

    // Sort locations by surrounding poverty rate & gap severity (highest poverty first)
    return gapFiltered.sort((a, b) => {
      const tractA = findSurroundingTract(a.latitude, a.longitude, tracts);
      const tractB = findSurroundingTract(b.latitude, b.longitude, tracts);
      const povA = tractA?.poverty_rate || 0;
      const povB = tractB?.poverty_rate || 0;
      return povB - povA;
    });
  }, [churches, schools, tracts, selectedCounty, facilityFilter]);

  // Generate & Optimize Food Truck Route (Nearest-Neighbor Circuit)
  const routeData: FoodTruckRoute = useMemo(() => {
    const unvisited = [...highNeedDeliveryLocations.slice(0, maxStops * 2)];
    const orderedStops: RouteStop[] = [];

    let currLat = activeDepot.latitude;
    let currLng = activeDepot.longitude;

    let totalDistMiles = 0;
    let totalDriveMins = 0;
    let currentTimeMins = 8 * 60 + 30; // Start at 8:30 AM

    let stopNum = 1;
    const targetCount = Math.min(maxStops, unvisited.length);

    while (orderedStops.length < targetCount && unvisited.length > 0) {
      // Nearest neighbor selection
      let nearestIdx = 0;
      let minDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        if (!candidate) continue;
        const dist = getHaversineMiles(currLat, currLng, candidate.latitude, candidate.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }

      const nextLoc = unvisited.splice(nearestIdx, 1)[0];
      if (!nextLoc) break;
      const surroundingTract = findSurroundingTract(nextLoc.latitude, nextLoc.longitude, tracts);

      const roadDistMiles = Math.round(minDist * 1.28 * 10) / 10;
      const driveMins = Math.round((roadDistMiles / 25) * 60);

      totalDistMiles += roadDistMiles;
      totalDriveMins += driveMins;
      currentTimeMins += driveMins;

      const arrivalStr = formatTimeStr(currentTimeMins);
      const departureMins = currentTimeMins + stopDurationMins;
      const departureStr = formatTimeStr(departureMins);

      // Determine key provisions
      let keyNeeds = 'Fresh Produce, Whole Grains, Dairy Bins';
      if (surroundingTract?.primary_gap === 'Vehicle-compounded gap') {
        keyNeeds = 'Heavy Pantry Staples, Grocery Delivery Boxes, Cooking Oil';
      } else if (surroundingTract?.primary_gap === 'SNAP enrollment gap') {
        keyNeeds = 'Produce, Dairy + On-Site SNAP Application Kiosk';
      }

      let instructions = `Park in ${nextLoc.type === 'Church' ? 'church community lot' : 'school meal pickup bay'}; safe turning radius.`;
      if ((surroundingTract?.no_vehicle_pct || 0) > 15) {
        instructions = 'High non-vehicle area: set up market table near pedestrian entrance & bus stop.';
      }

      orderedStops.push({
        stopNumber: stopNum,
        locationId: nextLoc.id,
        locationName: nextLoc.name,
        locationAddress: nextLoc.address,
        locationType: nextLoc.type,
        city: nextLoc.city,
        county: nextLoc.county as CountyName,
        latitude: nextLoc.latitude,
        longitude: nextLoc.longitude,
        surroundingPovertyRate: surroundingTract?.poverty_rate || 0,
        surroundingGapType: surroundingTract?.primary_gap || 'Classic food desert',
        estimatedArrival: arrivalStr,
        departureTime: departureStr,
        stopDurationMins,
        targetPeopleServed: Math.round((surroundingTract?.population || 3500) * 0.12),
        keyNeedsSummary: keyNeeds,
        specialInstructions: instructions,
      });

      currLat = nextLoc.latitude;
      currLng = nextLoc.longitude;
      currentTimeMins = departureMins;
      stopNum++;
    }

    // Return to Depot distance
    const returnDist =
      Math.round(getHaversineMiles(currLat, currLng, activeDepot.latitude, activeDepot.longitude) * 1.28 * 10) / 10;
    totalDistMiles = Math.round((totalDistMiles + returnDist) * 10) / 10;
    totalDriveMins += Math.round((returnDist / 25) * 60);

    const totalServiceMins = orderedStops.length * stopDurationMins;
    const totalPeople = orderedStops.reduce((sum, s) => sum + s.targetPeopleServed, 0);

    return {
      routeId: `ROUTE-DELIVERY-${selectedCounty.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      routeName: `${selectedCounty} Church & School Mobile Market Route`,
      truckName,
      driverName,
      depotName: activeDepot.name,
      depotAddress: activeDepot.address,
      depotLat: activeDepot.latitude,
      depotLng: activeDepot.longitude,
      county: selectedCounty,
      priorityFocus: 'High-Poverty Churches & School Meal Delivery Sites (Gap Areas Only)',
      totalDistanceMiles: totalDistMiles,
      totalDrivingMinutes: totalDriveMins,
      totalServiceMinutes: totalServiceMins,
      totalPeopleServed: totalPeople,
      stops: orderedStops,
      status,
      approvedBy,
      approvalTimestamp,
      dispatchedTimestamp,
      logisticsNotes: managerNotes,
    };
  }, [
    highNeedDeliveryLocations,
    maxStops,
    stopDurationMins,
    activeDepot,
    tracts,
    selectedCounty,
    truckName,
    driverName,
    managerNotes,
    status,
    approvedBy,
    approvalTimestamp,
    dispatchedTimestamp,
  ]);

  // Handle Manager Approval
  const handleApprove = () => {
    const nowStr = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    setApprovedBy('Pedro - Food Program Director');
    setApprovalTimestamp(nowStr);
    setStatus('Approved');
  };

  // Handle Dispatch to Logistics
  const handleDispatch = () => {
    const nowStr = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    setDispatchedTimestamp(nowStr);
    setStatus('Dispatched');
    setShowManifestModal(true);
  };

  // Handle Print / Export Manifest
  const handlePrintManifest = () => {
    window.print();
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* 1. Header Banner & Title */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#a50f15] text-white flex items-center justify-center font-bold shadow-xs">
                <Truck className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Church &amp; School Mobile Market Route Optimizer
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Design optimized mobile market delivery routes stopping at{' '}
              <strong>Churches, Faith Pantries, and School Meal Sites</strong> located strictly inside verified food gap
              areas (excluding low-need areas). Allows managers to review, approve, and dispatch manifests to logistics.
            </p>
          </div>

          {/* Workflow Status Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Dispatch Status</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                    : status === 'Dispatched'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                }`}
              >
                {status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {status === 'Dispatched' && <Send className="w-3.5 h-3.5" />}
                {status === 'Draft' && <Clock className="w-3.5 h-3.5" />}
                <span>
                  {status === 'Draft'
                    ? 'Draft Review'
                    : status === 'Approved'
                      ? 'Manager Approved'
                      : 'Dispatched to Logistics'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Program Manager Guide Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-lg p-3 text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>How to Use the Mobile Market Route Optimizer (3 Quick Steps)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
              <span className="w-5 h-5 rounded-full bg-[#a50f15] text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                1
              </span>
              <div>
                <strong className="block text-slate-900 dark:text-slate-100">Select Target Community</strong>
                <span className="text-[11px] text-slate-500">
                  Pick your county and select Church or School delivery sites.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
              <span className="w-5 h-5 rounded-full bg-[#a50f15] text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                2
              </span>
              <div>
                <strong className="block text-slate-900 dark:text-slate-100">Review Driving Circuit</strong>
                <span className="text-[11px] text-slate-500">
                  Check arrival times, driving distance, and estimated families served.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
              <span className="w-5 h-5 rounded-full bg-[#a50f15] text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                3
              </span>
              <div>
                <strong className="block text-slate-900 dark:text-slate-100">Approve &amp; Send to Logistics</strong>
                <span className="text-[11px] text-slate-500">
                  Sign off on the schedule and send the official manifest to driver.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Map of the Route */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#a50f15]" />
            <span>Interactive Route Map &amp; Delivery Circuit</span>
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#8b5cf6] inline-block" />
              <span className="text-slate-600 dark:text-slate-300">Church Stops</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" />
              <span className="text-slate-600 dark:text-slate-300">School Stops</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#991b1b] inline-block" />
              <span className="text-slate-600 dark:text-slate-300">Start/End Depot</span>
            </span>
          </div>
        </div>

        <RouteInteractiveMap depot={activeDepot} stops={routeData.stops} isDark={isDark} />
      </div>

      {/* 3. Controls & Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-[#a50f15]" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Delivery Stop Parameters</h2>
          </div>

          {/* County Selector */}
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Target County</label>
            <select
              value={selectedCounty}
              onChange={(e) => onSelectCounty(e.target.value as CountyFilter)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#a50f15]"
            >
              <option value="All">All Central Florida (490 Tracts)</option>
              <option value="Orange">Orange County</option>
              <option value="Osceola">Osceola County</option>
              <option value="Seminole">Seminole County</option>
              <option value="Lake">Lake County</option>
            </select>
          </div>

          {/* Facility Location Type Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Delivery Area Type
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setFacilityFilter('all')}
                className={`py-1.5 px-2 rounded-md font-medium text-[11px] transition-colors ${
                  facilityFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-[#a50f15] font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Sites
              </button>
              <button
                type="button"
                onClick={() => setFacilityFilter('churches')}
                className={`py-1.5 px-2 rounded-md font-medium text-[11px] transition-colors ${
                  facilityFilter === 'churches'
                    ? 'bg-purple-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Churches
              </button>
              <button
                type="button"
                onClick={() => setFacilityFilter('schools')}
                className={`py-1.5 px-2 rounded-md font-medium text-[11px] transition-colors ${
                  facilityFilter === 'schools'
                    ? 'bg-amber-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Schools
              </button>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-1.5 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Strictly filtering gap areas only (excluding no gap identified)</span>
            </span>
          </div>

          {/* Depot Selector */}
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Distribution Depot (Start / Finish)
            </label>
            <select
              value={selectedDepotId}
              onChange={(e) => setSelectedDepotId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#a50f15]"
            >
              {DEPOTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.county} Co.)
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 block mt-1">{activeDepot.address}</span>
          </div>

          {/* Max Stops Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span>Max Daily Stops:</span>
              <span className="font-mono font-bold text-[#a50f15]">{maxStops} delivery sites</span>
            </div>
            <input
              type="range"
              min={3}
              max={8}
              step={1}
              value={maxStops}
              onChange={(e) => setMaxStops(Number(e.target.value))}
              className="w-full accent-[#a50f15] cursor-pointer"
            />
          </div>

          {/* Stop Duration */}
          <div>
            <div className="flex justify-between items-center text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span>Duration per Stop:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{stopDurationMins} mins</span>
            </div>
            <input
              type="range"
              min={30}
              max={90}
              step={15}
              value={stopDurationMins}
              onChange={(e) => setStopDurationMins(Number(e.target.value))}
              className="w-full accent-[#a50f15] cursor-pointer"
            />
          </div>

          {/* Fleet Details */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Fleet Vehicle</label>
              <input
                type="text"
                value={truckName}
                onChange={(e) => setTruckName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Assigned Driver</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Route Key Performance Metrics & Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block">Total Driving Distance</span>
              <div className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
                {routeData.totalDistanceMiles} mi
              </div>
              <span className="text-[10px] text-slate-400">Depot circuit roundtrip</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block">Total Service Time</span>
              <div className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
                {Math.floor((routeData.totalDrivingMinutes + routeData.totalServiceMinutes) / 60)}h{' '}
                {(routeData.totalDrivingMinutes + routeData.totalServiceMinutes) % 60}m
              </div>
              <span className="text-[10px] text-slate-400">
                Drive: {routeData.totalDrivingMinutes}m | Service: {routeData.totalServiceMinutes}m
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block">Target Residents Served</span>
              <div className="text-xl font-serif font-bold text-[#a50f15] dark:text-red-400 font-mono tabular-nums mt-0.5">
                ~{routeData.totalPeopleServed.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">
                Across {routeData.stops.length} Church &amp; School sites
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block">Food Gap Precision</span>
              <div className="text-xl font-serif font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                100%
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">0% non-gap stops included</span>
            </div>
          </div>

          {/* Sequential Itinerary Schedule Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#a50f15]" />
                  <span>Sequential Delivery Itinerary (Churches &amp; Schools)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Depot: {routeData.depotName} &rarr; Stops 1 to {routeData.stops.length} &rarr; Depot Return
                </p>
              </div>
              <span className="text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                {routeData.routeId}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Stop #</th>
                    <th className="py-2.5 px-3 font-semibold">Schedule Time</th>
                    <th className="py-2.5 px-3 font-semibold">Delivery Site &amp; Address</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Area Poverty %</th>
                    <th className="py-2.5 px-3 font-semibold">Food Gap Type</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Target People</th>
                    <th className="py-2.5 px-4 font-semibold">Provisions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {routeData.stops.map((stop) => (
                    <tr
                      key={stop.stopNumber}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3 font-bold">
                        <span
                          className={`w-6 h-6 rounded-full text-white inline-flex items-center justify-center text-xs font-mono ${stop.locationType === 'Church' ? 'bg-purple-600' : 'bg-amber-600'}`}
                        >
                          {stop.stopNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono font-medium text-slate-900 dark:text-slate-100">
                        {stop.estimatedArrival} - {stop.departureTime}
                      </td>
                      <td className="py-3 px-3 font-medium">
                        <div className="text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {stop.locationType === 'Church' ? (
                            <Church className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : (
                            <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span>{stop.locationName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {stop.locationAddress}, {stop.city} ({stop.county} Co.)
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {stop.surroundingPovertyRate.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[11px]">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              stop.surroundingGapType === 'Classic food desert'
                                ? 'bg-[#991b1b]'
                                : stop.surroundingGapType === 'Vehicle-compounded gap'
                                  ? 'bg-[#dc2626]'
                                  : 'bg-[#f87171]'
                            }`}
                          />
                          <span>{stop.surroundingGapType}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        ~{stop.targetPeopleServed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-300">
                        {stop.keyNeedsSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Manager Approval & Logistics Dispatch Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Program Manager Approval &amp; Logistics Dispatch Sign-Off</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review Church &amp; School delivery details, enter operational notes, approve schedule, and transmit
              dispatch manifest to logistics.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {status === 'Draft' && (
              <button
                type="button"
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Route Schedule</span>
              </button>
            )}

            {status === 'Approved' && (
              <button
                type="button"
                onClick={handleDispatch}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send Manifest to Logistics</span>
              </button>
            )}

            {status === 'Dispatched' && (
              <button
                type="button"
                onClick={() => setShowManifestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>View Dispatch Manifest</span>
              </button>
            )}

            {status !== 'Draft' && (
              <button
                type="button"
                onClick={() => {
                  setStatus('Draft');
                  setApprovedBy('');
                  setApprovalTimestamp('');
                  setDispatchedTimestamp('');
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-open Draft</span>
              </button>
            )}
          </div>
        </div>

        {/* Manager Operational Notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2 space-y-1.5">
            <label className="font-semibold text-slate-800 dark:text-slate-200 block">
              Manager Operational Notes &amp; Special Logistics Instructions
            </label>
            <textarea
              rows={3}
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              disabled={status === 'Dispatched'}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#a50f15]"
              placeholder="Enter special instructions for driver or loading dock staff..."
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Sign-off Audit Trail</div>
            <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Manager Approval:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{approvedBy || 'Pending'}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved At:</span>
                <span className="font-mono">{approvalTimestamp || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Logistics Dispatched:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  {dispatchedTimestamp || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Dispatch Manifest Modal */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Logistics Dispatch Manifest (Churches &amp; Schools)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">Manifest ID: {routeData.routeId}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManifestModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Manifest Body */}
            <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Manifest successfully transmitted to <strong>Central Florida Logistics Department</strong>. Fleet
                  notification sent to <strong>{routeData.driverName}</strong> ({routeData.truckName}).
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Depot Location</span>
                  <span className="font-semibold">{routeData.depotName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">
                    Assigned Truck &amp; Driver
                  </span>
                  <span className="font-semibold">
                    {routeData.truckName} ({routeData.driverName})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">
                    Total Distance &amp; Time
                  </span>
                  <span className="font-mono font-semibold">
                    {routeData.totalDistanceMiles} miles |{' '}
                    {Math.floor((routeData.totalDrivingMinutes + routeData.totalServiceMinutes) / 60)}h{' '}
                    {(routeData.totalDrivingMinutes + routeData.totalServiceMinutes) % 60}m
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium uppercase">Approved By</span>
                  <span className="font-semibold">
                    {routeData.approvedBy} ({routeData.approvalTimestamp})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-semibold block">
                  Stop Schedule Manifest ({routeData.stops.length} Delivery Sites):
                </span>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {routeData.stops.map((s) => (
                    <div
                      key={s.stopNumber}
                      className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md flex items-center justify-between"
                    >
                      <div>
                        <strong>
                          Stop {s.stopNumber}: {s.locationName}
                        </strong>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {s.locationAddress}, {s.city} ({s.locationType})
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#a50f15]">
                          {s.estimatedArrival} - {s.departureTime}
                        </span>
                        <div className="text-[10px] text-slate-500 font-sans">~{s.targetPeopleServed} people</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {routeData.logisticsNotes && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                  <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 block uppercase">
                    Manager Special Instructions
                  </span>
                  <p className="text-xs text-amber-950 dark:text-amber-200 italic mt-0.5">{routeData.logisticsNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrintManifest}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Driver Manifest</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManifestModal(false)}
                className="px-4 py-1.5 bg-[#a50f15] hover:bg-[#880d12] text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
