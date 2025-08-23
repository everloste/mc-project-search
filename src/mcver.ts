
export function mcverIsValid(version: string, include_snapshots: boolean = false) {
	version = version.trim();

	if (version.split(".").length === 1) {
		if (include_snapshots) {
			const parts = version.split("w");
			if (parts.length === 2 && /^[0-9]+$/.test(parts[0]) && /^[0-9]+a$/.test(parts[1])) return true;
		}
	}
	
	else if (/^1\.[0-9]{1,2}(?:\.[0-9]{1,2})?$/.test(version)) return true;
	return false;
}
