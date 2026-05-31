import React, { useEffect, useState } from 'react';
import { Animated, View, Text, ActivityIndicator, StyleSheet, Easing } from 'react-native';
import { useSession } from '@/context/SessionProvider';
import { useColorScheme } from '@/src/components/useColorScheme';

export function TransitionOverlay() {
  const { isTransitioning, transitionType } = useSession();
  const colorScheme = useColorScheme();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.95));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fade = Animated.timing(fadeAnim, {
      toValue: isTransitioning ? 1 : 0,
      duration: isTransitioning ? 300 : 350,
      easing: isTransitioning ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
      useNativeDriver: true,
    });

    const scale = Animated.spring(scaleAnim, {
      toValue: isTransitioning ? 1 : 0.95,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    });

    if (isTransitioning) {
      setVisible(true);
      Animated.parallel([fade, scale]).start();
    } else {
      Animated.parallel([fade, scale]).start(({ finished }) => {
        if (finished) {
          setVisible(false);
        }
      });
    }

    return () => {
      fade.stop();
      scale.stop();
    };
  }, [isTransitioning, fadeAnim, scaleAnim]);

  if (!visible) return null;

  const isSignIn = transitionType === 'signin';
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      pointerEvents={isTransitioning ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: fadeAnim,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.85)',
          zIndex: 9999,
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          width: '100%',
          alignItems: 'center',
        }}
      >
        <View
          className={`items-center p-8 rounded-3xl shadow-2xl border ${
            isDark
              ? 'bg-slate-900 border-slate-700 shadow-slate-900'
              : 'bg-white border-slate-200 shadow-slate-300'
          } w-[85%] max-w-[400px]`}
        >
          <View className={`rounded-full p-5 mb-5 ${isDark ? 'bg-slate-800' : 'bg-blue-50'} shadow-sm`}>
            <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#3b82f6'} />
          </View>
          <Text className={`text-2xl font-bold mb-3 text-center tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {isSignIn ? 'Welcome back!' : 'Signing out...'}
          </Text>
          <Text className={`text-base text-center leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isSignIn
              ? 'Securing session & preparing your workspace'
              : 'Clearing session cache & returning to login'}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
