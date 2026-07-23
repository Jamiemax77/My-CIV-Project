export const colors = {
  navy: '#06345c',
  navy2: '#0a2a47',
  steel: '#5e8bb0',
  blue: '#0e5fa4',
  royal: '#1f49f5', // warna aksi utama (tombol primary)
  sky: '#aeebff',
  skySoft: '#e6f7ff',
  accent: '#00c48c', // sukses / positif
  danger: '#ff5a5f',
  warning: '#ffb020',
  bg: '#eef3f8', // background layar
  card: '#ffffff',
  text: '#0c2233',
  muted: '#7a8ca0',
  line: '#dde6ef', // border
} as const;

export const badge = {
  pending: { bg: '#fff3dc', fg: '#b4790a' }, // "Menunggu"
  approved: { bg: '#dbf8ee', fg: '#02875d' }, // "Disetujui/Terverifikasi/Aktif"
  rejected: { bg: '#ffe3e4', fg: '#c23a3f' }, // "Ditolak"
} as const;

export const radius = { sm: 10, md: 12, lg: 14, xl: 18, pill: 20 } as const;
export const spacing = { xs: 6, sm: 8, md: 12, lg: 16, xl: 22 } as const;

export const gradients = {
  splash: ['#0a4c86', '#06345c', '#04263f'] as const,
  navyBlue: [colors.navy, colors.blue] as const,
  royalPurple: [colors.royal, '#7b3ff2'] as const,
};

export type BadgeStatus = keyof typeof badge;

export const fontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
} as const;
