import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { OutboxBadge } from '../../components/admin/OutboxBadge';
import { CommandButton } from '../../components/admin/CommandButton';
import { db } from '../../lib/db/db';
import { actorOutbox, actorQuarantine } from '../../lib/db/schema';
import { desc } from 'drizzle-orm';
import { globalLocalDispatcher, globalRemoteDispatcher } from '../../lib/actor/actorOps';

function formatTimestamp(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'N/A';
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

interface CodePayloadProps {
  data: any;
  title: string;
}

function CodePayload({ data, title }: CodePayloadProps) {
  const [collapsed, setCollapsed] = useState(true);
  let formattedJson = '';
  try {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    formattedJson = JSON.stringify(obj, null, 2);
  } catch (e) {
    formattedJson = String(data);
  }

  return (
    <View style={styles.codeContainer}>
      <TouchableOpacity
        style={styles.codeHeader}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.codeHeaderLeft}>
          <Text style={styles.codeTagIndicator}>&lt;code&gt;</Text>
          <Text style={styles.codeTitle}>{title}</Text>
        </View>
        <View style={styles.codeHeaderRight}>
          <View style={styles.jsonBadge}>
            <Text style={styles.jsonBadgeText}>JSON</Text>
          </View>
          <Text style={styles.codeArrow}>{collapsed ? '▶' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.codeBody}>
          <Text style={styles.codeText}>{formattedJson}</Text>
          <Text style={styles.codeTagIndicatorClose}>&lt;/code&gt;</Text>
        </View>
      )}
    </View>
  );
}

export default function AdminOutbox() {
  const [outboxList, setOutboxList] = useState<any[]>([]);
  const [quarantineList, setQuarantineList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const fetchQueueData = async () => {
    setRefreshing(true);
    try {
      const outbox = await db
        .select()
        .from(actorOutbox)
        .orderBy(desc(actorOutbox.createdAt));
      setOutboxList(outbox);

      const quarantine = await db
        .select()
        .from(actorQuarantine)
        .orderBy(desc(actorQuarantine.createdAt));
      setQuarantineList(quarantine);
    } catch (e) {
      console.error('Failed to load queue data:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    setSyncStatusMsg('Step 1/2: Replaying outbox commands to remote...');
    try {
      await globalLocalDispatcher.syncOutbox(globalRemoteDispatcher);
      setSyncStatusMsg('Step 2/2: Flushing sync engine queues to Supabase...');
      await globalLocalDispatcher.getSyncEngine().pushChanges();
      setSyncStatusMsg('Sync Completed Successfully!');
      Alert.alert('Outbox Sync', 'Synchronization and queue flush completed successfully.');
    } catch (err: any) {
      console.error(err);
      setSyncStatusMsg(`Sync Failed: ${err.message}`);
      Alert.alert('Outbox Sync Error', err.message);
    } finally {
      setSyncing(false);
      fetchQueueData();
    }
  };

  const renderOutboxItem = ({ item }: { item: any }) => {
    let payloadData = {};
    try {
      payloadData = JSON.parse(item.payload);
    } catch (e) {}

    return (
      <AdminCard 
        title={`Job: ${item.id.slice(0, 10)}...`} 
        subtitle={`Created: ${formatTimestamp(item.createdAt)}`}
        headerRight={<OutboxBadge status={item.status} />}
      >
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Command ID:</Text>
            <Text style={styles.valueMono}>{item.commandId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Attempts:</Text>
            <Text style={styles.valueText}>{item.attempts} / 3</Text>
          </View>
          <CodePayload data={payloadData} title="Command Context Data" />
        </View>
      </AdminCard>
    );
  };

  const renderQuarantineItem = ({ item }: { item: any }) => {
    let actorParsed = {};
    let payloadParsed = {};
    try {
      actorParsed = JSON.parse(item.actorRef);
      payloadParsed = JSON.parse(item.payload);
    } catch (e) {}

    return (
      <AdminCard 
        title={`Quarantine: ${item.id.slice(0, 10)}...`} 
        subtitle={`Quarantined: ${formatTimestamp(item.createdAt)}`}
        style={styles.quarantineCard}
      >
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Command ID:</Text>
            <Text style={styles.valueMono}>{item.commandId}</Text>
          </View>
          <View style={styles.errorBox}>
            <Text style={styles.errorLabel}>Last Rejection Error:</Text>
            <Text style={styles.errorText}>{item.error}</Text>
          </View>
          <CodePayload data={{ actor: actorParsed, payload: payloadParsed }} title="Execution Dump Data" />
        </View>
      </AdminCard>
    );
  };

  return (
    <AdminShell title="Outbox & Sync Manager" subtitle="Control authoritative synchronization replays" scrollable={false}>
      <View style={styles.headerControls}>
        <View style={styles.buttonRow}>
          <CommandButton 
            title={syncing ? 'Flushing...' : 'Flush Outbox'} 
            onPress={triggerSync}
            disabled={syncing}
            testID="flush-outbox"
            style={styles.flushBtn}
          />
          <CommandButton 
            title={syncing ? 'Syncing...' : 'Sync Outbox Now'} 
            onPress={triggerSync}
            disabled={syncing}
            testID="sync-outbox-now"
            style={styles.syncBtn}
          />
        </View>
        {syncStatusMsg && (
          <Text style={[
            styles.statusMessage, 
            syncStatusMsg.includes('Failed') ? styles.statusFail : syncStatusMsg.includes('Completed') ? styles.statusSuccess : null
          ]}>
            {syncStatusMsg}
          </Text>
        )}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Outbox Queue</Text>
            <View style={[styles.statusIndicator, outboxList.length > 0 ? styles.indicatorPending : styles.indicatorSuccess]} />
          </View>
          <View style={styles.metricBody}>
            <Text style={styles.metricValue}>{outboxList.length}</Text>
            <Text style={styles.metricSubtext}>Pending synchronization</Text>
          </View>
        </View>
        
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Quarantined</Text>
            <View style={[styles.statusIndicator, quarantineList.length > 0 ? styles.indicatorFailed : styles.indicatorSuccess]} />
          </View>
          <View style={styles.metricBody}>
            <Text style={styles.metricValue}>{quarantineList.length}</Text>
            <Text style={styles.metricSubtext}>Isolated execution errors</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={outboxList}
        renderItem={renderOutboxItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchQueueData} tintColor="#3B82F6" />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Sync Outbox Queue</Text>
            <View style={[styles.sectionBadge, outboxList.length > 0 ? styles.sectionBadgePending : styles.sectionBadgeEmpty]}>
              <Text style={styles.sectionBadgeText}>{outboxList.length}</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          <>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Quarantine Failures</Text>
              <View style={[styles.sectionBadge, quarantineList.length > 0 ? styles.sectionBadgeFailed : styles.sectionBadgeEmpty]}>
                <Text style={styles.sectionBadgeText}>{quarantineList.length}</Text>
              </View>
            </View>
            <FlatList
              data={quarantineList}
              renderItem={renderQuarantineItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No quarantined commands detected.</Text>
                </View>
              }
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Outbox queue is empty. Ready for offline commands.</Text>
          </View>
        }
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  headerControls: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flushBtn: {
    flex: 1,
    backgroundColor: '#10B981', // Emerald 500
  },
  syncBtn: {
    flex: 1,
    backgroundColor: '#3B82F6', // Blue 500
  },
  statusMessage: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'SpaceMono',
    marginTop: 8,
    textAlign: 'center',
  },
  statusSuccess: {
    color: '#34D399',
  },
  statusFail: {
    color: '#F87171',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorPending: {
    backgroundColor: '#F59E0B', // Amber-500
  },
  indicatorSuccess: {
    backgroundColor: '#10B981', // Emerald-500
  },
  indicatorFailed: {
    backgroundColor: '#EF4444', // Red-500
  },
  metricBody: {
    marginTop: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  metricSubtext: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgePending: {
    backgroundColor: '#F59E0B', // Amber-500
  },
  sectionBadgeFailed: {
    backgroundColor: '#EF4444', // Red-500
  },
  sectionBadgeEmpty: {
    backgroundColor: '#334155', // Slate-700
  },
  sectionBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  details: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    width: 100,
    fontWeight: '600',
  },
  valueMono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#E2E8F0',
    flex: 1,
  },
  valueText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: 'bold',
  },
  quarantineCard: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    marginTop: 8,
  },
  errorLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F87171',
  },
  errorText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 10,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  codeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeTagIndicator: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#3B82F6',
    marginRight: 6,
    fontWeight: 'bold',
  },
  codeTagIndicatorClose: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 6,
    fontWeight: 'bold',
  },
  codeTitle: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: 'bold',
  },
  codeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jsonBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  jsonBadgeText: {
    fontSize: 9,
    color: '#60A5FA',
    fontWeight: 'bold',
  },
  codeArrow: {
    fontSize: 10,
    color: '#94A3B8',
  },
  codeBody: {
    padding: 12,
    backgroundColor: '#090D16',
  },
  codeText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#10B981',
  },
});
