/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };
  const React = require('react');
  return {
    useRouter: () => mockRouter,
    router: mockRouter,
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: any) => {
      React.useEffect(effect, [effect]);
    },
    Stack: (() => {
      const MockStack = ({ children }: any) => children;
      const MockScreen = jest.fn(({ options }: any) => {
        const Right = options?.headerRight;
        const Left = options?.headerLeft;
        return React.createElement(
          React.Fragment,
          null,
          typeof Right === 'function' ? Right() : Right,
          typeof Left === 'function' ? Left() : Left
        );
      });
      MockStack.Screen = MockScreen;
      MockStack.AvatarRelativeProjection = MockScreen;
      MockStack.Protected = ({ children }: any) => children;
      return MockStack;
    })(),
    Tabs: (() => {
      const MockTabs = ({ children }: any) => children;
      const MockScreen = jest.fn();
      MockTabs.Screen = MockScreen;
      MockTabs.AvatarRelativeProjection = MockScreen;
      return MockTabs;
    })(),
  };
});

// Mock React Navigation
jest.mock('expo-router/react-navigation', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => React.createElement('View', props),
  };
});
