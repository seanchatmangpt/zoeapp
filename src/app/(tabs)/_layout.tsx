import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from '@/src/components/AvatarRelativeProjection';

import Colors from '@/src/constants/Colors';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useClientOnlyValue } from '@/src/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string | import('react-native').ColorValue;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      avatarRelativeProjectionOptions={{
        tabBarActiveTintColor: Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.AvatarRelativeProjection
        name="index"
        options={{
          title: 'Consequence Supervision',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.AvatarRelativeProjection
        name="openai"
        options={{
          href: null, // Quarantined from main tab navigation
        }}
      />
      <Tabs.AvatarRelativeProjection
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <TabBarIcon name="gears" color={color} />,
          tabBarButtonTestID: 'dev-actor-lab-tab',
        }}
      />
    </Tabs>
  );
}
