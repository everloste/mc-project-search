import { mcverIsValid } from "./mcver";
import { searchCombined, type UnifiedProjectType } from "./queries/combined-api";

export function onLoad() {
	document.getElementById("search-input")!.addEventListener("change", search);
	document.getElementById("search-button")!.addEventListener("click", search);
	document.getElementById("version-input")!.addEventListener("change", versionFeedback);

	registerPageChanger();
	loadIntroduction();

	search();
}

function versionFeedback(this: HTMLInputElement) {
	const version = this.value;
	const feedback = this.parentNode!.querySelector("#version-input-feedback")! as HTMLSpanElement;

	if (!mcverIsValid(version) && version != "") feedback.hidden = false;
	else feedback.hidden = true;
}

function hideIntroduction(this: HTMLAnchorElement) {
	const text = document.getElementById("introduction-text");
	if (text) text.hidden = true;
	localStorage.setItem("hide_introduction_text", "1");
}

function loadIntroduction() {
	const text = document.getElementById("introduction-text")!;
	const hidden = localStorage.getItem("hide_introduction_text");
	
	if (hidden && hidden == "1") {
		text.hidden = true;
	}
	else {
		document.getElementById("hide-introduction-link")!.addEventListener("click", hideIntroduction);
		text.hidden = false;
	}
}

function showFail() {
	const template = document.getElementById("SEARCH-RESULT-FAIL-TEMPLATE")! as HTMLTemplateElement;
	let clone = template.content.querySelector("div")!.cloneNode(true) as HTMLDivElement;
	document.querySelector(".search-result-list")!.appendChild(clone!);
}

export async function searchWithoutPageReset() {
	const search_text = (document.getElementById("search-input") as HTMLInputElement)!.value;
	const search_version = (document.getElementById("version-input") as HTMLInputElement)!.value;
	const search_number = Math.round((document.getElementById("search-number-input") as HTMLInputElement)!.valueAsNumber / 2);

	let search_project_type: string | undefined = (document.getElementById("project-type-input") as HTMLSelectElement)!.value;
	if (search_project_type == "all") search_project_type = undefined;

	let mod_loader: string | undefined = (document.getElementById("mod-loader-input") as HTMLSelectElement)!.value;
	if (mod_loader == "any") mod_loader = undefined;

	const pair_search = (document.getElementById("pair-search-toggle") as HTMLInputElement)!.checked;

	const results = await searchCombined({
		query: search_text,
		version: sanitiseVersion(search_version),
		number: search_number,
		project_type: search_project_type ? search_project_type as UnifiedProjectType : undefined,
		pair_search: pair_search,
		mod_loader: mod_loader,
		page: getPage() - 1
	});

	console.log("Searching:", search_text, search_version);

	if (results) {
		const template = document.getElementById("SEARCH-RESULT-ITEM-TEMPLATE")! as HTMLTemplateElement;
		let result_list_widget = document.querySelector(".search-result-list")!;

		while (result_list_widget.firstChild) {
			result_list_widget.removeChild(result_list_widget.lastChild!);
		}

		if (results.length == 0) {
			showFail();
		}

		for (const result of results) {
			let clone = template.content.querySelector("div")!.cloneNode(true) as HTMLDivElement;

			(clone.querySelector(".-icon") as HTMLImageElement).src = result.icon_url;
			(clone.querySelector(".-title") as HTMLAnchorElement).innerText = result.title;
			(clone.querySelector(".-author") as HTMLSpanElement).innerText = result.author;
			(clone.querySelector(".-desc") as HTMLSpanElement).innerText = result.description;
			(clone.querySelector(".-downloads") as HTMLSpanElement).innerText = Intl.NumberFormat().format(result.downloads);

			if (!result.modrinth) {
				(clone.querySelector(".-modrinth-link") as HTMLSpanElement).hidden = true;
			}
			else {
				(clone.querySelector(".-modrinth-link") as HTMLAnchorElement).href = result.modrinth;
				(clone.querySelector(".-title") as HTMLAnchorElement).href = result.modrinth;
			}

			if (!result.curseforge) {
				(clone.querySelector(".-curseforge-link") as HTMLSpanElement).hidden = true;
			}
			else {
				(clone.querySelector(".-curseforge-link") as HTMLAnchorElement).href = result.curseforge;
				(clone.querySelector(".-title") as HTMLAnchorElement).href = result.curseforge;
			}

			if (result.follows) {
				(clone.querySelector(".-follows") as HTMLSpanElement).hidden = false;
				(clone.querySelector(".-follows-count") as HTMLSpanElement).innerText = Intl.NumberFormat().format(result.follows);
			}

			if (result.version) {
				(clone.querySelector(".-version") as HTMLSpanElement).hidden = false;
				(clone.querySelector(".-version-number") as HTMLSpanElement).innerText = result.version;
			}

			result_list_widget.appendChild(clone!);
		}
		result_list_widget.scrollTop = 0;
	}
	else {
		showFail();
	}
}

function sanitiseVersion(version: string) {
	const r = mcverIsValid(version);
	if (r == false) return undefined;
	else return version;
}

function registerPageChanger() {
	const page_picker = document.getElementById("search-page")!;
	page_picker.querySelector(".-down")!.addEventListener("click", pageDown);
	page_picker.querySelector(".-up")!.addEventListener("click", pageUp);
}

function changePage(change: number) {
	const page_picker = document.getElementById("search-page")!;
	const page_value_el = page_picker.querySelector(".-value")! as HTMLSpanElement;

	let page_number = parseInt(page_value_el.innerText);
	page_number += change;

	const min = 1;
	const max = 100;
	page_number = Math.min(Math.max(page_number, min), max);

	page_value_el.innerText = page_number.toString();
	searchWithoutPageReset();
}

function getPage(): number {
	const page_picker = document.getElementById("search-page")!;
	const page_value_el = page_picker.querySelector(".-value")! as HTMLSpanElement;
	let page_number = parseInt(page_value_el.innerText);

	if (Number.isInteger(page_number)) return page_number;
	else return 1;
}

function pageUp() {
	changePage(1);
}

function pageDown() {
	changePage(-1);
}

function pageReset() {
	changePage(-9999);
}

function search() {
	pageReset();
	searchWithoutPageReset();
}