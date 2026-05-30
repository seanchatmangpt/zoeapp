import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';

export default function AdminChurch() {
  return (
    <AdminShell title="Church Profile" subtitle="Manage Schema.org Church metadata profile">
      
      <AdminCard title="Identity details" subtitle="Vocabulary: https://schema.org/Church">
        <View style={styles.row}>
          <Text style={styles.label}>@type:</Text>
          <Text style={styles.valMono}>Church</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.val}>Zoe Community Church</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Founding Date:</Text>
          <Text style={styles.val}>2024-04-12</Text>
        </View>
      </AdminCard>

      <AdminCard title="Location details" subtitle="Vocabulary: https://schema.org/PostalAddress">
        <View style={styles.row}>
          <Text style={styles.label}>Street Address:</Text>
          <Text style={styles.val}>1200 Cathedral Way</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address Locality:</Text>
          <Text style={styles.val}>Seattle</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address Region:</Text>
          <Text style={styles.val}>WA</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Postal Code:</Text>
          <Text style={styles.val}>98101</Text>
        </View>
      </AdminCard>

      <AdminCard title="Contact points" subtitle="Official channels">
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.val}>info@zoecommunity.church</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Telephone:</Text>
          <Text style={styles.val}>(206) 555-0199</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>URL:</Text>
          <Text style={styles.val}>https://zoecommunity.church</Text>
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
    color: '#3B82F6',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    fontWeight: 'bold',
  },
});
