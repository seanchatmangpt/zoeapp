import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { ReceiptBadge } from '../../components/admin/ReceiptBadge';
import { ActorRefView } from '../../components/admin/ActorRefView';
import { JsonInspector } from '../../components/admin/JsonInspector';
import { db } from '../../lib/db/db';
import { actorReceipts } from '../../lib/db/schema';
import { desc } from 'drizzle-orm';

export default function AdminReceipts() {
  const [receiptsList, setReceiptsList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReceipts = async () => {
    setRefreshing(true);
    try {
      const list = await db
        .select()
        .from(actorReceipts)
        .orderBy(desc(actorReceipts.createdAt));
      setReceiptsList(list);
    } catch (e) {
      console.error('Failed to load receipts:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const renderReceiptItem = ({ item }: { item: any }) => {
    return (
      <AdminCard 
        title={`Receipt: ${item.id.slice(0, 10)}...`} 
        subtitle={item.createdAt.toLocaleString()}
        headerRight={<ReceiptBadge status={item.status} />}
      >
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Command ID:</Text>
            <Text style={styles.valueMono}>{item.commandId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Actor Target:</Text>
            <ActorRefView actorRef={item.actorRef} />
          </View>
          {item.deltaHash && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Delta Checksum:</Text>
              <Text style={styles.valueMono}>{item.deltaHash}</Text>
            </View>
          )}
          {item.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorLabel}>Reason:</Text>
              <Text style={styles.errorText}>{item.error}</Text>
            </View>
          )}
          <JsonInspector data={{ eventIds: JSON.parse(item.eventIds) }} title="Associated Event IDs" />
        </View>
      </AdminCard>
    );
  };

  return (
    <AdminShell title="Receipt Audit Logs" subtitle="Historical transaction log matching BEAM event receipts" scrollable={false}>
      <FlatList
        data={receiptsList}
        renderItem={renderReceiptItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchReceipts} tintColor="#3B82F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No receipt records found.</Text>
          </View>
        }
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
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
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  errorLabel: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  errorText: {
    color: '#EF4444',
    fontFamily: 'SpaceMono',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
