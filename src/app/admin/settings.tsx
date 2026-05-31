import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { useSession } from '../../../context/SessionProvider';
import { useActorOpsStore } from '../../lib/actor/actorOps';
import { mmkvInstance } from '../../lib/store/mmkvStorage';
import { Ionicons } from '@expo/vector-icons';
const Switch = ({ active, colorClass }: { active: boolean; colorClass: string }) => (
  <View className={`w-12 h-7 rounded-full p-1 justify-center ${active ? colorClass : 'bg-slate-700/80 border border-slate-600/50'}`}>
    <View className={`w-5 h-5 rounded-full bg-white shadow-sm transform-gpu transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
  </View>
);

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
        <View className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <View className="flex-row justify-between items-center p-3.5 border-b border-slate-700/50">
            <Text className="text-slate-400 text-sm font-medium">Principal User</Text>
            <Text className="text-slate-200 text-sm font-semibold">{session?.user?.email || 'N/A'}</Text>
          </View>
          <View className="flex-row justify-between items-center p-3.5 border-b border-slate-700/50">
            <Text className="text-slate-400 text-sm font-medium">User UUID</Text>
            <Text className="text-slate-300 text-xs font-mono">{session?.user?.id || 'N/A'}</Text>
          </View>
          <View className="flex-row justify-between items-center p-3.5">
            <Text className="text-slate-400 text-sm font-medium">Auth Confirmed</Text>
            <View className={`px-2.5 py-1 rounded-md ${session?.user?.email_confirmed_at ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
              <Text className={`text-xs font-bold ${session?.user?.email_confirmed_at ? 'text-emerald-500' : 'text-rose-500'}`}>
                {session?.user?.email_confirmed_at ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>
      </AdminCard>

      {/* SECTION 2: Local Storage & Sync Engine */}
      <AdminCard title="Engine Configurations" subtitle="Zoe Multi-tenant Boundaries & Sync Settings">
        <View className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          
          <Pressable onPress={toggleWalMode} className="flex-row justify-between items-center p-4 border-b border-slate-700/50 active:bg-slate-700/30">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">SQLite WAL Mode</Text>
              <Text className="text-slate-400 text-xs mt-1">Enable write-ahead logging database speedups</Text>
            </View>
            <Switch active={walMode} colorClass="bg-blue-500" />
          </Pressable>

          <Pressable onPress={() => setNetworkOnline(!networkOnline)} className="flex-row justify-between items-center p-4 border-b border-slate-700/50 active:bg-slate-700/30">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Network Simulator</Text>
              <Text className="text-slate-400 text-xs mt-1">Simulate offline state for testing synchronization outbox</Text>
            </View>
            <Switch active={networkOnline} colorClass="bg-emerald-500" />
          </Pressable>

          <Pressable onPress={() => setRemoteRejectActive(!remoteRejectActive)} className="flex-row justify-between items-center p-4 border-b border-slate-700/50 active:bg-slate-700/30">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Remote Rejections</Text>
              <Text className="text-slate-400 text-xs mt-1">Simulate conflicts by rejecting incoming server actions</Text>
            </View>
            <Switch active={remoteRejectActive} colorClass="bg-rose-500" />
          </Pressable>

          <Pressable onPress={toggleVerboseLogs} className="flex-row justify-between items-center p-4 border-b border-slate-700/50 active:bg-slate-700/30">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Verbose Sync Logging</Text>
              <Text className="text-slate-400 text-xs mt-1">Output sync logs to serial terminal</Text>
            </View>
            <Switch active={verboseLogs} colorClass="bg-purple-500" />
          </Pressable>

          <Pressable onPress={toggleSupervisionRestart} className="flex-row justify-between items-center p-4 active:bg-slate-700/30">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 font-semibold text-sm">Supervision Auto-Restart</Text>
              <Text className="text-slate-400 text-xs mt-1">Restart syncing threads on driver crash events</Text>
            </View>
            <Switch active={supervisionRestart} colorClass="bg-blue-500" />
          </Pressable>

        </View>
      </AdminCard>

      {/* SECTION 3: Diagnostic Reset Actions */}
      <AdminCard title="Diagnostics Console & Resets" subtitle="Direct memory modifications & debug tools">
        
        <View className="flex-row justify-between items-center bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50 mb-4">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="server-outline" size={16} color="#94A3B8" />
            <Text className="text-slate-300 text-sm font-semibold">MMKV Storage Keys</Text>
          </View>
          <View className="bg-blue-500/20 px-3 py-1 rounded-md border border-blue-500/30">
            <Text className="text-xs font-bold text-blue-400">{mmkvKeysCount}</Text>
          </View>
        </View>

        <View className="space-y-3">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSeedSandboxData}
            className="w-full bg-slate-800/80 active:bg-slate-700/80 border border-slate-700 rounded-xl py-3.5 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center">
                <Ionicons name="flask-outline" size={16} color="#60A5FA" />
              </View>
              <Text className="text-slate-200 font-semibold text-sm">Seed Sandbox Parameters</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleResetZustand}
            className="w-full bg-slate-800/80 active:bg-slate-700/80 border border-slate-700 rounded-xl py-3.5 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <View className="w-8 h-8 rounded-full bg-purple-500/10 items-center justify-center">
                <Ionicons name="refresh-outline" size={16} color="#A78BFA" />
              </View>
              <Text className="text-slate-200 font-semibold text-sm">Reset Local Zustand Stores</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearAsyncStorage}
            className="w-full bg-slate-800/80 active:bg-slate-700/80 border border-slate-700 rounded-xl py-3.5 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <View className="w-8 h-8 rounded-full bg-orange-500/10 items-center justify-center">
                <Ionicons name="trash-bin-outline" size={16} color="#FB923C" />
              </View>
              <Text className="text-slate-200 font-semibold text-sm">Wipe AsyncStorage Cache</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearMMKV}
            className="w-full bg-rose-500/10 active:bg-rose-500/20 border border-rose-500/30 rounded-xl py-3.5 px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <View className="w-8 h-8 rounded-full bg-rose-500/20 items-center justify-center">
                <Ionicons name="warning-outline" size={16} color="#F43F5E" />
              </View>
              <Text className="text-rose-400 font-bold text-sm">Wipe MMKV Cache Storage</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#F43F5E" />
          </TouchableOpacity>
        </View>

      </AdminCard>

    </AdminShell>
  );
}
