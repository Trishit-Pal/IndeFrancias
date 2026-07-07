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
	import { isNativePlatform } from '$lib/platform';
	import { exportBackupNative } from '$lib/platform/backup';
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

	const presetOptions: { value: Preset; label: () => string }[] = [
		{ value: 'casual', label: () => m.settings_preset_casual({ xp: xpFromPreset('casual') }) },
		{ value: 'regular', label: () => m.settings_preset_regular({ xp: xpFromPreset('regular') }) },
		{ value: 'intense', label: () => m.settings_preset_intense({ xp: xpFromPreset('intense') }) }
	];

	const tierOptions: { value: DifficultyTier; label: () => string }[] = [
		{ value: 'easy', label: m.settings_tier_easy },
		{ value: 'regular', label: m.settings_tier_regular },
		{ value: 'hard', label: m.settings_tier_hard }
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
				message = m.settings_notif_denied_hint();
				return;
			}
		}
		await update({ revisionNotifications: enabled });
	}

	async function sendTestNotification() {
		if (typeof Notification === 'undefined') {
			message = m.settings_notif_unsupported();
			return;
		}
		if (Notification.permission === 'default') {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				message = m.settings_notif_denied();
				return;
			}
		}
		if (Notification.permission !== 'granted') {
			message = m.settings_notif_enable_first();
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
		message = persisted ? m.settings_persist_granted() : m.settings_persist_denied();
	}

	async function download() {
		try {
			const json = await exportBackup();
			const filename = `frenchpath-backup-${new Date().toISOString().slice(0, 10)}.json`;
			if (isNativePlatform()) {
				await exportBackupNative(json, filename);
			} else {
				const blob = new Blob([json], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = filename;
				link.click();
				URL.revokeObjectURL(url);
			}
			const exportedAt = new Date().toISOString();
			localStorage.setItem(LAST_EXPORT_KEY, exportedAt);
			lastExportAt = exportedAt;
			message = m.settings_backup_downloaded();
		} catch (error) {
			// Surface native (share/filesystem) or web failures instead of
			// throwing unhandled — backup is the only data-recovery path.
			message = error instanceof Error ? error.message : m.settings_backup_export_failed();
		}
	}

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (file.size > MAX_BACKUP_BYTES) {
			message = m.settings_file_too_large({ mb: Math.round(MAX_BACKUP_BYTES / 1024 / 1024) });
			return;
		}
		try {
			const json = await file.text();
			importPreview = await previewBackup(json);
			pendingImportJson = json;
		} catch (error) {
			message = error instanceof Error ? error.message : m.settings_import_failed();
		}
	}

	async function confirmImport() {
		if (!pendingImportJson || importing) return;
		importing = true;
		try {
			await importBackup(pendingImportJson);
			message = m.settings_backup_restored();
			location.reload();
		} catch (error) {
			message = error instanceof Error ? error.message : m.settings_import_failed();
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

	const retentionOptions: { value: number; label: () => string }[] = [
		{ value: 0.8, label: m.settings_retention_80 },
		{ value: 0.85, label: m.settings_retention_85 },
		{ value: 0.9, label: m.settings_retention_90 },
		{ value: 0.95, label: m.settings_retention_95 }
	];
	const goalOptions = [10, 20, 30, 50, 100];

	async function rerunSetupTour() {
		await settingsRepo.saveSettings({ onboarded: false });
		location.href = '/';
	}
</script>

<svelte:head><title>{m.settings_title()} · FrenchPath</title></svelte:head>

<main class="page-shell">
	<h1
		class="text-4xl text-balance text-foreground"
		style="font-family: var(--fp-font-display); font-weight: 400; line-height: 1.1"
	>
		{m.settings_title()}
	</h1>

	{#if settings}
		<div class="mt-5 space-y-6">
			<section class="surface-card p-4" data-testid="my-learning-section">
				<h2 class="font-semibold text-balance text-foreground">{m.settings_my_learning()}</h2>

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
						<option value={opt.value}>{opt.label()}</option>
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

				<label class="mt-4 flex min-h-11 items-center justify-between">
					<span class="text-sm text-muted">{m.settings_french_tips()}</span>
					<input
						type="checkbox"
						class="h-5 w-5 accent-primary"
						checked={settings.showFrenchTips}
						onchange={(e) => update({ showFrenchTips: e.currentTarget.checked })}
					/>
				</label>

				<label class="mt-4 block text-sm text-muted" for="difficulty-tier">
					{m.onb_difficulty_title()}
				</label>
				<select
					id="difficulty-tier"
					class="field-input mt-1"
					value={settings.difficultyTier}
					onchange={(e) => update({ difficultyTier: e.currentTarget.value as DifficultyTier })}
					data-testid="difficulty-tier-select"
				>
					{#each tierOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label()}</option>
					{/each}
				</select>

				<label class="mt-4 flex min-h-11 items-center justify-between">
					<span class="text-sm text-muted">{m.settings_revision_reminders()}</span>
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
				<h2 class="font-semibold text-balance text-foreground">{m.settings_sovereignty()}</h2>
				<p class="mt-2 text-sm text-muted">{m.settings_sovereignty_desc()}</p>
				<ul class="mt-3 list-inside list-disc text-sm text-muted">
					<li>{m.settings_sovereignty_item_ondevice()}</li>
					<li>{m.settings_sovereignty_item_export()}</li>
					<li>{m.settings_sovereignty_item_sync()}</li>
				</ul>
				<p class="mt-3 text-xs text-muted">
					{m.settings_sovereignty_doc()}
				</p>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-balance text-foreground">{m.settings_language()}</h2>
				<label class="mt-3 block text-sm text-muted" for="language">
					{m.settings_ui_language_label()}
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
				<h2 class="font-semibold text-balance text-foreground">{m.settings_tts_section()}</h2>
				<p class="mt-1 text-sm text-muted">
					{m.settings_tts_desc()}
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
				<h2 class="font-semibold text-balance text-foreground">{m.settings_theme()}</h2>
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
				<h2 class="font-semibold text-balance text-foreground">{m.settings_review_section()}</h2>
				<label class="mt-3 block text-sm text-muted" for="retention">
					{m.settings_retention_label()}
				</label>
				<select
					id="retention"
					class="field-input mt-1"
					value={settings.targetRetention}
					onchange={(e) => update({ targetRetention: Number(e.currentTarget.value) })}
					data-testid="retention-select"
				>
					{#each retentionOptions as opt (opt.value)}
						<option value={opt.value}>{opt.label()}</option>
					{/each}
				</select>

				<label class="mt-4 block text-sm text-muted" for="goal">
					{m.settings_daily_goal_label()}
				</label>
				<select
					id="goal"
					class="field-input mt-1"
					value={settings.dailyGoalXp}
					onchange={(e) => update({ dailyGoalXp: Number(e.currentTarget.value) })}
					data-testid="goal-select"
				>
					{#each goalOptions as goal (goal)}
						<option value={goal}>{m.settings_goal_xp({ xp: goal })}</option>
					{/each}
				</select>
			</section>

			<section class="surface-card p-4">
				<h2 class="font-semibold text-balance text-foreground">
					{m.settings_accessibility_section()}
				</h2>
				<label class="mt-3 flex min-h-11 items-center justify-between">
					<span class="text-sm text-muted">{m.settings_reduce_motion_label()}</span>
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
				<h2 class="font-semibold text-balance text-foreground">{m.settings_storage_section()}</h2>
				<div class="fp-data-card mt-2" data-testid="data-local-notice">
					<p class="text-sm font-medium">
						{m.settings_storage_notice()}
					</p>
				</div>
				<p class="mt-1 text-sm text-muted">
					{m.settings_persisted_label()}
					<span class="font-medium text-foreground">
						{persisted ? m.settings_persisted_on() : m.settings_persisted_best_effort()}
					</span>
				</p>
				{#if lastExportAt}
					<p class="mt-1 text-sm text-muted" data-testid="last-export">
						{m.settings_last_export({ date: new Date(lastExportAt).toLocaleString() })}
					</p>
				{/if}
				{#if !persisted}
					<button type="button" class="btn-secondary mt-2 text-sm" onclick={requestPersist}>
						{m.settings_request_persist()}
					</button>
				{/if}
				<div class="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						class="btn-primary text-sm"
						onclick={download}
						data-testid="backup-export"
					>
						{m.settings_backup_export()}
					</button>
					<label class="btn-secondary cursor-pointer text-sm" data-testid="backup-import">
						{m.settings_backup_import()}
						<input
							type="file"
							accept="application/json"
							class="sr-only"
							onchange={onFile}
							data-testid="backup-file-input"
						/>
					</label>
				</div>
			</section>

			<section
				class="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
			>
				<h2 class="font-semibold text-balance text-red-900 dark:text-red-200">
					{m.settings_danger_zone()}
				</h2>
				{#if confirmingReset}
					<p class="mt-2 text-sm text-red-800 dark:text-red-300">
						{m.settings_reset_confirm_desc()}
					</p>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="min-h-11 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:text-black"
							onclick={reset}
							data-testid="reset-confirm"
						>
							{m.settings_reset_yes()}
						</button>
						<button
							type="button"
							class="btn-secondary text-sm"
							onclick={() => (confirmingReset = false)}
						>
							{m.common_cancel()}
						</button>
					</div>
				{:else}
					<button
						type="button"
						class="mt-2 min-h-11 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-red-700 dark:text-red-300"
						onclick={() => (confirmingReset = true)}
						data-testid="reset-progress"
					>
						{m.settings_reset_progress()}
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
					<h2 id="import-preview-title" class="font-semibold text-balance text-foreground">
						{m.settings_import_preview_title()}
					</h2>
					<p class="mt-2 text-sm text-muted">
						{m.settings_import_preview_summary({
							date: new Date(importPreview.exportedAt).toLocaleString(),
							lessons: importPreview.lessonCount,
							cards: importPreview.cardCount
						})}
					</p>
					<p class="mt-1 text-sm text-muted">
						{m.settings_import_preview_warning()}
					</p>
					<div class="mt-3 flex gap-2">
						<button
							type="button"
							class="btn-primary text-sm"
							onclick={confirmImport}
							disabled={importing}
							data-testid="import-confirm"
						>
							{importing ? m.settings_importing() : m.settings_import_confirm()}
						</button>
						<button type="button" class="btn-secondary text-sm" onclick={cancelImport}>
							{m.common_cancel()}
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
