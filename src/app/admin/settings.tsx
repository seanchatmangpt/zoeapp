import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { useSession } from '../../../context/SessionProvider';

export default function AdminSettings() {
  const { session } = useSession();

  return (
    <AdminShell title="System Settings" subtitle="Admin panel parameters and configurations">
      
      <AdminCard title="Authentication Context" subtitle="Active session properties">
        <View style={styles.row}>
          <Text style={styles.label}>Principal User:</Text>
          <Text style={styles.val}>{session?.user?.email || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>User UUID:</Text>
          <Text style={styles.valMono}>{session?.user?.id || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Auth confirmed:</Text>
          <Text style={styles.val}>{session?.user?.email_confirmed_at ? 'Yes' : 'No'}</Text>
        </View>
      </AdminCard>

      <AdminCard title="Tenant Configuration" subtitle="Zoe Multi-tenant Boundaries">
        <View style={styles.row}>
          <Text style={styles.label}>Default Tenant ID:</Text>
          <Text style={styles.valMono}>tenant-123</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Storage Driver:</Text>
          <Text style={styles.val}>expo-sqlite (WAL Enabled)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sync SyncEngine:</Text>
          <Text style={styles.val}>Supabase Realtime CDC Facade</Text>
        </View>
      </AdminCard>

      <AdminCard title="System Boundaries" subtitle="Authoritative limits">
        <View style={styles.row}>
          <Text style={styles.label}>Sync Attempts Limit:</Text>
          <Text style={styles.val}>3 retries</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Exponential Backoff:</Text>
          <Text style={styles.val}>Multiplier: 2.0 (Base: 50ms)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Supervision Strategy:</Text>
          <Text style={styles.val}>OneForOne / Restart</Text>
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
  valMono: {
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
});
