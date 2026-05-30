import React from 'react';
import { Stack as ExpoStack, Tabs as ExpoTabs } from 'expo-router';

type CustomStackType = any;
type CustomTabsType = any;

const StackComponent = React.forwardRef<any, any>(({ avatarRelativeProjectionOptions, screenOptions, ...props }, ref) => {
  return (
    <ExpoStack
      ref={ref}
      screenOptions={avatarRelativeProjectionOptions || screenOptions}
      {...props}
    />
  );
});
StackComponent.displayName = 'StackComponent';

export const Stack = Object.assign(StackComponent, ExpoStack, {
  AvatarRelativeProjection: ExpoStack.Screen,
}) as unknown as CustomStackType;

const TabsComponent = React.forwardRef<any, any>(({ avatarRelativeProjectionOptions, screenOptions, ...props }, ref) => {
  return (
    <ExpoTabs
      ref={ref}
      screenOptions={avatarRelativeProjectionOptions || screenOptions}
      {...props}
    />
  );
});
TabsComponent.displayName = 'TabsComponent';

export const Tabs = Object.assign(TabsComponent, ExpoTabs, {
  AvatarRelativeProjection: ExpoTabs.Screen,
}) as unknown as CustomTabsType;
