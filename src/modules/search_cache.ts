import type { SearchResults } from "../queries/combined-api";
import type { UnifiedSearchOptions } from "../types/api-access";

export class SearchCache {
	private static instance: SearchCache;
    private cache: SearchResults[] = [];
    public limit: number = 20;

	public static get Instance() {
		return this.instance || (this.instance = new this());
	}

    public test() {
        console.log(this.cache);
    }

    public addToCache(search_results_instance: SearchResults) {
        this.cache.push(search_results_instance);

        if (this.cache.length > this.limit) {
            console.warn("Cache has gone over limit of ", this.limit);
            console.info("Removing first 10 items from cache");
            this.cache = this.cache.slice(10, undefined);
        }
    }

    public findInCache(options: UnifiedSearchOptions) {
        const result = this.cache.find(
            (value) => value.options.query == options.query
            && value.options.mod_loader == options.mod_loader
            && value.options.version == options.version
            && value.options.project_type == options.project_type
        );
        if (result) return result;
        else return null;
    }
}

export const SearchCacheInstance = SearchCache.Instance;
