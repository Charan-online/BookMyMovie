import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Minus, Plus, Ticket } from 'lucide-react';
import type {
  AuditoriumConfig,
  BookingRecord,
  ConcessionItem,
  ConcessionSelection,
  Movie,
  Showtime,
} from '../types/cinema';
import type { UserProfile } from '../services/cinemaService';
import {
  calculateBookingTotals,
  generateAuditoriumSeats,
  validateCheckoutForm,
} from '../utils/theaterMath';

interface CheckoutViewProps {
  movie: Movie;
  showtime: Showtime;
  auditorium: AuditoriumConfig;
  selectedSeatIds: string[];
  concessionsCatalog: ConcessionItem[];
  userProfile: UserProfile | null;
  onBackToSeats: () => void;
  onRequestSignIn: () => void;
  onConfirmBooking: (params: {
    customerName: string;
    customerEmail: string;
    concessions: ConcessionSelection[];
    subtotal: number;
    bookingFee: number;
    total: number;
  }) => Promise<BookingRecord>;
}

export function CheckoutView({
  movie,
  showtime,
  auditorium,
  selectedSeatIds,
  concessionsCatalog,
  userProfile,
  onBackToSeats,
  onRequestSignIn,
  onConfirmBooking,
}: CheckoutViewProps) {
  const [name, setName] = useState(userProfile?.displayName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    seats?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const seats = useMemo(
    () => generateAuditoriumSeats(auditorium, showtime.occupiedSeatIds),
    [auditorium, showtime.occupiedSeatIds],
  );
  const selectedSeats = useMemo(
    () => seats.filter((s) => selectedSeatIds.includes(s.id)),
    [seats, selectedSeatIds],
  );

  const concessionSelections: ConcessionSelection[] = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity })),
    [quantities],
  );

  const totals = useMemo(
    () => calculateBookingTotals(selectedSeats, concessionSelections, concessionsCatalog),
    [selectedSeats, concessionSelections, concessionsCatalog],
  );

  const adjustQty = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(8, (prev[itemId] || 0) + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const check = validateCheckoutForm({
      name,
      email,
      seatCount: selectedSeats.length,
    });
    if (!check.valid) {
      setFormErrors(check.errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      await onConfirmBooking({
        customerName: name.trim(),
        customerEmail: email.trim(),
        concessions: concessionSelections,
        subtotal: Number((totals.seatsSubtotal + totals.concessionsSubtotal).toFixed(2)),
        bookingFee: totals.bookingFee,
        total: totals.total,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to complete booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <button
        type="button"
        onClick={onBackToSeats}
        className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F4F2EE] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to 3D Seat Selection</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Concessions & Guest Details */}
        <form onSubmit={handleSubmit} noValidate className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#F4F2EE]">
              Complete Your Reservation
            </h1>
            <p className="text-sm text-[#9CA3AF] mt-1">
              Review your seats, add refreshments if desired, and enter ticket holder details.
            </p>
          </div>

          {!userProfile && (
            <div className="bg-[#12141A] border border-[#E5A93B]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#F4F2EE]">
                  Sign in to save this booking to your history
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  Signed-in members keep digital passes and favorite theaters synced across devices.
                </p>
              </div>
              <button
                type="button"
                onClick={onRequestSignIn}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-[#E5A93B] text-xs font-semibold text-[#E5A93B] hover:bg-[#E5A93B] hover:text-[#0A0B0E] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In with Google
              </button>
            </div>
          )}

          {/* Concessions */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-[#F4F2EE]">
              Pre-Order Concessions
            </h2>
            <div className="space-y-3">
              {concessionsCatalog.map((item) => {
                const qty = quantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="bg-[#12141A] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F4F2EE]">{item.name}</p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">{item.description}</p>
                      <p className="font-mono text-xs text-[#E5A93B] mt-1 tabular-nums">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => adjustQty(item.id, -1)}
                        disabled={qty === 0}
                        aria-label={`Decrease ${item.name} quantity`}
                        className="min-h-[40px] min-w-[40px] rounded-lg border border-white/15 flex items-center justify-center text-[#F4F2EE] disabled:opacity-30 hover:border-[#E5A93B]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono text-sm tabular-nums text-[#F4F2EE]">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustQty(item.id, 1)}
                        aria-label={`Increase ${item.name} quantity`}
                        className="min-h-[40px] min-w-[40px] rounded-lg border border-white/15 flex items-center justify-center text-[#F4F2EE] hover:border-[#E5A93B]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Ticket Holder Form */}
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#F4F2EE]">
              Ticket Holder Details
            </h2>

            <div className="space-y-4 bg-[#12141A] border border-white/10 rounded-xl p-5">
              <div>
                <label
                  htmlFor="checkout-name"
                  className="block text-xs font-medium text-[#D1D5DB] mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-white/15 text-sm text-[#F4F2EE] placeholder:text-[#6B7280] focus:outline-none focus:border-[#E5A93B]"
                />
                {formErrors.name && (
                  <p className="text-xs text-[#F87171] mt-1.5">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="checkout-email"
                  className="block text-xs font-medium text-[#D1D5DB] mb-1.5"
                >
                  Email Address (for Digital Pass)
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@example.com"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-white/15 text-sm text-[#F4F2EE] placeholder:text-[#6B7280] focus:outline-none focus:border-[#E5A93B]"
                />
                {formErrors.email && (
                  <p className="text-xs text-[#F87171] mt-1.5">{formErrors.email}</p>
                )}
              </div>

              {formErrors.seats && (
                <p className="text-xs text-[#F87171]">{formErrors.seats}</p>
              )}
              {submitError && <p className="text-xs text-[#F87171]">{submitError}</p>}
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-sm font-semibold hover:bg-[#F0B84E] disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Issuing Tickets...'
              : `Confirm Booking · $${totals.total.toFixed(2)}`}
          </button>
        </form>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 bg-[#12141A] border border-white/10 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <div className="flex items-start gap-4 pb-5 border-b border-white/10">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              referrerPolicy="no-referrer"
              className="w-16 h-22 object-cover rounded-lg border border-white/10 shrink-0"
            />
            <div>
              <p className="text-xs font-medium text-[#E5A93B]">{showtime.format}</p>
              <h2 className="font-display text-xl font-semibold text-[#F4F2EE] mt-0.5">
                {movie.title}
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {showtime.dateLabel} · {showtime.time}
              </p>
              <p className="text-xs text-[#9CA3AF]">{auditorium.name}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-[#D1D5DB]">
              <span>
                Seats ({selectedSeats.map((s) => s.id).join(', ')})
              </span>
              <span className="font-mono tabular-nums">${totals.seatsSubtotal.toFixed(2)}</span>
            </div>

            {concessionSelections.map((sel) => {
              const item = concessionsCatalog.find((c) => c.id === sel.itemId);
              if (!item) return null;
              return (
                <div key={sel.itemId} className="flex items-center justify-between text-[#D1D5DB]">
                  <span>
                    {sel.quantity}× {item.name}
                  </span>
                  <span className="font-mono tabular-nums">
                    ${(item.price * sel.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}

            <div className="flex items-center justify-between text-[#9CA3AF]">
              <span>Booking Service Fee</span>
              <span className="font-mono tabular-nums">${totals.bookingFee.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#F4F2EE]">Total Due</span>
            <span className="font-mono text-2xl font-semibold text-[#E5A93B] tabular-nums">
              ${totals.total.toFixed(2)}
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function BookingConfirmationView({
  booking,
  onDone,
  onViewHistory,
}: {
  booking: BookingRecord;
  onDone: () => void;
  onViewHistory: () => void;
}) {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      <div className="bg-[#12141A] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-white/10 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#34D399]">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Reservation Confirmed</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#F4F2EE]">
            Your Digital Pass is Ready
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Present this code at the auditorium entrance. Confirmation sent to{' '}
            <span className="text-[#F4F2EE]">{booking.customerEmail}</span>.
          </p>
        </div>

        <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="space-y-3">
            <div>
              <span className="text-xs text-[#9CA3AF] block">Film &amp; Format</span>
              <span className="font-display text-xl font-semibold text-[#F4F2EE]">
                {booking.movieTitle}
              </span>
              <span className="text-xs text-[#E5A93B] block mt-0.5">{booking.format}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
              <div>
                <span className="text-xs text-[#9CA3AF] block">Date &amp; Time</span>
                <span className="font-mono text-[#F4F2EE] tabular-nums">
                  {booking.dateLabel} · {booking.time}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#9CA3AF] block">Auditorium</span>
                <span className="text-[#F4F2EE]">{booking.auditoriumName}</span>
              </div>
              <div>
                <span className="text-xs text-[#9CA3AF] block">Seats</span>
                <span className="font-mono font-semibold text-[#E5A93B] tabular-nums">
                  {booking.seatIds.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#9CA3AF] block">Pass Code</span>
                <span className="font-mono font-semibold text-[#F4F2EE] tabular-nums">
                  {booking.confirmationCode}
                </span>
              </div>
            </div>
          </div>

          {/* Crisp deterministic SVG QR-style pass emblem */}
          <div className="p-3 bg-[#F4F2EE] rounded-lg shrink-0 self-center sm:self-auto">
            <svg
              width="104"
              height="104"
              viewBox="0 0 26 26"
              role="img"
              aria-label={`Pass QR for ${booking.confirmationCode}`}
            >
              <rect width="26" height="26" fill="#F4F2EE" />
              <rect x="2" y="2" width="7" height="7" fill="#0A0B0E" />
              <rect x="3" y="3" width="5" height="5" fill="#F4F2EE" />
              <rect x="4" y="4" width="3" height="3" fill="#0A0B0E" />
              <rect x="17" y="2" width="7" height="7" fill="#0A0B0E" />
              <rect x="18" y="3" width="5" height="5" fill="#F4F2EE" />
              <rect x="19" y="4" width="3" height="3" fill="#0A0B0E" />
              <rect x="2" y="17" width="7" height="7" fill="#0A0B0E" />
              <rect x="3" y="18" width="5" height="5" fill="#F4F2EE" />
              <rect x="4" y="19" width="3" height="3" fill="#0A0B0E" />
              <rect x="11" y="4" width="2" height="2" fill="#0A0B0E" />
              <rect x="13" y="6" width="2" height="2" fill="#0A0B0E" />
              <rect x="11" y="10" width="4" height="2" fill="#0A0B0E" />
              <rect x="4" y="11" width="2" height="4" fill="#0A0B0E" />
              <rect x="8" y="12" width="2" height="3" fill="#0A0B0E" />
              <rect x="15" y="12" width="3" height="2" fill="#0A0B0E" />
              <rect x="12" y="16" width="2" height="2" fill="#0A0B0E" />
              <rect x="16" y="16" width="3" height="3" fill="#0A0B0E" />
              <rect x="21" y="14" width="3" height="2" fill="#0A0B0E" />
              <rect x="19" y="20" width="5" height="4" fill="#0A0B0E" />
              <rect x="11" y="21" width="4" height="3" fill="#0A0B0E" />
            </svg>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-4 bg-[#0A0B0E]/60 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onViewHistory}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#F4F2EE] hover:border-[#E5A93B] inline-flex items-center gap-2"
          >
            <Ticket className="w-4 h-4 text-[#E5A93B]" aria-hidden="true" />
            <span>View All My Tickets</span>
          </button>
          <button
            type="button"
            onClick={onDone}
            className="min-h-[44px] px-5 py-2 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-xs font-semibold hover:bg-[#F0B84E]"
          >
            Browse More Movies
          </button>
        </div>
      </div>
    </main>
  );
}
