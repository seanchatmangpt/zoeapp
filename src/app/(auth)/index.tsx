/**
 * @fileoverview Authentication Avatar-Relative Projection
 * Provides user authentication functionality including sign in and sign up flows.
 * Features form validation, loading states, and seamless toggle between auth modes.
 *
 * @author Your Name
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { Stack } from '@/src/components/AvatarRelativeProjection';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Authentication component with sign in and sign up functionality
 * Provides a professional card-based layout with form validation
 *
 * @component
 * @returns {JSX.Element} The authentication Avatar-Relative Projection
 *
 * @example
 * // Used in Expo Router for unauthenticated users
 * <Auth />
 */
export default function Auth() {
  /** User's email address */
  const [email, setEmail] = useState('');

  /** User's password */
  const [password, setPassword] = useState('');

  /** Loading state during authentication */
  const [loading, setLoading] = useState(false);

  /** Toggle between sign in and sign up modes */
  const [isSignUp, setIsSignUp] = useState(false);

  /** Password visibility toggle state */
  const [showPassword, setShowPassword] = useState(false);

  // Focus states
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Error/Success Notification Banner state
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Animations (using useState to prevent accessing ref during render)
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const [bannerOpacity] = useState(() => new Animated.Value(0));
  const [bannerScale] = useState(() => new Animated.Value(0.95));

  // Requirements checklist helpers
  const isValidEmail = /\S+@\S+\.\S+/.test(email);
  const isMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasSpecialOrUpper = /[^a-z0-9]/i.test(password) || /[A-Z]/.test(password);

  // Button micro-interaction: scale down on press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Button micro-interaction: rotate spinner when loading
  useEffect(() => {
    let animation: any = null;
    if (loading) {
      rotateAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      rotateAnim.setValue(0);
    }
    return () => {
      if (animation) {
        (animation as any).stop();
      }
    };
  }, [loading, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Banner animations: fade in/out and scale up/down
  useEffect(() => {
    if (banner) {
      Animated.parallel([
        Animated.timing(bannerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(bannerScale, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bannerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bannerScale, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [banner, bannerOpacity, bannerScale]);

  /**
   * Handles user sign in with email and password
   * Validates input fields and manages loading state
   *
   * @async
   * @function signInWithEmail
   * @throws {Error} When authentication fails
   */
  async function signInWithEmail() {
    console.log('[Auth Debug] signInWithEmail called with:', { email, password });
    if (!email || !password) {
      setBanner({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setBanner(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[Auth Debug] signInWithPassword result:', { data, error });
      if (error) {
        setBanner({ type: 'error', message: error.message });
      }
    } catch (e: any) {
      console.error('[Auth Debug] Unexpected error during sign in:', e);
      setBanner({ type: 'error', message: e?.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles user sign up with email and password
   * Validates input fields including password length requirements
   *
   * @async
   * @function signUpWithEmail
   * @throws {Error} When sign up fails or validation errors occur
   */
  async function signUpWithEmail() {
    if (!email || !password) {
      setBanner({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    if (!isValidEmail) {
      setBanner({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    if (password.length < 6) {
      setBanner({ type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }

    if (!hasNumber) {
      setBanner({ type: 'error', message: 'Password must contain at least one number' });
      return;
    }

    if (!hasSpecialOrUpper) {
      setBanner({ type: 'error', message: 'Password must contain an uppercase or special character' });
      return;
    }

    setLoading(true);
    setBanner(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setBanner({ type: 'error', message: error.message });
      } else {
        setBanner({
          type: 'success',
          message: 'Verification link sent! Check your email.',
        });
      }
    } catch (e: any) {
      console.error('[Auth Debug] Unexpected error during sign up:', e);
      setBanner({ type: 'error', message: e?.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setBanner(null);
  };

  return (
    <KeyboardAvoidingView
      testID="keyboard-avoiding-view"
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.AvatarRelativeProjection options={{ title: 'Welcome' }} />

        {/* Outer view container to structure spacing professionally */}
        <View className="flex-1 justify-center px-6 py-12">
          {/* Professional Brand Header Section */}
          <View className="items-center mb-10 mt-4">
            <View className="relative w-24 h-24 items-center justify-center mb-5">
              <View className="absolute inset-0 border-[3px] border-indigo-100 rounded-full opacity-70" />
              <View className="absolute inset-2 border-2 border-dashed border-indigo-300 rounded-full opacity-60" />
              <View className="absolute inset-4 bg-indigo-600 rounded-full items-center justify-center shadow-lg shadow-indigo-200">
                <Feather name="shield" size={32} color="#ffffff" />
              </View>
            </View>
            <Text className="text-4xl font-extrabold text-slate-900 tracking-tight text-center">
              TRUEX
            </Text>
            <Text className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mt-1.5 text-center">
              Secure Gateway
            </Text>
            <Text className="text-slate-500 text-sm mt-4 text-center max-w-[280px] leading-relaxed">
              {isSignUp
                ? 'Create a secure account to register this node on the network'
                : 'Enter your credentials to synchronize with the secure membrane'}
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-[32px] shadow-xl shadow-slate-200/40 border border-slate-100 p-8 mb-8">
            <Text className="text-2xl font-bold text-slate-900 mb-8 text-center">
              {isSignUp ? 'Create Node Account' : 'Sign In to Node'}
            </Text>

            {/* Notification Banner */}
            {banner && (
              <Animated.View
                style={{
                  opacity: bannerOpacity,
                  transform: [{ scale: bannerScale }],
                }}
                className={`mb-6 p-4 rounded-xl border flex-row items-start ${
                  banner.type === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <Feather
                  name={banner.type === 'error' ? 'alert-circle' : 'check-circle'}
                  size={20}
                  color={banner.type === 'error' ? '#ef4444' : '#10b981'}
                />
                <View style={{ width: 8 }} />
                <View className="flex-1">
                  <Text
                    className={`font-semibold text-sm ${
                      banner.type === 'error' ? 'text-red-800' : 'text-emerald-800'
                    }`}
                  >
                    {banner.type === 'error' ? 'Authentication Alert' : 'Success'}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      banner.type === 'error' ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {banner.message}
                  </Text>
                </View>
                <View style={{ width: 8 }} />
                <TouchableOpacity
                  testID="close-banner-button"
                  onPress={() => setBanner(null)}
                  className="p-0.5"
                >
                  <Feather
                    name="x"
                    size={16}
                    color={banner.type === 'error' ? '#fca5a5' : '#a7f3d0'}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Email Input */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Email Address</Text>
              <View
                testID="email-input-container"
                className={`flex-row items-center border rounded-2xl px-5 py-4 ${
                  emailFocused
                    ? 'border-indigo-500 bg-white ring-2 ring-indigo-100 shadow-sm shadow-indigo-100/50'
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={emailFocused ? '#6366f1' : '#94a3b8'}
                />
                <View style={{ width: 12 }} />
                <TextInput
                  className="flex-1 text-base text-slate-900"
                  onChangeText={setEmail}
                  value={email}
                  placeholder="your@email.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
                {email.length > 0 && (
                  <TouchableOpacity testID="clear-email-button" onPress={() => setEmail('')}>
                    <Feather name="x" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Password</Text>
              <View
                testID="password-input-container"
                className={`flex-row items-center border rounded-2xl px-5 py-4 ${
                  passwordFocused
                    ? 'border-indigo-500 bg-white ring-2 ring-indigo-100 shadow-sm shadow-indigo-100/50'
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <Feather
                  name="lock"
                  size={20}
                  color={passwordFocused ? '#6366f1' : '#94a3b8'}
                />
                <View style={{ width: 12 }} />
                <TextInput
                  className="flex-1 text-base text-slate-900"
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry={!showPassword}
                  placeholder={isSignUp ? 'Minimum 6 characters' : 'Enter your password'}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                {password.length > 0 && (
                  <TouchableOpacity
                    testID="password-visibility-toggle"
                    onPress={() => setShowPassword(!showPassword)}
                    className="p-1"
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Password Requirements Checklist */}
              {isSignUp && (
                <View className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mt-4">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Security Requirements
                  </Text>
                  <View>
                    {/* Email check */}
                    <View className="flex-row items-center mb-2.5">
                      <Feather
                        name={isValidEmail ? 'check' : 'circle'}
                        size={14}
                        color={isValidEmail ? '#10b981' : '#cbd5e1'}
                      />
                      <View style={{ width: 10 }} />
                      <Text
                        className={`text-xs ${
                          isValidEmail ? 'text-emerald-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        Valid email format
                      </Text>
                    </View>

                    {/* Length check */}
                    <View className="flex-row items-center mb-2.5">
                      <Feather
                        name={isMinLength ? 'check' : 'circle'}
                        size={14}
                        color={isMinLength ? '#10b981' : '#cbd5e1'}
                      />
                      <View style={{ width: 10 }} />
                      <Text
                        className={`text-xs ${
                          isMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        At least 6 characters
                      </Text>
                    </View>

                    {/* Number check */}
                    <View className="flex-row items-center mb-2.5">
                      <Feather
                        name={hasNumber ? 'check' : 'circle'}
                        size={14}
                        color={hasNumber ? '#10b981' : '#cbd5e1'}
                      />
                      <View style={{ width: 10 }} />
                      <Text
                        className={`text-xs ${
                          hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        Contains at least 1 number
                      </Text>
                    </View>

                    {/* Capital check */}
                    <View className="flex-row items-center">
                      <Feather
                        name={hasSpecialOrUpper ? 'check' : 'circle'}
                        size={14}
                        color={hasSpecialOrUpper ? '#10b981' : '#cbd5e1'}
                      />
                      <View style={{ width: 10 }} />
                      <Text
                        className={`text-xs ${
                          hasSpecialOrUpper ? 'text-emerald-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        Contains an uppercase or special character
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={{ height: 12 }} />

            {/* Submit Button */}
            <AnimatedPressable
              onPress={isSignUp ? signUpWithEmail : signInWithEmail}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={loading || !email || !password}
              style={{ transform: [{ scale: scaleAnim }] }}
              className={`rounded-2xl py-4 px-6 mb-5 flex-row items-center justify-center ${
                loading || !email || !password
                  ? 'bg-slate-100 border border-slate-200'
                  : 'bg-indigo-600 shadow-lg shadow-indigo-200/50'
              }`}
            >
              {loading ? (
                <Animated.View
                  style={{ transform: [{ rotate: rotateInterpolate }] }}
                  className="mr-3"
                >
                  <Feather name="loader" size={20} color={loading || !email || !password ? '#94a3b8' : '#ffffff'} />
                </Animated.View>
              ) : (
                <Feather
                  name={isSignUp ? 'user-plus' : 'log-in'}
                  size={20}
                  color={loading || !email || !password ? '#94a3b8' : '#ffffff'}
                  style={{ marginRight: 10 }}
                />
              )}
              <Text
                className={`text-center font-bold text-[15px] tracking-wide ${
                  loading || !email || !password ? 'text-slate-400' : 'text-white'
                }`}
              >
                {loading
                  ? 'Authorizing Node...'
                  : isSignUp
                  ? 'Initialize Registration'
                  : 'Establish Secure Session'}
              </Text>
            </AnimatedPressable>

            {/* Toggle Auth Mode */}
            <TouchableOpacity
              className="py-2"
              onPress={toggleAuthMode}
              disabled={loading}
            >
              <Text className="text-center text-indigo-600 font-semibold text-sm">
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Features Preview */}
          <View className="bg-indigo-50/60 rounded-3xl border border-indigo-100 p-6 shadow-sm shadow-indigo-100/30">
            <Text className="text-indigo-800 font-bold mb-2.5 text-center text-sm uppercase tracking-wide">
              ✨ Gateway Features
            </Text>
            <Text className="text-indigo-700/80 text-xs text-center leading-relaxed font-medium px-4">
              Multi-Agent Synchronization • Cryptographic Keys • Secure Local Session
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
