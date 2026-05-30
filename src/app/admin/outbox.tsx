import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { OutboxBadge } from '../../components/admin/OutboxBadge';
import { CommandButton } from '../../components/admin/CommandButton';
import { JsonInspector } from '../../components/admin/JsonInspector';
import { QuadDeltaPreview } from '../../components/admin/QuadDeltaPreview';
import { db } from '../../lib/db/db';
import { actorOutbox, actorQuarantine } from '../../lib/db/schema';
import { desc, count } from 'drizzle-orm';
import { globalLocalDispatcher, globalRemoteDispatcher } from '../../lib/actor/actorOps';

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
    setSyncStatusMsg('Replaying outbox commands to remote authority...');
    try {
      await globalLocalDispatcher.syncOutbox(globalRemoteDispatcher);
      setSyncStatusMsg('Sync Completed Successfully!');
      Alert.alert('Outbox Sync', 'Synchronization completed successfully.');
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
        subtitle={`Created: ${item.createdAt.toLocaleTimeString()}`}
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
          <JsonInspector data={payloadData} title="Command Context Data" />
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
        subtitle={`Quarantined: ${item.createdAt.toLocaleTimeString()}`}
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
          <JsonInspector data={{ actor: actorParsed, payload: payloadParsed }} title="Execution Dump Data" />
        </View>
      </AdminCard>
    );
  };

  return (
    <AdminShell title="Outbox & Sync Manager" subtitle="Control authoritative synchronization replays" scrollable={false}>
      <View style={styles.headerControls}>
        <CommandButton 
          title={syncing ? 'Synchronizing...' : 'Sync Outbox Now'} 
          onPress={triggerSync}
          disabled={syncing}
          testID="sync-outbox-now"
          style={styles.syncBtn}
        />
        {syncStatusMsg && (
          <Text style={[
            styles.statusMessage, 
            syncStatusMsg.includes('Failed') ? styles.statusFail : syncStatusMsg.includes('Completed') ? styles.statusSuccess : null
          ]}>
            {syncStatusMsg}
          </Text>
        )}
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
          <>
            <Text style={styles.sectionTitle}>Sync Outbox Queue ({outboxList.length})</Text>
          </>
        }
        ListFooterComponent={
          <>
            <Text style={styles.sectionTitle}>Quarantine Failures ({quarantineList.length})</Text>
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
  syncBtn: {
    backgroundColor: '#DC2626', // Red-600
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});
