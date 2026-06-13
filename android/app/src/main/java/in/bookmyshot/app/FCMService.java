package in.bookmyshot.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Firebase Cloud Messaging Service for BookMyShot push notifications.
 * Handles incoming notifications for bookings, payments, and promotions.
 */
public class FCMService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "bookmyshot_default";
    private static final String CHANNEL_NAME = "BookMyShot Notifications";
    private static final String CHANNEL_DESC = "Booking updates, payment confirmations, and promotions";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        String title = "BookMyShot";
        String body = "";
        String deepLink = null;

        // Extract notification data
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null
                    ? remoteMessage.getNotification().getTitle() : title;
            body = remoteMessage.getNotification().getBody() != null
                    ? remoteMessage.getNotification().getBody() : "";
        }

        // Check for custom data payload (deep link, type, etc.)
        if (remoteMessage.getData().size() > 0) {
            if (remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
            if (remoteMessage.getData().containsKey("deepLink")) {
                deepLink = remoteMessage.getData().get("deepLink");
            }
        }

        showNotification(title, body, deepLink);
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Token will be sent to server via Capacitor Push Notifications plugin
    }

    private void showNotification(String title, String body, String deepLink) {
        // Create intent for when notification is tapped
        Intent intent;
        if (deepLink != null && !deepLink.isEmpty()) {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
        } else {
            intent = new Intent(this, MainActivity.class);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build notification
        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 300, 200, 300})
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setColor(getResources().getColor(R.color.gold, null));

        // Create notification channel (required for Android 8+)
        NotificationManager notificationManager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(CHANNEL_DESC);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 300, 200, 300});
            notificationManager.createNotificationChannel(channel);
        }

        // Show notification with unique ID
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, builder.build());
    }
}
