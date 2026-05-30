import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminContent() {
  const announcements = [
    { id: '1', title: 'Summer Volunteer Training', date: 'May 28, 2026', desc: 'Join us for our annual volunteer training session in the main hall.' },
    { id: '2', title: 'Food Drive Campaign', date: 'June 05, 2026', desc: 'Drop off non-perishable food items at any campus lobby.' },
    { id: '3', title: 'Youth Group Summer Retreat', date: 'June 15, 2026', desc: 'Registration is open for the high school retreat at Lake Chelan.' },
  ];

  return (
    <AdminShell title="Content Management" subtitle="Manage announcement content feed cards">
      {announcements.map((item) => (
        <AdminCard key={item.id} title={item.title} subtitle={item.date}>
          <Text style={styles.bodyText}>{item.desc}</Text>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
});
