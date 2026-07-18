import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ProfileScreen() {
  const { user, logoutUser, apiUrl } = useAuth();
  const { locale, t, changeLanguage } = useLanguage();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logoutUser(), style: 'destructive' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{t('profile.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t('auth.fullName')}</Text>
        <Text style={styles.value}>{user?.name || 'VStream User'}</Text>
        
        <View style={styles.divider} />

        <Text style={styles.label}>{t('auth.emailAddress')}</Text>
        <Text style={styles.value}>{user?.email || 'N/A'}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>{t('auth.mobileNumber')}</Text>
        <Text style={styles.value}>{user?.mobile || 'N/A'}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Server Base URL</Text>
        <Text style={styles.value}>{apiUrl}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('profile.changeLanguage')}</Text>
      <View style={styles.languageContainer}>
        {['en', 'hi', 'kn'].map((lang) => {
          const isSelected = locale === lang;
          const label = lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'ಕನ್ನಡ';
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.langBtn, isSelected && styles.langBtnActive]}
              onPress={() => changeLanguage(lang)}
            >
              <Text style={[styles.langBtnText, isSelected && styles.langBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    padding: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 24,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A0A0AB',
    marginTop: 32,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  label: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#27272A',
    marginVertical: 12,
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  langBtn: {
    flex: 1,
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  langBtnText: {
    color: '#A0A0AB',
    fontSize: 14,
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: '#FFF',
  },
  btnLogout: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
