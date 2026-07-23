import React from 'react';
import { Image } from 'react-native';

const EWALLET_LOGOS: Record<string, ReturnType<typeof require>> = {
  GoPay: require('../../assets/ewallet/gopay.png'),
  DANA: require('../../assets/ewallet/dana.png'),
  OVO: require('../../assets/ewallet/ovo.png'),
};

const BANK_LOGOS: Array<{ match: RegExp; source: ReturnType<typeof require> }> = [
  { match: /bri/i, source: require('../../assets/bank/bri.png') },
  { match: /mandiri/i, source: require('../../assets/bank/mandiri.png') },
  { match: /cimb/i, source: require('../../assets/bank/cimbniaga.png') },
  { match: /bca/i, source: require('../../assets/bank/bca.png') },
];

type LogoBadgeProps = {
  provider: string;
  width?: number;
  height?: number;
};

export function EwalletLogoBadge({ provider, width = 120, height = 49 }: LogoBadgeProps) {
  const source = EWALLET_LOGOS[provider];
  if (!source) return null;
  return <Image source={source} style={{ width, height }} resizeMode="contain" />;
}

/** Matches free-typed bank names (e.g. "Bank BRI", "bri") against known logo assets. */
export function BankLogoBadge({ provider, width = 120, height = 49 }: LogoBadgeProps) {
  const found = BANK_LOGOS.find((b) => b.match.test(provider));
  if (!found) return null;
  return <Image source={found.source} style={{ width, height }} resizeMode="contain" />;
}
