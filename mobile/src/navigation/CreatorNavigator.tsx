import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

import CreatorHome from '../screens/creator/CreatorHome';
import CreatorBookings from '../screens/creator/CreatorBookings';
import BookingDetail from '../screens/creator/BookingDetail';
import CreatorLeads from '../screens/creator/CreatorLeads';
import CreateInquiry from '../screens/creator/CreateInquiry';
import CreatorWallet from '../screens/creator/CreatorWallet';
import CreatorProfile from '../screens/creator/CreatorProfile';
import CreatorNotifications from '../screens/creator/CreatorNotifications';
import CreatorCalendar from '../screens/creator/CreatorCalendar';
import CreatorAvailability from '../screens/creator/CreatorAvailability';
import CreatorServiceAreas from '../screens/creator/CreatorServiceAreas';
import CreatorOnboardingScreen from '../screens/CreatorOnboardingScreen';
import CreatorPendingScreen from '../screens/CreatorPendingScreen';
import { useAuth } from '../context/AuthContext';
import CreatorPackages from '../screens/creator/CreatorPackages';
import CreatorReviews from '../screens/creator/CreatorReviews';
import CreatorPortfolio from '../screens/creator/CreatorPortfolio';
import CreatorSubscription from '../screens/creator/CreatorSubscription';
import CreatorPromotions from '../screens/creator/CreatorPromotions';
import CreatorPaymentVerification from '../screens/creator/CreatorPaymentVerification';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import BookingChatScreen from '../screens/BookingChatScreen';
import BookingsScreen from '../screens/BookingsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreatorProfileScreen from '../screens/CreatorProfileScreen';
import InquiryScreen from '../screens/InquiryScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CreatorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB', borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 8, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = { Dashboard: focused ? 'grid' : 'grid-outline', Bookings: focused ? 'calendar' : 'calendar-outline', Calendar: focused ? 'today' : 'today-outline', Messages: focused ? 'chatbubble' : 'chatbubble-outline', Profile: focused ? 'person' : 'person-outline' };
          return <Ionicons name={(icons[route.name] || 'grid') as any} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={CreatorHome} />
      <Tab.Screen name="Bookings" component={CreatorBookings} />
      <Tab.Screen name="Calendar" component={CreatorCalendar} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function CreatorNavigator() {
  const { user } = useAuth();
  
  // Three states:
  // 1. onboardingCompleted is false → needs onboarding (first login, hasn't filled details)
  // 2. onboardingCompleted is true but status is pending/rejected → show pending verification screen
  // 3. Approved → show normal dashboard
  const needsOnboarding = user && !user.onboardingCompleted && user.creatorStatus !== 'approved';
  const isPending = user && user.onboardingCompleted && user.creatorStatus && user.creatorStatus !== 'approved';

  // If needs onboarding, show only onboarding screen
  if (needsOnboarding) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="CreatorOnboarding" component={CreatorOnboardingScreen} />
      </Stack.Navigator>
    );
  }

  // If pending verification, show pending screen
  if (isPending) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="CreatorPending" component={CreatorPendingScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#FFFFFF' } }} initialRouteName="CreatorTabs">
      <Stack.Screen name="CreatorTabs" component={CreatorTabs} />
      <Stack.Screen name="CreatorOnboarding" component={CreatorOnboardingScreen} />
      <Stack.Screen name="CreatorPending" component={CreatorPendingScreen} />
      <Stack.Screen name="CreatorBookings" component={CreatorBookings} />
      <Stack.Screen name="BookingDetail" component={BookingDetail} />
      <Stack.Screen name="CreatorLeads" component={CreatorLeads} />
      <Stack.Screen name="CreateInquiry" component={CreateInquiry} />
      <Stack.Screen name="CreatorPortfolio" component={CreatorPortfolio} />
      <Stack.Screen name="CreatorPackages" component={CreatorPackages} />
      <Stack.Screen name="CreatorWallet" component={CreatorWallet} />
      <Stack.Screen name="CreatorReviews" component={CreatorReviews} />
      <Stack.Screen name="CreatorAvailability" component={CreatorAvailability} />
      <Stack.Screen name="CreatorSettings" component={CreatorProfile} />
      <Stack.Screen name="CreatorServiceAreas" component={CreatorServiceAreas} />
      <Stack.Screen name="CreatorSubscription" component={CreatorSubscription} />
      <Stack.Screen name="CreatorPromotions" component={CreatorPromotions} />
      <Stack.Screen name="CreatorPaymentVerification" component={CreatorPaymentVerification} />
      <Stack.Screen name="CreatorNotifications" component={CreatorNotifications} />
      <Stack.Screen name="CreatorCalendar" component={CreatorCalendar} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="BookingChat" component={BookingChatScreen} />
      <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Inquiry" component={InquiryScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
    </Stack.Navigator>
  );
}
