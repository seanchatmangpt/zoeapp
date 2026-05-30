import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminVolunteers() {
  const assignments = [
    { id: '1', team: 'Welcoming / Ushers', count: '12 Volunteers', coordinator: 'Sarah Jenkins' },
    { id: '2', title: 'Worship / AV Sound', count: '6 Volunteers', coordinator: 'Michael Chang' },
    { id: '3', title: 'Kids Church Helpers', count: '14 Volunteers', coordinator: 'Jenny Choi' },
  ];

  return (
    <AdminShell title="Volunteer Assignments" subtitle="Volunteer ministries team allocations">
      {assignments.map((item) => (
        <AdminCard key={item.id} title={item.team || item.title} subtitle={item.count}>
          <View style={styles.coordRow}>
            <Text style={styles.label}>Coordinator:</Text>
            <Text style={styles.val}>{item.coordinator}</Text>
          </View>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    marginRight: 6,
  },
  val: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
