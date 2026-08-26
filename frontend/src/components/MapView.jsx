import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Building2, Home, Sparkles, Layers, ArrowRight, Radio, Compass, Gauge, Clock, Eye, Crosshair } from 'lucide-react';

// Sub-component to smoothly pan map when Auto-Follow GPS is active
function MapFollowController({ targetCoords, isFollowing }) {
  const map = useMap();
  useEffect(() => {
    if (isFollowing && targetCoords && targetCoords[0] && targetCoords[1]) {
      map.panTo(targetCoords, { animate: true, duration: 0.6 });
    }
  }, [targetCoords, isFollowing, map]);
  return null;
}

const createHospitalIcon = (isApex = false, availableBeds = 10) => {
  return L.divIcon({
    className: 'custom-hosp-icon',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
        ${isApex ? '<div class="absolute -inset-2.5 rounded-full bg-cyan-400/30 animate-ping"></div>' : ''}
        <div class="w-9 h-9 rounded-xl ${isApex ? 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 ring-2 ring-cyan-300 shadow-cyan-500/50' : 'bg-slate-800 ring-1 ring-slate-600'} flex items-center justify-center shadow-2xl text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6v12M6 12h12"/>
          </svg>
        </div>
        <span class="absolute -bottom-1 -right-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shadow-md ${availableBeds > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'}">
          ${availableBeds}
        </span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

const createVillageIcon = (isEmergency = false, label = '') => {
  return L.divIcon({
    className: 'custom-vill-icon',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
        ${isEmergency ? '<div class="absolute -inset-3 rounded-full bg-rose-500/50 animate-ping"></div>' : ''}
        <div class="w-8 h-8 rounded-xl ${isEmergency ? 'bg-gradient-to-tr from-rose-600 to-amber-600 ring-2 ring-rose-300 shadow-rose-500/50' : 'bg-emerald-800/90 ring-1 ring-emerald-500 shadow-lg'} flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
        </div>
        ${label ? `<span class="absolute -top-2 -right-2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full ring-1 ring-white">${label}</span>` : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

const createAmbulanceIcon = (status = 'IDLE', ambId = 1, speed = 0, heading = 0) => {
  const isEnRoute = status.startsWith('EN_ROUTE') || status.startsWith('TRANSIT');
  return L.divIcon({
    className: 'custom-amb-icon',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
        ${isEnRoute ? '<div class="absolute -inset-3 rounded-full bg-cyan-400/40 animate-ping"></div>' : ''}
        ${isEnRoute ? '<div class="absolute -inset-1.5 rounded-full border border-cyan-400/60 animate-spin"></div>' : ''}
        
        <div class="w-10 h-10 rounded-full ${isEnRoute ? 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 ring-2 ring-cyan-300 shadow-cyan-500/60' : 'bg-blue-600 ring-1 ring-blue-300 shadow-lg'} flex items-center justify-center text-white shadow-2xl relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          
          ${isEnRoute ? `
            <div style="transform: rotate(${heading}deg)" class="absolute -top-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-cyan-300 drop-shadow-md"></div>
          ` : ''}
        </div>
        
        <div class="absolute -bottom-3 flex items-center gap-0.5 bg-slate-950/95 border border-cyan-500/80 px-1.5 py-0.2 rounded-full shadow-lg">
          <span class="text-[8px] font-mono font-bold text-cyan-300">#${ambId}</span>
          ${isEnRoute ? `<span class="text-[8px] font-mono text-emerald-400 font-bold">${Math.round(speed)}k</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22]
  });
};

const ROUTE_COLORS = ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];

export default function MapView({ 
  networkData, 
  onToggleRoadBlock, 
  activeDecision, 
  multiDispatches = [],
  activeVillageIds = [],
  priorityQueueBanner = null,
  onReportEmergency = null
}) {
  const mapCenter = [18.5204, 73.8567];
  const [isFollowingGPS, setIsFollowingGPS] = useState(false);

  const { graph, hospitals = [], villages = [], ambulances = [] } = networkData || {};
  const edges = graph?.edges || [];

  // Active driving ambulance for primary GPS HUD
  const activeAmbulance = useMemo(() => {
    return ambulances.find(a => a.status !== 'IDLE' && a.gps_telemetry?.active) || ambulances.find(a => a.status !== 'IDLE') || null;
  }, [ambulances]);

  const followCoords = useMemo(() => {
    if (activeAmbulance && activeAmbulance.current_lat && activeAmbulance.current_lon) {
      return [activeAmbulance.current_lat, activeAmbulance.current_lon];
    }
    return mapCenter;
  }, [activeAmbulance]);

  const renderedRoutes = useMemo(() => {
    if (multiDispatches && multiDispatches.length > 0) {
      return multiDispatches.map((disp, idx) => ({
        id: disp.request_id || idx,
        color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
        leg1: disp.ambulance_to_village?.coordinates || [],
        leg2: disp.village_to_hospital?.coordinates || [],
        label: `${disp.patient_name.split(' ')[0]} (Amb #${disp.selected_ambulance?.id})`
      }));
    } else if (activeDecision) {
      return [{
        id: activeDecision.request_id,
        color: '#06b6d4',
        leg1: activeDecision.ambulance_to_village?.coordinates || [],
        leg2: activeDecision.village_to_hospital?.coordinates || [],
        label: activeDecision.patient_name
      }];
    }
    return [];
  }, [activeDecision, multiDispatches]);

  if (!networkData) {
    return (
      <div className="h-full w-full bg-[#080d1a] flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
          <span>Loading village and road map...</span>
        </div>
      </div>
    );
  }

  const gps = activeAmbulance?.gps_telemetry;

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Priority Queue Ranking HUD */}
      {priorityQueueBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#0a0f1d]/95 backdrop-blur-xl border border-cyan-500/60 rounded-2xl px-4 py-2.5 shadow-2xl shadow-cyan-950/80 animate-in fade-in slide-in-from-top-4 duration-300 max-w-xl w-[90%] pointer-events-auto">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-cyan-500/20">
            <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Priority Queue Evaluated: Ranked by Urgency SLA & Aging
            </span>
            <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
              OPTIMAL ORDER
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] font-mono">
            {priorityQueueBanner.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 shrink-0 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
                <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 font-bold flex items-center justify-center text-[9px] border border-cyan-800">
                  {idx + 1}
                </span>
                <span className="text-slate-200 font-semibold">{item.name}</span>
                <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${item.tier === 'T1' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {item.tier}
                </span>
                {idx < priorityQueueBanner.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600 ml-0.5" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live GPS Satellite Tracking Telemetry HUD Card (Top-Left / Top-Right Floating) */}
      {activeAmbulance && gps && (
        <div className="absolute top-4 right-4 z-[1000] bg-[#0a0f1d]/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl p-3.5 shadow-2xl shadow-cyan-950/80 text-[11px] text-slate-300 font-mono space-y-2.5 pointer-events-auto w-72 animate-in fade-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-white text-xs">🛰️ Live GPS Telemetry</span>
            </div>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> 11 SATS
            </span>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <strong className="text-white">Ambulance #{activeAmbulance.id}</strong>
              <span className="text-cyan-300 font-bold">{activeAmbulance.plate}</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Patient: <strong className="text-slate-200">{gps.patient_name || 'En Route'}</strong></span>
              <span className="text-amber-300 font-bold">{activeAmbulance.type}</span>
            </div>
          </div>

          {/* Gauges Grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 block">SPEED</span>
                <strong className="text-white text-xs">{gps.speed_kmh} <span className="text-[9px] font-normal text-slate-400">km/h</span></strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 block">HEADING</span>
                <strong className="text-white text-xs">{gps.heading_deg}° <span className="text-[9px] font-normal text-slate-400">BRG</span></strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 block">REMAINING</span>
                <strong className="text-white text-xs">{gps.distance_remaining_km} <span className="text-[9px] font-normal text-slate-400">km</span></strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 block">EST. TIME</span>
                <strong className="text-cyan-300 text-xs font-bold">{Math.floor(gps.eta_seconds / 60)}m {gps.eta_seconds % 60}s</strong>
              </div>
            </div>
          </div>

          {/* Live Trip Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>{gps.current_leg}</span>
              <span className="text-cyan-400 font-bold">{gps.progress_pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${gps.progress_pct}%` }}
              ></div>
            </div>
          </div>

          {/* Camera Auto-Follow Toggle Button */}
          <button
            onClick={() => setIsFollowingGPS(!isFollowingGPS)}
            className={`w-full py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              isFollowingGPS
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            <Crosshair className={`w-3.5 h-3.5 ${isFollowingGPS ? 'animate-spin text-white' : 'text-cyan-400'}`} />
            <span>{isFollowingGPS ? '✓ GPS Auto-Follow Locked' : '📍 Track Ambulance with Camera'}</span>
          </button>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapFollowController targetCoords={followCoords} isFollowing={isFollowingGPS} />

        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 1. Road Network Edges */}
        {edges.map((edge) => {
          const isBlocked = edge.blocked;
          let color = '#475569';
          let weight = 3;
          let dashArray = null;

          if (isBlocked) {
            color = '#ef4444';
            weight = 4.5;
            dashArray = '6, 6';
          } else if (edge.road_type === 'highway') {
            color = '#06b6d4';
            weight = 4;
          } else if (edge.road_type === 'scenic_bypass') {
            color = '#a855f7';
            weight = 3.5;
            dashArray = '4, 4';
          } else if (edge.road_type === 'rural_road') {
            color = '#f59e0b';
            weight = 2.5;
          }

          return (
            <Polyline
              key={edge.id}
              positions={edge.coordinates}
              pathOptions={{ color, weight, dashArray, opacity: isBlocked ? 0.95 : 0.7 }}
            >
              <Popup>
                <div className="p-1 min-w-[210px] text-slate-100 font-sans">
                  <div className="flex items-center justify-between font-bold text-xs mb-1.5 pb-1 border-b border-slate-700">
                    <span className="font-mono text-cyan-300">Road: {edge.source} ↔ {edge.target}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${isBlocked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {isBlocked ? 'BLOCKED' : 'OPEN'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5 mb-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance:</span>
                      <strong className="text-white">{edge.distance_km} km</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Est. Driving Time:</span>
                      <strong className="text-white">{edge.travel_time_mins} mins</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleRoadBlock(edge.source, edge.target, !isBlocked)}
                    className={`w-full py-1.5 text-xs font-bold rounded-lg text-white shadow-md transition-all ${
                      isBlocked ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95' : 'bg-rose-600 hover:bg-rose-500 active:scale-95'
                    }`}
                  >
                    {isBlocked ? '✓ Reopen Road' : '⚠️ Block Road (Simulate Landslide)'}
                  </button>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 2. Dispatched Route Overlays */}
        {renderedRoutes.map((rt) => (
          <React.Fragment key={rt.id}>
            {rt.leg1.length > 0 && (
              <Polyline
                positions={rt.leg1}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 5,
                  opacity: 0.9,
                  dashArray: '6, 6'
                }}
              />
            )}
            {rt.leg2.length > 0 && (
              <Polyline
                positions={rt.leg2}
                pathOptions={{
                  color: rt.color,
                  weight: 6,
                  opacity: 0.95
                }}
              />
            )}
          </React.Fragment>
        ))}

        {/* 3. Live GPS Driven Breadcrumb Trails */}
        {ambulances.map((amb) => {
          const trail = amb.gps_telemetry?.trail;
          if (!trail || trail.length < 2) return null;
          return (
            <Polyline
              key={`trail-${amb.id}`}
              positions={trail}
              pathOptions={{
                color: '#22d3ee',
                weight: 4,
                opacity: 0.85
              }}
            />
          );
        })}

        {/* 4. Hospital Nodes */}
        {hospitals.map((hosp) => {
          const isApex = hosp.id === 'HOSP_C';
          return (
            <Marker
              key={hosp.id}
              position={[hosp.lat, hosp.lon]}
              icon={createHospitalIcon(isApex, hosp.beds_available)}
            >
              <Popup>
                <div className="p-1 min-w-[250px] text-slate-100 font-sans">
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-700">
                    <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{hosp.name}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{hosp.tier}</span>
                    </div>
                  </div>
                  
                  <div className="text-[11px] space-y-1 mb-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Empty Beds:</span>
                      <span className={`font-bold px-1.5 py-0.2 rounded ${hosp.beds_available > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {hosp.beds_available} of {hosp.beds_total} free
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hospital Wait Time:</span>
                      <span className="font-bold text-amber-300">{hosp.current_triage_wait_mins} mins</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block mb-1">Doctors on Duty:</span>
                    <div className="flex flex-wrap gap-1">
                      {hosp.specialists_on_duty.map((spec) => (
                        <span key={spec} className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-semibold px-1.5 py-0.5 rounded">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -22]} opacity={0.95}>
                <span className="font-bold text-xs">{hosp.name} ({hosp.beds_available} beds free)</span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* 5. Village Nodes */}
        {villages.map((vill) => {
          const isEmergency = activeVillageIds.includes(vill.node_id) || (activeDecision && activeDecision.village_id === vill.node_id);
          const emergencyIndex = activeVillageIds.indexOf(vill.node_id);
          const label = emergencyIndex >= 0 ? `#${emergencyIndex + 1}` : '';
          return (
            <Marker
              key={vill.id}
              position={[vill.lat, vill.lon]}
              icon={createVillageIcon(isEmergency, label)}
            >
              <Popup>
                <div className="p-1 min-w-[190px] text-slate-100 font-sans">
                  <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-700">
                    <Home className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-xs text-white">{vill.name}</span>
                  </div>
                  <div className="text-[11px] space-y-1 font-mono mb-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Village Population:</span>
                      <strong className="text-white">{vill.population.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <strong className={isEmergency ? 'text-rose-400 animate-pulse font-bold' : 'text-emerald-400'}>
                        {isEmergency ? '🔴 ACTIVE EMERGENCY' : 'Normal'}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() => onReportEmergency && onReportEmergency(vill.node_id)}
                    className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>🚨 REPORT EMERGENCY</span>
                  </button>
                </div>
              </Popup>
              <Tooltip direction="bottom" offset={[0, 18]} opacity={0.95}>
                <span className="text-xs font-semibold">{vill.name} ({vill.population} people)</span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* 6. Live Moving Ambulances with Directional Compass & Speed */}
        {ambulances.map((amb) => {
          const lat = amb.current_lat || mapCenter[0];
          const lon = amb.current_lon || mapCenter[1];
          const speed = amb.gps_telemetry?.speed_kmh || 0;
          const heading = amb.gps_telemetry?.heading_deg || 0;
          return (
            <Marker
              key={amb.id}
              position={[lat, lon]}
              icon={createAmbulanceIcon(amb.status, amb.id, speed, heading)}
            >
              <Popup>
                <div className="p-1 min-w-[220px] text-slate-100 font-sans">
                  <div className="flex items-center justify-between font-bold text-xs mb-1.5 pb-1 border-b border-slate-700">
                    <span className="text-white">🚑 Ambulance #{amb.id}</span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                      {amb.plate}
                    </span>
                  </div>
                  <div className="text-[11px] space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Equipment:</span>
                      <strong className="text-white">{amb.type}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GPS Speed:</span>
                      <strong className="text-emerald-400 font-bold">{speed} km/h</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Heading:</span>
                      <strong className="text-cyan-300 font-bold">{heading}°</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <strong className={amb.status === 'IDLE' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}>
                        {amb.status === 'IDLE' ? 'Ready / Idle' : 'Driving on Route'}
                      </strong>
                    </div>
                    {amb.assigned_request_id && (
                      <div className="pt-1 text-[10px] text-slate-400">
                        Assigned Call: <strong className="text-cyan-300">{amb.assigned_request_id}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -22]} opacity={0.95}>
                <span className="font-mono text-xs font-bold text-cyan-300">
                  🚑 #{amb.id} ({amb.status === 'IDLE' ? 'Ready' : `${Math.round(speed)} km/h • Driving`})
                </span>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#0a0f1d]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3 shadow-2xl text-[11px] text-slate-300 font-mono space-y-2 pointer-events-auto max-w-xs">
        <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Road & Map Colors</span>
          </span>
          <span className="text-[10px] text-slate-500">Interactive</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-400 rounded"></span>
            <span>Highway</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-slate-500 rounded"></span>
            <span>Regular Road</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-purple-400 rounded border-dashed border-t"></span>
            <span>Bypass Road</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-rose-500 rounded border-dashed border-t"></span>
            <span className="text-rose-400 font-semibold">Blocked Road</span>
          </div>
        </div>

        <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>Tip: Click any road to block or reopen it.</span>
        </div>
      </div>
    </div>
  );
}
