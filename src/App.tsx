import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { AUDITORIUMS, CONCESSIONS, MOVIES, SHOWTIMES } from './data/cinemaData';
import type {
  BookingRecord,
  ConcessionSelection,
  Movie,
  ProjectionFormat,
  Showtime,
} from './types/cinema';
import {
  ensureUserProfile,
  persistBookingToFirestore,
  saveFavoriteMovies,
  saveFavoriteTheaters,
  subscribeShowtimeReservations,
  subscribeUserBookings,
  updateUserPreferences,
  type UserProfile,
} from './services/cinemaService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header, type AppRoute } from './components/Header';
import { HomeView } from './components/HomeView';
import { ShowtimeView } from './components/ShowtimeView';
import { SeatSelectionView } from './components/SeatSelectionView';
import { BookingConfirmationView, CheckoutView } from './components/CheckoutView';
import { AccountModal } from './components/AccountModal';

function CinemaApp() {
  const [route, setRoute] = useState<AppRoute>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === '3d' || params.get('autostart') === '1' ? 'seat-3d' : 'home';
  });

  const [selectedMovie, setSelectedMovie] = useState<Movie>(MOVIES[0]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime>(SHOWTIMES[0]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  // Firebase Auth & Firestore User State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firestoreBookings, setFirestoreBookings] = useState<BookingRecord[]>([]);
  const [sessionBookings, setSessionBookings] = useState<BookingRecord[]>([]);
  const [guestFavMovies, setGuestFavMovies] = useState<string[]>([]);
  const [guestFavTheaters, setGuestFavTheaters] = useState<string[]>([]);
  const [firestoreOccupiedIds, setFirestoreOccupiedIds] = useState<string[]>([]);

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<'profile' | 'favorites' | 'history'>('profile');

  // Subscribe to Firebase Auth state
  useEffect(() => {
    let unsubBookings: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubBookings) {
        unsubBookings();
        unsubBookings = null;
      }

      if (!firebaseUser) {
        setUserProfile(null);
        setFirestoreBookings([]);
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(firebaseUser);
        setUserProfile(profile);
        setAuthError(null);
        unsubBookings = subscribeUserBookings(firebaseUser.uid, (records) => {
          setFirestoreBookings(records);
        });
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to load account profile.');
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubBookings) unsubBookings();
    };
  }, []);

  // Subscribe to real-time seat reservations for active showtime
  useEffect(() => {
    if (route !== 'seat-3d' && route !== 'checkout') return;
    const unsub = subscribeShowtimeReservations(selectedShowtime.id, (seatIds) => {
      setFirestoreOccupiedIds(seatIds);
    });
    return () => unsub();
  }, [route, selectedShowtime.id]);

  const activeAuditorium = useMemo(
    () => AUDITORIUMS[selectedShowtime.auditoriumId] || AUDITORIUMS['imax-01'],
    [selectedShowtime.auditoriumId],
  );

  const favoriteMovieIds = userProfile ? userProfile.favoriteMovieIds : guestFavMovies;
  const favoriteTheaterIds = userProfile ? userProfile.favoriteTheaterIds : guestFavTheaters;
  const combinedBookings = userProfile ? firestoreBookings : sessionBookings;

  const handleSignInGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign-in was cancelled or blocked by popup settings.',
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAccountOpen(false);
  };

  const handleUpdateProfile = async (displayName: string, preferredFormat: ProjectionFormat) => {
    if (!userProfile) return;
    await updateUserPreferences(userProfile.uid, displayName, preferredFormat);
    setUserProfile((prev) =>
      prev ? { ...prev, displayName: displayName.trim(), preferredFormat } : null,
    );
  };

  const handleToggleFavoriteMovie = async (movieId: string) => {
    const exists = favoriteMovieIds.includes(movieId);
    const next = exists
      ? favoriteMovieIds.filter((id) => id !== movieId)
      : [...favoriteMovieIds, movieId];

    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, favoriteMovieIds: next } : null));
      await saveFavoriteMovies(userProfile.uid, next);
    } else {
      setGuestFavMovies(next);
    }
  };

  const handleToggleFavoriteTheater = async (theaterId: string) => {
    const exists = favoriteTheaterIds.includes(theaterId);
    const next = exists
      ? favoriteTheaterIds.filter((id) => id !== theaterId)
      : [...favoriteTheaterIds, theaterId];

    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, favoriteTheaterIds: next } : null));
      await saveFavoriteTheaters(userProfile.uid, next);
    } else {
      setGuestFavTheaters(next);
    }
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setRoute('showtimes');
    window.scrollTo(0, 0);
  };

  const handleLaunch3DForMovie = (movie: Movie) => {
    const firstShowtime = SHOWTIMES.find((s) => s.movieId === movie.id) || SHOWTIMES[0];
    setSelectedMovie(movie);
    setSelectedShowtime(firstShowtime);
    setSelectedSeatIds([]);
    setRoute('seat-3d');
    window.scrollTo(0, 0);
  };

  const handleExploreAuditorium3D = (auditoriumId: string) => {
    const matchingShowtime =
      SHOWTIMES.find((s) => s.auditoriumId === auditoriumId) || SHOWTIMES[0];
    const matchingMovie =
      MOVIES.find((m) => m.id === matchingShowtime.movieId) || MOVIES[0];
    setSelectedMovie(matchingMovie);
    setSelectedShowtime(matchingShowtime);
    setSelectedSeatIds([]);
    setRoute('seat-3d');
    window.scrollTo(0, 0);
  };

  const handleSelectShowtime = (showtime: Showtime) => {
    setSelectedShowtime(showtime);
    setSelectedSeatIds([]);
    setRoute('seat-3d');
    window.scrollTo(0, 0);
  };

  const handleConfirmBooking = async (params: {
    customerName: string;
    customerEmail: string;
    concessions: ConcessionSelection[];
    subtotal: number;
    bookingFee: number;
    total: number;
  }): Promise<BookingRecord> => {
    const bookingId = `bk-${Date.now()}`;
    const confirmationCode = `LUM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const concessionLines = params.concessions
      .map((sel) => {
        const item = CONCESSIONS.find((c) => c.id === sel.itemId);
        return item ? { name: item.name, quantity: sel.quantity, unitPrice: item.price } : null;
      })
      .filter((x): x is { name: string; quantity: number; unitPrice: number } => x !== null);

    const record: BookingRecord = {
      id: bookingId,
      confirmationCode,
      movieId: selectedMovie.id,
      movieTitle: selectedMovie.title,
      posterUrl: selectedMovie.posterUrl,
      auditoriumName: activeAuditorium.name,
      format: selectedShowtime.format,
      dateLabel: selectedShowtime.dateLabel,
      time: selectedShowtime.time,
      seatIds: [...selectedSeatIds],
      concessions: concessionLines,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      subtotal: params.subtotal,
      bookingFee: params.bookingFee,
      total: params.total,
      createdAt: new Date().toISOString(),
    };

    if (userProfile) {
      await persistBookingToFirestore({
        uid: userProfile.uid,
        booking: record,
        auditoriumId: activeAuditorium.id,
        showtimeId: selectedShowtime.id,
      });
    } else {
      setSessionBookings((prev) => [record, ...prev]);
      setFirestoreOccupiedIds((prev) => Array.from(new Set([...prev, ...selectedSeatIds])));
    }

    setConfirmedBooking(record);
    setSelectedSeatIds([]);
    setRoute('confirmation');
    window.scrollTo(0, 0);
    return record;
  };

  const handleJumpToSection = (sectionId: string) => {
    if (route !== 'home') {
      setRoute('home');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#F4F2EE] flex flex-col">
      <Header
        activeRoute={route}
        onNavigateHome={() => {
          setRoute('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onJumpToSection={handleJumpToSection}
        onLaunchQuick3D={() => handleLaunch3DForMovie(selectedMovie)}
        onOpenAccount={(tab = 'profile') => {
          setAccountTab(tab);
          setAccountOpen(true);
        }}
        userProfile={userProfile}
        authLoading={authLoading}
      />

      <div className="flex-1">
        {route === 'home' && (
          <HomeView
            movies={MOVIES}
            auditoriums={Object.values(AUDITORIUMS)}
            favoriteMovieIds={favoriteMovieIds}
            favoriteTheaterIds={favoriteTheaterIds}
            onSelectMovie={handleSelectMovie}
            onLaunch3DForMovie={handleLaunch3DForMovie}
            onExploreAuditorium3D={handleExploreAuditorium3D}
            onToggleFavoriteMovie={handleToggleFavoriteMovie}
            onToggleFavoriteTheater={handleToggleFavoriteTheater}
          />
        )}

        {route === 'showtimes' && (
          <ShowtimeView
            movie={selectedMovie}
            showtimes={SHOWTIMES}
            auditoriums={AUDITORIUMS}
            isFavoriteMovie={favoriteMovieIds.includes(selectedMovie.id)}
            onToggleFavoriteMovie={handleToggleFavoriteMovie}
            onBack={() => setRoute('home')}
            onSelectShowtime={handleSelectShowtime}
          />
        )}

        {route === 'seat-3d' && (
          <SeatSelectionView
            movie={selectedMovie}
            showtime={selectedShowtime}
            auditorium={activeAuditorium}
            firestoreOccupiedIds={firestoreOccupiedIds}
            selectedSeatIds={selectedSeatIds}
            onChangeSelectedSeats={setSelectedSeatIds}
            onBack={() => setRoute('showtimes')}
            onProceedToCheckout={() => setRoute('checkout')}
          />
        )}

        {route === 'checkout' && (
          <CheckoutView
            movie={selectedMovie}
            showtime={selectedShowtime}
            auditorium={activeAuditorium}
            selectedSeatIds={selectedSeatIds}
            concessionsCatalog={CONCESSIONS}
            userProfile={userProfile}
            onBackToSeats={() => setRoute('seat-3d')}
            onRequestSignIn={() => {
              setAccountTab('profile');
              setAccountOpen(true);
            }}
            onConfirmBooking={handleConfirmBooking}
          />
        )}

        {route === 'confirmation' && confirmedBooking && (
          <BookingConfirmationView
            booking={confirmedBooking}
            onDone={() => setRoute('home')}
            onViewHistory={() => {
              setAccountTab('history');
              setAccountOpen(true);
            }}
          />
        )}
      </div>

      {route !== 'seat-3d' && (
        <footer className="border-t border-white/10 bg-[#0A0B0E] py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#9CA3AF]">
            <p className="font-display text-sm text-[#F4F2EE]">Lumière Cinema</p>
            <p>Interactive 3D Seat Sightline Booking · Desktop &amp; Mobile</p>
          </div>
        </footer>
      )}

      {accountOpen && (
        <AccountModal
          open={accountOpen}
          initialTab={accountTab}
          userProfile={userProfile}
          bookings={combinedBookings}
          movies={MOVIES}
          auditoriums={Object.values(AUDITORIUMS)}
          authError={authError}
          onClose={() => setAccountOpen(false)}
          onSignInGoogle={handleSignInGoogle}
          onSignOut={handleSignOut}
          onUpdateProfile={handleUpdateProfile}
          onToggleFavoriteMovie={handleToggleFavoriteMovie}
          onToggleFavoriteTheater={handleToggleFavoriteTheater}
          onOpenMovieShowtimes={handleSelectMovie}
          onExploreTheater3D={handleExploreAuditorium3D}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CinemaApp />
    </ErrorBoundary>
  );
}
