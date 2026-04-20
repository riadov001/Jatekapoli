import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  color: string;
  height?: number;
  position?: "top" | "bottom";
};

/**
 * Torn-paper edge effect drawn as an SVG path.
 *
 * Generates an irregular zigzag/wavy line at the top or bottom of a colored
 * area to make a header look like it has been torn from paper. The path is
 * deterministic (no per-render randomness) so the layout is stable.
 *
 * Usage:
 *   <View style={{ backgroundColor: "pink" }}>
 *     ...header content...
 *     <TornEdge color="pink" position="bottom" />
 *   </View>
 */
export function TornEdge({ color, height = 18, position = "bottom" }: Props) {
  // Pre-computed irregular bumps (x%, y) — tuned to read as "torn".
  // y in [0, height]. Not perfectly symmetric — that's the point.
  const bumps = [
    [0, 0.3],
    [0.06, 0.95],
    [0.12, 0.4],
    [0.19, 1.0],
    [0.26, 0.55],
    [0.34, 0.15],
    [0.42, 0.85],
    [0.5, 0.35],
    [0.58, 0.95],
    [0.66, 0.45],
    [0.74, 0.85],
    [0.82, 0.2],
    [0.9, 0.7],
    [0.96, 0.4],
    [1.0, 0.85],
  ];

  // We work in viewBox units 0..100 horizontally so the path scales fluidly.
  const w = 100;
  const points = bumps.map(([x, y]) => [x * w, y * height]);

  // Build a clean polygon: trace the torn edge left-to-right, then close back
  // along the opposite (flat) edge. The previous version started at (0,0)
  // then jumped to the first bump (also at x=0) which produced a degenerate
  // crossing path.
  let d: string;
  if (position === "bottom") {
    // Top is flat at y=0, bottom is the torn zigzag.
    const torn = points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    d = `${torn} L${w},0 L0,0 Z`;
  } else {
    // Bottom is flat at y=height, top is the torn zigzag (mirrored).
    const torn = points
      .map(([x, y], i) =>
        `${i === 0 ? "M" : "L"}${x.toFixed(2)},${(height - y).toFixed(2)}`,
      )
      .join(" ");
    d = `${torn} L${w},${height} L0,${height} Z`;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        position === "bottom" ? { bottom: -height + 1 } : { top: -height + 1 },
        { height },
      ]}
    >
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
      >
        <Path d={d} fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0 },
});
