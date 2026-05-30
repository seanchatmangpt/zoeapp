import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QuadDeltaPreviewProps {
  delta: {
    add?: any[];
    remove?: any[];
  } | string;
}

export function QuadDeltaPreview({ delta }: QuadDeltaPreviewProps) {
  let parsed: { add?: any[]; remove?: any[] } = {};

  try {
    parsed = typeof delta === 'string' ? JSON.parse(delta) : delta;
  } catch (e) {
    return <Text style={styles.errorText}>Invalid Delta</Text>;
  }

  const additions = parsed.add || [];
  const removals = parsed.remove || [];

  if (additions.length === 0 && removals.length === 0) {
    return <Text style={styles.emptyText}>No changes (empty delta)</Text>;
  }

  const renderQuad = (q: any, type: 'add' | 'remove') => {
    const color = type === 'add' ? '#34D399' : '#F87171';
    const prefix = type === 'add' ? '+' : '-';
    
    // Shorten URIs for cleaner display
    const formatNode = (node: any) => {
      if (!node) return 'null';
      const val = node.value || '';
      return val.replace('https://schema.org/', 'schema:')
                .replace('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf:');
    };

    return (
      <View key={`${type}-${q.subject?.value}-${q.predicate?.value}`} style={styles.quadLine}>
        <Text style={[styles.prefix, { color }]}>{prefix}</Text>
        <Text style={styles.codeText}>
          <Text style={styles.subject}>{formatNode(q.subject)}</Text>{' '}
          <Text style={styles.predicate}>{formatNode(q.predicate)}</Text>{' '}
          <Text style={styles.object}>{formatNode(q.object)}</Text>
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {removals.map(q => renderQuad(q, 'remove'))}
      {additions.map(q => renderQuad(q, 'add'))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090D16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 8,
    marginTop: 6,
  },
  quadLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  prefix: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    marginRight: 6,
    fontWeight: 'bold',
  },
  codeText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    flex: 1,
  },
  subject: {
    color: '#60A5FA', // blue
  },
  predicate: {
    color: '#F472B6', // pink
  },
  object: {
    color: '#34D399', // green
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },
});
