import { curseForgeSearch } from "./curseforge-api";
import { modrinthSearch } from "./modrinth-api";

export type searchResults = searchResult[];

export type searchResult = {
	slug: string;
	title: string;
	description: string;
	author: string;
	icon_url: string;

	curseforge?: string;
	modrinth?: string;

	downloads: number;
}

export type UnifiedSearchOptions = {
	query: string;
	number?: number;
	version?: string;
	page?: number;
	project_type?: UnifiedProjectType;
	pair_search?: boolean;
}

export type UnifiedProjectType = "mod" | "datapack" | "resourcepack" | "modpack" | "plugin" | "shader";

export async function searchCombined(options: UnifiedSearchOptions) {
	let results: searchResult[] = [];

	const progress_indicator = document.getElementById("search-progress-indicator") as HTMLParagraphElement;
	

	console.time("Got responses from Modrinth and CurseForge");
	progress_indicator.innerText = "Searching Modrinth...";
	const modrinthResults = await modrinthSearch(options);
	progress_indicator.innerText = "Searching CurseForge...";
	const curseforgeResults = await curseForgeSearch(options);
	console.timeEnd("Got responses from Modrinth and CurseForge");

	// Process Modrinth result as our base results
	for (const result of modrinthResults) {
		let item = {
			slug: result.slug,
			title: result.title,
			description: result.description,
			author: result.author,
			icon_url: result.icon_url,
			modrinth: `https://modrinth.com/project/${result.slug}`,
			downloads: result.downloads
		} as searchResult;

		const cf_equivalent = curseforgeResults.find(
			(value) => value.slug == item.slug || value.name == item.title
		);

		if (cf_equivalent) {
			item.curseforge = `https://www.curseforge.com/minecraft/${cf_equivalent.class.slug}/${cf_equivalent.slug}`;
			item.downloads += cf_equivalent.downloads;
		}

		results.push(item);
	}

	// Process CurseForge results and add them on top of Modrinth
	if (curseforgeResults) {
		for (const cf_result of curseforgeResults) {
			if (!(results.find((result) => result.slug == cf_result.slug || result.title == cf_result.name))) {
				let item = {
					curseforge: `https://www.curseforge.com/minecraft/${cf_result.class.slug}/${cf_result.slug}`,
					slug: cf_result.slug,
					title: cf_result.name,
					description: cf_result.summary,
					author: cf_result.author.username,
					icon_url: cf_result.avatarUrl,
					downloads: cf_result.downloads
				} as searchResult;

				results.push(item);
			}
		}
	}
	else console.warn("Could not retrieve any results for CurseForge");

	// Sort results by download count
	progress_indicator.innerText = "Sorting...";
	results.sort((a, b) => b.downloads - a.downloads);

	// Perform a pair search if desired
	if (options.pair_search) {
		console.info("Performing a pair search, this may take a bit...");
		progress_indicator.innerText = "Performing a pair search, this may take a bit...";
		
		let i = 0;
		for (const result of results) {
			progress_indicator.innerText = `Performing a pair search, this may take a bit... (${Math.round(i / results.length * 100)}%)`; i++;

			if (!result.curseforge) {
				const deep_results = await curseForgeSearch({
					query: result.title,
					project_type: options.project_type,
					number: 5
				});
				if (deep_results) {
					const match = deep_results.find((value) => value.slug == result.slug || value.name == result.title);
					if (match) {
						result.curseforge = `https://www.curseforge.com/minecraft/${match.class.slug}/${match.slug}`;
						result.downloads += match.downloads;
					}
				}
				else console.warn(`No results found on CurseForge for '${result.slug}' - '${result.title}'`);
			}

			else if (!result.modrinth) {
				const deep_results = await modrinthSearch({
					query: result.title,
					project_type: options.project_type,
					number: 5
				});
				if (deep_results) {
					const match = deep_results.find((value) => value.slug == result.slug || value.title == result.title);
					if (match) {
						result.modrinth = `https://modrinth.com/project/${match.slug}`;
						result.downloads += match.downloads;
					}
				}
				else console.warn(`No results found on Modrinth for '${result.slug}' - '${result.title}'`);
			}
		}
	}
	progress_indicator.innerText = "";
	return results;
}