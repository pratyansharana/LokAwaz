import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Vibration } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import AIService from '../services/AiServices';

export default function DashcamScreen() {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [label, setLabel] = useState("AI Offline");
  const [lastImg, setLastImg] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      const permission = await Camera.requestCameraPermission();
      const ai = await AIService.init();
      if (permission === 'granted' && ai) {
        setIsReady(true);
        setLabel("System Ready");
      }
    }
    setup();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && isReady) {
      console.log("Scanner: Start sequence initiated.");
      interval = setInterval(async () => {
        if (!camera.current) return;
        try {
          console.log("Scanner: Capturing image...");
          const snapshot = await camera.current.takeSnapshot({ quality: 50 });
          
          const confidence = await AIService.runInference(snapshot.path);
          
          // UI Console log for confidence
          console.log(`Scanner: AI Confidence Score = ${(confidence * 100).toFixed(1)}%`);

          if (confidence > 0.70) { // Slightly lower threshold for laptop testing
            console.log("Scanner: MATCH FOUND!");
            setLastImg(snapshot.path);
            setLabel("⚠️ POTHOLE DETECTED!");
            Vibration.vibrate(500);
            AIService.logDetection(snapshot.path, confidence);
            
            setTimeout(() => setLabel("Scanning Road..."), 3000);
          }
        } catch (err) {
          console.error("Scanner Loop Failed:", err);
        }
      }, 1500); 
    }
    return () => {
      if (interval) {
        console.log("Scanner: Stop sequence initiated.");
        clearInterval(interval);
      }
    };
  }, [isActive, isReady]);

  if (!device) return <View style={styles.center}><Text>No Camera</Text></View>;

  return (
    <View style={styles.container}>
      <Camera ref={camera} style={StyleSheet.absoluteFill} device={device} isActive={true} photo={true} />
      
      <View style={styles.overlay}>
        <View style={[styles.badge, label.includes("⚠️") && styles.alert]}>
          <Text style={styles.text}>{label}</Text>
        </View>

        {lastImg && (
          <View style={styles.preview}>
            <Image source={{ uri: `file://${lastImg}` }} style={styles.thumb} />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.btn, isActive ? styles.btnStop : styles.btnStart]} 
          onPress={() => setIsActive(!isActive)}
        >
          <Text style={styles.btnText}>{isActive ? "STOP" : "START SCAN"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 40 },
  badge: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 15, borderRadius: 10, alignItems: 'center' },
  alert: { backgroundColor: '#FF3B30' },
  text: { color: '#fff', fontWeight: 'bold' },
  preview: { position: 'absolute', top: 120, right: 40 },
  thumb: { width: 80, height: 110, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  btn: { padding: 20, borderRadius: 40, alignItems: 'center' },
  btnStart: { backgroundColor: '#007AFF' },
  btnStop: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});