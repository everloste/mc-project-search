/** Returns if the string is in the form of a Minecraft version. */
export function mcverIsValid(version: string, include_snapshots: boolean = false): boolean {
	// snapshot testing
	if (version.split(".").length === 1) {
		if (include_snapshots) {
			const parts = version.split("w");
			if (parts.length === 2 && /^[0-9]+$/.test(parts[0]) && /^[0-9]+a$/.test(parts[1])) return true;
		}
	}
	else if (/^1\.[1-9][0-9]?(?:\.[1-9][0-9]?)?$/.test(version)) return true;
	return false;
}

/** Returns if the string is in the form of a major Minecraft version, or null if the string is not a valid version. */
export function mcverIsMajor(version: string): boolean | null {
	if (!mcverIsValid(version)) return null;
	if (/^1\.[1-9][0-9]?$/.test(version)) return true;
	return false;
}

/** Returns if the string is in the form of a minor Minecraft version, or null if the string is not a valid version. */
export function mcverIsMinor(version: string): boolean | null {
	if (!mcverIsValid(version)) return null;
	if (/^1\.[1-9][0-9]?\.[1-9][0-9]?$/.test(version)) return true;
	return false;
}

/** Returns the major version of a minor version string, so "1.21.5" returns "1.21", otherwise null. */
export function mcverGetMajor(version: string): string | null {
	if (!mcverIsValid(version)) return null;
	if (mcverIsMajor(version)) return version;
	else return /^1\.[1-9][0-9]?(?=\.)/.exec(version)![0];
}

/** Returns if a minor version is of the major version, null if the specified minor version isn't a minor version or the major one isn't a major one. */
export function mcverMinorBelongsToMajor(minor: string, major: string): boolean | null {
	if (!mcverIsMinor(minor) || !mcverIsMajor(major)) return null;
	if (mcverGetMajor(minor) == major) return true;
	else return false;
}

/** Returns if the two versions are of the same major release. */
export function mcversSameMajor(version1: string, version2: string): boolean | null {
	if (!mcverIsValid(version1) || !mcverIsValid(version2)) return null;
	else return mcverGetMajor(version1) == mcverGetMajor(version2);
}

/** Tries to create a valid Minecraft version string, or returns null if it fails. */
export function mcverSanitize(text: string): string | null {
	text = text.trim();
	try {
		text = /^1\.[1-9][0-9]?(?:\.[1-9][0-9]?)?/.exec(text)![0];
	}
	catch {
		return null;
	}
	if (mcverIsValid(text)) return text;
	else return null;
}