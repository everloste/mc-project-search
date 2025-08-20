import { curseForgeSearch } from "./curseforge-api";
import { modrinthSearch } from "./modrinth-api";
import Fuse from "fuse.js";

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
	weight: number;
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
	if (!options.number) options.number = 25;

	const progress_indicator = document.getElementById("search-progress-indicator") as HTMLParagraphElement;
	
	progress_indicator.innerText = "Searching Modrinth...";
	const modrinthResults = await modrinthSearch(options);
	progress_indicator.innerText = "Searching CurseForge...";
	const curseforgeResults = await curseForgeSearch(options);


	// Process Modrinth result as our base results
	for (const result of modrinthResults) {
		let item = {
			slug: result.slug,
			title: result.title,
			description: result.description,
			author: result.author,
			icon_url: result.icon_url,
			modrinth: `https://modrinth.com/project/${result.slug}`,
			downloads: result.downloads,
			weight: (result.downloads > 1000) ? (result.follows / result.downloads * 25) : (result.follows / result.downloads * 5)
		} as searchResult;

		const cf_equivalent = curseforgeResults.find(
			(value) => value.slug == item.slug || (value.name == item.title && value.author.username == item.author)
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
			if (!(results.find((result) => result.slug == cf_result.slug || (result.title == cf_result.name && result.author == cf_result.author.username)))) {
				let item = {
					curseforge: `https://www.curseforge.com/minecraft/${cf_result.class.slug}/${cf_result.slug}`,
					slug: cf_result.slug,
					title: cf_result.name,
					description: cf_result.summary,
					author: cf_result.author.username,
					icon_url: cf_result.avatarUrl,
					downloads: cf_result.downloads,
					weight: 0
				} as searchResult;

				results.push(item);
			}
		}
	}
	else console.warn("Could not retrieve any results for CurseForge");

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
					const match = deep_results.find((value) => value.slug == result.slug || (value.name == result.title && value.author.username == result.author));
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
					const match = deep_results.find((value) => value.slug == result.slug || (value.title == result.title && value.author == result.author));
					if (match) {
						result.modrinth = `https://modrinth.com/project/${match.slug}`;
						result.downloads += match.downloads;
					}
				}
				else console.warn(`No results found on Modrinth for '${result.slug}' - '${result.title}'`);
			}
		}
	}

	// Sort results
	progress_indicator.innerText = "Sorting...";

	const fuse = new Fuse(results, {keys: ["title", "description", "author", "slug"], includeScore: true, findAllMatches: true, fieldNormWeight: 2});
	if (options.query != "") {
		const fuse_results = fuse.search(options.query);

		for (let index = 0; index < fuse_results.length; index++) {
			const fuse_result = fuse_results[index];
			results[fuse_result.refIndex].weight += Math.tan(1 - fuse_result.score!);
		}
	}
	const downloads_weight = 0.0625;
	results.sort((a, b) => {
		return (b.weight + Math.pow((b.downloads / a.downloads), downloads_weight)) - (a.weight + Math.pow((a.downloads / b.downloads), downloads_weight));
	});
	//results.sort((a, b) => b.downloads - a.downloads);

	// Done
	progress_indicator.innerText = "";
	return results;
}