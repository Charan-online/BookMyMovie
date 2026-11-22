import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Grid2x2,
  Orbit,
  X,
} from 'lucide-react';
import type {
  AuditoriumConfig,
  CameraMode,
  Movie,
  Showtime,
  TheaterSeat,
} from '../types/cinema';
import {
  computeSeatSightline,
  generateAuditoriumSeats,
  toggleSeatSelection,
} from '../utils/theaterMath';
import { Theater3DCanvas } from './Theater3DCanvas';

interface SeatSelectionViewProps {
  movie: Movie;
  showtime: Showtime;
  auditorium: AuditoriumConfig;
  firestoreOccupiedIds: string[];
  selectedSeatIds: string[];
  onChangeSelectedSeats: (seatIds: string[]) => void;
  onBack: () => void;
  onProceedToCheckout: () => void;
}

export function SeatSelectionView({
  movie,
  showtime,
  auditorium,
  firestoreOccupiedIds,
  selectedSeatIds,
  onChangeSelectedSeats,
  onBack,
  onProceedToCheckout,
}: SeatSelectionViewProps) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('overview');
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<TheaterSeat | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [show2DGrid, setShow2DGrid] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const combinedOccupied = useMemo(
    () => Array.from(new Set([...showtime.occupiedSeatIds, ...firestoreOccupiedIds])),
    [showtime.occupiedSeatIds, firestoreOccupiedIds],
  );

  const seats = useMemo(
    () => generateAuditoriumSeats(auditorium, combinedOccupied),
    [auditorium, combinedOccupied],
  );

  const selectedSeats = useMemo(
    () => seats.filter((s) => selectedSeatIds.includes(s.id)),
    [seats, selectedSeatIds],
  );

  const subtotal = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + s.price, 0),
    [selectedSeats],
  );

  const activeSeatForMetrics = useMemo(() => {
    if (hoveredSeat) return hoveredSeat;
    if (focusedSeatId) return seats.find((s) => s.id === focusedSeatId) || null;
    if (selectedSeats.length > 0) return selectedSeats[selectedSeats.length - 1];
    return null;
  }, [hoveredSeat, focusedSeatId, seats, selectedSeats]);

  const sightline = useMemo(
    () =>
      activeSeatForMetrics
        ? computeSeatSightline(activeSeatForMetrics, auditorium)
        : null,
    [activeSeatForMetrics, auditorium],
  );

  const handleSeatClick = (seat: TheaterSeat) => {
    const wasSelected = selectedSeatIds.includes(seat.id);
    const result = toggleSeatSelection(selectedSeatIds, seat);
    if (result.error) {
      setNotice(result.error);
      return;
    }

    setNotice(null);
    onChangeSelectedSeats(result.nextSelectedIds);

    if (!wasSelected) {
      // Newly selected: glide camera straight into that seat's eye-level POV
      setFocusedSeatId(seat.id);
      setCameraMode('seat-pov');
    } else {
      // Deselected: if that was the focused seat, focus next remaining seat or return to overview
      if (focusedSeatId === seat.id) {
        const nextFocus = result.nextSelectedIds[result.nextSelectedIds.length - 1] || null;
        setFocusedSeatId(nextFocus);
        if (!nextFocus) {
          setCameraMode('overview');
        }
      }
    }
  };

  const handleRemoveSeatChip = (seatId: string) => {
    const next = selectedSeatIds.filter((id) => id !== seatId);
    onChangeSelectedSeats(next);
    if (focusedSeatId === seatId) {
      const nextFocus = next[next.length - 1] || null;
      setFocusedSeatId(nextFocus);
      if (!nextFocus) setCameraMode('overview');
    }
  };

  const handleSwitchCameraMode = (mode: CameraMode) => {
    if (mode === 'seat-pov') {
      if (focusedSeatId) {
        setCameraMode('seat-pov');
        return;
      }
      if (selectedSeatIds.length > 0) {
        setFocusedSeatId(selectedSeatIds[selectedSeatIds.length - 1]);
        setCameraMode('seat-pov');
        return;
      }
      // Pick best available center seat to preview if none chosen yet
      const midRow = Math.floor(auditorium.rows * 0.62);
      const midCol = Math.floor(auditorium.seatsPerRow / 2);
      const centerFallback =
        seats.find((s) => !s.occupied && s.rowIndex === midRow && s.colIndex === midCol) ||
        seats.find((s) => !s.occupied);
      if (centerFallback) {
        setFocusedSeatId(centerFallback.id);
        setCameraMode('seat-pov');
      }
      return;
    }
    setCameraMode('overview');
  };

  const rowsGrouped = useMemo(() => {
    const map = new Map<string, TheaterSeat[]>();
    for (const s of seats) {
      const arr = map.get(s.rowLabel) || [];
      arr.push(s);
      map.set(s.rowLabel, arr);
    }
    return Array.from(map.entries());
  }, [seats]);

  return (
    <section
      aria-label="3D Theater Seat Selection"
      className="relative w-full h-[calc(100dvh-56px)] md:h-[calc(100dvh-64px)] overflow-hidden bg-[#07080B]"
    >
      {/* Full-bleed 3D Auditorium Canvas */}
      <Theater3DCanvas
        auditorium={auditorium}
        seats={seats}
        selectedSeatIds={selectedSeatIds}
        focusedSeatId={focusedSeatId}
        cameraMode={cameraMode}
        movie={movie}
        onSelectSeat={handleSeatClick}
        onHoverSeat={setHoveredSeat}
      />

      {/* Top-Left Compact Bar (solid dark fill, no backdrop-blur over WebGL) */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-[#12141A]/95 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-3 max-w-full">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to showtimes"
            className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg border border-white/10 text-[#F4F2EE] hover:border-[#E5A93B] transition-colors inline-flex items-center gap-1.5 text-xs font-medium shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Showtimes</span>
          </button>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#F4F2EE] truncate">{movie.title}</p>
            <p className="text-xs text-[#9CA3AF] truncate tabular-nums">
              {showtime.time} · {auditorium.name}
            </p>
          </div>
        </div>

        {/* Camera Perspective Toggle */}
        <div
          role="group"
          aria-label="3D Camera Mode"
          className="pointer-events-auto bg-[#12141A]/95 border border-white/10 rounded-xl p-1 flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => handleSwitchCameraMode('overview')}
            aria-pressed={cameraMode === 'overview'}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              cameraMode === 'overview'
                ? 'bg-[#E5A93B] text-[#0A0B0E] font-semibold'
                : 'text-[#D1D5DB] hover:text-[#F4F2EE]'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Theater Overview</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchCameraMode('seat-pov')}
            aria-pressed={cameraMode === 'seat-pov'}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              cameraMode === 'seat-pov'
                ? 'bg-[#E5A93B] text-[#0A0B0E] font-semibold'
                : 'text-[#D1D5DB] hover:text-[#F4F2EE]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {focusedSeatId ? `Seat ${focusedSeatId} View` : 'Seat Screen View'}
            </span>
          </button>
        </div>
      </div>

      {/* Transient validation / occupied notice */}
      {notice && (
        <div
          role="status"
          className="absolute top-20 left-3 z-20 bg-[#12141A]/95 border border-[#E5A93B]/60 text-[#F4F2EE] text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-3"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            className="text-[#9CA3AF] hover:text-[#F4F2EE]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (zero mid-screen clutter) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(960px,95vw)] flex flex-col items-center">
        {/* Optional Quick 2D Seat Map Drawer above Dock (great for mobile thumbs & exact row picks) */}
        {show2DGrid && !dockCollapsed && (
          <div className="w-full mb-2 bg-[#12141A]/95 border border-white/15 rounded-xl p-4 max-h-[42vh] overflow-y-auto cinema-scroll">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-[#F4F2EE]">
                  Quick Seat Map — Tap any seat to select &amp; move 3D camera
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  Curved screen is at the top · Rows G–H are VIP Recliners
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShow2DGrid(false)}
                aria-label="Close 2D seat map"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/10 text-[#9CA3AF] hover:text-[#F4F2EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-2/3 mx-auto h-1.5 rounded-full bg-[#E5A93B]/50 mb-4" />

            <div className="space-y-1.5 overflow-x-auto pb-1 cinema-scroll">
              {rowsGrouped.map(([rowLabel, rowSeats]) => (
                <div key={rowLabel} className="flex items-center justify-center gap-1 min-w-max">
                  <span className="w-5 text-[11px] font-mono text-[#9CA3AF] text-right mr-1">
                    {rowLabel}
                  </span>
                  {rowSeats.map((s) => {
                    const isSel = selectedSeatIds.includes(s.id);
                    const hasAisleAfter =
                      s.seatNumber === auditorium.aisleAfterColumn ||
                      s.seatNumber === auditorium.secondAisleAfterColumn;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={s.occupied}
                        onClick={() => handleSeatClick(s)}
                        aria-label={`Seat ${s.id}, ${s.tier === 'vip' ? 'VIP Recliner' : 'Standard'}, $${s.price}, ${s.occupied ? 'Occupied' : isSel ? 'Selected' : 'Available'}`}
                        className={`min-h-[30px] min-w-[28px] sm:min-w-[32px] px-1 rounded text-[10px] font-mono tabular-nums transition-colors ${
                          hasAisleAfter ? 'mr-3' : ''
                        } ${
                          s.occupied
                            ? 'bg-[#262A34] text-[#6B7280] cursor-not-allowed'
                            : isSel
                              ? 'bg-[#E5A93B] text-[#0A0B0E] font-bold'
                              : s.tier === 'vip'
                                ? 'bg-[#6F1938] text-[#F4F2EE] hover:bg-[#8B2148] border border-[#E5A93B]/40'
                                : 'bg-[#881D2D] text-[#F4F2EE] hover:bg-[#A62438]'
                        }`}
                      >
                        {s.seatNumber}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapse / Expand Handle */}
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-expanded={!dockCollapsed}
          className="px-4 py-1.5 rounded-t-lg bg-[#12141A]/95 border border-b-0 border-white/15 text-[11px] font-medium text-[#D1D5DB] hover:text-[#E5A93B] inline-flex items-center gap-1.5 transition-colors"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Show Seat Controls ({selectedSeatIds.length} selected)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hide Controls to Inspect Screen</span>
            </>
          )}
        </button>

        {/* Unified Bottom Dock */}
        {!dockCollapsed && (
          <div className="w-full bg-[#12141A]/95 border border-white/15 rounded-xl p-3.5 sm:p-4 space-y-3">
            {/* Row 1: Sightline Telemetry & Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2.5 border-b border-white/10">
              <div className="text-xs text-[#D1D5DB] min-h-[20px]">
                {activeSeatForMetrics && sightline ? (
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                    <span className="font-mono font-semibold text-[#E5A93B]">
                      Seat {activeSeatForMetrics.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeSeatForMetrics.tier === 'vip' ? 'VIP Recliner' : 'Standard'} ($
                      {activeSeatForMetrics.price})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{sightline.distanceMeters}m from screen</span>
                    <span aria-hidden="true">·</span>
                    <span>{sightline.horizontalFovDeg}° FOV</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#F4F2EE] font-medium">{sightline.viewZoneLabel}</span>
                  </div>
                ) : (
                  <span className="text-[#9CA3AF]">
                    Drag to orbit the 3D auditorium · Tap or click any seat to preview the screen
                    from eye level.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9CA3AF]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#881D2D] inline-block" />
                  <span>Available</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#6F1938] border border-[#E5A93B]/70 inline-block" />
                  <span>VIP</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#E5A93B] inline-block" />
                  <span>Selected</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#262A34] inline-block" />
                  <span>Occupied</span>
                </span>
              </div>
            </div>

            {/* Row 2: Selected Seats, 2D Map Toggle, Price & Checkout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShow2DGrid((v) => !v)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    show2DGrid
                      ? 'border-[#E5A93B] text-[#E5A93B] bg-[#E5A93B]/10'
                      : 'border-white/15 text-[#F4F2EE] hover:border-white/30'
                  }`}
                >
                  <Grid2x2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{show2DGrid ? 'Hide 2D Map' : '2D Seat Map'}</span>
                </button>

                {selectedSeats.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedSeats.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md bg-[#1B1E26] border border-[#E5A93B]/40 text-xs font-mono text-[#F4F2EE] tabular-nums"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFocusedSeatId(s.id);
                            setCameraMode('seat-pov');
                          }}
                          title={`Move camera to Seat ${s.id}`}
                          className="hover:text-[#E5A93B]"
                        >
                          {s.id}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSeatChip(s.id)}
                          aria-label={`Remove seat ${s.id}`}
                          className="p-0.5 text-[#9CA3AF] hover:text-[#F4F2EE]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#9CA3AF]">No seats selected yet</span>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-[#9CA3AF] block">
                    {selectedSeats.length} {selectedSeats.length === 1 ? 'Ticket' : 'Tickets'}
                  </span>
                  <span className="font-mono text-lg font-semibold text-[#F4F2EE] tabular-nums">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={selectedSeats.length === 0}
                  onClick={onProceedToCheckout}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-sm font-semibold hover:bg-[#F0B84E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                >
                  Continue to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
