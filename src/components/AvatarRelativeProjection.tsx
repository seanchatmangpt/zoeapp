import React from 'react';
import { Stack as ExpoStack, Tabs as ExpoTabs } from 'expo-router';

type CustomStackType = any;
type CustomTabsType = any;

// Helper component for conditional gating
export const StackProtected: React.FC<{ guard: boolean; children: React.ReactNode }> = ({ guard, children }) => {
  return guard ? <>{children}</> : null;
};
StackProtected.displayName = 'StackProtected';

export const TabsProtected: React.FC<{ guard: boolean; children: React.ReactNode }> = ({ guard, children }) => {
  return guard ? <>{children}</> : null;
};
TabsProtected.displayName = 'TabsProtected';

const StackComponent = React.forwardRef<any, any>(({ avatarRelativeProjectionOptions, screenOptions, children, ...props }, ref) => {
  // Filter children so that only matching guarded screens are passed as direct children to React Navigation
  const processedChildren = React.useMemo(() => {
    const list: React.ReactNode[] = [];
    React.Children.forEach(children, (child) => {
      if (!child || !React.isValidElement(child)) return;

      if (child.type === StackProtected || (child.type as any).displayName === 'StackProtected') {
        const guardedChild = child as React.ReactElement<any>;
        if (guardedChild.props.guard) {
          React.Children.forEach(guardedChild.props.children, (nestedChild) => {
            if (nestedChild) list.push(nestedChild);
          });
        }
      } else {
        list.push(child);
      }
    });
    return list;
  }, [children]);

  return (
    <ExpoStack
      ref={ref}
      screenOptions={avatarRelativeProjectionOptions || screenOptions}
      {...props}
    >
      {processedChildren}
    </ExpoStack>
  );
});
StackComponent.displayName = 'StackComponent';

export const Stack = Object.assign(StackComponent, ExpoStack, {
  AvatarRelativeProjection: ExpoStack.Screen,
  Protected: StackProtected,
}) as unknown as CustomStackType;

import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AvatarRole } from '../lib/truex/avatar/types';
import { PROJECTION_MATRIX } from '../lib/truex/avatar/matrix';

const TabsComponent = React.forwardRef<any, any>(({ avatarRelativeProjectionOptions, screenOptions, children, ...props }, ref) => {
  const processedChildren = React.useMemo(() => {
    const list: React.ReactNode[] = [];
    React.Children.forEach(children, (child) => {
      if (!child || !React.isValidElement(child)) return;

      if (child.type === TabsProtected || (child.type as any).displayName === 'TabsProtected') {
        const guardedChild = child as React.ReactElement<any>;
        if (guardedChild.props.guard) {
          React.Children.forEach(guardedChild.props.children, (nestedChild) => {
            if (nestedChild) list.push(nestedChild);
          });
        }
      } else {
        list.push(child);
      }
    });
    return list;
  }, [children]);

  return (
    <ExpoTabs
      ref={ref}
      screenOptions={avatarRelativeProjectionOptions || screenOptions}
      {...props}
    >
      {processedChildren}
    </ExpoTabs>
  );
});
TabsComponent.displayName = 'TabsComponent';

export const Tabs = Object.assign(TabsComponent, ExpoTabs, {
  AvatarRelativeProjection: ExpoTabs.Screen,
  Protected: TabsProtected,
}) as unknown as CustomTabsType;

export interface AvatarRelativeProjectionMatrixViewProps {
  initialData?: {
    openSlots?: number;
    candidates?: string[];
    shortageRatio?: number;
    runId?: string;
    history?: Array<{ timestamp: string; event: string; detail: string }>;
    topology?: { nodes: number; channels: number; supervisorStatus: string };
    stateHash?: string;
  };
}

export function AvatarRelativeProjectionMatrixView({ initialData }: AvatarRelativeProjectionMatrixViewProps) {
  const [openSlots, setOpenSlots] = React.useState(initialData?.openSlots ?? 4);
  const [candidates, setCandidates] = React.useState<string[]>(initialData?.candidates ?? ['Sarah Brown', 'Michael Green', 'David White']);
  const [stateHash, setStateHash] = React.useState(initialData?.stateHash ?? 'vkg_genesis_a4f9');
  
  const shortageRatio = Number((openSlots / 8).toFixed(2));
  
  const data = React.useMemo(() => ({
    openSlots,
    candidates,
    shortageRatio,
    runId: initialData?.runId ?? 'run-9988',
    history: initialData?.history ?? [
      { timestamp: '16:21:05', event: 'slot_opened', detail: 'Slot opened by cancellation' },
      { timestamp: '16:20:12', event: 'shift_assigned', detail: 'Sarah assigned by teamLead' }
    ],
    topology: initialData?.topology ?? { nodes: 12, channels: 4, supervisorStatus: 'healthy' },
    stateHash,
  }), [openSlots, candidates, shortageRatio, stateHash, initialData]);

  const roles: AvatarRole[] = ['guest', 'member', 'volunteer', 'teamLead', 'pastor', 'admin', 'operator'];

  const getRoleColor = (role: AvatarRole) => {
    switch (role) {
      case 'guest': return '#64748B'; // Slate
      case 'member': return '#3B82F6'; // Blue
      case 'volunteer': return '#10B981'; // Green
      case 'teamLead': return '#8B5CF6'; // Purple
      case 'pastor': return '#F59E0B'; // Amber
      case 'admin': return '#EF4444'; // Red
      case 'operator': return '#06B6D4'; // Cyan
    }
  };

  const addCandidate = () => {
    const names = ['Emma Stone', 'Liam Neeson', 'Olivia Wilde', 'Noah Centineo', 'Sophia Loren', 'Lucas Scott'];
    const randomName = names[Math.floor(Math.random() * names.length)] + ` (${candidates.length + 1})`;
    setCandidates([...candidates, randomName]);
  };

  const removeCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  return (
    <View style={matrixStyles.container}>
      <Text style={matrixStyles.sectionTitle}>Interactive Projection Control</Text>
      
      {/* Controls */}
      <View style={matrixStyles.controlsCard}>
        <View style={matrixStyles.controlRow}>
          <View style={matrixStyles.controlCol}>
            <Text style={matrixStyles.controlLabel}>Open Slots: {openSlots}</Text>
            <View style={matrixStyles.btnGroup}>
              <TouchableOpacity 
                style={matrixStyles.smallBtn} 
                onPress={() => setOpenSlots(Math.max(0, openSlots - 1))}
              >
                <Text style={matrixStyles.btnText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={matrixStyles.smallBtn} 
                onPress={() => setOpenSlots(Math.min(8, openSlots + 1))}
              >
                <Text style={matrixStyles.btnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={matrixStyles.controlCol}>
            <Text style={matrixStyles.controlLabel}>Shortage Ratio: {shortageRatio}</Text>
            <View style={matrixStyles.ratioIndicatorContainer}>
              <View style={[matrixStyles.ratioIndicator, { width: `${shortageRatio * 100}%`, backgroundColor: shortageRatio > 0.6 ? '#EF4444' : shortageRatio > 0.3 ? '#F59E0B' : '#10B981' }]} />
            </View>
          </View>
        </View>

        <View style={matrixStyles.divider} />

        {/* Interactive Slider Section */}
        <View style={matrixStyles.sliderSection}>
          <Text style={matrixStyles.controlLabel}>Interactive Open Slots Slider</Text>
          <View style={matrixStyles.sliderWrapper}>
            <View style={matrixStyles.sliderTrack} testID="slider-track">
              <View style={[matrixStyles.sliderFill, { width: `${(openSlots / 8) * 100}%` }]} />
              <View style={matrixStyles.sliderStepsContainer}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((val) => (
                  <TouchableOpacity
                    key={val}
                    testID={`slider-step-${val}`}
                    style={[
                      matrixStyles.sliderStepPoint,
                      openSlots === val && matrixStyles.sliderStepPointActive
                    ]}
                    onPress={() => setOpenSlots(val)}
                    accessibilityLabel={`Set open slots to ${val}`}
                  >
                    <Text style={[
                      matrixStyles.sliderStepText,
                      openSlots === val && matrixStyles.sliderStepTextActive
                    ]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={matrixStyles.divider} />

        <View style={matrixStyles.candidatesSection}>
          <View style={matrixStyles.candidatesHeader}>
            <Text style={matrixStyles.controlLabel}>Candidates ({candidates.length})</Text>
            <TouchableOpacity style={matrixStyles.addBtn} onPress={addCandidate}>
              <Text style={matrixStyles.addBtnText}>+ Add Candidate</Text>
            </TouchableOpacity>
          </View>
          <View style={matrixStyles.candidatesList}>
            {candidates.map((cand, idx) => (
              <View key={idx} style={matrixStyles.candidateBadge}>
                <Text style={matrixStyles.candidateText} numberOfLines={1}>{cand}</Text>
                <TouchableOpacity onPress={() => removeCandidate(idx)}>
                  <FontAwesome name="times-circle" size={12} color="#EF4444" style={matrixStyles.removeIcon} />
                </TouchableOpacity>
              </View>
            ))}
            {candidates.length === 0 && (
              <Text style={matrixStyles.noCandidatesText}>No candidates defined.</Text>
            )}
          </View>
        </View>

        <View style={matrixStyles.divider} />

        <View style={matrixStyles.stateHashSection}>
          <Text style={matrixStyles.controlLabel}>VKG State Hash</Text>
          <TextInput
            style={matrixStyles.textInput}
            value={stateHash}
            onChangeText={setStateHash}
            placeholder="State hash (e.g. vkg_genesis_a4f9)"
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <Text style={matrixStyles.sectionTitle}>Evaluated Projection Grid</Text>
      
      {/* Grid of Projections */}
      <View style={matrixStyles.grid}>
        {roles.map((role) => {
          const projection = PROJECTION_MATRIX.volunteer_shortage(data, role);
          const roleColor = getRoleColor(role);
          
          return (
            <View key={role} style={[matrixStyles.roleCard, !projection.visible && matrixStyles.roleCardHidden]}>
              {/* Card Header */}
              <View style={[matrixStyles.roleHeader, { borderLeftColor: roleColor }]}>
                <View style={matrixStyles.roleTitleContainer}>
                  <View style={[matrixStyles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor }]}>
                    <Text style={[matrixStyles.roleBadgeText, { color: roleColor }]}>{role}</Text>
                  </View>
                  <Text style={matrixStyles.surfaceText}>{projection.surface.toUpperCase()}</Text>
                </View>
                <View style={matrixStyles.visibilityBadge}>
                  <FontAwesome 
                    name={projection.visible ? "eye" : "eye-slash"} 
                    size={14} 
                    color={projection.visible ? "#10B981" : "#64748B"} 
                  />
                  <Text style={[matrixStyles.visibilityText, { color: projection.visible ? "#10B981" : "#64748B" }]}>
                    {projection.visible ? "Visible" : "Hidden"}
                  </Text>
                </View>
              </View>

              {/* Card Body */}
              {projection.visible ? (
                <View style={matrixStyles.cardBody}>
                  {projection.payload?.message && (
                    <Text style={matrixStyles.messageText}>{projection.payload.message}</Text>
                  )}

                  {/* Actions */}
                  <View style={matrixStyles.actionsGroup}>
                    <Text style={matrixStyles.cardLabel}>Allowed Actions:</Text>
                    <View style={matrixStyles.actionBadgesList}>
                      {projection.allowedActions.length > 0 ? (
                        projection.allowedActions.map((act) => (
                          <View key={act} style={matrixStyles.actionBadge}>
                            <Text style={matrixStyles.actionBadgeText}>⚡ {act}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={matrixStyles.noActionsText}>None</Text>
                      )}
                    </View>
                  </View>

                  {/* Payload Details */}
                  <View style={matrixStyles.payloadSection}>
                    <Text style={matrixStyles.cardLabel}>Projected Payload State:</Text>
                    <View style={matrixStyles.payloadBox}>
                      {role === 'member' && (
                        <Text style={matrixStyles.payloadText}>• Context: Volunteer encouragement</Text>
                      )}
                      {role === 'volunteer' && (
                        <Text style={matrixStyles.payloadText}>• Open slots count: {projection.payload?.openSlots}</Text>
                      )}
                      {role === 'teamLead' && (
                        <Text style={matrixStyles.payloadText}>• Candidates count: {projection.payload?.candidates?.length ?? 0}</Text>
                      )}
                      {role === 'pastor' && (
                        <View>
                          <Text style={matrixStyles.payloadText}>• Risk Level: {projection.payload?.riskLevel}</Text>
                          <Text style={matrixStyles.payloadText}>• Shortage Ratio: {projection.payload?.shortageRatio}</Text>
                        </View>
                      )}
                      {role === 'admin' && (
                        <View>
                          <Text style={matrixStyles.payloadText}>• Run ID: {projection.payload?.runId}</Text>
                          <Text style={matrixStyles.payloadText}>• History Logs: {projection.payload?.history?.length ?? 0} entries</Text>
                        </View>
                      )}
                      {role === 'operator' && (
                        <View>
                          <Text style={matrixStyles.payloadText}>• Nodes count: {projection.payload?.topology?.nodes ?? 0}</Text>
                          <Text style={matrixStyles.payloadText}>• State Hash: {projection.payload?.stateHash}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={matrixStyles.cardBodyHidden}>
                  <Text style={matrixStyles.hiddenMessage}>
                    This avatar role does not have authorization to view this state projection.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const matrixStyles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controlsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  controlCol: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratioIndicatorContainer: {
    height: 10,
    backgroundColor: '#0F172A',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 10,
  },
  ratioIndicator: {
    height: '100%',
    borderRadius: 5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
  candidatesSection: {
    width: '100%',
  },
  candidatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  addBtnText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: 'bold',
  },
  candidatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  candidateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  candidateText: {
    color: '#E2E8F0',
    fontSize: 11,
    marginRight: 6,
    maxWidth: 100,
  },
  removeIcon: {
    marginLeft: 2,
  },
  noCandidatesText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  stateHashSection: {
    width: '100%',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    color: '#F8FAFC',
    fontSize: 12,
  },
  grid: {
    gap: 12,
  },
  roleCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  roleCardHidden: {
    borderColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  roleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  surfaceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    padding: 12,
  },
  cardBodyHidden: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenMessage: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  actionsGroup: {
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  actionBadgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noActionsText: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },
  payloadSection: {
    marginTop: 4,
  },
  payloadBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  payloadText: {
    color: '#38BDF8',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 15,
  },
  sliderSection: {
    marginBottom: 12,
  },
  sliderWrapper: {
    height: 36,
    justifyContent: 'center',
    marginVertical: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    position: 'relative',
    width: '100%',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderStepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    height: 36,
  },
  sliderStepPoint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderStepPointActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  sliderStepText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sliderStepTextActive: {
    color: '#FFFFFF',
  },
});
