import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAuditoriumSeats,
  getSeatEyePosition,
  getSeatLookTarget,
  computeSeatSightline,
  toggleSeatSelection,
  calculateBookingTotals,
  validateCheckoutForm,
  MAX_SEATS_PER_BOOKING,
} from './theaterMath';
import type { AuditoriumConfig, ConcessionItem } from '../types/cinema';

const sampleAuditorium: AuditoriumConfig = {
  id: 'hall-test',
  name: 'Hall 01',
  subtitle: 'IMAX Laser',
  format: 'IMAX Laser',
  rows: 6,
  seatsPerRow: 10,
  aisleAfterColumn: 5,
  screenWidth: 16,
  screenHeight: 8.5,
  screenCurveDepth: 1.2,
  screenCenterY: 4.8,
  screenZ: -9.5,
  firstRowZ: -3.5,
  rowSpacing: 1.4,
  rowRise: 0.42,
  seatSpacing: 0.85,
  vipRowsFromBack: 2,
  basePrice: 16,
  vipPrice: 24,
};

const sampleConcessions: ConcessionItem[] = [
  { id: 'popcorn', name: 'Truffle Popcorn', description: 'Large', price: 9.5, category: 'Popcorn' },
  { id: 'soda', name: 'Craft Cola', description: 'Chilled', price: 5.0, category: 'Beverage' },
];

test('generateAuditoriumSeats produces deterministic grid with VIP back rows and occupied flags', () => {
  const seats = generateAuditoriumSeats(sampleAuditorium, ['A-01', 'F-10']);
  assert.equal(seats.length, 60);

  const frontCorner = seats.find((s) => s.id === 'A-01')!;
  const backVip = seats.find((s) => s.id === 'F-10')!;
  const midStandard = seats.find((s) => s.id === 'C-05')!;

  assert.equal(frontCorner.occupied, true);
  assert.equal(frontCorner.tier, 'standard');
  assert.equal(frontCorner.price, 16);

  assert.equal(backVip.occupied, true);
  assert.equal(backVip.tier, 'vip');
  assert.equal(backVip.price, 24);
  assert.ok(backVip.y > frontCorner.y, 'back rows must sit higher than front rows');
  assert.ok(backVip.z > frontCorner.z, 'back rows must be farther from screen (+Z)');

  assert.equal(midStandard.occupied, false);
});

test('seat eye POV and sightline metrics vary realistically between front, center, and side seats', () => {
  const seats = generateAuditoriumSeats(sampleAuditorium, []);
  const frontCenter = seats.find((s) => s.id === 'A-05')!;
  const middleCenter = seats.find((s) => s.id === 'D-05')!;
  const backSide = seats.find((s) => s.id === 'F-01')!;

  const frontEye = getSeatEyePosition(frontCenter);
  const backEye = getSeatEyePosition(backSide);
  const target = getSeatLookTarget(middleCenter, sampleAuditorium);

  assert.ok(frontEye.y > frontCenter.y);
  assert.ok(backEye.y > frontEye.y);
  assert.ok(target.z < frontEye.z);

  const frontMetrics = computeSeatSightline(frontCenter, sampleAuditorium);
  const midMetrics = computeSeatSightline(middleCenter, sampleAuditorium);
  const sideMetrics = computeSeatSightline(backSide, sampleAuditorium);

  assert.ok(
    frontMetrics.horizontalFovDeg > midMetrics.horizontalFovDeg,
    'front row must subtend wider FOV than middle row',
  );
  assert.ok(
    frontMetrics.verticalAngleDeg > midMetrics.verticalAngleDeg,
    'front row must look steeper upward at screen center',
  );
  assert.ok(
    sideMetrics.horizontalAngleDeg > midMetrics.horizontalAngleDeg,
    'side seat must have larger horizontal off-axis angle',
  );
});

test('toggleSeatSelection blocks occupied seats and enforces max seat cap', () => {
  const seats = generateAuditoriumSeats(sampleAuditorium, ['B-02']);
  const occupiedSeat = seats.find((s) => s.id === 'B-02')!;

  const blocked = toggleSeatSelection([], occupiedSeat);
  assert.equal(blocked.nextSelectedIds.length, 0);
  assert.ok(blocked.error);

  let selected: string[] = [];
  for (let i = 1; i <= MAX_SEATS_PER_BOOKING; i++) {
    const s = seats.find((seat) => seat.id === `D-${String(i).padStart(2, '0')}`)!;
    const res = toggleSeatSelection(selected, s);
    assert.equal(res.error, null);
    selected = res.nextSelectedIds;
  }
  assert.equal(selected.length, MAX_SEATS_PER_BOOKING);

  const extraSeat = seats.find((s) => s.id === 'E-01')!;
  const capped = toggleSeatSelection(selected, extraSeat);
  assert.equal(capped.nextSelectedIds.length, MAX_SEATS_PER_BOOKING);
  assert.ok(capped.error);

  // Deselecting works cleanly
  const firstSeat = seats.find((s) => s.id === 'D-01')!;
  const removed = toggleSeatSelection(selected, firstSeat);
  assert.equal(removed.nextSelectedIds.length, MAX_SEATS_PER_BOOKING - 1);
  assert.equal(removed.error, null);
});

test('calculateBookingTotals and validateCheckoutForm calculate accurately and reject invalid fields', () => {
  const seats = generateAuditoriumSeats(sampleAuditorium, []);
  const chosen = [
    seats.find((s) => s.id === 'C-05')!, // $16
    seats.find((s) => s.id === 'F-05')!, // $24 VIP
  ];

  const totals = calculateBookingTotals(
    chosen,
    [
      { itemId: 'popcorn', quantity: 2 },
      { itemId: 'soda', quantity: 1 },
    ],
    sampleConcessions,
  );

  assert.equal(totals.seatsSubtotal, 40);
  assert.equal(totals.concessionsSubtotal, 24);
  assert.equal(totals.bookingFee, 3.5);
  assert.equal(totals.total, 67.5);

  const badForm = validateCheckoutForm({ name: 'A', email: 'not-an-email', seatCount: 0 });
  assert.equal(badForm.valid, false);
  assert.ok(badForm.errors.name);
  assert.ok(badForm.errors.email);
  assert.ok(badForm.errors.seats);

  const goodForm = validateCheckoutForm({
    name: 'Elena Vance',
    email: 'elena@lumiere.cinema',
    seatCount: 2,
  });
  assert.equal(goodForm.valid, true);
});
