import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import BookingsScreen from '../screens/BookingsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreatorProfileScreen from '../screens/CreatorProfileScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import SavedCreatorsScreen from '../screens/SavedCreatorsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0F0F0F', borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 8, elevation: 0 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = { Home: focused ? 'home' : 'home-outline', Discover: focused ? 'compass' : 'compass-outline', Bookings: focused ? 'calendar' : 'calendar-outline', Messages: focused ? 'chatbubble' : 'chatbubble-outline', Profile: focused ? 'person' : 'person-outline' };
          return <Ionicons name={(icons[route.name] || 'home') as any} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={SearchScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="SavedCreators" component={SavedCreatorsScreen} />
    </Stack.Navigator>
  );
}
