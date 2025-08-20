
export type ModrinthSearchResponse = {
	hits: ModrinthProjectResponse[];
	offset: number;
	limit: number;
	total_hits: number;
}

export type ModrinthProjectResponse = {
	// PROJECT INFO //
	project_id: string;
	slug: string;
	title: string;
	author: string;
	description: string;
	icon_url: string;

	// METADATA //
	categories: string[];
	versions: string[];
	project_type: "mod" | "modpack" | "resourcepack" | "shader" | "datapack" | "plugin";
	
	// NUMBERS //
	downloads: number;
	follows: number;
}