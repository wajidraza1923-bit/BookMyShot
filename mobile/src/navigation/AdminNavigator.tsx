import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminPromotions from '../screens/admin/AdminPromotions';
import AdminCreators from '../screens/admin/AdminCreators';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="AdminPromotions" component={AdminPromotions} />
      <Stack.Screen name="AdminCreators" component={AdminCreators} />
    </Stack.Navigator>
  );
}
