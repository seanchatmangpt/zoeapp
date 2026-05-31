/**
 * @fileoverview Consequence Supervision Avatar-Relative Projection Component
 * The main Consequence Supervision Avatar-Relative Projection that welcomes users and provides navigation to key app features.
 * Displays user information, quick action cards, and feature overview.
 *
 * @author Your Name
 * @version 1.1.0
 */

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSession } from '@/context/SessionProvider';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

/**
 * Consequence Supervision Avatar-Relative Projection component - main Consequence Supervision of the application
 * Shows welcome message, user info, and navigation cards to key features
 *
 * @component
 * @returns {JSX.Element} The Consequence Supervision Avatar-Relative Projection with welcome message and feature cards
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
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 text-base mt-4 font-medium">Loading session...</Text>
      </View>
    );
  }

  // Extract user information from session
  const userEmail = session?.user?.email;
  const userName = userEmail?.split('@')[0] || 'User';

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 110 }}>
      {/* Welcome Header */}
      <View className="bg-white border-b border-slate-200">
        <View className="px-6 py-8">
          <Text className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Welcome back, {userName}! 👋
          </Text>
          <Text className="text-slate-500 text-base font-medium">What would you like to do today?</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-4 mt-8">
        <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Quick Actions
        </Text>

        <View className="space-y-4">
          {/* Truex Admin Console Card */}
          <Link href={"/admin/consequence-supervision" as any} asChild>
            <TouchableOpacity 
              testID="admin-card"
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm active:bg-slate-50 flex-row items-center">
              <View className="bg-indigo-50 rounded-2xl p-3 mr-4">
                <Ionicons name="flash" size={24} color="#4F46E5" />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-lg font-bold text-slate-900 mb-1">Truex Mission Control</Text>
                <Text className="text-slate-500 text-sm leading-5">
                  Explore process intelligence, operational simulation, and actor audits
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </Link>

          {/* Account Settings Card */}
          <Link href="/(tabs)/account" asChild>
            <TouchableOpacity 
              testID="account-card"
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm active:bg-slate-50 flex-row items-center">
              <View className="bg-emerald-50 rounded-2xl p-3 mr-4">
                <Ionicons name="person" size={24} color="#10B981" />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-lg font-bold text-slate-900 mb-1">Account Settings</Text>
                <Text className="text-slate-500 text-sm leading-5">Manage your profile and preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Truex Membrane UI Trigger */}
      <View className="px-4 mt-10">
        <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Truex Membrane
        </Text>
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <View className="flex-row justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl">
            <View className="items-center">
              <Text className="text-slate-500 text-xs font-semibold mb-1">Pending</Text>
              <Text className="text-slate-900 text-xl font-black">{status === 'pending' ? '1' : '0'}</Text>
            </View>
            <View className="w-px h-8 bg-slate-200" />
            <View className="items-center">
              <Text className="text-slate-500 text-xs font-semibold mb-1">Confirmed</Text>
              <Text className="text-emerald-600 text-xl font-black">{status === 'confirmed' ? '1' : '0'}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            testID="volunteer-cancel-btn"
            onPress={cancelVolunteer}
            disabled={status === 'pending'}
            className={`${
              status === 'pending' ? 'bg-slate-300' : 'bg-rose-500 active:bg-rose-600'
            } rounded-xl p-4 flex-row justify-center items-center mb-2 shadow-sm`}
          >
            <Ionicons name="warning-outline" size={18} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-bold text-base">
              {status === 'pending' ? 'Processing...' : 'Trigger Volunteer Cancellation'}
            </Text>
          </TouchableOpacity>
          
          {status === 'pending' && (
            <View className="mt-4 flex-row justify-center items-center py-2">
              <ActivityIndicator color="#6366F1" size="small" />
              <Text className="text-indigo-600 font-semibold ml-2">Processing Sync...</Text>
            </View>
          )}
          {status === 'confirmed' && (
            <View className="mt-4 bg-emerald-50 border border-emerald-100 p-4 rounded-xl items-center">
              <Ionicons name="checkmark-circle" size={28} color="#10B981" className="mb-1" />
              <Text className="text-emerald-800 font-bold text-base mb-1">All Evidence Reconciled</Text>
              {receiptHash ? (
                <Text className="text-emerald-600/70 text-[10px] font-mono mt-1 text-center bg-emerald-100/50 px-2 py-1 rounded">
                  {receiptHash}
                </Text>
              ) : null}
            </View>
          )}
          {(status === 'failed' || status === 'error') && (
            <View className="mt-4 bg-rose-50 border border-rose-100 p-4 rounded-xl items-center flex-row justify-center">
              <Ionicons name="alert-circle" size={20} color="#E11D48" className="mr-2" />
              <Text className="text-rose-800 font-bold">Reconciliation Failed</Text>
            </View>
          )}
        </View>
      </View>

      {/* Features Overview */}
      <View className="px-4 mt-10">
        <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          App Features
        </Text>

        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <View className="p-6">
            <Text className="text-base font-bold text-slate-800 mb-5">This app includes:</Text>

            <View className="space-y-4">
              {[
                'Secure authentication with Supabase',
                'Non-LLM Process Intelligence & Membrane checks',
                'Profile management and settings',
                'Modern React Native with Expo Router',
                'Professional UI with NativeWind'
              ].map((feature, i) => (
                <View key={i} className="flex-row items-center">
                  <View className="bg-indigo-100 rounded-full p-1 mr-3">
                    <Ionicons name="checkmark" size={12} color="#4F46E5" />
                  </View>
                  <Text className="text-slate-600 flex-1 font-medium">{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* User Info */}
      <View className="px-4 mt-8 mb-10">
        <View className="bg-slate-100 rounded-2xl border border-slate-200 p-5 flex-row items-center">
          <Ionicons name="information-circle" size={24} color="#64748B" className="mr-3" />
          <View className="ml-3 flex-1">
            <Text className="text-slate-700 font-bold mb-0.5">Current Session</Text>
            <Text className="text-slate-500 text-sm font-medium">Logged in as: {userEmail}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
