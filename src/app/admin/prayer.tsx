import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminPrayer() {
  const prayers = [
    { id: '1', request: 'Healing for Mrs. Henderson during chemotherapy.', submittedBy: 'John Henderson', visibility: 'Pastors Only' },
    { id: '2', request: 'Safe travels for the youth mission team.', submittedBy: 'Michael Chang', visibility: 'Public Community' },
    { id: '3', request: 'Guidance in finding a new group coordinator.', submittedBy: 'Sarah Jenkins', visibility: 'Staff Only' },
  ];

  return (
    <AdminShell title="Community Prayer Requests" subtitle="Monitor prayer needs and visibility policies">
      {prayers.map((item) => (
        <AdminCard key={item.id} title={item.submittedBy} subtitle={`Access Policy: ${item.visibility}`}>
          <Text style={styles.reqText}>"{item.request}"</Text>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  reqText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
