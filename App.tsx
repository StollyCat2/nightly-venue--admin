import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuthContext } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import GuardModeScreen from './src/screens/GuardModeScreen';
import { GuardModeProvider, useGuardMode } from './src/context/GuardModeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { C } from './src/theme';

function AppContent() {
  const { user, loading, isAdmin } = useAuthContext();
  const { isGuardMode } = useGuardMode();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (user && isGuardMode && !isAdmin) {
    return (
      <>
        <StatusBar style="light" />
        <GuardModeScreen />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <NavigationContainer>
        <StatusBar style="light" />
        {!user ? (
          <LoginScreen />
        ) : isAdmin ? (
          <AdminNavigator />
        ) : (
          <TabNavigator />
        )}
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GuardModeProvider>
          <AppContent />
        </GuardModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loading: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
