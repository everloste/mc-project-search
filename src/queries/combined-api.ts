import { curseForgeSearch } from "./curseforge-api";
import { modrinthSearch } from "./modrinth-api";
import Fuse from "fuse.js";
import {compare, valid} from "semver";

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
	follows?: number;
	weight: number;
	version?: string;
}

export type UnifiedSearchOptions = {
	query: string;
	number?: number;
	version?: string;
	page?: number;
	project_type?: UnifiedProjectType;
	pair_search?: boolean;
	mod_loader?: string;
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
	for (const mr_result of modrinthResults) {
		let final_result = {
			slug: mr_result.slug,
			title: mr_result.title,
			description: mr_result.description,
			author: mr_result.author,
			icon_url: mr_result.icon_url,
			modrinth: `https://modrinth.com/project/${mr_result.slug}`,
			downloads: mr_result.downloads,
			follows: mr_result.follows,
			version: mr_result.versions.at(-1),
			weight: (mr_result.downloads > 1000) ? (mr_result.follows / mr_result.downloads * 25) : (mr_result.follows / mr_result.downloads * 5)
		} as searchResult;

		const cf_equivalent = curseforgeResults.find(
			(cf_result) => cf_result.slug == final_result.slug || (cf_result.name == final_result.title && cf_result.author.username == final_result.author)
		);

		if (cf_equivalent) {
			final_result.curseforge = `https://www.curseforge.com/minecraft/${cf_equivalent.class.slug}/${cf_equivalent.slug}`;
			final_result.downloads += cf_equivalent.downloads;

			if (final_result.version && valid(final_result.version) && valid(cf_equivalent.gameVersion) && compare(final_result.version, cf_equivalent.gameVersion) < 0) {
				final_result.version = cf_equivalent.gameVersion;
			}
		}

		results.push(final_result);
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
					version: cf_result.gameVersion,
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

						if (result.version && valid(result.version) && valid(match.gameVersion) && compare(result.version, match.gameVersion) < 0) {
							result.version = match.gameVersion;
						}
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
						result.follows = match.follows;

						if (result.version && match.versions.length != 0 && valid(result.version) && valid(match.versions.at(-1)!) && compare(result.version, match.versions.at(-1)!) < 0) {
							result.version = match.versions.at(-1);
						}
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