declare module "astro:actions" {
	type Actions = typeof import("C:/Users/Santiago Delgado/music-landing/src/actions/index.ts")["server"];

	export const actions: Actions;
}