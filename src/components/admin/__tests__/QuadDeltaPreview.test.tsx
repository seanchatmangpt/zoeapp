import React from 'react';
import { render } from '@testing-library/react-native';
import { QuadDeltaPreview } from '../QuadDeltaPreview';

describe('QuadDeltaPreview', () => {
  it('renders additions correctly', () => {
    const delta = {
      add: [{ subject: { value: 's1' }, predicate: { value: 'p1' }, object: { value: 'o1' } }]
    };
    const { getByText } = render(<QuadDeltaPreview delta={delta} />);
    expect(getByText('+')).toBeTruthy();
    expect(getByText('s1')).toBeTruthy();
    expect(getByText('p1')).toBeTruthy();
    expect(getByText('o1')).toBeTruthy();
  });

  it('renders removals correctly', () => {
    const delta = {
      remove: [{ subject: { value: 's2' }, predicate: { value: 'p2' }, object: { value: 'o2' } }]
    };
    const { getByText } = render(<QuadDeltaPreview delta={delta} />);
    expect(getByText('-')).toBeTruthy();
    expect(getByText('s2')).toBeTruthy();
  });

  it('shortens common URIs', () => {
    const delta = {
      add: [{ 
        subject: { value: 'https://schema.org/Person' }, 
        predicate: { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' }, 
        object: { value: 'o1' } 
      }]
    };
    const { getByText } = render(<QuadDeltaPreview delta={delta} />);
    expect(getByText('schema:Person')).toBeTruthy();
    expect(getByText('rdf:type')).toBeTruthy();
  });

  it('handles empty deltas gracefully', () => {
    const { getByText } = render(<QuadDeltaPreview delta={{ add: [], remove: [] }} />);
    expect(getByText('No changes (empty delta)')).toBeTruthy();
  });

  it('handles invalid JSON strings gracefully', () => {
    const { getByText } = render(<QuadDeltaPreview delta="invalid-json" />);
    expect(getByText('Invalid Delta payload')).toBeTruthy();
  });
});
