import type { BandKey } from './bands.js';
import type { Action, RuleCategory, RuleId } from './rules.js';
import type { Language } from './types.js';

export interface RuleText {
  title: string;
  why: string;
}

export const BAND_LABELS: Record<Language, Record<BandKey, string>> = {
  en: {
    good: 'Good',
    satisfactory: 'Satisfactory',
    moderate: 'Moderate',
    poor: 'Poor',
    veryPoor: 'Very Poor',
    severe: 'Severe',
  },
  hi: {
    good: 'अच्छा',
    satisfactory: 'संतोषजनक',
    moderate: 'मध्यम',
    poor: 'खराब',
    veryPoor: 'बहुत खराब',
    severe: 'गंभीर',
  },
};

/** Placeholders: {band} {index} {tier} {from} {to} {hours}. */
export const RULE_TEXT: Record<Language, Record<RuleId, RuleText>> = {
  en: {
    'red-flags': {
      title: 'Know the warning signs',
      why: 'Chest pain, severe breathlessness or wheezing that does not settle need urgent medical care. Do not wait for the air to improve.',
    },
    'stale-data': {
      title: 'This data is {hours} hours old',
      why: 'The air may have changed since then. Refresh before you decide.',
    },
    'avoid-heavy-exercise': {
      title: 'Skip hard outdoor exercise today',
      why: 'Air is {band} (index {index}) and your caution level is {tier} of 5. Hard exercise makes you breathe in far more polluted air, so do light movement indoors instead.',
    },
    'child-indoor-play': {
      title: "Keep children's play indoors today",
      why: 'Children breathe faster and their lungs are still developing. At your caution level of {tier} of 5, indoor play is the safer choice.',
    },
    'n95-wear': {
      title: 'Wear your N95 when you go out',
      why: 'With {band} air, a snug N95 (or FFP2) blocks most fine particles. Cloth masks and scarves filter very little.',
    },
    'n95-get': {
      title: 'Keep an N95 mask for outings',
      why: 'With {band} air, cloth masks and scarves filter very little fine dust. A snug-fitting N95 (or FFP2) is the practical choice.',
    },
    'purifier-on': {
      title: 'Run your air purifier now',
      why: 'Indoor air also fills with fine dust when outdoor air is {band}. Keep the purifier on, doors closed and the filter clean.',
    },
    'inhaler-plan': {
      title: 'Keep your reliever inhaler handy',
      why: '{band} air can trigger asthma and COPD symptoms. Follow your doctor\'s action plan and carry your reliever with you.',
    },
    'closed-windows': {
      title: 'Keep windows and doors closed',
      why: 'With {band} air outside, closing up keeps most fine dust out. Open only briefly when the air is cleanest.',
    },
    'pregnancy-care': {
      title: 'Limit time outdoors, use an N95 if you must go',
      why: 'Poor air is best avoided during pregnancy. Keep outings short and talk to your doctor if you are worried.',
    },
    'heart-care': {
      title: 'Avoid exertion outdoors',
      why: 'Fine particles can strain the heart. With {band} air, rest more and follow your doctor\'s advice.',
    },
    'go-out-today': {
      title: 'Best time outside today: {from} to {to}',
      why: 'This is the cleanest stretch in your preferred hours. Going then means breathing in less than at other times.',
    },
    'go-out-tomorrow': {
      title: 'Best time outside: tomorrow {from} to {to}',
      why: 'The rest of today is dirtier than tomorrow in your preferred hours. Plan outdoor activity for then.',
    },
    'cyclist-route': {
      title: 'Choose quieter lanes and avoid rush hour',
      why: 'Walking and cycling make you breathe deeper, so busy roads in {band} air raise your dose. Side streets, parks and off-peak hours help.',
    },
    'senior-care': {
      title: 'Keep outings short, ask family to run errands',
      why: 'Older adults are more sensitive to fine particles. Tell someone if you feel unwell.',
    },
    'diy-filter-box': {
      title: 'Build a simple filter box (Corsi-Rosenthal)',
      why: 'No purifier at home? A box fan with four MERV-13 filters taped into a cube cleans room air cheaply. It helps most in the room where you sleep.',
    },
    'commute-switch': {
      title: 'Try metro or bus for some trips',
      why: 'Fewer private vehicles means less pollution on your street. See the Greener choices page for what your switch saves.',
    },
    'no-burning': {
      title: 'Do not burn waste, leaves or incense today',
      why: 'With {band} air, extra smoke adds to what everyone breathes. Report open burning to your local authority.',
    },
    'reduce-exertion': {
      title: 'Keep outdoor activity light',
      why: 'At your caution level of {tier} of 5, prefer easy walks over runs or hard rides, and keep them short.',
    },
    'ventilate-cleanest': {
      title: 'Air the home between {from} and {to}',
      why: 'Outdoor air is fairly clean and this is its cleanest hour today. About 10 minutes of open windows clears cooking smells and stale air.',
    },
    'trend-worsening': {
      title: 'Do outdoor errands soon',
      why: 'Fine particles are expected to rise over the next hours.',
    },
    'ozone-morning': {
      title: 'Exercise early in the morning',
      why: 'Ozone is the main pollutant right now and it peaks in the afternoon sun. Mornings are usually lower.',
    },
    'kitchen-exhaust': {
      title: 'Use the kitchen exhaust while cooking',
      why: 'Cooking is a big source of indoor fine particles. Run the chimney or exhaust fan during cooking and for 10 minutes after.',
    },
    'wet-mop': {
      title: 'Mop with a damp cloth instead of sweeping',
      why: 'Dry sweeping lifts settled dust back into the air you breathe.',
    },
    'engine-off': {
      title: 'Switch the engine off when waiting',
      why: 'Idling vehicles release fine particles and nitrogen oxides right where people stand.',
    },
    'trend-improving': {
      title: 'Air should improve: delay outdoor tasks',
      why: 'Fine particles are expected to fall over the next hours. If you can wait, you will breathe less.',
    },
    'partial-data': {
      title: 'Some pollutant data is missing',
      why: 'The index may be understated because fewer than three pollutants were available.',
    },
    'all-clear': {
      title: 'Air is fine for you today',
      why: 'With {band} air (index {index}), outdoor plans are low risk. Enjoy a walk or a ride.',
    },
    'myth-plants': {
      title: 'Myth: house plants clean the air',
      why: 'At home scale plants add very little. Filtering, sealing gaps and airing at the right time matter far more.',
    },
  },
  hi: {
    'red-flags': {
      title: 'चेतावनी के संकेत जानें',
      why: 'सीने में दर्द, बहुत तेज़ साँस फूलना या घरघराहट जो न रुके, तो तुरंत डॉक्टर को दिखाएँ। हवा सुधरने का इंतज़ार न करें।',
    },
    'stale-data': {
      title: 'यह जानकारी {hours} घंटे पुरानी है',
      why: 'तब से हवा बदल चुकी हो सकती है। फ़ैसला लेने से पहले रिफ़्रेश करें।',
    },
    'avoid-heavy-exercise': {
      title: 'आज बाहर कठिन व्यायाम न करें',
      why: 'हवा {band} है (सूचकांक {index}) और आपका सावधानी स्तर 5 में से {tier} है। कठिन व्यायाम में आप बहुत ज़्यादा प्रदूषित हवा लेते हैं, इसलिए घर के अंदर हल्की गतिविधि करें।',
    },
    'child-indoor-play': {
      title: 'आज बच्चों का खेल घर के अंदर रखें',
      why: 'बच्चे तेज़ साँस लेते हैं और उनके फेफड़े अभी विकसित हो रहे हैं। 5 में से {tier} के सावधानी स्तर पर घर के अंदर खेलना ज़्यादा सुरक्षित है।',
    },
    'n95-wear': {
      title: 'बाहर जाते समय अपना N95 पहनें',
      why: '{band} हवा में कसकर पहना गया N95 (या FFP2) ज़्यादातर बारीक कण रोकता है। कपड़े के मास्क और दुपट्टे बहुत कम रोकते हैं।',
    },
    'n95-get': {
      title: 'बाहर निकलने के लिए N95 मास्क रखें',
      why: '{band} हवा में कपड़े के मास्क और दुपट्टे बारीक धूल को बहुत कम रोकते हैं। कसकर बैठने वाला N95 (या FFP2) सबसे व्यावहारिक विकल्प है।',
    },
    'purifier-on': {
      title: 'अभी अपना एयर प्यूरीफ़ायर चलाएँ',
      why: 'बाहर की हवा {band} होने पर घर के अंदर भी बारीक धूल भर जाती है। प्यूरीफ़ायर चालू रखें, दरवाज़े बंद रखें और फ़िल्टर साफ़ रखें।',
    },
    'inhaler-plan': {
      title: 'अपना राहत देने वाला इनहेलर पास रखें',
      why: '{band} हवा से अस्थमा और सीओपीडी के लक्षण बढ़ सकते हैं। अपने डॉक्टर की बताई योजना का पालन करें और इनहेलर साथ रखें।',
    },
    'closed-windows': {
      title: 'खिड़कियाँ और दरवाज़े बंद रखें',
      why: 'बाहर की हवा {band} होने पर बंद रखने से ज़्यादातर बारीक धूल बाहर रहती है। हवा सबसे साफ़ होने पर ही थोड़ी देर के लिए खोलें।',
    },
    'pregnancy-care': {
      title: 'बाहर कम समय बिताएँ, जाना पड़े तो N95 पहनें',
      why: 'गर्भावस्था में खराब हवा से बचना बेहतर है। बाहर का काम छोटा रखें और चिंता हो तो डॉक्टर से बात करें।',
    },
    'heart-care': {
      title: 'बाहर मेहनत वाले काम से बचें',
      why: 'बारीक कण दिल पर बोझ डाल सकते हैं। {band} हवा में ज़्यादा आराम करें और डॉक्टर की सलाह मानें।',
    },
    'go-out-today': {
      title: 'आज बाहर जाने का सबसे अच्छा समय: {from} से {to}',
      why: 'आपके पसंदीदा घंटों में यह सबसे साफ़ समय है। तब निकलने पर दूसरे समय की तुलना में कम प्रदूषण साँस में जाएगा।',
    },
    'go-out-tomorrow': {
      title: 'बाहर जाने का सबसे अच्छा समय: कल {from} से {to}',
      why: 'आपके पसंदीदा घंटों में आज का बाकी समय कल से ज़्यादा प्रदूषित है। बाहर की गतिविधि तभी रखें।',
    },
    'cyclist-route': {
      title: 'शांत गलियाँ चुनें और भीड़ के समय से बचें',
      why: 'पैदल चलने और साइकिल चलाने में साँस गहरी होती है, इसलिए {band} हवा में व्यस्त सड़कों पर ज़्यादा प्रदूषण अंदर जाता है। छोटी गलियाँ, पार्क और कम भीड़ के घंटे बेहतर हैं।',
    },
    'senior-care': {
      title: 'बाहर का काम छोटा रखें, परिवार से मदद लें',
      why: 'बुज़ुर्ग बारीक कणों के प्रति ज़्यादा संवेदनशील होते हैं। तबीयत ठीक न लगे तो किसी को बताएँ।',
    },
    'diy-filter-box': {
      title: 'एक सरल फ़िल्टर बॉक्स बनाएँ (कॉर्सी-रोज़ेन्थल)',
      why: 'घर में प्यूरीफ़ायर नहीं है? चार MERV-13 फ़िल्टर को घन की तरह चिपकाकर उस पर बॉक्स फ़ैन लगाने से कमरे की हवा सस्ते में साफ़ होती है। यह सोने के कमरे में सबसे ज़्यादा काम आता है।',
    },
    'commute-switch': {
      title: 'कुछ यात्राओं के लिए मेट्रो या बस आज़माएँ',
      why: 'निजी वाहन कम होने से आपकी सड़क पर प्रदूषण कम होता है। आपकी बचत "हरित विकल्प" पेज पर देखें।',
    },
    'no-burning': {
      title: 'आज कचरा, पत्ते या धूप-अगरबत्ती न जलाएँ',
      why: '{band} हवा में अतिरिक्त धुआँ सबकी साँस में प्रदूषण बढ़ाता है। खुले में जलाने की सूचना स्थानीय प्रशासन को दें।',
    },
    'reduce-exertion': {
      title: 'बाहर की गतिविधि हल्की रखें',
      why: '5 में से {tier} के सावधानी स्तर पर दौड़ने या तेज़ साइकिल चलाने की जगह आसान सैर करें, और उसे छोटा रखें।',
    },
    'ventilate-cleanest': {
      title: '{from} से {to} के बीच घर में हवा आने दें',
      why: 'बाहर की हवा काफ़ी साफ़ है और आज यही सबसे साफ़ घंटा है। लगभग 10 मिनट खिड़कियाँ खोलने से खाना पकाने की गंध और बासी हवा निकल जाती है।',
    },
    'trend-worsening': {
      title: 'बाहर के काम जल्दी निपटा लें',
      why: 'अगले कुछ घंटों में बारीक कण बढ़ने की संभावना है।',
    },
    'ozone-morning': {
      title: 'सुबह जल्दी व्यायाम करें',
      why: 'अभी ओज़ोन मुख्य प्रदूषक है और दोपहर की धूप में यह सबसे ज़्यादा होता है। सुबह आमतौर पर कम रहता है।',
    },
    'kitchen-exhaust': {
      title: 'खाना पकाते समय रसोई का एग्ज़ॉस्ट चलाएँ',
      why: 'खाना पकाना घर के अंदर बारीक कणों का बड़ा स्रोत है। पकाते समय और उसके बाद 10 मिनट तक चिमनी या एग्ज़ॉस्ट फ़ैन चलाएँ।',
    },
    'wet-mop': {
      title: 'झाड़ू की जगह गीले कपड़े से पोंछा लगाएँ',
      why: 'सूखी झाड़ू से बैठी हुई धूल फिर से उस हवा में उड़ जाती है जिसमें आप साँस लेते हैं।',
    },
    'engine-off': {
      title: 'रुकते समय इंजन बंद रखें',
      why: 'खड़े वाहन का चालू इंजन ठीक वहीं बारीक कण और नाइट्रोजन ऑक्साइड छोड़ता है जहाँ लोग खड़े होते हैं।',
    },
    'trend-improving': {
      title: 'हवा सुधरने वाली है: बाहर के काम टालें',
      why: 'अगले कुछ घंटों में बारीक कण कम होने की संभावना है। रुक सकें तो कम प्रदूषण साँस में जाएगा।',
    },
    'partial-data': {
      title: 'कुछ प्रदूषकों का डेटा उपलब्ध नहीं है',
      why: 'तीन से कम प्रदूषक उपलब्ध थे, इसलिए सूचकांक असल से कम दिख सकता है।',
    },
    'all-clear': {
      title: 'आज आपके लिए हवा ठीक है',
      why: '{band} हवा (सूचकांक {index}) में बाहर की योजनाओं में कम जोखिम है। सैर या साइकिल का आनंद लें।',
    },
    'myth-plants': {
      title: 'भ्रम: घर के पौधे हवा साफ़ करते हैं',
      why: 'घर के पैमाने पर पौधे बहुत कम असर डालते हैं। फ़िल्टर, दरारें बंद करना और सही समय पर हवा आने देना कहीं ज़्यादा काम आता है।',
    },
  },
};

export interface RenderedAction {
  id: RuleId;
  category: RuleCategory;
  title: string;
  why: string;
}

function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/** Turns an action into text in the chosen language. */
export function renderAction(
  action: Action,
  language: Language,
  naqi: { index: number; band: BandKey },
): RenderedAction {
  const values = {
    ...action.params,
    band: BAND_LABELS[language][naqi.band],
    index: naqi.index,
  };
  const text = RULE_TEXT[language][action.id];
  return {
    id: action.id,
    category: action.category,
    title: fill(text.title, values),
    why: fill(text.why, values),
  };
}
