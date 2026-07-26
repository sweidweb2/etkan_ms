"use client";

import SplashCursor from "@/components/SplashCursor";

export function PublicSplashCursor() {
  return (
    <SplashCursor
      DENSITY_DISSIPATION={3.5}
      VELOCITY_DISSIPATION={2}
      PRESSURE={0.1}
      CURL={3}
      SPLAT_RADIUS={0.2}
      SPLAT_FORCE={6000}
      COLOR_UPDATE_SPEED={10}
      SHADING
      RAINBOW_MODE={false}
      COLOR="#2A2A52"
    />
  );
}
