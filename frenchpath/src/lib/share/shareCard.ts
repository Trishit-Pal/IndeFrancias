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

	// L'Indigo Express brand gradient (deep indigo → indigo-violet), keeping
	// white text readable across the whole card.
	const grad = ctx.createLinearGradient(0, 0, width, height);
	grad.addColorStop(0, '#232044');
	grad.addColorStop(1, '#3d2b5e');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, width, height);

	// Marigold accent bar echoing the map's progress line.
	ctx.fillStyle = '#e2a13b';
	ctx.fillRect(0, 0, 8, height);

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

export async function shareProgress(data: ShareCardData): Promise<boolean> {
	const text = buildShareText(data);
	const blob = await renderShareCardPng(data);
	const files =
		blob && typeof File !== 'undefined'
			? [new File([blob], 'frenchpath-progress.png', { type: 'image/png' })]
			: undefined;

	if (typeof navigator !== 'undefined' && navigator.share) {
		try {
			await navigator.share({
				title: data.title,
				text,
				files: files as File[] | undefined
			});
			return true;
		} catch {
			// user cancelled
		}
	}

	if (blob) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'frenchpath-share.png';
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
