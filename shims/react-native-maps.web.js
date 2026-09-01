// Web stub for react-native-maps (native-only lib). Keeps the web bundle
// building; the map screen renders its own web fallback instead.
import React from "react";
import { View } from "react-native";

const Noop = React.forwardRef((props, ref) =>
  React.createElement(View, { ref, ...props }),
);
Noop.displayName = "MapStubNoop";

export const Marker = Noop;
export const Callout = Noop;
export const Circle = Noop;
export const Polygon = Noop;
export const Polyline = Noop;
export const Overlay = Noop;
export const Heatmap = Noop;
export const Geojson = Noop;
export const PROVIDER_GOOGLE = "google";
export const PROVIDER_DEFAULT = undefined;

const MapView = Noop;
export default MapView;
