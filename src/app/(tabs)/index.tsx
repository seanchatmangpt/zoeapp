/**
 * @fileoverview Consequence Supervision Avatar-Relative Projection Component
 * The main Consequence Supervision Avatar-Relative Projection that welcomes users and provides navigation to key app features.
 * Displays user information, quick action cards, and feature overview.
 *
 * @author Your Name
 * @version 1.1.0
 */

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Animated, Easing } from 'react-native';
import { useSession } from '@/context/SessionProvider';
import { Link } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { OfflineBanner } from '@/src/components/OfflineBanner';

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
  const [showOverlay, setShowOverlay] = useState(false);
  const [checklist, setChecklist] = useState([
    { id: 'fetch', label: 'Querying Supabase Authority', status: 'idle' },
    { id: 'blake3', label: 'Validating BLAKE3 Signature', status: 'idle' },
    { id: 'persist', label: 'Persisting to Local Storage', status: 'idle' },
    { id: 'confirm', label: 'Confirming Database Sync', status: 'idle' },
  ]);
  const [spinAnim] = useState(() => new Animated.Value(0));

  const updateChecklistStep = (id: string, stepStatus: 'idle' | 'running' | 'success' | 'failed') => {
    setChecklist(prev => prev.map(step => step.id === id ? { ...step, status: stepStatus } : step));
  };

  useEffect(() => {
    if (showOverlay && status === 'pending') {
      spinAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
    }
  }, [showOverlay, status, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const { useActorOpsStore } = require('@/src/lib/actor/actorOps');
  const networkOnline = useActorOpsStore((state: any) => state.networkOnline);

  const cancelVolunteer = async () => {
    if (!networkOnline) return;
    
    // Reset checklist to initial state with first task running
    setChecklist([
      { id: 'fetch', label: 'Querying Supabase Authority', status: 'running' },
      { id: 'blake3', label: 'Validating BLAKE3 Signature', status: 'idle' },
      { id: 'persist', label: 'Persisting to Local Storage', status: 'idle' },
      { id: 'confirm', label: 'Confirming Database Sync', status: 'idle' },
    ]);
    setStatus('pending');
    setShowOverlay(true);

    try {
      const { db } = require('@/src/lib/db/db');
      const { actorReceipts } = require('@/src/lib/db/schema');
      const { mmkvInstance } = require('@/src/lib/store/mmkvStorage');
      const { useActorOpsStore } = require('@/src/lib/actor/actorOps');
      const { generateBlake3ReceiptHash } = require('@/src/lib/crypto/receipts');
      const { eq } = require('drizzle-orm');

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
        updateChecklistStep('fetch', 'success');

        // 1. BLAKE3 Receipt Check: Verify matching hash
        updateChecklistStep('blake3', 'running');
        const prev = data.receipt.previous_receipt_hash || '0000000000000000000000000000000000000000000000000000000000000000';
        const expectedData = {
          event_id: data.receipt.event_id,
          authority: data.receipt.authority,
          input: data.receipt.input,
          output: data.receipt.output
        };
        const computedHash = generateBlake3ReceiptHash(prev, expectedData);
        
        if (computedHash !== data.receipt.receipt_hash) {
          console.error(`[BLAKE3 Receipt Check failed] Expected: ${data.receipt.receipt_hash}, Computed: ${computedHash}`);
          updateChecklistStep('blake3', 'failed');
          setStatus('failed');
          return;
        }
        updateChecklistStep('blake3', 'success');

        // 2. Persist receipt to all layers
        updateChecklistStep('persist', 'running');
        const receiptId = data.receipt.id || `rec_${Math.random().toString(36).substr(2, 9)}`;
        const commandId = data.receipt.command_id || `cmd_cancel_volunteer_${Date.now()}`;
        const actorObj = {
          tenantId: 'tenant-default',
          kind: 'user',
          id: session?.user?.id || 'test',
        };

        // A. SQLite persistence
        await db.insert(actorReceipts).values({
          id: receiptId,
          commandId: commandId,
          actorRef: JSON.stringify(actorObj),
          status: 'applied_remote',
          deltaHash: computedHash,
          eventIds: JSON.stringify([data.receipt.event_id]),
          error: null,
          createdAt: new Date(),
        });

        // B. MMKV persistence
        mmkvInstance.set(`receipt_${commandId}`, JSON.stringify({
          id: receiptId,
          commandId: commandId,
          actor: actorObj,
          status: 'applied_remote',
          deltaHash: computedHash,
          eventIds: [data.receipt.event_id],
          createdAt: new Date().toISOString()
        }));
        mmkvInstance.set(`receipt_hash_${commandId}`, computedHash);

        // C. Zustand persistence
        useActorOpsStore.getState().setLatestReceipt({
          id: receiptId,
          commandId: commandId,
          actor: actorObj,
          status: 'applied_remote',
          deltaHash: computedHash,
          eventIds: [data.receipt.event_id],
          createdAt: new Date().toISOString()
        });
        updateChecklistStep('persist', 'success');

        // 3. Confirm Persistence
        updateChecklistStep('confirm', 'running');
        const sqliteRecords = await db.select().from(actorReceipts).where(eq(actorReceipts.id, receiptId));
        const mmkvData = mmkvInstance.getString(`receipt_${commandId}`);
        const zustandData = useActorOpsStore.getState().latestReceipt;

        if (sqliteRecords.length > 0 && mmkvData && zustandData?.id === receiptId) {
          updateChecklistStep('confirm', 'success');
          // Unlocks only once persistence is confirmed
          setReceiptHash(data.receipt.receipt_hash);
          setStatus('confirmed');
          setShowOverlay(false);
        } else {
          console.error('[Persistence confirmation failed]');
          updateChecklistStep('confirm', 'failed');
          setStatus('failed');
        }
      } else {
        updateChecklistStep('fetch', 'failed');
        setStatus('failed');
      }
    } catch (e) {
      console.error('[cancelVolunteer error]', e);
      setChecklist(prev => prev.map(step => step.status === 'running' ? { ...step, status: 'failed' } : step));
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
    <View style={styles.container}>
      <OfflineBanner />
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
              disabled={status === 'pending' || !networkOnline}
              className={`${
                status === 'pending' || !networkOnline ? 'bg-slate-300' : 'bg-rose-500 active:bg-rose-600'
              } rounded-xl p-4 flex-row justify-center items-center mb-2 shadow-sm`}
            >
              <Ionicons name="warning-outline" size={18} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">
                {status === 'pending' ? 'Processing...' : 'Trigger Volunteer Cancellation'}
              </Text>
            </TouchableOpacity>

            {!networkOnline && (
              <View testID="offline-help-state" className="mt-2 bg-amber-50 border border-amber-200 p-3 rounded-xl flex-row items-center justify-center">
                <Ionicons name="information-circle-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                <Text className="text-amber-800 text-xs font-semibold text-center">
                  Online propagation triggers are disabled. Actions will queue once connection is restored.
                </Text>
              </View>
            )}
            
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

      {/* Locking overlay during BLAKE3 receipt check */}
      {showOverlay && (
        <View 
          testID="locking-overlay"
          style={StyleSheet.absoluteFill}
          className="bg-slate-950/90 items-center justify-center p-6"
          pointerEvents="auto"
        >
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-sm items-center shadow-2xl">
            <View className="relative items-center justify-center w-24 h-24 mb-6">
              {/* Pulsing Outer Glow */}
              <View className="absolute inset-0 bg-indigo-500/10 rounded-full border border-indigo-500/20 scale-125" />
              
              {/* High-Fidelity Custom Animated Spinner */}
              <Animated.View 
                testID="verification-spinner"
                style={{ 
                  transform: [{ rotate: spin }],
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  borderWidth: 3,
                  borderColor: status === 'failed' || status === 'error' ? '#EF4444' : '#8B5CF6',
                  borderTopColor: 'transparent',
                  borderLeftColor: 'transparent',
                }}
              />
              
              {/* Inner Circle with Status Icon */}
              <View className="bg-slate-950 border border-slate-800 rounded-full p-4 shadow-lg shadow-indigo-500/50 items-center justify-center w-16 h-16">
                {status === 'failed' || status === 'error' ? (
                  <Ionicons name="close-circle-outline" size={28} color="#EF4444" />
                ) : (
                  <Ionicons name="shield-checkmark" size={28} color="#8B5CF6" />
                )}
              </View>
            </View>

            <Text className="text-xl font-bold text-slate-100 text-center tracking-tight mb-1">
              {status === 'failed' || status === 'error' ? 'Verification Failed' : 'Verifying BLAKE3 Receipt'}
            </Text>
            <Text className="text-xs text-indigo-400 font-bold tracking-wider uppercase text-center mb-6">
              Cryptographic Proof Gating
            </Text>

            {/* Checklist */}
            <View className="w-full space-y-3 mb-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
              {checklist.map((step) => {
                let iconName: any = 'ellipse-outline';
                let iconColor = '#475569'; // slate-600
                let textColor = 'text-slate-400';
                let statusText = '';

                if (step.status === 'running') {
                  iconName = 'sync-outline';
                  iconColor = '#8B5CF6'; // violet-500
                  textColor = 'text-violet-200 font-semibold';
                } else if (step.status === 'success') {
                  iconName = 'checkmark-circle';
                  iconColor = '#10B981'; // emerald-500
                  textColor = 'text-emerald-300 font-medium';
                } else if (step.status === 'failed') {
                  iconName = 'close-circle';
                  iconColor = '#EF4444'; // red-500
                  textColor = 'text-rose-400 font-bold';
                  statusText = ' (failed)';
                }

                return (
                  <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {step.status === 'running' ? (
                        <Animated.View style={{ transform: [{ rotate: spin }], marginRight: 12 }}>
                          <Ionicons name={iconName} size={18} color={iconColor} />
                        </Animated.View>
                      ) : (
                        <Ionicons name={iconName} size={18} color={iconColor} style={{ marginRight: 12 }} />
                      )}
                      <Text className={`text-sm ${textColor}`}>
                        {step.label}{statusText}
                      </Text>
                    </View>
                    {step.status === 'success' && (
                      <Text className="text-emerald-500 text-xs font-bold uppercase tracking-wider">OK</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {status === 'pending' ? (
              <View className="w-full bg-slate-850/80 rounded-xl p-4 flex-row justify-center items-center border border-slate-800">
                <ActivityIndicator color="#8B5CF6" size="small" style={{ marginRight: 8 }} />
                <Text className="text-slate-400 font-bold text-base">Processing...</Text>
              </View>
            ) : (
              <TouchableOpacity 
                testID="overlay-close-btn"
                onPress={() => setShowOverlay(false)}
                className="w-full bg-slate-800 active:bg-slate-750 rounded-xl p-4 flex-row justify-center items-center border border-slate-700"
              >
                <Text className="text-slate-200 font-bold text-base">Close Overlay</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export { ErrorBoundary } from '@/src/components/ErrorBoundary';
