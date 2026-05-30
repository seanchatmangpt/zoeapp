import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Stack, Tabs } from '../AvatarRelativeProjection';

describe('AvatarRelativeProjection (Stack and Tabs Protected Gates)', () => {
  describe('Stack component and Stack.Protected', () => {
    test('renders children inside Stack.Protected when guard is true', () => {
      const { queryByText } = render(
        <Stack>
          <Stack.Protected guard={true}>
            <Text>Guarded Page A</Text>
            <Text>Guarded Page B</Text>
          </Stack.Protected>
          <Text>Always Visible Page</Text>
        </Stack>
      );

      expect(queryByText('Guarded Page A')).toBeTruthy();
      expect(queryByText('Guarded Page B')).toBeTruthy();
      expect(queryByText('Always Visible Page')).toBeTruthy();
    });

    test('excludes children inside Stack.Protected when guard is false', () => {
      const { queryByText } = render(
        <Stack>
          <Stack.Protected guard={false}>
            <Text>Guarded Page A</Text>
            <Text>Guarded Page B</Text>
          </Stack.Protected>
          <Text>Always Visible Page</Text>
        </Stack>
      );

      expect(queryByText('Guarded Page A')).toBeNull();
      expect(queryByText('Guarded Page B')).toBeNull();
      expect(queryByText('Always Visible Page')).toBeTruthy();
    });

    test('ignores non-element children and handles empty/null children gracefully', () => {
      const { queryByText } = render(
        <Stack>
          {null}
          <Stack.Protected guard={true}>
            {null}
            <Text>Valid Child</Text>
          </Stack.Protected>
        </Stack>
      );

      expect(queryByText('Valid Child')).toBeTruthy();
    });
  });

  describe('Tabs component and Tabs.Protected', () => {
    test('renders children inside Tabs.Protected when guard is true', () => {
      const { queryByText } = render(
        <Tabs>
          <Tabs.Protected guard={true}>
            <Text>Guarded Tab A</Text>
            <Text>Guarded Tab B</Text>
          </Tabs.Protected>
          <Text>Always Visible Tab</Text>
        </Tabs>
      );

      expect(queryByText('Guarded Tab A')).toBeTruthy();
      expect(queryByText('Guarded Tab B')).toBeTruthy();
      expect(queryByText('Always Visible Tab')).toBeTruthy();
    });

    test('excludes children inside Tabs.Protected when guard is false', () => {
      const { queryByText } = render(
        <Tabs>
          <Tabs.Protected guard={false}>
            <Text>Guarded Tab A</Text>
            <Text>Guarded Tab B</Text>
          </Tabs.Protected>
          <Text>Always Visible Tab</Text>
        </Tabs>
      );

      expect(queryByText('Guarded Tab A')).toBeNull();
      expect(queryByText('Guarded Tab B')).toBeNull();
      expect(queryByText('Always Visible Tab')).toBeTruthy();
    });

    test('ignores non-element children and handles empty/null children gracefully', () => {
      const { queryByText } = render(
        <Tabs>
          {null}
          <Tabs.Protected guard={true}>
            {null}
            <Text>Valid Tab Child</Text>
          </Tabs.Protected>
        </Tabs>
      );

      expect(queryByText('Valid Tab Child')).toBeTruthy();
    });
  });
});
