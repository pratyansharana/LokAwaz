import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

class AIService {
  private model: TensorflowModel | null = null;
  private readonly TARGET_SIZE = 320; 

  async init() {
    console.log("[AIService] 🚀 Initializing AI Service...");
    try {
      const modelPath = require('../assets/model/model.tflite');
      console.log("[AIService] 📂 Loading model from assets...");
      
      this.model = await loadTensorflowModel(modelPath);
      
      console.log("[AIService] ✅ Model loaded successfully");
      console.log("[AIService] 📊 Model Details:", {
        inputs: this.model.inputs,
        outputs: this.model.outputs
      });
      return true;
    } catch (e) {
      console.error("[AIService] ❌ Model load failed:", e);
      return false;
    }
  }

  async runInference(uri: string): Promise<number> {
    console.log(`[AIService] 📸 Starting inference for URI: ${uri.substring(0, 50)}...`);
    
    if (!this.model) {
      console.error("[AIService] 🛑 Inference aborted: Model is null");
      return 0;
    }

    try {
      // --- STEP 1: IMAGE MANIPULATION ---
      console.log(`[AIService] ⚙️ Resizing image to ${this.TARGET_SIZE}x${this.TARGET_SIZE}...`);
      const startManip = Date.now();
      
      const manipulated = await manipulateAsync(
        uri,
        [{ resize: { width: this.TARGET_SIZE, height: this.TARGET_SIZE } }],
        { base64: true, format: SaveFormat.JPEG }
      );
      
      console.log(`[AIService] ⏱️ Manipulation took ${Date.now() - startManip}ms`);

      const base64 = manipulated.base64;
      if (!base64) {
        console.error("[AIService] ❌ Error: Manipulated image has no base64 data");
        return 0;
      }
      console.log(`[AIService] 📏 Base64 length: ${base64.length} characters`);

      // --- STEP 2: DATA TRANSFORMATION ---
      console.log("[AIService] 🧠 Converting base64 to Uint8Array...");
      const startConvert = Date.now();
      
      const binaryString = atob(base64);
      const uint8Data = new Uint8Array(this.TARGET_SIZE * this.TARGET_SIZE * 3);
      
      for (let i = 0; i < binaryString.length && i < uint8Data.length; i++) {
        uint8Data[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`[AIService] ⏱️ Conversion took ${Date.now() - startConvert}ms. Buffer size: ${uint8Data.length}`);

      // --- STEP 3: TFLITE RUN ---
      console.log("[AIService] ⚡ Running TFLite Model.run()...");
      const startInference = Date.now();
      
      const result = await this.model.run([uint8Data]);
      
      console.log(`[AIService] ⏱️ Raw Inference took ${Date.now() - startInference}ms`);
      console.log(`[AIService] 📥 Raw Model Output count: ${result.length} tensors`);

      // --- STEP 4: RESULT ANALYSIS ---
      let maxConfidence = 0;
      
      result.forEach((tensor, index) => {
        const flat = Array.isArray(tensor) ? tensor.flat() : [tensor];
        const localMax = Math.max(...(flat as number[]));
        
        // MobileNet SSD usually has:
        // Index 0: Boxes, Index 1: Classes, Index 2: Scores
        console.log(`[AIService] 🔍 Tensor[${index}] info:`, {
          length: (tensor as any).length || 1,
          maxVal: localMax
        });

        const normalizedMax = localMax > 1 ? localMax / 255 : localMax;
        
        if (normalizedMax > maxConfidence) {
          maxConfidence = normalizedMax;
        }
      });

      console.log(`[AIService] 🎯 Final Max Confidence: ${(maxConfidence * 100).toFixed(2)}%`);
      return maxConfidence;

    } catch (err) {
      console.error("[AIService] 💥 CRITICAL INFERENCE ERROR:", err);
      return 0;
    }
  }

  logDetection(confidence: number) {
    if (confidence > 0.5) {
      console.warn(`[LOK-AWAZ ALERT] ⚠️ POTHOLE DETECTED (${(confidence * 100).toFixed(1)}%)`);
    } else {
      console.log(`[LOK-AWAZ] Road clear (${(confidence * 100).toFixed(1)}%)`);
    }
  }
}

export default new AIService();