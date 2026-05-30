import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminGroups() {
  const groups = [
    { id: '1', name: 'Downtown Community Group', leader: 'Pastor David Choi', members: '14 members' },
    { id: '2', name: 'Westside Families Fellowship', leader: 'Sarah Jenkins', members: '18 members' },
    { id: '3', name: 'College & Young Adults', leader: 'Michael Chang', members: '22 members' },
  ];

  return (
    <AdminShell title="Small Groups & Ministries" subtitle="Manage campus small groups and leaders">
      {groups.map((item) => (
        <AdminCard key={item.id} title={item.name} subtitle={item.members}>
          <View style={styles.leaderRow}>
            <Text style={styles.label}>Leader:</Text>
            <Text style={styles.val}>{item.leader}</Text>
          </View>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  leaderRow: {
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
