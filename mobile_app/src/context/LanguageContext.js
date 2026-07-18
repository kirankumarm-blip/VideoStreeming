import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.categories': 'Categories',
    'nav.watchLater': 'Watch Later',
    'nav.downloads': 'Downloads',
    'nav.profile': 'Profile',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.emailAddress': 'Email Address',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.mobileNumber': 'Mobile Number',
    'auth.register': 'Register',
    'auth.signingIn': 'Signing In...',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.alreadyHaveAccount': 'Already have an account?',
    'player.save': 'Save',
    'player.saved': 'Saved',
    'player.download': 'Download',
    'player.downloading': 'Downloading...',
    'player.downloaded': 'Downloaded',
    'profile.title': 'My Profile',
    'profile.logout': 'Logout',
    'profile.changeLanguage': 'Change Language',
    'dashboard.search': 'Search lessons...'
  },
  hi: {
    'nav.home': 'होम',
    'nav.explore': 'एक्सप्लोर',
    'nav.categories': 'श्रेणियाँ',
    'nav.watchLater': 'बाद में देखें',
    'nav.downloads': 'डाउनलोड',
    'nav.profile': 'प्रोफ़ाइल',
    'auth.signIn': 'लॉग इन करें',
    'auth.signUp': 'साइन अप करें',
    'auth.emailAddress': 'ईमेल पता',
    'auth.password': 'पासवर्ड',
    'auth.fullName': 'पूरा नाम',
    'auth.mobileNumber': 'मोबाइल नंबर',
    'auth.register': 'रजिस्टर करें',
    'auth.signingIn': 'लॉग इन हो रहा है...',
    'auth.dontHaveAccount': "खाता नहीं है?",
    'auth.alreadyHaveAccount': 'पहले से खाता है?',
    'player.save': 'सहेजें',
    'player.saved': 'सहेजा गया',
    'player.download': 'डाउनलोड',
    'player.downloading': 'डाउनलोड हो रहा है...',
    'player.downloaded': 'डाउनलोड हो गया',
    'profile.title': 'मेरी प्रोफ़ाइल',
    'profile.logout': 'लॉग आउट',
    'profile.changeLanguage': 'भाषा बदलें',
    'dashboard.search': 'पाठ खोजें...'
  },
  kn: {
    'nav.home': 'ಮುಖಪುಟ',
    'nav.explore': 'ಅನ್ವೇಷಿಸಿ',
    'nav.categories': 'ವರ್ಗಗಳು',
    'nav.watchLater': 'ನಂತರ ವೀಕ್ಷಿಸಿ',
    'nav.downloads': 'ಡೌನ್‌ಲೋಡ್‌ಗಳು',
    'nav.profile': 'ಪ್ರೊಫೈಲ್',
    'auth.signIn': 'ಸೈನ್ ಇನ್',
    'auth.signUp': 'ಸೈನ್ ಅಪ್',
    'auth.emailAddress': 'ಇಮೇಲ್ ವಿಳಾಸ',
    'auth.password': 'ಪಾಸ್‌ವರ್ಡ್',
    'auth.fullName': 'ಪೂರ್ಣ ಹೆಸರು',
    'auth.mobileNumber': 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    'auth.register': 'ನೋಂದಾಯಿಸಿ',
    'auth.signingIn': 'ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ...',
    'auth.dontHaveAccount': 'ಖಾತೆ ಇಲ್ಲವೇ?',
    'auth.alreadyHaveAccount': 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?',
    'player.save': 'ಉಳಿಸಿ',
    'player.saved': 'ಉಳಿಸಲಾಗಿದೆ',
    'player.download': 'ಡೌನ್‌ಲೋಡ್',
    'player.downloading': 'ಡೌನ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    'player.downloaded': 'ಡೌನ್‌ಲೋಡ್ ಆಗಿದೆ',
    'profile.title': 'ನನ್ನ ಪ್ರೊಫೈಲ್',
    'profile.logout': 'ಲಾಗ್ ಔಟ್',
    'profile.changeLanguage': 'ಭಾಷೆ ಬದಲಾಯಿಸಿ',
    'dashboard.search': 'ಪಾಠಗಳನ್ನು ಹುಡುಕಿ...'
  }
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem('locale').then(val => {
      if (val) setLocale(val);
    });
  }, []);

  const changeLanguage = async (lang) => {
    setLocale(lang);
    await AsyncStorage.setItem('locale', lang);
  };

  const t = (key, defaultValue = '') => {
    return translations[locale]?.[key] || defaultValue || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
