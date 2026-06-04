import { getDB } from '../db';
import type { Skill, SkillProfileRecord } from '../schema';

export async function getSkillProfile(skill: Skill): Promise<SkillProfileRecord | undefined> {
	return (await getDB()).get('skillProfile', skill);
}

export async function getAllSkillProfiles(): Promise<SkillProfileRecord[]> {
	return (await getDB()).getAll('skillProfile');
}

export async function putSkillProfile(record: SkillProfileRecord): Promise<void> {
	await (await getDB()).put('skillProfile', record);
}
