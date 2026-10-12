import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const MARK = require('@/assets/images/scramble-mark.png');
const WORDMARK = require('@/assets/images/scramble-wordmark.png');

const MARK_ASPECT = 607 / 452;
const WORDMARK_ASPECT = 166 / 825;
const YOLK_POSITION = { x: 0.69, y: 0.22 };

export const INTRO_BACKGROUND = '#FDF9ED';
const BACON = '#C4553A';
const BACON_FAT = '#F2B48A';
const YOLK = '#FBBF2E';
const STEAM = 'rgba(120, 88, 60, 0.22)';

const DROPLETS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const distance = 110 + (i % 3) * 28;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: 6 + (i % 4) * 3,
    color: [BACON, YOLK, BACON_FAT][i % 3],
  };
});

const WISPS = [
  { offsetX: -14, delay: 0, sway: 7 },
  { offsetX: 4, delay: 180, sway: -6 },
  { offsetX: 20, delay: 360, sway: 5 },
];

type Props = {
  onReady?: () => void;
  onFinish: () => void;
};

export function Intro({ onReady, onFinish }: Props) {
  const { width, height } = useWindowDimensions();
  const markWidth = Math.min(width * 0.42, 200);
  const markHeight = markWidth * MARK_ASPECT;
  const wordWidth = Math.min(width * 0.62, 300);
  const wordHeight = wordWidth * WORDMARK_ASPECT;

  const [drop] = useState(() => new Animated.Value(0));
  const [squash] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  const [steam] = useState(() => WISPS.map(() => new Animated.Value(0)));
  const [reveal] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));
  const exiting = useRef(false);

  const leave = () => {
    if (exiting.current) return;
    exiting.current = true;
    Animated.timing(exit, {
      toValue: 1,
      duration: 450,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onFinish());
  };

  useEffect(() => {
    let cancelled = false;
    let sequence: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      onReady?.();

      if (reduceMotion) {
        drop.setValue(1);
        reveal.setValue(1);
        sequence = Animated.delay(900);
      } else {
        const landing = Animated.parallel([
          Animated.sequence([
            Animated.timing(squash, {
              toValue: 1,
              duration: 90,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.spring(squash, {
              toValue: 0,
              friction: 3,
              tension: 160,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(burst, {
            toValue: 1,
            duration: 750,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.stagger(
            180,
            steam.map((value) =>
              Animated.timing(value, {
                toValue: 1,
                duration: 1300,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ),
          ),
          Animated.sequence([
            Animated.delay(160),
            Animated.timing(reveal, {
              toValue: 1,
              duration: 650,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]);

        sequence = Animated.sequence([
          Animated.timing(drop, {
            toValue: 1,
            duration: 620,
            easing: Easing.bezier(0.55, 0, 0.8, 0.2),
            useNativeDriver: true,
          }),
          landing,
          Animated.delay(250),
        ]);
      }

      sequence.start(({ finished }) => {
        if (finished && !cancelled) leave();
      });
    });

    return () => {
      cancelled = true;
      sequence?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markTransform = [
    {
      translateY: drop.interpolate({
        inputRange: [0, 1],
        outputRange: [-height * 0.6, 0],
      }),
    },
    {
      rotate: drop.interpolate({
        inputRange: [0, 1],
        outputRange: ['-320deg', '0deg'],
      }),
    },
    { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
    { scaleX: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
    { scaleY: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
  ];

  const yolkX = (YOLK_POSITION.x - 0.5) * markWidth;
  const yolkY = (YOLK_POSITION.y - 0.5) * markHeight;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
        },
      ]}>
      <Pressable style={styles.center} onPress={leave} accessibilityLabel="Skip intro">
        <View style={{ width: markWidth, height: markHeight }}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                width: markWidth,
                height: markWidth,
                borderRadius: markWidth / 2,
                top: (markHeight - markWidth) / 2,
                opacity: burst.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.5, 0] }),
                transform: [
                  { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) },
                ],
              },
            ]}
          />

          {DROPLETS.map((droplet, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.droplet,
                {
                  width: droplet.size,
                  height: droplet.size,
                  borderRadius: droplet.size / 2,
                  backgroundColor: droplet.color,
                  left: markWidth / 2 - droplet.size / 2,
                  top: markHeight / 2 - droplet.size / 2,
                  opacity: burst.interpolate({
                    inputRange: [0, 0.05, 0.6, 1],
                    outputRange: [0, 1, 0.8, 0],
                  }),
                  transform: [
                    {
                      translateX: burst.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, droplet.x],
                      }),
                    },
                    {
                      translateY: burst.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, droplet.y],
                      }),
                    },
                    { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
                  ],
                },
              ]}
            />
          ))}

          <Animated.Image
            source={MARK}
            style={{ width: markWidth, height: markHeight, transform: markTransform }}
            resizeMode="contain"
          />

          {WISPS.map((wisp, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.wisp,
                {
                  left: markWidth / 2 + yolkX + wisp.offsetX - 3,
                  top: markHeight / 2 + yolkY - markWidth * 0.32,
                  opacity: steam[i].interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: steam[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -70],
                      }),
                    },
                    {
                      translateX: steam[i].interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, wisp.sway, -wisp.sway / 2],
                      }),
                    },
                    {
                      scaleY: steam[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1.4],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <View style={[styles.wordmarkClip, { width: wordWidth, height: wordHeight }]}>
          <Animated.Image
            source={WORDMARK}
            style={{
              width: wordWidth,
              height: wordHeight,
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [wordHeight * 0.35, 0],
                  }),
                },
              ],
            }}
            resizeMode="contain"
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cover,
              {
                transform: [
                  {
                    translateX: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, wordWidth + 6],
                    }),
                  },
                ],
              },
            ]}>
            <Animated.View
              style={[
                styles.sizzleEdge,
                {
                  opacity: reveal.interpolate({
                    inputRange: [0, 0.02, 0.95, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                },
              ]}
            />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: INTRO_BACKGROUND,
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  ring: {
    position: 'absolute',
    left: 0,
    borderWidth: 3,
    borderColor: BACON_FAT,
  },
  droplet: {
    position: 'absolute',
  },
  wisp: {
    position: 'absolute',
    width: 6,
    height: 34,
    borderRadius: 3,
    backgroundColor: STEAM,
  },
  wordmarkClip: {
    overflow: 'hidden',
  },
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: INTRO_BACKGROUND,
  },
  sizzleEdge: {
    position: 'absolute',
    left: 0,
    top: '15%',
    bottom: '15%',
    width: 4,
    borderRadius: 2,
    backgroundColor: YOLK,
  },
});
