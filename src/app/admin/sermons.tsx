import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { CommandButton } from '../../components/admin/CommandButton';
import { ReceiptBadge } from '../../components/admin/ReceiptBadge';
import { QuadDeltaPreview } from '../../components/admin/QuadDeltaPreview';
import { globalLocalDispatcher, useActorOpsStore } from '../../lib/actor/actorOps';
import { CommandEnvelope } from '../../lib/actor/types';

export default function AdminSermons() {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [dispatchReceipt, setDispatchReceipt] = useState<any | null>(null);
  const { currentPrincipal } = useActorOpsStore();

  const handlePublish = async () => {
    // Basic local validator check so we don't trigger if empty in UI
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Sermon Title cannot be empty.');
      return;
    }

    const commandId = `cmd_${Math.random().toString(36).substr(2, 9)}`;
    const actorId = `sermon_${Math.random().toString(36).substr(2, 5)}`;
    
    const envelope: CommandEnvelope = {
      id: commandId,
      actor: {
        tenantId: 'tenant-123',
        kind: 'Sermon',
        id: actorId,
      },
      command: 'PublishSermon',
      principal: currentPrincipal,
      payload: {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
      },
      idempotencyKey: `idemp_${commandId}`,
    };

    try {
      const receipt = await globalLocalDispatcher.dispatch(envelope);
      setDispatchReceipt(receipt);
      if (receipt.status === 'accepted_pending') {
        Alert.alert('Command Dispatched', 'Sermon published locally! Command is queued in outbox.');
        setTitle('');
        setVideoUrl('');
      } else {
        Alert.alert('Rejection', `Execution rejected: ${receipt.error}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <AdminShell title="Sermons Directory" subtitle="Publish sermons via actor command routing fabric">
      
      <AdminCard title="Publish New Sermon" subtitle="Dispatches 'PublishSermon' event to SermonActor">
        <View style={styles.formGroup}>
          <Text style={styles.label}>Sermon Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Power of Grace"
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
            testID="sermon-title-input"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Sermon Video URL (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. https://example.com/sermon.mp4"
            placeholderTextColor="#64748B"
            value={videoUrl}
            onChangeText={setVideoUrl}
            testID="sermon-video-input"
          />
        </View>

        <CommandButton 
          title="Publish Sermon" 
          onPress={handlePublish}
          testID="publish-sermon-submit"
          style={styles.submitBtn}
        />
      </AdminCard>

      {dispatchReceipt && (
        <AdminCard title="Execution Receipt Output" subtitle="Result feedback from Dispatcher">
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Status:</Text>
            <ReceiptBadge status={dispatchReceipt.status} testID="receipt-status" />
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Command ID:</Text>
            <Text style={styles.valueMono}>{dispatchReceipt.commandId}</Text>
          </View>
          {dispatchReceipt.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorLabel}>Rejection Details:</Text>
              <Text style={styles.errorText} testID="latest-error-code">
                {dispatchReceipt.error.includes('AuthorizationError') ? 'AUTHZ_DENIED' : 'INPUT_INVALID'}
              </Text>
              <Text style={styles.errorSubText}>{dispatchReceipt.error}</Text>
            </View>
          )}
        </AdminCard>
      )}

    </AdminShell>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#3B82F6',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptLabel: {
    width: 100,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  valueMono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: '#E2E8F0',
    flex: 1,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  errorLabel: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  errorText: {
    color: '#EF4444',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorSubText: {
    color: '#94A3B8',
    fontSize: 10,
  },
});
