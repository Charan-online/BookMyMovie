import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { BookingRecord, ProjectionFormat } from '../types/cinema';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  favoriteMovieIds: string[];
  favoriteTheaterIds: string[];
  preferredFormat: ProjectionFormat;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: user.uid,
        displayName: String(data.displayName || user.displayName || 'Cinema Guest'),
        email: String(data.email || user.email || ''),
        favoriteMovieIds: Array.isArray(data.favoriteMovieIds)
          ? data.favoriteMovieIds.map(String)
          : [],
        favoriteTheaterIds: Array.isArray(data.favoriteTheaterIds)
          ? data.favoriteTheaterIds.map(String)
          : [],
        preferredFormat: (data.preferredFormat as ProjectionFormat) || 'IMAX Laser',
      };
    }

    const initialName = (user.displayName || user.email?.split('@')[0] || 'Cinema Guest').slice(
      0,
      80,
    );
    const initialEmail = (user.email || '').slice(0, 120);

    await setDoc(ref, {
      uid: user.uid,
      displayName: initialName,
      email: initialEmail,
      favoriteMovieIds: [],
      favoriteTheaterIds: [],
      preferredFormat: 'IMAX Laser',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid: user.uid,
      displayName: initialName,
      email: initialEmail,
      favoriteMovieIds: [],
      favoriteTheaterIds: [],
      preferredFormat: 'IMAX Laser',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserPreferences(
  uid: string,
  displayName: string,
  preferredFormat: ProjectionFormat,
): Promise<void> {
  const path = `users/${uid}`;
  const cleanName = displayName.trim().slice(0, 80);
  if (cleanName.length < 1) {
    throw new Error('Display name cannot be empty.');
  }
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: cleanName,
      preferredFormat,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveFavoriteMovies(uid: string, favoriteMovieIds: string[]): Promise<void> {
  const path = `users/${uid}`;
  const bounded = favoriteMovieIds.slice(0, 20);
  try {
    await updateDoc(doc(db, 'users', uid), {
      favoriteMovieIds: bounded,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveFavoriteTheaters(
  uid: string,
  favoriteTheaterIds: string[],
): Promise<void> {
  const path = `users/${uid}`;
  const bounded = favoriteTheaterIds.slice(0, 10);
  try {
    await updateDoc(doc(db, 'users', uid), {
      favoriteTheaterIds: bounded,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserBookings(
  uid: string,
  onBookings: (bookings: BookingRecord[]) => void,
): Unsubscribe {
  const path = `users/${uid}/bookings`;
  const q = query(collection(db, 'users', uid, 'bookings'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: BookingRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          confirmationCode: String(data.confirmationCode || ''),
          movieId: String(data.movieId || ''),
          movieTitle: String(data.movieTitle || ''),
          posterUrl: String(data.posterUrl || ''),
          auditoriumName: String(data.auditoriumName || ''),
          format: (data.format as ProjectionFormat) || 'IMAX Laser',
          dateLabel: String(data.dateLabel || ''),
          time: String(data.time || ''),
          seatIds: Array.isArray(data.seatIds) ? data.seatIds.map(String) : [],
          concessions: data.concessionsSummary
            ? [{ name: String(data.concessionsSummary), quantity: 1, unitPrice: 0 }]
            : [],
          customerName: String(data.customerName || ''),
          customerEmail: String(data.customerEmail || ''),
          subtotal: Number(data.subtotal || 0),
          bookingFee: Number(data.bookingFee || 0),
          total: Number(data.total || 0),
          createdAt:
            data.createdAt && typeof data.createdAt.toDate === 'function'
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString(),
        };
      });
      onBookings(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeShowtimeReservations(
  showtimeId: string,
  onReservedSeatIds: (seatIds: string[]) => void,
): Unsubscribe {
  const path = `showtimes/${showtimeId}/reservations`;
  const q = query(
    collection(db, 'showtimes', showtimeId, 'reservations'),
    where('showtimeId', '==', showtimeId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const seatIds = snapshot.docs.map((d) => String(d.data().seatId || d.id));
      onReservedSeatIds(seatIds);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function persistBookingToFirestore(params: {
  uid: string;
  booking: BookingRecord;
  auditoriumId: string;
  showtimeId: string;
}): Promise<void> {
  const { uid, booking, auditoriumId, showtimeId } = params;
  const bookingPath = `users/${uid}/bookings/${booking.id}`;
  const batch = writeBatch(db);

  const concessionsSummary = booking.concessions
    .filter((c) => c.quantity > 0)
    .map((c) => `${c.quantity}× ${c.name}`)
    .join(', ')
    .slice(0, 400);

  const bookingRef = doc(db, 'users', uid, 'bookings', booking.id);
  batch.set(bookingRef, {
    id: booking.id,
    userId: uid,
    confirmationCode: booking.confirmationCode.slice(0, 24),
    movieId: booking.movieId.slice(0, 64),
    movieTitle: booking.movieTitle.slice(0, 120),
    posterUrl: booking.posterUrl.slice(0, 300),
    auditoriumId: auditoriumId.slice(0, 64),
    auditoriumName: booking.auditoriumName.slice(0, 100),
    format: booking.format,
    showtimeId: showtimeId.slice(0, 64),
    dateLabel: booking.dateLabel.slice(0, 40),
    time: booking.time.slice(0, 16),
    seatIds: booking.seatIds.slice(0, 8),
    concessionsSummary,
    customerName: booking.customerName.slice(0, 80),
    customerEmail: booking.customerEmail.slice(0, 120),
    subtotal: Number(booking.subtotal.toFixed(2)),
    bookingFee: Number(booking.bookingFee.toFixed(2)),
    total: Number(booking.total.toFixed(2)),
    createdAt: serverTimestamp(),
  });

  for (const seatId of booking.seatIds.slice(0, 8)) {
    const resRef = doc(db, 'showtimes', showtimeId, 'reservations', seatId);
    batch.set(resRef, {
      showtimeId,
      seatId,
      reservedBy: uid,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, bookingPath);
  }
}
