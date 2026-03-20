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
  lat?: number | null;
  lon?: number | null;
  geofence?: GeoPolygon | null;
  onLocationChange?: (lat: number, lon: number) => void;
  onGeofenceChange?: (geofence: GeoPolygon | null) => void;
  height?: string;
}

export default function GeofenceDrawerMap({
  lat,
  lon,
  geofence,
  onLocationChange,
  onGeofenceChange,
  height = "400px",
}: GeofenceDrawerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = lat && lon ? [lat, lon] : DEFAULT_CENTER;
    const map = L.map(containerRef.current).setView(center, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    if (lat && lon) {
      const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onLocationChange?.(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    const geofenceRing = geofence?.coordinates?.[0];
    if (geofenceRing && geofenceRing.length > 2) {
      const latlngs = geofenceRing.map(
        (coord) => [coord[1], coord[0]] as [number, number]
      );
      const polygon = L.polygon(latlngs, {
        color: "#6366f1",
        fillColor: "#6366f1",
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
            color: "#6366f1",
            fillColor: "#6366f1",
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

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], {
          draggable: true,
        }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onLocationChange?.(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
      onLocationChange?.(clickLat, clickLng);
    });

    mapRef.current = map;
    drawnItemsRef.current = drawnItems;
    setReady(true);
  }, []);

  useEffect(() => {
    const fixIcons = () => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    };
    fixIcons();
    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
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
