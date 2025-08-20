import type { ModrinthProjectResponse, ModrinthSearchResponse } from "../types/modrinth-api";
import type { UnifiedSearchOptions } from "./combined-api";

export async function modrinthSearch(options: UnifiedSearchOptions): Promise<ModrinthProjectResponse[]> {
	if (!options.number) options.number = 10;
	if (!options.page) options.page = 0;

	let url = `https://api.modrinth.com/v2/search?query=${options.query}&limit=${options.number}&offset=${options.page * options.number}`;
	if (options.version && options.project_type) url = url + `&facets=[["versions:${options.version}"],["project_type:${options.project_type}"]]`;
	else if (options.version) url = url + `&facets=[["versions:${options.version}"]]`;
	else if (options.project_type) url = url + `&facets=[["project_type:${options.project_type}"]]`;

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