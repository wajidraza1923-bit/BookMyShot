import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminPromotions from '../screens/admin/AdminPromotions';
import AdminCreators from '../screens/admin/AdminCreators';
import AdminBookings from '../screens/admin/AdminBookings';
import AdminInquiries from '../screens/admin/AdminInquiries';
import AdminSubscriptions from '../screens/admin/AdminSubscriptions';
import AdminEarnings from '../screens/admin/AdminEarnings';
import AdminSettings from '../screens/admin/AdminSettings';
import QADashboard from '../screens/admin/QADashboard';
import AdminContentManager from '../screens/admin/AdminContentManager';
import AdminReviews from '../screens/admin/AdminReviews';
import AdminSocialLinks from '../screens/admin/AdminSocialLinks';
import AdminUsers from '../screens/admin/AdminUsers';
import AdminBackups from '../screens/admin/AdminBackups';
import AdminReportMgmt from '../screens/admin/AdminReportMgmt';
import AdminOverdue from '../screens/admin/AdminOverdue';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="AdminCreators" component={AdminCreators} />
      <Stack.Screen name="AdminPromotions" component={AdminPromotions} />
      <Stack.Screen name="AdminBookings" component={AdminBookings} />
      <Stack.Screen name="AdminInquiries" component={AdminInquiries} />
      <Stack.Screen name="AdminSubscriptions" component={AdminSubscriptions} />
      <Stack.Screen name="AdminEarnings" component={AdminEarnings} />
      <Stack.Screen name="AdminSettings" component={AdminSettings} />
      <Stack.Screen name="QADashboard" component={QADashboard} />
      <Stack.Screen name="ContentManager" component={AdminContentManager} />
      <Stack.Screen name="AdminReviews" component={AdminReviews} />
      <Stack.Screen name="AdminSocialLinks" component={AdminSocialLinks} />
      <Stack.Screen name="AdminUsers" component={AdminUsers} />
      <Stack.Screen name="AdminBackups" component={AdminBackups} />
      <Stack.Screen name="AdminReportMgmt" component={AdminReportMgmt} />
      <Stack.Screen name="AdminOverdue" component={AdminOverdue} />
    </Stack.Navigator>
  );
}
