import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const PIECE_SIZE = 82;
const PIECE_GAP = 8;
const ASSEMBLE_OFFSET = 160;
const BRAND_DELAY = 950;

// One full up+down bounce is DOT_PHASE_MS * 2; staggering each dot by exactly
// one third of that keeps all 3 dots evenly spaced in phase, so the bounce
// reads as one continuous wave instead of dots drifting in and out of sync.
const DOT_PHASE_MS = 300;
const DOT_STAGGER_MS = (DOT_PHASE_MS * 2) / 3;

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

function usePieceStyle(fromX: number, fromY: number) {
  const dx = useSharedValue(fromX);
  const dy = useSharedValue(fromY);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    dx.value = withSpring(0, { damping: 13, stiffness: 90 });
    dy.value = withSpring(0, { damping: 13, stiffness: 90 });
  }, [dx, dy, opacity]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: dx.value }, { translateY: dy.value }],
  }));
}

function useDotStyle(delay: number) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withDelay(
      BRAND_DELAY + delay,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: DOT_PHASE_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: DOT_PHASE_MS, easing: Easing.in(Easing.quad) })
        ),
        -1
      )
    );
  }, [bounce, delay]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));
}

/** The 4th puzzle piece's icon — a small pinwheel of 4 diamonds, matching the app logo mark. */
function DiamondCompass() {
  return (
    <View style={styles.compass}>
      <View style={[styles.diamond, styles.diamondTop]} />
      <View style={[styles.diamond, styles.diamondLeft]} />
      <View style={[styles.diamond, styles.diamondRight]} />
      <View style={[styles.diamond, styles.diamondBottom]} />
    </View>
  );
}

export function SplashScreen() {
  const cStyle = usePieceStyle(-ASSEMBLE_OFFSET, -ASSEMBLE_OFFSET);
  const iStyle = usePieceStyle(ASSEMBLE_OFFSET, -ASSEMBLE_OFFSET);
  const vStyle = usePieceStyle(-ASSEMBLE_OFFSET, ASSEMBLE_OFFSET);
  const miniStyle = usePieceStyle(ASSEMBLE_OFFSET, ASSEMBLE_OFFSET);

  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(10);

  useEffect(() => {
    brandOpacity.value = withDelay(BRAND_DELAY, withTiming(1, { duration: 450 }));
    brandTranslateY.value = withDelay(
      BRAND_DELAY,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) })
    );
  }, [brandOpacity, brandTranslateY]);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
  }));

  const dot1Style = useDotStyle(0);
  const dot2Style = useDotStyle(DOT_STAGGER_MS);
  const dot3Style = useDotStyle(DOT_STAGGER_MS * 2);

  return (
    <LinearGradient
      colors={['#0a4c86', '#06345c', '#04263f']}
      style={styles.container}
    >
      <View style={styles.puzzle}>
        <View style={styles.row}>
          <AnimatedGradient
            colors={['#3a0ca3', '#2e0b8c']}
            style={[styles.piece, cStyle]}
          >
            <Text style={styles.pieceTextLight}>C</Text>
          </AnimatedGradient>
          <AnimatedGradient
            colors={['#22ffff', '#00e5e5']}
            style={[styles.piece, iStyle]}
          >
            <Text style={styles.pieceTextDark}>I</Text>
          </AnimatedGradient>
        </View>
        <View style={styles.row}>
          <AnimatedGradient
            colors={['#a3a3ff', '#8c8cf5']}
            style={[styles.piece, vStyle]}
          >
            <Text style={styles.pieceTextDark}>V</Text>
          </AnimatedGradient>
          <AnimatedGradient
            colors={['#ffcc00', '#ffb700']}
            style={[styles.piece, miniStyle]}
          >
            <DiamondCompass />
          </AnimatedGradient>
        </View>
      </View>

      <Animated.View style={[styles.brand, brandStyle]}>
        <Text style={styles.brandTitle}>My CIV-Project</Text>
        <Text style={styles.brandSubtitle}>PORTAL BEASISWA PPA</Text>
      </Animated.View>

      <View style={styles.loader}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puzzle: {
    gap: PIECE_GAP,
    marginBottom: 40,
  },
  row: {
    flexDirection: 'row',
    gap: PIECE_GAP,
  },
  piece: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  pieceTextLight: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
  },
  pieceTextDark: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2e0b8c',
  },
  compass: {
    width: 46,
    height: 46,
  },
  diamond: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 5,
    transform: [{ rotate: '45deg' }],
  },
  diamondTop: {
    top: 0,
    left: 12,
    backgroundColor: '#22ffff',
  },
  diamondLeft: {
    left: 0,
    top: 12,
    backgroundColor: '#2e0b8c',
  },
  diamondRight: {
    right: 0,
    top: 12,
    backgroundColor: '#ff3b30',
  },
  diamondBottom: {
    bottom: 0,
    left: 12,
    backgroundColor: '#a3a3ff',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 50,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#aeebff',
    marginTop: 4,
    letterSpacing: 1,
  },
  loader: {
    flexDirection: 'row',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#aeebff',
  },
});
