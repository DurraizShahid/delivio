'use strict';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ray-casting algorithm: checks if a point (lat, lon) is inside a GeoJSON Polygon.
 * GeoJSON coordinates are [lng, lat] order.
 * @param {number} lat
 * @param {number} lon
 * @param {object} geojson - { type: "Polygon", coordinates: [[[lng, lat], ...]] }
 * @returns {boolean}
 */
function pointInPolygon(lat, lon, geojson) {
  if (!geojson?.coordinates?.[0]) return false;
  const ring = geojson.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1], yi = ring[i][0];
    const xj = ring[j][1], yj = ring[j][0];
    const intersect = ((yi > lon) !== (yj > lon)) &&
      (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if two GeoJSON Polygons share any area.
 * Uses vertex-in-polygon checks and edge intersection tests.
 */
function polygonsIntersect(poly1, poly2) {
  if (!poly1?.coordinates?.[0] || !poly2?.coordinates?.[0]) return false;
  const ring1 = poly1.coordinates[0];
  const ring2 = poly2.coordinates[0];

  for (const pt of ring1) {
    if (pointInPolygon(pt[1], pt[0], poly2)) return true;
  }
  for (const pt of ring2) {
    if (pointInPolygon(pt[1], pt[0], poly1)) return true;
  }

  for (let i = 0; i < ring1.length - 1; i++) {
    for (let j = 0; j < ring2.length - 1; j++) {
      if (segmentsIntersect(
        ring1[i][0], ring1[i][1], ring1[i + 1][0], ring1[i + 1][1],
        ring2[j][0], ring2[j][1], ring2[j + 1][0], ring2[j + 1][1]
      )) return true;
    }
  }

  return false;
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = direction(x3, y3, x4, y4, x1, y1);
  const d2 = direction(x3, y3, x4, y4, x2, y2);
  const d3 = direction(x1, y1, x2, y2, x3, y3);
  const d4 = direction(x1, y1, x2, y2, x4, y4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) return true;
  if (d2 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) return true;
  if (d3 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) return true;
  if (d4 === 0 && onSegment(x1, y1, x2, y2, x4, y4)) return true;
  return false;
}

function direction(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSegment(ax, ay, bx, by, cx, cy) {
  return Math.min(ax, bx) <= cx && cx <= Math.max(ax, bx) &&
         Math.min(ay, by) <= cy && cy <= Math.max(ay, by);
}

/**
 * Generate a GeoJSON Polygon approximating a circle.
 * Used as fallback when a shop has delivery_radius_km but no drawn geofence.
 */
function circleToPolygon(lat, lon, radiusKm, numPoints = 32) {
  const coords = [];
  const R = 6371;
  for (let i = 0; i <= numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const dLat = (radiusKm / R) * Math.cos(angle);
    const dLon = (radiusKm / R) * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    coords.push([
      lon + dLon * (180 / Math.PI),
      lat + dLat * (180 / Math.PI),
    ]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

/**
 * Get the effective geofence for a shop.
 * Returns the drawn geofence if set, otherwise generates a circle from delivery_radius_km.
 */
function getEffectiveGeofence(shop, vendorSettings) {
  if (shop.delivery_geofence?.coordinates?.[0]?.length > 2) {
    return shop.delivery_geofence;
  }
  if (shop.lat && shop.lon) {
    const radius = vendorSettings?.delivery_radius_km || 5.0;
    return circleToPolygon(Number(shop.lat), Number(shop.lon), radius);
  }
  return null;
}

module.exports = {
  haversineKm,
  pointInPolygon,
  polygonsIntersect,
  circleToPolygon,
  getEffectiveGeofence,
};
