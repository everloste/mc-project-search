import { mcverIsValid } from "./mcver";

export function versionFeedback(this: HTMLInputElement) {
	const version = this.value;
	const feedback = this.parentNode!.querySelector("#version-input-feedback")! as HTMLSpanElement;

	if (!mcverIsValid(version) && version != "") feedback.hidden = false;
	else feedback.hidden = true;
}

export function hideIntroduction(this: HTMLAnchorElement) {
	const text = document.getElementById("introduction-text");
	if (text) text.hidden = true;
}