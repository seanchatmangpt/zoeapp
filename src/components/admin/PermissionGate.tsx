import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useActorOpsStore } from '../../lib/actor/actorOps';

interface PermissionGateProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ allowedRoles, children, fallback }: PermissionGateProps) {
  const { currentPrincipal } = useActorOpsStore();

  const isAllowed = allowedRoles.includes(currentPrincipal.role);

  if (!isAllowed) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Permission Denied: Requires role in [{allowedRoles.join(', ')}]. Active role is '{currentPrincipal.role}'.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    marginVertical: 8,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
