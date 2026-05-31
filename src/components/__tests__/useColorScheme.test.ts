/* eslint-disable import/no-duplicates */
import { useColorScheme as useColorSchemeNative } from '../useColorScheme';
import { useColorScheme as useColorSchemeWeb } from '../useColorScheme.web';

describe('useColorScheme', () => {
  it('native should export useColorScheme from react-native', () => {
    expect(useColorSchemeNative).toBeDefined();
  });

  it('web should always return "light"', () => {
    expect(useColorSchemeWeb()).toBe('light');
  });
});
