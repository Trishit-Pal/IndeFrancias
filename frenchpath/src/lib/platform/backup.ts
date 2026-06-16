// Native (Capacitor) backup export: write the JSON to a cache file and open the
// OS share sheet (the web Blob-download path doesn't surface a save dialog in a
// WebView). Import still uses the standard <input type=file>, which works in the
// native WebView, so only export needs a native branch.

export async function exportBackupNative(json: string, filename: string): Promise<void> {
	const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
	const { Share } = await import('@capacitor/share');
	await Filesystem.writeFile({
		path: filename,
		data: json,
		directory: Directory.Cache,
		encoding: Encoding.UTF8
	});
	const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
	await Share.share({ title: 'FrenchPath backup', url: uri });
}
