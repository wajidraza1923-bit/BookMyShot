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
import BookingChatScreen from '../screens/BookingChatScreen';
import SavedCreatorsScreen from '../screens/SavedCreatorsScreen';
import InfoScreen from '../screens/InfoScreen';
import InquiryScreen from '../screens/InquiryScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import PlatformReviewScreen from '../screens/PlatformReviewScreen';
import AllCreatorsScreen from '../screens/AllCreatorsScreen';
import AllCategoriesScreen from '../screens/AllCategoriesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PricingScreen from '../screens/PricingScreen';
import CreatorNotifications from '../screens/creator/CreatorNotifications';
import PaymentProofScreen from '../screens/PaymentProofScreen';
import SubCategoriesScreen from '../screens/SubCategoriesScreen';
import NearMeScreen from '../screens/NearMeScreen';
import WalletScreen from '../screens/WalletScreen';
import BookingPaymentScreen from '../screens/BookingPaymentScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB', borderTopWidth: 1, height: 72, paddingBottom: 16, paddingTop: 10, paddingHorizontal: 8, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
        tabBarActiveTintColor: '#6C3BFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, marginTop: 3 },
        tabBarItemStyle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = { Home: focused ? 'home' : 'home-outline', 'Near Me': focused ? 'location' : 'location-outline', Account: focused ? 'person' : 'person-outline' };
          return <Ionicons name={(icons[route.name] || 'home') as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Near Me" component={NearMeScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="BookingChat" component={BookingChatScreen} />
      <Stack.Screen name="SavedCreators" component={SavedCreatorsScreen} />
      <Stack.Screen name="Info" component={InfoScreen} />
      <Stack.Screen name="Inquiry" component={InquiryScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="PlatformReview" component={PlatformReviewScreen} />
      <Stack.Screen name="AllCreators" component={AllCreatorsScreen} />
      <Stack.Screen name="AllCategories" component={AllCategoriesScreen} />
      <Stack.Screen name="SubCategories" component={SubCategoriesScreen} />
      <Stack.Screen name="NearMe" component={NearMeScreen} />
      <Stack.Screen name="Discover" component={SearchScreen} />
      <Stack.Screen name="Pricing" component={PricingScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="BookingPayment" component={BookingPaymentScreen} />
      <Stack.Screen name="Bookings" component={BookingsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="CreatorNotifications" component={CreatorNotifications} />
      <Stack.Screen name="PaymentProof" component={PaymentProofScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
