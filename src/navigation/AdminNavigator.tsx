import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { RootStackParamList } from '../types';
import { C } from '../theme';

import AdminVenueListScreen from '../screens/admin/AdminVenueListScreen';
import AdminCreateVenueScreen from '../screens/admin/AdminCreateVenueScreen';
import AdminVenueDetailScreen from '../screens/admin/AdminVenueDetailScreen';
import AdminConcertListScreen from '../screens/admin/AdminConcertListScreen';
import AdminConcertFormScreen from '../screens/admin/AdminConcertFormScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: C.bg },
  headerTintColor: C.text,
  headerShadowVisible: false,
  headerRight: () => (
    <TouchableOpacity onPress={() => signOut(auth)}>
      <Text style={{ color: C.muted, fontSize: 14 }}>Logg ut</Text>
    </TouchableOpacity>
  ),
};

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AdminVenueList"
        component={AdminVenueListScreen}
        options={{ title: 'Admin — Nightly', headerRight: undefined }}
      />
      <Stack.Screen
        name="AdminCreateVenue"
        component={AdminCreateVenueScreen}
        options={{ title: 'Nytt sted' }}
      />
      <Stack.Screen
        name="AdminVenueDetail"
        component={AdminVenueDetailScreen}
        options={{ title: 'Rediger sted' }}
      />
      <Stack.Screen
        name="AdminConcertList"
        component={AdminConcertListScreen}
        options={{ title: 'Konserter' }}
      />
      <Stack.Screen
        name="AdminConcertForm"
        component={AdminConcertFormScreen}
        options={({ route }) => ({
          title: route.params?.concertId ? 'Rediger konsert' : 'Ny konsert',
        })}
      />
    </Stack.Navigator>
  );
}
