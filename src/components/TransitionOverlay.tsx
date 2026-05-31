import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSession } from '@/context/SessionProvider';
import { useColorScheme } from '@/src/components/useColorScheme';

export function TransitionOverlay() {
  const { isTransitioning, transitionType } = useSession();
  const colorScheme = useColorScheme();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anim = Animated.timing(fadeAnim, {
      toValue: isTransitioning ? 1 : 0,
      duration: isTransitioning ? 250 : 350,
      useNativeDriver: true,
    });

    if (isTransitioning) {
      setVisible(true);
      anim.start();
    } else {
      anim.start(({ finished }) => {
        if (finished) {
          setVisible(false);
        }
      });
    }

    return () => {
      anim.stop();
    };
  }, [isTransitioning, fadeAnim]);

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
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.95)',
          zIndex: 9999,
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <View
        className={`items-center p-8 rounded-3xl shadow-2xl border ${
          isDark
            ? 'bg-slate-900 border-slate-800 shadow-black'
            : 'bg-white border-slate-100 shadow-slate-200'
        } max-w-[80%]`}
      >
        <View className={`rounded-full p-4 mb-4 ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
          <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#3b82f6'} />
        </View>
        <Text className={`text-xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {isSignIn ? 'Welcome back!' : 'Signing out...'}
        </Text>
        <Text className={`text-sm text-center leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isSignIn
            ? 'Securing session & preparing your workspace'
            : 'Clearing session cache & returning to login'}
        </Text>
      </View>
    </Animated.View>
  );
}
