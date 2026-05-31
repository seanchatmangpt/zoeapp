/**
 * @fileoverview Account Management Screen
 * Provides user profile management functionality including username, website, and avatar URL editing.
 * Integrates with Supabase for secure profile data persistence and includes developer tools.
 *
 * @author Your Name
 * @version 1.1.0
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  View,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Stack } from '@/src/components/AvatarRelativeProjection';
import { useSession } from '@/context/SessionProvider';
import { mmkvInstance } from '@/src/lib/store/mmkvStorage';
import { useActorOpsStore } from '@/src/lib/actor/actorOps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const AVATAR_PRESETS = [
  { id: '1', name: 'Ava', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face' },
  { id: '2', name: 'Leo', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
  { id: '3', name: 'Zoe', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
  { id: '4', name: 'Sam', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
  { id: '5', name: 'Mia', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face' },
  { id: '6', name: 'Ben', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&crop=face' },
];

export default function Account() {
  const { session } = useSession();

  // Profile fields state
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Picker modal and state
  const [showPicker, setShowPicker] = useState(false);
  const [imageError, setImageError] = useState(false);

  // App Toggles state (Simulated preferences backed by MMKV / Zustand)
  const [darkMode, setDarkMode] = useState(false);
  const [saveLogs, setSaveLogs] = useState(false);
  const [mmkvKeysCount, setMmkvKeysCount] = useState(0);

  // Global actor ops Zustand store state
  const networkOnline = useActorOpsStore((state) => state.networkOnline);
  const remoteRejectActive = useActorOpsStore((state) => state.remoteRejectActive);
  const setNetworkOnline = useActorOpsStore((state) => state.setNetworkOnline);
  const setRemoteRejectActive = useActorOpsStore((state) => state.setRemoteRejectActive);

  // Load user profile and configuration settings on mount / session change
  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        if (!session?.user) return;

        const { data, error, status } = await supabase
          .from('profiles')
          .select(`username, website, avatar_url`)
          .eq('id', session.user.id)
          .single();

        if (error && status !== 406) {
          throw error;
        }

        if (data) {
          setUsername(data.username || '');
          setWebsite(data.website || '');
          setAvatarUrl(data.avatar_url || '');
          setImageError(false);
        }
      } catch (error) {
        if (error instanceof Error) {
          Alert.alert('Error loading profile', error.message);
        }
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      getProfile();
    }

    // Load MMKV-backed simulation preferences
    try {
      setDarkMode(mmkvInstance.getBoolean('sim_dark_mode') || false);
      setSaveLogs(mmkvInstance.getBoolean('sim_save_logs') || false);
      setMmkvKeysCount(mmkvInstance.getAllKeys().length);
    } catch (e) {
      console.warn('Failed to read MMKV keys:', e);
    }
  }, [session?.user?.id]);

  const refreshMMKVKeyCount = () => {
    try {
      setMmkvKeysCount(mmkvInstance.getAllKeys().length);
    } catch (e) {
      console.warn(e);
    }
  };

  // Update profile database record
  async function handleUpdateProfile() {
    try {
      setUpdating(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session.user.id,
        username,
        website,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;
      Alert.alert('Success', 'Profile updated successfully!');
      refreshMMKVKeyCount();
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error updating profile', error.message);
      }
    } finally {
      setUpdating(false);
    }
  }

  // Get user initials for avatar fallback placeholder
  const getInitials = () => {
    if (username && username.trim()) {
      return username.trim().slice(0, 2).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  // Toggle handlers that persist to local MMKV instance
  const handleToggleDarkMode = (value: boolean) => {
    setDarkMode(value);
    mmkvInstance.set('sim_dark_mode', value);
    refreshMMKVKeyCount();
  };

  const handleToggleSaveLogs = (value: boolean) => {
    setSaveLogs(value);
    mmkvInstance.set('sim_save_logs', value);
    refreshMMKVKeyCount();
  };

  // Developer debugging reset procedures
  const handleClearMMKV = () => {
    Alert.alert(
      'Clear MMKV Cache ⚠️',
      'This will clear all fast key-value caches stored in the Zustand/Zoe persistence storage. This does not affect remote Supabase database. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            try {
              mmkvInstance.clearAll();
              Alert.alert('Success', 'MMKV Storage successfully wiped.');
              setMmkvKeysCount(0);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to clear MMKV');
            }
          },
        },
      ]
    );
  };

  const handleResetZustand = () => {
    Alert.alert(
      'Reset Zustand Store 🔄',
      'This will restore all local sync outboxes, quarantine queue counters, and simulation toggles back to default values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Store State',
          onPress: () => {
            try {
              setNetworkOnline(true);
              setRemoteRejectActive(false);
              useActorOpsStore.getState().setLatestReceipt(null);
              useActorOpsStore.getState().setLatestEvent(null);
              useActorOpsStore.getState().setCounts(0, 0);
              Alert.alert('Success', 'Zustand operations store reset.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Reset failed');
            }
          },
        },
      ]
    );
  };

  const handleClearAsyncStorage = () => {
    Alert.alert(
      'Clear AsyncStorage 💾',
      'This clears traditional async-storage items, such as authentication sessions, token indices, and caches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'AsyncStorage flushed.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Flush failed');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 text-base mt-4">Loading profile context...</Text>
      </View>
    );
  }

  const renderAvatar = () => {
    if (avatarUrl && !imageError) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          className="w-24 h-24 rounded-full border-4 border-white shadow-md"
          onError={() => setImageError(true)}
        />
      );
    }
    return (
      <View className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 items-center justify-center border-4 border-white shadow-md bg-blue-600">
        <Text className="text-white text-3xl font-bold tracking-wider">{getInitials()}</Text>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 110 }}>
      <Stack.AvatarRelativeProjection options={{ title: 'Account Settings' }} />

      {/* Header and Avatar Projection Card */}
      <View className="bg-white border-b border-gray-200 pb-6 pt-4">
        <View className="items-center px-6">
          <View className="relative">
            {renderAvatar()}
            <Pressable
              onPress={() => setShowPicker(!showPicker)}
              className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-white shadow active:bg-blue-700">
              <Ionicons name="camera-outline" size={16} color="white" />
            </Pressable>
          </View>
          <Text className="text-xl font-bold text-gray-900 mt-4">
            {username || 'Anonymous User'}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">{session?.user?.email}</Text>
          <View className="mt-2 bg-green-50 border border-green-200 rounded-full px-3 py-1 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-xs text-green-700 font-medium">Verified Active Principal</Text>
          </View>
        </View>

        {/* Dynamic Avatar Picker Tray */}
        {showPicker && (
          <View className="mt-6 px-6 py-4 bg-gray-50 border-t border-b border-gray-150">
            <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Select Preset Avatar
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {AVATAR_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    setAvatarUrl(preset.url);
                    setImageError(false);
                  }}
                  className={`mr-4 p-1 rounded-full border-2 ${
                    avatarUrl === preset.url ? 'border-blue-600 bg-blue-50' : 'border-transparent'
                  }`}>
                  <Image source={{ uri: preset.url }} className="w-14 h-14 rounded-full" />
                </Pressable>
              ))}
            </ScrollView>

            <View className="mt-4">
              <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Custom Avatar Image URL
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-2 text-sm text-gray-900 bg-white"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChangeText={(val) => {
                  setAvatarUrl(val);
                  setImageError(false);
                }}
                autoCapitalize="none"
              />
            </View>
          </View>
        )}
      </View>

      {/* Settings row groups */}
      <View className="px-4 mt-6">
        
        {/* GROUP 1: Profile Details */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
          Profile Details
        </Text>
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-xs font-medium text-gray-400 uppercase">Username</Text>
            <TextInput
              className="text-base text-gray-800 font-medium py-1"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View className="p-4">
            <Text className="text-xs font-medium text-gray-400 uppercase">Website</Text>
            <TextInput
              className="text-base text-gray-800 font-medium py-1"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Update Trigger Button */}
        <TouchableOpacity
          onPress={handleUpdateProfile}
          disabled={updating}
          className={`rounded-xl py-3.5 px-6 flex-row justify-center items-center shadow-sm mb-6 ${
            updating ? 'bg-gray-300' : 'bg-blue-600 active:bg-blue-700'
          }`}>
          <Ionicons name="save-outline" size={18} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-bold text-center text-base">
            {updating ? 'Updating database...' : 'Save Profile Changes'}
          </Text>
        </TouchableOpacity>

        {/* GROUP 2: App & Node Configurations */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
          Simulation Settings
        </Text>
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Custom Switch: Mock Offline Mode */}
          <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-gray-800">Simulate Offline Mode</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Disconnect from synchronization drivers</Text>
            </View>
            <Pressable
              onPress={() => setNetworkOnline(!networkOnline)}
              className={`w-12 h-7 rounded-full p-1 ${!networkOnline ? 'bg-yellow-500' : 'bg-gray-200'}`}>
              <View
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${
                  !networkOnline ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </Pressable>
          </View>

          {/* Custom Switch: Mock Remote Rejection */}
          <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-gray-800">Mock Remote Rejections</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Force sync engine to reject local events</Text>
            </View>
            <Pressable
              onPress={() => setRemoteRejectActive(!remoteRejectActive)}
              className={`w-12 h-7 rounded-full p-1 ${remoteRejectActive ? 'bg-red-500' : 'bg-gray-200'}`}>
              <View
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${
                  remoteRejectActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </Pressable>
          </View>

          {/* Custom Switch: Dark Mode Simulation */}
          <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-gray-800">Dark Mode Interface</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Simulate client dark mode container layouts</Text>
            </View>
            <Pressable
              onPress={() => handleToggleDarkMode(!darkMode)}
              className={`w-12 h-7 rounded-full p-1 ${darkMode ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <View
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </Pressable>
          </View>

          {/* Custom Switch: Log Capture Settings */}
          <View className="p-4 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-gray-800">Save Local Transaction Logs</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Persist event logs to disk caches</Text>
            </View>
            <Pressable
              onPress={() => handleToggleSaveLogs(!saveLogs)}
              className={`w-12 h-7 rounded-full p-1 ${saveLogs ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <View
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${
                  saveLogs ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </Pressable>
          </View>
        </View>

        {/* GROUP 3: Developer Tools & Diagnostics */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
          Developer Diagnostics & Resets
        </Text>
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <View className="p-4 border-b border-gray-100 flex-row justify-between items-center bg-gray-50/50">
            <Text className="text-sm font-semibold text-gray-700">MMKV State Keys</Text>
            <View className="bg-gray-200 rounded-full px-2.5 py-0.5">
              <Text className="text-xs font-bold text-gray-800">{mmkvKeysCount}</Text>
            </View>
          </View>
          
          <Pressable
            onPress={handleClearMMKV}
            className="p-4 border-b border-gray-100 flex-row items-center active:bg-gray-50">
            <Ionicons name="trash-bin-outline" size={18} color="#EF4444" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-red-600">Clear MMKV Storage</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Clear all fast key-value Zustand stores</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </Pressable>

          <Pressable
            onPress={handleResetZustand}
            className="p-4 border-b border-gray-100 flex-row items-center active:bg-gray-50">
            <Ionicons name="refresh-outline" size={18} color="#2563EB" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-blue-600">Reset Zustand Store States</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Re-initialize outboxes & synchronizers</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </Pressable>

          <Pressable
            onPress={handleClearAsyncStorage}
            className="p-4 flex-row items-center active:bg-gray-50">
            <Ionicons name="cloud-offline-outline" size={18} color="#D97706" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-amber-600">Clear AsyncStorage Cache</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Flush authentication details & tokens</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </Pressable>
        </View>

        {/* GROUP 4: Danger Zone */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
          Session Authority
        </Text>
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <Pressable
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => supabase.auth.signOut(),
                },
              ]);
            }}
            className="p-4 flex-row items-center justify-between bg-red-50/50 active:bg-red-100/50">
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 12 }} />
              <Text className="text-sm font-semibold text-red-700">Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
          </Pressable>
        </View>

      </View>

      {/* Footer Details */}
      <View className="mt-4 px-6">
        <Text className="text-center text-xs text-gray-400 leading-5">
          Truex Membrane Client Client v1.1.0{'\n'}
          Database Sync State secured with Supabase Auth
        </Text>
      </View>
    </ScrollView>
  );
}

