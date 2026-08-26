import React from 'react';
import { render } from '@testing-library/react-native';
import { AutonomicSimulator } from '../../lib/v2030/simulation/AutonomicSimulator';
import { Text } from 'react-native';

describe('AutonomicTrustHardening Validation', () => {
  it('logs security escalation when trust is compromised', () => {
    const spy = jest.spyOn(console, 'log');
    AutonomicSimulator.simulateCompromisedTrust(0.1);
    expect(spy).toHaveBeenCalledWith('[AutonomicSimulator] Simulating compromised trust: 0.1');
    spy.mockRestore();
  });
});
