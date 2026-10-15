import {
  BusStop,
  BusArrivalService,
  NextBusInfo,
  LiveBusVehicle,
  BusLoad,
  BusType,
  LTASettings,
} from '../types/bus';
import { SINGAPORE_BUS_STOPS, POPULAR_BUS_ROUTES, getServiceOperator } from '../data/singaporeBuses';

// Load stored settings from localStorage if available
const SETTINGS_KEY = 'sg_bus_tracker_settings';

export function getStoredSettings(): LTASettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed reading settings', e);
  }
  return {
    useMockSimulation: true,
    apiKey: '',
    backendProxyUrl: '/api/busarrival',
    refreshIntervalSeconds: 15,
  };
}

export function saveStoredSettings(settings: LTASettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed saving settings', e);
  }
}

// Haversine distance calculator in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate bearing between two GPS coordinates in degrees
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

// Realistic Singapore Bus Plates generator
const SG_PLATE_PREFIXES = ['SG', 'SBS', 'SMB'];
function generatePlate(serviceNo: string, index: number): string {
  const prefix = SG_PLATE_PREFIXES[Math.abs(serviceNo.charCodeAt(0) + index) % SG_PLATE_PREFIXES.length];
  const num = 1000 + ((parseInt(serviceNo, 10) || 7) * 73 + index * 127) % 8999;
  const suffix = String.fromCharCode(65 + ((num + index) % 26));
  return `${prefix}${num}${suffix}`;
}

// State container for simulated live active buses
class BusSimulationEngine {
  private activeBuses: LiveBusVehicle[] = [];
  private lastUpdate: number = Date.now();

  constructor() {
    this.initSimulation();
  }

  private initSimulation() {
    this.activeBuses = [];
    POPULAR_BUS_ROUTES.forEach((route) => {
      // Spawn 2-3 buses per route along its polyline
      const count = 3;
      for (let i = 0; i < count; i++) {
        const progress = (i / count + 0.15) % 1;
        const coords = this.getPositionAlongPolyline(route.polyline, progress);
        const heading = this.getHeadingAlongPolyline(route.polyline, progress);
        const loads: BusLoad[] = ['SEA', 'SDA', 'LSD'];
        const types: BusType[] = ['SD', 'DD', 'BD'];

        this.activeBuses.push({
          id: `sim-${route.serviceNo}-${i}`,
          serviceNo: route.serviceNo,
          operator: route.operator,
          lat: coords[0],
          lng: coords[1],
          heading,
          speed: 25 + (i * 7) % 20,
          plateNumber: generatePlate(route.serviceNo, i),
          type: (route.serviceNo === '190' || route.serviceNo === '851') && i === 1 ? 'BD' : types[i % 2],
          load: loads[i % 3],
          isWAB: true,
          nextStopCode: route.stops[Math.min(i + 1, route.stops.length - 1)].stopCode,
          nextStopName: route.stops[Math.min(i + 1, route.stops.length - 1)].description,
          destinationName: route.destination,
          routeProgressPercent: progress * 100,
        });
      }
    });
  }

  // Linear interpolation along a polyline
  private getPositionAlongPolyline(polyline: [number, number][], progress: number): [number, number] {
    if (polyline.length < 2) return polyline[0] || [1.3521, 103.8198];
    const totalSegments = polyline.length - 1;
    const scaled = progress * totalSegments;
    const segIndex = Math.min(Math.floor(scaled), totalSegments - 1);
    const segProgress = scaled - segIndex;

    const p1 = polyline[segIndex];
    const p2 = polyline[segIndex + 1];

    const lat = p1[0] + (p2[0] - p1[0]) * segProgress;
    const lng = p1[1] + (p2[1] - p1[1]) * segProgress;
    return [lat, lng];
  }

  private getHeadingAlongPolyline(polyline: [number, number][], progress: number): number {
    if (polyline.length < 2) return 0;
    const totalSegments = polyline.length - 1;
    const scaled = progress * totalSegments;
    const segIndex = Math.min(Math.floor(scaled), totalSegments - 1);
    const p1 = polyline[segIndex];
    const p2 = polyline[segIndex + 1];
    return calculateBearing(p1[0], p1[1], p2[0], p2[1]);
  }

  // Advance buses along the routes smoothly
  public step() {
    const now = Date.now();
    const dtSeconds = Math.min((now - this.lastUpdate) / 1000, 3);
    this.lastUpdate = now;

    this.activeBuses.forEach((bus) => {
      const route = POPULAR_BUS_ROUTES.find((r) => r.serviceNo === bus.serviceNo);
      if (!route) return;

      // Advance progress: ~0.003 per second (~5 minutes full route loop)
      const speedFactor = 0.002 * (bus.speed / 30);
      let newProgress = (bus.routeProgressPercent / 100 + speedFactor * dtSeconds) % 1;
      bus.routeProgressPercent = newProgress * 100;

      const [newLat, newLng] = this.getPositionAlongPolyline(route.polyline, newProgress);
      bus.lat = newLat;
      bus.lng = newLng;
      bus.heading = this.getHeadingAlongPolyline(route.polyline, newProgress);

      // Micro speed fluctuation
      bus.speed = Math.max(15, Math.min(50, bus.speed + (Math.random() - 0.5) * 3));
    });
  }

  public getActiveBuses(): LiveBusVehicle[] {
    this.step();
    return this.activeBuses;
  }

  // Compute realistic arrival time for a stop
  public getArrivalsForStop(stopCode: string): BusArrivalService[] {
    this.step();
    const stop = SINGAPORE_BUS_STOPS.find((s) => s.BusStopCode === stopCode);
    if (!stop) return [];

    const now = new Date();

    return stop.services.map((serviceNo, idx) => {
      const op = getServiceOperator(serviceNo);
      const route = POPULAR_BUS_ROUTES.find((r) => r.serviceNo === serviceNo);
      const destination = route?.destination || 'Bus Interchange';

      // Find if we have an active simulated bus on this service
      const serviceBuses = this.activeBuses.filter((b) => b.serviceNo === serviceNo);
      const firstBus = serviceBuses[0];

      // Realistic minute offsets
      // Seed based on stopCode & serviceNo for stability
      const baseSeed = (stopCode.charCodeAt(0) * 11 + serviceNo.charCodeAt(0) * 17 + idx * 3) % 10;
      const secPassed = Math.floor(Date.now() / 1000) % 600; // 10 min window
      const cycleOffset = (baseSeed * 60 + idx * 140 - secPassed + 600) % 600;

      const waitSeconds1 = Math.max(20, cycleOffset);
      const waitMinutes1 = Math.floor(waitSeconds1 / 60);

      const waitSeconds2 = waitSeconds1 + 360 + (idx % 3) * 60;
      const waitMinutes2 = Math.floor(waitSeconds2 / 60);

      const waitSeconds3 = waitSeconds2 + 480 + (idx % 2) * 60;
      const waitMinutes3 = Math.floor(waitSeconds3 / 60);

      const arrival1Date = new Date(now.getTime() + waitSeconds1 * 1000);
      const arrival2Date = new Date(now.getTime() + waitSeconds2 * 1000);
      const arrival3Date = new Date(now.getTime() + waitSeconds3 * 1000);

      // Dynamic load based on wait time
      const load1: BusLoad = waitMinutes1 <= 2 ? 'LSD' : waitMinutes1 <= 6 ? 'SDA' : 'SEA';
      const load2: BusLoad = (['SEA', 'SDA', 'SEA'] as BusLoad[])[idx % 3];
      const load3: BusLoad = 'SEA';

      // Type
      const type1: BusType = serviceNo === '190' ? 'BD' : (idx % 2 === 0 ? 'DD' : 'SD');
      const type2: BusType = idx % 2 === 0 ? 'SD' : 'DD';
      const type3: BusType = 'DD';

      const bus1Pos = firstBus
        ? { lat: firstBus.lat, lng: firstBus.lng, speed: firstBus.speed, plate: firstBus.plateNumber, heading: firstBus.heading }
        : {
            lat: stop.Latitude - 0.003 * Math.max(0.5, waitMinutes1),
            lng: stop.Longitude - 0.002 * Math.max(0.5, waitMinutes1),
            speed: 32,
            plate: generatePlate(serviceNo, 1),
            heading: 45,
          };

      const next1: NextBusInfo = {
        EstimatedArrival: arrival1Date.toISOString(),
        Latitude: bus1Pos.lat,
        Longitude: bus1Pos.lng,
        VisitNumber: '1',
        Load: load1,
        Feature: 'WAB',
        Type: type1,
        speed: Math.round(bus1Pos.speed),
        plateNumber: bus1Pos.plate,
        heading: bus1Pos.heading,
        estimatedMinutes: waitMinutes1,
      };

      const next2: NextBusInfo = {
        EstimatedArrival: arrival2Date.toISOString(),
        Latitude: stop.Latitude - 0.009 * waitMinutes2,
        Longitude: stop.Longitude - 0.008 * waitMinutes2,
        VisitNumber: '1',
        Load: load2,
        Feature: 'WAB',
        Type: type2,
        speed: 35,
        plateNumber: generatePlate(serviceNo, 2),
        heading: 50,
        estimatedMinutes: waitMinutes2,
      };

      const next3: NextBusInfo = {
        EstimatedArrival: arrival3Date.toISOString(),
        Latitude: stop.Latitude - 0.016 * waitMinutes3,
        Longitude: stop.Longitude - 0.014 * waitMinutes3,
        VisitNumber: '1',
        Load: load3,
        Feature: 'WAB',
        Type: type3,
        speed: 38,
        plateNumber: generatePlate(serviceNo, 3),
        heading: 50,
        estimatedMinutes: waitMinutes3,
      };

      return {
        ServiceNo: serviceNo,
        Operator: op,
        DestinationCode: 'DEST',
        DestinationName: destination,
        NextBus: next1,
        NextBus2: next2,
        NextBus3: next3,
      };
    });
  }
}

export const simulationEngine = new BusSimulationEngine();

// Primary fetcher that inspects settings and routes to either Live LTA DataMall v3 or Simulation
export async function fetchBusArrivals(
  busStopCode: string,
  settings: LTASettings = getStoredSettings()
): Promise<{ services: BusArrivalService[]; isLiveAPI: boolean; rawResponse?: any; error?: string }> {
  // If user disabled simulation, connect to backend proxy or direct LTA Datamall
  if (!settings.useMockSimulation) {
    try {
      const proxyUrl = settings.backendProxyUrl || '/api/busarrival';
      const endpoint = proxyUrl.includes('?')
        ? `${proxyUrl}&BusStopCode=${encodeURIComponent(busStopCode)}`
        : `${proxyUrl}?BusStopCode=${encodeURIComponent(busStopCode)}`;

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (settings.apiKey) {
        headers['AccountKey'] = settings.apiKey;
      }

      const res = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || errJson?.error || `API returned status ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const rawServices = json.Services || [];

      const parsed: BusArrivalService[] = rawServices.map((item: any) => {
        const next1Min = item.NextBus?.EstimatedArrival
          ? Math.max(0, Math.round((new Date(item.NextBus.EstimatedArrival).getTime() - Date.now()) / 60000))
          : undefined;

        const next2Min = item.NextBus2?.EstimatedArrival
          ? Math.max(0, Math.round((new Date(item.NextBus2.EstimatedArrival).getTime() - Date.now()) / 60000))
          : undefined;

        const next3Min = item.NextBus3?.EstimatedArrival
          ? Math.max(0, Math.round((new Date(item.NextBus3.EstimatedArrival).getTime() - Date.now()) / 60000))
          : undefined;

        return {
          ServiceNo: item.ServiceNo,
          Operator: item.Operator as any,
          DestinationCode: item.NextBus?.DestinationCode || '',
          DestinationName: 'In Service',
          NextBus: {
            ...item.NextBus,
            estimatedMinutes: next1Min,
            speed: 30,
            plateNumber: generatePlate(item.ServiceNo, 1),
          },
          NextBus2: item.NextBus2
            ? {
                ...item.NextBus2,
                estimatedMinutes: next2Min,
                plateNumber: generatePlate(item.ServiceNo, 2),
              }
            : undefined,
          NextBus3: item.NextBus3
            ? {
                ...item.NextBus3,
                estimatedMinutes: next3Min,
                plateNumber: generatePlate(item.ServiceNo, 3),
              }
            : undefined,
        };
      });

      return {
        services: parsed,
        isLiveAPI: true,
        rawResponse: json,
      };
    } catch (err: any) {
      console.warn('Live LTA fetch failed, falling back to simulated data with notice', err);
      const simulated = simulationEngine.getArrivalsForStop(busStopCode);
      return {
        services: simulated,
        isLiveAPI: false,
        error: `Could not reach live API: ${err.message}. Using real-time simulated feed.`,
      };
    }
  }

  // Default Simulation Mode
  const simulated = simulationEngine.getArrivalsForStop(busStopCode);
  return {
    services: simulated,
    isLiveAPI: false,
  };
}

// Find closest stops to user coordinates
export function getNearbyBusStops(userLat: number, userLng: number, limit = 8): { stop: BusStop; distanceMeters: number }[] {
  const withDistance = SINGAPORE_BUS_STOPS.map((stop) => {
    const distKm = calculateDistanceKm(userLat, userLng, stop.Latitude, stop.Longitude);
    return {
      stop,
      distanceMeters: Math.round(distKm * 1000),
    };
  });

  return withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, limit);
}
