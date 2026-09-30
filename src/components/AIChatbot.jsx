import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, Sparkles, User, Mic, MicOff, Volume2, Globe, Check
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const BROWSER_SPEECH_LANGS = {
  en: { code: 'en-IN', label: 'English (India)' },
  ta: { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  hi: { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  ml: { code: 'ml-IN', label: 'മലയാളം (Malayalam)' },
  te: { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  kn: { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' }
};

const COPILOT_TRANSLATIONS = {
  en: {
    headerTitle: "THULIR Civic Copilot 🌿",
    headerSubtitle: "Civic Assistant • 6 Role Expert",
    welcome: "Hello! I am your THULIR Civic Copilot 🌿. Ask me about features inside any role: Waste Generator, Transport Partner, Manufacturer/Recycler, Consumer, Delivery Partner, or Admin!",
    welcomeUnauth: "Hello! Welcome to THULIR 🌿. Ask me about features inside any role dashboard or how the 6 circular roles work together!",
    prompts: [
      { label: "🏠 Generator Role", text: "What can I do as a Waste Generator?" },
      { label: "🚛 Transport Role", text: "What can I do as a Transport Partner?" },
      { label: "🏭 Manufacturer Role", text: "What can I do as a Manufacturer or Recycler?" },
      { label: "🛒 Consumer Role", text: "What can I do as a Consumer?" },
      { label: "📦 Delivery Role", text: "What can I do as a Delivery Partner?" }
    ],
    buttons: {
      requestPickup: "🗑️ Request Pickup →",
      trackRequest: "📍 Track Request →",
      reportIssue: "⚠️ Report Issue →",
      notifications: "🔔 Notifications →",
      products: "🛍️ Explore Products →",
      dashboard: "👤 My Dashboard →",
      login: "🔑 Login to THULIR →"
    },
    responses: {
      requestPickup: "Directing you to Waste Pickup Request...",
      reportIssue: "Directing you to Report Complaints and Issues...",
      overview: "THULIR connects Households, Scrap Dealers, Recyclers, Consumers, and Delivery Drivers. Ask me about any specific role!"
    },
    workflowDetail: `🌿 THULIR — Smart Circular Economy Waste Ecosystem

Core Concept: Turning waste into value by connecting 6 key stakeholder roles in a closed-loop circular model:

🔄 5-Step Ecosystem Workflow:
1️⃣ Waste Generation: Households & Hotels categorize waste (Organic, Plastic, E-Waste, Paper, Metal) and submit pickup requests.
2️⃣ Pickup & Transport: Nearby Collection & Transport Partners accept requests, pick up waste, and track route distance via GPS.
3️⃣ Processing & Recycling: Recyclers & Manufacturers process raw waste into compost, recycled plastic pellets, and eco-goods.
4️⃣ Eco Marketplace: Manufacturers list upcycled products on the THULIR Marketplace for consumers and businesses.
5️⃣ Fulfillment & Payouts: Delivery Partners fulfill orders while all partners earn waste & distance payouts!`,
    voice: {
      listening: "Listening in {lang}... Speak now",
      stopped: "Voice input stopped",
      denied: "Microphone access denied. Please enable mic permissions in browser.",
      unsupported: "Voice input is not supported in this browser. Please use text typing."
    },
    notLoggedIn: "Please log in to view live account details and requests.",
    noRequests: "No active waste requests found.",
    noOrders: "No orders found in your account yet.",
    fallback: "Directing you to your THULIR Dashboard..."
  },
  ta: {
    headerTitle: "துளிர் சிவிக் காப்பிலட் 🌿",
    headerSubtitle: "சிவிக் உதவியாளர் • 6 பங்குதாரர் வழிகாட்டி",
    welcome: "வணக்கம்! நான் உங்கள் துளிர் சிவிக் காப்பிலட் 🌿. 6 பங்குதாரர் பக்கங்களின் அம்சங்கள் பற்றி என்னிடம் கேட்கலாம்!",
    welcomeUnauth: "வணக்கம்! துளிருக்கு நல்வரவு 🌿. 6 பங்குதாரர் பக்கங்கள் மற்றும் அவற்றின் பயன்பாடுகள் பற்றி கேட்கலாம்!",
    prompts: [
      { label: "🏠 கழிவு உருவாக்குபவர்", text: "கழிவு உருவாக்குபவராக நான் என்ன செய்ய முடியும்?" },
      { label: "🚛 டிரான்ஸ்போர்ட்", text: "டிரான்ஸ்போர்ட் பார்ட்னராக நான் என்ன செய்ய முடியும்?" },
      { label: "🏭 தயாரிப்பாளர்", text: "தயாரிப்பாளர் அல்லது மறுசுழற்சியாளராக என்ன செய்ய முடியும்?" },
      { label: "🛒 நுகர்வோர்", text: "நுகர்வோராக நான் என்ன செய்ய முடியும்?" },
      { label: "📦 டெலிவரி", text: "டெலிவரி பார்ட்னராக என்ன செய்ய முடியும்?" }
    ],
    buttons: {
      requestPickup: "🗑️ பிக்அப் கோரிக்கை →",
      trackRequest: "📍 நிலையை டிராக் செய் →",
      reportIssue: "⚠️ புகார் பதிவு →",
      notifications: "🔔 அறிவிப்புகள் →",
      products: "🛍️ சந்தைக்கு செல் →",
      dashboard: "👤 எனது டேஷ்போர்டு →",
      login: "🔑 உள்நுழைவு →"
    },
    responses: {
      requestPickup: "கழிவு பிக்அப் பக்கத்திற்கு அழைத்துச் செல்கிறேன்...",
      reportIssue: "புகார் பதிவு செய்யும் பக்கத்திற்கு அழைத்துச் செல்கிறேன்...",
      notifications: "நேரலை அறிவிப்புகள் பக்கத்திற்கு அழைத்துச் செல்கிறேன்...",
      products: "துளிர் மறுசுழற்சி சந்தை பக்கத்திற்கு அழைத்துச் செல்கிறேன்...",
      overview: "துளிர் ஒரு வட்டப் பொருளாதார கழிவு மேலாண்மை தளம்."
    },
    workflowDetail: `🌿 துளிர் — ஸ்மார்ட் வட்டப் பொருளாதார கழிவு மேலாண்மை

கருத்து: கழிவுகளை மதிப்புமிக்க வளங்களாக மாற்றி, 6 முக்கிய பங்குதாரர்களை இணைக்கும் சுழற்சி முறை:

🔄 5-படி வேலைமுறை (Workflow):
1️⃣ கழிவு உருவாக்கம்: வீடுகள் மற்றும் ஹோட்டல்கள் கழிவுகளைப் பிரித்து பிக்அப் கோரிக்கை அனுப்புகின்றன.
2️⃣ சேகரிப்பு & டிரான்ஸ்போர்ட்: அருகில் உள்ள டிரான்ஸ்போர்ட் பார்ட்னர்கள் கழிவைச் சேகரித்து தூரத்தைக் கணக்கிடுகின்றனர்.
3️⃣ மறுசுழற்சி & தயாரிப்பு: மறுசுழற்சியாளர்கள் கழிவை உரம் மற்றும் புதிய பொருட்களாக மாற்றுகின்றனர்.
4️⃣ சந்தை விற்பனை: மறுசுழற்சி செய்யப்பட்ட பொருட்கள் துளிர் சந்தையில் விற்பனைக்கு பட்டியலிடப்படுகின்றன.
5️⃣ விநியோகம் & வருமானம்: டெலிவரி பார்ட்னர்கள் பொருட்களை விநியோகிக்கின்றனர்; அனைத்து பங்குதாரர்களும் வருமானம் பெறுகின்றனர்!`,
    voice: {
      listening: "{lang} மொழியில் கேட்கிறது... இப்போது பேசுங்கள்",
      stopped: "குரல் பதிவு நிறுத்தப்பட்டது",
      denied: "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.",
      unsupported: "இந்த உலாவி குரல் உள்ளீட்டை ஆதரிக்கவில்லை."
    },
    notLoggedIn: "நேரலை தகவல்களைப் பார்க்க உள்நுழையவும்.",
    noRequests: "கழிவு கோரிக்கைகள் எதுவும் இல்லை.",
    noOrders: "ஆர்டர்கள் எதுவும் இல்லை.",
    fallback: "டேஷ்போர்டிற்கு அழைத்துச் செல்கிறேன்..."
  },
  hi: {
    headerTitle: "थुलिर नागरिक कोपायलट 🌿",
    headerSubtitle: "नागरिक सहायक • 6 भूमिका विशेषज्ञ",
    welcome: "नमस्ते! मैं आपका थुलिर नागरिक कोपायलट 🌿 हूँ। किसी भी भूमिका (जनरेटर, ट्रांसपोर्टर, निर्माता, उपभोक्ता, डिलीवरी) के बारे में पूछें!",
    welcomeUnauth: "नमस्ते! थुलिर में आपका स्वागत है 🌿। 6 चक्रिय भूमिकाओं की विशेषताओं के बारे में पूछें!",
    prompts: [
      { label: "🏠 कचरा जनरेटर", text: "कचरा जनरेटर के रूप में मैं क्या कर सकता हूँ?" },
      { label: "🚛 परिवहन साथी", text: "परिवहन साथी के रूप में मैं क्या कर सकता हूँ?" },
      { label: "🏭 निर्माता", text: "निर्माता या रीसायकलर के रूप में क्या कर सकता हूँ?" },
      { label: "🛒 उपभोक्ता", text: "उपभोक्ता के रूप में मैं क्या कर सकता हूँ?" },
      { label: "📦 डिलीवरी", text: "डिलीवरी पार्टनर के रूप में क्या कर सकता हूँ?" }
    ],
    buttons: {
      requestPickup: "🗑️ पिकअप अनुरोध →",
      trackRequest: "📍 स्थिति ट्रैक करें →",
      reportIssue: "⚠️ शिकायत दर्ज करें →",
      notifications: "🔔 सूचनाएं →",
      products: "🛍️ उत्पाद देखें →",
      dashboard: "👤 मेरा डैशबोर्ड →",
      login: "🔑 लॉगिन करें →"
    },
    responses: {
      requestPickup: "कचरा पिकअप अनुरोध पेज पर भेजा जा रहा है...",
      reportIssue: "शिकायत निवारण पेज पर भेजा जा रहा है...",
      notifications: "सूचना पेज पर भेजा जा रहा है...",
      products: "थुलिर मार्केटप्लेस पर भेजा जा रहा है...",
      overview: "थुलिर कचरा प्रबंधन और पुनर्चक्रण मंच है।"
    },
    workflowDetail: `🌿 थुलिर — स्मार्ट सर्कुलर इकोनॉमी कचरा प्रबंधन

मूल अवधारणा: कचरे को उपयोगी संसाधनों में बदलकर 6 प्रमुख हितधारकों को जोड़ना:

🔄 5-चरण कार्यप्रणाली (Workflow):
1️⃣ कचरा जनरेशन: घर और होटल कचरा पिकअप अनुरोध भेजते हैं।
2️⃣ संग्रह और परिवहन: परिवहन साथी कचरा एकत्र करते हैं और दूरी ट्रैक करते हैं।
3️⃣ रीसाइक्लिंग: रीसायकलर्स कचरे को खाद और नई वस्तुओं में बदलते हैं।
4️⃣ इको मार्केटप्लेस: रीसायकल किए गए उत्पाद थुलिर मार्केटप्लेस पर बेचे जाते हैं।
5️⃣ डिलीवरी और कमाई: डिलीवरी पार्टनर ऑर्डर डिलीवर करते हैं और सभी भागीदार कमाई करते हैं!`,
    voice: {
      listening: "{lang} में सुन रहा हूँ... अब बोलें",
      stopped: "आवाज पहचान बंद",
      denied: "माइक्रोफोन अनुमति अस्वीकृत।",
      unsupported: "इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।"
    },
    notLoggedIn: "कृपया विवरण देखने के लिए लॉगिन करें।",
    noRequests: "कोई अनुरोध नहीं मिला।",
    noOrders: "अभी कोई ऑर्डर नहीं है।",
    fallback: "डैशबोर्ड पर भेजा जा रहा है..."
  },
  ml: {
    headerTitle: "തുളിർ സിവിക് കോപൈലറ്റ് 🌿",
    headerSubtitle: "സിവിക് അസിസ്റ്റന്റ് • 6 റോളുകൾ",
    welcome: "നമസ്കാരം! 6 റോളുകളുടെ സവിശേഷതകളെ കുറിച്ച് ചോദിക്കൂ!",
    welcomeUnauth: "നമസ്കാരം! 6 സർക്കുലർ റോളുകൾ എങ്ങനെ പ്രവർത്തിക്കുന്നു എന്ന് ചോദിക്കൂ!",
    prompts: [
      { label: "🏠 മാലിന്യ ജനറേറ്റർ", text: "മാലിന്യ ജനറേറ്ററായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "🚛 ട്രാൻസ്പോർട്ട്", text: "ട്രാൻസ്പോർട്ട് ഡ്രൈവറായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "🏭 മാനുഫാക്ചറർ", text: "റീസൈക്കിളറായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "🛒 ഉപഭോക്താവ്", text: "ഉപഭോക്താവായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "📦 ഡെലിവറി", text: "ഡെലിവറി ഡ്രൈവറായി എനിക്ക് എന്ത് ചെയ്യാം?" }
    ],
    buttons: {
      requestPickup: "🗑️ പിക്കപ്പ് ആവശ്യപ്പെടുക →",
      trackRequest: "📍 ട്രാക്ക് ചെയ്യുക →",
      reportIssue: "⚠️ പരാതി നൽകുക →",
      notifications: "🔔 അറിയിപ്പുകൾ →",
      products: "🛍️ ഉൽപ്പന്നങ്ങൾ കാണുക →",
      dashboard: "👤 എന്റെ ഡാഷ്‌ബോർഡ് →",
      login: "🔑 ലോഗിൻ ചെയ്യുക →"
    },
    responses: {
      requestPickup: "പിക്കപ്പ് പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      reportIssue: "പരാതി പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      notifications: "അറിയിപ്പുകൾ പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      products: "മാർക്കറ്റ് പ്ലേസ് പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      overview: "നിങ്ങൾക്ക് ഏത് പേജിലേക്കാണ് പോകേണ്ടത്?"
    },
    workflowDetail: `🌿 തുളിർ — സർക്കുലർ മാലിന്യ സംസ്കരണം

🔄 5 ഘട്ട വർക്ക്ഫ്ലോ:
1️⃣ മാലിന്യ ഉൽപ്പാദനം: വീടുകളും ഹോട്ടലുകളും മാലിന്യ പിക്കപ്പ് അഭ്യർത്ഥനകൾ നൽകുന്നു.
2️⃣ ശേഖരണവും ട്രാൻസ്പോർട്ടും: ഡ്രൈവർമാർ മാലിന്യം ശേഖരിക്കുകയും ദൂരം ട്രാക്ക് ചെയ്യുകയും ചെയ്യുന്നു.
3️⃣ റീസൈക്ലിംഗ്: നിർമ്മാതാക്കൾ മാലിന്യം വളവും പുതിയ ഉൽപ്പന്നങ്ങളുമാക്കുന്നു.
4️⃣ ഇക്കോ മാർക്കറ്റ്‌പ്ലേസ്: പുനരുപയോഗ ഉൽപ്പന്നങ്ങൾ തുളിർ മാർക്കറ്റിൽ വിൽക്കുന്നു.
5️⃣ ഡെലിവറിയും വരുമാനവും: ഡെലിവറി പാർട്ട്ണർമാർ ഓർഡറുകൾ എത്തിക്കുന്നു.`,
    voice: {
      listening: "{lang} ഭാഷയിൽ കേൾക്കുന്നു... സംസാരിക്കൂ",
      stopped: "വോയ്‌സ് റെക്കഗ്നിഷൻ നിന്നു",
      denied: "മൈക്രോഫോൺ അനുമതി നിഷേധിച്ചു.",
      unsupported: "ഈ ബ്രൗസറിൽ വോയ്‌സ് ഇൻപുട്ട് ലഭ്യമല്ല."
    },
    notLoggedIn: "വിവരങ്ങൾക്കായി ലോഗിൻ ചെയ്യുക.",
    noRequests: "അഭ്യർത്ഥനകൾ ഒന്നും കണ്ടെത്തിയില്ല.",
    noOrders: "ഓർഡറുകൾ ഒന്നും ഇല്ല.",
    fallback: "ഡാഷ്‌ബോർഡിലേക്ക് പോകുന്നു..."
  },
  te: {
    headerTitle: "తుళిర్ సివిక్ కోపైలట్ 🌿",
    headerSubtitle: "సివిక్ అసిస్టెంట్ • 6 పాత్రలు",
    welcome: "నమస్కారం! 6 పాత్రల డాష్‌బోర్డ్ వివరాల గురించి నన్ను అడగండి!",
    welcomeUnauth: "నమస్కారం! 6 సర్క్యులర్ పాత్రల సమాచారం కోసం నన్ను అడగండి!",
    prompts: [
      { label: "🏠 వ్యర్థ జనరేటర్", text: "వ్యర్థ జనరేటర్‌గా నేను ఏమి చేయగలను?" },
      { label: "🚛 రవాణా", text: "రవాణా భాగస్వామిగా నేను ఏమి చేయగలను?" },
      { label: "🏭 తయారీదారు", text: "తయారీదారుగా నేను ఏమి చేయగలను?" },
      { label: "🛒 వినియోగదారుడు", text: "వినియోగదారుడిగా నేను ఏమి చేయగలను?" },
      { label: "📦 డెలివరీ", text: "డెలివరీ భాగస్వామిగా నేను ఏమి చేయగలను?" }
    ],
    buttons: {
      requestPickup: "🗑️ పికప్ అభ్యర్థన →",
      trackRequest: "📍 ట్రాక్ చేయండి →",
      reportIssue: "⚠️ ఫిర్యాదు చేయండి →",
      notifications: "🔔 నోటిఫికేషన్‌లు →",
      products: "🛍️ ఉత్పత్తులు చూడండి →",
      dashboard: "👤 నా డాష్‌బోర్డ్ →",
      login: "🔑 లాగిన్ చేయండి →"
    },
    responses: {
      requestPickup: "వ్యర్థ పికప్ పేజీకి తీసుకెళ్తున్నాము...",
      reportIssue: "ఫిర్యాదు పేజీకి తీసుకెళ్తున్నాము...",
      notifications: "నోటిఫికేషన్ పేజీకి తీసుకెళ్తున్నాము...",
      products: "మార్కెట్‌ప్లేస్ పేజీకి తీసుకెళ్తున్నాము...",
      overview: "మీరు ఏ పేజీకి వెళ్లాలనుకుంటున్నారు?"
    },
    workflowDetail: `🌿 తుళిర్ — వ్యర్థ నిర్వహణ ప్రక్రియ

🔄 5 దశల పనితీరు:
1️⃣ వ్యర్థాల ఉత్పత్తి: ఇళ్ళు మరియు హోటళ్లు వ్యర్థ పికప్ అభ్యర్థనలను పంపుతాయి.
2️⃣ సేకరణ & రవాణా: డ్రైవర్లు వ్యర్థాలను సేకరించి దూరాన్ని ట్రాక్ చేస్తారు.
3️⃣ రీసైక్లింగ్: తయారీదారులు వ్యర్థాలను ఎరువులు మరియు కొత్త వస్తువులుగా మారుస్తారు.
4️⃣ ఈకో మార్కెట్‌ప్లేస్: రీసైకిల్ చేసిన ఉత్పత్తులు తుళిర్ మార్కెట్‌లో విక్రయించబడతాయి.
5️⃣ డెలివరీ & సంపాదన: డెలివరీ భాగస్వాములు ఆర్డర్‌లను అందిస్తారు.`,
    voice: {
      listening: "{lang} భాషలో వింటోంది... మాట్లాడండి",
      stopped: "వాయిస్ రికగ్నిషన్ ఆగిపోయింది",
      denied: "మైక్రోఫోన్ అనుమతి నిరాకరించబడింది.",
      unsupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు."
    },
    notLoggedIn: "వివరాల కోసం సైన్ ఇన్ చేయండి.",
    noRequests: "అభ్యర్థనలు లేవు.",
    noOrders: "ఆర్డర్‌లు లేవు.",
    fallback: "డాష్‌బోర్డ్‌కి తీసుకెళ్తున్నాము..."
  },
  kn: {
    headerTitle: "ತುಳಿರ್ ಸಿವಿಕ್ ಕೊಪೈಲಟ್ 🌿",
    headerSubtitle: "ಸಿವಿಕ್ ಸಹಾಯಕ • 6 ಪಾತ್ರಗಳ ಮಾರ್ಗದರ್ಶಿ",
    welcome: "ನಮಸ್ಕಾರ! 6 ಪಾತ್ರಗಳ ವೈಶಿಷ್ಟ್ಯಗಳ ಬಗ್ಗೆ ಕೇಳಿ!",
    welcomeUnauth: "ನಮಸ್ಕಾರ! 6 ಸರ್ಕ್ಯುಲರ್ ಪಾತ್ರಗಳು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ ಎಂದು ಕೇಳಿ!",
    prompts: [
      { label: "🏠 ತ್ಯಾಜ್ಯ ಉತ್ಪಾದಕ", text: "ತ್ಯಾಜ್ಯ ಉತ್ಪಾದಕನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "🚛 ಸಾರಿಗೆ", text: "ಸಾರಿಗೆ ಪಾಲುದಾರನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "🏭 ತಯಾರಕ", text: "ತಯಾರಕನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "🛒 ಗ್ರಾಹಕ", text: "ಗ್ರಾಹಕನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "📦 ಡೆಲಿವರಿ", text: "ಡೆಲಿವರಿ ಪಾಲುದಾರನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" }
    ],
    buttons: {
      requestPickup: "🗑️ ಪಿಕಪ್ ವಿನಂತಿ →",
      trackRequest: "📍 ಟ್ರ್ಯಾಕ್ ಮಾಡಿ →",
      reportIssue: "⚠️ ದೂರು ನೀಡಿ →",
      notifications: "🔔 ಅಧಿಸೂಚನೆಗಳು →",
      products: "🛍️ ಉತ್ಪನ್ನಗಳನ್ನು ನೋಡಿ →",
      dashboard: "👤 ನನ್ನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ →",
      login: "🔑 ಲಾಗಿನ್ ಮಾಡಿ →"
    },
    responses: {
      requestPickup: "ತ್ಯಾಜ್ಯ ಪಿಕಪ್ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      reportIssue: "ದೂರು ಸಲ್ಲಿಕೆ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      notifications: "ಅಧಿಸೂಚನೆಗಳ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      products: "ಮಾರುಕಟ್ಟೆ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      overview: "ನೀವು ಯಾವ ಪುಟಕ್ಕೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?"
    },
    workflowDetail: `🌿 ತುಳಿರ್ — ತ್ಯಾಜ್ಯ ನಿರ್ವಹಣೆ ವ್ಯವಸ್ಥೆ

🔄 5 ಹಂತಗಳ ಕಾರ್ಯವೈಖರಿ:
1️⃣ ತ್ಯಾಜ್ಯ ಉತ್ಪಾದನೆ: ಮನೆಗಳು ಮತ್ತು ಹೋಟೆಲ್‌ಗಳು ಪಿಕಪ್ ವಿನಂತಿಗಳನ್ನು ಸಲ್ಲಿಸುತ್ತವೆ.
2️⃣ ಸಂಗ್ರಹಣೆ ಮತ್ತು ಸಾರಿಗೆ: ಚಾಲಕರು ತ್ಯಾಜ್ಯವನ್ನು ಸಂಗ್ರಹಿಸಿ ದೂರವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತಾರೆ.
3️⃣ ಮರುಬಳಕೆ: ತಯಾರಕರು ತ್ಯಾಜ್ಯವನ್ನು ಗೊಬ್ಬರ ಮತ್ತು ಹೊಸ ಉತ್ಪನ್ನಗಳಾಗಿ ಪರಿವರ್ತಿಸುತ್ತಾರೆ.
4️⃣ ಇಕೋ ಮಾರುಕಟ್ಟೆ: ಮರುಬಳಕೆಯ ಉತ್ಪನ್ನಗಳನ್ನು ತುಳಿರ್ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಮಾರಾಟ ಮಾಡಲಾಗುತ್ತದೆ.
5️⃣ ಡೆಲಿವರಿ ಮತ್ತು ಆದಾಯ: ಡೆಲಿವರಿ ಪಾಲುದಾರರು ಆರ್ಡರ್‌ಗಳನ್ನು ತಲುಪಿಸುತ್ತಾರೆ.`,
    voice: {
      listening: "{lang} ಭಾಷೆಯಲ್ಲಿ ಕೇಳುತ್ತಿದೆ... ಮಾತನಾಡಿ",
      stopped: "ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ನಿಂತಿದೆ",
      denied: "ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿಯನ್ನು ನಿರಾಕರಿಸಲಾಗಿದೆ.",
      unsupported: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ."
    },
    notLoggedIn: "ವಿವರಗಳಿಗಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ.",
    noRequests: "ವಿನಂತಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    noOrders: "ಆರ್ಡರ್‌ಗಳು ಇಲ್ಲ.",
    fallback: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ..."
  },
  ml: {
    headerTitle: "തുളിർ സിവിക് കോപൈലറ്റ് 🌿",
    headerSubtitle: "സിവിക് അസിസ്റ്റന്റ് • 6 റോളുകൾ",
    welcome: "നമസ്കാരം! 6 റോളുകളുടെ സവിശേഷതകളെ കുറിച്ച് ചോദിക്കൂ!",
    welcomeUnauth: "നമസ്കാരം! 6 സർക്കുലർ റോളുകൾ എങ്ങനെ പ്രവർത്തിക്കുന്നു എന്ന് ചോദിക്കൂ!",
    prompts: [
      { label: "🏠 മാലിന്യ ജനറേറ്റർ", text: "മാലിന്യ ജനറേറ്ററായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "🚛 ട്രാൻസ്പോർട്ട്", text: "ട്രാൻസ്പോർട്ട് ഡ്രൈവറായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "🏭 മാനുഫാക്ചറർ", text: "റീസൈക്കിളറായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "🛒 ഉപഭോക്താവ്", text: "ഉപഭോക്താവായി എനിക്ക് എന്ത് ചെയ്യാം?" },
      { label: "📦 ഡെലിവറി", text: "ഡെലിവറി ഡ്രൈവറായി എനിക്ക് എന്ത് ചെയ്യാം?" }
    ],
    buttons: {
      requestPickup: "🗑️ പിക്കപ്പ് ആവശ്യപ്പെടുക →",
      trackRequest: "📍 ട്രാക്ക് ചെയ്യുക →",
      reportIssue: "⚠️ പരാതി നൽകുക →",
      notifications: "🔔 അറിയിപ്പുകൾ →",
      products: "🛍️ ഉൽപ്പന്നങ്ങൾ കാണുക →",
      dashboard: "👤 എന്റെ ഡാഷ്‌ബോർഡ് →",
      login: "🔑 ലോഗിൻ ചെയ്യുക →"
    },
    responses: {
      requestPickup: "പിക്കപ്പ് പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      reportIssue: "പരാതി പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      notifications: "അറിയിപ്പുകൾ പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      products: "മാർക്കറ്റ് പ്ലേസ് പേജിലേക്ക് കൊണ്ടുപോകുന്നു...",
      overview: "നിങ്ങൾക്ക് ഏത് പേജിലേക്കാണ് പോകേണ്ടത്?"
    },
    workflowDetail: `🌿 തുളിർ — സർക്കുലർ മാലിന്യ സംസ്കരണം`,
    voice: {
      listening: "{lang} ഭാഷയിൽ കേൾക്കുന്നു... സംസാരിക്കൂ",
      stopped: "വോയ്‌സ് റെക്കഗ്നിഷൻ നിന്നു",
      denied: "മൈക്രോഫോൺ അനുമതി നിഷേധിച്ചു.",
      unsupported: "ഈ ബ്രൗസറിൽ വോയ്‌സ് ഇൻപുട്ട് ലഭ്യമല്ല."
    },
    notLoggedIn: "വിവരങ്ങൾക്കായി ലോഗിൻ ചെയ്യുക.",
    noRequests: "അഭ്യർത്ഥനകൾ ഒന്നും കണ്ടെത്തിയില്ല.",
    noOrders: "ഓർഡറുകൾ ഒന്നും ഇല്ല.",
    fallback: "ഡാഷ്‌ബോർഡിലേക്ക് പോകുന്നു..."
  },
  te: {
    headerTitle: "తుళిర్ సివిక్ కోపైలట్ 🌿",
    headerSubtitle: "సివిక్ అసిస్టెంట్ • 6 పాత్రలు",
    welcome: "నమస్కారం! 6 పాత్రల డాష్‌బోర్డ్ వివరాల గురించి నన్ను అడగండి!",
    welcomeUnauth: "నమస్కారం! 6 సర్క్యులర్ పాత్రల సమాచారం కోసం నన్ను అడగండి!",
    prompts: [
      { label: "🏠 వ్యర్థ జనరేటర్", text: "వ్యర్థ జనరేటర్‌గా నేను ఏమి చేయగలను?" },
      { label: "🚛 రవాణా", text: "రవాణా భాగస్వామిగా నేను ఏమి చేయగలను?" },
      { label: "🏭 తయారీదారు", text: "తయారీదారుగా నేను ఏమి చేయగలను?" },
      { label: "🛒 వినియోగదారుడు", text: "వినియోగదారుడిగా నేను ఏమి చేయగలను?" },
      { label: "📦 డెలివరీ", text: "డెలివరీ భాగస్వామిగా నేను ఏమి చేయగలను?" }
    ],
    buttons: {
      requestPickup: "🗑️ పికప్ అభ్యర్థన →",
      trackRequest: "📍 ట్రాక్ చేయండి →",
      reportIssue: "⚠️ ఫిర్యాదు చేయండి →",
      notifications: "🔔 నోటిఫికేషన్‌లు →",
      products: "🛍️ ఉత్పత్తులు చూడండి →",
      dashboard: "👤 నా డాష్‌బోర్డ్ →",
      login: "🔑 లాగిన్ చేయండి →"
    },
    responses: {
      requestPickup: "వ్యర్థ పికప్ పేజీకి తీసుకెళ్తున్నాము...",
      reportIssue: "ఫిర్యాదు పేజీకి తీసుకెళ్తున్నాము...",
      notifications: "నోటిఫికేషన్ పేజీకి తీసుకెళ్తున్నాము...",
      products: "మార్కెట్‌ప్లేస్ పేజీకి తీసుకెళ్తున్నాము...",
      overview: "మీరు ఏ పేజీకి వెళ్లాలనుకుంటున్నారు?"
    },
    workflowDetail: `🌿 తుళిర్ — వ్యర్థ నిర్వహణ`,
    voice: {
      listening: "{lang} భాషలో వింటోంది... మాట్లాడండి",
      stopped: "వాయిస్ రికగ్నిషన్ ఆగిపోయింది",
      denied: "మైక్రోఫోన్ అనుమతి నిరాకరించబడింది.",
      unsupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు."
    },
    notLoggedIn: "వివరాల కోసం సైన్ ఇన్ చేయండి.",
    noRequests: "అభ్యర్థనలు లేవు.",
    noOrders: "ఆర్డర్‌లు లేవు.",
    fallback: "డాష్‌బోర్డ్‌కి తీసుకెళ్తున్నాము..."
  },
  kn: {
    headerTitle: "ತುಳಿರ್ ಸಿವಿಕ್ ಕೊಪೈಲಟ್ 🌿",
    headerSubtitle: "ಸಿವಿಕ್ ಸಹಾಯಕ • 6 ಪಾತ್ರಗಳ ಮಾರ್ಗದರ್ಶಿ",
    welcome: "ನಮಸ್ಕಾರ! 6 ಪಾತ್ರಗಳ ವೈಶಿಷ್ಟ್ಯಗಳ ಬಗ್ಗೆ ಕೇಳಿ!",
    welcomeUnauth: "ನಮಸ್ಕಾರ! 6 ಸರ್ಕ್ಯುಲರ್ ಪಾತ್ರಗಳು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ ಎಂದು ಕೇಳಿ!",
    prompts: [
      { label: "🏠 ತ್ಯಾಜ್ಯ ಉತ್ಪಾದಕ", text: "ತ್ಯಾಜ್ಯ ಉತ್ಪಾದಕನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "🚛 ಸಾರಿಗೆ", text: "ಸಾರಿಗೆ ಪಾಲುದಾರನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "🏭 ತಯಾರಕ", text: "ತಯಾರಕನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "🛒 ಗ್ರಾಹಕ", text: "ಗ್ರಾಹಕನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" },
      { label: "📦 ಡೆಲಿವರಿ", text: "ಡೆಲಿವರಿ ಪಾಲುದಾರನಾಗಿ ನಾನು ಏನು ಮಾಡಬಹುದು?" }
    ],
    buttons: {
      requestPickup: "🗑️ ಪಿಕಪ್ ವಿನಂತಿ →",
      trackRequest: "📍 ಟ್ರ್ಯಾಕ್ ಮಾಡಿ →",
      reportIssue: "⚠️ ದೂರು ನೀಡಿ →",
      notifications: "🔔 ಅಧಿಸൂಚನೆಗಳು →",
      products: "🛍️ ಉತ್ಪನ್ನಗಳನ್ನು ನೋಡಿ →",
      dashboard: "👤 ನನ್ನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ →",
      login: "🔑 ಲಾಗಿನ್ ಮಾಡಿ →"
    },
    responses: {
      requestPickup: "ತ್ಯಾಜ್ಯ ಪಿಕಪ್ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      reportIssue: "ದೂರು ಸಲ್ಲಿಕೆ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      notifications: "ಅಧಿಸೂಚನೆಗಳ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      products: "ಮಾರುಕಟ್ಟೆ ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ...",
      overview: "ನೀವು ಯಾವ ಪುಟಕ್ಕೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?"
    },
    workflowDetail: `🌿 ತುಳಿರ್ — ತ್ಯಾಜ್ಯ ನಿರ್ವಹಣೆ`,
    voice: {
      listening: "{lang} ಭಾಷೆಯಲ್ಲಿ ಕೇಳುತ್ತಿದೆ... ಮಾತನಾಡಿ",
      stopped: "ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ನಿಂತಿದೆ",
      denied: "ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿಯನ್ನು ನಿರಾಕರಿಸಲಾಗಿದೆ.",
      unsupported: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ."
    },
    notLoggedIn: "ವಿವರಗಳಿಗಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ.",
    noRequests: "ವಿನಂತಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    noOrders: "ಆರ್ಡರ್‌ಗಳು ಇಲ್ಲ.",
    fallback: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ..."
  }
};

export default function AIChatbot() {
  const navigate = useNavigate();
  const { language, setLanguage, LANGUAGES } = useLanguage();
  const { user: currentUser, userData } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const langRef = useRef(null);

  const tCopilot = COPILOT_TRANSLATIONS[language] || COPILOT_TRANSLATIONS.en;
  const currentLangObj = BROWSER_SPEECH_LANGS[language] || BROWSER_SPEECH_LANGS.en;

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: currentUser ? tCopilot.welcome : tCopilot.welcomeUnauth,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: "🏠 Generator Role →", action: 'navigate', route: currentUser && ['household', 'hotel', 'waste_generator'].includes(userData?.role) ? '/dashboard/generator' : '/login' },
          { label: "🏭 Manufacturer Role →", action: 'navigate', route: currentUser && ['manufacturer', 'recycler'].includes(userData?.role) ? '/dashboard/manufacturer' : '/login' },
          { label: "🛍️ Marketplace →", action: 'navigate', route: '/marketplace' }
        ]
      }
    ]);
  }, [language, currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, loading]);

  function getRoleDashboardRoute(role) {
    if (!role) return '/dashboard';
    const routes = {
      household: '/dashboard/generator',
      hotel: '/dashboard/generator',
      waste_generator: '/dashboard/generator',
      manufacturer: '/dashboard/manufacturer',
      transport_partner: '/dashboard/transport',
      collection_partner: '/dashboard/transport',
      consumer: '/dashboard/consumer',
      delivery_partner: '/dashboard/delivery',
      admin: '/dashboard/admin',
    };
    return routes[role] || '/dashboard';
  }

  const handleActionClick = (actionItem) => {
    if (actionItem.action === 'navigate' && actionItem.route) {
      navigate(actionItem.route, actionItem.state ? { state: actionItem.state } : undefined);
      setIsMinimized(true);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceNotice(tCopilot.voice.unsupported);
      setTimeout(() => setVoiceNotice(''), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const targetSpeechConfig = BROWSER_SPEECH_LANGS[language] || BROWSER_SPEECH_LANGS.en;
      recognition.lang = targetSpeechConfig.code;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        const noticeText = tCopilot.voice.listening.replace('{lang}', targetSpeechConfig.label);
        setVoiceNotice(noticeText);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setVoiceNotice(tCopilot.voice.denied);
        } else {
          setVoiceNotice(tCopilot.voice.stopped);
        }
        setTimeout(() => setVoiceNotice(''), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceNotice('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsListening(false);
      setVoiceNotice(tCopilot.voice.unsupported);
      setTimeout(() => setVoiceNotice(''), 4000);
    }
  };

  const handleSend = async (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: queryText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const responseObj = await processCopilotQuery(queryText);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: responseObj.text,
        actions: responseObj.actions || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);

      if (responseObj.autoNavigate && responseObj.actions?.[0]) {
        setTimeout(() => {
          handleActionClick(responseObj.actions[0]);
        }, 800);
      }
    } catch (err) {
      console.error("Copilot error:", err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: tCopilot.fallback,
        actions: [{ label: tCopilot.buttons.dashboard, action: 'navigate', route: '/dashboard' }],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const processCopilotQuery = async (userQuery) => {
    const q = userQuery.toLowerCase();
    const userRole = userData?.role;

    // 1. PROJECT EXPLANATION & WORKFLOW CONCEPT INTENTS
    const workflowKeywords = ['how it works', 'workflow', 'process', 'concept', 'explain', 'steps', 'எப்படி செயல்படுகிறது', 'வேலைமுறை', 'செயல்முறை', 'कैसे काम करता है', 'कार्यप्रणाली', 'എങ്ങനെ പ്രവർത്തിക്കുന്നു', 'വർക്ക്ഫ്ലോ', 'ఎలా పనిచేస్తుంది', 'వర్క్‌ఫ్లో', 'ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ', 'ವರ್ಕ್‌ಫ್ಲೋ'];
    const projectKeywords = ['what is thulir', 'project', 'vision', 'about thulir', 'circular economy', 'துளிர் என்றால் என்ன', 'திட்டம்', 'நோக்கம்', 'थुलिर क्या है', 'प्रोजेक्ट', 'വിഷൻ', 'പ്രോജക്റ്റ്', 'ప్రాజెక్ట్', 'ವಿಷನ್', 'ಯೋಜನೆ'];

    if (workflowKeywords.some(k => q.includes(k)) || projectKeywords.some(k => q.includes(k))) {
      return {
        text: tCopilot.workflowDetail,
        actions: [
          { label: "ℹ️ Interactive Workflow Page →", action: 'navigate', route: '/how-it-works' },
          { label: "🌿 About THULIR Vision →", action: 'navigate', route: '/about' },
          { label: "🛍️ Explore Marketplace →", action: 'navigate', route: '/marketplace' }
        ]
      };
    }

    // 1b. CONSUMER FEEDBACK & PHOTO REVIEWS INTENT
    const feedbackKeywords = ['feedback', 'review', 'rating', 'star', 'comment', 'photo review', 'கருத்து', 'மதிப்பீடு', 'பின்னூட்டம்', 'फीडबैक', 'समीक्षा', 'അഭിപ്രായം', 'ഫിഡ്ബാക്ക്', 'ఫీడ్‌బ్యాక్', 'ಫೀಡ್‌ಬ್ಯಾಕ್'];
    if (feedbackKeywords.some(k => q.includes(k))) {
      if (currentUser && userRole === 'consumer') {
        return {
          text: "⭐ Directing you to the ⭐ Feedback & Photo Reviews section on your Consumer Dashboard! You can rate your orders from 1 to 5 stars, write reviews, and upload photo evidence of received eco products.",
          autoNavigate: true,
          actions: [{ label: "⭐ Open Consumer Feedback & Photo Reviews →", action: 'navigate', route: '/dashboard/consumer', state: { tab: 'feedback' } }]
        };
      }
      return {
        text: "⭐ Consumer Feedback & Photo Reviews let consumers rate upcycled products and upload photo proof. Please log in with a Consumer account to access the Feedback portal.",
        autoNavigate: true,
        actions: [{ label: "🔑 Log in as Consumer →", action: 'navigate', route: '/login' }]
      };
    }

    // 2. STRICT SECURITY & ADMIN PROTECTION (Admin Dashboard MUST NOT be accessed by general users via Chatbot)
    const adminKeywords = ['admin', 'manager', 'அட்மின்', 'एडமின்', 'അഡ്മിൻ', 'అడ్మిన్', 'ಅಡ್ಮಿನ್'];
    if (adminKeywords.some(k => q.includes(k))) {
      if (currentUser && userRole === 'admin') {
        return {
          text: "Directing to the Admin Dashboard...",
          autoNavigate: true,
          actions: [{ label: "⚙️ Open Admin Dashboard →", action: 'navigate', route: '/dashboard/admin' }]
        };
      } else {
        return {
          text: "🔒 Access Restricted: The Admin Dashboard cannot be accessed via the AI Chatbot by general users. Authorized administrators must sign in with Admin credentials.",
          autoNavigate: true,
          actions: [{ label: "🔑 Admin Login →", action: 'navigate', route: '/login' }]
        };
      }
    }

    // 3. ROLE SPECIFIC DASHBOARD & INTERNAL FEATURE GUIDES
    const mfgKeywords = ['manufacturer', 'recycler', 'factory', 'தயாரிப்பாளர்', 'மறுசுழற்சி', 'निर्माता', 'ഉൽപ്പാദകൻ', 'തയారీదారు', 'ತಯಾರಕ'];
    const transKeywords = ['transport', 'driver', 'collection partner', 'டிரான்ஸ்போர்ட்', 'சேகரிப்பு', 'परिवहन', 'ഡ്രൈവർ', 'രవాణా', 'സാരീഗെ'];
    const consKeywords = ['consumer', 'buyer', 'நுகர்வோர்', 'வாடிக்கையாளர்', 'उपभोक्ता', 'ഉപഭോക്താവ്', 'వినియోగదారుడు', 'గ్రాహక'];
    const delivKeywords = ['delivery', 'courier', 'டெலிவரி', 'डिलीवरी', 'ഡെലിവറി', 'డెలివరీ', 'ಡೆಲಿವರಿ'];
    const genKeywords = ['generator', 'household', 'hotel', 'கழிவு வழங்குபவர்', 'जनरेटर', 'ജനറേറ്റർ', 'జనరేటర్', 'ಜನರೇಟರ್'];

    if (mfgKeywords.some(k => q.includes(k))) {
      if (currentUser && (userRole === 'manufacturer' || userRole === 'recycler')) {
        return {
          text: "🏭 Manufacturer & Recycler Dashboard Features:\n• Incoming Shipments: Accept raw waste deliveries from transport drivers.\n• Waste Processing: Record conversion of raw waste into compost & pellets.\n• Eco Marketplace: Add new upcycled products with pricing, stock, & photos.",
          autoNavigate: true,
          actions: [{ label: "🏭 Open Manufacturer Dashboard →", action: 'navigate', route: '/dashboard/manufacturer' }]
        };
      }
      return {
        text: "🏭 Manufacturer & Recycler Role Features:\n• Accept raw waste shipments from drivers.\n• Log waste upcycling into eco-goods.\n• List finished recycled products on THULIR Marketplace.\n\nPlease log in with a Manufacturer account to access this dashboard.",
        autoNavigate: true,
        actions: [{ label: "🔑 Log in as Manufacturer →", action: 'navigate', route: '/login' }]
      };
    }

    if (transKeywords.some(k => q.includes(k))) {
      if (currentUser && (userRole === 'transport_partner' || userRole === 'collection_partner')) {
        return {
          text: "🚛 Transport & Collection Dashboard Features:\n• Available Pickups: View & accept nearby pending waste requests.\n• GPS Distance Tracking: Log route distance (km) driven.\n• Distance Payouts: Track base pickup fee + per-km transport earnings.",
          autoNavigate: true,
          actions: [{ label: "🚛 Open Transport Dashboard →", action: 'navigate', route: '/dashboard/transport' }]
        };
      }
      return {
        text: "🚛 Transport Partner Role Features:\n• Accept nearby waste collection jobs.\n• Track GPS route distance in real-time.\n• Earn base pickup fee + per-km distance payouts.\n\nPlease log in with a Transport account to access this dashboard.",
        autoNavigate: true,
        actions: [{ label: "🔑 Log in as Transport →", action: 'navigate', route: '/login' }]
      };
    }

    if (consKeywords.some(k => q.includes(k))) {
      if (currentUser && userRole === 'consumer') {
        return {
          text: "🛒 Consumer Dashboard Features:\n• Eco Marketplace: Purchase upcycled products & compost.\n• Order History: Track live delivery status of your purchases.\n• Eco Impact Points: Earn green reward points for eco-conscious shopping.",
          autoNavigate: true,
          actions: [{ label: "🛒 Open Consumer Dashboard →", action: 'navigate', route: '/dashboard/consumer' }]
        };
      }
      return {
        text: "🛒 Consumer Role Features:\n• Buy recycled & upcycled goods on THULIR Marketplace.\n• Track order delivery in real-time.\n• Earn eco impact rewards.\n\nPlease log in with a Consumer account to access this dashboard.",
        autoNavigate: true,
        actions: [{ label: "🔑 Log in as Consumer →", action: 'navigate', route: '/login' }]
      };
    }

    if (delivKeywords.some(k => q.includes(k))) {
      if (currentUser && userRole === 'delivery_partner') {
        return {
          text: "📦 Delivery Partner Dashboard Features:\n• Available Delivery Jobs: Accept ready-to-ship marketplace orders.\n• Delivery Status: Update orders to Out For Delivery & Delivered.\n• Delivery Earnings: View payout earnings per completed order.",
          autoNavigate: true,
          actions: [{ label: "📦 Open Delivery Dashboard →", action: 'navigate', route: '/dashboard/delivery' }]
        };
      }
      return {
        text: "📦 Delivery Partner Role Features:\n• Pick up packages from manufacturers and deliver to consumers.\n• Track per-delivery payouts.\n\nPlease log in with a Delivery account to access this dashboard.",
        autoNavigate: true,
        actions: [{ label: "🔑 Log in as Delivery →", action: 'navigate', route: '/login' }]
      };
    }

    if (genKeywords.some(k => q.includes(k))) {
      if (currentUser && (userRole === 'household' || userRole === 'hotel' || userRole === 'waste_generator')) {
        return {
          text: "🏠 Waste Generator Dashboard Features:\n• Create Waste Request: Submit waste type, weight (kg), & location.\n• Live Tracking: View assigned driver & pickup status.\n• Subscriptions: Set up recurring daily or weekly pickups.\n• Eco Rewards & Impact: Track Eco Points & pickup history.",
          autoNavigate: true,
          actions: [{ label: "🏠 Open Generator Dashboard →", action: 'navigate', route: '/dashboard/generator' }]
        };
      }
      return {
        text: "🏠 Waste Generator Role Features:\n• Submit waste requests for Organic, Plastic, E-Waste, Paper, & Metal.\n• Setup recurring pickup subscriptions.\n• Earn Eco Points & reward badges per pickup.\n\nPlease log in with a Generator account to access this dashboard.",
        autoNavigate: true,
        actions: [{ label: "🔑 Log in as Generator →", action: 'navigate', route: '/login' }]
      };
    }

    // 4. PUBLIC PAGES & DIRECT SITE NAVIGATION
    const marketKeywords = ['marketplace', 'market', 'product', 'shop', 'store', 'buy', 'சந்தை', 'பொருட்கள்', 'வாங்கு', 'दुकान', 'उत्पाद', 'मार्केट', 'കട', 'ഉൽപ്പന്നങ്ങൾ', 'അంగడి', 'ఉత్పత్తులు', 'ಅಂಗಡಿ', 'ಉತ್ಪನ್ನಗಳು'];
    const cartKeywords = ['cart', 'basket', 'checkout', 'கார்ட்', 'கூடை', 'कार्ट', 'കാർട്ട്', 'కార్ట్', 'ಕಾರ್ಟ್'];
    const loginKeywords = ['login', 'sign in', 'log in', 'உள்நுழை', 'लॉगिन', 'ലോഗിൻ', 'లాగిన్', 'ಲಾಗಿನ್'];
    const signupKeywords = ['signup', 'register', 'sign up', 'பதிவு செய்', 'साइन अप', 'രജിസ്റ്റർ', 'రిజిస్టర్', 'ನೋಂದಣಿ'];

    if (marketKeywords.some(k => q.includes(k))) {
      return {
        text: tCopilot.responses.products,
        autoNavigate: true,
        actions: [{ label: tCopilot.buttons.products, action: 'navigate', route: '/marketplace' }]
      };
    }

    if (cartKeywords.some(k => q.includes(k))) {
      return {
        text: "Directing to your Marketplace Shopping Cart...",
        autoNavigate: true,
        actions: [{ label: "🛒 View Cart →", action: 'navigate', route: '/marketplace/cart' }]
      };
    }

    if (loginKeywords.some(k => q.includes(k))) {
      return {
        text: "Directing to the Login Page...",
        autoNavigate: true,
        actions: [{ label: tCopilot.buttons.login, action: 'navigate', route: '/login' }]
      };
    }

    if (signupKeywords.some(k => q.includes(k))) {
      return {
        text: "Directing to Account Registration...",
        autoNavigate: true,
        actions: [{ label: "📝 Sign Up →", action: 'navigate', route: '/signup' }]
      };
    }

    // 5. WASTE PICKUP & TRACKING INTENTS
    const pickupKeywords = ['request', 'pickup', 'create', 'waste', 'கழிவு', 'பிக்அப்', 'கோரிக்கை', 'अनुरोध', 'पिकअप', 'कचरा', 'അഭ്യർത്ഥന', 'പിക്കപ്പ്', 'അഭ്യർത്ഥിക്കുക', 'అభ్యర్థన', 'పికప్', 'ವಿನಂತಿ', 'ಪಿಕಪ್'];
    const statusKeywords = ['status', 'track', 'latest', 'where', 'பிக்அப்', 'நிலை', 'எங்கே', 'ट्रैक', 'स्थिति', 'कहाँ', 'നില', 'സ്റ്റാറ്റസ്', 'എവിടെ', 'സ്റ്റേറ്റസ്', 'ఎక్కడ', 'ಸ್ಥಿತಿ', 'ಎಲ್ಲಿದೆ'];

    if (statusKeywords.some(k => q.includes(k))) {
      if (currentUser) {
        try {
          const qWaste = query(
            collection(db, 'wasteRequests'),
            where('generatorId', '==', currentUser.uid)
          );
          const snap = await getDocs(qWaste);
          if (!snap.empty) {
            const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            const latest = docs[0];

            return {
              text: `📦 Request ID: #${latest.id.slice(0, 6).toUpperCase()}\n• Type: ${latest.wasteType || latest.type || 'Mixed Waste'}\n• Weight: ${latest.weight || latest.quantityKg || 'N/A'} kg\n• Status: ${latest.status || 'PENDING'}\n• Location: ${latest.address || latest.locationName || 'Saved Address'}`,
              autoNavigate: true,
              actions: [
                { label: tCopilot.buttons.trackRequest, action: 'navigate', route: getRoleDashboardRoute(userRole) },
                { label: tCopilot.buttons.requestPickup, action: 'navigate', route: getRoleDashboardRoute(userRole) }
              ]
            };
          }
        } catch (err) {
          console.warn("Firestore error:", err);
        }
      }
      return {
        text: "Please log in to track your live waste pickup requests.",
        autoNavigate: true,
        actions: [{ label: tCopilot.buttons.login, action: 'navigate', route: '/login' }]
      };
    }

    if (pickupKeywords.some(k => q.includes(k))) {
      if (currentUser) {
        return {
          text: tCopilot.responses.requestPickup,
          autoNavigate: true,
          actions: [{ label: tCopilot.buttons.requestPickup, action: 'navigate', route: getRoleDashboardRoute(userRole) }]
        };
      }
      return {
        text: "Please log in with your Generator account to submit waste pickup requests.",
        autoNavigate: true,
        actions: [{ label: tCopilot.buttons.login, action: 'navigate', route: '/login' }]
      };
    }

    // 6. LIVE GEMINI AI CALL FOR OTHER OPEN-ENDED QUESTIONS (Includes 6 Role Dashboard Intelligence)
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (geminiApiKey && geminiApiKey.length > 5) {
      try {
        const targetLang = currentLangObj.label;
        const promptText = `You are THULIR Civic Copilot 🌿, the official AI assistant for THULIR Smart Waste Management circular platform.
You understand all 6 stakeholder roles and their internal dashboard features:
1. Waste Generator (Household/Hotel): Submit pickup requests, view request status, track eco points & pickup charges, setup daily/weekly subscriptions.
2. Transport & Collection Partner: Accept pending pickups, GPS route navigation, log vehicle number, track per-km distance earnings.
3. Manufacturer & Recycler: Accept raw waste shipments, log processing/upcycling into compost/pellets, list eco-products on marketplace.
4. Consumer: Browse Eco Marketplace, buy upcycled goods, track delivery, leave star feedback & photo reviews, earn eco impact reward points.
5. Delivery Partner: Accept marketplace package delivery jobs, update status to delivered, view per-delivery earnings.
6. Admin: Overview system metrics, approve new partner accounts, set platform commission & per-km transport rates.

Answer concisely, accurately, and helpfully in ${targetLang} language for the user question:\n\n${userQuery}`;

        const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
        let aiText = null;

        for (const modelName of modelsToTry) {
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
              })
            });

            if (response.ok) {
              const data = await response.json();
              aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (aiText) break;
            }
          } catch (modelErr) {
            console.warn(`Model ${modelName} fetch error:`, modelErr);
          }
        }

        if (aiText) {
          return {
            text: aiText,
            actions: [
              { label: "ℹ️ View How It Works →", action: 'navigate', route: '/how-it-works' },
              { label: "🌿 About THULIR Project →", action: 'navigate', route: '/about' },
              { label: tCopilot.buttons.products, action: 'navigate', route: '/marketplace' }
            ]
          };
        }
      } catch (err) {
        console.warn("Gemini API call warning:", err);
      }
    }

    // Fallback Overview Response
    return {
      text: tCopilot.responses.overview,
      actions: [
        { label: "ℹ️ View How It Works →", action: 'navigate', route: '/how-it-works' },
        { label: "🛍️ Marketplace →", action: 'navigate', route: '/marketplace' },
        { label: "🌿 About THULIR →", action: 'navigate', route: '/about' }
      ]
    };
  };

  return (
    <div className="ai-chatbot-container">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button 
          className="ai-chatbot-launcher"
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          title="Open THULIR Civic Copilot"
        >
          <div className="launcher-icon-wrap">
            <Bot className="launcher-icon" />
            <Sparkles className="launcher-sparkle" />
          </div>
          <span className="launcher-label">Civic Copilot</span>
          <span className="launcher-badge">{language.toUpperCase()}</span>
        </button>
      )}

      {/* Copilot Modal Card */}
      {isOpen && (
        <div className={`ai-chatbot-card ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="ai-chatbot-header">
            <div className="header-info">
              <div className="bot-avatar">
                <Bot size={20} />
                <span className="avatar-pulse" />
              </div>
              <div>
                <h4 className="header-title">{tCopilot.headerTitle}</h4>
                <p className="header-subtitle">{tCopilot.headerSubtitle}</p>
              </div>
            </div>

            <div className="header-actions" ref={langRef}>
              {/* Dedicated Chatbot Language Selector Icon & Dropdown */}
              <div className="copilot-lang-chooser">
                <button 
                  className={`header-btn lang-picker-btn ${langMenuOpen ? 'active' : ''}`}
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  title="Choose Spoken Language for Speech Recognition"
                >
                  <Globe size={15} />
                  <span className="lang-tag">{language.toUpperCase()}</span>
                </button>

                {langMenuOpen && (
                  <div className="copilot-lang-dropdown">
                    <div className="dropdown-header">Choose Voice & Chat Language</div>
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        className={`copilot-lang-opt ${language === lang.code ? 'selected' : ''}`}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLangMenuOpen(false);
                        }}
                      >
                        <span className="lang-native">{lang.nativeName}</span>
                        <span className="lang-speech-code">({BROWSER_SPEECH_LANGS[lang.code]?.code})</span>
                        {language === lang.code && <Check size={14} className="check-icon" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                className="header-btn" 
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2Icon size={16} />
              </button>
              <button 
                className="header-btn close-btn" 
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Voice Status Alert */}
              {voiceNotice && (
                <div className="copilot-voice-alert">
                  <Volume2 size={14} className="pulse-icon" />
                  <span>{voiceNotice}</span>
                </div>
              )}

              {/* Chat Messages */}
              <div className="ai-chatbot-messages">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`chat-bubble-wrap ${msg.sender === 'user' ? 'user-bubble-wrap' : 'bot-bubble-wrap'}`}
                  >
                    <div className="bubble-icon">
                      {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className="bubble-content">
                      <div className="bubble-text">{msg.text}</div>
                      
                      {/* Direct Navigation Action Buttons */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="copilot-actions-group">
                          {msg.actions.map((act, idx) => (
                            <button
                              key={idx}
                              className="copilot-action-btn"
                              onClick={() => handleActionClick(act)}
                            >
                              {act.label}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <span className="bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="chat-bubble-wrap bot-bubble-wrap">
                    <div className="bubble-icon"><Bot size={14} /></div>
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="ai-chatbot-suggestions">
                {tCopilot.prompts.map((p, idx) => (
                  <button 
                    key={idx} 
                    className="suggestion-chip"
                    onClick={() => handleSend(p.text)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Input Bar with Voice Input & Language Indicator */}
              <div className="ai-chatbot-input-bar">
                <button
                  className={`mic-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  title={`Speak in ${currentLangObj.label}`}
                  type="button"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <div className="input-field-wrap">
                  <input
                    type="text"
                    placeholder={isListening ? `Listening in ${currentLangObj.label}...` : `Ask THULIR (${language.toUpperCase()})...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <span className="input-lang-badge">{language.toUpperCase()}</span>
                </div>
                
                <button 
                  className="send-btn"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  type="button"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Minimize2Icon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
    </svg>
  );
}
