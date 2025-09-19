import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  DocumentData,
} from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseconfig";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import Swiper from "react-native-swiper";

const { width } = Dimensions.get("window");

interface Issue {
  id: string;
  description: string;
  images: string[];
  status: string;
  createdAt: {
    seconds: number;
  };
  location: { latitude: number; longitude: number };
  userId: string;
}

type AppStackParamList = {
  Home: undefined;
  FullMap: undefined;
  ReportIssue: { category: string };
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, "Home">;

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const issuesQuery = query(
      collection(db, "issues"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(issuesQuery, (snapshot) => {
      const fetchedIssues = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          description: data.description || "",
          images: data.images || [],
          status: data.status || "Reported",
          createdAt: data.createdAt || { seconds: 0 },
          location: data.location || { latitude: 0, longitude: 0 },
          userId: data.userId || "",
        } as Issue;
      });
      setIssues(fetchedIssues);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert("Signed out successfully");
    } catch (err) {
      alert("Error signing out");
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const renderImages = (images: string[]) => {
    if (images.length === 0) return null;

    return (
      <View style={styles.imageContainer}>
        {images.length === 1 ? (
          <Image source={{ uri: images[0] }} style={styles.issueImage} />
        ) : (
          <Swiper
            style={styles.swiper}
            showsPagination={true}
            height={250}
            activeDotColor="#007AFF"
          >
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.issueImage} />
            ))}
          </Swiper>
        )}
      </View>
    );
  };

  const renderIssueCard = ({ item }: { item: Issue }) => {
    const formattedDate = dayjs
      .unix(item.createdAt.seconds)
      .format("MMM D, YYYY h:mm A");

    return (
      <View style={styles.issueCard}>
        {/* Header */}
        <View style={styles.issueCardHeader}>
          <Icon name="account-circle" size={40} color="#555" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.issueUser}>{item.userId || "Anonymous"}</Text>
            <Text style={styles.issueDate}>{formattedDate}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              statusColors[item.status] || statusColors["Reported"],
            ]}
          >
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>

        {/* Images */}
        {renderImages(item.images)}

        {/* Description */}
        {item.description ? (
          <Text style={styles.issueDescription}>{item.description}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LokAwaz</Text>
        <TouchableOpacity onPress={handleSignOut} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="logout" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Feed */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : issues.length === 0 ? (
        <Text style={styles.noIssuesText}>No issues reported yet.</Text>
      ) : (
        <FlatList
          data={issues}
          renderItem={renderIssueCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("ReportIssue", { category: "General" })}
      >
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const statusColors: Record<string, any> = {
  Reported: { backgroundColor: "#e74c3c" },
  "In Progress": { backgroundColor: "#f1c40f" },
  Resolved: { backgroundColor: "#27ae60" },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f7",
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007AFF",
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1,
  },
  noIssuesText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    color: "#888",
  },
  issueCard: {
    marginTop: 15,
    marginHorizontal: 15,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  issueCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  issueUser: {
    fontWeight: "600",
    fontSize: 16,
    color: "#333",
  },
  issueDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: "center",
    justifyContent: "center",
  },
  statusBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  imageContainer: {
    width: "100%",
    height: 250,
  },
  swiper: {},
  issueImage: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  issueDescription: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
    color: "#444",
  },
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#007AFF",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});

export default HomeScreen;
