# Lumière Cinema Firestore Security Specification

## 1. Data Invariants
1. **User Profile Ownership & PII Protection**: `/users/{userId}` documents contain user email and preferences. Only the authenticated owner with a verified email (`request.auth.uid == userId && request.auth.token.email_verified == true`) may read, create, or update their own profile. Listing `/users` is strictly forbidden.
2. **Booking Ownership & Immutability**: `/users/{userId}/bookings/{bookingId}` records belong strictly to `userId`, require the parent `/users/{userId}` document to exist, enforce `userId == request.auth.uid`, enforce server timestamp `createdAt == request.time`, and are immutable after creation (`update` and `delete` denied).
3. **Seat Reservation Integrity**: `/showtimes/{showtimeId}/reservations/{seatId}` stores only non-PII occupancy markers (`showtimeId`, `seatId`, `reservedBy`, `createdAt`). Seat availability is publicly readable so guests can inspect the 3D auditorium, while creating a lock requires a verified authenticated user setting `reservedBy == request.auth.uid` and cannot overwrite or delete existing locks.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. Unauthenticated read of `/users/u1` -> `PERMISSION_DENIED`
2. Authenticated user `u2` reading `/users/u1` -> `PERMISSION_DENIED`
3. Unverified email user creating `/users/u1` -> `PERMISSION_DENIED`
4. User `u1` creating `/users/u1` with shadow field `isAdmin: true` -> `PERMISSION_DENIED`
5. User `u1` creating `/users/u1` with forged `uid: "u2"` -> `PERMISSION_DENIED`
6. User `u1` updating `/users/u1` to mutate `createdAt` or `uid` -> `PERMISSION_DENIED`
7. User `u1` injecting 25 items into `favoriteMovieIds` (exceeds max 20) -> `PERMISSION_DENIED`
8. User `u1` listing `/users` collection -> `PERMISSION_DENIED`
9. User `u2` listing `/users/u1/bookings` -> `PERMISSION_DENIED`
10. User `u1` creating booking with client-forged `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`
11. User `u1` updating or deleting `/users/u1/bookings/b1` -> `PERMISSION_DENIED`
12. User `u1` creating `/showtimes/st1/reservations/E-07` with invalid seatId `"bad!!"` or `reservedBy: "u2"` -> `PERMISSION_DENIED`
