import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { useSession } from '../../../context/SessionProvider';
import { useActorOpsStore } from '../../lib/actor/actorOps';
import { mmkvInstance } from '../../lib/store/mmkvStorage';
import { Ionicons } from '@expo/vector-icons';

export default function AdminSettings() {
  const { session } = useSession();

  // Load developer-simulated settings from MMKV
  const [walMode, setWalMode] = useState(true);
  const [verboseLogs, setVerboseLogs] = useState(false);
  const [supervisionRestart, setSupervisionRestart] = useState(true);
  const [mmkvKeysCount, setMmkvKeysCount] = useState(0);

  // Sync state with Zustand store
  const networkOnline = useActorOpsStore((state) => state.networkOnline);
  const setNetworkOnline = useActorOpsStore((state) => state.setNetworkOnline);
  const remoteRejectActive = useActorOpsStore((state) => state.remoteRejectActive);
  const setRemoteRejectActive = useActorOpsStore((state) => state.setRemoteRejectActive);

  useEffect(() => {
    try {
      setWalMode(mmkvInstance.getBoolean('admin_sqlite_wal') !== false);
      setVerboseLogs(mmkvInstance.getBoolean('admin_verbose_logs') || false);
      setSupervisionRestart(mmkvInstance.getBoolean('admin_supervision_restart') !== false);
      setMmkvKeysCount(mmkvInstance.getAllKeys().length);
    } catch (e) {
      console.warn('Failed to load MMKV properties:', e);
    }
  }, []);

  const refreshMMKVKeyCount = () => {
    try {
      setMmkvKeysCount(mmkvInstance.getAllKeys().length);
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleWalMode = () => {
    const next = !walMode;
    setWalMode(next);
    mmkvInstance.set('admin_sqlite_wal', next);
    refreshMMKVKeyCount();
  };

  const toggleVerboseLogs = () => {
    const next = !verboseLogs;
    setVerboseLogs(next);
    mmkvInstance.set('admin_verbose_logs', next);
    refreshMMKVKeyCount();
  };

  const toggleSupervisionRestart = () => {
    const next = !supervisionRestart;
    setSupervisionRestart(next);
    mmkvInstance.set('admin_supervision_restart', next);
    refreshMMKVKeyCount();
  };

  // Safe developer resets
  const handleClearMMKV = () => {
    Alert.alert(
      'Wipe MMKV Cache',
      'Are you sure you want to clear all MMKV keys? This deletes all client state and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            try {
              mmkvInstance.clearAll();
              setMmkvKeysCount(0);
              Alert.alert('Success', 'MMKV Cache cleared.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Wipe failed');
            }
          },
        },
      ]
    );
  };

  const handleClearAsyncStorage = () => {
    Alert.alert(
      'Wipe AsyncStorage Cache',
      'Are you sure you want to clear all AsyncStorage keys? This deletes all traditional cache, session info, and indices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'AsyncStorage cache cleared.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Wipe failed');
            }
          },
        },
      ]
    );
  };

  const handleResetZustand = () => {
    Alert.alert(
      'Reset Local Actor Ops Store',
      'Restores outboxes, queues, and sync parameters back to initial clean states.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Store',
          onPress: () => {
            try {
              setNetworkOnline(true);
              setRemoteRejectActive(false);
              useActorOpsStore.getState().setLatestReceipt(null);
              useActorOpsStore.getState().setLatestEvent(null);
              useActorOpsStore.getState().setCounts(0, 0);
              Alert.alert('Success', 'Zustand operations store reset completed.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Reset failed');
            }
          },
        },
      ]
    );
  };

  const handleSeedSandboxData = () => {
    try {
      // Seeds some mock debug parameters into MMKV to test state persistence
      mmkvInstance.set('sandbox_seeded_at', new Date().toISOString());
      mmkvInstance.set('sandbox_tenant_ref', 'tenant-test-override-999');
      mmkvInstance.set('sandbox_sync_facade', 'Supabase Realtime CDC Facade');
      refreshMMKVKeyCount();
      Alert.alert('Success', 'Sandbox parameters seeded into MMKV store.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Seeding failed');
    }
  };

  return (
    <AdminShell title="System Settings" subtitle="Admin panel parameters and configurations">
      
      {/* SECTION 1: Authentication Context */}
      <AdminCard title="Authentication Context" subtitle="Active session properties">
        <View className="mb-4">
          <View style={styles.row} className="border-b border-slate-700/50 py-2">
            <Text style={styles.label}>Principal User</Text>
            <Text style={styles.val}>{session?.user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.row} className="border-b border-slate-700/50 py-2">
            <Text style={styles.label}>User UUID</Text>
            <Text style={styles.valMono}>{session?.user?.id || 'N/A'}</Text>
          </View>
          <View style={styles.row} className="py-2">
            <Text style={styles.label}>Auth Confirmed</Text>
            <Text style={styles.val}>{session?.user?.email_confirmed_at ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </AdminCard>

      {/* SECTION 2: Local Storage & Sync Engine */}
      <AdminCard title="Engine Configurations" subtitle="Zoe Multi-tenant Boundaries & Sync Settings">
        <View className="mb-2">
          
          {/* Custom Switch: SQLite WAL Mode */}
          <Pressable onPress={toggleWalMode} className="flex-row justify-between items-center py-3 border-b border-slate-700/50">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">SQLite WAL Mode</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Enable write-ahead logging database speedups</Text>
            </View>
            <View className={`w-11 h-6 rounded-full p-0.5 ${walMode ? 'bg-blue-500' : 'bg-slate-600'}`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${walMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </View>
          </Pressable>

          {/* Custom Switch: Network Online Simulation */}
          <Pressable onPress={() => setNetworkOnline(!networkOnline)} className="flex-row justify-between items-center py-3 border-b border-slate-700/50">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Network Simulator</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Simulate offline state for testing synchronization outbox</Text>
            </View>
            <View className={`w-11 h-6 rounded-full p-0.5 ${networkOnline ? 'bg-blue-500' : 'bg-slate-600'}`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${networkOnline ? 'translate-x-5' : 'translate-x-0'}`} />
            </View>
          </Pressable>

          {/* Custom Switch: Remote Reject Simulation */}
          <Pressable onPress={() => setRemoteRejectActive(!remoteRejectActive)} className="flex-row justify-between items-center py-3 border-b border-slate-700/50">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Remote Rejections</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Simulate conflicts by rejecting incoming server actions</Text>
            </View>
            <View className={`w-11 h-6 rounded-full p-0.5 ${remoteRejectActive ? 'bg-red-500' : 'bg-slate-600'}`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${remoteRejectActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </View>
          </Pressable>

          {/* Custom Switch: Verbose logging */}
          <Pressable onPress={toggleVerboseLogs} className="flex-row justify-between items-center py-3 border-b border-slate-700/50">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Verbose Sync Logging</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Output sync logs to serial terminal</Text>
            </View>
            <View className={`w-11 h-6 rounded-full p-0.5 ${verboseLogs ? 'bg-blue-500' : 'bg-slate-600'}`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${verboseLogs ? 'translate-x-5' : 'translate-x-0'}`} />
            </View>
          </Pressable>

          {/* Custom Switch: Supervision Restart */}
          <Pressable onPress={toggleSupervisionRestart} className="flex-row justify-between items-center py-3">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Supervision Auto-Restart</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Restart syncing threads on driver crash events</Text>
            </View>
            <View className={`w-11 h-6 rounded-full p-0.5 ${supervisionRestart ? 'bg-blue-500' : 'bg-slate-600'}`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-all ${supervisionRestart ? 'translate-x-5' : 'translate-x-0'}`} />
            </View>
          </Pressable>

        </View>
      </AdminCard>

      {/* SECTION 3: Diagnostic Reset Actions */}
      <AdminCard title="Diagnostics Console & Resets" subtitle="Direct memory modifications & debug tools">
        <View className="mb-2 flex-row justify-between items-center border-b border-slate-700/50 pb-3">
          <Text className="text-slate-300 text-sm font-semibold">MMKV Storage Keys</Text>
          <View className="bg-slate-800 rounded px-2.5 py-0.5">
            <Text className="text-xs font-bold text-blue-400">{mmkvKeysCount}</Text>
          </View>
        </View>

        <View className="space-y-3 mt-4">
          <TouchableOpacity
            onPress={handleSeedSandboxData}
            className="w-full bg-blue-600/20 active:bg-blue-600/30 border border-blue-500/40 rounded-xl py-3 px-4 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="flask-outline" size={18} color="#60A5FA" style={{ marginRight: 10 }} />
              <Text className="text-blue-200 font-semibold text-sm">Seed Sandbox Parameters</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#60A5FA" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResetZustand}
            className="w-full bg-blue-600/20 active:bg-blue-600/30 border border-blue-500/40 rounded-xl py-3 px-4 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="refresh-outline" size={18} color="#60A5FA" style={{ marginRight: 10 }} />
              <Text className="text-blue-200 font-semibold text-sm">Reset Local Zustand Stores</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#60A5FA" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearAsyncStorage}
            className="w-full bg-red-500/10 active:bg-red-500/25 border border-red-500/30 rounded-xl py-3 px-4 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="trash-bin-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text className="text-red-300 font-semibold text-sm">Wipe AsyncStorage Cache</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearMMKV}
            className="w-full bg-red-500/10 active:bg-red-500/25 border border-red-500/30 rounded-xl py-3 px-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="trash-bin-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text className="text-red-300 font-semibold text-sm">Wipe MMKV Cache Storage</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </AdminCard>

    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
  },
  val: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  valMono: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
});

