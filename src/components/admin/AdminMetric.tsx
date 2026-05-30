import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface AdminMetricProps {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  iconColor?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

export function AdminMetric({ label, value, icon, iconColor = '#3B82F6', trend, trendDirection = 'neutral' }: AdminMetricProps) {
  const trendColor = trendDirection === 'up' ? '#10B981' : trendDirection === 'down' ? '#EF4444' : '#94A3B8';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.iconWrapper, { backgroundColor: iconColor + '20' }]}>
          <FontAwesome name={icon} size={16} color={iconColor} />
        </View>
      </View>
      <Text style={styles.value}>{value}</Text>
      {trend && (
        <Text style={[styles.trend, { color: trendColor }]}>
          {trendDirection === 'up' && '▲ '}
          {trendDirection === 'down' && '▼ '}
          {trend}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    flex: 1,
    minWidth: 140,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  iconWrapper: {
    padding: 6,
    borderRadius: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  trend: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
