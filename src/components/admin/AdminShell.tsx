import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  testID?: string;
}

export function AdminShell({ title, subtitle, children, scrollable = true, testID }: AdminShellProps) {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/admin/consequence-supervision' as any);
    }
  };

  const ContentContainer = scrollable ? ScrollView : View;

  const navigationItems = [
    { name: 'Dashboard', route: '/admin/consequence-supervision' },
    { name: 'Actor Lab', route: '/admin/actor-lab' },
    { name: 'Sermons', route: '/admin/sermons' },
    { name: 'Process Intel', route: '/admin/intelligence' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} testID={testID}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="admin-back-btn" activeOpacity={0.7}>
            <FontAwesome name="arrow-left" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>

        {/* Quick Admin Navigation Bar */}
        <View style={styles.navRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
            {navigationItems.map((item) => {
              const isActive = title === item.name || 
                (item.name === 'Dashboard' && title === 'Developer Consequence Supervision') ||
                (item.name === 'Process Intel' && title === 'Process Intelligence') ||
                (item.name === 'Actor Lab' && title === 'Developer Actor Lab') ||
                (item.name === 'Sermons' && title === 'Sermons Directory');
              return (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => router.replace(item.route as any)}
                  style={[styles.navButton, isActive && styles.navButtonActive]}
                  activeOpacity={0.7}
                  testID={`nav-${item.name.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Workspace */}
        <ContentContainer 
          style={styles.content}
          contentContainerStyle={scrollable ? styles.scrollContent : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ContentContainer>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A', // slate-900 base background
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B', // slate-800
    backgroundColor: '#0F172A',
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  navRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  navScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1E293B', // slate-800
    borderWidth: 1,
    borderColor: '#334155', // slate-700
  },
  navButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  navButtonTextActive: {
    color: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
