// populateIssues.js
const admin = require("firebase-admin");

// Connect to Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.GOOGLE_CLOUD_PROJECT = "lokawaz-506ba";

admin.initializeApp();
const db = admin.firestore();

async function main() {
  const issues = [
    {
      category: "Security",
      location: { latitude: 23.2523687, longitude: 77.4963816 },
      status: "Pending",
      assignedTo: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      category: "Pothole",
      location: { latitude: 23.253, longitude: 77.497 },
      status: "Pending",
      assignedTo: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      category: "Garbage",
      location: { latitude: 23.251, longitude: 77.495 },
      status: "Pending",
      assignedTo: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  const batch = db.batch();
  issues.forEach((issue) => {
    const ref = db.collection("issues").doc();
    batch.set(ref, issue);
  });

  await batch.commit();
  console.log("✅ Issues populated in Firestore emulator!");
}

main().catch(console.error);
