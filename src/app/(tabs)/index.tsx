import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSession } from '@/context/SessionProvider';
import { Ionicons } from '@expo/vector-icons';
import { PostCyberpunkProvider } from '@pcp/v30/post-cyberpunk/core/PostCyberpunkProvider';
import { useLawEngine } from '@pcp/v30/post-cyberpunk/law-engine';
import { useAgiCourt } from '@pcp/v30/post-cyberpunk/agi-court';
import { GlassCard } from '@pcp/ui/glassmorphism/GlassCard';
import { HolographicGlassCard } from '@pcp/2030/ui-holographic/HolographicGlassCard';

/**
 * ZOEapp Dashboard (Post-Cyberpunk Edition)
 * An Expo/Supabase application surface powered by the PCP Framework.
 */
export default function PcpDashboard() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <PostCyberpunkProvider systemSecret="zoe-secret" laws={[]}>
      <DashboardContent user={session?.user} />
    </PostCyberpunkProvider>
  );
}

function DashboardContent({ user }: { user: any }) {
  const { submitClaim } = useLawEngine({ 
    laws: [], 
    boundary: { execute: async () => ({ id: 'r1', artifactId: 'a1', executionTime: Date.now(), status: 'SUCCESS' }) }
  });
  const [actuationStatus, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const handleActuation = async () => {
    setStatus('processing');
    // Simulate a Blue River Dam lifecycle transition
    await submitClaim({
      id: `act_${Date.now()}`,
      description: 'Actuating ministry context via Post-Cyberpunk law',
      requiredEvidence: ['ZKP_AUTH', 'HARDWARE_ATTESTATION']
    } as any);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 px-6 py-12">
      <View className="mb-10">
        <Text className="text-4xl font-black text-white tracking-tighter mb-2">
          PCP DASHBOARD
        </Text>
        <Text className="text-slate-400 text-lg font-medium">
          Post-Cyberpunk Operating Substrate
        </Text>
      </View>

      <HolographicGlassCard className="p-6 mb-8">
        <View className="flex-row items-center mb-4">
          <View className="bg-violet-500/20 p-3 rounded-2xl mr-4">
            <Ionicons name="shield-checkmark" size={24} color="#A78BFA" />
          </View>
          <View>
            <Text className="text-white text-xl font-bold">Reality Actuator</Text>
            <Text className="text-slate-400 text-sm">Blue River Dam v30.1.2</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleActuation}
          disabled={actuationStatus === 'processing'}
          className={`h-14 rounded-2xl items-center justify-center ${
            actuationStatus === 'processing' ? 'bg-slate-800' : 'bg-violet-600'
          }`}
        >
          {actuationStatus === 'processing' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              {actuationStatus === 'success' ? 'REALITY MANUFACTURED' : 'ACTUATE LAW'}
            </Text>
          )}
        </TouchableOpacity>
      </HolographicGlassCard>

      <View className="flex-row space-x-4 mb-8">
        <View className="flex-1">
          <GlassCard intensity="low" className="p-5 h-32 justify-between">
            <Ionicons name="people" size={20} color="#94A3B8" />
            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase">Community</Text>
              <Text className="text-white text-xl font-black">ACTIVE</Text>
            </View>
          </GlassCard>
        </View>
        <View className="flex-1">
          <GlassCard intensity="low" className="p-5 h-32 justify-between">
            <Ionicons name="radio" size={20} color="#94A3B8" />
            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase">Livestream</Text>
              <Text className="text-emerald-400 text-xl font-black">LIVE</Text>
            </View>
          </GlassCard>
        </View>
      </View>

      <View className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 mb-12">
        <Text className="text-slate-300 font-bold mb-4 uppercase tracking-widest text-xs">
          Internal Court (AGI Court)
        </Text>
        <View className="space-y-3">
          {[
            { label: 'Witness Lattice', status: 'ADMITTED' },
            { label: 'ZKP Boundary', status: 'VERIFIED' },
            { label: 'Causal Window', status: 'GATED' },
          ].map((item, i) => (
            <View key={i} className="flex-row justify-between items-center py-2 border-b border-slate-800/50">
              <Text className="text-slate-400 font-medium">{item.label}</Text>
              <Text className="text-violet-400 font-mono text-xs font-bold">{item.status}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="items-center opacity-30">
        <Text className="text-slate-500 font-mono text-[10px]">
          SESSION_ID: {user?.id?.slice(0, 12)}...
        </Text>
        <Text className="text-slate-500 font-mono text-[10px]">
          PCP_FOUNDRY_V30_OMEGA
        </Text>
      </View>
    </ScrollView>
  );
}
