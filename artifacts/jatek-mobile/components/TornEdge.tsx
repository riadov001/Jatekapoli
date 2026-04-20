import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  color: string;
  height?: number;
  position?: "top" | "bottom";
};

/**
 * Sharp zigzag edge with irregular (pseudo-random but deterministic) angles.
 * Each tooth has its own width and depth so the line never feels mechanical.
 */
export function TornEdge({ color, height = 22, position = "bottom" }: Props) {
  // Deterministic "random" zigzag teeth.
  // Each entry = [x in 0..1, y in 0..1] alternating peak (low y) / valley (high y).
  // Hand-tuned to look like a torn comic-book edge: sharp angles, varied spacing.
  const teeth: Array<[number, number]> = [
    [0.0, 0.15],
    [0.045, 1.0],
    [0.09, 0.05],
    [0.155, 0.92],
    [0.21, 0.25],
    [0.27, 1.0],
    [0.33, 0.0],
    [0.385, 0.85],
    [0.44, 0.2],
    [0.5, 1.0],
    [0.555, 0.1],
    [0.61, 0.95],
    [0.665, 0.3],
    [0.725, 1.0],
    [0.78, 0.05],
    [0.835, 0.9],
    [0.89, 0.2],
    [0.945, 1.0],
    [1.0, 0.15],
  ];

  const W = 100;
  const pts = teeth.map(([x, y]) => [x * W, y * height] as [number, number]);

  let d: string;
  if (position === "bottom") {
    // Top is flat at y=0; bottom is the sharp zigzag.
    const zig = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    d = `${zig} L${W},0 L0,0 Z`;
  } else {
    // Bottom is flat at y=height; top is mirrored zigzag.
    const zig = pts
      .map(([x, y], i) =>
        `${i === 0 ? "M" : "L"}${x.toFixed(2)},${(height - y).toFixed(2)}`,
      )
      .join(" ");
    d = `${zig} L${W},${height} L0,${height} Z`;
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
        viewBox={`0 0 ${W} ${height}`}
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
