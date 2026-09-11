import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import PremiumSelect from '../components/PremiumSelect';

const AVAILABLE_SUBTITLE_LANGUAGES = [
  { id: 'en', name: 'English (EN)' },
  { id: 'es', name: 'Spanish (ES)' },
  { id: 'hi', name: 'Hindi (HI)' },
  { id: 'fr', name: 'French (FR)' },
  { id: 'de', name: 'German (DE)' }
];

const generateTranscriptForVideo = (videoObj, lang = 'en', totalDuration = 180) => {
  if (!videoObj) return [];

  // 1. If explicit transcript array provided on videoObj, use it
  if (Array.isArray(videoObj.transcript) && videoObj.transcript.length > 0) {
    return videoObj.transcript.map((cue, idx) => ({
      id: cue.id || idx + 1,
      start: cue.start !== undefined ? Number(cue.start) : idx * 4,
      end: cue.end !== undefined ? Number(cue.end) : (idx + 1) * 4,
      speaker: cue.speaker || 'Instructor',
      text: cue.text || cue.content || ''
    }));
  }

  const rawTitle = (videoObj.title || '').toLowerCase();
  const rawCat = (videoObj.category || '').toLowerCase();
  const rawDesc = (videoObj.description || '').toLowerCase();
  const combined = `${rawTitle} ${rawCat} ${rawDesc}`;

  // Detect subject matter
  const isJava = combined.includes('java') || combined.includes('demo') || combined.includes('mobile') || combined.includes('telusko') || combined.includes('vd cc') || combined.includes('class') || combined.includes('oop');
  const isPython = combined.includes('python') || combined.includes('django') || combined.includes('flask') || combined.includes('pandas') || combined.includes('numpy') || combined.includes('ml');
  const isWeb = combined.includes('react') || combined.includes('javascript') || combined.includes('html') || combined.includes('css') || combined.includes('frontend') || combined.includes('node') || combined.includes('web');

  const getLanguagePhrases = (l) => {
    if (isJava) {
      switch (l) {
        case 'hi':
          return [
            "नमस्ते दोस्तों, जावा प्रोग्रामिंग के इस सत्र में आपका स्वागत है।",
            "आज के इस वीडियो में हम जावा में Classes और Objects के बारे में विस्तार से जानेंगे।",
            "जैसे कि आप स्क्रीन पर देख सकते हैं, हमने VS Code में Demo.java फाइल खोली हुई है।",
            "सबसे पहले हम Mobile नाम से एक नई Class बनाना शुरू करते हैं।",
            "ऑब्जेक्ट ओरिएंटेड प्रोग्रामिंग में क्लास एक खाका यानी Blueprint होती है।",
            "अब Mobile क्लास के अंदर हमें कुछ Instance Variables घोषित करने होंगे।",
            "पहला वेरिएबल हम String brand रखेंगे ताकि ब्रांड का नाम स्टोर किया जा सके।",
            "दूसरा वेरिएबल हम int price रखेंगे जो मोबाइल की कीमत तय करेगा।",
            "और तीसरा वेरिएबल हम String network जोड़ेंगे जिससे 4G या 5G नेटवर्क पता चले।",
            "ये सभी वेरिएबल्स हर मोबाइल ऑब्जेक्ट का व्यक्तिगत डेटा स्टोर करेंगे।",
            "अब नीचे चलकर हम अपनी मुख्य क्लास public class Demo तैयार करते हैं।",
            "इसके अंदर हम public static void main स्ट्रिंग एरे आर्ग्स लिखेंगे।",
            "यह मेन मेथड जावा वर्चुअल मशीन का शुरुआती बिंदु यानी Entry Point होता है।",
            "अब सवाल यह है कि Mobile क्लास से वास्तविक ऑब्जेक्ट कैसे बनाएं?",
            "ऑब्जेक्ट बनाने के लिए हम जावा में 'new' कीवर्ड का इस्तेमाल करते हैं।",
            "हम लिखेंगे: Mobile obj1 = new Mobile();",
            "ऐसा करने पर JVM हीप मेमोरी (Heap Memory) में जगह आवंटित कर देता है।",
            "अब obj1 उस मेमोरी का Reference Variable बन जाता है।",
            "आइए पहले ऑब्जेक्ट में डेटा इनिशियलाइज़ करते हैं।",
            "हम लिखेंगे obj1.brand = 'Apple';",
            "इसके बाद obj1.price = 1500;",
            "और obj1.network = '5G';",
            "अब एक दूसरा ऑब्जेक्ट बनाते हैं ताकि मेमोरी अंतर को समझ सकें।",
            "हम लिखेंगे: Mobile obj2 = new Mobile();",
            "दूसरे ऑब्जेक्ट के लिए हम सेट करेंगे obj2.brand = 'Samsung';",
            "और obj2.price = 1200;",
            "तथा obj2.network = '5G';",
            "अब obj1 और obj2 दोनों मेमोरी में स्वतंत्र रूप से मौजूद हैं।",
            "यदि हम obj1 की कीमत बदलते हैं, तो obj2 पर कोई प्रभाव नहीं पड़ेगा।",
            "आइए इन्हें System.out.println की मदद से स्क्रीन पर प्रिंट करते हैं।",
            "हम obj1.brand और obj1.price को कंसोल में आउटपुट करेंगे।",
            "और ठीक इसी तरह obj2 के ब्रांड और कीमत को भी प्रिंट करेंगे।",
            "अब टर्मिनल खोलकर जावा कोड को कंपाइल करते हैं।",
            "हम javac Demo.java रन करेंगे जिससे बाइटकोड तैयार हो सके।",
            "आप देखेंगे कि कंपाइलर Demo.class और Mobile.class दोनों फाइलें बनाता है।",
            "अब java Demo कमांड चलाकर प्रोग्राम को एक्सिक्यूट करते हैं।",
            "टर्मिनल में देखें — दोनों ऑब्जेक्ट्स का अपना अलग आउटपुट दिखाई दे रहा है!",
            "अब मान लीजिए हमें एक ऐसा वेरिएबल चाहिए जो सभी मोबाइल्स के लिए कॉमन हो?",
            "जैसे कि हर फोन एक SmartPhone है।",
            "हर ऑब्जेक्ट में अलग कॉपी बनाने के बजाय हम static कीवर्ड का उपयोग करते हैं।",
            "जब हम static String name = 'SmartPhone' लिखते हैं...",
            "तो यह वेरिएबल पूरी क्लास का बन जाता है, किसी एक ऑब्जेक्ट का नहीं।",
            "यह क्लास मेमोरी एरिया में सिर्फ एक बार लोड होता है।",
            "स्टैटिक वेरिएबल को कॉल करने के लिए किसी ऑब्जेक्ट की भी आवश्यकता नहीं होती।",
            "आप सीधे Mobile.name लिखकर इसे एक्सेस कर सकते हैं।",
            "आइए कोड में Mobile.name प्रिंट करके इसकी पुष्टि करते हैं।",
            "यदि हम Mobile.name बदलते हैं, तो सभी ऑब्जेक्ट्स में तुरंत बदलाव दिखाई देगा।",
            "यही Instance Variables और Static Members के बीच का मुख्य अंतर है।",
            "अपने IDE में इस कोड को अवश्य लिखकर अभ्यास करें।",
            "अगले वीडियो में हम स्टैटिक मेथड्स और कंस्ट्रक्टर्स को समझेंगे।",
            "वीडियो देखने के लिए धन्यवाद, और कोडिंग करते रहें!"
          ];
        case 'es':
          return [
            "Hola a todos, bienvenidos de nuevo al canal.",
            "En esta sesión, exploraremos las Clases y Objetos en Java en detalle.",
            "Como pueden ver en pantalla, tenemos nuestro editor con Demo.java abierto.",
            "Comencemos definiendo una clase llamada Mobile.",
            "Recuerden que en POO, una clase funciona como un plano o plantilla.",
            "Dentro de la clase Mobile, declararemos algunas variables de instancia.",
            "Primero, declaremos String brand para almacenar la marca del teléfono.",
            "Luego, declaremos int price para el precio del dispositivo.",
            "Y agreguemos String network para especificar la red 4G o 5G.",
            "Estas variables almacenarán las propiedades de cada objeto móvil.",
            "Ahora creamos nuestra clase principal: public class Demo.",
            "Dentro de Demo, escribimos public static void main(String[] args).",
            "Este método main es el punto de entrada de la aplicación en la JVM.",
            "Ahora, ¿cómo instanciamos un objeto a partir de la clase Mobile?",
            "Utilizamos la palabra clave 'new' para crear el objeto en memoria.",
            "Escribimos: Mobile obj1 = new Mobile();",
            "Esto asigna espacio dinámico dentro de la memoria heap de la JVM.",
            "obj1 es la variable de referencia que apunta a ese objeto.",
            "Inicialicemos los valores para nuestro primer objeto móvil.",
            "Escribimos: obj1.brand = 'Apple';",
            "Luego: obj1.price = 1500;",
            "Y establecemos obj1.network = '5G';",
            "Ahora creamos un segundo objeto: Mobile obj2 = new Mobile();",
            "Para este segundo objeto asignamos obj2.brand = 'Samsung';",
            "Y definimos obj2.price = 1200 junto con su red.",
            "Observen cómo obj1 y obj2 existen de forma totalmente independiente.",
            "Si modificamos el precio de obj1, obj2 no se ve afectado.",
            "Imprimamos estos valores usando System.out.println en la consola.",
            "Mostramos la marca y el precio de ambos objetos por separado.",
            "Abrimos la terminal y compilamos el archivo con javac Demo.java.",
            "El compilador generará el bytecode en los archivos .class correspondientes.",
            "Ejecutamos el programa con el comando java Demo.",
            "Vean en la terminal cómo cada objeto imprime sus valores asignados.",
            "Ahora, ¿qué ocurre si queremos una propiedad compartida por todos los teléfonos?",
            "Por ejemplo, todos los modelos pertenecen a la categoría SmartPhone.",
            "En lugar de duplicar la variable en cada objeto, usamos la palabra clave static.",
            "Al declarar static String name = 'SmartPhone'...",
            "Esta variable pertenece a la clase y es compartida por todas las instancias.",
            "Se almacena en el área de memoria de clase y se carga una sola vez.",
            "Para acceder a una variable estática no se necesita crear un objeto.",
            "Podemos acceder a ella directamente escribiendo Mobile.name.",
            "Probemos imprimiendo Mobile.name en nuestro programa.",
            "Si cambiamos Mobile.name, el cambio se refleja en todos los objetos.",
            "Esa es la diferencia fundamental entre miembros de instancia y miembros estáticos.",
            "Practiquen escribiendo este código en su editor para dominar el concepto.",
            "En la próxima lección abordaremos métodos estáticos y constructores.",
            "¡Muchas gracias por acompañarnos y feliz programación!"
          ];
        case 'fr':
          return [
            "Bonjour à tous et bienvenue dans ce tutoriel de programmation Java.",
            "Dans cette session, nous allons étudier les classes et les objets en Java.",
            "Comme vous le voyez à l'écran, nous avons ouvert le fichier Demo.java.",
            "Commençons par définir une classe nommée Mobile.",
            "En programmation orientée objet, une classe sert de modèle fondamental.",
            "À l'intérieur de la classe Mobile, déclarons des variables d'instance.",
            "Tout d'abord, déclarons String brand pour stocker la marque du téléphone.",
            "Ensuite, déclarons int price pour enregistrer le prix de l'appareil.",
            "Et ajoutons String network pour préciser le type de réseau compatible.",
            "Ces variables d'instance contiendront l'état de chaque objet.",
            "Créons maintenant notre classe exécutable: public class Demo.",
            "À l'intérieur, déclarons la méthode public static void main.",
            "C'est ici que la machine virtuelle Java commence l'exécution.",
            "Comment instancier concrètement un objet Mobile en mémoire?",
            "Nous utilisons le mot-clé 'new' pour allouer l'objet dans le tas (Heap).",
            "Écrivons: Mobile obj1 = new Mobile();",
            "obj1 devient ainsi une référence pointant vers l'objet créé.",
            "Initialisons les propriétés de notre premier objet.",
            "Nous écrivons: obj1.brand = 'Apple';",
            "Puis: obj1.price = 1500;",
            "Et enfin obj1.network = '5G';",
            "Créons maintenant un deuxième objet: Mobile obj2 = new Mobile();",
            "Pour obj2, définissons la marque à 'Samsung' et le prix à 1200.",
            "Les deux objets coexistent de manière indépendante en mémoire.",
            "Affichons leurs valeurs dans la console avec System.out.println.",
            "Ouvrons le terminal pour compiler le code avec javac Demo.java.",
            "Le compilateur génère les fichiers bytecode Demo.class et Mobile.class.",
            "Exécutons ensuite le programme avec la commande java Demo.",
            "Chaque objet affiche correctement ses valeurs respectives.",
            "Que faire si nous voulons une propriété commune partagée par tous les mobiles?",
            "C'est ici qu'intervient le mot-clé static en Java.",
            "En déclarant static String name = 'SmartPhone'...",
            "La variable est rattachée à la classe elle-même et non aux instances.",
            "On peut y accéder directement sans créer d'objet, via Mobile.name.",
            "C'est la différence clé entre variables d'instance et membres statiques.",
            "Entraînez-vous à reproduire cet exemple dans votre IDE.",
            "À très bientôt pour la suite du cours et bon code à tous!"
          ];
        case 'de':
          return [
            "Hallo zusammen und willkommen zurück zu unserem Java-Kurs.",
            "In dieser Lektion behandeln wir Klassen und Objekte in Java.",
            "Wie Sie auf dem Bildschirm sehen, haben wir die Datei Demo.java geöffnet.",
            "Beginnen wir mit der Deklaration einer Klasse namens Mobile.",
            "In der objektorientierten Programmierung ist eine Klasse ein Bauplan.",
            "Innerhalb der Klasse Mobile deklarieren wir Instanzvariablen.",
            "Zuerst deklarieren wir String brand für den Herstellernamen.",
            "Als Nächstes deklarieren wir int price für den Preis des Geräts.",
            "Und String network zur Angabe des Netzwerks wie 4G oder 5G.",
            "Diese Variablen speichern die individuellen Zustände jedes Objekts.",
            "Nun erstellen wir unsere Hauptklasse: public class Demo.",
            "Darin definieren wir die Methode public static void main.",
            "Hier startet die Java Virtual Machine die Programmausführung.",
            "Wie erzeugen wir nun ein konkretes Mobile-Objekt im Speicher?",
            "Wir verwenden das Schlüsselwort 'new' zur Instanziierung.",
            "Wir schreiben: Mobile obj1 = new Mobile();",
            "Damit wird im Heap-Speicher Speicherplatz für das Objekt reserviert.",
            "Initialisieren wir die Werte für dieses erste Objekt.",
            "Wir setzen obj1.brand = 'Apple' und obj1.price = 1500.",
            "Nun erstellen wir ein zweites Objekt: Mobile obj2 = new Mobile();",
            "Für obj2 setzen wir obj2.brand = 'Samsung' und obj2.price = 1200.",
            "Beide Objekte existieren vollkommen unabhängig im Speicher.",
            "Geben wir diese Werte mit System.out.println in der Konsole aus.",
            "Im Terminal kompilieren wir den Code mit javac Demo.java.",
            "Anschließend führen wir das Programm mit java Demo aus.",
            "Was machen wir, wenn ein Attribut für alle Objekte identisch sein soll?",
            "Dafür nutzen wir in Java das Schlüsselwort static.",
            "Mit static String name = 'SmartPhone' gehört die Variable zur Klasse.",
            "Man kann direkt über Mobile.name darauf zugreifen.",
            "Das ist der zentrale Unterschied zwischen Instanz- und statischen Variablen.",
            "Vielen Dank fürs Zuschauen und weiterhin viel Erfolg beim Programmieren!"
          ];
        case 'en':
        default:
          return [
            "Hello everyone, welcome back to this programming tutorial.",
            "In this session, we are going to dive deep into Classes and Objects in Java.",
            "As you can see on the screen, we have our editor open with Demo.java.",
            "Let's begin by defining a class called Mobile.",
            "Remember, in object-oriented programming, a class is like a blueprint for objects.",
            "Inside the Mobile class, we need some instance variables.",
            "First, let's declare String brand to store the phone brand name.",
            "Next, let's declare int price for the cost of the mobile device.",
            "And let's add String network to specify 4G or 5G connectivity.",
            "Now, these variables will hold the properties of each mobile object.",
            "Let's move below the Mobile class and create our driver class, Demo.",
            "Inside Demo, we write public static void main String array args.",
            "This main method is where the JVM begins execution of our application.",
            "Now, how do we create an actual object from our Mobile class?",
            "We use the new keyword to instantiate an object in memory.",
            "Let's write: Mobile obj1 = new Mobile();",
            "What happens here is that memory is dynamically allocated inside the JVM heap.",
            "Now obj1 is a reference variable pointing to that newly allocated object.",
            "Let's initialize the values for this first object.",
            "We can write obj1.brand = \"Apple\";",
            "Then obj1.price = 1500;",
            "And obj1.network = \"5G\";",
            "Now, let's create a second mobile object to see how state differs.",
            "We write Mobile obj2 = new Mobile();",
            "For this second object, let's set obj2.brand = \"Samsung\";",
            "And obj2.price = 1200;",
            "Let's also set obj2.network = \"5G\";",
            "Now both obj1 and obj2 exist independently in memory.",
            "If we change the price of obj1, obj2 is completely unaffected.",
            "Let's print these out using System.out.println.",
            "We can print obj1.brand plus a colon plus obj1.price.",
            "And similarly for obj2: obj2.brand and obj2.price.",
            "Let's open the terminal and compile our Java source code.",
            "We run javac Demo.java to generate the bytecode.",
            "You'll notice that the compiler creates Demo.class and Mobile.class.",
            "Now let's run the program using java Demo.",
            "Look at the terminal output — each object prints its own separate values!",
            "Now, what if we want a property that is common to all mobiles?",
            "For example, every phone here is a SmartPhone.",
            "Instead of creating a separate copy in every object, we use static.",
            "When we declare static String name = \"SmartPhone\";",
            "This variable belongs to the class itself, not individual instances.",
            "It is stored in the special class memory area, loaded only once.",
            "To access a static variable, you don't even need an object reference.",
            "You can simply refer to it as Mobile.name directly.",
            "Let's test this in our code and print Mobile.name.",
            "If we change Mobile.name, it reflects across all objects immediately.",
            "That is the fundamental difference between instance and static members in Java.",
            "Make sure to practice writing this in your IDE to get hands-on experience.",
            "In the next video, we will explore static methods and constructors.",
            "Thank you for watching, and happy coding!"
          ];
      }
    } else if (isPython) {
      return [
        "Welcome to this Python programming session.",
        "In this lesson, we will explore fundamental data structures and algorithmic workflows.",
        "Let's inspect how functions and classes are declared in Python.",
        "Notice how dynamic typing and indentation make code clear and readable.",
        "We can define our functions with descriptive arguments and return values.",
        "Let's step through an interactive test in the terminal.",
        "Notice the execution flow and performance characteristics.",
        "Writing modular, reusable Python functions is essential for scalable applications.",
        "Review the key takeaways and practice in your local development environment."
      ];
    } else if (isWeb) {
      return [
        "Welcome to this modern web development lesson.",
        "In this session, we will break down frontend component architecture and state management.",
        "Notice how reactive state triggers UI updates smoothly without full page reloads.",
        "Let's look at event handlers, API integration, and rendering workflows.",
        "Best practices include maintaining clean separation of concerns and responsive layouts.",
        "Test your code across different viewport sizes and inspect console logs.",
        "In the next chapter, we will build out complete interactive interfaces."
      ];
    } else {
      return [
        `Welcome to this lesson on "${videoObj.title || 'Course Lesson'}".`,
        "In this session, we will explore the foundational principles and key techniques step by step.",
        "Let's examine the core architecture and see why this pattern is adopted across the industry.",
        "Notice how each step is logically structured for clarity and maintainability.",
        "Now let's look at a practical demonstration of this implementation.",
        "Key takeaways include writing clean, modular code and optimizing performance.",
        "Review the summary points below and test your knowledge in the chapter assessment."
      ];
    }
  };

  const phrases = getLanguagePhrases(lang);
  const dur = Math.max(45, Number(totalDuration) || 180);
  // Pace phrases naturally every 2.8 to 4.2 seconds
  const step = dur / phrases.length;

  return phrases.map((text, i) => {
    const start = Math.round(i * step * 10) / 10;
    const end = Math.round((i + 1) * step * 10) / 10;
    return {
      id: i + 1,
      start,
      end,
      speaker: 'Instructor',
      text
    };
  });
};

const VideoWatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  const [video, setVideo] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Custom Alert Modal State (Same as UserDashboard / Login page)
  const [customAlert, setCustomAlert] = useState({
    show: false,
    title: 'Upgrade Required',
    message: '',
    buttonText: 'OK',
    type: 'warning',
    icon: '👑'
  });

  const showUpgradeAlert = (message = 'Need to upgrade your plan') => {
    setCustomAlert({
      show: true,
      title: 'Upgrade Required',
      message,
      buttonText: 'OK',
      type: 'warning',
      icon: '👑'
    });
  };

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.email || localStorage.getItem('user_email') || currentUser?.username || 'user@lurnax.com';
  const userPlan = String(location.state?.userPlan ?? location.state?.user_plan ?? currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1');

  const isChapterLocked = (lesson, courseObj = null) => {
    if (!lesson) return false;
    if (userPlan !== '1') return false;

    const vis = lesson.visibility ?? lesson.visibility_id ?? lesson.is_private ?? lesson.isPrivate ?? courseObj?.visibility ?? courseObj?.visibility_id;
    const visStr = String(vis || '').toLowerCase();
    return visStr === '2' || visStr === 'private' || vis === true || vis === 2;
  };
  
  const playerContainerRef = useRef(null);
  const videoRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const [lastPositionLoaded, setLastPositionLoaded] = useState(false);
  const [savedPositionText, setSavedPositionText] = useState('');

  // Playback detailed analytics tracking
  const trackingDataRef = useRef({
    isNewSession: true,
    watchTime: 0,
    pausedCount: 0,
    forwardedCount: 0,
    backwardCount: 0
  });
  const prevTimeRef = useRef(0);
  const isResumingRef = useRef(false);
  const seekStartTimeRef = useRef(0);
  const idRef = useRef(id);
  const currentTimeRef = useRef(0);
  const videoRefData = useRef(null);

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  useEffect(() => {
    videoRefData.current = video;
    if (videoRef.current && video) {
      videoRef.current.load();
      setIsPlaying(true);
      videoRef.current.play().catch(err => {
        console.log("Autoplay prevented:", err);
        setIsPlaying(false);
      });
    }
  }, [video]);

  const [ipAddress, setIpAddress] = useState('127.0.0.1');
  const sessionStartedAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    sessionStartedAtRef.current = new Date().toISOString();
  }, [id]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setIpAddress(data.ip))
      .catch(err => console.log("Failed to fetch IP, using fallback", err));
  }, []);

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablet";
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return "Mobile";
    }
    return "Desktop";
  };

  const getPlatform = () => {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "MacOS";
    if (ua.indexOf("X11") !== -1) return "UNIX";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
    if (/Android/.test(ua)) return "Android";
    return navigator.platform || "Unknown";
  };

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1.0); // 0.0 to 1.0
  const [isMuted, setIsMuted] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);

  // Subtitles & Interactive Transcript States
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState('en');
  const [activeCue, setActiveCue] = useState(null);
  const [activeWatchTab, setActiveWatchTab] = useState('overview'); // 'overview' | 'transcript' | 'resources'
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const activeCueItemRef = useRef(null);
  const transcriptContainerRef = useRef(null);

  // Synchronized transcript cues derived from video, lang and duration
  const transcriptCues = React.useMemo(() => {
    return generateTranscriptForVideo(video, subtitleLang, duration || 180);
  }, [video, subtitleLang, duration]);

  // Auto-scroll active cue into view in transcript panel
  useEffect(() => {
    if (autoScrollTranscript && activeCue && activeWatchTab === 'transcript' && activeCueItemRef.current) {
      activeCueItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeCue, autoScrollTranscript, activeWatchTab]);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        trackingDataRef.current.watchTime += 1;
        if (trackingDataRef.current.watchTime > 0 && trackingDataRef.current.watchTime % 10 === 0) {
          saveProgress();
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // YouTube metadata engagement states
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    fetchVideoAndRecommendations(location.state?.video);
    setLastPositionLoaded(false);
    setSavedPositionText('');
    
    return () => {
      clearInterval(trackingIntervalRef.current);
      saveProgress();
      
      const activeVid = videoRefData.current || location.state?.video;
      const activeCourse = location.state?.course;
      const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? location.state?.courseId ?? location.state?.course_id ?? 0;
      const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? location.state?.chapterId ?? location.state?.chapter_id ?? 0;
      const vidId = idRef.current || id || activeVid?.id;

      if (currentTimeRef.current >= 1 && vidId) {
        api.dashboard.getUser('watchHistory', { 
          id: vidId,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          course_id: cId,
          chapter_id: chapId,
          completion_percentage: Math.min(100, Math.round(((currentTimeRef.current || 1) / (duration || 300)) * 100))
        }).catch(err => {
          console.error("Failed to register watchHistory", err);
        });
      }
    };
  }, [id, location.state]);

  // Keyboard Hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'm':
          handleMuteToggle();
          break;
        case 'c':
          setSubtitlesEnabled(prev => !prev);
          break;
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSeek(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSeek(5);
          break;
        case 'arrowup':
          e.preventDefault();
          const upVol = Math.min(1.0, volume + 0.1);
          handleVolumeChange(upVol);
          break;
        case 'arrowdown':
          e.preventDefault();
          const downVol = Math.max(0.0, volume - 0.1);
          handleVolumeChange(downVol);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, subtitlesEnabled]);

  const fetchVideoAndRecommendations = async (passedVideo = null) => {
    setLoading(true);
    try {
      let videoData = passedVideo || location.state?.video;
      if (!videoData) {
        try {
          videoData = await api.videos.get(id);
        } catch (apiError) {
          console.warn("Could not load video details from API, using state or fallback", apiError);
        }
      }

      if (!videoData) {
        videoData = {
          id: id,
          title: `Lesson ${id}`,
          thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60',
          category: 'General',
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
          description: 'Streaming lesson player.'
        };
      } else {
        if (!videoData.videoUrl && videoData.video_url) {
          videoData.videoUrl = videoData.video_url;
        }
        if (!videoData.video_url && videoData.videoUrl) {
          videoData.video_url = videoData.videoUrl;
        }
        if (!videoData.thumbnail && videoData.thumbnailUrl) {
          videoData.thumbnail = videoData.thumbnailUrl;
        }
      }

      setVideo(videoData);
      setLikesCount(videoData.views ? Math.round(videoData.views * 0.12) : 12);
      setIsLiked(false);
      setIsDisliked(false);
      setIsSubscribed(false);

      // Fetch watch history
      const history = await api.videos.getHistory().catch(() => []);
      const completedFromHistory = history
        .filter(h => (h.completionPercentage >= 90 || h.status === true || h.staus === true))
        .map(h => String(h.videoId || h.id || h.video_url || ''));
      if (completedFromHistory.length > 0) {
        setCompletedLessonIds(prev => Array.from(new Set([...prev, ...completedFromHistory])));
      }

      const thisRecord = history.find(h => h.videoId === id);
      if (thisRecord && thisRecord.lastPosition > 5 && thisRecord.completionPercentage < 95) {
        const mins = Math.floor(thisRecord.lastPosition / 60);
        const secs = Math.floor(thisRecord.lastPosition % 60);
        setSavedPositionText(`${t('watch.resumeTitle')} (${mins}:${secs < 10 ? '0' : ''}${secs})`);
      }

      // Fetch related recommendations
      let list = [];
      try {
        list = await api.videos.list({ category: videoData.category });
      } catch (listError) {
        console.warn("Could not load recommendations", listError);
      }
      
      const filteredRecs = Array.isArray(list) 
        ? list.filter(v => String(v.id) !== String(id)) 
        : [];
      setRecommendations(filteredRecs.slice(0, 4));
    } catch (e) {
      console.error(e);
      setError('Failed to load video details');
    } finally {
      setLoading(false);
    }
  };

  // Track actually completed lesson IDs
  const [completedLessonIds, setCompletedLessonIds] = useState(() => {
    try {
      const stored = localStorage.getItem('completed_lessons_set');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markLessonAsCompleted = (lessonId) => {
    if (!lessonId) return;
    const strId = String(lessonId);
    setCompletedLessonIds(prev => {
      if (prev.includes(strId)) return prev;
      const updated = [...prev, strId];
      try {
        localStorage.setItem('completed_lessons_set', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const isLessonCompleted = (lesson) => {
    if (!lesson) return false;
    const lId = String(lesson.id || lesson.video_id || lesson.videoUrl || lesson.video_url || '');
    if (lId && completedLessonIds.includes(lId)) return true;
    if (lesson.id && completedLessonIds.includes(String(lesson.id))) return true;
    if (lesson.video_id && completedLessonIds.includes(String(lesson.video_id))) return true;
    if (lesson.videoUrl && completedLessonIds.includes(String(lesson.videoUrl))) return true;
    if (lesson.video_url && completedLessonIds.includes(String(lesson.video_url))) return true;
    return false;
  };

  // Chapter Accordion State
  const [expandedChapters, setExpandedChapters] = useState({});

  const toggleChapterExpand = (chapKey) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapKey]: prev[chapKey] !== undefined ? !prev[chapKey] : false
    }));
  };

  // Chapter Quiz Modal State
  const [quizModal, setQuizModal] = useState({
    show: false,
    title: '',
    quizId: 0,
    chapterId: 0,
    courseId: 0,
    questions: [],
    currentIdx: 0,
    userAnswers: {},
    isSubmitting: false,
    completed: false,
    results: null
  });

  const getFallbackQuestions = (quizTitle, chapId) => {
    const titleLower = (quizTitle || '').toLowerCase();
    if (String(chapId) === '1' || titleLower.includes('data types') || titleLower.includes('type script')) {
      return [
        {
          id: 1,
          question: "What is TypeScript?",
          options: ["A typed superset of JavaScript", "A relational database engine", "A CSS preprocessor framework", "A web server runtime"],
          correctAnswer: 0
        },
        {
          id: 2,
          question: "Which of the following is a primitive data type in TypeScript?",
          options: ["string", "Array", "Object", "Function"],
          correctAnswer: 0
        },
        {
          id: 3,
          question: "What keyword is used to declare a variable with an explicit type?",
          options: ["const name: string", "var name = string", "type name = string", "dim name as string"],
          correctAnswer: 0
        }
      ];
    } else {
      return [
        {
          id: 1,
          question: "What method is used to add an element to the end of an Array?",
          options: ["push()", "pop()", "shift()", "unshift()"],
          correctAnswer: 0
        },
        {
          id: 2,
          question: "How do you access the first element of an array 'arr'?",
          options: ["arr[0]", "arr[1]", "arr.first()", "arr.get(0)"],
          correctAnswer: 0
        },
        {
          id: 3,
          question: "What does Array.prototype.length return?",
          options: ["Total number of elements", "Memory size in bytes", "Array index limit", "Last element value"],
          correctAnswer: 0
        }
      ];
    }
  };

  const findQuizForChapter = (chapId, courseObj) => {
    if (!courseObj) {
      return { id: chapId || 1, title: `Chapter Quiz`, chapter_id: chapId || 1 };
    }
    
    // 1. Direct quiz property on courseObj or chapter
    if (courseObj.quiz && typeof courseObj.quiz === 'object') return courseObj.quiz;

    // 2. If courseObj.quizzes is a single object
    if (courseObj.quizzes && !Array.isArray(courseObj.quizzes) && typeof courseObj.quizzes === 'object') {
      return courseObj.quizzes;
    }

    // 3. Search in courseObj.quizzes array matching chapter_id
    if (Array.isArray(courseObj.quizzes) && courseObj.quizzes.length > 0) {
      const found = courseObj.quizzes.find(q => 
        q && (
          String(q.chapter_id || q.chapterId || q.chapter || '') === String(chapId) ||
          String(q.course_id || q.courseId || '') === String(courseObj.id || courseObj.course_id || '')
        )
      );
      if (found) return found;

      // If single quiz in array (or single chapter course), return the single quiz!
      if (courseObj.quizzes.length === 1) {
        return courseObj.quizzes[0];
      }
    }

    // 4. Search in courseObj.chapters array
    if (Array.isArray(courseObj.chapters) && courseObj.chapters.length > 0) {
      for (let i = 0; i < courseObj.chapters.length; i++) {
        const chap = courseObj.chapters[i];
        const cId = chap.id || chap.chapter_id || chap.chapterId;
        if (String(cId) === String(chapId) || courseObj.chapters.length === 1) {
          if (chap.quiz) return chap.quiz;
          if (Array.isArray(chap.quizzes) && chap.quizzes.length > 0) return chap.quizzes[0];
          if (chap.quiz_id || chap.quizId) return { id: chap.quiz_id || chap.quizId, title: chap.title || `Chapter Quiz` };
        }
      }
    }

    // 5. Fallback matching chapter_id to index in quizzes
    if (Array.isArray(courseObj.quizzes) && courseObj.quizzes.length > 0) {
      let idx = parseInt(chapId, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= courseObj.quizzes.length) {
        idx = 0;
      }
      return courseObj.quizzes[idx];
    }

    // 6. Default fallback so triggerQuizForChapter always executes
    return {
      id: courseObj.quiz_id || courseObj.quizId || chapId || 1,
      chapter_id: chapId || 1,
      title: `Chapter Quiz`
    };
  };

  const extractQuizFromResponse = (res, quizInfo, chapId) => {
    let actualQuiz = null;

    if (Array.isArray(res) && res.length > 0) {
      const item = res[0];
      if (item?.json?.quiz) actualQuiz = item.json.quiz;
      else if (item?.json?.questions) actualQuiz = item.json;
      else if (item?.json?.quizzes && Array.isArray(item.json.quizzes) && item.json.quizzes.length > 0) actualQuiz = item.json.quizzes[0];
      else if (item?.quiz) actualQuiz = item.quiz;
      else if (item?.questions) actualQuiz = item;
      else if (item?.quizzes && Array.isArray(item.quizzes) && item.quizzes.length > 0) actualQuiz = item.quizzes[0];
    } else if (res && typeof res === 'object') {
      if (res.json?.quiz) actualQuiz = res.json.quiz;
      else if (res.json?.questions) actualQuiz = res.json;
      else if (res.json?.quizzes && Array.isArray(res.json.quizzes) && res.json.quizzes.length > 0) actualQuiz = res.json.quizzes[0];
      else if (res.quiz) actualQuiz = res.quiz;
      else if (res.questions) actualQuiz = res;
      else if (res.quizzes && Array.isArray(res.quizzes) && res.quizzes.length > 0) actualQuiz = res.quizzes[0];
    }

    let questions = [];
    let title = quizInfo?.title || `Chapter ${chapId} Quiz`;

    if (actualQuiz) {
      if (Array.isArray(actualQuiz.questions) && actualQuiz.questions.length > 0) {
        questions = actualQuiz.questions;
      }
      if (actualQuiz.title) {
        title = actualQuiz.title;
      }
    }

    if (questions.length === 0 && Array.isArray(quizInfo?.questions) && quizInfo.questions.length > 0) {
      questions = quizInfo.questions;
    }

    if (questions.length === 0) {
      questions = getFallbackQuestions(title, chapId);
    }

    return {
      questions,
      title,
      quizId: actualQuiz?.quiz_id || actualQuiz?.id || quizInfo?.id || chapId
    };
  };

  const triggerQuizForChapter = async (chapId, cId, courseObj) => {
    // Verify that the video in this chapter has been watched
    const activeCourse = courseObj || location.state?.course;
    const allChaps = getCourseChapters(activeCourse);
    const targetChap = allChaps.find(c => String(c.id || '') === String(chapId));
    if (targetChap && targetChap.lessons && targetChap.lessons.length > 0) {
      const watchable = targetChap.lessons.filter(l => !isChapterLocked(l, activeCourse));
      const hasWatched = watchable.length > 0 && watchable.some(l => isLessonCompleted(l));
      if (watchable.length > 0 && !hasWatched) {
        setCustomAlert({
          show: true,
          title: 'Quiz Locked',
          message: 'Please watch the video lesson first to unlock this Chapter Quiz Assessment!',
          buttonText: 'OK'
        });
        return;
      }
    }

    let quizInfo = findQuizForChapter(chapId, courseObj);
    if (!quizInfo) {
      quizInfo = {
        id: courseObj?.quiz_id || courseObj?.quizId || chapId || 1,
        title: `Chapter Quiz`,
        chapter_id: chapId
      };
    }

    try {
      // Call vdUser API with formstep of getQuizDetails
      const res = await api.dashboard.getUser('getQuizDetails', {
        formstep: 'getQuizDetails',
        course_id: cId,
        chapter_id: chapId,
        quiz_id: quizInfo.id || quizInfo.quiz_id || chapId,
        id: quizInfo.id || chapId
      });

      const { questions, title, quizId } = extractQuizFromResponse(res, quizInfo, chapId);

      setQuizModal({
        show: true,
        title,
        quizId,
        chapterId: chapId,
        courseId: cId,
        questions,
        currentIdx: 0,
        userAnswers: {},
        isSubmitting: false,
        completed: false,
        results: null
      });
    } catch (err) {
      console.error("Failed to fetch quiz details via API, using fallback", err);
      const fallbackQs = (Array.isArray(quizInfo.questions) && quizInfo.questions.length > 0)
        ? quizInfo.questions
        : getFallbackQuestions(quizInfo.title || `Chapter ${chapId} Quiz`, chapId);

      setQuizModal({
        show: true,
        title: quizInfo.title || `Chapter ${chapId} Quiz`,
        quizId: quizInfo.id || chapId,
        chapterId: chapId,
        courseId: cId,
        questions: fallbackQs,
        currentIdx: 0,
        userAnswers: {},
        isSubmitting: false,
        completed: false,
        results: null
      });
    }
  };

  const handleSelectOption = (optIdx) => {
    const q = quizModal.questions[quizModal.currentIdx];
    if (!q) return;
    setQuizModal(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [q.id]: optIdx
      }
    }));
  };

  const handleTextAnswer = (textVal) => {
    const q = quizModal.questions[quizModal.currentIdx];
    if (!q) return;
    // Disallow leading whitespace and empty spaces
    const sanitized = (textVal || '').replace(/^\s+/, '');
    setQuizModal(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [q.id]: sanitized
      }
    }));
  };

  const isCurrentQuestionAnswered = () => {
    const currentQ = quizModal.questions[quizModal.currentIdx];
    if (!currentQ) return false;
    const ans = quizModal.userAnswers[currentQ.id];
    if (ans === undefined || ans === null) return false;
    const qType = String(currentQ.question_type || currentQ.questionType || 1);
    if (qType === '3') {
      return String(ans).trim().length > 0;
    }
    return true;
  };

  const handleNextQuizQuestion = () => {
    if (quizModal.currentIdx < quizModal.questions.length - 1) {
      setQuizModal(prev => ({
        ...prev,
        currentIdx: prev.currentIdx + 1
      }));
    }
  };

  const navigateToNextLessonOrChapter = (completedChapId = null) => {
    const activeVid = videoRefData.current || video || location.state?.video;
    const activeCourse = location.state?.course || video?.course;
    const vidId = idRef.current || id || activeVid?.id;

    if (!activeCourse) return;

    const chapters = getCourseChapters(activeCourse);
    const allLessons = getCourseLessonsList(activeCourse);

    // 1. Find current video index in the global lessons list
    let currentIdx = -1;
    if (allLessons.length > 0) {
      currentIdx = allLessons.findIndex(l => 
        String(l.id || l.videoUrl || l.video_url) === String(vidId || activeVid?.videoUrl || activeVid?.video_url)
      );
    }

    // 2. Search forward from current video for the next PLAYABLE (unlocked) video
    let nextPlayableLesson = null;
    if (currentIdx !== -1) {
      for (let i = currentIdx + 1; i < allLessons.length; i++) {
        const candidate = allLessons[i];
        if (!isChapterLocked(candidate, activeCourse)) {
          nextPlayableLesson = candidate;
          break;
        }
      }
    }

    // 3. Fallback: Search subsequent chapters starting after completedChapId
    if (!nextPlayableLesson && chapters.length > 0) {
      const targetChapId = completedChapId ?? activeVid?.chapter_id ?? activeVid?.chapterId;
      let chapIdx = -1;
      if (targetChapId !== undefined && targetChapId !== null) {
        chapIdx = chapters.findIndex(c => String(c.id) === String(targetChapId));
      }
      const startIdx = chapIdx !== -1 ? chapIdx + 1 : 0;
      for (let c = startIdx; c < chapters.length; c++) {
        const chapLessons = chapters[c].lessons || [];
        const candidate = chapLessons.find(l => !isChapterLocked(l, activeCourse));
        if (candidate) {
          nextPlayableLesson = candidate;
          break;
        }
      }
    }

    // 4. Navigate and autoplay the next playable video
    if (nextPlayableLesson) {
      setTimeout(() => {
        handleNavigateToVideo(nextPlayableLesson, activeCourse);
      }, 300);
    } else {
      console.log("No further unlocked lessons found in this course.");
    }
  };

  const handleCloseQuizModal = () => {
    const wasCompleted = quizModal.completed;
    const completedChapId = quizModal.chapterId;
    setQuizModal({
      show: false,
      title: '',
      quizId: 0,
      chapterId: 0,
      courseId: 0,
      questions: [],
      currentIdx: 0,
      userAnswers: {},
      isSubmitting: false,
      completed: false,
      results: null
    });

    if (wasCompleted) {
      navigateToNextLessonOrChapter(completedChapId);
    }
  };

  const handleSubmitQuiz = async () => {
    setQuizModal(prev => ({ ...prev, isSubmitting: true }));
    let correctCount = 0;
    const answerBreakdown = quizModal.questions.map(q => {
      const qType = String(q.question_type || q.questionType || 1);
      const userAns = quizModal.userAnswers[q.id];
      let isCorrect = false;
      let selectedDisplay = userAns;
      let correctDisplay = q.correctAnswer;

      if (qType === '3') { // Fill in the blanks / Free text
        let expectedAns = q.blankAnswer || q.blank_answer || q.correct_answer || q.answer || '';
        if (!expectedAns && Array.isArray(q.options) && q.options.length > 0) {
          const cIdx = (typeof q.correctAnswer === 'number' && q.options[q.correctAnswer]) ? q.correctAnswer : 0;
          expectedAns = q.options[cIdx];
        }

        const isFuzzyMatch = (userStr, targetStr) => {
          if (!userStr || !targetStr) return false;
          const uClean = String(userStr).trim().toLowerCase();
          const tClean = String(targetStr).trim().toLowerCase();
          if (!uClean || !tClean) return false;

          // Direct exact match
          if (uClean === tClean) return true;

          // Substring match
          if (uClean.length >= 4 && tClean.length >= 4) {
            if (tClean.includes(uClean) || uClean.includes(tClean)) return true;
          }

          const stopwords = new Set([
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'against',
            'between', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under',
            'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
            'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
            'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'and', 'or', 'if', 'as'
          ]);

          const tokenize = (str) => {
            return str
              .replace(/[^\w\s]/gi, ' ')
              .toLowerCase()
              .split(/\s+/)
              .filter(w => w.length > 1 && !stopwords.has(w));
          };

          const uTokens = tokenize(uClean);
          const tTokens = tokenize(tClean);

          if (tTokens.length === 0) return uClean === tClean;
          if (uTokens.length === 0) return false;

          let matchCount = 0;
          tTokens.forEach(tWord => {
            if (uTokens.some(uWord => uWord === tWord || (tWord.length >= 4 && uWord.length >= 4 && (uWord.startsWith(tWord.slice(0, 4)) || tWord.startsWith(uWord.slice(0, 4)))))) {
              matchCount++;
            }
          });

          const tRatio = matchCount / tTokens.length;

          let uMatchCount = 0;
          uTokens.forEach(uWord => {
            if (tTokens.some(tWord => uWord === tWord || (tWord.length >= 4 && uWord.length >= 4 && (uWord.startsWith(tWord.slice(0, 4)) || tWord.startsWith(uWord.slice(0, 4)))))) {
              uMatchCount++;
            }
          });
          const uRatio = uMatchCount / uTokens.length;

          return tRatio >= 0.35 || uRatio >= 0.6 || (tTokens.length <= 3 && matchCount >= 1) || matchCount >= 2;
        };

        isCorrect = isFuzzyMatch(userAns, expectedAns);
        selectedDisplay = String(userAns || '').trim();
        correctDisplay = String(expectedAns || '').trim();
      } else { // MCQ (1) or True/False (2)
        const selectedIdx = typeof userAns === 'number' ? userAns : parseInt(userAns, 10);
        const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : parseInt(q.correctAnswer, 10);
        isCorrect = selectedIdx === correctIdx;

        const effectiveOptions = (qType === '2' && (!q.options || q.options.length < 2))
          ? ["True", "False"]
          : (q.options || []);

        selectedDisplay = (Array.isArray(effectiveOptions) && selectedIdx >= 0 && selectedIdx < effectiveOptions.length)
          ? effectiveOptions[selectedIdx]
          : selectedIdx;

        correctDisplay = (Array.isArray(effectiveOptions) && correctIdx >= 0 && correctIdx < effectiveOptions.length)
          ? effectiveOptions[correctIdx]
          : correctIdx;
      }

      if (isCorrect) correctCount++;

      return {
        question_id: q.id,
        question: q.question,
        question_type: qType,
        options: q.options || [],
        selected_option: userAns,
        selected_text: selectedDisplay,
        user_answer: userAns,
        correct_option: q.correctAnswer,
        correct_text: correctDisplay,
        is_correct: isCorrect
      };
    });

    const totalQs = quizModal.questions.length;
    const scorePct = totalQs > 0 ? Math.round((correctCount / totalQs) * 100) : 0;
    const isPassedBool = scorePct >= 70;

    const payload = {
      formstep: 'submitQuiz',
      formStep: 'submitQuiz',
      course_id: quizModal.courseId,
      chapter_id: quizModal.chapterId,
      quiz_id: quizModal.quizId,
      score: correctCount,
      total_questions: totalQs,
      percentage: scorePct,
      result: isPassedBool,
      result_str: isPassedBool ? 'Passed' : 'Failed',
      status: isPassedBool ? 'Passed' : 'Failed',
      answers: answerBreakdown.map(a => ({
        question_id: a.question_id,
        question_type: a.question_type,
        selected_option: a.selected_option,
        user_answer: a.user_answer,
        selected_text: a.selected_text,
        is_correct: a.is_correct
      }))
    };

    try {
      await api.dashboard.getUser('submitQuiz', payload);
    } catch (err) {
      console.error("Quiz submission API error", err);
    }

    setQuizModal(prev => ({
      ...prev,
      isSubmitting: false,
      completed: true,
      results: {
        score: correctCount,
        totalQuestions: totalQs,
        percentage: scorePct,
        answers: answerBreakdown
      }
    }));
  };

  const getCourseChapters = (courseObj) => {
    if (!courseObj) return [];
    const cId = courseObj.id || courseObj.course_id || courseObj.courseId || 0;

    // 1. If courseObj.chapters is an array of objects with videos/lessons
    if (Array.isArray(courseObj.chapters) && courseObj.chapters.length > 0 && typeof courseObj.chapters[0] === 'object') {
      return courseObj.chapters.map((chap, cIdx) => {
        const chapId = chap.id ?? chap.chapter_id ?? chap.chapterId ?? (cIdx + 1);
        const chapTitle = chap.title || chap.chapter_title || chap.chapter_name || chap.name || chap.chapter || `Chapter ${cIdx + 1}`;
        const rawItems = Array.isArray(chap.videos) ? chap.videos : (Array.isArray(chap.lessons) ? chap.lessons : []);
        const lessons = rawItems.map((v, vIdx) => {
          if (typeof v === 'string') {
            return {
              id: `${cId}-${chapId}-${vIdx}`,
              title: `Lesson ${vIdx + 1}`,
              videoUrl: v,
              thumbnailUrl: courseObj.thumbnail || '',
              thumbnail: courseObj.thumbnail || '',
              course_id: cId,
              chapter_id: chapId,
              chapter: chapTitle
            };
          }
          const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
          return {
            ...v,
            id: v.id || v.video_id || `${cId}-${chapId}-${vIdx}`,
            title: v.title || v.video_title || v.name || `Lesson ${vIdx + 1}`,
            thumbnail: tUrl,
            thumbnailUrl: tUrl,
            course_id: v.course_id || v.courseId || cId,
            chapter_id: v.chapter_id || v.chapterId || chapId,
            chapter: v.chapter || chapTitle
          };
        });
        return {
          id: chapId,
          title: chapTitle,
          quiz: chap.quiz,
          resources: chap.resources || chap.learning_aids || chap.learningAids || chap.aids || chap.files || chap.documents || [],
          lessons
        };
      });
    }

    // 2. If courseObj.videos or courseObj.lessons is a flat array, group by chapter_id / chapter
    const rawList = Array.isArray(courseObj.videos) ? courseObj.videos : (Array.isArray(courseObj.lessons) ? courseObj.lessons : []);
    if (rawList.length > 0) {
      const chaptersMap = new Map();
      rawList.forEach((v, vIdx) => {
        let item = v;
        if (typeof v === 'string') {
          item = {
            id: `${cId}-v-${vIdx}`,
            title: `Lesson ${vIdx + 1}`,
            videoUrl: v,
            thumbnailUrl: courseObj.thumbnail || '',
            thumbnail: courseObj.thumbnail || '',
            course_id: cId,
            chapter_id: 1,
            chapter: 'Chapter 1'
          };
        } else {
          const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
          const chapId = v.chapter_id ?? v.chapterId ?? 1;
          const chapTitle = v.chapter || v.chapter_name || v.chapter_title || `Chapter ${chapId}`;
          item = {
            ...v,
            id: v.id || v.video_id || `${cId}-${chapId}-${vIdx}`,
            title: v.title || v.video_title || v.name || `Lesson ${vIdx + 1}`,
            thumbnail: tUrl,
            thumbnailUrl: tUrl,
            course_id: v.course_id || v.courseId || cId,
            chapter_id: chapId,
            chapter: chapTitle
          };
        }
        const chapKey = String(item.chapter_id);
        if (!chaptersMap.has(chapKey)) {
          chaptersMap.set(chapKey, {
            id: item.chapter_id,
            title: item.chapter || `Chapter ${item.chapter_id}`,
            lessons: []
          });
        }
        chaptersMap.get(chapKey).lessons.push(item);
      });
      return Array.from(chaptersMap.values());
    }

    return [];
  };

  const getCourseLessonsList = (courseObj) => {
    if (!courseObj) return [];
    const chapters = getCourseChapters(courseObj);
    if (chapters.length > 0) {
      return chapters.flatMap(c => c.lessons);
    }
    return [];
  };

  const startProgressTracking = () => {
    // Silent local tracking of metrics (watchTime increments automatically in active play interval)
  };

  const stopProgressTracking = () => {
    clearInterval(trackingIntervalRef.current);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    startProgressTracking();
  };

  const handlePause = () => {
    setIsPlaying(false);
    stopProgressTracking();
    if (videoRef.current && !videoRef.current.seeking && videoRef.current.currentTime < videoRef.current.duration) {
      trackingDataRef.current.pausedCount += 1;
    }
  };

  async function saveProgress(force = false) {
    const activeVid = videoRefData.current || video || location.state?.video;
    const pos = Math.round(videoRef.current ? videoRef.current.currentTime : (currentTimeRef.current || 0));
    const dur = Math.round(videoRef.current ? (videoRef.current.duration || activeVid?.duration || 300) : (activeVid?.duration || 300));
    const deltaWatchTime = trackingDataRef.current.watchTime;
    const vidId = idRef.current || id || activeVid?.id;
    
    if ((pos > 0 && (deltaWatchTime > 0 || force)) || force) {
      try {
        const activeCourse = location.state?.course;
        const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? location.state?.courseId ?? location.state?.course_id ?? 0;
        const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? location.state?.chapterId ?? location.state?.chapter_id ?? 0;
        const compPercent = force ? 100 : Math.min(100, Math.round((pos / (dur || 1)) * 100));
        const isComplete = compPercent >= 90 || force;

        await api.dashboard.getUser('watchsession', {
          id: vidId,
          videoid: vidId,
          videoId: vidId,
          course_id: cId,
          chapter_id: chapId,
          lastPosition: pos,
          lastPositionTime: formatTime(pos),
          duration: formatTime(dur),
          isNewSession: trackingDataRef.current.isNewSession,
          watchTime: formatTime(deltaWatchTime > 0 ? deltaWatchTime : pos),
          pausedCount: trackingDataRef.current.pausedCount,
          forwardedCount: trackingDataRef.current.forwardedCount,
          backwardCount: trackingDataRef.current.backwardCount,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          device_type: getDeviceType(),
          platform: getPlatform(),
          started_at: sessionStartedAtRef.current,
          ended_at: new Date().toISOString(),
          watch_duration_sec: deltaWatchTime > 0 ? deltaWatchTime : pos,
          video_duration_sec: dur,
          status: isComplete,
          staus: isComplete,
          completion_percentage: compPercent,
          playback_speed: playbackSpeed,
          quality: quality,
          ip_address: ipAddress
        });
        
        trackingDataRef.current.watchTime = 0;
        trackingDataRef.current.isNewSession = false;
      } catch (e) {
        console.error("Failed to track video progress", e);
      }
    }
  };

  const handleNavigateToVideo = async (targetVideo, courseObj = location.state?.course) => {
    if (isChapterLocked(targetVideo, courseObj)) {
      showUpgradeAlert('Need to upgrade your plan');
      return;
    }

    await saveProgress(true);

    const activeVid = videoRefData.current || video || location.state?.video;
    const activeCourse = location.state?.course;
    const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? 0;
    const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? 0;
    const vidId = idRef.current || id || activeVid?.id;

    if ((currentTimeRef.current >= 1 || trackingDataRef.current.watchTime >= 1) && vidId) {
      try {
        await api.dashboard.getUser('watchHistory', { 
          id: vidId,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          course_id: cId,
          chapter_id: chapId,
          completion_percentage: Math.min(100, Math.round(((currentTimeRef.current || 1) / (duration || 300)) * 100))
        });
      } catch (err) {
        console.error("Failed to register watchHistory on video switch", err);
      }
    }

    trackingDataRef.current = { watchTime: 0, pausedCount: 0, forwardedCount: 0, backwardCount: 0, isNewSession: true };
    currentTimeRef.current = 0;

    const targetId = targetVideo.id || targetVideo.videoUrl || targetVideo.video_url;
    navigate(`/watch/${targetId}`, { state: { video: targetVideo, course: courseObj, userPlan } });
  };

  const handleVideoEnded = async () => {
    await saveProgress(true);

    const activeVid = videoRefData.current || video || location.state?.video;
    const activeCourse = location.state?.course || video?.course || null;
    const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? 0;
    const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? 1;
    const vidId = idRef.current || id || activeVid?.id;

    if (vidId) {
      markLessonAsCompleted(vidId);
      if (activeVid?.id) markLessonAsCompleted(activeVid.id);
      if (activeVid?.videoUrl) markLessonAsCompleted(activeVid.videoUrl);
      if (activeVid?.video_url) markLessonAsCompleted(activeVid.video_url);

      try {
        await api.dashboard.getUser('watchHistory', { 
          id: vidId,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          course_id: cId,
          chapter_id: chapId,
          completion_percentage: 100,
          status: true,
          staus: true
        });
      } catch (err) {
        console.error("Failed to register video completion watchHistory", err);
      }
    }

    // Check if the completed video is the last video of the chapter
    if (activeCourse) {
      const chapters = getCourseChapters(activeCourse);
      const currentChap = chapters.find(c => String(c.id) === String(chapId));
      const chapLessons = currentChap ? currentChap.lessons : [];
      
      const currentLessonIdx = chapLessons.findIndex(l => 
        String(l.id || l.videoUrl || l.video_url) === String(activeVid?.id || activeVid?.videoUrl || activeVid?.video_url)
      );

      // Check if there are more PLAYABLE videos remaining in THIS chapter
      let nextPlayableInChap = null;
      if (currentLessonIdx !== -1 && currentLessonIdx < chapLessons.length - 1) {
        for (let i = currentLessonIdx + 1; i < chapLessons.length; i++) {
          if (!isChapterLocked(chapLessons[i], activeCourse)) {
            nextPlayableInChap = chapLessons[i];
            break;
          }
        }
      }

      const quizObj = findQuizForChapter(chapId, activeCourse);
      const hasChapterQuiz = Boolean(quizObj || activeCourse?.quizzes);

      if (nextPlayableInChap) {
        // Next playable video in this chapter found -> advance to it
        handleNavigateToVideo(nextPlayableInChap, activeCourse);
      } else if (hasChapterQuiz) {
        // All playable videos in this chapter completed -> Trigger chapter quiz!
        triggerQuizForChapter(chapId, cId, activeCourse);
      } else {
        // No quiz for this chapter -> Advance directly to next playable lesson/chapter!
        navigateToNextLessonOrChapter(chapId);
      }
    } else {
      triggerQuizForChapter(chapId, cId, activeCourse);
    }
  };

  const handleResume = () => {
    if (videoRef.current) {
      api.videos.getHistory().then(history => {
        const thisRecord = history.find(h => h.videoId === id);
        if (thisRecord && thisRecord.lastPosition) {
          isResumingRef.current = true;
          videoRef.current.currentTime = thisRecord.lastPosition;
          prevTimeRef.current = thisRecord.lastPosition;
          videoRef.current.play().catch(e => console.log(e));
        }
      });
    }
    setSavedPositionText('');
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log(e));
      }
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      isResumingRef.current = true;
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      if (seconds > 0) {
        trackingDataRef.current.forwardedCount += 1;
      } else {
        trackingDataRef.current.backwardCount += 1;
      }
    }
  };

  const handleVolumeChange = (newVolume) => {
    const val = parseFloat(newVolume);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted && volume === 0) {
        handleVolumeChange(0.5);
      }
    }
  };

  const handleQualityChange = (newQuality) => {
    setQuality(newQuality);
    setIsQualitySwitching(true);
    
    // Simulate network quality switching delay
    if (videoRef.current) {
      videoRef.current.pause();
      const currentPos = videoRef.current.currentTime;
      setTimeout(() => {
        setIsQualitySwitching(false);
        if (videoRef.current) {
          videoRef.current.currentTime = currentPos;
          if (isPlaying) {
            videoRef.current.play().catch(e => console.log(e));
          }
        }
      }, 800);
    }
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const handleFullscreen = () => {
    const target = playerContainerRef.current || videoRef.current;
    if (target) {
      if (!document.fullscreenElement) {
        if (target.requestFullscreen) {
          target.requestFullscreen();
        } else if (target.webkitRequestFullscreen) {
          target.webkitRequestFullscreen();
        } else if (target.msRequestFullscreen) {
          target.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      currentTimeRef.current = cur;
      const dur = videoRef.current.duration || video?.duration || 0;
      setDuration(dur);
      if (!videoRef.current.seeking) {
        prevTimeRef.current = cur;
      }

      // Synchronize active subtitle & transcript cue
      if (transcriptCues && transcriptCues.length > 0) {
        const match = transcriptCues.find(c => cur >= c.start && cur < c.end);
        setActiveCue(match || null);
      }
    }
  };

  const handleSeekTo = (targetSeconds) => {
    if (videoRef.current) {
      isResumingRef.current = true;
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || duration || 1000, targetSeconds));
      if (!isPlaying) {
        videoRef.current.play().catch(e => console.log(e));
        setIsPlaying(true);
      }
    }
  };

  const handleCopyTranscript = () => {
    if (!transcriptCues || transcriptCues.length === 0) return;
    const fullText = transcriptCues.map(c => `[${formatTime(c.start)}] ${c.speaker}: ${c.text}`).join('\n\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }).catch(err => console.error("Copy failed", err));
  };

  const handleDownloadTranscript = () => {
    if (!transcriptCues || transcriptCues.length === 0) return;
    const header = `Transcript: ${video?.title || 'Video'}\nLanguage: ${subtitleLang.toUpperCase()}\nGenerated on: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    const body = transcriptCues.map(c => `[${formatTime(c.start)} - ${formatTime(c.end)}] ${c.speaker}:\n${c.text}\n`).join('\n');
    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = (video?.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${sanitizedTitle}_transcript_${subtitleLang}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Resolve chapter learning aids & resources for current video/chapter
  const currentChapterResources = React.useMemo(() => {
    const activeCourse = location.state?.course || video?.course;
    const activeVid = videoRefData.current || video || location.state?.video;
    const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? 1;

    let resList = [];
    if (activeCourse) {
      const chapters = getCourseChapters(activeCourse);
      const currentChap = chapters.find(c => String(c.id) === String(chapId));
      if (currentChap && Array.isArray(currentChap.resources) && currentChap.resources.length > 0) {
        resList = [...currentChap.resources];
      }
    }
    if (Array.isArray(activeVid?.resources) && activeVid.resources.length > 0) {
      resList = [...resList, ...activeVid.resources];
    }
    if (Array.isArray(activeVid?.learning_aids) && activeVid.learning_aids.length > 0) {
      resList = [...resList, ...activeVid.learning_aids];
    }
    if (Array.isArray(activeVid?.learningAids) && activeVid.learningAids.length > 0) {
      resList = [...resList, ...activeVid.learningAids];
    }
    return resList;
  }, [video, location.state]);

  const formatResourceSize = (bytesOrStr) => {
    if (!bytesOrStr) return 'N/A';
    if (typeof bytesOrStr === 'string' && (bytesOrStr.includes('MB') || bytesOrStr.includes('KB') || bytesOrStr.includes('GB'))) {
      return bytesOrStr;
    }
    const num = Number(bytesOrStr);
    if (isNaN(num) || num <= 0) return 'File';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getResourceIcon = (item) => {
    const name = (item.name || item.fileName || item.originalName || item.url || item.file_url || '').toLowerCase();
    const type = (item.type || item.fileType || '').toLowerCase();
    if (name.endsWith('.pdf') || type.includes('pdf')) return { icon: '📄', color: '#ef4444', label: 'PDF Document' };
    if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.aac') || name.endsWith('.m4a') || type.includes('audio')) return { icon: '🎵', color: '#8b5cf6', label: 'Audio File' };
    if (name.endsWith('.doc') || name.endsWith('.docx') || type.includes('word')) return { icon: '📝', color: '#3b82f6', label: 'Word Document' };
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.tar') || name.endsWith('.7z') || type.includes('zip')) return { icon: '📦', color: '#f59e0b', label: 'Archive Zip' };
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.html') || name.endsWith('.json') || type.includes('code')) return { icon: '💻', color: '#10b981', label: 'Source Code' };
    return { icon: '📎', color: '#6366f1', label: 'Resource File' };
  };

  const highlightSearchText = (text, query) => {
    if (!query || !query.trim()) return text;
    const q = query.trim();
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} style={{ background: '#fef08a', color: '#854d0e', padding: '0 3px', borderRadius: '3px', fontWeight: 700 }}>
          {part}
        </mark>
      ) : part
    );
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      if (isResumingRef.current) {
        isResumingRef.current = false;
        prevTimeRef.current = videoRef.current.currentTime;
        return;
      }
      const current = videoRef.current.currentTime;
      const prev = prevTimeRef.current;
      if (current > prev + 1.5) {
        trackingDataRef.current.forwardedCount += 1;
      } else if (current < prev - 1.5) {
        trackingDataRef.current.backwardCount += 1;
      }
      prevTimeRef.current = current;
    }
  };

  const handleTimelineDragStart = () => {
    if (videoRef.current) {
      seekStartTimeRef.current = videoRef.current.currentTime;
    }
  };

  const handleTimelineDragEnd = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const start = seekStartTimeRef.current;
      if (current > start + 1.5) {
        trackingDataRef.current.forwardedCount += 1;
      } else if (current < start - 1.5) {
        trackingDataRef.current.backwardCount += 1;
      }
      prevTimeRef.current = current;
    }
  };

  function formatTime(timeInSeconds) {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isCurrentVideoLocked = () => {
    if (!video) return false;
    if (userPlan !== '1') return false;

    const vis = video.visibility ?? video.visibility_id ?? video.is_private ?? video.isPrivate ?? location.state?.course?.visibility ?? location.state?.course?.visibility_id;
    const visStr = String(vis || '').toLowerCase();
    return visStr === '2' || visStr === 'private' || vis === true || vis === 2;
  };

  const [savingWatchLater, setSavingWatchLater] = useState(false);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const handleAddToPlaylist = async () => {
    if (savingPlaylist) return;
    setSavingPlaylist(true);
    try {
      const activeVid = videoRefData.current || video || location.state?.video;
      const vidId = idRef.current || id || activeVid?.id;
      const res = await api.user.addPlaylist({
        video_id: vidId,
        title: activeVid?.title || '',
        thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
        video_url: activeVid?.videoUrl || activeVid?.video_url || ''
      });

      if (res?.status === 431 || res?.statusCode === 431 || res?.code === 431 || res?.message?.includes('already')) {
        setCustomAlert({
          show: true,
          title: 'Playlist',
          message: 'Video is already in playlist.',
          buttonText: 'OK',
          type: 'info',
          icon: '📑'
        });
        return;
      }

      setCustomAlert({
        show: true,
        title: 'Playlist',
        message: 'Video has been added to playlist.',
        buttonText: 'OK',
        type: 'success',
        icon: '✓'
      });
    } catch (e) {
      console.error("Add to Playlist error:", e);
      const statusCode = e.status || e.statusCode || e.response?.status;
      const is431 = statusCode === 431 || String(statusCode) === '431' || String(e.message || '').includes('431');

      if (is431) {
        setCustomAlert({
          show: true,
          title: 'Playlist',
          message: 'Video is already in playlist.',
          buttonText: 'OK',
          type: 'info',
          icon: '📑'
        });
      } else {
        setCustomAlert({
          show: true,
          title: 'Playlist',
          message: e.message || 'Unable to add to playlist. Please try again.',
          buttonText: 'OK',
          type: 'warning',
          icon: '⚠️'
        });
      }
    } finally {
      setSavingPlaylist(false);
    }
  };

  const handleSaveToWatchLater = async () => {
    if (savingWatchLater) return;
    setSavingWatchLater(true);
    try {
      const activeVid = videoRefData.current || video || location.state?.video;
      const vidId = idRef.current || id || activeVid?.id;
      const res = await api.dashboard.getUser('watchLater', { 
        id: vidId,
        title: activeVid?.title || '',
        thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
        video_url: activeVid?.videoUrl || activeVid?.video_url || ''
      });

      if (res?.status === 431 || res?.statusCode === 431 || res?.code === 431 || res?.message?.includes('already')) {
        setCustomAlert({
          show: true,
          title: 'Watch Later',
          message: 'Video is already in watch later.',
          buttonText: 'OK',
          type: 'info',
          icon: '🔖'
        });
        return;
      }

      setCustomAlert({
        show: true,
        title: 'Watch Later',
        message: 'Video has been added to watch later.',
        buttonText: 'OK',
        type: 'success',
        icon: '✓'
      });
    } catch (e) {
      console.error("Watch Later error:", e);
      const statusCode = e.status || e.statusCode || e.response?.status;
      const is431 = statusCode === 431 || String(statusCode) === '431' || String(e.message || '').includes('431');

      if (is431) {
        setCustomAlert({
          show: true,
          title: 'Watch Later',
          message: 'Video is already in watch later.',
          buttonText: 'OK',
          type: 'info',
          icon: '🔖'
        });
      } else {
        setCustomAlert({
          show: true,
          title: 'Watch Later',
          message: e.message || 'Unable to update Watch Later. Please try again.',
          buttonText: 'OK',
          type: 'warning',
          icon: '⚠️'
        });
      }
    } finally {
      setSavingWatchLater(false);
    }
  };

  const handleDownloadVideo = async () => {
    if (userPlan === '1' || userPlan !== '2') {
      showUpgradeAlert('Need to upgrade your plan');
      return;
    }
    try {
      const videoUrl = video?.videoUrl || video?.video_url;
      if (!videoUrl) {
        return;
      }
      
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = videoUrl.split('/').pop().split('?')[0] || 'video.mp4';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      await api.dashboard.getUser('download_video', { 
        id,
        title: video?.title || '',
        thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
        video_url: videoUrl
      });
    } catch (e) {
      console.error("Download failed", e);
      try {
        const videoUrl = video?.videoUrl || video?.video_url;
        if (videoUrl) {
          window.open(videoUrl, '_blank');
          await api.dashboard.getUser('download_video', { 
            id,
            title: video?.title || '',
            thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
            video_url: videoUrl
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '100px' }}>{t('admin.loading')}</div>;
  if (error || !video) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '100px' }}>{error || 'Video not found'}</div>;

  const srcUrl = (() => {
    const url = video.videoUrl || video.video_url;
    if (!url || url.includes('commondatastorage.googleapis.com') || url.startsWith('/videos/')) {
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    if (url.startsWith('/uploads')) {
      const ext = url.split('.').pop().toLowerCase();
      if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return `http://localhost:5000${url}`;
      }
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    return url;
  })();

  return (
    <div className="watch-layout" style={{ padding: '16px 28px 28px 28px', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />

      {/* LEFT COLUMN: PLAYER & METADATA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Video Player */}
        <div 
          ref={playerContainerRef}
          className="video-player-container animate-fade-in" 
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          
          <video
            ref={videoRef}
            src={srcUrl}
            className="video-player-element"
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleSeeked}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleVideoEnded}
            onClick={handlePlayPause}
            onContextMenu={(e) => e.preventDefault()}
            controls={false}
            preload="auto"
          />

          {/* Top-Right Video Watermark: Brand Logo & User Email */}
          <div 
            className="video-watermark-overlay"
            style={{
              position: 'absolute',
              top: '14px',
              right: '18px',
              zIndex: 35,
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px'
            }}
          >
            {/* Logo Watermark (Direct on video, no blur container) */}
            <img 
              src="/logo.png" 
              alt="XLurn" 
              style={{ 
                height: '34px', 
                width: 'auto',
                maxWidth: '130px', 
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9))'
              }} 
            />

            {/* User Email Watermark */}
            {userEmail && (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
                fontFamily: 'monospace, sans-serif',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.9)',
                letterSpacing: '0.4px'
              }}>
                {userEmail}
              </span>
            )}
          </div>

          {/* Buffering quality overlay spinner */}
          {isQualitySwitching && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 99
            }}>
              <span style={{ fontSize: '32px', animation: 'spin 1s infinite linear', marginBottom: '12px' }}>🌀</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Switching to {quality}...</span>
            </div>
          )}

          {/* Auto Resume Toast Overlay */}
          {savedPositionText && (
            <div style={{
              position: 'absolute',
              bottom: '90px',
              left: '20px',
              background: 'rgba(18, 18, 23, 0.95)',
              border: '1px solid var(--accent-secondary)',
              padding: '16px 20px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '320px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{savedPositionText}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleResume} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {t('watch.resumeBtn')}
                </button>
                <button onClick={() => setSavedPositionText('')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {t('watch.startOverBtn')}
                </button>
              </div>
            </div>
          )}

          {/* YouTube-Style Synchronized Subtitle Caption Overlay */}
          {subtitlesEnabled && activeCue && (
            <div 
              className="video-subtitle-overlay animate-fade-in"
              style={{
                position: 'absolute',
                bottom: '62px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(8, 8, 8, 0.82)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '1.35',
                fontFamily: '"YouTube Noto", Roboto, "Segoe UI", Arial, sans-serif',
                textAlign: 'center',
                maxWidth: '85%',
                zIndex: 30,
                pointerEvents: 'none',
                textShadow: '0 0 2px #000, 0 1px 2px #000',
                letterSpacing: '0.3px',
                transition: 'all 0.12s ease-out',
                userSelect: 'none'
              }}
            >
              <span>{activeCue.text}</span>
            </div>
          )}

          {/* CUSTOM CONTROLS PANEL */}
          <div className="video-player-controls" style={{ flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Play/Pause */}
            <button 
              onClick={handlePlayPause} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', width: '32px' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Volume controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                onClick={handleMuteToggle}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title={t('watch.volume')}
              >
                {isMuted ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                style={{
                  width: '60px',
                  height: '4px',
                  accentColor: 'var(--accent-secondary)',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Rewind 10s */}
            <button 
              onClick={() => handleSeek(-10)} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              title="Seek Back 10s"
            >
              ⏪ 10s
            </button>

            {/* Forward 10s */}
            <button 
              onClick={() => handleSeek(10)} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              title="Seek Forward 10s"
            >
              10s ⏩
            </button>

            {/* Time Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
              <span style={{ fontSize: '12px', color: '#aaa', minWidth: '35px' }}>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (videoRef.current) videoRef.current.currentTime = e.target.value;
                }}
                onMouseDown={handleTimelineDragStart}
                onTouchStart={handleTimelineDragStart}
                onMouseUp={handleTimelineDragEnd}
                onTouchEnd={handleTimelineDragEnd}
                style={{
                  flex: 1,
                  height: '4px',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '12px', color: '#aaa', minWidth: '35px' }}>{formatTime(duration)}</span>
            </div>

            {/* Subtitles CC Toggle & Language Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                style={{
                  background: subtitlesEnabled ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  border: subtitlesEnabled ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.25)',
                  color: subtitlesEnabled ? 'var(--accent-secondary)' : '#ffffff',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={subtitlesEnabled ? 'Turn off subtitles (C)' : 'Turn on subtitles (C)'}
              >
                <span>CC</span>
                {subtitlesEnabled && (
                  <span style={{ 
                    fontSize: '9px', 
                    background: 'var(--accent-primary)', 
                    color: '#fff', 
                    padding: '1px 3px', 
                    borderRadius: '3px', 
                    textTransform: 'uppercase' 
                  }}>
                    {subtitleLang}
                  </span>
                )}
              </button>

              {subtitlesEnabled && (
                <PremiumSelect
                  options={AVAILABLE_SUBTITLE_LANGUAGES}
                  value={subtitleLang}
                  onChange={(e) => setSubtitleLang(e.target.value)}
                  searchable={false}
                  size="small"
                  icon="fa-solid fa-language"
                  style={{ width: '92px' }}
                  dropUp={true}
                />
              )}
            </div>

            {/* Playback Speed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.playbackSpeed')}:</span>
              <PremiumSelect
                options={[
                  { id: '0.5', name: '0.5x' },
                  { id: '1', name: '1.0x' },
                  { id: '1.5', name: '1.5x' },
                  { id: '2', name: '2.0x' }
                ]}
                value={String(playbackSpeed)}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                searchable={false}
                size="small"
                icon="fa-solid fa-gauge-high"
                style={{ width: '76px' }}
                dropUp={true}
              />
            </div>

            {/* Quality Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.quality')}:</span>
              <PremiumSelect
                options={[
                  { id: 'Auto', name: 'Auto' },
                  { id: '1080p', name: '1080p' },
                  { id: '720p', name: '720p' },
                  { id: '480p', name: '480p' }
                ]}
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value)}
                searchable={false}
                size="small"
                icon="fa-solid fa-sliders"
                style={{ width: '82px' }}
                dropUp={true}
              />
            </div>

            {/* Fullscreen */}
            <button 
              onClick={handleFullscreen} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
              title="Fullscreen"
            >
              🖵
            </button>

          </div>
        </div>

        {/* Widescreen YouTube Details Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
          {/* Large Video Title */}
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{video.title}</h1>
          
          {/* Action and channel row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-color)'
          }} className="watch-engagement-row">
            
            {/* Publisher / Course details */}
            {(() => {
              const activeCourse = location.state?.course;
              const courseDisplayName = activeCourse?.title || 
                activeCourse?.course_name || 
                activeCourse?.name || 
                video?.course_name || 
                video?.courseTitle || 
                video?.course || 
                (typeof activeCourse === 'string' ? activeCourse : null) || 
                video?.author || 
                video?.instructor || 
                video?.client_name || 
                'LurnAx Education';

              const getCourseInitials = (name) => {
                if (!name) return 'LA';
                const words = String(name).trim().split(/\s+/).filter(Boolean);
                if (words.length >= 2) {
                  return (words[0][0] + words[1][0]).toUpperCase();
                }
                return String(name).slice(0, 2).toUpperCase();
              };

              const initials = getCourseInitials(courseDisplayName);

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Channel / Course Avatar bubble */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '15px',
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                      {courseDisplayName}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Engagement buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Like / Dislike pill */}
              <div style={{
                display: 'inline-flex',
                background: 'var(--bg-tertiary)',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <button 
                  onClick={() => {
                    if (isLiked) {
                      setIsLiked(false);
                      setLikesCount(prev => prev - 1);
                    } else {
                      setIsLiked(true);
                      setLikesCount(prev => prev + 1);
                      if (isDisliked) setIsDisliked(false);
                    }
                  }}
                  style={{
                    background: isLiked ? 'rgba(255,255,255,0.08)' : 'none',
                    border: 'none',
                    padding: '8px 16px',
                    color: isLiked ? 'var(--accent-secondary)' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  👍 {likesCount}
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)' }} />
                <button 
                  onClick={() => {
                    if (isDisliked) {
                      setIsDisliked(false);
                    } else {
                      setIsDisliked(true);
                      if (isLiked) {
                        setIsLiked(false);
                        setLikesCount(prev => prev - 1);
                      }
                    }
                  }}
                  style={{
                    background: isDisliked ? 'rgba(255,255,255,0.08)' : 'none',
                    border: 'none',
                    padding: '8px 16px',
                    color: isDisliked ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  👎
                </button>
              </div>

              {/* Share button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={() => alert("Link copied to clipboard (Simulated)")}>
                🔗 Share
              </button>

              {/* Download button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={handleDownloadVideo}>
                📥 Download
              </button>

              {/* Watch Later button */}
              <button 
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
                onClick={handleSaveToWatchLater}
                disabled={savingWatchLater}
              >
                <span>🔖</span>
                <span>{savingWatchLater ? 'Adding...' : 'Watch Later'}</span>
              </button>

              {/* Add to Playlist button */}
              <button 
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
                onClick={handleAddToPlaylist}
                disabled={savingPlaylist}
              >
                <span>📑</span>
                <span>{savingPlaylist ? 'Adding...' : 'Add to Playlist'}</span>
              </button>
            </div>
          </div>

          {/* WIDESCREEN TABBED CONTENT: OVERVIEW, TRANSCRIPT & LEARNING AIDS */}
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Tab Navigation Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.15)',
              padding: '4px 8px 0 8px',
              gap: '4px',
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setActiveWatchTab('overview')}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: activeWatchTab === 'overview' ? 700 : 500,
                  color: activeWatchTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: activeWatchTab === 'overview' ? 'var(--bg-tertiary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeWatchTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px'
                }}
              >
                <span>📋</span>
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWatchTab('transcript')}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: activeWatchTab === 'transcript' ? 700 : 500,
                  color: activeWatchTab === 'transcript' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: activeWatchTab === 'transcript' ? 'var(--bg-tertiary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeWatchTab === 'transcript' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px'
                }}
              >
                <span>💬</span>
                <span>Transcript</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  background: activeWatchTab === 'transcript' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: activeWatchTab === 'transcript' ? '#ffffff' : 'var(--text-secondary)',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {transcriptCues.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWatchTab('resources')}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: activeWatchTab === 'resources' ? 700 : 500,
                  color: activeWatchTab === 'resources' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: activeWatchTab === 'resources' ? 'var(--bg-tertiary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeWatchTab === 'resources' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px'
                }}
              >
                <span>📚</span>
                <span>Learning Aids & Resources</span>
                {currentChapterResources.length > 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {currentChapterResources.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: OVERVIEW */}
            {activeWatchTab === 'overview' && (
              <div style={{ padding: '18px', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }} className="animate-fade-in">
                <div style={{ fontWeight: 700, marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <span>{video.views || 0} {t('user.viewsCount')}</span>
                  <span>•</span>
                  <span>{video.category || 'General'}</span>
                  <span>•</span>
                  <span>Published by: {video.uploadedBy === 'u-superadmin' ? 'Super Admin' : (video.author || video.instructor || 'Instructor')}</span>
                </div>
                
                <p style={{ margin: 0, whiteSpace: 'pre-line', color: 'var(--text-primary)' }}>
                  {video.description || "No description provided for this lesson."}
                </p>

                {video.tags && video.tags.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {video.tags.map((tag, i) => (
                      <span key={i} style={{ 
                        color: 'var(--accent-secondary)', 
                        fontWeight: 600, 
                        background: 'rgba(99, 102, 241, 0.1)', 
                        padding: '3px 10px', 
                        borderRadius: '6px',
                        fontSize: '12px' 
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: INTERACTIVE TRANSCRIPT */}
            {activeWatchTab === 'transcript' && (
              <div style={{ display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
                {/* Transcript Control Toolbar */}
                <div style={{
                  padding: '12px 18px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {/* Search within transcript */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px', maxWidth: '340px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="Search transcript..."
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 30px 7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                      {transcriptSearch ? (
                        <button
                          type="button"
                          onClick={() => setTranscriptSearch('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      ) : (
                        <span style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          pointerEvents: 'none'
                        }}>
                          🔍
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right actions: Language, Auto-Scroll, Copy, Download */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Language selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Language:</span>
                      <PremiumSelect
                        options={AVAILABLE_SUBTITLE_LANGUAGES}
                        value={subtitleLang}
                        onChange={(e) => setSubtitleLang(e.target.value)}
                        searchable={false}
                        size="small"
                        icon="fa-solid fa-language"
                        style={{ width: '115px' }}
                      />
                    </div>

                    {/* Auto-scroll toggle */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}>
                      <input
                        type="checkbox"
                        checked={autoScrollTranscript}
                        onChange={(e) => setAutoScrollTranscript(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <span>Auto-scroll</span>
                    </label>

                    {/* Copy button */}
                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: copiedTranscript ? '#10b981' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Copy full transcript to clipboard"
                    >
                      <span>{copiedTranscript ? '✓' : '📋'}</span>
                      <span>{copiedTranscript ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {/* Download text button */}
                    <button
                      type="button"
                      onClick={handleDownloadTranscript}
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Download transcript as .txt file"
                    >
                      <span>📥</span>
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Transcript Cues List */}
                <div 
                  ref={transcriptContainerRef}
                  style={{
                    maxHeight: '360px',
                    overflowY: 'auto',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {(() => {
                    const searchLower = transcriptSearch.trim().toLowerCase();
                    const filtered = transcriptCues.filter(cue => 
                      !searchLower || cue.text.toLowerCase().includes(searchLower) || cue.speaker.toLowerCase().includes(searchLower)
                    );

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                          <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>🔍</span>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>No matching dialogue found</span>
                          <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Try searching with a different keyword.</p>
                        </div>
                      );
                    }

                    return filtered.map((cue) => {
                      const isActive = activeCue?.id === cue.id;
                      return (
                        <div
                          key={cue.id}
                          ref={isActive ? activeCueItemRef : null}
                          onClick={() => handleSeekTo(cue.start)}
                          style={{
                            display: 'flex',
                            gap: '14px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                            border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            alignItems: 'flex-start'
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {/* Timestamp chip button */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flexShrink: 0,
                            gap: '4px'
                          }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                              color: isActive ? '#ffffff' : 'var(--accent-secondary)',
                              border: '1px solid var(--border-color)',
                              letterSpacing: '0.4px'
                            }}>
                              {formatTime(cue.start)}
                            </span>
                            {isActive && (
                              <span style={{ fontSize: '9px', color: 'var(--accent-primary)', fontWeight: 800 }}>
                                ● LIVE
                              </span>
                            )}
                          </div>

                          {/* Speaker and Dialogue */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {cue.speaker}
                            </span>
                            <span style={{
                              fontSize: '13px',
                              lineHeight: '1.5',
                              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: isActive ? 600 : 400
                            }}>
                              {highlightSearchText(cue.text, transcriptSearch)}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Tab 3: LEARNING AIDS & RESOURCES */}
            {activeWatchTab === 'resources' && (
              <div style={{ padding: '18px' }} className="animate-fade-in">
                {currentChapterResources.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {currentChapterResources.map((resItem, idx) => {
                      const info = getResourceIcon(resItem);
                      const resName = resItem.name || resItem.fileName || resItem.originalName || resItem.title || `Resource File ${idx + 1}`;
                      const resUrl = resItem.url || resItem.file_url || resItem.videoUrl || resItem.video_url || '#';
                      const resSize = formatResourceSize(resItem.size || resItem.fileSize || resItem.file_size);

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              flexShrink: 0
                            }}>
                              {info.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={resName}>
                                {resName}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{resSize}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>•</span>
                                <span style={{ fontSize: '10px', color: info.color, fontWeight: 700 }}>{info.label}</span>
                              </div>
                            </div>
                          </div>

                          <a
                            href={resUrl.startsWith('/uploads') ? `http://localhost:5000${resUrl}` : resUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              background: 'var(--accent-primary)',
                              color: '#ffffff',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0
                            }}
                          >
                            <span>📥</span>
                            <span>Get</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 18px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📁</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No Learning Aids uploaded for this lesson</span>
                    <p style={{ fontSize: '13px', margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>
                      Supplementary PDFs, source files, and documents will appear here when attached by the course author.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: RECOMMENDATIONS OR COURSE PLAYLIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {location.state?.course && getCourseChapters(location.state.course).length > 0 ? (
          (() => {
            const courseChapters = getCourseChapters(location.state.course);
            const courseLessons = getCourseLessonsList(location.state.course);
            const courseTitle = location.state.course.title || location.state.course.course_name || 'Course';
            const courseId = location.state.course.id || location.state.course.course_id || location.state.course.courseId || 1;
            
            // Calculate completion progress based on ACTUALLY completed lessons
            const completedCount = courseLessons.filter(l => isLessonCompleted(l)).length;
            const percent = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
            const displayPercent = Math.min(100, Math.max(0, percent));
            
            // SVG Circular Progress Ring math
            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

            return (
              <div className="watch-course-playlist-container">
                {/* Course Playlist Card Header Box (Fixed at top) */}
                <div style={{ 
                  padding: '12px 14px', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', 
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px' }}>📖</span> Course Content
                      </h3>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                        {courseChapters.length} {courseChapters.length === 1 ? 'Chapter' : 'Chapters'} • {courseLessons.length} {courseLessons.length === 1 ? 'Lesson' : 'Lessons'}
                      </div>
                    </div>
                    {/* Percentage badge */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      color: '#6366f1',
                      padding: '3px 8px',
                      borderRadius: '12px'
                    }}>
                      {displayPercent}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {completedCount} of {courseLessons.length} completed
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const allExpanded = courseChapters.every((c, i) => (expandedChapters[`chap_${c.id || i}`] ?? true) === true);
                        const nextState = {};
                        courseChapters.forEach((c, i) => {
                          nextState[`chap_${c.id || i}`] = !allExpanded;
                        });
                        setExpandedChapters(nextState);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {courseChapters.every((c, i) => (expandedChapters[`chap_${c.id || i}`] ?? true) === true) ? 'Collapse all' : 'Expand all'}
                    </button>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${displayPercent}%`, height: '100%', background: '#6366f1', borderRadius: '2px' }} />
                  </div>
                </div>

                {/* Chapters & Lessons Accordion List (Scrollable Area) */}
                <div className="watch-course-accordion-list">
                  {courseChapters.map((chapter, chapIdx) => {
                    const chapKey = `chap_${chapter.id || chapIdx}`;
                    // Expanded if not explicitly set to false (default expanded)
                    const isExpanded = expandedChapters[chapKey] !== false;
                    
                    const chapLessons = chapter.lessons || [];
                    const chapCompletedCount = chapLessons.filter(l => isLessonCompleted(l)).length;

                    // Condition 1: If chapter has only 1 video and that video is private:
                    // Blur video & quiz, and lock should be in center
                    const isSingleVideo = chapLessons.length === 1;
                    const isSingleVideoLocked = isSingleVideo && isChapterLocked(chapLessons[0], location.state?.course);

                    // Condition 2 & 3: Without watching video no need to open quiz
                    const watchableLessons = chapLessons.filter(l => !isChapterLocked(l, location.state?.course));
                    const isChapterWatched = watchableLessons.length > 0 && watchableLessons.some(l => isLessonCompleted(l));

                    const isCurrentChapter = chapLessons.some(l => 
                      String(l.id || l.videoUrl || l.video_url) === String(video?.id || video?.videoUrl || video?.video_url)
                    );

                    const quizObj = findQuizForChapter(chapter.id, location.state?.course);

                    return (
                      <div 
                        key={chapKey}
                        style={{
                          borderRadius: '12px',
                          border: isCurrentChapter ? '1.5px solid rgba(99, 102, 241, 0.45)' : '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          boxShadow: isCurrentChapter ? '0 2px 12px rgba(99, 102, 241, 0.06)' : 'none',
                          transition: 'border-color 0.2s'
                        }}
                      >
                        {/* Chapter Section Header (Udemy Accordion Header) */}
                        <div 
                          onClick={() => toggleChapterExpand(chapKey)}
                          style={{
                            padding: '12px 14px',
                            background: isCurrentChapter ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px',
                            userSelect: 'none',
                            borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '13px', 
                              fontWeight: '700', 
                              color: isCurrentChapter ? '#6366f1' : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              Chapter {chapIdx + 1} : {chapter.title || `Chapter ${chapIdx + 1}`}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {chapCompletedCount} / {chapLessons.length} • {chapLessons.length} {chapLessons.length === 1 ? 'lesson' : 'lessons'}
                            </div>
                          </div>
                          <i 
                            className="fa-solid fa-chevron-down" 
                            style={{ 
                              fontSize: '12px', 
                              color: isCurrentChapter ? '#6366f1' : 'var(--text-secondary)',
                              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                              transition: 'transform 0.2s ease'
                            }} 
                          />
                        </div>

                        {/* Chapter Lessons List (Collapsible) */}
                        {isExpanded && (
                          <div style={{ position: 'relative', overflow: 'hidden', padding: '8px' }}>
                            {/* Inner container (content visible with balanced blur and center lock) */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              filter: isSingleVideoLocked ? 'blur(2px)' : 'none',
                              opacity: isSingleVideoLocked ? 0.75 : 1,
                              pointerEvents: isSingleVideoLocked ? 'none' : 'auto',
                              userSelect: isSingleVideoLocked ? 'none' : 'auto',
                              transition: 'all 0.2s ease'
                            }}>
                              {chapLessons.map((lesson, lIdx) => {
                                const globalIdx = courseLessons.findIndex(gl => String(gl.id || gl.videoUrl || gl.video_url) === String(lesson.id || lesson.videoUrl || lesson.video_url));
                                const isLessonActive = String(lesson.id || lesson.videoUrl || lesson.video_url) === String(video?.id || video?.videoUrl || video?.video_url);
                                const isLocked = isChapterLocked(lesson, location.state?.course);
                                const lessonThumb = lesson.thumbnail || lesson.thumbnailUrl || lesson.thumbnail_url || location.state?.course?.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
                                const lessonDuration = lesson.duration || (globalIdx === 0 ? '5:21' : globalIdx === 1 ? '8:45' : globalIdx === 2 ? '6:30' : '7:15');
                                const isCompleted = isLessonCompleted(lesson);

                                return (
                                  <div 
                                    key={lesson.id || lIdx}
                                    onClick={() => handleNavigateToVideo(lesson, location.state?.course)}
                                    style={{
                                      display: 'flex',
                                      gap: '10px',
                                      padding: '8px 10px',
                                      cursor: 'pointer',
                                      borderRadius: '8px',
                                      background: isLessonActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                      border: isLessonActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                                      transition: 'background 0.15s ease',
                                      alignItems: 'center'
                                    }}
                                    onMouseEnter={e => {
                                      if (!isLessonActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                    }}
                                    onMouseLeave={e => {
                                      if (!isLessonActive) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    {/* Status indicator / Checkbox */}
                                    <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {isLessonActive ? (
                                        <span style={{ fontSize: '11px', color: '#6366f1' }}>▶</span>
                                      ) : isCompleted ? (
                                        <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                      ) : isLocked ? (
                                        <span style={{ fontSize: '11px', color: '#f59e0b' }}>🔒</span>
                                      ) : (
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid var(--text-secondary)' }}></span>
                                      )}
                                    </div>

                                    {/* Thumbnail */}
                                    <div style={{ position: 'relative', width: '64px', height: '38px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                      <img 
                                        src={lessonThumb} 
                                        alt={lesson.title || `Lesson ${lIdx + 1}`} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                      />
                                      {isLocked && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '2px',
                                          right: '2px',
                                          background: 'rgba(0,0,0,0.7)',
                                          color: '#f59e0b',
                                          padding: '1px 4px',
                                          borderRadius: '4px',
                                          fontSize: '8px',
                                          fontWeight: 'bold'
                                        }}>
                                          PRO
                                        </div>
                                      )}
                                    </div>

                                    {/* Title & Duration */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontSize: '12px', 
                                        fontWeight: isLessonActive ? '700' : '500', 
                                        color: isLessonActive ? '#6366f1' : 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {lesson.title || `Lesson ${lIdx + 1}`}
                                      </div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span><i className="fa-solid fa-circle-play" style={{ fontSize: '9px', marginRight: '3px' }} />{lessonDuration}</span>
                                        {isLessonActive && <span style={{ color: '#6366f1', fontWeight: 700 }}>• Playing</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Chapter Quiz Trigger Button under Chapter */}
                              {(quizObj || location.state?.course?.quizzes) && (
                                <div 
                                  onClick={() => {
                                    if (!isChapterWatched) {
                                      setCustomAlert({
                                        show: true,
                                        title: 'Quiz Locked',
                                        message: 'Please watch the video lesson first to unlock this Chapter Quiz Assessment!',
                                        buttonText: 'OK'
                                      });
                                      return;
                                    }
                                    triggerQuizForChapter(chapter.id, courseId, location.state?.course);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    background: 'rgba(229, 9, 20, 0.06)',
                                    border: '1px dashed rgba(229, 9, 20, 0.3)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    marginTop: '4px',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(229, 9, 20, 0.12)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(229, 9, 20, 0.06)'}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px' }}>📝</span>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#e50914' }}>
                                      Chapter {chapIdx + 1} Quiz Assessment
                                    </div>
                                  </div>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    backgroundColor: '#e50914',
                                    color: '#fff',
                                    padding: '2px 8px',
                                    borderRadius: '10px'
                                  }}>
                                    Take Quiz
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Center Lock Overlay if chapter has only 1 video and that video is private */}
                            {isSingleVideoLocked && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showUpgradeAlert('Need to upgrade your plan');
                                }}
                                style={{
                                  position: 'absolute',
                                  inset: '4px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(0, 0, 0, 0.05)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  zIndex: 10
                                }}
                              >
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: 'rgba(23, 23, 23, 0.9)',
                                  border: '1.5px solid #f59e0b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '18px',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                                  marginBottom: '4px'
                                }}>
                                  🔒
                                </div>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#f59e0b',
                                  background: 'rgba(0, 0, 0, 0.85)',
                                  padding: '2px 9px',
                                  borderRadius: '10px',
                                  letterSpacing: '0.3px',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                                }}>
                                  PRO Plan Required
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : (
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('watch.recommended')}</h3>
            {recommendations.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('watch.noRelatedVideos')} {video?.category}</div>
            ) : (
              recommendations.map(rec => (
                <div 
                  key={rec.id} 
                  onClick={() => handleNavigateToVideo(rec, null)}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.2s',
                    padding: '8px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <img 
                    src={(() => {
                      const thumb = rec.thumbnail || rec.thumbnailUrl || rec.thumbnail_url || '';
                      if (!thumb) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
                      return thumb.startsWith('http') ? thumb : `http://localhost:5000${thumb}`;
                    })()} 
                    alt={rec.title} 
                    style={{ width: '100px', height: '56px', objectFit: 'cover', borderRadius: '4px' }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {rec.views} {t('user.viewsCount')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* --- CUSTOM ALERT MODAL (Portal to document.body for viewport centering) --- */}
      {customAlert.show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            width: '90%',
            maxWidth: '380px',
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'var(--text-primary, #111827)',
            animation: 'scaleIn 0.25s ease',
            position: 'relative'
          }}>
            {/* Dynamic Alert Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: `3px solid ${
                customAlert.type === 'success' ? '#10b981' :
                customAlert.type === 'info' ? '#6366f1' : '#f59e0b'
              }`,
              background: customAlert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' :
                          customAlert.type === 'info' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '28px' }}>
                {customAlert.icon || (
                  customAlert.type === 'success' ? '✓' :
                  customAlert.type === 'info' ? '🔖' : '👑'
                )}
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary, #111827)',
              margin: '0 0 12px 0'
            }}>
              {customAlert.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary, #4b5563)',
              lineHeight: '1.5',
              margin: '0 0 28px 0'
            }}>
              {customAlert.message}
            </p>

            {/* Button */}
            <button
              onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '12px',
                background: customAlert.type === 'success'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : customAlert.type === 'info'
                  ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: customAlert.type === 'success'
                  ? '0 4px 14px rgba(16, 185, 129, 0.4)'
                  : customAlert.type === 'info'
                  ? '0 4px 14px rgba(99, 102, 241, 0.4)'
                  : '0 4px 14px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {customAlert.buttonText || 'OK'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ================= CHAPTER QUIZ MODAL PORTAL ================= */}
      {quizModal.show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '640px',
            backgroundColor: 'var(--bg-secondary, #181824)',
            border: '1px solid var(--border-color, #2e2e3e)',
            borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Quiz Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color, #2e2e3e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(229,9,20,0.12), transparent)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '26px' }}>📝</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                    {quizModal.title}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary, #a1a1aa)' }}>
                    Chapter {quizModal.chapterId} Quiz Assessment
                  </span>
                </div>
              </div>

              {!quizModal.completed && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(229, 9, 20, 0.15)',
                  color: '#e50914',
                  border: '1px solid rgba(229, 9, 20, 0.3)'
                }}>
                  Question {quizModal.currentIdx + 1} of {quizModal.questions.length}
                </span>
              )}
            </div>

            {/* Quiz Progress Bar */}
            {!quizModal.completed && (
              <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-tertiary, #2a2a38)' }}>
                <div style={{
                  width: `${((quizModal.currentIdx + 1) / quizModal.questions.length) * 100}%`,
                  height: '100%',
                  backgroundColor: '#e50914',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}

            {/* Quiz Body Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {!quizModal.completed ? (() => {
                const currentQ = quizModal.questions[quizModal.currentIdx];
                if (!currentQ) return null;
                const selectedOpt = quizModal.userAnswers[currentQ.id];
                const qType = String(currentQ.question_type || currentQ.questionType || 1);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Question Statement */}
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text-primary, #ffffff)',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {currentQ.question}
                    </h4>

                    {/* Question Input / Options based on question_type */}
                    {qType === '3' ? (
                      /* Question Type 3: Fill in the Blanks Input */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #a1a1aa)' }}>
                          ✏️ Type your answer below:
                        </label>
                        <input
                          type="text"
                          value={selectedOpt || ''}
                          onKeyDown={(e) => {
                            if (e.key === ' ' && (!e.currentTarget.value || e.currentTarget.selectionStart === 0)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => handleTextAnswer(e.target.value)}
                          placeholder="Enter your answer here..."
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-primary, #12121a)',
                            border: `1.5px solid ${String(selectedOpt || '').trim() ? '#e50914' : 'var(--border-color, #2e2e3e)'}`,
                            color: 'var(--text-primary, #ffffff)',
                            fontSize: '15px',
                            fontWeight: 500,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxShadow: String(selectedOpt || '').trim() ? '0 4px 14px rgba(229, 9, 20, 0.15)' : 'none'
                          }}
                        />
                      </div>
                    ) : (
                      /* Question Types 1 (MCQ) & 2 (True / False) Options */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(() => {
                          const tfDefaults = ["True", "False"];
                          const optionsToRender = (qType === '2' && (!currentQ.options || currentQ.options.length < 2))
                            ? tfDefaults
                            : (currentQ.options || []);

                          return optionsToRender.map((opt, optIdx) => {
                            const isSelected = selectedOpt === optIdx;
                            const optText = typeof opt === 'object' ? (opt.text || opt.option_text || JSON.stringify(opt)) : String(opt);

                            return (
                              <div
                                key={optIdx}
                                onClick={() => handleSelectOption(optIdx)}
                                style={{
                                  padding: '14px 18px',
                                  borderRadius: '12px',
                                  backgroundColor: isSelected ? 'rgba(229, 9, 20, 0.14)' : 'var(--bg-primary, #12121a)',
                                  border: `1.5px solid ${isSelected ? '#e50914' : 'var(--border-color, #2e2e3e)'}`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '14px',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isSelected ? '0 4px 14px rgba(229, 9, 20, 0.25)' : 'none'
                                }}
                              >
                                {/* Option Radio Circle */}
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: `2px solid ${isSelected ? '#e50914' : '#666'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#e50914' }} />}
                                </div>

                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: isSelected ? '#e50914' : 'var(--text-secondary, #a1a1aa)'
                                }}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>

                                <span style={{
                                  fontSize: '14px',
                                  color: isSelected ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #d1d5db)',
                                  fontWeight: isSelected ? 600 : 400
                                }}>
                                  {optText}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                );
              })() : (
                /* Quiz Results View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Score Banner */}
                  <div style={{
                    textAlign: 'center',
                    padding: '24px',
                    borderRadius: '16px',
                    background: quizModal.results?.percentage >= 70 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                    border: `1px solid ${quizModal.results?.percentage >= 70 ? '#10b981' : '#ef4444'}`
                  }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>
                      {quizModal.results?.percentage >= 70 ? '🎉' : '📊'}
                    </span>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
                      Score: {quizModal.results?.score} / {quizModal.results?.totalQuestions} ({quizModal.results?.percentage}%)
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: quizModal.results?.percentage >= 70 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {quizModal.results?.percentage >= 70 ? 'Congratulations! You passed the chapter quiz.' : 'Quiz completed. Review correct answers below.'}
                    </p>
                  </div>

                  {/* Detailed Question Review */}
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #ffffff)' }}>
                    Detailed Answer Breakdown
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(quizModal.results?.answers || []).map((ans, idx) => (
                      <div key={idx} style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: ans.is_correct ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${ans.is_correct ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                            {idx + 1}. {ans.question}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '2px 10px',
                            borderRadius: '6px',
                            backgroundColor: ans.is_correct ? '#10b981' : '#ef4444',
                            color: '#ffffff',
                            flexShrink: 0
                          }}>
                            {ans.is_correct ? '✔ Correct' : '❌ Wrong'}
                          </span>
                        </div>

                        {ans.question_type === '3' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: ans.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${ans.is_correct ? '#10b981' : '#ef4444'}` }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Your Answer: </span>
                              <strong style={{ color: ans.is_correct ? '#10b981' : '#ef4444' }}>{ans.user_answer || '(No answer provided)'}</strong>
                            </div>
                            {!ans.is_correct && (
                              <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Correct Answer: </span>
                                <strong style={{ color: '#10b981' }}>{ans.correct_text}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                            {(ans.options || []).map((opt, oIdx) => {
                              const isUserChoice = ans.selected_option === oIdx;
                              const isCorrectChoice = ans.correct_option === oIdx;
                              const optText = typeof opt === 'object' ? (opt.text || opt.option_text || JSON.stringify(opt)) : String(opt);

                              let bg = 'transparent';
                              let color = 'var(--text-secondary, #a1a1aa)';
                              let border = '1px transparent solid';

                              if (isCorrectChoice) {
                                bg = 'rgba(16, 185, 129, 0.2)';
                                color = '#10b981';
                                border = '1px solid #10b981';
                              } else if (isUserChoice && !ans.is_correct) {
                                bg = 'rgba(239, 68, 68, 0.2)';
                                color = '#ef4444';
                                border = '1px solid #ef4444';
                              }

                              return (
                                <div key={oIdx} style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  backgroundColor: bg,
                                  color: color,
                                  border: border,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontWeight: (isUserChoice || isCorrectChoice) ? 600 : 400
                                }}>
                                  <span>{String.fromCharCode(65 + oIdx)}. {optText}</span>
                                  {isCorrectChoice && <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>[Correct Answer]</span>}
                                  {isUserChoice && !isCorrectChoice && <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>[Your Choice]</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Modal Footer Actions */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color, #2e2e3e)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-primary, #12121a)'
            }}>
              {!quizModal.completed ? (
                <>
                  <button
                    onClick={handleCloseQuizModal}
                    className="btn btn-secondary"
                    style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>

                  {quizModal.currentIdx < quizModal.questions.length - 1 ? (
                    <button
                      onClick={handleNextQuizQuestion}
                      disabled={!isCurrentQuestionAnswered()}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 24px',
                        fontSize: '13px',
                        backgroundColor: '#e50914',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: !isCurrentQuestionAnswered() ? 'not-allowed' : 'pointer',
                        opacity: !isCurrentQuestionAnswered() ? 0.5 : 1
                      }}
                    >
                      Next ➔
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={quizModal.isSubmitting || !isCurrentQuestionAnswered()}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 24px',
                        fontSize: '13px',
                        backgroundColor: '#10b981',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: (quizModal.isSubmitting || !isCurrentQuestionAnswered()) ? 'not-allowed' : 'pointer',
                        opacity: (quizModal.isSubmitting || !isCurrentQuestionAnswered()) ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {quizModal.isSubmitting ? 'Submitting...' : 'Submit Quiz 🚀'}
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '12px' }}>
                  <button
                    onClick={() => setQuizModal(prev => ({ ...prev, completed: false, currentIdx: 0, userAnswers: {} }))}
                    className="btn btn-secondary"
                    style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    🔄 Retake Quiz
                  </button>
                  <button
                    onClick={handleCloseQuizModal}
                    className="btn btn-primary"
                    style={{ padding: '8px 24px', fontSize: '13px', backgroundColor: '#e50914', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Continue Course
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VideoWatch;
