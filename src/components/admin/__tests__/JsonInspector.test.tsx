import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { JsonInspector } from '../JsonInspector';

describe('JsonInspector', () => {
  it('renders title correctly and defaults to collapsed', () => {
    const { getByText, queryByTestId } = render(
      <JsonInspector data={{ foo: 'bar' }} title="Test Payload" testID="inspector" />
    );
    expect(getByText('Test Payload')).toBeTruthy();
    expect(queryByTestId('inspector-body')).toBeNull();
  });

  it('expands to show formatted JSON when clicked', () => {
    const data = { hello: 'world' };
    const { getByTestId, getByText } = render(
      <JsonInspector data={data} title="Data" testID="inspector" />
    );
    
    fireEvent.press(getByTestId('inspector-toggle'));
    
    expect(getByTestId('inspector-body')).toBeTruthy();
    // Stringify output contains the keys
    expect(getByText(/"hello": "world"/)).toBeTruthy();
  });

  it('handles invalid JSON strings gracefully', () => {
    const { getByTestId, getByText } = render(
      <JsonInspector data="Just a regular string" testID="inspector" />
    );
    
    fireEvent.press(getByTestId('inspector-toggle'));
    
    expect(getByTestId('inspector-body')).toBeTruthy();
    expect(getByText('Just a regular string')).toBeTruthy();
  });

  it('handles already parsed objects', () => {
    const { getByTestId, getByText } = render(
      <JsonInspector data={{ key: 'value' }} testID="inspector" />
    );
    
    fireEvent.press(getByTestId('inspector-toggle'));
    expect(getByText(/"key": "value"/)).toBeTruthy();
  });
});
