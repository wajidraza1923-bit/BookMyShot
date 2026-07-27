/**
 * Safe navigation goBack — prevents "GO_BACK was not handled" warning.
 * If there's no screen to go back to, navigates to Home instead.
 */
export function safeGoBack(navigation: any) {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    // Try navigating to customer tabs home
    try {
      navigation.navigate('CustomerTabs', { screen: 'Home' });
    } catch {
      try {
        navigation.navigate('Home');
      } catch {
        // Last resort — do nothing rather than crash
      }
    }
  }
}
