import React from 'react';
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation 
} from 'react-native-reanimated';
import { GlassCard } from '../../ui/glassmorphism/GlassCard';
import { useHolographicContext } from './HolographicContainer';
import { HolographicGlassCardProps } from './types';
import { cn } from '../../../utils/cn';
import { useBci } from '../../v30/bci-ux/BciBoundary';

/**
 * HolographicGlassCard (Glassmorphism v2)
 * 
 * An advanced UI primitive that enhances standard glassmorphism with simulated 3D depth
 * using device motion data. It creates a parallax effect for content and a dynamic
 * light sheen (glare) that reacts to the device's physical orientation.
 * 
 * Integration:
 * - Inherits from `ui/glassmorphism`
 * - Utilizes `xr/spatial` concepts for depth simulation
 * - Integrates with BCI-UX Cognitive Parity to scale down motion and density during high stress
 */
export const HolographicGlassCard: React.FC<HolographicGlassCardProps> = ({
  children,
  parallaxIntensity = 15,
  glareIntensity = 0.6,
  inverted = false,
  className,
  style,
  ...props
}) => {
  const sensor = useHolographicContext();
  const bci = useBci();

  // Use adjusted parallaxIntensity if BCI is active
  const activeParallaxIntensity = bci ? bci.parallaxIntensity : parallaxIntensity;

  // Adjust layout density (padding) dynamically based on BCI cognitive load state
  const densityStyle = bci
    ? {
        padding: bci.layoutDensity === 'spacious' ? 24 : bci.layoutDensity === 'comfortable' ? 16 : 8,
      }
    : {};

  const animatedStyle = useAnimatedStyle(() => {
    if (!sensor) return {};

    const { roll, pitch } = sensor.sensor.value;
    
    // Calculate parallax movement using the BCI-adjusted or default intensity
    const translateX = interpolate(
      roll,
      [-Math.PI / 4, Math.PI / 4],
      [activeParallaxIntensity, -activeParallaxIntensity],
      Extrapolation.CLAMP
    );
    
    const translateY = interpolate(
      pitch,
      [-Math.PI / 4, Math.PI / 4],
      [activeParallaxIntensity, -activeParallaxIntensity],
      Extrapolation.CLAMP
    );

    // Apply inversion if requested
    const multiplier = inverted ? -1 : 1;

    return {
      transform: [
        { translateX: translateX * multiplier },
        { translateY: translateY * multiplier },
        // Subtle tilt for extra depth
        { rotateX: `${pitch * 0.1}rad` },
        { rotateY: `${roll * 0.1}rad` },
      ],
    };
  });

  const glareStyle = useAnimatedStyle(() => {
    if (!sensor) return { opacity: 0 };

    const { roll, pitch } = sensor.sensor.value;
    
    // Calculate glare position and opacity
    const glareOpacity = interpolate(
      Math.abs(roll) + Math.abs(pitch),
      [0, Math.PI / 2],
      [0.1, glareIntensity],
      Extrapolation.CLAMP
    );

    const glareTranslateX = interpolate(
      roll,
      [-Math.PI / 2, Math.PI / 2],
      [-100, 100],
      Extrapolation.CLAMP
    );

    return {
      opacity: glareOpacity,
      transform: [
        { translateX: glareTranslateX },
        { skewX: '20deg' },
      ],
    };
  });

  return (
    <GlassCard
      className={cn('relative overflow-hidden', className)}
      style={[densityStyle, style]}
      {...props}
    >
      {/* Dynamic Glare Layer */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: '25%',
            width: '50%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
          glareStyle,
        ]}
        pointerEvents="none"
      />
      
      {/* Parallax Content Layer */}
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {children}
      </Animated.View>
    </GlassCard>
  );
};

HolographicGlassCard.displayName = 'HolographicGlassCard';
