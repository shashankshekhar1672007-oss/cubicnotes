const webpush = require("web-push");

const cleanEnvKey = (key) => {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "");
};

let vapidKeys = {
  publicKey: cleanEnvKey(process.env.VAPID_PUBLIC_KEY),
  privateKey: cleanEnvKey(process.env.VAPID_PRIVATE_KEY),
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.log("🔑 VAPID keys not configured in environment. Generating dynamic transient keys...");
  const keys = webpush.generateVAPIDKeys();
  vapidKeys.publicKey = keys.publicKey;
  vapidKeys.privateKey = keys.privateKey;
}

webpush.setVapidDetails(
  "mailto:support@cubicnotes.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = {
  webpush,
  vapidPublicKey: vapidKeys.publicKey,
};
