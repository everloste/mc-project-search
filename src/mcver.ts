
export function mcverIsValid(version: string, include_snapshots: boolean = false) {
	version = version.trim();
	const sections = version.split(".");

	if (sections.length === 1) {
		if (include_snapshots) {
			const parts = version.split("w");
			if (parts.length === 2 && /^[0-9]+$/.test(parts[0]) && /^[0-9]+a$/.test(parts[1])) return true;
		}
	}
	else if (sections.length === 2 && /^[0-9]+$/.test(sections[0]) && /^[0-9]+$/.test(sections[1])) return true;
	else if (sections.length === 3 && /^[0-9]+$/.test(sections[0]) && /^[0-9]+$/.test(sections[1]) && /^[0-9]+$/.test(sections[2])) return true;
	return false;
}
