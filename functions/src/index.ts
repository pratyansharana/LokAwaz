import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getDistance } from "geolib";
import { Timestamp } from "firebase-admin/firestore"; // ✅ v2 Timestamp

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
    region: "asia-south1", // v2 region
  },
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) return;

      const issue = snap.data();
      if (!issue) return;

      // Ensure geo location exists
      const loc = issue.location;
      if (!loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
        console.log("❌ Issue has no valid location:", event.params.issueId);
        return;
      }

      const category = issue.category || "default";
      const department = CATEGORY_TO_DEPARTMENT[category] || "General";

      // Find workers in same department and On Duty
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

        // Only consider workers who are available (no assigned task)
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

      await db.runTransaction(async (tx) => {
        const wSnap = await tx.get(workerRef);
        if (!wSnap.exists) throw new Error("Worker disappeared");

        const wData = wSnap.data() as any;
        if (wData.assignedTaskId) throw new Error("Already assigned");

        tx.update(workerRef, {
          assignedTaskId: issueRef.id,
          duty_status: "Assigned",
          updated_at: Timestamp.now(), // ✅ fixed for v2
        });

        tx.update(issueRef, {
          assignedTo: workerRef.id,
          status: "Assigned",
          assignedAt: Timestamp.now(), // ✅ fixed for v2
        });
      });

      console.log(`✅ Assigned worker ${nearest.id} -> issue ${snap.id}`);
    } catch (err: any) {
      console.error("🔥 Error in assignNearestWorkerOnIssueCreate:", err);
    }
  }
);
