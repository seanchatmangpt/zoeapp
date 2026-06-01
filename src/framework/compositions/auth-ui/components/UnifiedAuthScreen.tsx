import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../../auth/hooks';
import { useBiometricAuth } from '../../../auth/biometric/useBiometricAuth';
import { useMfaVerification } from '../../../auth/mfa/useMfaVerification';
import { Button } from '../../../ui/Button';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

/**
 * A high-level composition that provides a unified, animated authentication interface.
 * Orchestrates:
 * - Session Management (useAuth)
 * - Passwordless Identity (useBiometricAuth)
 * - Multi-Factor Verification (useMfaVerification)
 */
export const UnifiedAuthScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { authenticate: bioAuth, isAuthenticating: isBioLoading } = useBiometricAuth();
  const { verifyMfa, isVerifying: isMfaLoading } = useMfaVerification();

  if (user) {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
        <Text style={styles.text}>Welcome back, {user.email}</Text>
        <Button label="Sign Out" onPress={signOut} variant="secondary" />
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
      <Text style={styles.title}>Secure Login</Text>
      
      <Button 
        label="Biometric Login" 
        onPress={() => bioAuth()} 
        loading={isBioLoading}
        style={styles.button}
      />
      
      <Button 
        label="Enter MFA Code" 
        onPress={() => verifyMfa('123456')} 
        loading={isMfaLoading}
        variant="secondary"
        style={styles.button}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  text: { fontSize: 16, marginBottom: 20 },
  button: { width: '100%', marginBottom: 12 },
});
