import { describe, it, expect } from 'vitest';
import { parseReviewMode, presentationFor, MATURE_STABILITY_DAYS } from './reviewMode';
import type { Caps, ReviewMode } from '$lib/gamification/todayPlan';

describe('parseReviewMode', () => {
	it.each([null, '', 'EASY', '<script>', 'Read'])('falls back to read for %j', (raw) => {
		expect(parseReviewMode(raw)).toBe('read');
	});
	it.each(['read', 'listen', 'type', 'speak'] as const)('passes %s through', (mode) => {
		expect(parseReviewMode(mode)).toBe(mode);
	});
});

describe('presentationFor', () => {
	const young = { stability: 5 };
	const mature = { stability: MATURE_STABILITY_DAYS };
	const both = { tts: true, asr: true };
	const none = { tts: false, asr: false };
	type Row = [string, { stability: number }, ReviewMode, boolean, Caps, boolean, string];
	const rows: Row[] = [
		['no prompt, young -> flip', young, 'read', false, both, false, 'flip'],
		['no prompt, young, type -> flip', young, 'type', false, both, false, 'flip'],
		['no prompt, mature -> type', mature, 'read', false, both, false, 'type'],
		['mature read, speaking+asr -> speak', mature, 'read', true, both, true, 'speak'],
		['mature listen, speaking+asr -> speak', mature, 'listen', true, both, true, 'speak'],
		['mature read, speaking, no asr -> type', mature, 'read', true, none, true, 'type'],
		['mature listen, not speaking -> type', mature, 'listen', true, both, false, 'type'],
		['listen without tts -> read', young, 'listen', true, none, false, 'read'],
		['listen with tts -> listen', young, 'listen', true, both, false, 'listen'],
		['young read -> read', young, 'read', true, both, false, 'read'],
		['young type -> type', young, 'type', true, none, false, 'type'],
		['mature type -> type', mature, 'type', true, none, false, 'type'],
		[
			'mature speak, no asr -> speak (Task 7 owns the fallback)',
			mature,
			'speak',
			true,
			none,
			true,
			'speak'
		],
		['young speak -> speak', young, 'speak', true, both, true, 'speak']
	];
	it.each(rows)('%s', (_n, card, mode, hasPrompt, caps, speaking, expected) => {
		expect(presentationFor(card, mode, hasPrompt, caps, speaking)).toBe(expected);
	});
});
