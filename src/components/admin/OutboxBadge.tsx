import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OutboxBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export function OutboxBadge({ status }: OutboxBadgeProps) {
  let backgroundColor = '#334155';
  let textColor = '#94A3B8';

  switch (status) {
    case 'pending':
      backgroundColor = 'rgba(245, 158, 11, 0.15)';
      textColor = '#F59E0B';
      break;
    case 'processing':
      backgroundColor = 'rgba(59, 130, 246, 0.15)';
      textColor = '#60A5FA';
      break;
    case 'completed':
      backgroundColor = 'rgba(16, 185, 129, 0.15)';
      textColor = '#34D399';
      break;
    case 'failed':
      backgroundColor = 'rgba(239, 68, 68, 0.15)';
      textColor = '#F87171';
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
