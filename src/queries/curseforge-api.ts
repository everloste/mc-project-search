import type { CurseForgeProjectResponse, CurseForgeSearchResponse } from "../types/curseforge-api";
import type { UnifiedSearchOptions } from "./combined-api";

export async function curseForgeSearch(options: UnifiedSearchOptions): Promise<CurseForgeProjectResponse[]> {
	if (!options.number) options.number = 10;
	if (!options.page) options.page = 0;

	let project_class = undefined;
	if (options.project_type) {
		switch (options.project_type) {
			case "mod": project_class = 6; break;
			case "datapack": project_class = 6945; break;
			case "modpack": project_class = 4471; break;
			case "plugin": project_class = 5; break;
			case "resourcepack": project_class = 12; break;
			case "shader": project_class = 6552; break;
		}
	}
	// if resource pack and category id 5193 the pack is actually a data pack - implement this later (slug = "data-packs")

	let url = `https://www.curseforge.com/api/v1/mods/search?gameId=432&index=${options.page}&pageSize=${options.number}&sortField=1&filterText=${options.query}`;
	if (options.version) url = url + `&gameVersion=${options.version}`;
	if (project_class) url = url + `&classId=${project_class}`;
	
	try {
		const http_response = await fetch(url, {method: "GET"});
		const response = await http_response.json() as CurseForgeSearchResponse;

		// Filter out data packs from resource pack results
		if (options.project_type == "resourcepack") response.data = response.data.filter((value) => undefined == value.categories.find((value2) => value2.slug == "data-packs"));

		return response.data;
	}
	catch (error) {
		console.error("Failed to retrieve CurseForge search data");
		return [];
	}
}

export async function curseforgeProjectExists(ID: number) {
	const http_response = await fetch(`https://www.curseforge.com/api/v1/mods/${ID}/files?pageIndex=0&pageSize=1&sort=dateCreated&sortDescending=true&removeAlphas=true`, {
		method: "GET"
	});
	const response = await http_response.json() as {data: object[]};

	if (response.data.length != 0) return true;
	else return false;
}