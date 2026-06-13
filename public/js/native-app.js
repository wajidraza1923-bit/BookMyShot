/**
 * BookMyShot Native App Bridge
 * Handles native functionality when running inside Capacitor Android app.
 * Features: Push notifications, offline handling, pull-to-refresh, status bar, haptics
 */
(function() {
  'use strict';

  // Only initialize if running in Capacitor
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;

  var isNative = true;
  console.log('[BookMyShot] Native app initialized');

  // ═══════════════════════════════════════════════════════════════
  // STATUS BAR — Dark immersive
  // ═══════════════════════════════════════════════════════════════
  if (window.Capacitor.Plugins.StatusBar) {
    var StatusBar = window.Capacitor.Plugins.StatusBar;
    StatusBar.setBackgroundColor({ color: '#0a0806' }).catch(function() {});
    StatusBar.setStyle({ style: 'DARK' }).catch(function() {});
  }

  // ═══════════════════════════════════════════════════════════════
  // PUSH NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  function initPushNotifications() {
    var PushNotifications = window.Capacitor.Plugins.PushNotifications;
    if (!PushNotifications) return;

    PushNotifications.requestPermissions().then(function(result) {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    }).catch(function(e) {
      console.warn('[Push] Permission denied:', e);
    });

    // Registration success — send token to backend
    PushNotifications.addListener('registration', function(token) {
      console.log('[Push] Token:', token.value);
      // Send token to backend for this user
      var apiToken = localStorage.getItem('bms_token');
      if (apiToken) {
        fetch(API.base + '/api/notifications/push-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiToken
          },
          body: JSON.stringify({ token: token.value, platform: 'android' })
        }).catch(function() {});
      }
    });

    // Notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', function(notification) {
      // Show in-app toast instead of system notification
      if (typeof toast === 'function') {
        toast(notification.title + ': ' + notification.body, 'info');
      }
    });

    // User tapped on notification
    PushNotifications.addListener('pushNotificationActionPerformed', function(action) {
      var data = action.notification.data || {};
      if (data.deepLink) {
        window.location.href = data.deepLink;
      } else if (data.url) {
        window.location.href = data.url;
      }
    });
  }

  // Delay push init to after page load
  setTimeout(initPushNotifications, 2000);

  // ═══════════════════════════════════════════════════════════════
  // NETWORK / OFFLINE HANDLING
  // ═══════════════════════════════════════════════════════════════
  var Network = window.Capacitor.Plugins.Network;
  if (Network) {
    Network.addListener('networkStatusChange', function(status) {
      if (!status.connected) {
        showOfflineBanner();
      } else {
        hideOfflineBanner();
      }
    });

    // Check initial state
    Network.getStatus().then(function(status) {
      if (!status.connected) {
        showOfflineBanner();
      }
    });
  }

  var offlineBanner = null;
  function showOfflineBanner() {
    if (offlineBanner) return;
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'nativeOfflineBanner';
    offlineBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;padding:0.5rem;text-align:center;font-size:0.75rem;color:#fff;font-weight:500;transition:transform 0.3s';
    offlineBanner.textContent = '📡 No internet connection';
    document.body.prepend(offlineBanner);
  }

  function hideOfflineBanner() {
    if (offlineBanner) {
      offlineBanner.remove();
      offlineBanner = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PULL TO REFRESH
  // ═══════════════════════════════════════════════════════════════
  var touchStartY = 0;
  var touchEndY = 0;
  var isRefreshing = false;
  var refreshIndicator = null;

  document.addEventListener('touchstart', function(e) {
    if (window.scrollY === 0) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (window.scrollY === 0 && !isRefreshing) {
      touchEndY = e.touches[0].clientY;
      var pullDistance = touchEndY - touchStartY;
      if (pullDistance > 30 && pullDistance < 150) {
        showRefreshIndicator(Math.min(pullDistance / 100, 1));
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', function() {
    var pullDistance = touchEndY - touchStartY;
    if (pullDistance > 80 && window.scrollY === 0 && !isRefreshing) {
      triggerRefresh();
    } else {
      hideRefreshIndicator();
    }
    touchStartY = 0;
    touchEndY = 0;
  }, { passive: true });

  function showRefreshIndicator(progress) {
    if (!refreshIndicator) {
      refreshIndicator = document.createElement('div');
      refreshIndicator.id = 'pullRefreshIndicator';
      refreshIndicator.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99998;width:32px;height:32px;border-radius:50%;background:#171717;border:2px solid rgba(212,175,55,0.3);display:flex;align-items:center;justify-content:center;transition:opacity 0.2s,top 0.2s;font-size:0.8rem';
      refreshIndicator.textContent = '↻';
      document.body.appendChild(refreshIndicator);
    }
    refreshIndicator.style.top = (8 + progress * 40) + 'px';
    refreshIndicator.style.opacity = progress;
    refreshIndicator.style.color = '#D4AF37';
  }

  function hideRefreshIndicator() {
    if (refreshIndicator) {
      refreshIndicator.style.opacity = '0';
      setTimeout(function() {
        if (refreshIndicator) {
          refreshIndicator.remove();
          refreshIndicator = null;
        }
      }, 200);
    }
  }

  function triggerRefresh() {
    isRefreshing = true;
    if (refreshIndicator) {
      refreshIndicator.style.top = '48px';
      refreshIndicator.textContent = '⟳';
      refreshIndicator.style.animation = 'spin 0.8s linear infinite';
    }

    // Haptic feedback
    if (window.Capacitor.Plugins.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }).catch(function() {});
    }

    // Reload current page content
    setTimeout(function() {
      window.location.reload();
    }, 600);
  }

  // ═══════════════════════════════════════════════════════════════
  // SMOOTH TRANSITIONS — Add CSS for page transitions
  // ═══════════════════════════════════════════════════════════════
  var transitionStyle = document.createElement('style');
  transitionStyle.textContent = '@keyframes spin{from{transform:translateX(-50%) rotate(0)}to{transform:translateX(-50%) rotate(360deg)}} .panel-content{animation:fadeSlideIn 0.25s ease}@keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(transitionStyle);

  // ═══════════════════════════════════════════════════════════════
  // LOGIN PERSISTENCE — Check token validity on app resume
  // ═══════════════════════════════════════════════════════════════
  if (window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('appStateChange', function(state) {
      if (state.isActive) {
        // App came to foreground — verify auth is still valid
        var token = localStorage.getItem('bms_token');
        if (token && typeof API !== 'undefined') {
          API.get('/auth/me').catch(function(e) {
            if (e.status === 401) {
              // Token expired — redirect to login
              localStorage.removeItem('bms_token');
              localStorage.removeItem('bms_user');
              if (window.location.pathname.includes('/creator/')) {
                window.location.href = '/creator-auth.html';
              } else if (window.location.pathname.includes('/admin/')) {
                window.location.href = '/admin-login.html';
              }
            }
          });
        }
      }
    });

    // Handle back button at app level
    window.Capacitor.Plugins.App.addListener('backButton', function(data) {
      if (data.canGoBack) {
        window.history.back();
      }
      // Double-tap exit is handled in MainActivity.java
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HIDE SPLASH SCREEN after content loads
  // ═══════════════════════════════════════════════════════════════
  window.addEventListener('load', function() {
    setTimeout(function() {
      if (window.Capacitor.Plugins.SplashScreen) {
        window.Capacitor.Plugins.SplashScreen.hide({ fadeOutDuration: 400 });
      }
    }, 500);
  });

  // Mark body as native app (for CSS adjustments)
  document.documentElement.classList.add('native-app');

  // Add safe area padding for notch devices
  var safeAreaStyle = document.createElement('style');
  safeAreaStyle.textContent = '.native-app body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)} .native-app .sidebar{padding-top:env(safe-area-inset-top)} .native-app .header,.native-app .dashboard-header{padding-top:env(safe-area-inset-top)}';
  document.head.appendChild(safeAreaStyle);

})();
