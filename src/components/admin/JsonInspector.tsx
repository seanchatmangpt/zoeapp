import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface JsonInspectorProps {
  data: any;
  title?: string;
}

export function JsonInspector({ data, title }: JsonInspectorProps) {
  const [collapsed, setCollapsed] = useState(true);

  let formatted = '';
  try {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    formatted = JSON.stringify(obj, null, 2);
  } catch (e) {
    formatted = String(data);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title || 'View Payload'}</Text>
        <Text style={styles.arrow}>{collapsed ? '▶' : '▼'}</Text>
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.body}>
          <Text style={styles.jsonText}>{formatted}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090D16', // Dark background for code
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  title: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 10,
    color: '#64748B',
  },
  body: {
    padding: 10,
    maxHeight: 250,
  },
  jsonText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#10B981', // green text for code
  },
});
