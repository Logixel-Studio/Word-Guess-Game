/**
 * GPS utility functions for attendance radius validation
 */

/**
 * Calculate distance in meters between two GPS coordinates (Haversine formula)
 */
export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find which office location (if any) the employee is within radius of
 */
export function findAllowedLocation(lat, lng, officeLocations) {
  if (!lat || !lng || !officeLocations?.length) return null;
  for (const loc of officeLocations) {
    if (!loc.latitude || !loc.longitude) continue;
    const dist = getDistanceMeters(lat, lng, loc.latitude, loc.longitude);
    if (dist <= (loc.radius_meters || 200)) {
      return { location: loc, distance: Math.round(dist) };
    }
  }
  return null;
}

/**
 * Check if employee is late based on shift start + grace period
 * Returns { isLate, lateMinutes }
 */
export function checkLateStatus(checkInTime, shiftStart, gracePeriodMinutes = 15) {
  if (!checkInTime || !shiftStart) return { isLate: false, lateMinutes: 0 };
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [shiftH, shiftM] = shiftStart.split(':').map(Number);
  const checkInMins = inH * 60 + inM;
  const shiftMins = shiftH * 60 + shiftM + gracePeriodMinutes;
  const lateMinutes = checkInMins - shiftMins;
  return { isLate: lateMinutes > 0, lateMinutes: Math.max(0, lateMinutes) };
}

/**
 * Calculate working hours between check-in and check-out times
 */
export function calcWorkingHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  return Math.max(0, ((outH * 60 + outM) - (inH * 60 + inM)) / 60);
}

/**
 * Calculate overtime hours (hours beyond shift end)
 */
export function calcOvertimeHours(checkOut, shiftEnd) {
  if (!checkOut || !shiftEnd) return 0;
  const [outH, outM] = checkOut.split(':').map(Number);
  const [endH, endM] = shiftEnd.split(':').map(Number);
  const overtime = ((outH * 60 + outM) - (endH * 60 + endM)) / 60;
  return Math.max(0, overtime);
}