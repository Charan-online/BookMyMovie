export type ProjectionFormat = 'IMAX Laser' | 'Dolby Atmos' | 'Boutique 2D';

export type SeatTier = 'standard' | 'vip';

export type CameraMode = 'overview' | 'seat-pov';

export interface Movie {
  id: string;
  title: string;
  tagline: string;
  genre: string;
  durationMinutes: number;
  rating: string;
  releaseYear: number;
  director: string;
  cast: string[];
  synopsis: string;
  posterUrl: string;
  accentColor: string;
  screenPalette: {
    primary: string;
    secondary: string;
    highlight: string;
    theme: 'cosmos' | 'noir' | 'concert' | 'alpine';
  };
  formats: ProjectionFormat[];
}

export interface AuditoriumConfig {
  id: string;
  name: string;
  subtitle: string;
  format: ProjectionFormat;
  rows: number;
  seatsPerRow: number;
  aisleAfterColumn: number; // split left/right or center aisle
  secondAisleAfterColumn?: number;
  screenWidth: number;
  screenHeight: number;
  screenCurveDepth: number;
  screenCenterY: number;
  screenZ: number;
  firstRowZ: number;
  rowSpacing: number;
  rowRise: number;
  seatSpacing: number;
  vipRowsFromBack: number;
  basePrice: number;
  vipPrice: number;
}

export interface Showtime {
  id: string;
  movieId: string;
  auditoriumId: string;
  dateLabel: string; // e.g., "Today · Nov 22"
  time: string; // e.g., "19:30"
  format: ProjectionFormat;
  occupiedSeatIds: string[];
}

export interface TheaterSeat {
  id: string; // e.g., "E-07"
  rowLabel: string; // e.g., "E"
  rowIndex: number; // 0 = front row A
  seatNumber: number; // 1-based visual number
  colIndex: number;
  tier: SeatTier;
  price: number;
  occupied: boolean;
  // 3D world coordinates in meters (screen at -Z, audience faces -Z)
  x: number;
  y: number; // riser floor height
  z: number;
  yawToScreen: number; // subtle inward rotation toward screen center
}

export interface SeatSightlineMetrics {
  distanceMeters: number;
  horizontalAngleDeg: number;
  verticalAngleDeg: number;
  horizontalFovDeg: number;
  verticalFovDeg: number;
  screenCoveragePercent: number;
  viewZoneLabel: string;
}

export interface ConcessionItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Popcorn' | 'Beverage' | 'Combo';
}

export interface ConcessionSelection {
  itemId: string;
  quantity: number;
}

export interface BookingRecord {
  id: string;
  confirmationCode: string;
  movieId: string;
  movieTitle: string;
  posterUrl: string;
  auditoriumName: string;
  format: ProjectionFormat;
  dateLabel: string;
  time: string;
  seatIds: string[];
  concessions: { name: string; quantity: number; unitPrice: number }[];
  customerName: string;
  customerEmail: string;
  subtotal: number;
  bookingFee: number;
  total: number;
  createdAt: string;
}
