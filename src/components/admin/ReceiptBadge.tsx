import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReceiptStatus } from '../../lib/actor/types';

interface ReceiptBadgeProps {
  status: ReceiptStatus;
  testID?: string;
}

export function ReceiptBadge({ status, testID }: ReceiptBadgeProps) {
  let backgroundColor = '#334155'; // Slate 700
  let textColor = '#94A3B8'; // Slate 400

  switch (status) {
    case 'accepted_pending':
      backgroundColor = 'rgba(217, 119, 6, 0.2)'; // Amber 600
      textColor = '#F59E0B';
      break;
    case 'rejected_local':
      backgroundColor = 'rgba(239, 68, 68, 0.2)'; // Red 500
      textColor = '#F87171';
      break;
    case 'applied_local':
      backgroundColor = 'rgba(16, 185, 129, 0.2)'; // Emerald 500
      textColor = '#34D399';
      break;
    case 'applied_remote':
      backgroundColor = 'rgba(59, 130, 246, 0.2)'; // Blue 500
      textColor = '#60A5FA';
      break;
    case 'rejected_remote':
      backgroundColor = 'rgba(185, 28, 28, 0.3)'; // Red 700
      textColor = '#EF4444';
      break;
    case 'quarantined':
      backgroundColor = 'rgba(139, 92, 246, 0.2)'; // Violet 500
      textColor = '#A78BFA';
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]} testID={testID}>
        {status}
      </Text>
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
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
