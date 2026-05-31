import React from 'react';
import { render } from '@testing-library/react-native';
import { AdminMetric } from '../AdminMetric';

describe('AdminMetric', () => {
  it('renders label and value correctly', () => {
    const { getByText } = render(
      <AdminMetric label="Total Users" value="1,024" icon="users" />
    );
    expect(getByText('Total Users')).toBeTruthy();
    expect(getByText('1,024')).toBeTruthy();
  });

  it('renders trend information when provided', () => {
    const { getByText } = render(
      <AdminMetric 
        label="Revenue" 
        value="$12k" 
        icon="money" 
        trend="12%" 
        trendDirection="up" 
      />
    );
    expect(getByText('▲ 12%')).toBeTruthy();
  });

  it('renders down trend properly', () => {
    const { getByText } = render(
      <AdminMetric 
        label="Errors" 
        value="5" 
        icon="bug" 
        trend="2%" 
        trendDirection="down" 
      />
    );
    expect(getByText('▼ 2%')).toBeTruthy();
  });

  it('renders neutral trend properly', () => {
    const { getByText } = render(
      <AdminMetric 
        label="Visits" 
        value="100" 
        icon="eye" 
        trend="0%" 
        trendDirection="neutral" 
      />
    );
    expect(getByText('— 0%')).toBeTruthy();
  });

  it('applies accessibility attributes correctly', () => {
    const { getByTestId } = render(
      <AdminMetric label="Active Connections" value="42" icon="plug" trend="5%" trendDirection="up" testID="metric-conn" />
    );

    const container = getByTestId('metric-conn');
    expect(container.props.accessible).toBe(true);
    expect(container.props.accessibilityLabel).toBe('Metric: Active Connections, Value: 42, trend: 5%');
  });
});
