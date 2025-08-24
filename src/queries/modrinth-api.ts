import type { ModrinthProjectResponse, ModrinthSearchResponse } from "../types/modrinth-api";
import type { APIQueryParameters } from "../types/api-access";

export async function modrinthSearch(options: APIQueryParameters): Promise<ModrinthProjectResponse[]> {
	let p = options.page_index;
	let s = options.page_size;

	// Check values are correct
	if (s > 100) {
		console.warn("Modrinth has a maximum page size of 100, but size is set to", s);
		s = 100;
	}
	if (p < 0) {
		console.warn("Page index cannot be negative", p);
		p = 0;
	}

	let url = `https://api.modrinth.com/v2/search?limit=${s}&offset=${p * s}`;

	// Add filters to search if needed
	if (options.search_term) url = url + `&query=${options.search_term}`;
	if (options.version || options.project_type || options.mod_loader) url = url + createFacets(options.version, options.project_type, options.mod_loader);
	
	try {
		// Fetch data from Modrinth
		const response = await fetch(url, {method: "GET"});
		const body = await response.json() as ModrinthSearchResponse;
		return body.hits;
	}
	catch (error) {
		console.error("Failed to retrieve Modrinth search data -", url, error);
		return [];
	}
}

function createFacets(
	version: string | undefined = undefined,
	project_type: string | undefined = undefined,
	mod_loader: string | undefined = undefined)
{
	let facets_string = "&facets=[";
	let facets = [];

	if (version) facets.push(`["versions:${version}"]`);
	if (project_type) facets.push(`["project_type:${project_type}"]`);
	if (mod_loader) facets.push(`["categories:${mod_loader}"]`);

	for (let index = 0; index < facets.length; index++) {
		const facet = facets[index];
		facets_string = facets_string + facet;
		if (index != facets.length - 1) facets_string = facets_string + ",";
	}

	facets_string = facets_string + "]";
	console.log(facets_string);
	return facets_string;
}