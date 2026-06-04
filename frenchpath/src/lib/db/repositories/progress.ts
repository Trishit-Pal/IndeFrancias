import { getDB } from '../db';
import type { ProgressRecord } from '../schema';

export async function getProgress(lessonId: string): Promise<ProgressRecord | undefined> {
	return (await getDB()).get('progress', lessonId);
}

export async function getAllProgress(): Promise<ProgressRecord[]> {
	return (await getDB()).getAll('progress');
}

export async function putProgress(record: ProgressRecord): Promise<void> {
	await (await getDB()).put('progress', record);
}
