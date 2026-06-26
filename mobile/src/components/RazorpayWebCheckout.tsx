/**
 * RazorpayWebCheckout — WebView-based Razorpay payment
 * Works in ALL environments (Expo Go, dev builds, production APKs)
 * Same as website: loads Razorpay checkout.js in a WebView
 */
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  keyId: string;
  // For subscription
  subscriptionId?: string;
  // For one-time orders
  orderId?: string;
  amount?: number;
  // Common
  name?: string;
  description?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
  onClose: () => void;
}

export default function RazorpayWebCheckout({
  visible, keyId, subscriptionId, orderId, amount,
  name, description, prefillName, prefillEmail, prefillPhone,
  onSuccess, onFailure, onClose,
}: Props) {
  if (!visible) return null;

  const isSubscription = !!subscriptionId;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#fff}
.loading{text-align:center}.loading p{margin-top:12px;color:#888;font-size:14px}</style>
</head>
<body>
<div class="loading" id="loader"><div style="width:40px;height:40px;border:3px solid #333;border-top:3px solid #D4AF37;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto"></div><p>Opening payment...</p></div>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
<script>
(function() {
  var options = {
    key: "${keyId}",
    ${isSubscription ? `subscription_id: "${subscriptionId}",` : `order_id: "${orderId}", amount: ${(amount || 0) * 100},`}
    name: "${name || 'BookMyShot'}",
    description: "${description || 'Payment'}",
    currency: "INR",
    prefill: {
      name: "${prefillName || ''}",
      email: "${prefillEmail || ''}",
      contact: "${prefillPhone || ''}"
    },
    theme: { color: "#D4AF37" },
    modal: { confirm_close: true, ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({type:'closed'})); } },
    handler: function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'success', data:response}));
    }
  };
  try {
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'failed', error:response.error}));
    });
    rzp.open();
    document.getElementById('loader').style.display='none';
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'error', message:e.message}));
  }
})();
</script>
</body>
</html>`;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'success') {
        onSuccess(msg.data);
      } else if (msg.type === 'failed') {
        onFailure(msg.error);
      } else if (msg.type === 'closed') {
        onClose();
      } else if (msg.type === 'error') {
        onFailure({ description: msg.message });
      }
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={onClose} style={st.closeBtn}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerText}>Secure Payment</Text>
          <View style={{ width: 36 }} />
        </View>
        <WebView
          source={{ html }}
          style={st.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          startInLoadingState={true}
          renderLoading={() => <ActivityIndicator size="large" color="#D4AF37" style={{ marginTop: 40 }} />}
        />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  webview: { flex: 1, backgroundColor: '#000' },
});
