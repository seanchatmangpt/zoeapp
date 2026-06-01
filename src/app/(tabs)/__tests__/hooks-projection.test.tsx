import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HooksProjection from '../hooks';
import * as VkgProviderModule from '@/src/components/VkgProvider';

jest.mock('@/src/components/VkgProvider', () => {
  const actual = jest.requireActual('@/src/components/VkgProvider');
  return {
    ...actual,
    useVkgEngine: jest.fn(),
  };
});

describe('Truex Hooks Projection View', () => {
  let mockEngine: any;

  beforeEach(() => {
    mockEngine = {
      pendingReceipts: 0,
      processedReceipts: 0,
      quarantinedHooks: [],
      lastReceipt: null,
      avatar: 'member',
      setAvatar: jest.fn(),
      projection: null,
      triggerHook: jest.fn(),
      repairLastQuarantine: jest.fn(),
      activeHookId: 'volunteer_shortage',
      setActiveHookId: jest.fn(),
      triggerLivestream: jest.fn(),
    };
    (VkgProviderModule.useVkgEngine as jest.Mock).mockReturnValue(mockEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render cockpit, allow avatar switching, and show hidden state for guest', () => {
    const { getByText } = render(<HooksProjection />);

    expect(getByText('Truex Hook Cockpit')).toBeTruthy();
    expect(getByText('[HIDDEN] No projection visible for guest avatar.')).toBeTruthy();

    const guestBtn = getByText('guest');
    fireEvent.press(guestBtn);
    expect(mockEngine.setAvatar).toHaveBeenCalledWith('guest');
  });

  test('should show projection details with allowed actions', () => {
    mockEngine.projection = {
      visible: true,
      surface: 'help_invitation',
      payload: { message: 'Help needed' },
      allowedActions: ['accept', 'decline'],
    };
    const { getByText } = render(<HooksProjection />);
    
    expect(getByText('HELP_INVITATION')).toBeTruthy();
    expect(getByText('Help needed')).toBeTruthy();
    expect(getByText('accept')).toBeTruthy();
    expect(getByText('decline')).toBeTruthy();
  });

  test('should show projection details without payload message and actions', () => {
    mockEngine.projection = {
      visible: true,
      surface: 'info_surface',
      payload: null,
      allowedActions: [],
    };
    const { getByText } = render(<HooksProjection />);
    
    expect(getByText('INFO_SURFACE')).toBeTruthy();
    expect(getByText('Projection matches active role.')).toBeTruthy();
    expect(getByText('No actions permitted for this role.')).toBeTruthy();
  });

  test('should display quarantined state and trigger repair', () => {
    mockEngine.quarantinedHooks = ['hook_123'];
    const { getByText } = render(<HooksProjection />);
    
    expect(getByText('HOOK QUARANTINED')).toBeTruthy();
    
    const repairBtn = getByText('Trigger Repair & Replay');
    fireEvent.press(repairBtn);
    expect(mockEngine.repairLastQuarantine).toHaveBeenCalled();
  });

  test('should show pending receipts state', () => {
    mockEngine.pendingReceipts = 1;
    const { getByText } = render(<HooksProjection />);
    
    expect(getByText('Processing optimistic sync...')).toBeTruthy();
  });

  test('should show reconciled state when processed > 0 and pending == 0 and not quarantined', () => {
    mockEngine.processedReceipts = 1;
    mockEngine.pendingReceipts = 0;
    mockEngine.quarantinedHooks = [];
    const { getByText } = render(<HooksProjection />);
    
    expect(getByText('Evidence Reconciled ✅')).toBeTruthy();
  });

  test('should NOT show reconciled state when quarantined', () => {
    mockEngine.processedReceipts = 1;
    mockEngine.pendingReceipts = 0;
    mockEngine.quarantinedHooks = ['hook_fail'];
    const { queryByText } = render(<HooksProjection />);
    
    expect(queryByText('Evidence Reconciled ✅')).toBeNull();
  });

  test('should show last receipt', () => {
    mockEngine.lastReceipt = {
      receiptHash: 'hash_456',
      status: 'settled',
      messageId: 'msg_999',
    };
    const { getByText } = render(<HooksProjection />);
    
    expect(getByText('Hash: hash_456')).toBeTruthy();
    expect(getByText('settled')).toBeTruthy();
    expect(getByText('msg_999')).toBeTruthy();
  });

  test('should trigger volunteer cancellation command', () => {
    const { getByText } = render(<HooksProjection />);
    
    const triggerBtn = getByText('Trigger Volunteer Cancellation');
    fireEvent.press(triggerBtn);
    expect(mockEngine.triggerHook).toHaveBeenCalledWith('volunteer_123', 'volunteer_cancel', 'shift_abc');
  });

  test('should allow switching to livestream scenario and triggering livestream actions', () => {
    const { getByText } = render(<HooksProjection />);

    // Try clicking the toggle button
    const liveScenarioBtn = getByText('Livestream Incident');
    fireEvent.press(liveScenarioBtn);
    expect(mockEngine.setActiveHookId).toHaveBeenCalledWith('livestream_degradation');

    // Manually switch activeHookId in mockEngine for UI update test
    mockEngine.activeHookId = 'livestream_degradation';
    const { getByText: getByTextLive } = render(<HooksProjection />);

    const degradeBtn = getByTextLive('Trigger Bitrate Degradation (1200kbps, 10% loss)');
    fireEvent.press(degradeBtn);
    expect(mockEngine.triggerLivestream).toHaveBeenCalledWith('degrade', 1200, 0.10);

    const escalateBtn = getByTextLive('Escalate Incident (High Priority)');
    fireEvent.press(escalateBtn);
    expect(mockEngine.triggerLivestream).toHaveBeenCalledWith('escalate');

    const resolveBtn = getByTextLive('Resolve Livestream Incident');
    fireEvent.press(resolveBtn);
    expect(mockEngine.triggerLivestream).toHaveBeenCalledWith('resolve');
  });
});
