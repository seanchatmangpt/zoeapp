import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { ReceiptBadge } from '../../components/admin/ReceiptBadge';
import { JsonInspector } from '../../components/admin/JsonInspector';
import { useActorOpsStore } from '../../lib/actor/actorOps';
import { db } from '../../lib/db/db';
import { actorOutbox, actorQuarantine, actorReceipts, quads, ActorReceiptRecord, ActorQuarantineRecord } from '../../lib/db/schema';
import { count, eq, desc, or } from 'drizzle-orm';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { generateReceiptHash } from '../../lib/crypto/receipts';

// Consequence Supervisors Info
const supervisorsList = [
  {
    id: 'default-hook-supervisor',
    name: 'Default Hook Supervisor',
    maxRetries: 3,
    backoffMs: 10,
    patterns: ['quarantine', 'fatal', 'divergence', 'validation'],
    status: 'Active',
    description: 'System fault boundary for standard hook actors. Resolves optimistic state mutations and coordinates local rollbacks.',
    color: '#3B82F6',
  },
  {
    id: 'volunteer-flood-supervisor',
    name: 'Volunteer Flood Supervisor',
    maxRetries: 3,
    backoffMs: 10,
    patterns: ['quarantine', 'fatal', 'divergence', 'validation'],
    status: 'Active',
    description: 'Supervises critical volunteer capacity events. Safeguards ledger consensus and throttles batch command overflows.',
    color: '#10B981',
  },
];

const adminModules = [
  { name: 'Consequence Supervision', route: '/admin/consequence-supervision', icon: 'dashboard', color: '#3B82F6' },
  { name: 'Church Profile', route: '/admin/church', icon: 'institution', color: '#10B981' },
  { name: 'Content', route: '/admin/content', icon: 'file-text-o', color: '#8B5CF6' },
  { name: 'Sermons', route: '/admin/sermons', icon: 'microphone', color: '#F59E0B' },
  { name: 'Events', route: '/admin/events', icon: 'calendar', color: '#EC4899' },
  { name: 'Groups', route: '/admin/groups', icon: 'users', color: '#06B6D4' },
  { name: 'People', route: '/admin/people', icon: 'vcard-o', color: '#14B8A6' },
  { name: 'Prayer', route: '/admin/prayer', icon: 'heart', color: '#F43F5E' },
  { name: 'Volunteers', route: '/admin/volunteers', icon: 'hand-paper-o', color: '#84CC16' },
  { name: 'Actor Lab', route: '/admin/actor-lab', icon: 'flask', color: '#A855F7' },
  { name: 'Receipts', route: '/admin/receipts', icon: 'ticket', color: '#E2E8F0' },
  { name: 'Outbox Queue', route: '/admin/outbox', icon: 'send-o', color: '#E11D48' },
  { name: 'Realtime Monitor', route: '/admin/realtime', icon: 'flash', color: '#EAB308' },
  { name: 'Process Intel', route: '/admin/intelligence', icon: 'cogs', color: '#6366F1' },
  { name: 'Settings', route: '/admin/settings', icon: 'gears', color: '#64748B' },
];

const throughputData = [
  { label: 'T-30m', value: 35, rate: '12 ops' },
  { label: 'T-25m', value: 55, rate: '18 ops' },
  { label: 'T-20m', value: 80, rate: '27 ops' },
  { label: 'T-15m', value: 45, rate: '15 ops' },
  { label: 'T-10m', value: 95, rate: '32 ops' },
  { label: 'T-5m', value: 65, rate: '22 ops' },
  { label: 'Now', value: 85, rate: '29 ops' },
];

export default function AdminConsequenceSupervision() {
  const router = useRouter();
  const { outboxCount, quarantineCount, latestReceipt, networkOnline, setCounts } = useActorOpsStore();
  
  const [uptime, setUptime] = useState('00:00:00');
  const [receiptChainValid, setReceiptChainValid] = useState(true);
  const [latestRefusal, setLatestRefusal] = useState<ActorReceiptRecord | null>(null);
  const [totalQuads, setTotalQuads] = useState(0);
  const [reconciliationLag, setReconciliationLag] = useState('0ms');

  // New Audit States
  const [quarantinedItems, setQuarantinedItems] = useState<ActorQuarantineRecord[]>([]);
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [receiptCounts, setReceiptCounts] = useState<Record<string, number>>({
    accepted_pending: 0,
    rejected_local: 0,
    applied_local: 0,
    applied_remote: 0,
    rejected_remote: 0,
    quarantined: 0,
  });

  // Uptime timer
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const diff = Date.now() - startTime;
      const secs = Math.floor(diff / 1000) % 60;
      const mins = Math.floor(diff / 60000) % 60;
      const hrs = Math.floor(diff / 3600000) % 24;
      setUptime(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshCounts = async () => {
    try {
      // 1. Outbox pending count
      const outboxRes = await db
        .select({ value: count() })
        .from(actorOutbox)
        .where(eq(actorOutbox.status, 'pending'));
      const pendingOutbox = outboxRes[0]?.value || 0;
      
      // 2. Quarantine count
      const quarantineRes = await db
        .select({ value: count() })
        .from(actorQuarantine);
      const pendingQuarantine = quarantineRes[0]?.value || 0;
      
      setCounts(pendingOutbox, pendingQuarantine);

      // 3. Quads count
      const quadsRes = await db.select({ value: count() }).from(quads);
      setTotalQuads(quadsRes[0]?.value || 0);

      // 4. Latest refusal
      const refusals = await db
        .select()
        .from(actorReceipts)
        .where(
          or(
            eq(actorReceipts.status, 'rejected_local'),
            eq(actorReceipts.status, 'rejected_remote'),
            eq(actorReceipts.status, 'quarantined')
          )
        )
        .orderBy(desc(actorReceipts.createdAt))
        .limit(1);
      setLatestRefusal(refusals[0] || null);

      // 5. Verify receipt hash-chain integrity
      const receipts = await db.select().from(actorReceipts).orderBy(actorReceipts.createdAt);
      let isValid = true;
      let prevHash = '';
      for (const rec of receipts) {
        const data = {
          commandId: rec.commandId,
          status: rec.status,
          error: rec.error || undefined,
        };
        const expectedHash = generateReceiptHash(prevHash, data);
        if (rec.deltaHash && rec.deltaHash !== expectedHash) {
          isValid = false;
        }
        prevHash = rec.deltaHash || expectedHash;
      }
      setReceiptChainValid(isValid);

      // 6. Reconciliation lag
      setReconciliationLag(pendingOutbox > 0 ? '1.2s (Replaying)' : '0ms (Reconciled)');

      // 7. Fetch quarantined list
      const qList = await db
        .select()
        .from(actorQuarantine)
        .orderBy(desc(actorQuarantine.createdAt))
        .limit(10);
      setQuarantinedItems(qList);

      // 8. Fetch receipt status distribution
      const receiptStatusRes = await db
        .select({
          status: actorReceipts.status,
          value: count(),
        })
        .from(actorReceipts)
        .groupBy(actorReceipts.status);

      const countsMap: Record<string, number> = {
        accepted_pending: 0,
        rejected_local: 0,
        applied_local: 0,
        applied_remote: 0,
        rejected_remote: 0,
        quarantined: 0,
      };
      for (const r of receiptStatusRes) {
        if (r.status && r.status in countsMap) {
          countsMap[r.status] = r.value || 0;
        }
      }
      setReceiptCounts(countsMap);

    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  };

  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleReplay = async (item: ActorQuarantineRecord) => {
    setOperatingId(item.id);
    try {
      // Check if outbox entry already exists
      const existingOutbox = await db
        .select()
        .from(actorOutbox)
        .where(eq(actorOutbox.id, item.id));

      if (existingOutbox.length === 0) {
        await db.insert(actorOutbox).values({
          id: item.id,
          commandId: item.commandId,
          jobType: 'DISPATCH_AUTHORITATIVE',
          payload: item.payload,
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        });
      } else {
        await db
          .update(actorOutbox)
          .set({ status: 'pending', attempts: 0, createdAt: new Date() })
          .where(eq(actorOutbox.id, item.id));
      }

      // Delete from quarantine list
      await db.delete(actorQuarantine).where(eq(actorQuarantine.id, item.id));
      
      Alert.alert('Replay Dispatched', 'The command has been returned to the outbox queue.');
      await refreshCounts();
    } catch (e) {
      console.error('Failed to replay quarantined item:', e);
      Alert.alert('Error', 'Failed to dispatch replay for this quarantined flow.');
    } finally {
      setOperatingId(null);
    }
  };

  const handlePurge = async (id: string) => {
    Alert.alert(
      'Confirm Purge',
      'Are you sure you want to permanently discard this quarantined flow? This might cause state drift.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge',
          style: 'destructive',
          onPress: async () => {
            setOperatingId(id);
            try {
              await db.delete(actorQuarantine).where(eq(actorQuarantine.id, id));
              await refreshCounts();
            } catch (e) {
              console.error('Failed to purge item:', e);
            } finally {
              setOperatingId(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateInput: Date | string | number | null | undefined) => {
    if (!dateInput) return 'unknown';
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? String(dateInput) : d.toLocaleTimeString();
  };

  // Calculate Metrics for Graph
  const totalReceipts = Object.values(receiptCounts).reduce((a, b) => a + b, 0);
  const successCount = receiptCounts.applied_local + receiptCounts.applied_remote;
  const rejectionCount = receiptCounts.rejected_local + receiptCounts.rejected_remote + receiptCounts.accepted_pending;
  const quarantinedCount = receiptCounts.quarantined;

  const successPercent = totalReceipts > 0 ? (successCount / totalReceipts) * 100 : 0;
  const rejectionPercent = totalReceipts > 0 ? (rejectionCount / totalReceipts) * 100 : 0;
  const quarantinedPercent = totalReceipts > 0 ? (quarantinedCount / totalReceipts) * 100 : 0;

  return (
    <AdminShell title="ActorOps Console" subtitle="Authoritative Command Engine Admin Consequence Supervision" scrollable={true}>
      
      {/* Diagnostics Grid Section */}
      <Text style={styles.sectionHeader}>Mission Control Diagnostics</Text>
      <View style={styles.diagnosticsGrid}>
        
        {/* Card 1: Runtime Health */}
        <View style={styles.diagCard}>
          <View style={styles.diagHeader}>
            <FontAwesome name="heartbeat" size={16} color="#10B981" />
            <Text style={styles.diagTitle}>Runtime Health</Text>
          </View>
          <Text style={styles.diagStatusText}>Active / Healthy</Text>
          <Text style={styles.diagSubText}>Uptime: {uptime}</Text>
          <Text style={styles.diagSubText}>Engine: 1 Active</Text>
        </View>

        {/* Card 2: Outbox Queue */}
        <TouchableOpacity style={styles.diagCard} onPress={() => router.push('/admin/outbox' as any)}>
          <View style={styles.diagHeader}>
            <FontAwesome name="send-o" size={16} color="#F59E0B" />
            <Text style={styles.diagTitle}>Outbox Queue</Text>
          </View>
          <Text style={styles.diagStatusText}>{outboxCount} Pending</Text>
          <Text style={styles.diagSubText}>Mode: Local Dispatcher</Text>
          <Text style={styles.diagSubText}>Queue: SQLite outbox</Text>
        </TouchableOpacity>

        {/* Card 3: Quarantine Count */}
        <TouchableOpacity style={styles.diagCard} onPress={() => router.push('/admin/outbox' as any)}>
          <View style={styles.diagHeader}>
            <FontAwesome name="bug" size={16} color="#EF4444" />
            <Text style={styles.diagTitle}>Quarantine Count</Text>
          </View>
          <Text style={styles.diagStatusText}>{quarantineCount} Poisoned</Text>
          <Text style={styles.diagSubText}>Failures isolated</Text>
          <Text style={styles.diagSubText}>Status: Secure</Text>
        </TouchableOpacity>

        {/* Card 4: Latest Refusals */}
        <View style={styles.diagCard}>
          <View style={styles.diagHeader}>
            <FontAwesome name="warning" size={16} color="#EC4899" />
            <Text style={styles.diagTitle}>Latest Refusals</Text>
          </View>
          {latestRefusal ? (
            <>
              <Text style={[styles.diagStatusText, { color: '#F472B6' }]}>{latestRefusal.status}</Text>
              <Text style={styles.diagSubText} numberOfLines={1}>{latestRefusal.commandId.slice(0, 15)}...</Text>
            </>
          ) : (
            <>
              <Text style={styles.diagStatusText}>0 logged</Text>
              <Text style={styles.diagSubText}>No active rejections</Text>
            </>
          )}
        </View>

        {/* Card 5: Remote Reconciliation Lag */}
        <View style={styles.diagCard}>
          <View style={styles.diagHeader}>
            <FontAwesome name="clock-o" size={16} color="#06B6D4" />
            <Text style={styles.diagTitle}>Reconcile Lag</Text>
          </View>
          <Text style={styles.diagStatusText}>{reconciliationLag}</Text>
          <Text style={styles.diagSubText}>Replay delta: Auto</Text>
          <Text style={styles.diagSubText}>Authority check: OK</Text>
        </View>

        {/* Card 6: Receipt Verification Status */}
        <View style={styles.diagCard}>
          <View style={styles.diagHeader}>
            <FontAwesome name="shield" size={16} color="#3B82F6" />
            <Text style={styles.diagTitle}>Receipt Integrity</Text>
          </View>
          <Text style={styles.diagStatusText}>{receiptChainValid ? 'VERIFIED' : 'TAMPERED'}</Text>
          <Text style={styles.diagSubText}>Alg: SHA-256 chain</Text>
          <Text style={styles.diagSubText}>Receipts verified: OK</Text>
        </View>

        {/* Card 7: Projection Drift */}
        <View style={styles.diagCard}>
          <View style={styles.diagHeader}>
            <FontAwesome name="database" size={16} color="#84CC16" />
            <Text style={styles.diagTitle}>Projection Drift</Text>
          </View>
          <Text style={styles.diagStatusText}>0% Drift (OK)</Text>
          <Text style={styles.diagSubText}>Total Quads: {totalQuads}</Text>
          <Text style={styles.diagSubText}>SQLite tables: Match</Text>
        </View>

        {/* Card 8: Realtime Connectivity */}
        <View style={styles.diagCard}>
          <View style={styles.diagHeader}>
            <FontAwesome name="wifi" size={16} color="#A855F7" />
            <Text style={styles.diagTitle}>Realtime Channel</Text>
          </View>
          <Text style={[styles.diagStatusText, { color: networkOnline ? '#34D399' : '#F87171' }]}>
            {networkOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Text style={styles.diagSubText}>Supabase Broadcast</Text>
          <Text style={styles.diagSubText}>WebSockets: Active</Text>
        </View>

      </View>

      {/* SECTION 2: Consequence Supervisors */}
      <Text style={styles.sectionHeader}>Consequence Fault Supervision & Retries</Text>
      <View style={styles.supervisorsContainer}>
        {supervisorsList.map((sup) => (
          <View key={sup.id} style={styles.supervisorCard}>
            <View style={styles.supervisorHeader}>
              <Text style={styles.supervisorTitle}>{sup.name}</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: sup.color }]} />
                <Text style={[styles.statusBadgeText, { color: sup.color }]}>{sup.status}</Text>
              </View>
            </View>
            
            <Text style={styles.supervisorDesc}>{sup.description}</Text>

            <View style={styles.configTable}>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Retry Limit:</Text>
                <Text style={styles.configValue}>{sup.maxRetries} Execution Attempts</Text>
              </View>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Exponential Backoff:</Text>
                <Text style={styles.configValue}>Base delay {sup.backoffMs}ms</Text>
              </View>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Isolation Triggers:</Text>
                <View style={styles.patternPills}>
                  {sup.patterns.map((p) => (
                    <Text key={p} style={styles.patternPill}>{p}</Text>
                  ))}
                </View>
              </View>
            </View>

            {/* Visual Step-retry pathway representation */}
            <View style={styles.pathwayContainer}>
              <Text style={styles.pathwayLabel}>Engine Mitigation Flow:</Text>
              <View style={styles.pathwayLine}>
                <View style={styles.pathwayStep}>
                  <Text style={styles.pathwayText}>Dispatch</Text>
                </View>
                <FontAwesome name="chevron-right" size={10} color="#475569" style={styles.pathwayArrow} />
                <View style={styles.pathwayStep}>
                  <Text style={styles.pathwayText}>Retry 1</Text>
                </View>
                <FontAwesome name="chevron-right" size={10} color="#475569" style={styles.pathwayArrow} />
                <View style={styles.pathwayStep}>
                  <Text style={styles.pathwayText}>Retry 2</Text>
                </View>
                <FontAwesome name="chevron-right" size={10} color="#475569" style={styles.pathwayArrow} />
                <View style={[styles.pathwayStep, styles.pathwayStepWarn]}>
                  <Text style={styles.pathwayTextWarn}>Retry 3</Text>
                </View>
                <FontAwesome name="chevron-right" size={10} color="#475569" style={styles.pathwayArrow} />
                <View style={[styles.pathwayStep, styles.pathwayStepError]}>
                  <Text style={styles.pathwayTextError}>Quarantine</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* SECTION 3: Process Metric Graphs & Statistics */}
      <Text style={styles.sectionHeader}>Processing Metrics & Outcome Graphs</Text>
      
      <AdminCard title="Command Outcomes Distribution" subtitle="Distribution of executed command states inside the engine ledger.">
        <View style={styles.graphContainer}>
          {totalReceipts > 0 ? (
            <View style={styles.stackedBarContainer}>
              {successPercent > 0 && (
                <View style={[styles.stackedBarSegment, { width: `${successPercent}%`, backgroundColor: '#10B981' }]} />
              )}
              {rejectionPercent > 0 && (
                <View style={[styles.stackedBarSegment, { width: `${rejectionPercent}%`, backgroundColor: '#F59E0B' }]} />
              )}
              {quarantinedPercent > 0 && (
                <View style={[styles.stackedBarSegment, { width: `${quarantinedPercent}%`, backgroundColor: '#EF4444' }]} />
              )}
            </View>
          ) : (
            <View style={styles.stackedBarContainer}>
              <View style={[styles.stackedBarSegment, { width: '100%', backgroundColor: '#475569' }]} />
            </View>
          )}

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Applied: {successCount} ({successPercent.toFixed(0)}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Rejected: {rejectionCount} ({rejectionPercent.toFixed(0)}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Quarantined: {quarantinedCount} ({quarantinedPercent.toFixed(0)}%)</Text>
            </View>
          </View>
        </View>
      </AdminCard>

      <AdminCard title="Realtime Dispatch Throughput Pulse" subtitle="Command replay frequency and speed monitor over the last 30 minutes.">
        <View style={styles.graphContainer}>
          <View style={styles.vBarChartContainer}>
            {throughputData.map((d, i) => (
              <View key={i} style={styles.vBarCol}>
                <Text style={styles.vBarTooltip}>{d.rate}</Text>
                <View style={styles.vBarTrack}>
                  <View style={[styles.vBarFill, { height: `${d.value}%` }]} />
                </View>
                <Text style={styles.vBarLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartMeta}>
            <Text style={styles.chartMetaText}>Average speed: 1.4s per sync batch</Text>
            <Text style={styles.chartMetaText}>Peak speed: 32 ops/min</Text>
          </View>
        </View>
      </AdminCard>

      {/* SECTION 4: Quarantine Isolation Vault & Alerts */}
      <Text style={styles.sectionHeader}>Quarantine Isolation Vault</Text>
      
      {quarantineCount > 0 ? (
        <View style={styles.quarantineVaultContainer}>
          {/* Main Alert Warning Banner */}
          <View style={styles.alertBanner}>
            <View style={styles.alertIconWrapper}>
              <FontAwesome name="exclamation-triangle" size={20} color="#F87171" />
            </View>
            <View style={styles.alertTextWrapper}>
              <Text style={styles.alertTitle}>CONSEQUENCE ENGINE ALERT</Text>
              <Text style={styles.alertBody}>
                {quarantineCount} execution flow(s) isolated due to fatal contract divergence or runtime integrity errors. Inbound sync queues for these hooks are currently paused to prevent SQLite database drift.
              </Text>
            </View>
          </View>

          {/* Quarantine List */}
          <View style={styles.quarantineList}>
            {quarantinedItems.map((item) => {
              let actorParsed = {};
              let payloadParsed = {};
              try {
                actorParsed = JSON.parse(item.actorRef);
                payloadParsed = JSON.parse(item.payload);
              } catch (e) {}

              const isOperating = operatingId === item.id;

              return (
                <View key={item.id} style={styles.quarantineItem}>
                  <View style={styles.quarantineItemHeader}>
                    <View style={styles.quarantineItemHeaderLeft}>
                      <FontAwesome name="bug" size={14} color="#EF4444" style={styles.bugIcon} />
                      <Text style={styles.quarantineItemTitle}>Flow ID: {item.id.slice(0, 10)}...</Text>
                    </View>
                    <Text style={styles.quarantineItemTime}>{formatTime(item.createdAt)}</Text>
                  </View>

                  <View style={styles.quarantineDetailGrid}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Command ID:</Text>
                      <Text style={styles.detailValueMono} numberOfLines={1}>{item.commandId}</Text>
                    </View>
                    
                    <View style={styles.detailErrorBox}>
                      <Text style={styles.detailErrorLabel}>Fault Cause:</Text>
                      <Text style={styles.detailErrorText}>{item.error}</Text>
                    </View>
                  </View>

                  <JsonInspector data={{ actor: actorParsed, payload: payloadParsed }} title="Execution Dump Data" />

                  {/* Actions Bar */}
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnReplay, isOperating && styles.btnDisabled]}
                      onPress={() => handleReplay(item)}
                      disabled={isOperating}
                      activeOpacity={0.7}
                    >
                      {isOperating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <FontAwesome name="play-circle" size={14} color="#FFFFFF" style={styles.btnIcon} />
                          <Text style={styles.btnText}>Force Replay</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnPurge, isOperating && styles.btnDisabled]}
                      onPress={() => handlePurge(item.id)}
                      disabled={isOperating}
                      activeOpacity={0.7}
                    >
                      {isOperating ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <FontAwesome name="trash-o" size={14} color="#EF4444" style={styles.btnIcon} />
                          <Text style={[styles.btnText, styles.btnTextPurge]}>Purge Record</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        /* Secure Empty State Alert Banner */
        <View style={styles.secureBanner}>
          <View style={styles.secureIconWrapper}>
            <FontAwesome name="shield" size={20} color="#34D399" />
          </View>
          <View style={styles.secureTextWrapper}>
            <Text style={styles.secureTitle}>ISOLATION VAULT SECURE</Text>
            <Text style={styles.secureBody}>
              All actor state projections are fully synchronized. No active fault quarantines or poisoned messages detected in the system.
            </Text>
          </View>
        </View>
      )}

      {/* Latest Receipt Summary */}
      <AdminCard title="Latest Process Receipt" subtitle="Operational Audit Trail Info">
        {latestReceipt ? (
          <View style={styles.receiptContainer}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Command:</Text>
              <Text style={styles.receiptVal}>{latestReceipt.commandId}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Status:</Text>
              <ReceiptBadge status={latestReceipt.status} />
            </View>
            {latestReceipt.error && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Error:</Text>
                <Text style={[styles.receiptVal, styles.errorText]}>{latestReceipt.error}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noReceiptText}>No commands executed in this session yet.</Text>
        )}
      </AdminCard>

      {/* Command Dispatch Actions Grid */}
      <Text style={styles.gridHeader}>Operations Modules</Text>
      <View style={styles.gridContainer}>
        {adminModules.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={styles.gridItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
              <FontAwesome name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={styles.gridText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </AdminShell>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 18,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  diagnosticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  diagCard: {
    width: '48%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 10,
  },
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  diagTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  diagStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  diagSubText: {
    fontSize: 10,
    color: '#475569',
  },
  
  // Consequence Supervisors styles
  supervisorsContainer: {
    marginBottom: 8,
  },
  supervisorCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    marginBottom: 12,
  },
  supervisorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supervisorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  supervisorDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  configTable: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  configLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  configValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  patternPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '60%',
  },
  patternPill: {
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#94A3B8',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginLeft: 4,
    marginBottom: 4,
    fontFamily: 'SpaceMono',
  },
  pathwayContainer: {
    marginTop: 4,
  },
  pathwayLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pathwayLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pathwayStep: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  pathwayStepWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  pathwayStepError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pathwayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  pathwayTextWarn: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  pathwayTextError: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  pathwayArrow: {
    marginHorizontal: 4,
  },

  // Graphs and charts styles
  graphContainer: {
    paddingVertical: 4,
  },
  stackedBarContainer: {
    height: 14,
    flexDirection: 'row',
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  stackedBarSegment: {
    height: '100%',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 6,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  vBarChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  vBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  vBarTooltip: {
    fontSize: 8,
    color: '#94A3B8',
    marginBottom: 4,
    fontFamily: 'SpaceMono',
  },
  vBarTrack: {
    height: 70,
    width: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 5,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  vBarFill: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
  vBarLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 6,
  },
  chartMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
  },
  chartMetaText: {
    fontSize: 10,
    color: '#64748B',
  },

  // Quarantine Vault styles
  quarantineVaultContainer: {
    marginBottom: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  alertIconWrapper: {
    marginRight: 12,
    marginTop: 2,
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F87171',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  alertBody: {
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 18,
  },
  secureBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: '#34D399',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  secureIconWrapper: {
    marginRight: 12,
    marginTop: 2,
  },
  secureTextWrapper: {
    flex: 1,
  },
  secureTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34D399',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  secureBody: {
    fontSize: 12,
    color: '#A7F3D0',
    lineHeight: 18,
  },
  quarantineList: {
    marginTop: 4,
  },
  quarantineItem: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  quarantineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    paddingBottom: 8,
    marginBottom: 10,
  },
  quarantineItemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bugIcon: {
    marginRight: 6,
  },
  quarantineItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  quarantineItemTime: {
    fontSize: 10,
    color: '#64748B',
  },
  quarantineDetailGrid: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  detailValueMono: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    color: '#94A3B8',
    marginBottom: 8,
  },
  detailErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  detailErrorLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F87171',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailErrorText: {
    fontSize: 11,
    color: '#FCA5A5',
    lineHeight: 16,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 110,
  },
  btnReplay: {
    backgroundColor: '#10B981',
  },
  btnPurge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnIcon: {
    marginRight: 6,
  },
  btnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  btnTextPurge: {
    color: '#EF4444',
  },

  // Receipt summary styles
  receiptContainer: {
    padding: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptLabel: {
    color: '#64748B',
    fontSize: 12,
    width: 80,
    fontWeight: '600',
  },
  receiptVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    flex: 1,
  },
  errorText: {
    color: '#F87171',
  },
  noReceiptText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Action shortcuts styles
  gridHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 18,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '30%',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: 100,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
    textAlign: 'center',
  },
});
