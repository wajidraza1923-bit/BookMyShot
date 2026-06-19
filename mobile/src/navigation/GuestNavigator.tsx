import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import GuestProfileScreen from '../screens/GuestProfileScreen';
import CreatorProfileScreen from '../screens/CreatorProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import InfoScreen from '../screens/InfoScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import InquiryScreen from '../screens/InquiryScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import PlatformReviewScreen from '../screens/PlatformReviewScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function GuestTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0F0F0F', borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 8, elevation: 0 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = { Home: focused ? 'home' : 'home-outline', Discover: focused ? 'compass' : 'compass-outline', Account: focused ? 'person' : 'person-outline' };
          return <Ionicons name={(icons[route.name] || 'home') as any} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={SearchScreen} />
      <Tab.Screen name="Account" component={GuestProfileScreen} />
    </Tab.Navigator>
  );
}

export default function GuestNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="GuestTabs" component={GuestTabs} />
      <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="Info" component={InfoScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="Inquiry" component={InquiryScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="PlatformReview" component={PlatformReviewScreen} />
    </Stack.Navigator>
  );
}
