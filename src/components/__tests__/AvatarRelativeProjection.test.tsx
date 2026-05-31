import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Stack, Tabs, AvatarRelativeProjectionMatrixView } from '../AvatarRelativeProjection';
import { PROJECTION_MATRIX } from '../../lib/truex/avatar/matrix';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockFontAwesome = (props: any) => React.createElement(View, { ...props, testID: props.name });
  MockFontAwesome.displayName = 'MockFontAwesome';
  return MockFontAwesome;
});

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

describe('AvatarRelativeProjectionMatrixView', () => {
  test('renders with initialData and handles default layout values', () => {
    const { getByText } = render(<AvatarRelativeProjectionMatrixView />);

    expect(getByText('Interactive Projection Control')).toBeTruthy();
    expect(getByText('Open Slots: 4')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0.5')).toBeTruthy();
    expect(getByText('Candidates (3)')).toBeTruthy();

    // Check roles projections are rendered in the grid
    expect(getByText('member')).toBeTruthy();
    expect(getByText('volunteer')).toBeTruthy();
    expect(getByText('teamLead')).toBeTruthy();
    expect(getByText('pastor')).toBeTruthy();
    expect(getByText('admin')).toBeTruthy();
    expect(getByText('operator')).toBeTruthy();

    // Check default payload projection values
    expect(getByText('• Open slots count: 4')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0.5')).toBeTruthy();
    expect(getByText('• Candidates count: 3')).toBeTruthy();
    expect(getByText('• State Hash: vkg_genesis_a4f9')).toBeTruthy();
  });

  test('renders with custom initialData', () => {
    const customData = {
      openSlots: 6,
      candidates: ['Alice Smith', 'Bob Jones'],
      stateHash: 'custom_hash_123',
    };
    const { getByText } = render(<AvatarRelativeProjectionMatrixView initialData={customData} />);

    expect(getByText('Open Slots: 6')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0.75')).toBeTruthy();
    expect(getByText('Candidates (2)')).toBeTruthy();
    expect(getByText('• Open slots count: 6')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0.75')).toBeTruthy();
    expect(getByText('• Candidates count: 2')).toBeTruthy();
    expect(getByText('• State Hash: custom_hash_123')).toBeTruthy();
  });

  test('open slots increment/decrement trigger shortage ratio and projection recalculation', () => {
    const { getByText } = render(<AvatarRelativeProjectionMatrixView initialData={{ openSlots: 4 }} />);

    // Initial state: openSlots: 4, shortageRatio: 0.5
    expect(getByText('Open Slots: 4')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0.5')).toBeTruthy();
    expect(getByText('• Open slots count: 4')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0.5')).toBeTruthy();

    const plusBtn = getByText('+');
    const minusBtn = getByText('-');

    // Increment open slots to 5
    fireEvent.press(plusBtn);
    expect(getByText('Open Slots: 5')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0.63')).toBeTruthy(); // 5 / 8 = 0.625 -> 0.63
    expect(getByText('• Open slots count: 5')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0.63')).toBeTruthy();

    // Decrement open slots to 3
    fireEvent.press(minusBtn);
    fireEvent.press(minusBtn);
    expect(getByText('Open Slots: 3')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0.38')).toBeTruthy(); // 3 / 8 = 0.375 -> 0.38
    expect(getByText('• Open slots count: 3')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0.38')).toBeTruthy();

    // Test minimum boundary (0)
    for (let i = 0; i < 5; i++) {
      fireEvent.press(minusBtn);
    }
    expect(getByText('Open Slots: 0')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0')).toBeTruthy();
    expect(getByText('• Open slots count: 0')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0')).toBeTruthy();

    // Test maximum boundary (8)
    for (let i = 0; i < 10; i++) {
      fireEvent.press(plusBtn);
    }
    expect(getByText('Open Slots: 8')).toBeTruthy();
    expect(getByText('Shortage Ratio: 1')).toBeTruthy();
    expect(getByText('• Open slots count: 8')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 1')).toBeTruthy();
  });

  test('adding and removing candidates triggers projection recalculation for teamLead', () => {
    const { getByText, getAllByTestId } = render(<AvatarRelativeProjectionMatrixView />);

    expect(getByText('Candidates (3)')).toBeTruthy();
    expect(getByText('• Candidates count: 3')).toBeTruthy();

    // Add candidate
    const addBtn = getByText('+ Add Candidate');
    fireEvent.press(addBtn);

    expect(getByText('Candidates (4)')).toBeTruthy();
    expect(getByText('• Candidates count: 4')).toBeTruthy();

    // Remove candidate
    const removeBtns = getAllByTestId('times-circle');
    // Remove the first candidate
    fireEvent.press(removeBtns[0]);

    expect(getByText('Candidates (3)')).toBeTruthy();
    expect(getByText('• Candidates count: 3')).toBeTruthy();
  });

  test('state hash input updates state hash and triggers operator projection recalculation', () => {
    const { getByPlaceholderText, getByText } = render(<AvatarRelativeProjectionMatrixView />);

    expect(getByText('• State Hash: vkg_genesis_a4f9')).toBeTruthy();

    const textInput = getByPlaceholderText('State hash (e.g. vkg_genesis_a4f9)');
    fireEvent.changeText(textInput, 'vkg_genesis_new_hash');

    expect(getByText('• State Hash: vkg_genesis_new_hash')).toBeTruthy();
  });

  test('interactive open slots slider updates slots value, shortage ratio, and pastor risk level dynamically', () => {
    const { getByTestId, getByText } = render(<AvatarRelativeProjectionMatrixView initialData={{ openSlots: 4 }} />);

    // Initial state: openSlots: 4, shortageRatio: 0.5, riskLevel: Medium
    expect(getByText('Open Slots: 4')).toBeTruthy();
    expect(getByText('• Risk Level: Medium')).toBeTruthy();

    // Click slider step 2
    const step2 = getByTestId('slider-step-2');
    fireEvent.press(step2);

    expect(getByText('Open Slots: 2')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0.25')).toBeTruthy();
    expect(getByText('• Risk Level: Low')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0.25')).toBeTruthy();

    // Click slider step 6
    const step6 = getByTestId('slider-step-6');
    fireEvent.press(step6);

    expect(getByText('Open Slots: 6')).toBeTruthy();
    expect(getByText('Shortage Ratio: 0.75')).toBeTruthy();
    expect(getByText('• Risk Level: High')).toBeTruthy();
    expect(getByText('• Shortage Ratio: 0.75')).toBeTruthy();
  });

  test('pastor risk level ranges map correctly to shortage ratios (Low, Medium, High)', () => {
    const { getByTestId, getByText } = render(<AvatarRelativeProjectionMatrixView initialData={{ openSlots: 0 }} />);

    // openSlots = 0 (ratio 0.0) -> Low
    expect(getByText('Shortage Ratio: 0')).toBeTruthy();
    expect(getByText('• Risk Level: Low')).toBeTruthy();

    // openSlots = 2 (ratio 0.25) -> Low
    fireEvent.press(getByTestId('slider-step-2'));
    expect(getByText('Shortage Ratio: 0.25')).toBeTruthy();
    expect(getByText('• Risk Level: Low')).toBeTruthy();

    // openSlots = 3 (ratio 0.38) -> Medium
    fireEvent.press(getByTestId('slider-step-3'));
    expect(getByText('Shortage Ratio: 0.38')).toBeTruthy();
    expect(getByText('• Risk Level: Medium')).toBeTruthy();

    // openSlots = 5 (ratio 0.63) -> High
    fireEvent.press(getByTestId('slider-step-5'));
    expect(getByText('Shortage Ratio: 0.63')).toBeTruthy();
    expect(getByText('• Risk Level: High')).toBeTruthy();
  });

  test('has correct accessibility properties on interactive controls', () => {
    const { getByLabelText, getByPlaceholderText, getByTestId } = render(<AvatarRelativeProjectionMatrixView />);
    
    // Increment / Decrement buttons
    expect(getByLabelText('Decrease open slots').props.accessibilityRole).toBe('button');
    expect(getByLabelText('Increase open slots').props.accessibilityRole).toBe('button');

    // Slider step points
    const step4 = getByTestId('slider-step-4');
    expect(step4.props.accessibilityRole).toBe('button');
    expect(step4.props.accessibilityState).toEqual({ selected: true });

    // Add candidate button
    expect(getByLabelText('Add Candidate').props.accessibilityRole).toBe('button');

    // TextInput
    const textInput = getByPlaceholderText('State hash (e.g. vkg_genesis_a4f9)');
    expect(textInput.props.accessibilityLabel).toBe('VKG State Hash input');
    expect(textInput.props.accessibilityHint).toBe('Edit the VKG state hash');
  });

  test('eliminates double-renders and avoids unnecessary re-calculation of unaffected roles', () => {
    const spy = jest.spyOn(PROJECTION_MATRIX, 'volunteer_shortage');
    spy.mockClear();

    const { getByPlaceholderText } = render(<AvatarRelativeProjectionMatrixView />);
    expect(spy).toHaveBeenCalledTimes(7);

    spy.mockClear();

    const textInput = getByPlaceholderText('State hash (e.g. vkg_genesis_a4f9)');
    fireEvent.changeText(textInput, 'vkg_genesis_new_hash_1');

    // Only Operator card should re-render and invoke the projector function
    expect(spy).toHaveBeenCalledTimes(1);
    const lastCall = spy.mock.calls[0];
    expect(lastCall[1]).toBe('operator');
    expect(lastCall[0].stateHash).toBe('vkg_genesis_new_hash_1');

    spy.mockRestore();
  });

  test('adding candidates only recalculates teamLead projection card', () => {
    const spy = jest.spyOn(PROJECTION_MATRIX, 'volunteer_shortage');
    spy.mockClear();

    const { getByText } = render(<AvatarRelativeProjectionMatrixView />);
    expect(spy).toHaveBeenCalledTimes(7);

    spy.mockClear();

    const addBtn = getByText('+ Add Candidate');
    fireEvent.press(addBtn);

    // Only teamLead card should re-render and invoke the projector function
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toBe('teamLead');

    spy.mockRestore();
  });
});
