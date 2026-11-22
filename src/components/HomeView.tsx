import { useState } from 'react';
import { ArrowRight, Compass, Film, Heart, MapPin } from 'lucide-react';
import type { AuditoriumConfig, Movie, ProjectionFormat } from '../types/cinema';
import { HERO_AUDITORIUM_IMAGE } from '../data/cinemaData';

interface HomeViewProps {
  movies: Movie[];
  auditoriums: AuditoriumConfig[];
  favoriteMovieIds: string[];
  favoriteTheaterIds: string[];
  onSelectMovie: (movie: Movie) => void;
  onLaunch3DForMovie: (movie: Movie) => void;
  onExploreAuditorium3D: (auditoriumId: string) => void;
  onToggleFavoriteMovie: (movieId: string) => void;
  onToggleFavoriteTheater: (theaterId: string) => void;
}

const FORMAT_FILTERS: ('All Formats' | ProjectionFormat)[] = [
  'All Formats',
  'IMAX Laser',
  'Dolby Atmos',
  'Boutique 2D',
];

function ResilientPoster({
  src,
  alt,
  title,
  accentColor,
}: {
  src: string;
  alt: string;
  title: string;
  accentColor: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${accentColor}33, #12141A 75%)`,
        }}
      >
        <Film className="w-10 h-10 text-[#E5A93B] mb-3" aria-hidden="true" />
        <span className="font-display text-lg font-semibold text-[#F4F2EE]">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

export function HomeView({
  movies,
  auditoriums,
  favoriteMovieIds,
  favoriteTheaterIds,
  onSelectMovie,
  onLaunch3DForMovie,
  onExploreAuditorium3D,
  onToggleFavoriteMovie,
  onToggleFavoriteTheater,
}: HomeViewProps) {
  const [formatFilter, setFormatFilter] = useState<'All Formats' | ProjectionFormat>('All Formats');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const featuredMovie = movies[0];
  const filteredMovies =
    formatFilter === 'All Formats'
      ? movies
      : movies.filter((m) => m.formats.includes(formatFilter));

  return (
    <main className="pb-20">
      {/* Hero Showcase */}
      <section className="border-b border-white/10 bg-[#0A0B0E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between py-2">
              <div className="space-y-5">
                <p className="text-xs font-medium tracking-wider uppercase text-[#E5A93B]">
                  True Seat-Level 3D Preview
                </p>
                <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#F4F2EE] leading-[1.08]">
                  See the screen from your seat before you book.
                </h1>
                <p className="text-base text-[#9CA3AF] leading-relaxed max-w-xl">
                  Browse every aisle and stadium tier in interactive 3D. Tap any chair on desktop
                  or mobile to glide straight to eye level and judge the exact screen angle and
                  distance.
                </p>
              </div>

              <div className="pt-8 space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onLaunch3DForMovie(featuredMovie)}
                    className="min-h-[48px] px-6 py-3 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-sm font-semibold hover:bg-[#F0B84E] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93B]"
                  >
                    <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Launch 3D Seat Explorer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectMovie(featuredMovie)}
                    className="min-h-[48px] px-5 py-3 rounded-lg border border-white/15 text-[#F4F2EE] text-sm font-medium hover:bg-white/5 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <span>Select Showtimes</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#9CA3AF] tabular-nums">
                  <span>3 Architectural Halls</span>
                  <span aria-hidden="true">·</span>
                  <span>Eye-Level Screen POV</span>
                  <span aria-hidden="true">·</span>
                  <span>Real-Time Seat Availability</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 relative rounded-xl overflow-hidden border border-white/10 bg-[#12141A] min-h-[260px] sm:min-h-[340px] lg:min-h-[420px]">
              {!heroImgFailed ? (
                <img
                  src={HERO_AUDITORIUM_IMAGE}
                  alt="Lumière Grand IMAX auditorium with tiered crimson seating and curved screen"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full lg:h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1B1E26] to-[#0A0B0E]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0E]/90 via-[#0A0B0E]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-[#E5A93B] font-medium">Featured Tonight in Hall 01</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F4F2EE] mt-1">
                    {featuredMovie.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#D1D5DB] mt-1">
                    {featuredMovie.genre} · {Math.floor(featuredMovie.durationMinutes / 60)}h{' '}
                    {featuredMovie.durationMinutes % 60}m · {featuredMovie.rating}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunch3DForMovie(featuredMovie)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#12141A]/95 border border-white/15 text-[#F4F2EE] text-xs font-semibold hover:border-[#E5A93B] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  Preview Hall 01 in 3D
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Now Showing Movie Catalog */}
      <section id="now-showing" className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 md:pt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F4F2EE]">
              Now Showing
            </h2>
            <p className="text-sm text-[#9CA3AF] mt-1">
              Choose a film to inspect showtimes and preview exact seat sightlines in 3D.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter movies by projection format"
            className="flex items-center gap-1 p-1 bg-[#12141A] border border-white/10 rounded-lg overflow-x-auto cinema-scroll"
          >
            {FORMAT_FILTERS.map((fmt) => {
              const active = formatFilter === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFormatFilter(fmt)}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#E5A93B] text-[#0A0B0E] font-semibold'
                      : 'text-[#9CA3AF] hover:text-[#F4F2EE]'
                  }`}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => {
            const isFav = favoriteMovieIds.includes(movie.id);
            const hrs = Math.floor(movie.durationMinutes / 60);
            const mins = movie.durationMinutes % 60;
            return (
              <article
                key={movie.id}
                className="group bg-[#12141A] border border-white/10 rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="relative aspect-[3/4] bg-[#181B23] overflow-hidden">
                  <ResilientPoster
                    src={movie.posterUrl}
                    alt={`${movie.title} poster artwork`}
                    title={movie.title}
                    accentColor={movie.accentColor}
                  />
                  <button
                    type="button"
                    onClick={() => onToggleFavoriteMovie(movie.id)}
                    aria-label={
                      isFav
                        ? `Remove ${movie.title} from favorite movies`
                        : `Save ${movie.title} to favorite movies`
                    }
                    aria-pressed={isFav}
                    className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-full bg-[#0A0B0E]/85 border border-white/15 flex items-center justify-center text-[#F4F2EE] hover:border-[#E5A93B] transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFav ? 'fill-[#E5A93B] text-[#E5A93B]' : 'text-[#F4F2EE]'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#9CA3AF] tabular-nums">
                      <span>{movie.genre}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {hrs}h {mins}m
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{movie.rating}</span>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-[#F4F2EE]">
                      {movie.title}
                    </h3>
                    <p className="text-sm text-[#9CA3AF] line-clamp-2">{movie.tagline}</p>
                    <p className="text-xs text-[#E5A93B] font-medium pt-1">
                      {movie.formats.join(' · ')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectMovie(movie)}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-xs font-semibold hover:bg-[#F0B84E] transition-colors whitespace-nowrap"
                    >
                      Book Tickets
                    </button>
                    <button
                      type="button"
                      onClick={() => onLaunch3DForMovie(movie)}
                      aria-label={`Preview ${movie.title} in 3D theater`}
                      className="min-h-[44px] px-3 py-2 rounded-lg border border-white/15 text-[#F4F2EE] text-xs font-medium hover:border-[#E5A93B] transition-colors whitespace-nowrap shrink-0"
                    >
                      3D View
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Architectural Auditoriums Section */}
      <section id="theaters" className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F4F2EE]">
            Auditoriums & Screening Suites
          </h2>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Save your preferred screening room or tour the 3D seating geometry directly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {auditoriums.map((hall) => {
            const isFav = favoriteTheaterIds.includes(hall.id);
            const totalSeats = hall.rows * hall.seatsPerRow;
            return (
              <div
                key={hall.id}
                className="bg-[#12141A] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#E5A93B]">{hall.format}</p>
                      <h3 className="font-display text-xl font-semibold text-[#F4F2EE] mt-1">
                        {hall.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleFavoriteTheater(hall.id)}
                      aria-label={
                        isFav
                          ? `Remove ${hall.name} from favorite theaters`
                          : `Save ${hall.name} to favorite theaters`
                      }
                      aria-pressed={isFav}
                      className="min-h-[44px] min-w-[44px] rounded-lg border border-white/10 flex items-center justify-center hover:border-[#E5A93B] transition-colors shrink-0"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-[#E5A93B] text-[#E5A93B]' : 'text-[#9CA3AF]'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{hall.subtitle}</p>

                  <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#D1D5DB] font-mono tabular-nums">
                    <span>{totalSeats} Seats</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {hall.screenWidth}m × {hall.screenHeight}m Screen
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>From ${hall.basePrice}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                    <MapPin className="w-3.5 h-3.5 text-[#E5A93B]" aria-hidden="true" />
                    <span>Lumière Flagship</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onExploreAuditorium3D(hall.id)}
                    className="min-h-[44px] px-4 py-2 rounded-lg border border-white/15 text-xs font-semibold text-[#F4F2EE] hover:border-[#E5A93B] hover:text-[#E5A93B] transition-colors whitespace-nowrap shrink-0"
                  >
                    Explore in 3D
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
