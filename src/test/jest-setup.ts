/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-native/extend-expect';

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
    Stack: {
      Screen: jest.fn(({ options }) => {
        const Right = options?.headerRight;
        const Left = options?.headerLeft;
        return React.createElement(
          React.Fragment,
          null,
          typeof Right === 'function' ? Right() : Right,
          typeof Left === 'function' ? Left() : Left
        );
      }),
    },
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
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
