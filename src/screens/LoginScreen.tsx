import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { C, RADIUS } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Skriv inn e-post og passord.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Feil e-post eller passord.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>nightly</Text>
      <Text style={styles.subtitle}>Venue Admin</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="E-post"
        placeholderTextColor={C.faint}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Passord"
        placeholderTextColor={C.faint}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>Logg inn</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 48,
  },
  input: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: RADIUS,
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  button: {
    backgroundColor: C.text,
    borderRadius: RADIUS,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  error: { color: C.statusRed, textAlign: 'center', marginBottom: 16, fontSize: 14 },
});
