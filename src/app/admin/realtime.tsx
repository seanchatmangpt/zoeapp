import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminRealtime() {
  return (
    <AdminShell title="Realtime Channels" subtitle="Authoritative CDC and message subscription channels">
      
      <AdminCard title="Supabase Realtime Status" subtitle="State connection">
        <View style={styles.row}>
          <Text style={styles.label}>Connection State:</Text>
          <Text style={[styles.val, styles.greenText]}>Connected</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Client Mode:</Text>
          <Text style={styles.val}>Websocket (Realtime v2)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Latency:</Text>
          <Text style={styles.val}>42ms</Text>
        </View>
      </AdminCard>

      <AdminCard title="CDC Subscriptions" subtitle="Active table replication feeds">
        <View style={styles.feedRow}>
          <View style={styles.feedDotGreen} />
          <View>
            <Text style={styles.feedTitle}>actor_commands</Text>
            <Text style={styles.feedSub}>Source: public.actor_commands (all updates)</Text>
          </View>
        </View>

        <View style={styles.feedRow}>
          <View style={styles.feedDotGreen} />
          <View>
            <Text style={styles.feedTitle}>actor_events</Text>
            <Text style={styles.feedSub}>Source: public.actor_events (inserts only)</Text>
          </View>
        </View>

        <View style={styles.feedRow}>
          <View style={styles.feedDotGreen} />
          <View>
            <Text style={styles.feedTitle}>actor_receipts</Text>
            <Text style={styles.feedSub}>Source: public.actor_receipts (inserts only)</Text>
          </View>
        </View>

        <View style={styles.feedRow}>
          <View style={styles.feedDotGreen} />
          <View>
            <Text style={styles.feedTitle}>rdf_quads_ld</Text>
            <Text style={styles.feedSub}>Source: public.rdf_quads_ld (updates/deletes)</Text>
          </View>
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
    marginBottom: 8,
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
  greenText: {
    color: '#10B981',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  feedTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  feedSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
});
