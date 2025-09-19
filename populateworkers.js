// populateWorkers.js
const admin = require("firebase-admin");

// Connect to Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.GCLOUD_PROJECT = "lokawaz-506ba";

admin.initializeApp();
const db = admin.firestore();

async function main() {
  const workers = [
    { name: "Worker 1", department: "Security", duty_status: "On Duty", live_location: { latitude: 23.252, longitude: 77.496 }, fcmToken: "token1" },
    { name: "Worker 2", department: "Roads", duty_status: "On Duty", live_location: { latitude: 23.253, longitude: 77.497 }, fcmToken: "token2" },
    { name: "Worker 3", department: "Sanitation", duty_status: "On Duty", live_location: { latitude: 23.251, longitude: 77.495 }, fcmToken: "token3" },
    { name: "Worker 4", department: "Electrical", duty_status: "On Duty", live_location: { latitude: 23.254, longitude: 77.498 }, fcmToken: "token4" },
    { name: "Worker 5", department: "Security", duty_status: "On Duty", live_location: { latitude: 23.250, longitude: 77.494 }, fcmToken: "token5" },
  ];

  const batch = db.batch();
  workers.forEach((worker) => {
    const ref = db.collection("field_staff").doc();
    batch.set(ref, {
      ...worker,
      assignedTaskId: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log("✅ Workers populated in Firestore emulator!");
}

main().catch(console.error);
