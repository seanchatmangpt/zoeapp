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
