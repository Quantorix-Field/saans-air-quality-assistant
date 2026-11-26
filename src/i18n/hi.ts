import type { MessageKey } from './index.js';

/** Hindi dictionary – must have exactly the same keys as the English one. */
export const hi: Record<MessageKey, string> = {
  'prefs.language': 'भाषा / Language',
  'error.network': 'नेटवर्क त्रुटि — अपना कनेक्शन जाँचें और पुनः प्रयास करें।',
  'error.rateLimited': 'बहुत अधिक अनुरोध — कृपया कुछ समय प्रतीक्षा करें।',
  'error.server': 'सर्वर त्रुटि — कृपया बाद में पुनः प्रयास करें।',
  'error.invalid': 'सर्वर से अप्रत्याशित प्रतिक्रिया प्राप्त हुई।',
  'status.offline': 'आप ऑफ़लाइन हैं। पिछला ज्ञात डेटा दिखाया जा रहा है।',
  'status.stale': 'डेटा पुराना हो सकता है (अंतिम अपडेट {hours} घंटे पहले)।',
  'status.loading': 'लोड हो रहा है…',
  'status.retry': 'पुनः प्रयास करें',
};
