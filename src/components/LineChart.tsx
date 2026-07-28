import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

export type LineChartPoint = { label: string; value: number };

type LineChartProps = {
  data: LineChartPoint[];
  maxValue?: number;
  height?: number;
};

/** Small dependency-free line chart (react-native-svg only) — used for the IPK trend. */
export function LineChart({ data, maxValue = 4, height = 160 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Belum ada data IPK.</Text>
      </View>
    );
  }

  const width = 320;
  const paddingX = 26;
  const paddingY = 22;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x =
      paddingX + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y = paddingY + chartHeight - (Math.min(d.value, maxValue) / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={paddingX}
        y1={paddingY}
        x2={paddingX}
        y2={height - paddingY}
        stroke={colors.line}
        strokeWidth={1}
      />
      <Line
        x1={paddingX}
        y1={height - paddingY}
        x2={width - paddingX}
        y2={height - paddingY}
        stroke={colors.line}
        strokeWidth={1}
      />
      {points.length > 1 ? (
        <Polyline points={polylinePoints} fill="none" stroke={colors.royal} strokeWidth={2} />
      ) : null}
      {points.map((p) => (
        <React.Fragment key={p.label}>
          <Circle cx={p.x} cy={p.y} r={3.5} fill={colors.royal} />
          <SvgText
            x={p.x}
            y={height - paddingY + 14}
            fontSize={9}
            fill={colors.muted}
            textAnchor="middle"
          >
            {p.label}
          </SvgText>
          <SvgText
            x={p.x}
            y={p.y - 8}
            fontSize={9}
            fill={colors.navy}
            fontWeight="700"
            textAnchor="middle"
          >
            {p.value.toFixed(2)}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
  },
});
