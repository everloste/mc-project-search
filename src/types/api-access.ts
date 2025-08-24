

export type UnifiedSearchOptions = {
	// Settings
	simple_search?: boolean;
	pair_search?: boolean;
	page: number;
	number: number;

	// Filters
	query?: string;
	version?: string;
	project_type?: UnifiedProjectType;
	mod_loader?: string;
};

export type SearchRequestParameters = {
    page_size: number;
    page_index: number;
	pair_search: boolean;
	result_count?: number;
	
	search_term?: string;
	version?: string;
	project_type?: UnifiedProjectType;
	mod_loader?: string;
}

/** Used by functions that make a single API query */
export type APIQueryParameters = {
    page_size: number;
    page_index: number;

    search_term?: string;
    version?: string;
    project_type?: UnifiedProjectType;
    mod_loader?: string;
};

export type SearchResult = {
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
};

export type UnifiedProjectType = "mod" | "datapack" | "resourcepack" | "modpack" | "plugin" | "shader";

