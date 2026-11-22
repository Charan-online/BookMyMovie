import { useEffect, useState } from 'react';
import { Film, Heart, LogOut, MapPin, Ticket, User, X } from 'lucide-react';
import type {
  AuditoriumConfig,
  BookingRecord,
  Movie,
  ProjectionFormat,
} from '../types/cinema';
import type { UserProfile } from '../services/cinemaService';

interface AccountModalProps {
  open: boolean;
  initialTab: 'profile' | 'favorites' | 'history';
  userProfile: UserProfile | null;
  bookings: BookingRecord[];
  movies: Movie[];
  auditoriums: AuditoriumConfig[];
  authError: string | null;
  onClose: () => void;
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateProfile: (displayName: string, preferredFormat: ProjectionFormat) => Promise<void>;
  onToggleFavoriteMovie: (movieId: string) => void;
  onToggleFavoriteTheater: (theaterId: string) => void;
  onOpenMovieShowtimes: (movie: Movie) => void;
  onExploreTheater3D: (auditoriumId: string) => void;
}

const FORMATS: ProjectionFormat[] = ['IMAX Laser', 'Dolby Atmos', 'Boutique 2D'];

export function AccountModal({
  open,
  initialTab,
  userProfile,
  bookings,
  movies,
  auditoriums,
  authError,
  onClose,
  onSignInGoogle,
  onSignOut,
  onUpdateProfile,
  onToggleFavoriteMovie,
  onToggleFavoriteTheater,
  onOpenMovieShowtimes,
  onExploreTheater3D,
}: AccountModalProps) {
  const [tab, setTab] = useState<'profile' | 'favorites' | 'history'>(initialTab);
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [formatInput, setFormatInput] = useState<ProjectionFormat>(
    userProfile?.preferredFormat || 'IMAX Laser',
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    if (userProfile) {
      setNameInput(userProfile.displayName);
      setFormatInput(userProfile.preferredFormat);
    }
  }, [userProfile]);

  if (!open) return null;

  const favoriteMovies = movies.filter((m) =>
    userProfile?.favoriteMovieIds.includes(m.id),
  );
  const favoriteTheaters = auditoriums.filter((a) =>
    userProfile?.favoriteTheaterIds.includes(a.id),
  );

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    setSaving(true);
    try {
      await onUpdateProfile(nameInput || userProfile?.displayName || 'Guest', formatInput);
      setSaveMessage('Profile preferences updated.');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-dialog-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl bg-[#12141A] border border-white/15 rounded-xl overflow-hidden max-h-[88vh] flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <h2
            id="account-dialog-title"
            className="font-display text-xl font-semibold text-[#F4F2EE]"
          >
            {userProfile ? 'Member Account & Tickets' : 'Sign In to Lumière'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="min-h-[40px] min-w-[40px] rounded-lg border border-white/10 flex items-center justify-center text-[#9CA3AF] hover:text-[#F4F2EE]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-white/10 flex items-center gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`pb-3 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              tab === 'profile'
                ? 'border-[#E5A93B] text-[#E5A93B]'
                : 'border-transparent text-[#9CA3AF] hover:text-[#F4F2EE]'
            }`}
          >
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('favorites')}
            className={`pb-3 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              tab === 'favorites'
                ? 'border-[#E5A93B] text-[#E5A93B]'
                : 'border-transparent text-[#9CA3AF] hover:text-[#F4F2EE]'
            }`}
          >
            <Heart className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Saved Favorites</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`pb-3 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              tab === 'history'
                ? 'border-[#E5A93B] text-[#E5A93B]'
                : 'border-transparent text-[#9CA3AF] hover:text-[#F4F2EE]'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Booking History ({bookings.length})</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto cinema-scroll space-y-6">
          {!userProfile && tab !== 'history' && (
            <div className="bg-[#0A0B0E] border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-[#F4F2EE]">
                Create or Access Your Cinema Profile
              </h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                Sign in with your Google account to register automatically, sync favorite movies
                and auditoriums, and keep your digital ticket history across devices.
              </p>
              {authError && <p className="text-xs text-[#F87171]">{authError}</p>}
              <button
                type="button"
                onClick={() => void onSignInGoogle()}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-sm font-semibold hover:bg-[#F0B84E] transition-colors"
              >
                Continue with Google
              </button>
            </div>
          )}

          {userProfile && tab === 'profile' && (
            <form onSubmit={handleSavePrefs} className="space-y-5">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <p className="text-sm font-semibold text-[#F4F2EE]">{userProfile.displayName}</p>
                  <p className="text-xs text-[#9CA3AF]">{userProfile.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#D1D5DB] hover:border-[#F87171] hover:text-[#F87171] inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div>
                <label
                  htmlFor="profile-display-name"
                  className="block text-xs font-medium text-[#D1D5DB] mb-1.5"
                >
                  Display Name
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={nameInput || userProfile.displayName}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-white/15 text-sm text-[#F4F2EE] focus:outline-none focus:border-[#E5A93B]"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-[#D1D5DB] mb-2">
                  Preferred Projection Format
                </span>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormatInput(fmt)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        (formatInput || userProfile.preferredFormat) === fmt
                          ? 'bg-[#E5A93B] text-[#0A0B0E] border-[#E5A93B] font-semibold'
                          : 'bg-[#0A0B0E] text-[#D1D5DB] border-white/15'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {saveMessage && <p className="text-xs text-[#34D399]">{saveMessage}</p>}

              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#E5A93B] text-[#0A0B0E] text-xs font-semibold hover:bg-[#F0B84E] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          )}

          {userProfile && tab === 'favorites' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  Favorite Movies ({favoriteMovies.length})
                </h3>
                {favoriteMovies.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF]">
                    No saved movies yet. Tap the heart icon on any film to save it here.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {favoriteMovies.map((m) => (
                      <div
                        key={m.id}
                        className="bg-[#0A0B0E] border border-white/10 rounded-lg p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Film className="w-4 h-4 text-[#E5A93B] shrink-0" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#F4F2EE] truncate">
                              {m.title}
                            </p>
                            <p className="text-xs text-[#9CA3AF]">{m.genre}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenMovieShowtimes(m);
                            }}
                            className="min-h-[36px] px-3 py-1.5 rounded-md bg-[#E5A93B] text-[#0A0B0E] text-xs font-semibold"
                          >
                            Book
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleFavoriteMovie(m.id)}
                            aria-label={`Remove ${m.title} from favorites`}
                            className="min-h-[36px] min-w-[36px] rounded-md border border-white/10 flex items-center justify-center text-[#9CA3AF] hover:text-[#F87171]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  Favorite Auditoriums ({favoriteTheaters.length})
                </h3>
                {favoriteTheaters.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF]">
                    No saved theaters yet. Tap the heart icon on any screening suite to save it.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {favoriteTheaters.map((a) => (
                      <div
                        key={a.id}
                        className="bg-[#0A0B0E] border border-white/10 rounded-lg p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin className="w-4 h-4 text-[#E5A93B] shrink-0" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#F4F2EE] truncate">
                              {a.name}
                            </p>
                            <p className="text-xs text-[#9CA3AF]">{a.format}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onExploreTheater3D(a.id);
                            }}
                            className="min-h-[36px] px-3 py-1.5 rounded-md border border-white/15 text-xs font-medium text-[#F4F2EE] hover:border-[#E5A93B]"
                          >
                            3D Tour
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleFavoriteTheater(a.id)}
                            aria-label={`Remove ${a.name} from favorites`}
                            className="min-h-[36px] min-w-[36px] rounded-md border border-white/10 flex items-center justify-center text-[#9CA3AF] hover:text-[#F87171]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              {!userProfile && (
                <div className="bg-[#0A0B0E] border border-white/10 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-[#9CA3AF]">
                    Sign in with Google to view your synced bookings across devices.
                  </p>
                  <button
                    type="button"
                    onClick={() => void onSignInGoogle()}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-md bg-[#E5A93B] text-[#0A0B0E] text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {bookings.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Ticket className="w-8 h-8 text-[#9CA3AF] mx-auto" aria-hidden="true" />
                  <p className="text-sm font-medium text-[#F4F2EE]">No tickets booked yet</p>
                  <p className="text-xs text-[#9CA3AF]">
                    Once you select seats in the 3D auditorium and confirm a reservation, your pass
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-[#0A0B0E] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[#E5A93B] font-mono tabular-nums">
                          <span>{b.confirmationCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{b.format}</span>
                        </div>
                        <p className="font-display text-lg font-semibold text-[#F4F2EE]">
                          {b.movieTitle}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          {b.dateLabel} · {b.time} · {b.auditoriumName}
                        </p>
                      </div>

                      <div className="sm:text-right space-y-1">
                        <p className="font-mono text-xs text-[#F4F2EE] tabular-nums">
                          Seats: <span className="text-[#E5A93B]">{b.seatIds.join(', ')}</span>
                        </p>
                        <p className="font-mono text-sm font-semibold text-[#F4F2EE] tabular-nums">
                          ${b.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
