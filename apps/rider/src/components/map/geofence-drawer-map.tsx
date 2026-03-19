"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GeoPolygon } from "@delivio/types";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

const DEFAULT_CENTER: [number, number] = [51.5074, -0.1278];
const DEFAULT_ZOOM = 13;

interface GeofenceDrawerMapProps {
  geofence?: GeoPolygon | null;
  onGeofenceChange?: (geofence: GeoPolygon | null) => void;
  height?: string;
}

export default function GeofenceDrawerMap({
  geofence,
  onGeofenceChange,
  height = "500px",
}: GeofenceDrawerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    let center: [number, number] = DEFAULT_CENTER;
    if (geofence?.coordinates?.[0]?.length > 2) {
      const lats = geofence.coordinates[0].map((c) => c[1]);
      const lngs = geofence.coordinates[0].map((c) => c[0]);
      center = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ];
    }

    const map = L.map(containerRef.current).setView(center, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    if (geofence?.coordinates?.[0]?.length > 2) {
      const latlngs = geofence.coordinates[0].map(
        (coord) => [coord[1], coord[0]] as [number, number]
      );
      const polygon = L.polygon(latlngs, {
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.15,
        weight: 2,
      });
      drawnItems.addLayer(polygon);
    }

    const drawControl = new (L.Control as any).Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: "#10b981",
            fillColor: "#10b981",
            fillOpacity: 0.15,
            weight: 2,
          },
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        rectangle: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e: any) => {
      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);
      const coords = layer
        .getLatLngs()[0]
        .map((ll: L.LatLng) => [ll.lng, ll.lat]);
      coords.push(coords[0]);
      onGeofenceChange?.({ type: "Polygon", coordinates: [coords] });
    });

    map.on(L.Draw.Event.EDITED, () => {
      const layers = drawnItems.getLayers();
      if (layers.length === 0) {
        onGeofenceChange?.(null);
        return;
      }
      const layer = layers[0] as L.Polygon;
      const coords = (layer.getLatLngs()[0] as L.LatLng[]).map((ll) => [
        ll.lng,
        ll.lat,
      ]);
      coords.push(coords[0]);
      onGeofenceChange?.({ type: "Polygon", coordinates: [coords] });
    });

    map.on(L.Draw.Event.DELETED, () => {
      onGeofenceChange?.(null);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!geofence?.coordinates?.[0]?.length) {
            map.setView([pos.coords.latitude, pos.coords.longitude], DEFAULT_ZOOM);
          }
        },
        () => {}
      );
    }

    mapRef.current = map;
    drawnItemsRef.current = drawnItems;
    setReady(true);
  }, []);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        drawnItemsRef.current = null;
      }
    };
  }, [initMap]);

  return (
    <div className="rounded-xl overflow-hidden border border-border/60">
      <div ref={containerRef} style={{ height, width: "100%" }} />
      {!ready && (
        <div
          className="flex items-center justify-center bg-muted text-muted-foreground text-sm"
          style={{ height }}
        >
          Loading map...
        </div>
      )}
    </div>
  );
}
