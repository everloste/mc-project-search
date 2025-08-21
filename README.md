## Minecraft Project Search
A simple tool for combined searching of both CurseForge and Modrinth projects.

It implements its own sorting algorithm for hopefully better results,
though still relies on Modrinth and CurseForge search.

### Results comparison
Here is a comparison of top results between this tool and the CurseForge and Modrinth websites.
The searched term is **"minimap"** and no project type is set. Modrinth's website does not have an option for searching all project types, so the shown screen is mods.

I will make further adjustments as I work on the tool, but I think it's decent for now.

![search_comparison](https://github.com/user-attachments/assets/70882704-7866-496d-9976-ffce093fec71)

### To-do
- Search by mod loader (easy enough)
- Search by author username (a tad complicated for CF but doable)
- Search by project category
    - Relatively simple for resource pack resolution (16x, 32x, etc.)
    - For other categories maybe implement a category search which will automatically match best available categories?
