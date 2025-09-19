import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  Alert, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification 
} from 'firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { auth } from '../Firebase/firebaseconfig';

type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // <-- loading state

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true); // <-- show loading
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (userCredential.user.emailVerified) {
        // onAuthStateChanged will take care of navigation
      } else {
        Alert.alert(
          "Verify Your Email",
          "You must verify your email before logging in.",
          [
            { text: "Resend Link", onPress: async () => {
              try {
                await sendEmailVerification(userCredential.user);
                Alert.alert("Verification Sent", "Please check your inbox.");
              } catch (err) {
                Alert.alert("Error", "Could not resend verification email.");
              }
            }},
            { text: "OK" }
          ]
        );
        await signOut(auth);
      }

    } catch (err: any) {
      let message = 'An error occurred during login.';
      if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        message = 'Incorrect password. Try again.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      setError(message);
      console.error(err);
    } finally {
      setLoading(false); // <-- hide loading
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
        autoCapitalize="none"
        placeholderTextColor="#888"
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading} // disable button while loading
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

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
    fontSize: 32, 
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
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
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
