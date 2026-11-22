import { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Heart } from 'lucide-react';
import type { AuditoriumConfig, Movie, Showtime } from '../types/cinema';

interface ShowtimeViewProps {
  movie: Movie;
  showtimes: Showtime[];
  auditoriums: Record<string, AuditoriumConfig>;
  isFavoriteMovie: boolean;
  onToggleFavoriteMovie: (movieId: string) => void;
  onBack: () => void;
  onSelectShowtime: (showtime: Showtime) => void;
}

export function ShowtimeView({
  movie,
  showtimes,
  auditoriums,
  isFavoriteMovie,
  onToggleFavoriteMovie,
  onBack,
  onSelectShowtime,
}: ShowtimeViewProps) {
  const movieShowtimes = useMemo(
    () => showtimes.filter((st) => st.movieId === movie.id),
    [showtimes, movie.id],
  );

  const dates = useMemo(
    () => Array.from(new Set(movieShowtimes.map((s) => s.dateLabel))),
    [movieShowtimes],
  );
  const [selectedDate, setSelectedDate] = useState<string>(dates[0] || 'Today · Nov 22');

  const filteredShowtimes = movieShowtimes.filter((st) => st.dateLabel === selectedDate);
  const hrs = Math.floor(movie.durationMinutes / 60);
  const mins = movie.durationMinutes % 60;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F4F2EE] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Now Showing</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Poster & Film Credits */}
        <div className="lg:col-span-4 space-y-4">
          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-[#12141A]">
            <img
              src={movie.posterUrl}
              alt={`${movie.title} poster`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="bg-[#12141A] border border-white/10 rounded-xl p-5 space-y-3 text-sm">
            <div>
              <span className="text-xs text-[#9CA3AF] block">Director</span>
              <span className="text-[#F4F2EE] font-medium">{movie.director}</span>
            </div>
            <div className="pt-2 border-t border-white/10">
              <span className="text-xs text-[#9CA3AF] block">Principal Cast</span>
              <span className="text-[#F4F2EE]">{movie.cast.join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Synopsis & Showtime Selection */}
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#E5A93B] font-medium tabular-nums">
                  <span>{movie.genre}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {hrs}h {mins}m
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{movie.rating}</span>
                  <span aria-hidden="true">·</span>
                  <span>{movie.releaseYear}</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F4F2EE] mt-2">
                  {movie.title}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => onToggleFavoriteMovie(movie.id)}
                aria-label={
                  isFavoriteMovie ? 'Remove movie from favorites' : 'Save movie to favorites'
                }
                aria-pressed={isFavoriteMovie}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#F4F2EE] hover:border-[#E5A93B] transition-colors inline-flex items-center gap-2 shrink-0"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFavoriteMovie ? 'fill-[#E5A93B] text-[#E5A93B]' : 'text-[#F4F2EE]'
                  }`}
                />
                <span>{isFavoriteMovie ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            <p className="text-base text-[#D1D5DB] leading-relaxed">{movie.synopsis}</p>
          </div>

          {/* Date Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#F4F2EE]">
              <Calendar className="w-4 h-4 text-[#E5A93B]" aria-hidden="true" />
              <span>Select Screening Date</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dates.map((d) => {
                const active = selectedDate === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#E5A93B] text-[#0A0B0E] border-[#E5A93B] font-semibold'
                        : 'bg-[#12141A] text-[#D1D5DB] border-white/10 hover:border-white/30'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Showtimes List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#F4F2EE]">
              <Clock className="w-4 h-4 text-[#E5A93B]" aria-hidden="true" />
              <span>Select Showtime to Open 3D Auditorium</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredShowtimes.map((st) => {
                const hall = auditoriums[st.auditoriumId];
                const totalSeats = hall ? hall.rows * hall.seatsPerRow : 80;
                const remaining = Math.max(0, totalSeats - st.occupiedSeatIds.length);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onSelectShowtime(st)}
                    className="text-left bg-[#12141A] border border-white/10 hover:border-[#E5A93B] rounded-xl p-5 transition-colors flex flex-col justify-between gap-4 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-mono text-2xl font-semibold text-[#F4F2EE] tabular-nums group-hover:text-[#E5A93B] transition-colors">
                          {st.time}
                        </span>
                        <p className="text-sm font-medium text-[#D1D5DB] mt-1">
                          {hall?.name || st.format}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[#E5A93B] whitespace-nowrap">
                        {st.format}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#9CA3AF] tabular-nums">
                      <span>{remaining} seats open</span>
                      <span className="text-[#F4F2EE] font-medium">
                        ${hall?.basePrice ?? 16} – ${hall?.vipPrice ?? 24} · Choose in 3D →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
