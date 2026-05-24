import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, RADIUS } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>✦</Text>
          <Text style={styles.title}>Noe gikk galt</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.btnText}>Prøv igjen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  icon: { fontSize: 40, color: C.accent, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center' },
  message: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 16,
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnText: { color: C.text, fontSize: 14, fontWeight: '600' },
});
