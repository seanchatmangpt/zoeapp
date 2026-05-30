import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActorRef } from '../../lib/actor/types';

interface ActorRefViewProps {
  actorRef: ActorRef | string;
}

export function ActorRefView({ actorRef }: ActorRefViewProps) {
  let parsed: ActorRef;
  try {
    parsed = typeof actorRef === 'string' ? JSON.parse(actorRef) : actorRef;
  } catch (e) {
    return <Text style={styles.errorText}>Invalid ActorRef</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.badgeText}>{parsed.kind}</Text>
      <Text style={styles.idText}>{parsed.id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginRight: 6,
    textTransform: 'uppercase',
  },
  idText: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    color: '#E2E8F0',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
  },
});
