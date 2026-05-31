import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function AdminShell({ title, subtitle, children, scrollable = true }: AdminShellProps) {
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="arrow-left">
            <FontAwesome name="arrow-left" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
    backgroundColor: '#0F172A', // Slate 900 base background
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  navRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  navScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
