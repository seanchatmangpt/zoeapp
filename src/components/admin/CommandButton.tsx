import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface CommandButtonProps {
  title: string;
  onPress: () => Promise<any>;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  testID?: string;
}

export function CommandButton({ title, onPress, style, textStyle, disabled = false, testID }: CommandButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onPress();
    } catch (e) {
      console.error('[CommandButton] execution failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle = [
    styles.button,
    disabled && styles.disabledButton,
    style
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={buttonStyle}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#F8FAFC" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563EB', // Blue 600
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#334155', // Slate 700
    opacity: 0.6,
  },
  text: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
