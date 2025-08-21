import type { ModrinthProjectResponse, ModrinthSearchResponse } from "../types/modrinth-api";
import type { UnifiedSearchOptions } from "./combined-api";

export async function modrinthSearch(options: UnifiedSearchOptions): Promise<ModrinthProjectResponse[]> {
	if (!options.number) options.number = 10;
	if (!options.page) options.page = 0;

	let url = `https://api.modrinth.com/v2/search?query=${options.query}&limit=${options.number}&offset=${options.page * options.number}`;
	if (options.version || options.project_type || options.mod_loader) url = url + createFacets(options.version, options.project_type, options.mod_loader);
	
	try {
		const http_response = await fetch(url, {method: "GET"});
		const response = await http_response.json() as ModrinthSearchResponse;
		return response.hits;
	}
	catch (error) {
		console.error("Failed to retrieve Modrinth search data");
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