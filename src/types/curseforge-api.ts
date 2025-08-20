export type CurseForgeSearchResponse = {
	pagination: {
		index: number;
		pageSize: number;
		totalCount: number;
	};
	data: CurseForgeProjectResponse[];
}

export type CurseForgeProjectResponse = {
	// PROJECT INFO //
	id: number;
	slug: string;
	name: string;
	summary: string;
	author: {
		id: number;
		name: string;
		username: string;
	};
	avatarUrl: string;

	// METADATA //
	thumbnailUrl: string;
	categories: {
		id: number;
		slug: string;
		name: string;
		url: string;
		classId: number;
		parentCategoryId: number;
	}[];
	gameVersion: string;
	class: {
		id: number;
		gameId: number;
		slug: "mc-mods" | "customization" | string;
		url: string;
	};
	
	// NUMBERS //
	downloads: number;
}