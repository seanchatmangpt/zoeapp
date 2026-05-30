import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { CommandButton } from '../../components/admin/CommandButton';
import { ReceiptBadge } from '../../components/admin/ReceiptBadge';
import {
  useActorOpsStore,
  setNetworkOffline,
  setRemoteRejectionMocked,
  setCurrentPrincipal,
  globalLocalDispatcher,
  globalRemoteDispatcher,
  globalVkgClient
} from '../../lib/actor/actorOps';
import { DataFactory } from '../../lib/vkg/rdf';
import { db } from '../../lib/db/db';
import { actorOutbox, actorQuarantine } from '../../lib/db/schema';
import { count } from 'drizzle-orm';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ActorLab() {
  const {
    networkOnline,
    remoteRejectActive,
    currentPrincipal,
    latestReceipt,
    latestEvent,
    outboxCount,
    quarantineCount,
    setCounts,
    setNetworkOnline,
    setRemoteRejectActive
  } = useActorOpsStore();

  const [sermonTitles, setSermonTitles] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refreshState = async () => {
    try {
      // Refresh DB metrics
      const outboxRes = await db.select({ value: count() }).from(actorOutbox);
      const quarantineRes = await db.select({ value: count() }).from(actorQuarantine);
      setCounts(outboxRes[0]?.value || 0, quarantineRes[0]?.value || 0);

      // Query the local VKG for sermon names
      const namePredicate = DataFactory.namedNode('https://schema.org/name');
      const quadsList = await globalVkgClient.match(undefined, namePredicate, undefined);
      const titles = quadsList.map(q => q.object.value);
      setSermonTitles(titles);
    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleNetwork = (online: boolean) => {
    setNetworkOffline(!online);
  };

  const toggleRemoteRejection = (active: boolean) => {
    setRemoteRejectionMocked(active);
  };

  const handleRoleChange = (role: 'admin' | 'pastor' | 'member' | 'guest') => {
    setCurrentPrincipal({
      id: `usr_${role}`,
      role: role,
    });
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await globalLocalDispatcher.syncOutbox(globalRemoteDispatcher);
      Alert.alert('Outbox Sync', 'Synchronization completed.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Outbox Sync Error', err.message);
    } finally {
      setSyncing(false);
      refreshState();
    }
  };

  // Maps the dispatcher error reason to the exact codes required by Maestro assertions
  const getErrorCode = () => {
    if (!latestReceipt || !latestReceipt.error) return 'None';
    const err = latestReceipt.error;
    if (err.includes('AuthorizationError')) {
      return 'AUTHZ_DENIED';
    }
    if (err.includes('ValidationError')) {
      if (latestReceipt.status === 'rejected_local') {
        return 'INPUT_INVALID';
      }
      return 'REMOTE_AUTHORITY_REJECTED';
    }
    return 'EXECUTION_FAILED';
  };

  return (
    <AdminShell title="Developer Actor Lab" subtitle="Deterministic runtime testbench for execution trust" scrollable={false}>
      
      {/* Target status ready token for Maestro boot verification */}
      <View testID="actor-runtime-ready" style={styles.statusBar}>
        <View style={styles.dotGreen} />
        <Text style={styles.statusText}>Actor Runtime Engine: Active & Ready</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {/* 1. Network Simulation Controls */}
        <AdminCard title="Network Connectivity Simulation" subtitle="Toggle device simulated network connectivity">
          <View style={styles.btnRow}>
            <TouchableOpacity 
              style={[styles.btnHalf, networkOnline && styles.btnActiveGreen]}
              onPress={() => toggleNetwork(true)}
              testID="mock-network-on"
            >
              <FontAwesome name="wifi" size={14} color={networkOnline ? '#F8FAFC' : '#94A3B8'} style={styles.btnIcon} />
              <Text style={[styles.btnText, networkOnline && styles.btnTextActive]}>ONLINE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnHalf, !networkOnline && styles.btnActiveRed]}
              onPress={() => toggleNetwork(false)}
              testID="mock-network-off"
            >
              <FontAwesome name="ban" size={14} color={!networkOnline ? '#F8FAFC' : '#94A3B8'} style={styles.btnIcon} />
              <Text style={[styles.btnText, !networkOnline && styles.btnTextActive]}>OFFLINE</Text>
            </TouchableOpacity>
          </View>
        </AdminCard>

        {/* 2. Authority Simulation Controls */}
        <AdminCard title="Remote Authority Mock Rejection" subtitle="Force authoritative server transaction failure">
          <View style={styles.btnRow}>
            <TouchableOpacity 
              style={[styles.btnHalf, remoteRejectActive && styles.btnActiveRed]}
              onPress={() => toggleRemoteRejection(true)}
              testID="mock-remote-reject-on"
            >
              <FontAwesome name="times" size={14} color={remoteRejectActive ? '#F8FAFC' : '#94A3B8'} style={styles.btnIcon} />
              <Text style={[styles.btnText, remoteRejectActive && styles.btnTextActive]}>MOCK ON</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnHalf, !remoteRejectActive && styles.btnActiveGreen]}
              onPress={() => toggleRemoteRejection(false)}
              testID="mock-remote-reject-off"
            >
              <FontAwesome name="check" size={14} color={!remoteRejectActive ? '#F8FAFC' : '#94A3B8'} style={styles.btnIcon} />
              <Text style={[styles.btnText, !remoteRejectActive && styles.btnTextActive]}>MOCK OFF</Text>
            </TouchableOpacity>
          </View>
        </AdminCard>

        {/* 3. Principal Role Overrides */}
        <AdminCard title="Principal Role Simulation Override" subtitle="Simulate command execution as guest, member, or pastor">
          <View style={styles.btnGroupRow}>
            {(['guest', 'member', 'pastor', 'admin'] as const).map((role) => {
              const active = currentPrincipal.role === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[styles.btnQuarter, active && styles.btnActiveBlue]}
                  onPress={() => handleRoleChange(role)}
                  testID="principal-role-picker"
                >
                  <Text style={[styles.roleText, active && styles.roleTextActive]}>{role}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </AdminCard>

        {/* 4. Trigger Sync Action */}
        <AdminCard title="Trigger Outbox Sync Replay" subtitle="Manually push admissibility backlog items up to Server Authority">
          <CommandButton 
            title={syncing ? 'Synchronizing...' : 'Sync Outbox Now'} 
            onPress={triggerSync}
            disabled={syncing}
            testID="sync-outbox-now"
            style={styles.syncBtn}
          />
        </AdminCard>

        {/* 5. Metrics & Status Outputs */}
        <AdminCard title="Runtime Metric Monitor" subtitle="Reactive execution logs state">
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Local Outbox Size:</Text>
            <Text style={styles.metricValMono} testID="outbox-count">
              {outboxCount}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Quarantined Count:</Text>
            <Text style={styles.metricValMono} testID="quarantine-count">
              {quarantineCount}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Latest Receipt:</Text>
            <ReceiptBadge status={latestReceipt?.status || 'accepted_pending'} testID="receipt-status" />
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Latest Event Emitted:</Text>
            <Text style={styles.metricVal} testID="latest-event-type">
              {latestEvent || 'None'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Error Code Label:</Text>
            <Text style={[styles.metricVal, styles.errorText]} testID="latest-error-code">
              {getErrorCode()}
            </Text>
          </View>
        </AdminCard>

        {/* 6. Virtual Knowledge Graph Projection View */}
        <AdminCard title="VKG Semantic Sermon Projection" subtitle="Rendered schema:name properties present in standard triple store">
          {sermonTitles.length > 0 ? (
            sermonTitles.map((titleStr, idx) => (
              <View key={`${titleStr}-${idx}`} style={styles.sermonRow}>
                <FontAwesome name="check-circle" size={14} color="#10B981" style={styles.checkIcon} />
                <Text style={styles.sermonTitleText} testID="sermon-title-rendered">
                  {titleStr}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyProjectionText}>Virtual Knowledge Graph contains 0 sermon name quads.</Text>
          )}
        </AdminCard>

      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  statusText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  btnHalf: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActiveGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  btnActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  btnIcon: {
    marginRight: 6,
  },
  btnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  btnTextActive: {
    color: '#F8FAFC',
  },
  btnGroupRow: {
    flexDirection: 'row',
    marginHorizontal: -3,
  },
  btnQuarter: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActiveBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  roleTextActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  syncBtn: {
    backgroundColor: '#3B82F6',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    paddingBottom: 8,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricValMono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#F87171',
  },
  sermonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  checkIcon: {
    marginRight: 8,
  },
  sermonTitleText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyProjectionText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
