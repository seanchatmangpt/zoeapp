import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminCard } from '../../components/admin/AdminCard';
import { AvatarRelativeProjectionMatrixView } from '../../components/AvatarRelativeProjection';
import { supabase } from '../../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Message {
  id: string;
  channel: string;
  payload: any;
  timestamp: string;
}

interface MessageItemProps {
  msg: Message;
}

function MessageItem({ msg }: MessageItemProps) {
  const [slideAnim] = React.useState(() => new Animated.Value(-20));
  const [opacityAnim] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'actor_commands': return '#3B82F6'; // Blue
      case 'actor_events': return '#8B5CF6'; // Purple
      case 'actor_receipts': return '#10B981'; // Green
      case 'rdf_quads_ld': return '#06B6D4'; // Cyan
      default: return '#64748B'; // Slate
    }
  };

  const channelColor = getChannelColor(msg.channel);

  return (
    <Animated.View style={[
      styles.msgItem,
      {
        opacity: opacityAnim,
        transform: [{ translateY: slideAnim }],
        borderLeftColor: channelColor
      }
    ]}>
      <View style={styles.msgHeader}>
        <View style={[styles.msgChannelBadge, { backgroundColor: channelColor + '15', borderColor: channelColor }]}>
          <Text style={[styles.msgChannelText, { color: channelColor }]}>{msg.channel}</Text>
        </View>
        <Text style={styles.msgTime}>{msg.timestamp}</Text>
      </View>
      <Text style={styles.msgJson}>{JSON.stringify(msg.payload, null, 2)}</Text>
    </Animated.View>
  );
}

export default function AdminRealtime() {
  const [isConnected, setIsConnected] = React.useState(true);
  const [latency, setLatency] = React.useState(42);
  const [messages, setMessages] = React.useState<Message[]>(() => [
    {
      id: 'msg-init-1',
      channel: 'rdf_quads_ld',
      payload: { action: 'UPSERT', table: 'rdf_quads_ld', record: { subject: 'volunteer_123', predicate: 'has_status', object: 'shortage' } },
      timestamp: new Date(Date.now() - 10000).toLocaleTimeString(),
    },
    {
      id: 'msg-init-2',
      channel: 'actor_commands',
      payload: { action: 'INSERT', table: 'actor_commands', record: { command: 'volunteer_cancel', actor_ref: 'volunteer_shortage', principal: 'member' } },
      timestamp: new Date(Date.now() - 5000).toLocaleTimeString(),
    }
  ]);

  // Connection pulse animation
  const [pulseAnim] = React.useState(() => new Animated.Value(1));
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: isConnected ? 1000 : 350,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: isConnected ? 1000 : 350,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [isConnected]);

  // Latency fluctuation simulation
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        setLatency(prev => {
          const diff = Math.floor(Math.random() * 11) - 5; // -5 to +5
          return Math.max(10, Math.min(120, prev + diff));
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const addMessage = React.useCallback((channel: string, payload: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages(prev => [
      {
        id: 'msg-' + Math.random().toString(36).substr(2, 9),
        channel,
        payload,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 19)
    ]);
  }, []);

  // Supabase Realtime Listener Setup
  React.useEffect(() => {
    if (!isConnected) return;
    
    // Subscribe to CDC updates
    const channel = supabase
      .channel('admin-realtime-cdc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actor_commands' }, (payload) => {
        addMessage('actor_commands', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actor_events' }, (payload) => {
        addMessage('actor_events', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actor_receipts' }, (payload) => {
        addMessage('actor_receipts', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdf_quads_ld' }, (payload) => {
        addMessage('rdf_quads_ld', payload);
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConnected, addMessage]);

  const simulateMessage = (channel: string) => {
    let payload = {};
    if (channel === 'actor_commands') {
      const cmds = ['volunteer_signup', 'volunteer_cancel', 'confirm_shift', 'flag_shortage'];
      const roles = ['member', 'volunteer', 'teamLead', 'pastor'];
      payload = {
        action: 'INSERT',
        table: 'actor_commands',
        record: {
          id: 'cmd_' + Math.random().toString(36).substr(2, 9),
          command: cmds[Math.floor(Math.random() * cmds.length)],
          actor_ref: 'volunteer_shortage',
          principal: { role: roles[Math.floor(Math.random() * roles.length)], id: 'usr_abc' },
          timestamp: new Date().toISOString()
        }
      };
    } else if (channel === 'actor_events') {
      const events = ['slot_opened', 'shift_assigned', 'risk_acknowledged'];
      payload = {
        action: 'INSERT',
        table: 'actor_events',
        record: {
          id: 'evt_' + Math.random().toString(36).substr(2, 9),
          command_id: 'cmd_' + Math.random().toString(36).substr(2, 9),
          type: events[Math.floor(Math.random() * events.length)],
          payload: { detail: 'Simulated realtime event logging' },
          timestamp: new Date().toISOString()
        }
      };
    } else if (channel === 'actor_receipts') {
      const statuses = ['Confirmed', 'Rejected_Remote', 'accepted_pending'];
      payload = {
        action: 'INSERT',
        table: 'actor_receipts',
        record: {
          id: 'rec_' + Math.random().toString(36).substr(2, 9),
          command_id: 'cmd_' + Math.random().toString(36).substr(2, 9),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          delta_hash: 'hash_' + Math.random().toString(36).substr(2, 5),
          timestamp: new Date().toISOString()
        }
      };
    } else if (channel === 'rdf_quads_ld') {
      const subjects = ['volunteer_123', 'shift_abc', 'risk_summary_default'];
      const predicates = ['has_status', 'allocated_to', 'shortage_ratio'];
      const objects = ['shortage', 'Sarah Brown', '0.62'];
      payload = {
        action: 'UPSERT',
        table: 'rdf_quads_ld',
        record: {
          subject: subjects[Math.floor(Math.random() * subjects.length)],
          predicate: predicates[Math.floor(Math.random() * predicates.length)],
          object: objects[Math.floor(Math.random() * objects.length)],
          graph: 'default_graph'
        }
      };
    }
    
    addMessage(channel, payload);
  };

  const clearMessages = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages([]);
  };

  return (
    <AdminShell title="Realtime Channels" subtitle="Authoritative CDC and message subscription channels">
      
      {/* Supabase connection status */}
      <AdminCard 
        title="Supabase Realtime Status" 
        subtitle="Socket and subscription states"
        headerRight={
          <TouchableOpacity 
            style={[styles.toggleBtn, { borderColor: isConnected ? '#10B981' : '#EF4444' }]} 
            onPress={() => setIsConnected(!isConnected)}
          >
            <Text style={[styles.toggleBtnText, { color: isConnected ? '#10B981' : '#EF4444' }]}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.row}>
          <Text style={styles.label}>Connection State:</Text>
          <View style={styles.badgeWrapper}>
            <Animated.View style={[
              styles.statusDot, 
              { 
                backgroundColor: isConnected ? '#10B981' : '#EF4444',
                opacity: pulseAnim
              }
            ]} />
            <Text style={[styles.val, isConnected ? styles.greenText : styles.redText]}>
              {isConnected ? 'Connected' : 'Offline / Error'}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Client Mode:</Text>
          <Text style={styles.val}>Websocket (Realtime v2)</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Latency / Echo Rate:</Text>
          <Text style={styles.val}>{isConnected ? `${latency}ms` : '—'}</Text>
        </View>
      </AdminCard>

      {/* Simulator Control Panel */}
      <AdminCard title="Real-Time Event Simulator" subtitle="Simulate database CDC inserts & updates">
        <View style={styles.simulatorGrid}>
          <TouchableOpacity style={[styles.simBtn, { borderLeftColor: '#3B82F6' }]} onPress={() => simulateMessage('actor_commands')}>
            <Text style={styles.simBtnText}>⚡ Command</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.simBtn, { borderLeftColor: '#8B5CF6' }]} onPress={() => simulateMessage('actor_events')}>
            <Text style={styles.simBtnText}>⚡ Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.simBtn, { borderLeftColor: '#10B981' }]} onPress={() => simulateMessage('actor_receipts')}>
            <Text style={styles.simBtnText}>⚡ Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.simBtn, { borderLeftColor: '#06B6D4' }]} onPress={() => simulateMessage('rdf_quads_ld')}>
            <Text style={styles.simBtnText}>⚡ RDF Quad</Text>
          </TouchableOpacity>
        </View>
      </AdminCard>

      {/* Live subscription feed */}
      <AdminCard 
        title="Live Messages Feed" 
        subtitle="WebSocket packet log (latest first)"
        headerRight={
          messages.length > 0 ? (
            <TouchableOpacity onPress={clearMessages}>
              <Text style={styles.clearText}>Clear Log</Text>
            </TouchableOpacity>
          ) : undefined
        }
      >
        <View style={styles.feedContainer}>
          {messages.length > 0 ? (
            messages.map(msg => (
              <MessageItem key={msg.id} msg={msg} />
            ))
          ) : (
            <View style={styles.emptyFeed}>
              <FontAwesome name="hourglass-o" size={24} color="#64748B" />
              <Text style={styles.emptyFeedText}>No real-time messages received yet.</Text>
            </View>
          )}
        </View>
      </AdminCard>

      {/* Projection Matrix */}
      <AdminCard title="Avatar Projection Matrix" subtitle="Authoritative permission filters for the current state">
        <AvatarRelativeProjectionMatrixView />
      </AdminCard>

    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
  },
  val: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  greenText: {
    color: '#10B981',
  },
  redText: {
    color: '#EF4444',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  simulatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  simBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  simBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  feedContainer: {
    gap: 8,
    maxHeight: 400,
  },
  clearText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyFeed: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyFeedText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  msgItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  msgChannelBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
  },
  msgChannelText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  msgTime: {
    color: '#64748B',
    fontSize: 10,
  },
  msgJson: {
    color: '#E2E8F0',
    fontFamily: 'monospace',
    fontSize: 10,
    backgroundColor: '#090D16',
    padding: 8,
    borderRadius: 6,
    lineHeight: 14,
  },
});
