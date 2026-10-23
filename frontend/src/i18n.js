const LANGUAGE_STORAGE_KEY = "ner-logistics-language";

const COPY = {
  en: {
    language: "Language",
    preparingQueue: "Preparing offline queue…",
    syncingReports: "Syncing queued reports…",
    driverTitle: "Field report",
    driverSubtitle: "Share a road condition update with dispatch.",
    online: "ONLINE",
    offline: "OFFLINE — reports will queue on this device",
    backendUnavailable: "INTERNET ONLINE · API UNREACHABLE — reports will queue",
    checkingBackend: "CHECKING BACKEND CONNECTION…",
    lastSyncError: "Last sync error: {error}",
    photoQueuedError: "Report sent; {count} photo(s) are queued. Upload error: {error}",
    syncing: "SYNCING QUEUED REPORTS",
    simulateOffline: "Simulate: Go Offline",
    backOnline: "Back Online and Sync Queue",
    assignedRoute: "Assigned route: Guwahati → Tawang",
    loadingRoute: "Loading route…",
    distance: "Distance",
    estimatedTime: "Estimated time",
    riskExposure: "Risk exposure",
    reportIncident: "Report an incident",
    location: "Location",
    pinLocation: "Pin the report location",
    tapMap: "(tap the map)",
    customMapPoint: "Custom map point",
    selected: "Selected",
    scopeNote: "Demo network coverage is Guwahati–Tawang. Reports elsewhere can be submitted, but may not affect this corridor’s routes.",
    type: "Type",
    severity: "Severity",
    description: "Description",
    addPhotos: "Attach photos",
    photoHelp: "Up to 3 JPEG, PNG, or WebP images · 5 MiB each",
    selectedPhotos: "Selected photos",
    queuedPhotos: "{count} photo(s) waiting",
    photoLimitError: "Choose up to 3 JPEG, PNG, or WebP photos, each 5 MiB or smaller.",
    photoQueued: "Report sent; {count} photo(s) remain queued for upload.",
    storageFailed: "Could not save this report on this device. Check browser storage and try again.",
    sendReport: "Send report",
    saveOffline: "Save report offline",
    reportSaved: "Report saved on this device and queued for sync.",
    reportSent: "Report sent — awaiting dispatcher review.",
    connectionFailed: "Connection failed; report saved on this device for retry.",
    synced: "Synced {count} queued report(s) to dispatch.",
    partiallySynced: "Synced {sent}; {remaining} report(s) remain queued for retry.",
    stillOffline: "Your device is still offline. Reports remain saved on this device.",
    queueTitle: "Queued (not yet sent)",
    retryQueue: "Retry queued reports",
    landslide: "Landslide",
    flood: "Flood",
    roadDamage: "Road damage",
    roadBlockage: "Road blockage",
    other: "Other",
    minor: "Minor",
    moderate: "Moderate",
    severe: "Severe",
    pendingStatus: "Pending",
    approvedStatus: "Approved",
    rejectedStatus: "Rejected",
    situationAlerts: "Situation alerts",
    noAlerts: "No demo alert rules triggered",
    noAlertsHelp: "Severe reports, mapped risk, or forecast thresholds may appear here.",
    recentReports: "Recent reports",
    noReports: "No field reports yet",
    reportsHelp: "New submissions will appear here for review.",
    blockageAlert: "Blockage report · #{id}",
    reviewedBlockageDetail: "Dispatcher-reviewed field report · confirm current conditions locally.",
    severeReportAlert: "Severe report needs review · #{id}",
    waitingReview: "{type} · awaiting dispatcher review.",
    highRiskAlert: "High heuristic risk · {name}",
    highRiskDetail: "Prototype risk score {score} / 1.00 · not a closure confirmation.",
    heavyRainAlert: "Heavy rain forecast · {name}",
    heavyRainDetail: "{amount} mm / 6h · {chance}% chance. Demo thresholds only; verify with official warnings.",
    reviewed: "REVIEWED",
    review: "REVIEW",
    heuristic: "HEURISTIC",
    forecast: "FORECAST",
    pendingReviewCount: "{count} pending dispatcher review · no external notifications",
    autoTenSeconds: "Auto · 10s",
    demoAlertLabel: "RULE-BASED · DEMO ONLY",
    nearGuwahati: "Near Guwahati",
    tengaValley: "Tenga Valley",
    nechiphuPass: "Nechiphu Pass",
    selaPass: "Sela Pass",
    dirangTawangStretch: "Dirang–Tawang stretch",
  },
  hi: {
    language: "भाषा",
    preparingQueue: "ऑफ़लाइन कतार तैयार हो रही है…",
    syncingReports: "कतारबद्ध रिपोर्ट सिंक हो रही हैं…",
    driverTitle: "फ़ील्ड रिपोर्ट",
    driverSubtitle: "सड़क की स्थिति की जानकारी डिस्पैच टीम को भेजें।",
    online: "ऑनलाइन",
    offline: "ऑफ़लाइन — रिपोर्ट इस डिवाइस पर कतार में रहेंगी",
    backendUnavailable: "इंटरनेट ऑनलाइन · API उपलब्ध नहीं — रिपोर्ट कतार में रहेंगी",
    checkingBackend: "बैकएंड कनेक्शन जाँचा जा रहा है…",
    lastSyncError: "सिंक में त्रुटि: {error}",
    photoQueuedError: "रिपोर्ट भेजी गई; {count} फ़ोटो कतार में हैं। अपलोड त्रुटि: {error}",
    syncing: "कतारबद्ध रिपोर्ट सिंक हो रही हैं",
    simulateOffline: "डेमो: ऑफ़लाइन करें",
    backOnline: "ऑनलाइन होकर रिपोर्ट सिंक करें",
    assignedRoute: "निर्धारित मार्ग: गुवाहाटी → तवांग",
    loadingRoute: "मार्ग लोड हो रहा है…",
    distance: "दूरी",
    estimatedTime: "अनुमानित समय",
    riskExposure: "जोखिम स्तर",
    reportIncident: "घटना की रिपोर्ट करें",
    location: "स्थान",
    pinLocation: "रिपोर्ट का स्थान चुनें",
    tapMap: "(मानचित्र पर टैप करें)",
    customMapPoint: "मानचित्र पर चुना गया स्थान",
    selected: "चयनित",
    scopeNote: "डेमो नेटवर्क गुवाहाटी–तवांग मार्ग तक सीमित है। अन्य स्थानों की रिपोर्ट भेजी जा सकती है, लेकिन वे इस मार्ग की गणना को प्रभावित न करें।",
    type: "घटना का प्रकार",
    severity: "गंभीरता",
    description: "विवरण",
    addPhotos: "फ़ोटो जोड़ें",
    photoHelp: "अधिकतम 3 JPEG, PNG या WebP चित्र · प्रत्येक 5 MiB तक",
    selectedPhotos: "चयनित फ़ोटो",
    queuedPhotos: "{count} फ़ोटो प्रतीक्षा में",
    photoLimitError: "अधिकतम 3 JPEG, PNG या WebP फ़ोटो चुनें; प्रत्येक 5 MiB या उससे कम हो।",
    photoQueued: "रिपोर्ट भेजी गई; {count} फ़ोटो अपलोड के लिए कतार में हैं।",
    storageFailed: "इस डिवाइस पर रिपोर्ट सहेजी नहीं जा सकी। ब्राउज़र स्टोरेज जाँचकर फिर कोशिश करें।",
    sendReport: "रिपोर्ट भेजें",
    saveOffline: "रिपोर्ट ऑफ़लाइन सहेजें",
    reportSaved: "रिपोर्ट इस डिवाइस पर सहेजी गई है और सिंक होने की प्रतीक्षा में है।",
    reportSent: "रिपोर्ट भेज दी गई है — डिस्पैचर की समीक्षा बाकी है।",
    connectionFailed: "कनेक्शन विफल हुआ; रिपोर्ट इस डिवाइस पर दोबारा भेजने के लिए सहेजी गई है।",
    synced: "{count} कतारबद्ध रिपोर्ट डिस्पैच टीम को भेजी गईं।",
    partiallySynced: "{sent} रिपोर्ट भेजी गईं; {remaining} रिपोर्ट दोबारा भेजने के लिए कतार में हैं।",
    stillOffline: "डिवाइस अभी भी ऑफ़लाइन है। रिपोर्ट इस डिवाइस पर सहेजी रहेंगी।",
    queueTitle: "कतार में (अभी नहीं भेजी गईं)",
    retryQueue: "कतारबद्ध रिपोर्ट फिर भेजें",
    landslide: "भूस्खलन",
    flood: "बाढ़",
    roadDamage: "सड़क क्षति",
    roadBlockage: "सड़क अवरोध",
    other: "अन्य",
    minor: "कम",
    moderate: "मध्यम",
    severe: "गंभीर",
    pendingStatus: "लंबित",
    approvedStatus: "स्वीकृत",
    rejectedStatus: "अस्वीकृत",
    situationAlerts: "स्थिति अलर्ट",
    noAlerts: "डेमो के कोई अलर्ट नियम सक्रिय नहीं हैं",
    noAlertsHelp: "गंभीर रिपोर्ट, मानचित्रित जोखिम या वर्षा पूर्वानुमान अलर्ट यहाँ दिख सकते हैं।",
    recentReports: "हाल की रिपोर्टें",
    noReports: "अभी कोई फ़ील्ड रिपोर्ट नहीं है",
    reportsHelp: "नई रिपोर्टें समीक्षा के लिए यहाँ दिखेंगी।",
    blockageAlert: "सड़क अवरोध रिपोर्ट · #{id}",
    reviewedBlockageDetail: "डिस्पैचर द्वारा समीक्षा की गई रिपोर्ट · स्थानीय स्तर पर वर्तमान स्थिति की पुष्टि करें।",
    severeReportAlert: "गंभीर रिपोर्ट की समीक्षा ज़रूरी · #{id}",
    waitingReview: "{type} · डिस्पैचर की समीक्षा बाकी है।",
    highRiskAlert: "अनुमानित जोखिम अधिक · {name}",
    highRiskDetail: "प्रोटोटाइप जोखिम स्कोर {score} / 1.00 · सड़क बंद होने की पुष्टि नहीं।",
    heavyRainAlert: "भारी वर्षा का पूर्वानुमान · {name}",
    heavyRainDetail: "6 घंटे में {amount} मिमी · {chance}% संभावना। ये केवल डेमो सीमाएँ हैं; आधिकारिक चेतावनी जाँचें।",
    reviewed: "समीक्षित",
    review: "समीक्षा करें",
    heuristic: "अनुमानित",
    forecast: "पूर्वानुमान",
    pendingReviewCount: "{count} रिपोर्ट डिस्पैचर समीक्षा की प्रतीक्षा में · बाहरी सूचना सेवा नहीं",
    autoTenSeconds: "स्वतः · 10 सेकंड",
    demoAlertLabel: "नियम-आधारित · केवल डेमो",
    nearGuwahati: "गुवाहाटी के पास",
    tengaValley: "तेंगा घाटी",
    nechiphuPass: "नेचिफू दर्रा",
    selaPass: "सेला दर्रा",
    dirangTawangStretch: "दिरांग–तवांग मार्ग",
  },
};

export function getSavedLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function saveLanguage(language) {
  const safeLanguage = language === "hi" ? "hi" : "en";
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, safeLanguage);
  } catch {
    // Language still changes for this view if browser storage is unavailable.
  }
  return safeLanguage;
}

export function t(language, key, values = {}) {
  const template = COPY[language]?.[key] ?? COPY.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

export function incidentTypeText(language, type) {
  const keys = {
    landslide: "landslide",
    flood: "flood",
    road_damage: "roadDamage",
    road_blockage: "roadBlockage",
    other: "other",
  };
  return t(language, keys[type] ?? "other");
}

export function incidentStatusText(language, status) {
  const key = { pending: "pendingStatus", approved: "approvedStatus", rejected: "rejectedStatus" }[status];
  return key ? t(language, key) : status;
}

export function locationText(language, location) {
  const key = {
    "Near Guwahati": "nearGuwahati",
    "Tenga Valley": "tengaValley",
    "Nechiphu Pass": "nechiphuPass",
    "Sela Pass": "selaPass",
    "Dirang-Tawang stretch": "dirangTawangStretch",
    "Custom map point": "customMapPoint",
  }[location];
  return key ? t(language, key) : location;
}
