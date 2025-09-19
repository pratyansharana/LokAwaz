// populateWorkers.js
const admin = require("firebase-admin");

// Connect Admin SDK to Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080"; // port of your Firestore emulator
process.env.GOOGLE_CLOUD_PROJECT = "lokawaz-506ba"; // your project id

admin.initializeApp();

const db = admin.firestore();

async function main() {
  const workers = [
    {
      department: "Security",
      duty_status: "On Duty",
      email: "pratyanshrana1@gmail.com",
      live_location: { lat: 23.2523687, lng: 77.4963816 },
      assignedTaskId: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      department: "Roads",
      duty_status: "On Duty",
      email: "worker2@example.com",
      live_location: { lat: 23.253, lng: 77.497 },
      assignedTaskId: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      department: "Sanitation",
      duty_status: "On Duty",
      email: "worker3@example.com",
      live_location: { lat: 23.251, lng: 77.495 },
      assignedTaskId: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  const batch = db.batch();
  workers.forEach((w) => {
    const ref = db.collection("field_staff").doc();
    batch.set(ref, w);
  });

  await batch.commit();
  console.log("✅ Workers populated in Firestore emulator!");
}

main().catch(console.error);
