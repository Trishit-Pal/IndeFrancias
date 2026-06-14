/**
 * Seeds Paraglide message files for Indian UI locales from en.json + per-locale overrides.
 * Run: npx tsx scripts/seed-ui-locales.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const en = JSON.parse(readFileSync(resolve('messages/en.json'), 'utf8')) as Record<string, string>;

const OVERRIDES: Record<string, Partial<Record<string, string>>> = {
	bn: {
		nav_learn: 'শিখুন',
		nav_review: 'পুনরালোচনা',
		nav_progress: 'অগ্রগতি',
		nav_settings: 'সেটিংস',
		settings_title: 'সেটিংস',
		settings_my_learning: 'আমার শেখা',
		onb_native_title: 'আপনার মাতৃভাষা কী?',
		onb_goal_title: 'আপনার লক্ষ্য কী?',
		onb_ready_title: 'সব প্রস্তুত!'
	},
	ta: {
		nav_learn: 'கற்றுக்கொள்',
		nav_review: 'மறுபார்வை',
		nav_progress: 'முன்னேற்றம்',
		nav_settings: 'அமைப்புகள்',
		settings_title: 'அமைப்புகள்',
		settings_my_learning: 'என் கற்றல்',
		onb_native_title: 'உங்கள் தாய்மொழி என்ன?',
		onb_goal_title: 'உங்கள் இலக்கு என்ன?',
		onb_ready_title: 'தயார்!'
	},
	te: {
		nav_learn: 'నేర్చుకోండి',
		nav_review: 'సమీక్ష',
		nav_progress: 'పురోగతి',
		nav_settings: 'సెట్టింగ్‌లు',
		settings_title: 'సెట్టింగ్‌లు',
		settings_my_learning: 'నా అభ్యాసం',
		onb_native_title: 'మీ మాతృభాష ఏమిటి?',
		onb_goal_title: 'మీ లక్ష్యం ఏమిటి?',
		onb_ready_title: 'సిద్ధం!'
	},
	kn: {
		nav_learn: 'ಕಲಿಯಿರಿ',
		nav_review: 'ಪುನರಾವಲೋಕನ',
		nav_progress: 'ಪ್ರಗತಿ',
		nav_settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
		settings_title: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
		settings_my_learning: 'ನನ್ನ ಕಲಿಕೆ',
		onb_native_title: 'ನಿಮ್ಮ ಮಾತೃಭಾಷೆ ಯಾವುದು?',
		onb_goal_title: 'ನಿಮ್ಮ ಗುರಿ ಯಾವುದು?',
		onb_ready_title: 'ಸಿದ್ಧ!'
	},
	mr: {
		nav_learn: 'शिका',
		nav_review: 'पुनरावलोकन',
		nav_progress: 'प्रगती',
		nav_settings: 'सेटिंग्ज',
		settings_title: 'सेटिंग्ज',
		settings_my_learning: 'माझे शिक्षण',
		onb_native_title: 'तुमची मातृभाषा कोणती?',
		onb_goal_title: 'तुमचे ध्येय काय?',
		onb_ready_title: 'सज्ज!'
	},
	gu: {
		nav_learn: 'શીખો',
		nav_review: 'સમીક્ષા',
		nav_progress: 'પ્રગતિ',
		nav_settings: 'સેટિંગ્સ',
		settings_title: 'સેટિંગ્સ',
		settings_my_learning: 'મારું શિક્ષણ',
		onb_native_title: 'તમારી માતૃભાષા શું છે?',
		onb_goal_title: 'તમારું લક્ષ્ય શું છે?',
		onb_ready_title: 'તૈયાર!'
	},
	pa: {
		nav_learn: 'ਸਿੱਖੋ',
		nav_review: 'ਸਮੀਖਿਆ',
		nav_progress: 'ਤਰੱਕੀ',
		nav_settings: 'ਸੈਟਿੰਗਾਂ',
		settings_title: 'ਸੈਟਿੰਗਾਂ',
		settings_my_learning: 'ਮੇਰੀ ਸਿੱਖਿਆ',
		onb_native_title: 'ਤੁਹਾਡੀ ਮਾਤ-ਭਾਸ਼ਾ ਕੀ ਹੈ?',
		onb_goal_title: 'ਤੁਹਾਡਾ ਟੀਚਾ ਕੀ ਹੈ?',
		onb_ready_title: 'ਤੈਯਾਰ!'
	}
};

for (const locale of Object.keys(OVERRIDES)) {
	const out = { ...en, ...OVERRIDES[locale] };
	writeFileSync(resolve(`messages/${locale}.json`), JSON.stringify(out, null, '\t') + '\n', 'utf8');
	console.log(`Wrote messages/${locale}.json`);
}
