import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getDistance } from "geolib";
import { Timestamp } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

// Map categories to departments
const CATEGORY_TO_DEPARTMENT: Record<string, string> = {
  Pothole: "Roads",
  Garbage: "Sanitation",
  Streetlight: "Electrical",
  Security: "Security",
  // add more if needed
};

export const assignNearestWorkerOnIssueCreate = onDocumentCreated(
  {
    document: "issues/{issueId}",
    region: "asia-south1",
  },
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) return;

      const issue = snap.data();
      if (!issue) return;

      const loc = issue.location;
      if (!loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
        console.log("❌ Issue has no valid location:", event.params.issueId);
        return;
      }

      const category = issue.category || "default";
      const department = CATEGORY_TO_DEPARTMENT[category] || "General";

      // Find workers in the same department and On Duty
      const workersQ = await db
        .collection("field_staff")
        .where("department", "==", department)
        .where("duty_status", "==", "On Duty")
        .get();

      if (workersQ.empty) {
        console.log("❌ No on-duty workers in:", department);
        return;
      }

      const issuePoint = { latitude: loc.latitude, longitude: loc.longitude };
      const candidates: {
        id: string;
        ref: FirebaseFirestore.DocumentReference;
        distanceMeters: number;
      }[] = [];

      workersQ.docs.forEach((wdoc) => {
        const w = wdoc.data() as any;
        const wLat = w.live_location?.lat ?? w.live_location?.latitude;
        const wLng = w.live_location?.lng ?? w.live_location?.longitude;
        const assignedTask = w.assignedTaskId || w.currentTask;

        if (typeof wLat === "number" && typeof wLng === "number" && !assignedTask) {
          const distanceMeters = getDistance(issuePoint, { latitude: wLat, longitude: wLng });
          candidates.push({ id: wdoc.id, ref: wdoc.ref, distanceMeters });
        }
      });

      if (!candidates.length) {
        console.log("❌ No available workers.");
        return;
      }

      // Pick nearest worker
      candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
      const nearest = candidates[0];
      const workerRef = db.collection("field_staff").doc(nearest.id);
      const issueRef = snap.ref;

      // Transaction to assign worker
      await db.runTransaction(async (tx) => {
        const wSnap = await tx.get(workerRef);
        if (!wSnap.exists) throw new Error("Worker disappeared");
        const wData = wSnap.data() as any;
        if (wData.assignedTaskId) throw new Error("Already assigned");

        tx.update(workerRef, {
          assignedTaskId: issueRef.id,
          duty_status: "Assigned",
          updated_at: Timestamp.now(),
        });

        tx.update(issueRef, {
          assignedTo: workerRef.id,
          status: "Assigned",
          assignedAt: Timestamp.now(),
        });
      });

      console.log(`✅ Assigned worker ${nearest.id} -> issue ${snap.id}`);

      // --- Notifications ---
      const workerSnap = await workerRef.get();
      const workerData = workerSnap.data() as any;
      const token = workerData?.fcmToken;

      // Detect if running in emulator
      const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

      if (token) {
        const message = {
          token: token,
          notification: {
            title: "New Task Assigned",
            body: `You have been assigned to issue ${snap.id}`,
          },
          data: {
            issueId: snap.id,
            department: department,
          },
        };

        if (isEmulator) {
          console.log(`[EMULATOR] Would send notification to worker ${nearest.id}:`, message);
        } else {
          await admin.messaging().send(message);
          console.log(`📩 Notification sent to worker ${nearest.id}`);
        }
      } else {
        console.log("⚠️ Worker has no FCM token:", nearest.id);
      }

      // Notify citizen who reported the issue
      if (issue.userId) {
        const userRef = db.collection("users").doc(issue.userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data() as any;
        const userToken = userData?.fcmToken;

        if (userToken) {
          const userMessage = {
            token: userToken,
            notification: {
              title: "Issue Assigned",
              body: `Your issue ${snap.id} has been assigned to a worker.`,
            },
            data: {
              issueId: snap.id,
              workerId: nearest.id,
            },
          };

          if (isEmulator) {
            console.log(`[EMULATOR] Would send notification to user ${issue.userId}:`, userMessage);
          } else {
            await admin.messaging().send(userMessage);
            console.log(`📩 Notification sent to user ${issue.userId}`);
          }
        } else {
          console.log("⚠️ User has no FCM token:", issue.userId);
        }
      }

    } catch (err: any) {
      console.error("🔥 Error in assignNearestWorkerOnIssueCreate:", err);
    }
  }
);
