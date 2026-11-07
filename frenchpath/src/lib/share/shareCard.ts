import type { WeeklyRecap } from '$lib/gamification/weeklyRecap';

export interface ShareCardData {
	title: string;
	subtitle: string;
	streak?: number;
	xp?: number;
	milestone?: string;
}

export function buildShareText(data: ShareCardData): string {
	const parts = [data.title, data.subtitle];
	if (data.streak) parts.push(`🔥 ${data.streak}-day streak`);
	if (data.xp) parts.push(`+${data.xp} XP`);
	if (data.milestone) parts.push(data.milestone);
	parts.push('FrenchPath — learn French offline');
	return parts.join(' · ');
}

/** L'Indigo Express brand gradient with a marigold accent bar; keeps white text readable. */
function paintCardBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
	const grad = ctx.createLinearGradient(0, 0, width, height);
	grad.addColorStop(0, '#232044');
	grad.addColorStop(1, '#3d2b5e');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = '#e2a13b';
	ctx.fillRect(0, 0, 8, height);
}

export async function renderShareCardPng(
	data: ShareCardData,
	width = 600,
	height = 340
): Promise<Blob | null> {
	if (typeof document === 'undefined') return null;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	paintCardBackground(ctx, width, height);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 28px system-ui, sans-serif';
	ctx.fillText(data.title, 32, 72);
	ctx.font = '20px system-ui, sans-serif';
	ctx.fillText(data.subtitle, 32, 112);

	let y = 160;
	if (data.streak) {
		ctx.font = '18px system-ui, sans-serif';
		ctx.fillText(`Streak: ${data.streak} days`, 32, y);
		y += 36;
	}
	if (data.xp) {
		ctx.fillText(`XP earned: ${data.xp}`, 32, y);
		y += 36;
	}
	if (data.milestone) {
		ctx.fillText(data.milestone, 32, y);
	}

	ctx.font = '14px system-ui, sans-serif';
	ctx.fillStyle = 'rgba(255,255,255,0.8)';
	ctx.fillText('FrenchPath · Offline French for Indian learners', 32, height - 32);

	return new Promise((resolve) => {
		canvas.toBlob((b) => resolve(b), 'image/png');
	});
}

/** Share via Web Share, else download the PNG, else copy text. */
export async function shareBlob(
	blob: Blob | null,
	text: string,
	title: string,
	fileName: string,
	downloadName: string
): Promise<boolean> {
	const files =
		blob && typeof File !== 'undefined'
			? [new File([blob], fileName, { type: 'image/png' })]
			: undefined;

	if (typeof navigator !== 'undefined' && navigator.share) {
		try {
			await navigator.share({ title, text, files: files as File[] | undefined });
			return true;
		} catch (err) {
			// a cancel is the learner's answer: no PNG download behind their back
			if (err instanceof DOMException && err.name === 'AbortError') return false;
		}
	}

	if (blob) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = downloadName;
		a.click();
		URL.revokeObjectURL(url);
		return true;
	}

	if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}
	return false;
}

export async function shareProgress(data: ShareCardData): Promise<boolean> {
	const blob = await renderShareCardPng(data);
	return shareBlob(
		blob,
		buildShareText(data),
		data.title,
		'frenchpath-progress.png',
		'frenchpath-share.png'
	);
}

/** Labels keys: title, reviews, accuracy, words, xp, lessons, streak, units, empty. */
export async function renderWeeklyPostcardPng(
	recap: WeeklyRecap,
	labels: Record<string, string>,
	width = 600,
	height = 340
): Promise<Blob | null> {
	if (typeof document === 'undefined') return null;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	paintCardBackground(ctx, width, height);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 28px system-ui, sans-serif';
	ctx.fillText(labels.title ?? '', 32, 64, 540);
	ctx.font = '18px system-ui, sans-serif';
	if (recap.reviews === 0 && recap.lessons === 0) {
		ctx.fillText(labels.empty ?? '', 32, 112, 540);
	} else {
		const rows = [
			`${labels.reviews}: ${recap.reviews}`,
			`${labels.accuracy}: ${recap.accuracy}%`,
			`${labels.words}: ${recap.wordsRecalled}`,
			`${labels.xp}: ${recap.xp}`,
			`${labels.lessons}: ${recap.lessons}`,
			`${labels.streak}: ${recap.streak}`,
			`${labels.units}: ${recap.unitsDone}/${recap.unitsTotal}`
		];
		rows.forEach((r, i) => ctx.fillText(r, 32 + (i % 2) * 280, 112 + Math.floor(i / 2) * 44, 260));
	}
	ctx.font = '14px system-ui, sans-serif';
	ctx.fillStyle = 'rgba(255,255,255,0.8)';
	ctx.fillText('FrenchPath', 32, height - 32);
	return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export async function sharePostcard(
	recap: WeeklyRecap,
	labels: Record<string, string>
): Promise<boolean> {
	const blob = await renderWeeklyPostcardPng(recap, labels);
	const text = `${labels.title} · ${labels.reviews}: ${recap.reviews} · ${labels.xp}: ${recap.xp} · FrenchPath`;
	return shareBlob(blob, text, labels.title ?? '', 'frenchpath-week.png', 'frenchpath-week.png');
}
