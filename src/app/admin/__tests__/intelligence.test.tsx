import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdminIntelligence from '../intelligence';
import { IntelligenceRunner } from '../../../lib/v2030/intelligence/runner';
import { IntelligenceRegistry } from '../../../lib/v2030/intelligence/registry';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

// Mock intelligence core
jest.mock('../../../lib/v2030/intelligence/runner', () => ({
  IntelligenceRunner: {
    listReplays: jest.fn(() => []),
    run: jest.fn(),
    getReplayArtifact: jest.fn(),
  },
}));

const mockCapabilities = [
  { id: 'truex-receipt-verifier', name: 'TrueX Receipt Verifier', description: 'Verifies receipts' },
  { id: 'concept-drift-detector', name: 'Concept Drift Detector', description: 'Detects drift' },
  { id: 'jtbd-conformance-auditor', name: 'JTBD Conformance Auditor', description: 'Audits JTBD' },
  { id: 'rl-orchestrator-monitor', name: 'RL Orchestrator Monitor', description: 'Monitors RL' },
  { id: 'compliance-safety-guard', name: 'Compliance Safety Guard', description: 'Guards safety' },
  { id: 'unknown-cap', name: 'Unknown Cap', description: 'Unknown' },
];

jest.mock('../../../lib/v2030/intelligence/registry', () => ({
  IntelligenceRegistry: {
    values: jest.fn(() => mockCapabilities),
  },
}));

describe('AdminIntelligence Screen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('renders capabilities correctly', () => {
    const { getByText } = render(<AdminIntelligence />);
    
    expect(getByText('TrueX Receipt Verifier')).toBeTruthy();
    expect(getByText('Concept Drift Detector')).toBeTruthy();
    expect(getByText('Verifies receipts')).toBeTruthy(); // Default selected cap description
  });

  test('can select a different capability', async () => {
    const { getByText } = render(<AdminIntelligence />);
    
    const driftDetector = getByText('Concept Drift Detector');
    await act(async () => {
      fireEvent.press(driftDetector);
    });
    
    expect(getByText('Detects drift')).toBeTruthy();
  });

  test('runs audit and handles success', async () => {
    const mockReceipt = { id: 'receipt-123', capabilityId: 'truex-receipt-verifier', success: true, timestamp: '2026-06-01', deltaHash: 'abc', logs: ['log1'] };
    
    let resolveRun: (value: any) => void;
    const runPromise = new Promise((resolve) => {
      resolveRun = resolve;
    });
    (IntelligenceRunner.run as jest.Mock).mockReturnValueOnce(runPromise);
    
    const { getByText, queryByText, getByTestId } = render(<AdminIntelligence />);
    
    const runBtn = getByText('Run Capability Audit');
    await act(async () => {
      fireEvent.press(runBtn);
    });

    expect(getByTestId('run-intel-truex-receipt-verifier-spinner')).toBeTruthy();
    
    await act(async () => {
      resolveRun(mockReceipt);
    });

    expect(IntelligenceRunner.run).toHaveBeenCalledWith('truex-receipt-verifier', expect.any(Object));
    expect(getByText('ID: receipt-123')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Intelligence Audit Run', 'Execution complete. Success: true');
  });

  test('handles errors during run', async () => {
    (IntelligenceRunner.run as jest.Mock).mockRejectedValueOnce(new Error('Audit failed'));
    
    const { getByText } = render(<AdminIntelligence />);
    
    const runBtn = getByText('Run Capability Audit');
    await act(async () => {
      fireEvent.press(runBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith('Execution Error', 'Audit failed');
  });

  test('renders replays if available and handles selection (drift)', async () => {
    const replayArtifact = {
      receiptId: 'replay-999',
      capabilityId: 'concept-drift-detector',
      timestamp: '2026-06-01T12:00:00Z',
      logs: ['drift log'],
      output: {
        snapshots: [
          { windowIndex: 1, smoothedDistance: 0.1, alert: true },
          { windowIndex: 2, smoothedDistance: 0.0, alert: false }
        ],
        stable: false
      }
    };
    const replayArtifactStable = {
      receiptId: 'replay-999-stable',
      capabilityId: 'concept-drift-detector',
      timestamp: '2026-06-01T12:00:00Z',
      logs: ['drift log'],
      output: {
        snapshots: [],
        stable: true
      }
    };
    (IntelligenceRunner.listReplays as jest.Mock).mockReturnValueOnce([replayArtifact, replayArtifactStable]);
    
    const { getByText } = render(<AdminIntelligence />);
    
    expect(getByText('replay-999')).toBeTruthy();
    
    // Select drift one
    await act(async () => {
      fireEvent.press(getByText('replay-999'));
    });
    expect(getByText('EWMA Concept Drift Visualizer')).toBeTruthy();
    expect(getByText('W1')).toBeTruthy();
    expect(getByText('W2')).toBeTruthy();
    expect(getByText('Status: Drift Detected!')).toBeTruthy();

    // Select stable one
    await act(async () => {
      fireEvent.press(getByText('replay-999-stable'));
    });
    expect(getByText('Status: Stable (No Drift)')).toBeTruthy();
  });

  test('handles empty capabilities and null selectedCapId', async () => {
    (IntelligenceRegistry.values as jest.Mock).mockReturnValueOnce([]);
    const { getByText, queryByText } = render(<AdminIntelligence />);
    
    // selectedCapId will be null
    expect(queryByText('Run Capability Audit')).toBeNull();
  });

  test('covers all getFixtureInputs and scenarios', async () => {
    const { getByText } = render(<AdminIntelligence />);
    
    // jtbd-conformance-auditor
    await act(async () => {
      fireEvent.press(getByText('JTBD Conformance Auditor'));
    });

    // select deviant
    await act(async () => {
      fireEvent.press(getByText('Deviant / Drifted'));
    });
    
    const mockReceipt = { id: 'receipt-jtbd', capabilityId: 'jtbd-conformance-auditor', success: true, timestamp: '2026-06-01', deltaHash: 'abc', logs: [] };
    const mockArtifact = { capabilityId: 'jtbd-conformance-auditor', output: { fitness: 0.9, precision: 0.8, verdict: 'DEVIANT' } };
    
    (IntelligenceRunner.run as jest.Mock).mockResolvedValueOnce(mockReceipt);
    (IntelligenceRunner.getReplayArtifact as jest.Mock).mockReturnValueOnce(mockArtifact);

    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });
    
    expect(IntelligenceRunner.run).toHaveBeenCalledWith('jtbd-conformance-auditor', expect.any(Object));
    expect(getByText('JTBD Conformance Verdict')).toBeTruthy();
    expect(getByText('DEVIANT')).toBeTruthy();

    // Select truthful for coverage
    await act(async () => {
      fireEvent.press(getByText('Conforming / Stable'));
    });

    (IntelligenceRunner.run as jest.Mock).mockResolvedValueOnce(mockReceipt);
    (IntelligenceRunner.getReplayArtifact as jest.Mock).mockReturnValueOnce({
        ...mockArtifact,
        output: { ...mockArtifact.output, verdict: 'TRUTHFUL' }
    });
    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });
    expect(getByText('TRUTHFUL')).toBeTruthy();


    // concept-drift-detector
    await act(async () => {
      fireEvent.press(getByText('Concept Drift Detector'));
    });
    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });
    expect(IntelligenceRunner.run).toHaveBeenCalledWith('concept-drift-detector', expect.any(Object));
    
    await act(async () => {
      fireEvent.press(getByText('Deviant / Drifted'));
    });
    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });

    // rl-orchestrator-monitor
    await act(async () => {
      fireEvent.press(getByText('RL Orchestrator Monitor'));
    });
    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });
    expect(IntelligenceRunner.run).toHaveBeenCalledWith('rl-orchestrator-monitor', expect.any(Object));

    // compliance-safety-guard
    await act(async () => {
      fireEvent.press(getByText('Compliance Safety Guard'));
    });
    // Click Conforming / Stable to test truthful branch
    await act(async () => {
      fireEvent.press(getByText('Conforming / Stable'));
    });
    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });
    expect(IntelligenceRunner.run).toHaveBeenCalledWith('compliance-safety-guard', expect.any(Object));
    
    await act(async () => {
      fireEvent.press(getByText('Deviant / Drifted'));
    });
    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });

    // default / unknown cap
    await act(async () => {
      fireEvent.press(getByText('Unknown Cap'));
    });
    await act(async () => {
      fireEvent.press(getByText('Run Capability Audit'));
    });
    expect(IntelligenceRunner.run).toHaveBeenCalledWith('unknown-cap', expect.any(Object));

  });

  test('covers handleSelectReplay success: false case', async () => {
    const replayArtifact = {
      receiptId: 'replay-888',
      capabilityId: 'jtbd-conformance-auditor',
      timestamp: '2026-06-01T12:00:00Z',
      logs: [],
      // no output -> success false
    };
    (IntelligenceRunner.listReplays as jest.Mock).mockReturnValueOnce([replayArtifact]);
    
    const { getByText } = render(<AdminIntelligence />);
    
    await act(async () => {
      fireEvent.press(getByText('replay-888'));
    });

    expect(getByText('JTBD Conformance Verdict')).toBeTruthy();
  });
});
