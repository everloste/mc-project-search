import { searchCombined, type UnifiedProjectType } from "./queries/combined-api";

document.getElementById("search-input")!.addEventListener("change", search);
document.getElementById("search-button")!.addEventListener("click", search);

search();

function sanitiseVersion(version: string) {
	const parts = version.trim().split(".");

	if (parts.length < 2 || parts.length > 3) {
		return undefined;
	}
	if (parts[0] != "1" || parseInt(parts[1]) > 21 || parseInt(parts[1]) < 0) {
		return undefined;
	}

	return version;
}

async function search() {
	const search_text = (document.getElementById("search-input") as HTMLInputElement)!.value;
	const search_version = (document.getElementById("version-input") as HTMLInputElement)!.value;
	const search_number = Math.round((document.getElementById("search-number-input") as HTMLInputElement)!.valueAsNumber / 2);

	let search_project_type: string | undefined = (document.getElementById("project-type-input") as HTMLSelectElement)!.value;
	if (search_project_type == "all") search_project_type = undefined;

	const pair_search = (document.getElementById("pair-search-toggle") as HTMLInputElement)!.checked;

	const results = await searchCombined({
		query: search_text,
		version: sanitiseVersion(search_version),
		number: search_number,
		project_type: search_project_type ? search_project_type as UnifiedProjectType : undefined,
		pair_search: pair_search
	});

	console.log("Searching:", search_text, search_version);

	if (results) {
		const template = document.getElementById("SEARCH-RESULT-ITEM-TEMPLATE")! as HTMLTemplateElement;
		let result_list_widget = document.querySelector(".search-result-list")!;

		while (result_list_widget.firstChild) {
			result_list_widget.removeChild(result_list_widget.lastChild!);
		}

		for (const result of results) {
			let clone = template.content.querySelector("div")!.cloneNode(true) as HTMLDivElement;

			(clone.querySelector(".-icon") as HTMLImageElement).src = result.icon_url;
			(clone.querySelector(".-title") as HTMLSpanElement).innerText = result.title;
			(clone.querySelector(".-author") as HTMLSpanElement).innerText = result.author;
			(clone.querySelector(".-desc") as HTMLSpanElement).innerText = result.description;
			(clone.querySelector(".-downloads") as HTMLSpanElement).innerText = Intl.NumberFormat().format(result.downloads);

			if (!result.curseforge) {
				(clone.querySelector(".-curseforge-link") as HTMLSpanElement).hidden = true;
			}
			else {
				(clone.querySelector(".-curseforge-link") as HTMLAnchorElement).href = result.curseforge;
			}

			if (!result.modrinth) {
				(clone.querySelector(".-modrinth-link") as HTMLSpanElement).hidden = true;
			}
			else {
				(clone.querySelector(".-modrinth-link") as HTMLAnchorElement).href = result.modrinth;
			}

			result_list_widget.appendChild(clone!);
		}
	}
}