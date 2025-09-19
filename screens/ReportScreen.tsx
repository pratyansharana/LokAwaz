import React, { useState } from 'react';
import {
  Text,
  Button,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { auth, db, storage } from '../Firebase/firebaseconfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ReportScreen = () => {
  const [images, setImages] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Pick images
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
      });
      if (!result.canceled) {
        const selected = result.assets.map(a => a.uri);
        setImages(prev => [...prev, ...selected].slice(0, 4));
      }
    } catch (e) {
      console.log('[ImagePicker] Error:', e);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingObj = new Audio.Recording();
      await recordingObj.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recordingObj.startAsync();
      setRecording(recordingObj);
    } catch (e) {
      console.log('[Audio] Error starting recording:', e);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      await new Promise(res => setTimeout(res, 1000));

      const uri = recording.getURI();
      if (!uri) throw new Error('Recording failed to save');

      setVoiceUri(uri);
      setRecording(null);
    } catch (e) {
      console.log('[Audio] Error stopping recording:', e);
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  // Play/stop recording
  const playRecording = async () => {
    try {
      if (!voiceUri) return;
      if (playing) {
        await sound?.stopAsync();
        setPlaying(false);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: voiceUri });
      setSound(newSound);
      setPlaying(true);

      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate(status => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlaying(false);
      });
    } catch (e) {
      console.log('[Audio] Error playing recording:', e);
    }
  };

  // Submit report
  const submitReport = async () => {
    if (images.length === 0) return Alert.alert('Error', 'Select at least one image');
    if (!description.trim()) return Alert.alert('Error', 'Enter a description');
    if (!category.trim()) return Alert.alert('Error', 'Select a category');

    setSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

      // Upload images
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const path = `reports/images/${Date.now()}_${i}.jpg`;
        const response = await fetch(images[i]);
        const blob = await response.blob();
        const refStorage = ref(storage, path);
        await uploadBytes(refStorage, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(refStorage);
        imageUrls.push(url);
      }

      // Upload voice
      let voiceUrl: string | null = null;
      if (voiceUri) {
        const extension = Platform.OS === 'ios' ? 'm4a' : '3gp';
        const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/3gp';
        const path = `reports/voice/${Date.now()}.${extension}`;

        const response = await fetch(voiceUri);
        const blob = await response.blob();

        console.log('Uploading voice file with type:', blob.type || mimeType);

        const refStorage = ref(storage, path);
        await uploadBytes(refStorage, blob, { contentType: mimeType });
        voiceUrl = await getDownloadURL(refStorage);
      }

      // Add report to Firestore
      await addDoc(collection(db, 'issues'), {
        userId: auth.currentUser?.uid,
        description,
        category,
        images: imageUrls,
        voice: voiceUrl,
        location: coords,
        status: 'Reported',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Report submitted successfully');
      setImages([]);
      setVoiceUri(null);
      setDescription('');
      setCategory('');
    } catch (e: any) {
      console.log('[Submit] Error submitting report:', e);
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text style={styles.label}>Category</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter category (e.g., Plumbing, Electrical, etc.)"
        value={category}
        onChangeText={setCategory}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the issue..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Images (1-4)</Text>
      <Button title="Pick Images" onPress={pickImages} />
      <ScrollView horizontal style={{ marginVertical: 10 }}>
        {images.map((uri, idx) => (
          <Image key={idx} source={{ uri }} style={styles.image} />
        ))}
      </ScrollView>

      <Text style={styles.label}>Voice Input (optional)</Text>
      <TouchableOpacity
        style={[styles.audioButton, recording ? styles.audioRecording : null]}
        onPress={recording ? stopRecording : startRecording}
      >
        <Text style={styles.audioButtonText}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      {voiceUri && (
        <>
          <Text style={styles.voiceLabel}>Recorded: {voiceUri.split('/').pop()}</Text>
          <TouchableOpacity
            style={[styles.playButton, playing ? styles.playing : null]}
            onPress={playRecording}
          >
            <Text style={styles.audioButtonText}>
              {playing ? 'Stop Playback' : 'Play Recording'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[styles.submitButton, submitting ? { opacity: 0.7 } : null]}
        disabled={submitting}
        onPress={submitReport}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f7f7f7' },
  label: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  image: { width: 80, height: 80, borderRadius: 10, marginRight: 10 },
  audioButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  audioRecording: { backgroundColor: '#FF3B30' },
  audioButtonText: { color: '#fff', fontWeight: 'bold' },
  voiceLabel: { marginTop: 5, fontStyle: 'italic', color: '#555' },
  playButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  playing: { backgroundColor: '#FF9500' },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginTop: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ReportScreen;
