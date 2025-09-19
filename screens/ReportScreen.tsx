import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import { auth, db, storage } from "../Firebase/firebaseconfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const CATEGORIES = [
    { label: "Pothole", value: "Pothole", icon: "road-variant" },
    { label: "Garbage", value: "Garbage Dump", icon: "trash-can" },
    { label: "Streetlight", value: "Streetlight Outage", icon: "lightbulb-off-outline" },
    { label: "Parking", value: "Illegal Parking", icon: "parking" },
    { label: "Drain", value: "Blocked Sewer/Drain", icon: "sewer" },
    { label: "Wires", value: "Exposed Wires", icon: "alert-decagram-outline" },
    { label: "Vandalism", value: "Vandalism", icon: "spray-bottle" },
    { label: "Manhole", value: "Open Manhole", icon: "circle-off-outline" },
    { label: "Water Supply", value: "Water Supply", icon: "water-pump" },
    { label: "Construction", value: "Illegal Construction", icon: "home-city-outline" },
];

const colors = {
  primary: "#007AFF",
  background: "#F2F4F7",
  card: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  success: "#27AE60",
  danger: "#EF4444",
  accent: "#F59E0B",
  indigo: "#6366F1",
};

// MODIFIED: Simple chunk function for a 5-column grid
const chunkArray = (array, size) => {
  const chunkedArr = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
};

const ReportScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const initialCategory = route.params?.category || CATEGORIES[0].value;

  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState(initialCategory);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  
  // MODIFIED: Chunk categories into rows of 5
  const categoryRows = chunkArray(CATEGORIES, 5);

  // (All other functions remain the same)
  const captureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 4));
    }
  };

  const startRecording = async () => {
    try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission required", "Please allow microphone access.");
            return;
        }
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
    } catch (err) {
        console.error("Error starting recording:", err);
    }
  };

  const stopRecording = async () => {
      try {
          if (!recording) return;
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setVoiceUri(uri || null);
          setRecording(null);
      } catch (err) {
          console.error("Error stopping recording:", err);
      }
  };

  const playRecording = async () => {
      try {
          if (playing && sound) {
              await sound.stopAsync();
              await sound.unloadAsync();
              setPlaying(false);
              return;
          }
          if (voiceUri) {
              const { sound: newSound } = await Audio.Sound.createAsync({ uri: voiceUri });
              setSound(newSound);
              setPlaying(true);
              await newSound.playAsync();
              newSound.setOnPlaybackStatusUpdate((status) => {
                  if ("isPlaying" in status && !status.isPlaying) {
                      setPlaying(false);
                  }
              });
          }
      } catch (err) {
          console.error("Error playing recording:", err);
      }
  };

  const submitReport = async () => {
    if (images.length === 0) return Alert.alert("Error", "Please capture at least one image.");
    if (!description.trim()) return Alert.alert("Error", "Please enter a description.");

    setSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Location permission denied");
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

      const imageUrls = await Promise.all(
        images.map(async (uri, i) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          const storageRef = ref(storage, `reports/images/${Date.now()}_${i}.jpg`);
          await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
          return await getDownloadURL(storageRef);
        })
      );
      
      let voiceUrl: string | null = null;
      if (voiceUri) {
          const response = await fetch(voiceUri);
          const blob = await response.blob();
          const extension = Platform.OS === "ios" ? "m4a" : "3gp";
          const mimeType = Platform.OS === "ios" ? "audio/m4a" : "audio/3gp";
          const storageRef = ref(storage, `reports/voice/${Date.now()}.${extension}`);
          await uploadBytes(storageRef, blob, { contentType: mimeType });
          voiceUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "issues"), {
        userId: auth.currentUser?.uid,
        description,
        category,
        images: imageUrls,
        voice: voiceUrl,
        location: coords,
        status: "Reported",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Your report has been submitted successfully.");
      navigation.goBack();
    } catch (e: any) {
      console.error("Error submitting report:", e);
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Select Category</Text>
        {/* MODIFIED: UI for a 5-column grid */}
        <View style={styles.gridContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={styles.gridItemContainer}
              onPress={() => setCategory(cat.value)}
            >
              <View style={[styles.gridCircle, category === cat.value && styles.selectedGridCircle]}>
                <Icon name={cat.icon} size={24} color={category === cat.value ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={styles.gridLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe the issue in detail..."
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Images ({images.length}/4)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {images.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.imagePreview} />
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.captureButton} onPress={captureImage}>
          <Icon name="camera" size={20} color="#FFF" />
          <Text style={styles.captureButtonText}>Capture Image</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Voice Note (Optional)</Text>
        <TouchableOpacity
            style={[styles.audioButton, recording ? {backgroundColor: colors.danger} : {backgroundColor: colors.primary}]}
            onPress={recording ? stopRecording : startRecording}
        >
            <Icon name={recording ? "stop-circle-outline" : "microphone"} size={22} color="#FFF" />
            <Text style={styles.audioButtonText}>{recording ? "Stop Recording" : "Start Recording"}</Text>
        </TouchableOpacity>

        {voiceUri && (
            <TouchableOpacity
                style={[styles.audioButton, playing ? {backgroundColor: colors.accent} : {backgroundColor: colors.indigo}]}
                onPress={playRecording}
            >
                <Icon name={playing ? "pause-circle-outline" : "play-circle-outline"} size={22} color="#FFF" />
                <Text style={styles.audioButtonText}>{playing ? "Stop Playback" : "Play Recording"}</Text>
            </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        disabled={submitting}
        onPress={submitReport}
      >
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 15, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: colors.textPrimary, marginBottom: 15 },
  // NEW: 5-Column Grid Styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  gridItemContainer: {
    width: '20%', // 100% / 5 columns = 20%
    alignItems: 'center',
    marginBottom: 15,
  },
  gridCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedGridCircle: {
    borderColor: colors.primary,
    backgroundColor: '#EBF2FF',
  },
  gridLabel: {
    marginTop: 5,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Other Styles
  descriptionInput: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  imagePreview: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
  captureButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  captureButtonText: { color: "#FFF", fontWeight: "600", marginLeft: 8 },
  audioButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  audioButtonText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});

export default ReportScreen;