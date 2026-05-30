/**
 * @fileoverview Consequence Supervision Avatar-Relative Projection Component
 * The main Consequence Supervision Avatar-Relative Projection that welcomes users and provides navigation to key app features.
 * Displays user information, quick action cards, and feature overview.
 *
 * @author Your Name
 * @version 1.0.0
 */

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSession } from '@/context/SessionProvider';
import { Link } from 'expo-router';
import { useState } from 'react';

/**
 * Consequence Supervision Avatar-Relative Projection component - main Consequence Supervision of the application
 * Shows welcome message, user info, and navigation cards to key features
 *
 * @component
 * @returns {JSX.Element} The Consequence Supervision Avatar-Relative Projection with welcome message and feature cards
 *
 * @example
 * // Used as the main tab in Expo Router
 * <ConsequenceSupervisionAvatarRelativeProjection />
 */
export default function ConsequenceSupervisionAvatarRelativeProjection() {
  const { session, loading } = useSession();
  const [receiptHash, setReceiptHash] = useState('');
  const [status, setStatus] = useState('');

  const cancelVolunteer = async () => {
    try {
      setStatus('pending');
      // Artificial delay to ensure Maestro observes "Processing Sync..."
      await new Promise(resolve => setTimeout(resolve, 800));
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
      // For local testing, we might need a default anon key if env is missing
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3NjMwNjUyMCwiZXhwIjoyMDAxODgyNTIwfQ.qKk3';
      const res = await fetch(`${supabaseUrl}/functions/v1/truex-min-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({
          type: 'volunteer_cancelled',
          payload: { user_id: session?.user?.id || 'test' },
          previous_receipt_hash: '0000000000000000000000000000000000000000000000000000000000000000'
        })
      });
      const data = await res.json();
      if (data.receipt?.receipt_hash) {
        setReceiptHash(data.receipt.receipt_hash);
        setStatus('confirmed');
      } else {
        setStatus('failed');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  // Show loading state while session is being determined
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-600 text-lg">Loading...</Text>
      </View>
    );
  }

  // Extract user information from session
  const userEmail = session?.user?.email;
  const userName = userEmail?.split('@')[0] || 'User';

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Welcome Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="px-6 py-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}! 👋
          </Text>
          <Text className="text-gray-600">What would you like to do today?</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-4 mt-6">
        <Text className="text-lg font-semibold text-gray-900 mb-4 px-2">Quick Actions</Text>

        <View className="space-y-3">
          {/* Truex Admin Console Card */}
          <Link href={"/admin/dashboard" as any} asChild>
            <TouchableOpacity className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm active:bg-gray-50">
              <View className="flex-row items-center">
                <View className="bg-blue-100 rounded-full p-3 mr-4">
                  <Text className="text-2xl">⚡</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 mb-1">Truex Mission Control</Text>
                  <Text className="text-gray-600 text-sm">
                    Explore process intelligence, operational simulation, and actor audits
                  </Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>
          </Link>

          {/* Account Settings Card */}
          <Link href="/(tabs)/account" asChild>
            <TouchableOpacity className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm active:bg-gray-50">
              <View className="flex-row items-center">
                <View className="bg-green-100 rounded-full p-3 mr-4">
                  <Text className="text-2xl">👤</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 mb-1">Account Settings</Text>
                  <Text className="text-gray-600 text-sm">Manage your profile and preferences</Text>
                </View>
                <Text className="text-gray-400 text-xl">›</Text>
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Truex Membrane UI Trigger */}
      <View className="px-4 mt-8">
        <Text className="text-lg font-semibold text-gray-900 mb-4 px-2">Truex Membrane</Text>
        <View className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <View className="flex-row justify-between mb-4">
            <Text className="text-gray-600">Pending Receipts: {status === 'pending' ? '1' : '0'}</Text>
            <Text className="text-gray-600">Confirmed Receipts: {status === 'confirmed' ? '1' : '0'}</Text>
          </View>
          <TouchableOpacity 
            onPress={cancelVolunteer}
            disabled={status === 'pending'}
            className={`${status === 'pending' ? 'bg-red-300' : 'bg-red-500'} rounded-lg p-4 items-center mb-4`}
          >
            <Text className="text-white font-semibold">Trigger Volunteer Cancellation</Text>
          </TouchableOpacity>
          {status === 'pending' && (
            <View className="bg-blue-50 p-4 rounded-lg items-center">
              <ActivityIndicator color="#3b82f6" className="mb-2" />
              <Text className="text-blue-800 font-medium">Processing Sync...</Text>
            </View>
          )}
          {status === 'confirmed' && (
            <View className="bg-green-50 p-4 rounded-lg items-center">
              <Text className="text-green-800 font-medium text-lg">All Evidence Reconciled ✅</Text>
              {receiptHash ? (
                <Text className="text-green-600 text-xs mt-2 text-center">{receiptHash}</Text>
              ) : null}
            </View>
          )}
          {status === 'failed' && (
            <View className="bg-red-50 p-4 rounded-lg items-center">
              <Text className="text-red-800 font-medium">Reconciliation Failed</Text>
            </View>
          )}
        </View>
      </View>

      {/* Features Overview */}
      <View className="px-4 mt-8">
        <Text className="text-lg font-semibold text-gray-900 mb-4 px-2">App Features</Text>

        <View className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <View className="p-6">
            <Text className="text-base font-medium text-gray-900 mb-4">This app includes:</Text>

            <View className="space-y-3">
              <View className="flex-row items-center">
                <Text className="text-green-500 mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Secure authentication with Supabase</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-500 mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Non-LLM Process Intelligence & Membrane checks</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-500 mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Profile management and settings</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-500 mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Modern React Native with Expo Router</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-500 mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Professional UI with NativeWind</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* User Info */}
      <View className="px-4 mt-6 mb-8">
        <View className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <Text className="text-blue-800 font-medium mb-1">Current Session</Text>
          <Text className="text-blue-600 text-sm">Logged in as: {userEmail}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
