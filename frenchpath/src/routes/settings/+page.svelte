<script lang="ts">
	import { onMount } from 'svelte';
	import {
		settingsRepo,
		resetDatabase,
		type Settings,
		type Theme,
		type UiLanguage,
		type NativeLanguage,
		type LearningGoal,
		type DailyGoalPreset,
		type CelebrationLevel,
		type DifficultyTier
	} from '$lib/db';
	import {
		NATIVE_LANGUAGES,
		NATIVE_LANGUAGE_LABELS,
		xpFromPreset,
		type DailyGoalPreset as Preset
	} from '$lib/profile/types';
	import { LEARNING_GOAL_LABELS } from '$lib/profile/goalCopy';
	import {
		exportBackup,
		importBackup,
		previewBackup,
		MAX_BACKUP_BYTES,
		type BackupPreview
	} from '$lib/pwa/backup';
	import { ensurePersistence, isPersisted } from '$lib/pwa/persist';
	import { applyTheme } from '$lib/theme/apply';
	import { configureTts, listFrenchVoices, voicesReady } from '$lib/audio/tts';
	import { revisionNotificationBody } from '$lib/pwa/revisionNotify';
	import * as m from '$lib/paraglide/messages';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';

	const LAST_EXPORT_KEY = 'frenchpath:lastExportAt';

	let settings = $state<Settings | null>(null);
	let persisted = $state(false);
	let message = $state('');
	let confirmingReset = $state(false);
	let lastExportAt = $state<string | null>(null);
	let importPreview = $state<BackupPreview | null>(null);
	let pendingImportJson = $state('');
	let importing = $state(false);

	const languages: { value: UiLanguage; label: string }[] = [
		{ value: 'en', label: 'English' },
		{ value: 'hi', label: 'हिन्दी' },
		{ value: 'hinglish', label: 'Hinglish' },
		{ value: 'bn', label: 'বাংলা' },
		{ value: 'ta', label: 'தமிழ்' },
		{ value: 'te', label: 'తెలుగు' },
		{ value: 'kn', label: 'ಕನ್ನಡ' },
		{ value: 'mr', label: 'मराठी' },
		{ value: 'gu', label: 'ગુજરાતી' },
		{ value: 'pa', label: 'ਪੰਜਾਬੀ' }
	];

	const presetOptions: { value: Preset; label: string }[] = [
		{ value: 'casual', label: 'Casual (20 XP)' },
		{ value: 'regular', label: 'Regular (50 XP)' },
		{ value: 'intense', label: 'Intense (100 XP)' }
	];

	const tierOptions: { value: DifficultyTier; label: string }[] = [
		{ value: 'easy', label: 'Easy — 60% pass, gentler reviews' },
		{ value: 'regular', label: 'Regular — 70% pass' },
		{ value: 'hard', label: 'Hard — 80% pass, longer gaps' }
	];

	let frenchVoices = $state<{ uri: string; label: string }[]>([]);

	const themeOptions: { value: Theme; label: () => string }[] = [
		{ value: 'system', label: m.settings_theme_system },
		{ value: 'light', label: m.settings_theme_light },
		{ value: 'dark', label: m.settings_theme_dark }
	];

	const currentLocale = getLocale() as UiLanguage;

	async function changeLanguage(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as UiLanguage;
		await settingsRepo.saveSettings({ uiLanguage: value });
		setLocale(value);
	}

	onMount(async () => {
		settings = await settingsRepo.getSettings();
		persisted = await isPersisted();
		lastExportAt = localStorage.getItem(LAST_EXPORT_KEY);
		const voices = await voicesReady();
		frenchVoices = listFrenchVoices(voices).map((v) => ({
			uri: v.voiceURI,
			label: `${v.name} (${v.lang})`
		}));
	});

	async function update(patch: Partial<Settings>) {
		settings = await settingsRepo.saveSettings(patch);
		document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
		if (patch.theme !== undefined) applyTheme(settings.theme);
		if (patch.ttsVoice !== undefined || patch.audioSpeed !== undefined) {
			configureTts(settings.ttsVoice, settings.audioSpeed);
		}
	}

	async function toggleRevisionNotifications(enabled: boolean) {
		if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				message =
					'Notifications were not allowed. Enable them in browser settings to get revision reminders.';
				return;
			}
		}
		await update({ revisionNotifications: enabled });
	}

	async function sendTestNotification() {
		if (typeof Notification === 'undefined') {
			message = 'Notifications are not supported in this browser.';
			return;
		}
		if (Notification.permission === 'default') {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				message = 'Notifications were not allowed.';
				return;
			}
		}
		if (Notification.permission !== 'granted') {
			message = 'Enable notifications in browser settings first.';
			return;
		}
		new Notification(m.revision_notify_title(), {
			body: revisionNotificationBody(3),
			tag: 'frenchpath-revision-test'
		});
		message = m.settings_test_notification_sent();
	}

	async function requestPersist() {
		persisted = await ensurePersistence();
		message = persisted
			? 'Storage is now persistent — your data is protected from eviction.'
			: 'The browser did not grant persistent storage. Your data is still saved (best-effort).';
	}

	async function download() {
		const blob = new Blob([await exportBackup()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `frenchpath-backup-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
		const exportedAt = new Date().toISOString();
		localStorage.setItem(LAST_EXPORT_KEY, exportedAt);
		lastExportAt = exportedAt;
		message = 'Backup downloaded.';
	}

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (file.size > MAX_BACKUP_BYTES) {
			message = `File is too large. Maximum backup size is ${Math.round(MAX_BACKUP_BYTES / 1024 / 1024)} MB.`;
			return;
		}
		try {
			const json = await file.text();
			importPreview = await previewBackup(json);
			pendingImportJson = json;
		} catch (error) {
			message = error instanceof Error ? error.message : 'Import failed.';
		}
	}

	async function confirmImport() {
		if (!pendingImportJson || importing) return;
		importing = true;
		try {
			await importBackup(pendingImportJson);
			message = 'Backup restored. Reloading…';
			location.reload();
		} catch (error) {
			message = error instanceof Error ? error.message : 'Import failed.';
		} finally {
			importing = false;
			importPreview = null;
			pendingImportJson = '';
		}
	}

	function cancelImport() {
		importPreview = null;
		pendingImportJson = '';
	}

	async function reset() {
		await resetDatabase();
		location.reload();
	}

	const retentionOptions = [
		{ value: 0.8, label: '80% — fewer reviews' },
		{ value: 0.85, label: '85%' },
		{ value: 0.9, label: '90% — recommended' },
		{ value: 0.95, label: '95% — stronger recall' }
	];
	const goalOptions = [10, 20, 30, 50, 100];

	async function rerunSetupTour() {
		await settingsRepo.saveSettings({ onboarded: false });
		location.href = '/';
	}
</script>

<svelte:head><title>Settings · FrenchPath</title></svelte:head>

<main class="page-shell">
	<h1 class="text-2xl font-bold text-foreground md:text-3xl">{m.settings_title()}</h1>

	{#if settings}
		<div class="mt-5 space-y-6">
			<section class="surface-card p-4" data-testid="my-learning-section">
				<h2 class="font-semibold text-foreground">{m.settings_my_learning()}</h2>

				<label class="mt-3 block text-sm text-muted" for="native-language">
					{m.settings_native_language()}
				</label>
				<select
					id="native-language"
					class="field-input mt-1"
					value={settings.nativeLanguage}
					onchange={(e) => update({ nativeLanguage: e.currentTarget.value as NativeLanguage })}
					data-testid="native-language-select"
				>
					{#each NATIVE_LANGUAGES as lang (lang)}
						<option value={lang}>{NATIVE_LANGUAGE_LABELS[lang]}</option>
					{/each}
				</select>

				<label class="mt-4 block text-sm text-muted" for="learning-goal">
					{m.settings_learning_goal()}
				</label>
				<select
					id="learning-goal"
					class="field-input mt-1"
					value={settings.learningGoal}
					onchange={(e) => update({ learningGoal: e.currentTarget.value as LearningGoal })}
					data-testid="learning-goal-select"
				>
					{#each Object.entries(LEARNING_GOAL_LABELS) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>

				<label class="mt-4 block text-sm text-muted" for="exam-date-setting">
					{m.settings_exam_date()}
				</label>
				<input
					id="exam-date-setting"
					type="date"
					class="field-input mt-1"
					value={settings.targetExamDate ?? ''}
					onchange={(e) => update({ targetExamDate: e.currentTarget.value || null })}
					data-testid="exam-date-setting"
				/>

				<label class="mt-4 block text-sm text-muted" for="daily-preset">
					{m.settings_daily_preset()}
				</label>
				<select
					id="daily-preset"
					class="field-input mt-1"
					value={settings.dailyGoalPreset}
					onchange={(e) => {
						const preset = e.currentTarget.value as DailyGoalPreset;
						update({ dailyGoalPreset: preset, dailyGoalXp: xpFromPreset(preset) });
					}}
					data-testid="daily-preset-select"
				>
					{#each presetOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>

				<label class="mt-4 block text-sm text-muted" for="celebration">
					{m.settings_celebration()}
				</label>
				<select
					id="celebration"
					class="field-input mt-1"
					value={settings.celebrationLevel}
					onchange={(e) => update({ celebrationLevel: e.currentTarget.value as CelebrationLevel })}
					data-testid="celebration-select"
				>
					<option value="full">{m.settings_celebration_full()}</option>
					<option value="minimal">{m.settings_celebration_minimal()}</option>
				</select>

				<label class="mt-4 flex items-center justify-between">
					<span class="text-sm text-muted">{m.settings_french_tips()}</span>
					<input
						type="checkbox"
						class="h-5 w-5 accent-primary"
						checked={settings.showFrenchTips}
						onchange={(e) => update({ showFrenchTips: e.currentTarget.checked })}
					/>
				</label>

				<label class="mt-4 block text-sm text-muted" for="difficulty-tier">
					Checkpoint difficulty
				</label>
				<select
					id="difficulty-tier"
					class="field-input mt-1"
					value={settings.difficultyTier}
					onchange={(e) => update({ difficultyTier: e.currentTarget.value as DifficultyTier })}
					data-testid="difficulty-tier-select"
				>
					{#each tierOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>

				<label class="mt-4 flex items-center justify-between">
					<span class="text-sm text-muted">Revision reminders (browser notifications)</span>
					<input
						type="checkbox"
						class="h-5 w-5 accent-primary"
						checked={settings.revisionNotifications}
						onchange={(e) => void toggleRevisionNotifications(e.currentTarget.checked)}
						data-testid="revision-notifications"
					/>
				</label>

				<button
					type="button"
					class="btn-secondary mt-2 text-sm"
					data-testid="test-notification"
					onclick={sendTestNotification}
				>
					{m.settings_test_notification()}
				</button>

				<button
					type="button"
					class="btn-secondary mt-4 text-sm"
					onclick={rerunSetupTour}
					data-testid="rerun-onboarding"
				>
					{m.settings_rerun_onboarding()}
				</button>
			</section>

			<section class="surface-card p-4" data-testid="sovereignty-panel">
				<h2 class="font-semibold text-foreground">{m.settings_sovereignty()}</h2>
				<p class="mt-2 text-sm text-muted">{m.settings_sovereignty_desc()}</p>
				<ul class="mt-3 list-inside list-disc text-sm text-muted">
					<li>Progress, reviews, and settings: on-device only</li>
					<li>Export: JSON backup you control</li>
					<li>Cloud sync: disabled (E2EE architecture prepared)</li>
				</ul>
				<p class="mt-3 text-xs text-muted">
					See <code class="rounded bg-subtle px-1">docs/data-sovereignty.md</code> in the project repo
					for the full sovereignty model.
				</p>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">{m.settings_language()}</h2>
				<label class="mt-3 block text-sm text-muted" for="language">
					Interface language (Hindi / English / Hinglish)
				</label>
				<select
					id="language"
					class="field-input mt-1"
					value={currentLocale}
					onchange={changeLanguage}
					data-testid="language-select"
				>
					{#each languages as lang (lang.value)}
						<option value={lang.value}>{lang.label}</option>
					{/each}
				</select>
			</section>

			<section class="surface-card p-4" data-testid="tts-section">
				<h2 class="font-semibold text-foreground">{m.settings_tts_section()}</h2>
				<p class="mt-1 text-sm text-muted">
					All pronunciation uses French voices only — never English TTS.
				</p>

				<label class="mt-3 block text-sm text-muted" for="tts-voice">
					{m.settings_tts_voice()}
				</label>
				<select
					id="tts-voice"
					class="field-input mt-1"
					value={settings.ttsVoice ?? ''}
					onchange={(e) => update({ ttsVoice: e.currentTarget.value || null })}
					data-testid="tts-voice-select"
				>
					<option value="">{m.settings_tts_voice_default()}</option>
					{#each frenchVoices as voice (voice.uri)}
						<option value={voice.uri}>{voice.label}</option>
					{/each}
				</select>

				<label class="mt-4 block text-sm text-muted" for="tts-speed">
					{m.settings_tts_speed()} ({settings.audioSpeed.toFixed(2)}×)
				</label>
				<input
					id="tts-speed"
					type="range"
					min="0.75"
					max="1.25"
					step="0.05"
					class="mt-2 w-full accent-primary"
					value={settings.audioSpeed}
					oninput={(e) => update({ audioSpeed: Number(e.currentTarget.value) })}
					data-testid="tts-speed-slider"
				/>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">{m.settings_theme()}</h2>
				<label class="mt-3 block text-sm text-muted" for="theme">
					{m.settings_theme()}
				</label>
				<select
					id="theme"
					class="field-input mt-1"
					value={settings.theme}
					onchange={(e) => update({ theme: e.currentTarget.value as Theme })}
					data-testid="theme-select"
				>
					{#each themeOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label()}</option>
					{/each}
				</select>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">Review</h2>
				<label class="mt-3 block text-sm text-muted" for="retention">
					Desired retention (FSRS)
				</label>
				<select
					id="retention"
					class="field-input mt-1"
					value={settings.targetRetention}
					onchange={(e) => update({ targetRetention: Number(e.currentTarget.value) })}
					data-testid="retention-select"
				>
					{#each retentionOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>

				<label class="mt-4 block text-sm text-muted" for="goal">Daily goal (XP)</label>
				<select
					id="goal"
					class="field-input mt-1"
					value={settings.dailyGoalXp}
					onchange={(e) => update({ dailyGoalXp: Number(e.currentTarget.value) })}
					data-testid="goal-select"
				>
					{#each goalOptions as goal (goal)}
						<option value={goal}>{goal} XP</option>
					{/each}
				</select>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">Accessibility</h2>
				<label class="mt-3 flex items-center justify-between">
					<span class="text-sm text-muted">Reduce motion</span>
					<input
						type="checkbox"
						class="h-5 w-5 accent-primary"
						checked={settings.reduceMotion}
						onchange={(e) => update({ reduceMotion: e.currentTarget.checked })}
						data-testid="reduce-motion"
					/>
				</label>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-foreground">Storage & backup</h2>
				<p class="mt-2 text-sm text-muted" data-testid="data-local-notice">
					Your learning data exists only on this device. Export regularly to avoid losing progress.
				</p>
				<p class="mt-1 text-sm text-muted">
					Persistent storage: <span class="font-medium text-foreground"
						>{persisted ? 'on' : 'best-effort'}</span
					>
				</p>
				{#if lastExportAt}
					<p class="mt-1 text-sm text-muted" data-testid="last-export">
						Last export: {new Date(lastExportAt).toLocaleString()}
					</p>
				{/if}
				{#if !persisted}
					<button type="button" class="btn-secondary mt-2 text-sm" onclick={requestPersist}>
						Request persistent storage
					</button>
				{/if}
				<div class="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						class="btn-primary text-sm"
						onclick={download}
						data-testid="backup-export"
					>
						Export backup
					</button>
					<label class="btn-secondary cursor-pointer text-sm" data-testid="backup-import">
						Import backup
						<input
							type="file"
							accept="application/json"
							class="hidden"
							onchange={onFile}
							data-testid="backup-file-input"
						/>
					</label>
				</div>
			</section>

			<section
				class="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
			>
				<h2 class="font-semibold text-red-900 dark:text-red-200">Danger zone</h2>
				{#if confirmingReset}
					<p class="mt-2 text-sm text-red-800 dark:text-red-300">
						Erase all progress on this device? This cannot be undone.
					</p>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white dark:bg-red-500 dark:text-black"
							onclick={reset}
							data-testid="reset-confirm"
						>
							Yes, erase everything
						</button>
						<button
							type="button"
							class="btn-secondary text-sm"
							onclick={() => (confirmingReset = false)}
						>
							Cancel
						</button>
					</div>
				{:else}
					<button
						type="button"
						class="mt-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-700 dark:text-red-300"
						onclick={() => (confirmingReset = true)}
						data-testid="reset-progress"
					>
						Reset all progress
					</button>
				{/if}
			</section>

			{#if importPreview}
				<div
					class="surface-card border-amber-300 p-4 dark:border-amber-700"
					role="dialog"
					aria-labelledby="import-preview-title"
					data-testid="import-preview"
				>
					<h2 id="import-preview-title" class="font-semibold text-foreground">
						Replace all on-device data?
					</h2>
					<p class="mt-2 text-sm text-muted">
						Exported: {new Date(importPreview.exportedAt).toLocaleString()} ·
						{importPreview.lessonCount} lessons · {importPreview.cardCount} review cards
					</p>
					<p class="mt-1 text-sm text-muted">
						This will erase your current progress and replace it with the backup.
					</p>
					<div class="mt-3 flex gap-2">
						<button
							type="button"
							class="btn-primary text-sm"
							onclick={confirmImport}
							disabled={importing}
							data-testid="import-confirm"
						>
							{importing ? 'Importing…' : 'Replace data'}
						</button>
						<button type="button" class="btn-secondary text-sm" onclick={cancelImport}>
							Cancel
						</button>
					</div>
				</div>
			{/if}

			{#if message}
				<p class="text-sm text-muted" role="alert" data-testid="settings-message">{message}</p>
			{/if}
		</div>
	{/if}
</main>
