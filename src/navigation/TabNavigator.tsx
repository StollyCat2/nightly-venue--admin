import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { C, RADIUS } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import EveningMessageScreen from '../screens/EveningMessageScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import ProfileScreen from '../screens/venue/ProfileScreen';

const Tab = createBottomTabNavigator();
const EventsStack = createNativeStackNavigator();

const logoutButton = () => (
  <TouchableOpacity onPress={() => signOut(auth)} style={styles.logout}>
    <Text style={styles.logoutText}>Logg ut</Text>
  </TouchableOpacity>
);

const logoutButtonRed = () => (
  <TouchableOpacity onPress={() => signOut(auth)} style={styles.logout}>
    <Text style={styles.logoutRed}>Logg ut</Text>
  </TouchableOpacity>
);

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={styles.tabIconWrap}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

function EventsStackScreen() {
  return (
    <EventsStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: C.bg },
      headerTintColor: C.text,
      headerShadowVisible: false,
    }}>
      <EventsStack.Screen name="EventsList" component={EventsScreen} options={{ title: 'Arrangementer' }} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: '' }} />
    </EventsStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.text,
        headerShadowVisible: false,
        headerRight: logoutButton,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Kø',
          tabBarLabel: 'Kø',
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="EveningMessage"
        component={EveningMessageScreen}
        options={{
          title: 'I kveld',
          tabBarLabel: 'I kveld',
          tabBarIcon: ({ focused }) => <TabIcon icon="🌙" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsStackScreen}
        options={{
          title: 'Arrangementer',
          tabBarLabel: 'Arr.',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="🎟️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: 'Statistikk',
          tabBarLabel: 'Statistikk',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
          headerRight: logoutButtonRed,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  logout: { marginRight: 16 },
  logoutText: { color: C.muted, fontSize: 14 },
  logoutRed: { color: '#ff2244', fontSize: 14, fontWeight: '600' },
  tabIconWrap: { alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 18, color: C.faint },
  tabIconActive: { color: C.accent },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent },
});
