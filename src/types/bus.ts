export type BusOperator = 'SBST' | 'SMRT' | 'TTS' | 'GAS';

export type BusLoad = 'SEA' | 'SDA' | 'LSD'; // Seats Available, Standing Available, Limited Standing

export type BusType = 'SD' | 'DD' | 'BD'; // Single Deck, Double Deck, Bendy

export interface NextBusInfo {
  EstimatedArrival: string; // ISO 8601 string
  Latitude: number;
  Longitude: number;
  VisitNumber: string;
  Load: BusLoad;
  Feature: 'WAB' | '';
  Type: BusType;
  // Enhanced tracking attributes
  speed?: number; // km/h
  plateNumber?: string;
  heading?: number;
  estimatedMinutes?: number;
}

export interface BusArrivalService {
  ServiceNo: string;
  Operator: BusOperator;
  DestinationCode: string;
  DestinationName: string;
  NextBus: NextBusInfo;
  NextBus2?: NextBusInfo;
  NextBus3?: NextBusInfo;
}

export interface BusStop {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Latitude: number;
  Longitude: number;
  mrtLines?: string[]; // e.g. ['NS22', 'TE14']
  services: string[];
}

export interface BusRouteStop {
  stopCode: string;
  stopSequence: number;
  distanceKm: number;
  roadName: string;
  description: string;
  lat: number;
  lng: number;
}

export interface BusRoute {
  serviceNo: string;
  operator: BusOperator;
  direction: 1 | 2;
  origin: string;
  destination: string;
  stops: BusRouteStop[];
  polyline: [number, number][]; // coordinates for map route
}

export interface LiveBusVehicle {
  id: string;
  serviceNo: string;
  operator: BusOperator;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  plateNumber: string;
  type: BusType;
  load: BusLoad;
  isWAB: boolean;
  nextStopCode: string;
  nextStopName: string;
  destinationName: string;
  routeProgressPercent: number; // 0 to 100
}

export interface FavoriteItem {
  type: 'stop' | 'service';
  stopCode: string;
  serviceNo?: string;
  nickname?: string;
  addedAt: number;
}

export interface LTASettings {
  useMockSimulation: boolean;
  apiKey: string;
  backendProxyUrl: string;
  refreshIntervalSeconds: number;
}
