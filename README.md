# Pickaxe Drop Astra

A small Three.js experiment: falling pickaxes against a destructible 8 × 5 cube wall. No physics engine, gameplay, or external assets.

## Run

Node.js 20.19+ or 22.12+. Run `npm ci`, then `npm run dev`. `npm test` checks physics; `npm run build` produces a portable static site in `dist`.

## Controls

- **Drop Pickaxe** drops one body; **Drop Many** drops eight.
- Drag to orbit; scroll or pinch to zoom.
- **D** toggles probes, swept paths, center of mass, velocity, angular axis, contact normals, and impact counts.
- Reload to rebuild the wall.

## Implementation

`src/physics.js` contains the single tuning object, `PickaxeBody`, `BlockWorld`, and `PickaxeSimulator`. Physics state is independent of meshes. Semi-implicit Euler and world-space quaternion integration run at 120 Hz with an accumulator, interpolation, and angular substeps. Twelve spherical probes sweep expanded AABBs and the floor. Earliest contacts rewind the body before normal and Coulomb-friction impulses; off-center impulses change angular velocity using scalar inertia. Broken blocks are removed immediately and the remaining timestep continues at reduced speed. Low-energy supported bodies sleep.

`src/main.js` builds the scene and primitive pickaxe, binds controls, draws debug geometry, and renders cosmetic debris. Three.js is the only runtime dependency. Vite only bundles the site.

Deliberate limits: probe-based approximation, scalar inertia, static surviving blocks, no pickaxe-to-pickaxe collision. Small rotational substeps approximate curved sweeps. A fixed 40-block mathematical broad phase is appropriate for this scene. Up to 100 bodies are kept; sleeping bodies are recycled first. These limits keep this a small experiment rather than a general physics engine.

Published to GitHub Pages via the included Actions workflow.
