import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminEvents() {
  const events = [
    { id: '1', title: 'Sunday Morning Worship', time: 'Every Sunday, 9:00 AM & 11:00 AM', location: 'Main Sanctuary' },
    { id: '2', title: 'Midweek Prayer Gathering', time: 'Wednesdays, 7:00 PM', location: 'Chapel' },
    { id: '3', title: 'Community Outreach Service', time: 'Saturdays, 10:00 AM', location: 'Downtown Shelter' },
  ];

  return (
    <AdminShell title="Church Calendar Events" subtitle="Monitor scheduled services and outreach events">
      {events.map((item) => (
        <AdminCard key={item.id} title={item.title} subtitle={item.time}>
          <View style={styles.locRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.val}>{item.location}</Text>
          </View>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  locRow: {
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
