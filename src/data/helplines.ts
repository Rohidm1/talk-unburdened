/** Official crisis lines shown in the safety menu, SOS screen and help page. */
export type Helpline = { country: string; flag: string; name: string; contact: string; tel: string; sms?: string; note?: string };

export const HELPLINES: Helpline[] = [
  { country: "Netherlands", flag: "🇳🇱", name: "113 Zelfmoordpreventie", contact: "Call 113 or free 0800-0113", tel: "113", note: "Also chat at 113.nl" },
  { country: "Belgium", flag: "🇧🇪", name: "Centrum ter Preventie van Zelfmoord", contact: "Call 1813", tel: "1813" },
  { country: "Greece", flag: "🇬🇷", name: "Suicide Prevention Helpline (Klimaka)", contact: "Call 1018", tel: "1018" },
  { country: "United States", flag: "🇺🇸", name: "988 Suicide & Crisis Lifeline", contact: "Call or text 988", tel: "988", sms: "988" },
  { country: "Germany", flag: "🇩🇪", name: "TelefonSeelsorge", contact: "Call 0800 111 0 111 or 0800 111 0 222", tel: "08001110111" },
];

export const EMERGENCY_NOTE = "In immediate danger, call 112 (Europe) or 911 (US).";
