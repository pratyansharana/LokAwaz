import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Text, 
  Alert, 
  TouchableOpacity 
} from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { auth } from '../Firebase/firebaseconfig'; // Ensure this path is correct

// Define types for your navigator's screens
type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (email === '' || password === '') {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check for email verification
      if (userCredential.user.emailVerified) {
        // User is verified, onAuthStateChanged will navigate to HomeScreen
      } else {
        // User is not verified, show an alert and sign them out
        Alert.alert(
          "Verify Your Email",
          "You must verify your email address before logging in. Please check your inbox.",
          [{ text: "OK" }]
        );
        await signOut(auth); // Sign out the unverified user
      }

    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('An error occurred during login.');
      }
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      
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

      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <View style={styles.buttonContainer}>
        <Button title="Login" onPress={handleLogin}/>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.loginText}>Don't have an account? Sign Up</Text>
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
    fontSize: 38, 
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

export default LoginScreen;