import { SearchCacheInstance } from "../modules/search_cache";
import type { APIQueryParameters, SearchRequestParameters, SearchResult, UnifiedSearchOptions } from "../types/api-access";
import { CurseForgeClient } from "./curseforge-api";
import { modrinthSearch } from "./modrinth-api";
import Fuse from "fuse.js";
import {compare, valid} from "semver";

export class SearchResults {
	public results: SearchResult[];
	public options: UnifiedSearchOptions;
	public download_weight: number = 0.0625;
	public sorted: boolean = false;

	constructor(search_options: UnifiedSearchOptions, search_results: SearchResult[]) {
		this.options = search_options;
		this.results = search_results;

		if (!this.options.number) {
			this.options.number = 25;
		}
	}

	public sort() {
		const fuse = new Fuse(this.results, {
			keys: [
				{name: "title", weight: 2},
				{name: "description", weight: 1},
				{name: "author", weight: 1},
				{name: "slug", weight: 1}
			],
			includeScore: true,
			findAllMatches: true,
			fieldNormWeight: 2
		});

		// Sort by relevance to query
		if (this.options.query) {
			let tokens = this.options.query.split(" ");
			let stitched_tokens = "";

			for (let i = 0; i < tokens.length; i++) {
				let token = tokens[i];
				if (i > 0) {
					token = ` '${token}`;
				}
				stitched_tokens = stitched_tokens + token;
			}

			const fuse_results = fuse.search(stitched_tokens);

			// Assign weight based on relevance
			for (const fuse_result of fuse_results) {
				this.results[fuse_result.refIndex].weight += Math.tan(1 - fuse_result.score!);
			}

			// Sort by download count
			this.results.sort((a, b) => {
				return (b.weight + ((b.weight > 1.5) ? (Math.pow((b.downloads / a.downloads), this.download_weight)) : (Math.pow((b.downloads / a.downloads), this.download_weight/4))))
				- (a.weight + ((b.weight > 1.5) ? (Math.pow((a.downloads / b.downloads), this.download_weight)) : (Math.pow((a.downloads / b.downloads), this.download_weight/4))));
			});
		}
		// Otherwise sort only by download count
		else {
			this.results.sort((a, b) => b.downloads - a.downloads);
		}
		this.sorted = true;
	}

	/** Returns all results in the form of a search result array */
	public get all() {
		return this.results;
	}

	/** Returns only results on page index */
	public async getPage(page: number) {
		let sliced =  this.results.slice(
			page * this.options.number!,
			(page + 1) * this.options.number!
		);
		if (sliced.length != this.options.number) {
			console.info("Requesting new items for deep search", this.options.number!-sliced.length)

			const new_results = await makeDeeperSearchRequest(Math.floor(this.results.length / 50), this.options);
			new_results.sort();
			this.results = this.results.concat(new_results.all);
			
			// Done - reslice results again
			sliced = this.results.slice(
				page * this.options.number!,
				(page + 1) * this.options.number!
			);
		}
		return sliced;
	}

	public expand(expansion: SearchResults) {
		this.results = this.results.concat(expansion.all);
	}

}


export async function requestPage(options: UnifiedSearchOptions): Promise<SearchResult[]> {
	const progress_indicator = document.getElementById("search-progress-indicator") as HTMLParagraphElement;
	let results = undefined;

	// Get raw results (simple search - not cached)
	if (options.simple_search !== false) {
		console.info("Making a simple search request");
		results = await makeSimpleSearchRequest(options);
	}

	// Get raw results (deep search - cached)
	else {
		const existing_results = SearchCacheInstance.findInCache(options);
		if (existing_results) {
			console.info("Getting cached results for deep search, no API queries made");
			console.log("Search cache state:", SearchCacheInstance);
			results = existing_results;
			if (results.options.number != options.number) {
				console.warn("Page size was changed, updating cached results object accordingly");
				results.options.number = options.number;
			}
		}
		else {
			console.info("Making a request for a deep search");
			results = await makeDeepSearchRequest(options);
		}
	}

	// Sort results
	progress_indicator.innerText = "Sorting...";
	if (!results?.sorted) results?.sort();

	// Done
	progress_indicator.innerText = "";

	if (options.simple_search) return results!.all;
	else return await results!.getPage(options.page) as SearchResult[];
}


/** Make a DEEP search request - returns a **cached** results object containing results for **more than one page**.
 *  Page size and index parameters are ignored and are set to 50 and 0 respectively.
 */
async function makeDeepSearchRequest(options: UnifiedSearchOptions) {
	const parameters: SearchRequestParameters = {
		page_size: 50,
		page_index: 0,
		search_term: options.query,
		project_type: options.project_type,
		version: options.version,
		mod_loader: options.mod_loader,
		pair_search: options.pair_search ? true : false,
		result_count: 100
	}
	const result_list = await makeSearchRequest(parameters);
	const results = new SearchResults(options, result_list);
	SearchCacheInstance.addToCache(results);
	return results;
}

/** Make a DEEP search request - returns an **uncached** results object containing results for **more than one page**.
 *  Page size is set to 50. Provide a page index to start at.
*/
async function makeDeeperSearchRequest(index: number, options: UnifiedSearchOptions) {
	const parameters: SearchRequestParameters = {
		page_size: 50,
		page_index: index,
		search_term: options.query,
		project_type: options.project_type,
		version: options.version,
		mod_loader: options.mod_loader,
		pair_search: options.pair_search ? true : false,
		result_count: 100
	}
	const result_list = await makeSearchRequest(parameters);
	const results = new SearchResults(options, result_list);
	return results;
}


/** Make a SIMPLE search request - returns an **uncached** results object for **one** specific page of **one** specific query */
async function makeSimpleSearchRequest(options: UnifiedSearchOptions) {
	const parameters: SearchRequestParameters = {
		page_size: options.number,
		page_index: options.page,
		search_term: options.query,
		project_type: options.project_type,
		version: options.version,
		mod_loader: options.mod_loader,
		pair_search: options.pair_search ? true : false
	}
	const results = await makeSearchRequest(parameters);
	return new SearchResults(options, results);
}


/** Make a search request to CurseForge and Modrinth APIs - returns a **list** of raw, unsorted search results.
 *  You can request more than one page of results.
*/
async function makeSearchRequest(parameters: SearchRequestParameters): Promise<SearchResult[]> {
	const progress_indicator = document.getElementById("search-progress-indicator") as HTMLParagraphElement;

	const query_parameters: APIQueryParameters = {
		page_size: parameters.page_size,
		page_index: parameters.page_index,
		search_term: parameters.search_term,
		project_type: parameters.project_type,
		version: parameters.version,
		mod_loader: parameters.mod_loader,
	}

	progress_indicator.innerText = "Searching Modrinth...";
	let modrinthResults = await modrinthSearch(query_parameters);

	progress_indicator.innerText = "Searching CurseForge...";
	let curseforgeResults = await CurseForgeClient.Instance.simpleSearch(query_parameters);

	// If the amount of requested results is higher than the page allows,
	// ask a couple more times
	if (parameters.result_count && parameters.result_count > parameters.page_size) {
		const n = parameters.result_count;
		const m = parameters.page_size;

		for (let i = 1; i < (Math.floor((n - 1) / m) + 1); i++) {
			const x = ((i + 1) * m < n) ? (m) : (n - (i*m));

			query_parameters.page_index += 1;

			progress_indicator.innerText = "Searching Modrinth...";
			let mr = await modrinthSearch(query_parameters);
			progress_indicator.innerText = "Searching CurseForge...";
			let cr = await CurseForgeClient.Instance.simpleSearch(query_parameters);

			modrinthResults = modrinthResults.concat(mr.slice(0, x));
			curseforgeResults = curseforgeResults.concat(cr.slice(0, x));
		}
	}
	
	let results: SearchResult[] = [];

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
		} as SearchResult;

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
				} as SearchResult;

				results.push(item);
			}
		}
	}
	else console.warn("Could not retrieve any results for CurseForge");

	// Perform a pair search if desired
	if (parameters.pair_search) {
		console.info("Performing a pair search, this may take a bit...");
		progress_indicator.innerText = "Performing a pair search, this may take a bit...";
		
		let i = 0;
		for (const result of results) {
			progress_indicator.innerText = `Performing a pair search, this may take a bit... (${Math.round(i / results.length * 100)}%)`; i++;

			if (!result.curseforge) {
				const deep_results = await CurseForgeClient.Instance.simpleSearch({
					search_term: result.title,
					project_type: parameters.project_type,
					page_size: 5,
					page_index: 0
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
					search_term: result.title,
					project_type: parameters.project_type,
					page_size: 5,
					page_index: 0
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
	progress_indicator.innerText = "";
	return results;
}