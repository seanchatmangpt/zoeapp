import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useVkgEngine } from '@/src/components/VkgProvider';
import { AvatarRole } from '@/src/lib/truex/avatar/types';

const rolesList: AvatarRole[] = ['guest', 'member', 'volunteer', 'teamLead', 'pastor', 'admin', 'operator'];

export default function HooksProjection() {
  const {
    pendingReceipts,
    processedReceipts,
    quarantinedHooks,
    lastReceipt,
    avatar,
    setAvatar,
    projection,
    triggerHook,
    repairLastQuarantine,
  } = useVkgEngine();

  const isQuarantined = quarantinedHooks.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Truex Hook Cockpit</Text>

      {/* Switch Avatar Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Avatar Projection Context</Text>
        <View style={styles.avatarRow}>
          {rolesList.map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.avatarButton, avatar === role && styles.avatarButtonActive]}
              onPress={() => setAvatar(role)}
            >
              <Text style={[styles.avatarButtonText, avatar === role && styles.avatarButtonTextActive]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Projection Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VKG Projection Surface</Text>
        {projection && projection.visible ? (
          <View style={styles.projectionCard}>
            <View style={styles.badgeRow}>
              <Text style={styles.projectionBadge}>{projection.surface.toUpperCase()}</Text>
            </View>
            <Text style={styles.projectionMessage}>
              {projection.payload?.message || 'Projection matches active role.'}
            </Text>
            {projection.payload && (
              <Text style={styles.jsonPayload}>
                {JSON.stringify(projection.payload, null, 2)}
              </Text>
            )}
            <View style={styles.actionsContainer}>
              <Text style={styles.actionsLabel}>Allowed Actions:</Text>
              {projection.allowedActions.length > 0 ? (
                projection.allowedActions.map((act) => (
                  <View key={act} style={styles.actionBadge}>
                    <Text style={styles.actionText}>⚡ {act}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noActions}>No actions permitted for this role.</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.hiddenCard}>
            <Text style={styles.hiddenText}>[HIDDEN] No projection visible for guest avatar.</Text>
          </View>
        )}
      </View>

      {/* Metrics & Quarantine */}
      <View style={styles.metricsCard}>
        <Text style={styles.metric}>Pending Receipts: {pendingReceipts}</Text>
        <Text style={styles.metric}>Confirmed Receipts: {processedReceipts}</Text>
      </View>

      {isQuarantined && (
        <View style={styles.quarantineAlert}>
          <Text style={styles.quarantineTitle}>⚠️ HOOK QUARANTINED</Text>
          <Text style={styles.quarantineDesc}>
            A hook execution failed. Hook mailbox processing is paused.
          </Text>
          <TouchableOpacity style={styles.repairButton} onPress={repairLastQuarantine}>
            <Text style={styles.repairButtonText}>Trigger Repair & Replay</Text>
          </TouchableOpacity>
        </View>
      )}

      {pendingReceipts > 0 && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Processing local optimistic VKG sync...</Text>
        </View>
      )}

      {processedReceipts > 0 && pendingReceipts === 0 && !isQuarantined && (
        <View style={styles.successBadge}>
          <Text style={styles.successText}>Evidence Reconciled & Authority Signed ✅</Text>
        </View>
      )}

      {/* Command Triggers */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, isQuarantined && styles.buttonDisabled]}
          disabled={isQuarantined}
          onPress={() => triggerHook('volunteer_123', 'volunteer_cancel', 'shift_abc')}
        >
          <Text style={styles.buttonText}>Trigger Volunteer Cancellation</Text>
        </TouchableOpacity>
      </View>

      {/* Audit Log / Receipt Details */}
      {lastReceipt && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Cryptographic Receipt</Text>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptHash} numberOfLines={1}>
              Hash: {lastReceipt.receiptHash}
            </Text>
            <Text style={styles.receiptDetail}>Status: {lastReceipt.status}</Text>
            <Text style={styles.receiptDetail}>Message ID: {lastReceipt.messageId}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0F172A',
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarButtonActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  avatarButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarButtonTextActive: {
    color: '#0F172A',
  },
  projectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeRow: {
    alignSelf: 'flex-start',
  },
  projectionBadge: {
    backgroundColor: '#0EA5E9',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  projectionMessage: {
    fontSize: 15,
    color: '#F1F5F9',
    marginTop: 10,
    fontWeight: '500',
  },
  jsonPayload: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#38BDF8',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  actionsContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  actionsLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '600',
  },
  actionBadge: {
    backgroundColor: '#10B981',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noActions: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  hiddenCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#475569',
  },
  hiddenText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  metricsCard: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  metric: {
    fontSize: 15,
    color: '#F1F5F9',
    marginVertical: 4,
    fontWeight: '600',
  },
  quarantineAlert: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  quarantineTitle: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '800',
  },
  quarantineDesc: {
    color: '#FECACA',
    fontSize: 13,
    marginTop: 4,
  },
  repairButton: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  repairButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#38BDF8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: '#EAB308',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  pendingText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  successBadge: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  receiptCard: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  receiptHash: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#38BDF8',
  },
  receiptDetail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
});
