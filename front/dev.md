## `ng serve` vs `ng build`
1. `ng serve` => Fast local development, stores everything in RAM
2. `ng build` => Production or Homolog. It reads your entire codebase, compiles TypeScript, minifies CSS/JS, copies assets, and writes physical files to your hard drive, placing everything inside the `dist/` folder.

> You should delete the Angular cache—located at `.angular/cache` in the project root everytime you modify `angular.json` in the development environment running with `ng serve`.

