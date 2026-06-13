import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

import CreatorHome from '../screens/creator/CreatorHome';
import CreatorBookings from '../screens/creator/CreatorBookings';
import BookingDetail from '../screens/creator/BookingDetail';
import CreatorLeads from '../screens/creator/CreatorLeads';
import CreatorWallet from '../screens/creator/CreatorWallet';
import CreatorProfile from '../screens/creator/CreatorProfile';
import CreatorNotifications from '../screens/creator/CreatorNotifications';
import CreatorCalendar from '../screens/creator/CreatorCalendar';
import CreatorAvailability from '../screens/creator/CreatorAvailability';
import CreatorPackages from '../screens/creator/CreatorPackages';
import CreatorReviews from '../screens/creator/CreatorReviews';
import CreatorPortfolio from '../screens/creator/CreatorPortfolio';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import BookingsScreen from '../screens/BookingsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CreatorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0F0F0F', borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 8, elevation: 0 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = { Dashboard: focused ? 'grid' : 'grid-outline', Bookings: focused ? 'calendar' : 'calendar-outline', Messages: focused ? 'chatbubble' : 'chatbubble-outline', Profile: focused ? 'person' : 'person-outline' };
          return <Ionicons name={(icons[route.name] || 'grid') as any} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={CreatorHome} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function CreatorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="CreatorTabs" component={CreatorTabs} />
      <Stack.Screen name="CreatorBookings" component={CreatorBookings} />
      <Stack.Screen name="BookingDetail" component={BookingDetail} />
      <Stack.Screen name="CreatorLeads" component={CreatorLeads} />
      <Stack.Screen name="CreatorPortfolio" component={CreatorPortfolio} />
      <Stack.Screen name="CreatorPackages" component={CreatorPackages} />
      <Stack.Screen name="CreatorWallet" component={CreatorWallet} />
      <Stack.Screen name="CreatorReviews" component={CreatorReviews} />
      <Stack.Screen name="CreatorAvailability" component={CreatorAvailability} />
      <Stack.Screen name="CreatorSettings" component={CreatorProfile} />
      <Stack.Screen name="CreatorNotifications" component={CreatorNotifications} />
      <Stack.Screen name="CreatorCalendar" component={CreatorCalendar} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    </Stack.Navigator>
  );
}
