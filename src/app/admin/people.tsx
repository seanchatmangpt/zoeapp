import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminPeople() {
  const staff = [
    { id: '1', name: 'Pastor David Choi', role: 'Lead Pastor', email: 'david@zoecommunity.church' },
    { id: '2', name: 'Sarah Jenkins', role: 'Family Ministries Director', email: 'sarah@zoecommunity.church' },
    { id: '3', name: 'Michael Chang', role: 'Worship Director', email: 'michael@zoecommunity.church' },
  ];

  return (
    <AdminShell title="Pastoral Staff & Members" subtitle="Roster profiles of church leadership">
      {staff.map((item) => (
        <AdminCard key={item.id} title={item.name} subtitle={item.role}>
          <View style={styles.emailRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.val}>{item.email}</Text>
          </View>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  emailRow: {
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
    fontFamily: 'SpaceMono',
  },
});
