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
import AllCreatorsScreen from '../screens/AllCreatorsScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SubCategoriesScreen from '../screens/SubCategoriesScreen';
import NearMeScreen from '../screens/NearMeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function GuestTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F1F5F9', borderTopWidth: 1, height: 68, paddingBottom: 12, paddingTop: 8, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
        tabBarActiveTintColor: '#6C3BFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = { Home: focused ? 'home' : 'home-outline', 'Near Me': focused ? 'location' : 'location-outline', Account: focused ? 'person' : 'person-outline' };
          return <Ionicons name={(icons[route.name] || 'home') as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Near Me" component={NearMeScreen} />
      <Tab.Screen name="Account" component={GuestProfileScreen} />
    </Tab.Navigator>
  );
}

export default function GuestNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#FFFFFF' } }}>
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
      <Stack.Screen name="AllCreators" component={AllCreatorsScreen} />
      <Stack.Screen name="SubCategories" component={SubCategoriesScreen} />
      <Stack.Screen name="NearMe" component={NearMeScreen} />
      <Stack.Screen name="Discover" component={SearchScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
