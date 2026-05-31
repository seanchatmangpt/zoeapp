import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminSermons from '../sermons';
import { Alert } from 'react-native';
import { globalLocalDispatcher } from '@/src/lib/actor/actorOps';



// Mock inner components that might use contexts or icons
jest.mock('../../../components/admin/AdminShell', () => {
  const { View, Text } = require('react-native');
  return {
    AdminShell: ({ title, subtitle, children }: any) => (
      <View>
        <Text>{title}</Text>
        <Text>{subtitle}</Text>
        {children}
      </View>
    ),
  };
});

jest.mock('../../../components/admin/AdminCard', () => {
  const { View, Text } = require('react-native');
  return {
    AdminCard: ({ title, subtitle, children }: any) => (
      <View>
        <Text>{title}</Text>
        <Text>{subtitle}</Text>
        {children}
      </View>
    ),
  };
});

jest.mock('../../../components/admin/CommandButton', () => {
  const { Pressable, Text } = require('react-native');
  return {
    CommandButton: ({ title, onPress, testID }: any) => (
      <Pressable onPress={onPress} testID={testID}>
        <Text>{title}</Text>
      </Pressable>
    ),
  };
});


describe('AdminSermons Component', () => {
  beforeEach(() => {
    console.log('DEBUG globalLocalDispatcher:', globalLocalDispatcher);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<AdminSermons />);
    expect(getByText('Sermons Directory')).toBeTruthy();
    expect(getByTestId('sermon-title-input')).toBeTruthy();
    expect(getByTestId('sermon-video-input')).toBeTruthy();
  });

  it('validates empty title on publish', () => {
    const { getByTestId } = render(<AdminSermons />);
    const publishBtn = getByTestId('publish-sermon-submit');
    
    fireEvent.press(publishBtn);
    expect(Alert.alert).toHaveBeenCalledWith('Validation Error', 'Sermon Title cannot be empty.');
    expect(globalLocalDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('successfully dispatches a sermon and shows receipt', async () => {
    (globalLocalDispatcher.dispatch as jest.Mock).mockResolvedValueOnce({
      status: 'accepted_pending',
      commandId: 'cmd_123',
    });

    const { getByTestId, getByText, queryByText } = render(<AdminSermons />);
    
    fireEvent.changeText(getByTestId('sermon-title-input'), 'Sunday Message');
    fireEvent.changeText(getByTestId('sermon-video-input'), 'https://vid.com');
    
    fireEvent.press(getByTestId('publish-sermon-submit'));

    await waitFor(() => {
      expect(globalLocalDispatcher.dispatch).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Command Dispatched',
        'Sermon published locally! Command is queued in outbox.'
      );
    });

    // Inputs should be cleared
    expect(getByTestId('sermon-title-input').props.value).toBe('');

    // Receipt should appear
    expect(getByText('Execution Receipt Output')).toBeTruthy();
    expect(getByText('cmd_123')).toBeTruthy();
  });

  it('handles rejection receipt', async () => {
    (globalLocalDispatcher.dispatch as jest.Mock).mockResolvedValueOnce({
      status: 'rejected',
      commandId: 'cmd_999',
      error: 'AuthorizationError: User not allowed',
    });

    const { getByTestId, getByText } = render(<AdminSermons />);
    
    fireEvent.changeText(getByTestId('sermon-title-input'), 'Bad Sermon');
    fireEvent.press(getByTestId('publish-sermon-submit'));

    await waitFor(() => {
      expect(globalLocalDispatcher.dispatch).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Rejection', expect.stringContaining('Execution rejected'));
    });

    expect(getByText('Rejection Details')).toBeTruthy();
    expect(getByTestId('latest-error-code').props.children).toBe('AUTHZ_DENIED');
  });

  it('handles dispatch exception', async () => {
    (globalLocalDispatcher.dispatch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

    const { getByTestId } = render(<AdminSermons />);
    fireEvent.changeText(getByTestId('sermon-title-input'), 'Sermon');
    fireEvent.press(getByTestId('publish-sermon-submit'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network failure');
    });
  });

  it('handles focus and blur for inputs', () => {
    const { getByTestId } = render(<AdminSermons />);
    const titleInput = getByTestId('sermon-title-input');
    const videoInput = getByTestId('sermon-video-input');

    fireEvent(titleInput, 'focus');
    fireEvent(titleInput, 'blur');

    fireEvent(videoInput, 'focus');
    fireEvent(videoInput, 'blur');
  });

  it('handles rejection receipt with other error (INPUT_INVALID)', async () => {
    (globalLocalDispatcher.dispatch as jest.Mock).mockResolvedValueOnce({
      status: 'rejected',
      commandId: 'cmd_1000',
      error: 'ValidationError: Input invalid',
    });

    const { getByTestId, getByText } = render(<AdminSermons />);
    
    fireEvent.changeText(getByTestId('sermon-title-input'), 'Sermon 2');
    fireEvent.press(getByTestId('publish-sermon-submit'));

    await waitFor(() => {
      expect(globalLocalDispatcher.dispatch).toHaveBeenCalled();
    });

    expect(getByTestId('latest-error-code').props.children).toBe('INPUT_INVALID');
  });
});
