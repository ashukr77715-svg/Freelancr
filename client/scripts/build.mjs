// Build via Vite's Node API instead of the node_modules/.bin/vite shim.
// Some hosts (e.g. Hostinger) install dependencies without an execute bit
// on the .bin shims, which breaks `vite build` with "Permission denied"
// (npm error code 126). Running through `node` sidesteps that entirely —
// Node executes, and it just reads Vite as a module wherever it's installed.
import { build } from "vite";

try {
  await build();
} catch (err) {
  console.error("Vite build failed:", err);
  process.exit(1);
}
