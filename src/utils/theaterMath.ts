import type {
  AuditoriumConfig,
  ConcessionItem,
  ConcessionSelection,
  SeatSightlineMetrics,
  TheaterSeat,
} from '../types/cinema';

export const MAX_SEATS_PER_BOOKING = 8;
export const BOOKING_FEE_PER_TICKET = 1.75;
export const EYE_HEIGHT_ABOVE_RISER = 1.18;

/**
 * Generates deterministic 3D coordinates for every seat in an auditorium.
 * Screen sits at z = config.screenZ (negative Z). Rows step outward along +Z and upward along +Y.
 */
export function generateAuditoriumSeats(
  config: AuditoriumConfig,
  occupiedSeatIds: readonly string[],
): TheaterSeat[] {
  const occupiedSet = new Set(occupiedSeatIds);
  const seats: TheaterSeat[] = [];

  const aisleGap = 1.15;
  const totalWidth =
    (config.seatsPerRow - 1) * config.seatSpacing +
    (config.aisleAfterColumn > 0 ? aisleGap : 0) +
    (config.secondAisleAfterColumn ? aisleGap : 0);

  for (let r = 0; r < config.rows; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    const isVip = r >= config.rows - config.vipRowsFromBack;
    const rowZ = config.firstRowZ + r * config.rowSpacing;
    // Slight parabolic stadium rise so back rows see cleanly over front rows
    const rowY = r * config.rowRise + (r * r) * 0.012;
    // Subtle curved amphitheater arc toward the screen
    const rowWidthScale = 1 + r * 0.015;

    for (let c = 0; c < config.seatsPerRow; c++) {
      const seatNumber = c + 1;
      const paddedNum = String(seatNumber).padStart(2, '0');
      const id = `${rowLabel}-${paddedNum}`;

      let extraAisleOffset = 0;
      if (config.aisleAfterColumn > 0 && seatNumber > config.aisleAfterColumn) {
        extraAisleOffset += aisleGap;
      }
      if (
        config.secondAisleAfterColumn &&
        seatNumber > config.secondAisleAfterColumn
      ) {
        extraAisleOffset += aisleGap;
      }

      const rawX = c * config.seatSpacing + extraAisleOffset - totalWidth / 2;
      const x = rawX * rowWidthScale;
      // Gentle curved row pull-in at wings so outer seats angle naturally toward screen
      const wingCurvature = (x * x) * 0.008;
      const z = rowZ - wingCurvature;

      // Angle each seat slightly toward the screen center (0, screenCenterY, screenZ)
      const dz = z - config.screenZ;
      const yawToScreen = Math.atan2(-x, dz) * 0.65;

      seats.push({
        id,
        rowLabel,
        rowIndex: r,
        seatNumber,
        colIndex: c,
        tier: isVip ? 'vip' : 'standard',
        price: isVip ? config.vipPrice : config.basePrice,
        occupied: occupiedSet.has(id),
        x: Number(x.toFixed(3)),
        y: Number(rowY.toFixed(3)),
        z: Number(z.toFixed(3)),
        yawToScreen: Number(yawToScreen.toFixed(4)),
      });
    }
  }

  return seats;
}

/**
 * Exact eye-level 3D camera coordinate for a given seat.
 */
export function getSeatEyePosition(seat: TheaterSeat): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: seat.x,
    y: Number((seat.y + EYE_HEIGHT_ABOVE_RISER).toFixed(3)),
    z: Number((seat.z + 0.04).toFixed(3)),
  };
}

/**
 * Exact target point on the curved screen that a seated viewer naturally looks at.
 */
export function getSeatLookTarget(
  seat: TheaterSeat,
  config: AuditoriumConfig,
): { x: number; y: number; z: number } {
  // Look toward the center of the curved screen (slightly damped X offset for natural comfort)
  const screenCenterZ = config.screenZ + config.screenCurveDepth * 0.45;
  return {
    x: Number((seat.x * 0.08).toFixed(3)),
    y: config.screenCenterY,
    z: Number(screenCenterZ.toFixed(3)),
  };
}

/**
 * Computes real optical sightline and SMPTE/THX viewing metrics from a specific seat.
 */
export function computeSeatSightline(
  seat: TheaterSeat,
  config: AuditoriumConfig,
): SeatSightlineMetrics {
  const eye = getSeatEyePosition(seat);
  const screenMidZ = config.screenZ + config.screenCurveDepth * 0.45;
  const dz = Math.max(1, eye.z - screenMidZ);
  const dx = Math.abs(eye.x);
  const dy = config.screenCenterY - eye.y;

  const distanceMeters = Math.hypot(dx, dy, dz);
  const horizontalAngleDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
  const verticalAngleDeg = (Math.atan2(dy, dz) * 180) / Math.PI;

  // Horizontal FOV subtended by the curved screen from the seat's distance
  const halfScreenW = config.screenWidth / 2;
  const leftAngle = Math.atan2(eye.x + halfScreenW, dz);
  const rightAngle = Math.atan2(eye.x - halfScreenW, dz);
  const horizontalFovDeg = (Math.abs(leftAngle - rightAngle) * 180) / Math.PI;

  const halfScreenH = config.screenHeight / 2;
  const topAngle = Math.atan2(config.screenCenterY + halfScreenH - eye.y, dz);
  const bottomAngle = Math.atan2(config.screenCenterY - halfScreenH - eye.y, dz);
  const verticalFovDeg = (Math.abs(topAngle - bottomAngle) * 180) / Math.PI;

  // Reference human comfortable horizontal cinema field (~85 deg)
  const screenCoveragePercent = Math.min(
    100,
    Math.round((horizontalFovDeg / 85) * 100),
  );

  let viewZoneLabel = 'Balanced View';
  if (seat.rowIndex <= 1 || horizontalFovDeg >= 74) {
    viewZoneLabel = 'Close-Up Front Immersion';
  } else if (horizontalAngleDeg > 17) {
    viewZoneLabel = 'Wide Side Perspective';
  } else if (seat.tier === 'vip' && horizontalAngleDeg <= 13) {
    viewZoneLabel = 'Premier Center Sweet Spot';
  } else if (horizontalAngleDeg <= 13 && seat.rowIndex >= 2) {
    viewZoneLabel = 'Optimal Center Sightline';
  } else if (seat.rowIndex >= config.rows - 2) {
    viewZoneLabel = 'Elevated Panoramic Balcony';
  }

  return {
    distanceMeters: Number(distanceMeters.toFixed(1)),
    horizontalAngleDeg: Math.round(horizontalAngleDeg),
    verticalAngleDeg: Math.round(verticalAngleDeg),
    horizontalFovDeg: Math.round(horizontalFovDeg),
    verticalFovDeg: Math.round(verticalFovDeg),
    screenCoveragePercent,
    viewZoneLabel,
  };
}

export function toggleSeatSelection(
  currentSelectedIds: readonly string[],
  targetSeat: TheaterSeat,
  maxSeats: number = MAX_SEATS_PER_BOOKING,
): { nextSelectedIds: string[]; error: string | null } {
  if (targetSeat.occupied) {
    return {
      nextSelectedIds: [...currentSelectedIds],
      error: `Seat ${targetSeat.id} is already reserved.`,
    };
  }

  const exists = currentSelectedIds.includes(targetSeat.id);
  if (exists) {
    return {
      nextSelectedIds: currentSelectedIds.filter((id) => id !== targetSeat.id),
      error: null,
    };
  }

  if (currentSelectedIds.length >= maxSeats) {
    return {
      nextSelectedIds: [...currentSelectedIds],
      error: `You can book up to ${maxSeats} seats in a single reservation.`,
    };
  }

  return {
    nextSelectedIds: [...currentSelectedIds, targetSeat.id],
    error: null,
  };
}

export function calculateBookingTotals(
  selectedSeats: readonly TheaterSeat[],
  concessions: readonly ConcessionSelection[],
  catalog: readonly ConcessionItem[],
): {
  seatsSubtotal: number;
  concessionsSubtotal: number;
  bookingFee: number;
  total: number;
} {
  const seatsSubtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const concessionsSubtotal = concessions.reduce((sum, entry) => {
    const item = catalog.find((c) => c.id === entry.itemId);
    return sum + (item ? item.price * Math.max(0, entry.quantity) : 0);
  }, 0);
  const bookingFee =
    selectedSeats.length > 0
      ? Number((selectedSeats.length * BOOKING_FEE_PER_TICKET).toFixed(2))
      : 0;

  return {
    seatsSubtotal: Number(seatsSubtotal.toFixed(2)),
    concessionsSubtotal: Number(concessionsSubtotal.toFixed(2)),
    bookingFee,
    total: Number((seatsSubtotal + concessionsSubtotal + bookingFee).toFixed(2)),
  };
}

export function validateCheckoutForm(input: {
  name: string;
  email: string;
  seatCount: number;
}): { valid: boolean; errors: { name?: string; email?: string; seats?: string } } {
  const errors: { name?: string; email?: string; seats?: string } = {};
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim();

  if (input.seatCount < 1) {
    errors.seats = 'Select at least one seat before checking out.';
  }
  if (trimmedName.length < 2) {
    errors.name = 'Enter your full name (at least 2 characters).';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address for your digital pass.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
