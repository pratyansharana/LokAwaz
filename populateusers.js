// populateUsers.js
const admin = require("firebase-admin");

// Connect to Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.GCLOUD_PROJECT = "lokawaz-506ba";

admin.initializeApp();
const db = admin.firestore();

async function main() {
  const users = [
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
    { name: "Charlie", email: "charlie@example.com" },
    { name: "David", email: "david@example.com" },
    { name: "Eve", email: "eve@example.com" },
  ];

  const batch = db.batch();
  users.forEach((user) => {
    const ref = db.collection("users").doc();
    batch.set(ref, {
      ...user,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log("✅ Users populated in Firestore emulator!");
}

main().catch(console.error);
