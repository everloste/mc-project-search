import type { CurseForgeProjectResponse, CurseForgeSearchResponse } from "../types/curseforge-api";
import type { APIQueryParameters } from "../types/api-access";

// export async function curseForgeSearch(options: UnifiedSearchOptions): Promise<CurseForgeProjectResponse[]> {
// 	if (!options.number) options.number = 25;
// 	let p = options.page;
// 	let n = options.number;

// 	if (options.simple_search === false) n = 100;

// 	let project_class = undefined;
// 	if (options.project_type) {
// 		switch (options.project_type) {
// 			case "mod": project_class = 6; break;
// 			case "datapack": project_class = 6945; break;
// 			case "modpack": project_class = 4471; break;
// 			case "plugin": project_class = 5; break;
// 			case "resourcepack": project_class = 12; break;
// 			case "shader": project_class = 6552; break;
// 		}
// 	}

// 	let mod_loader = undefined;
// 	if (options.mod_loader) {
// 		switch (options.mod_loader) {
// 			case "forge": mod_loader = 1; break;
// 			case "neoforge": mod_loader = 6; break;
// 			case "fabric": mod_loader = 4; break;
// 			case "quilt": mod_loader = 5; break;
// 		}
// 	}

// 	// if resource pack and category id 5193 the pack is actually a data pack - implement this later (slug = "data-packs")

// 	try {
// 		let dataset: CurseForgeProjectResponse[] = [];

// 		for (let i = 0; i < (Math.floor((n - 1) / 50) + 1); i++) {
// 			const x = ((i + 1) * 50 < n) ? (50) : (n - (i*50));

// 			let url = `https://www.curseforge.com/api/v1/mods/search?gameId=432&index=${p + i}&pageSize=${50}&sortField=1&filterText=${options.query}`;
// 			if (options.version) url = url + `&gameVersion=${options.version}`;
// 			if (project_class) url = url + `&classId=${project_class}`;
// 			if (mod_loader) url = url + `&gameFlavors[0]=${mod_loader}`;

// 			const http_response = await fetch(url, {method: "GET"});
// 			const response = await http_response.json() as CurseForgeSearchResponse;

// 			// Filter out data packs from resource pack results
// 			if (options.project_type == "resourcepack") response.data = response.data.filter((value) => undefined == value.categories.find((value2) => value2.slug == "data-packs"));

// 			dataset = dataset.concat(response.data);
// 		}
// 		return dataset;
// 	}
// 	catch (error) {
// 		console.error("Failed to retrieve CurseForge search data - ", error);
// 		return [];
// 	}
// }

// export async function curseforgeProjectExists(ID: number) {
// 	const http_response = await fetch(`https://www.curseforge.com/api/v1/mods/${ID}/files?pageIndex=0&pageSize=1&sort=dateCreated&sortDescending=true&removeAlphas=true`, {
// 		method: "GET"
// 	});
// 	const response = await http_response.json() as {data: object[]};

// 	if (response.data.length != 0) return true;
// 	else return false;
// }

export class CurseForgeClient {
	private static instance: CurseForgeClient;

	private projectTypeIDs: {[key: string]: number} = {
		"mod": 6,
		"datapack": 6945,
		"modpack": 4471,
		"plugin": 5,
		"resourcepack":12,
		"shader": 6552
	}
	
	private modLoaderIDs: {[key: string]: number} = {
		"forge": 1,
		"neoforge": 6,
		"fabric": 4,
		"quilt": 5
	}

	public static get Instance() {
		return this.instance || (this.instance = new this());
	}

	public modLoaderToID(mod_loader: string | undefined) {
		if (mod_loader && mod_loader in this.modLoaderIDs) return this.modLoaderIDs[mod_loader];
		else return undefined;
	}

	public projectTypeToID(type: string | undefined) {
		if (type && type in this.projectTypeIDs) return this.projectTypeIDs[type];
		else return undefined;
	}

	public async simpleSearch(options: APIQueryParameters): Promise<CurseForgeProjectResponse[]> {
		let p = options.page_index;
		let s = options.page_size;
		let term = options.search_term;

		// Check values are correct
		if (s > 50) {
			console.warn("CurseForge has a maximum page size of 50, but size is set to", s);
			s = 50;
		}
		if (p < 0) {
			console.warn("Page index cannot be negative", p);
			p = 0;
		}

		let url = `https://www.curseforge.com/api/v1/mods/search?gameId=432&sortField=1&pageSize=${s}&index=${p}`;

		// Add filters to search if needed
		if (term) {
			term = term.replaceAll(" ", "+");
			url = url + `&filterText=${term}`;
		}
		if (options.version) url = url + `&gameVersion=${options.version}`;
		const project_class = this.projectTypeToID(options.project_type);
		const loader_class = this.modLoaderToID(options.mod_loader);
		if (project_class) url = url + `&classId=${project_class}`;
		if (loader_class) url = url + `&gameFlavors[0]=${loader_class}`;

		try {
			// Fetch data from CurseForge
			const response = await fetch(url, {method: "GET"});
			const body = await response.json() as CurseForgeSearchResponse;

			// Filter out data packs from resource pack results
			if (options.project_type == "resourcepack") body.data = body.data.filter((value) => undefined == value.categories.find((value2) => value2.slug == "data-packs"));

			if (body.data == undefined) return [];
			return body.data;
		}
		catch (error) {
			console.error("Failed to retrieve CurseForge search data -", url, error);
			return [];
		}
	}
}