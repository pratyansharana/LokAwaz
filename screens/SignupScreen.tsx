import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Alert // Make sure Alert is imported
} from 'react-native';
// Import both createUser and signOut from firebase/auth
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Import your Firebase auth instance
import { auth } from '../Firebase/firebaseconfig'; // Ensure this path is correct

// Define the types for your authentication stack's parameters
type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

// Define the type for the screen's props
type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const SignupScreen = ({ navigation }: SignupScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

const handleSignUp = async () => {
  setError(null);

  // ... (validation code remains the same)

  try {
    // 1. Create the user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. NEW: Send the verification email to the newly created user
    await sendEmailVerification(user);

    // 3. Sign the user out
    await signOut(auth);

    // 4. Inform the user to check their email
    Alert.alert(
      "Account Created!",
      "We've sent a verification link to your email address. Please verify your email before logging in.",
      [{ text: "OK", onPress: () => navigation.navigate('Login') }]
    );

  } catch (err: any) {
    // ... (error handling remains the same)
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a New Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#888"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor="#888"
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <View style={styles.buttonContainer}>
        <Button title="Sign Up" onPress={handleSignUp} />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold',
    marginBottom: 24, 
    textAlign: 'center',
    color: '#333'
  },
  input: { 
    height: 50, 
    borderColor: '#ddd', 
    borderWidth: 1, 
    marginBottom: 15, 
    paddingHorizontal: 15, 
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333'
  },
  buttonContainer: {
    marginVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 5,
  },
  errorText: { 
    color: '#D8000C', 
    marginBottom: 10, 
    textAlign: 'center',
    fontWeight: '600'
  },
  loginText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600'
  }
});

export default SignupScreen;