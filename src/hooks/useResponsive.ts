import { useWindowDimensions } from 'react-native';

export const TABLET_BREAKPOINT = 768;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isTablet: width >= TABLET_BREAKPOINT,
    isLandscape: width > height,
  };
}
