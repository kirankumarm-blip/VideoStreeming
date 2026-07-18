import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export default function LoginScreen({ navigation }) {
  const { loginUser, apiUrl, updateApiUrl } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(apiUrl);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      // 1. Call generateOtp webhook before sign in completes
      await api.auth.otp(email, 'generateOtp');
      setIsOtpMode(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Verification initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP code');
      return;
    }
    setLoading(true);
    try {
      // 2. Verify OTP
      await api.auth.otp(email, 'verifyOtp', otpCode);
      
      // 3. Complete authentication
      await loginUser(email, password);
    } catch (e) {
      Alert.alert('Error', e.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !mobile || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await api.auth.signup(name, email, mobile, password);
      Alert.alert('Success', 'Account created successfully! Please sign in.', [
        { text: 'OK', onPress: () => setIsRegisterMode(false) }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const saveServerConfig = async () => {
    await updateApiUrl(inputUrl);
    setShowServerConfig(false);
    Alert.alert('Success', `Base URL updated to: ${inputUrl}`);
  };

  if (isOtpMode) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>Please enter the 6-digit verification code sent to your registered email.</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="123456"
              placeholderTextColor="#555"
              value={otpCode}
              onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ''))} // Numeric OTP Lock
              keyboardType="numeric"
              maxLength={6}
              textAlign="center"
            />
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleOtpSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnLink} onPress={() => setIsOtpMode(false)}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.brand}>VStreem</Text>
        <Text style={styles.title}>{isRegisterMode ? t('auth.signUp') : t('auth.signIn')}</Text>

        {isRegisterMode && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('auth.fullName')}</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#555"
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('auth.mobileNumber')}</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit number"
                placeholderTextColor="#555"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </View>
          </>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('auth.emailAddress')}</Text>
          <TextInput
            style={styles.input}
            placeholder="email@address.com"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Min 6 characters"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.btnPrimary} 
          onPress={isRegisterMode ? handleSignUp : handleSignIn} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {isRegisterMode ? t('auth.register') : t('auth.signIn')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.btnLink} 
          onPress={() => setIsRegisterMode(!isRegisterMode)}
        >
          <Text style={styles.linkText}>
            {isRegisterMode ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
          </Text>
        </TouchableOpacity>

        {/* Server Config Drawer Toggle */}
        <TouchableOpacity style={styles.configToggle} onPress={() => setShowServerConfig(!showServerConfig)}>
          <Text style={styles.configToggleText}>⚙️ Server Settings</Text>
        </TouchableOpacity>

        {showServerConfig && (
          <View style={styles.configCard}>
            <Text style={styles.label}>API Base URL</Text>
            <TextInput
              style={styles.input}
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.btnSecondary} onPress={saveServerConfig}>
              <Text style={styles.btnText}>Save Config</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  scrollContainer: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brand: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E50914',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0AB',
    textAlign: 'center',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#A0A0AB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#121217',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
  },
  otpInput: {
    backgroundColor: '#121217',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 8,
    padding: 16,
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  btnPrimary: {
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnSecondary: {
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#A0A0AB',
    fontSize: 14,
  },
  configToggle: {
    alignItems: 'center',
    marginTop: 40,
  },
  configToggleText: {
    color: '#555',
    fontSize: 12,
  },
  configCard: {
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  }
});
