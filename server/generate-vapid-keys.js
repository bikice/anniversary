import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("VAPID-Schlüssel erzeugt. Trage sie in server/.env ein:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
