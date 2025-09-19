import React, { useState, useEffect, useMemo } from "react"; // MODIFIED: Added useMemo
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, limit, DocumentData } from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseconfig";
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Swiper from "react-native-swiper";
import dayjs from "dayjs";
import * as Location from "expo-location"; // NEW: Import Location
import { getDistance } from "geolib"; // NEW: Import geolib

const { width } = Dimensions.get("window");

// --- COLOR THEME ---
const colors = {
  primary: "#007AFF",
  background: "#F2F4F7",
  card: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  accent: "#F59E0B",
  success: "#27AE60",
  danger: "#E74C3C",
};

// --- DATA & TYPES ---
// (Interfaces and GRIEVANCE_CATEGORIES remain the same)
interface Issue {
  id: string;
  description: string;
  images: string[];
  status: string;
  createdAt: { seconds: number };
  location: { latitude: number; longitude: number };
  userId: string;
}

interface StatusCounts {
    Registered: number;
    "In Progress": number;
    Redressed: number;
    Reopened: number;
}

const GRIEVANCE_CATEGORIES = [
    { title: "Public Health & Sanitation", icon: "medical-bag", key: "Sanitation" },
    { title: "Water Supply", icon: "water-pump", key: "Water" },
    { title: "Garbage Dump", icon: "Dustbin", key: "Planning" },
    { title: "Open Manhole", icon: "circle-outline", key: "Poverty" },
    { title: "Pothole", icon: "road", key: "road" },
    { title: "Street Lighting", icon: "lightbulb-on-outline", key: "Streetlight" },
    { title: "Traffic Signals Malfunction", icon: "traffic-light", key: "Traffic" },
    { title: "Illegal Parking", icon: "car-brake-hold", key: "Parking" },
    { title: "Waterlogging", icon: "flood", key: "Waterlogging" },
    { title: "Noise Pollution", icon: "volume-high", key: "Pollution" },
    { title: "Security", icon: "shield-lock-outline", key: "Security" },
    { title: "Animal welfare", icon: "dog-side", key: "AnimalControl" },
    { title: "Road Encroachment", icon: "road-variant", key: "Encroachment" },
    { title: "Illegal Construction", icon: "home-city-outline", key: "Construction" },
    { title: "Others", icon: "dots-horizontal", key: "General" },
];


type AppStackParamList = {
  Home: undefined;
  ReportIssue: { category: string };
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, "Home">;


// --- COMPONENT ---
const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ Registered: 0, "In Progress": 0, Redressed: 0, Reopened: 0 });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null); // NEW: State for user's location

  // --- LOGIC & EFFECTS ---
  useEffect(() => {
    // NEW: Function to get user's location
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    };

    getLocation(); // Get location on component mount

    if (auth.currentUser) {
      setUserName(auth.currentUser.displayName || "User");
    }

    const issuesQuery = query(collection(db, "issues"), orderBy("createdAt", "desc"), limit(20)); // Increased limit for sorting

    const unsubscribe = onSnapshot(issuesQuery, (snapshot) => {
      const fetchedIssues = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          description: data.description || "",
          images: data.images || [],
          status: data.status || "Reported",
          createdAt: data.createdAt || { seconds: Date.now() / 1000 },
          location: data.location || { latitude: 0, longitude: 0 },
          userId: data.userId || "Anonymous",
        } as Issue;
      });

      setIssues(fetchedIssues);

      const counts: StatusCounts = { Registered: 0, "In Progress": 0, Redressed: 0, Reopened: 0 };
      fetchedIssues.forEach((issue) => {
        if (issue.status === "Reported") counts.Registered++;
        if (issue.status === "In Progress") counts["In Progress"]++;
        if (issue.status === "Resolved") counts.Redressed++;
        if (issue.status === "Reopened") counts.Reopened++;
      });
      setStatusCounts(counts);

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // NEW: useMemo to sort issues when location or issues list changes
  const sortedIssues = useMemo(() => {
    if (!userLocation || issues.length === 0) {
      return issues; // Return unsorted if no location or issues
    }

    return issues
      .map(issue => {
        const distance = getDistance(userLocation, issue.location);
        return { ...issue, distance }; // Add distance to each issue object
      })
      .sort((a, b) => a.distance - b.distance); // Sort by distance ascending
  }, [issues, userLocation]);





  // --- RENDER FUNCTIONS ---
  // (renderStatusBox, renderCategoryItem, renderImages, and statusColors are unchanged)
  const renderStatusBox = (label: keyof StatusCounts, count: number) => (
    <View style={styles.statusBox}>
      <Text style={styles.statusCount}>{count}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );

  const renderCategoryItem = ({ item }: { item: typeof GRIEVANCE_CATEGORIES[0] }) => (
    <TouchableOpacity
      style={styles.categoryBox}
      onPress={() => navigation.navigate("ReportIssue", { category: item.key })}
    >
      <Icon name={item.icon} size={32} color={colors.primary} />
      <Text style={styles.categoryLabel}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderImages = (images: string[]) => {
    if (images.length === 0) return null;
    return (
      <View style={styles.imageContainer}>
        {images.length === 1 ? (
          <Image source={{ uri: images[0] }} style={styles.issueImage} />
        ) : (
          <Swiper style={styles.swiper} showsPagination={true} height={250} activeDotColor={colors.primary}>
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.issueImage} />
            ))}
          </Swiper>
        )}
      </View>
    );
  };

  const statusColors: Record<string, any> = {
    Reported: { backgroundColor: colors.danger },
    "In Progress": { backgroundColor: colors.accent },
    Resolved: { backgroundColor: colors.success },
    Reopened: { backgroundColor: colors.primary },
  };


  const renderIssueCard = (item: Issue) => {
    const formattedDate = dayjs.unix(item.createdAt.seconds).format("MMM D, YYYY h:mm A");
    return (
      <View key={item.id} style={styles.issueCard}>
        <View style={styles.issueCardHeader}>
          <Icon name="account-circle" size={40} color={colors.textSecondary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.issueUser}>{item.description}</Text>
            <Text style={styles.issueDate}>{formattedDate}</Text>
          </View>
          <View style={[styles.statusBadge, statusColors[item.status] || statusColors["Reported"]]}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>
        {renderImages(item.images)}
        
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      

      <ScrollView contentContainerStyle={styles.scrollContent}>
  

        {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} /> : (
          <>
            {/* Status and Categories Sections are unchanged */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>My Reports</Text>
              <View style={styles.statusRow}>
                {renderStatusBox("Registered", statusCounts.Registered)}
                {renderStatusBox("In Progress", statusCounts["In Progress"])}
                {renderStatusBox("Redressed", statusCounts.Redressed)}
                {renderStatusBox("Reopened", statusCounts.Reopened)}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Report issue</Text>
              <FlatList
                data={GRIEVANCE_CATEGORIES}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.key}
                numColumns={3}
                scrollEnabled={false}
              />
            </View>

            {/* MODIFIED: Recent Reports Section now maps over sortedIssues */}
            <Text style={[styles.sectionTitle, { marginLeft: 5, marginTop: 15 }]}>
              Recent Reports-
            </Text>
            {sortedIssues.map(item => renderIssueCard(item))}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("ReportIssue", { category: "General" })}>
          <Icon name="robot-outline" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- STYLES ---
// (Styles are unchanged)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingVertical: 15,
      paddingHorizontal: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    welcomeText: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
    locationText: { fontSize: 14, color: colors.textSecondary },
    scrollContent: { padding: 15, paddingBottom: 120 },
    tabContainer: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 8, padding: 5, marginBottom: 15 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    activeTab: { backgroundColor: colors.primary },
    tabText: { color: colors.textSecondary, fontWeight: '600' },
    activeTabText: { color: "#FFF" },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: "bold", color: colors.textPrimary, marginBottom: 15 },
    statusRow: { flexDirection: "row", justifyContent: "space-between" },
    statusBox: { flex: 1, alignItems: "center", padding: 10 },
    statusCount: { fontSize: 24, fontWeight: "bold", color: colors.primary },
    statusLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
    categoryBox: {
      width: (width - 90) / 3,
      height: (width - 90) / 3,
      alignItems: "center",
      justifyContent: "center",
      margin: 5,
    },
    categoryLabel: { fontSize: 12, color: colors.textPrimary, textAlign: "center", marginTop: 8 },
    fabContainer: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' },
    fab: {
      backgroundColor: colors.primary,
      borderRadius: 35,
      width: 70,
      height: 70,
      justifyContent: "center",
      alignItems: "center",
      elevation: 8,
    },
    // Issue Card Styles
    issueCard: {
      marginTop: 5,
      marginBottom: 10,
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: "hidden",
      elevation: 2,
    },
    issueCardHeader: { flexDirection: "row", alignItems: "center", padding: 15 },
    issueUser: { fontWeight: "600", fontSize: 16, color: colors.textPrimary },
    issueDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
    statusBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    imageContainer: { width: "100%", height: 250 },
    swiper: {},
    issueImage: { width: "100%", height: 250, resizeMode: "cover" },
    issueDescription: { paddingHorizontal: 15, paddingBottom: 15, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  });
  

export default HomeScreen;