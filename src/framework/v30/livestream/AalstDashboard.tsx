import React from 'react';
import { View, Text, FlatList, StyleSheet, ListRenderItemInfo } from 'react-native';
import { useAalstStream, AalstEvent } from './useAalstStream';

export const AalstDashboard: React.FC = () => {
  const { isConnected, logs } = useAalstStream();

  const renderItem = ({ item }: ListRenderItemInfo<AalstEvent>) => (
    <View style={styles.logItem} testID={`log-item-${item.id}`}>
      <Text style={styles.logType}>{item.type}</Text>
      <Text style={styles.logPayload}>{item.payload}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text testID="connection-status" style={styles.status}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        testID="logs-list"
        ListEmptyComponent={<Text testID="empty-text">No logs yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  logItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  logType: {
    fontWeight: 'bold',
    color: '#333',
  },
  logPayload: {
    color: '#666',
  },
});
