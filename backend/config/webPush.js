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

try {
  webpush.setVapidDetails(
    "mailto:support@cubicnotes.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.error("❌ ERROR: Failed to configure VAPID Web Push details.");
  console.error(`Diagnosis info:`);
  console.error(`- VAPID_PUBLIC_KEY length: ${vapidKeys.publicKey ? vapidKeys.publicKey.length : 0} characters.`);
  console.error(`- VAPID_PRIVATE_KEY length: ${vapidKeys.privateKey ? vapidKeys.privateKey.length : 0} characters.`);
  if (vapidKeys.publicKey) {
    console.error(`- Public key starts with: "${vapidKeys.publicKey.slice(0, 10)}..." and ends with "...${vapidKeys.publicKey.slice(-10)}".`);
  }
  throw err;
}

module.exports = {
  webpush,
  vapidPublicKey: vapidKeys.publicKey,
};
