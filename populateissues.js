// populateIssues.js
const admin = require("firebase-admin");

// Connect to Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.GCLOUD_PROJECT = "lokawaz-506ba";

admin.initializeApp();
const db = admin.firestore();

async function main() {
  const usersSnapshot = await db.collection("users").get();
  const userIds = usersSnapshot.docs.map(doc => doc.id);

  const issues = [];
  for (let i = 0; i < 15; i++) {
    const categoryOptions = ["Security", "Pothole", "Garbage", "Streetlight"];
    const lat = 23.250 + Math.random() * 0.01;
    const lng = 77.495 + Math.random() * 0.01;
    const userId = userIds[Math.floor(Math.random() * userIds.length)];

    issues.push({
      category: categoryOptions[Math.floor(Math.random() * categoryOptions.length)],
      location: { latitude: lat, longitude: lng },
      status: "Pending",
      assignedTo: null,
      userId: userId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const batch = db.batch();
  issues.forEach((issue) => {
    const ref = db.collection("issues").doc();
    batch.set(ref, issue);
  });

  await batch.commit();
  console.log("✅ 15 Issues populated in Firestore emulator!");
}

main().catch(console.error);
