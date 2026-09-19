# Pickaxe Drop Astra

A Three.js custom-physics experiment with a 12 by 60 wall of 720 destructible blocks, pixel-style ores, and block-sized golden pickaxes. No physics engine or external game assets.

## Controls

- Drag to orbit the camera. Scroll or pinch to zoom.
- Double-click the scene to restore the front view and default zoom.
- Drop Pickaxe releases one body; Drop Many releases eight.
- D toggles physics debugging, including the rotation lock and depth corridor.
- Reload to restore the wall. One pickaxe drops on load.

The camera follows the newest drop while preserving your chosen orbit angle.

## Physics constraints

Pickaxes spin only around the wall-normal Z axis. X/Y angular velocity is zero and orientation is projected to a pure Z quaternion at insertion, each step, and after impulses. Collision response uses only the permitted Z torque and its corresponding effective inertia. Camera movement never changes these constraints.

Centers stay within wallCenterZ +/- corridorHalfDepth (default +/-0.14). Integration and positional collision corrections enforce this lane, cancel outward velocity without rebound, and damp depth motion. Linear X/Y movement remains free. Spawns stay three blocks inside the side edges.

src/physics.js contains the configuration, PickaxeBody, BlockWorld, and PickaxeSimulator. Independent physics state runs at 120 Hz with semi-implicit Euler, quaternion integration, angular substeps, swept spherical probes against expanded AABBs, collision/friction impulses, block damage, and sleeping. Smaller pickaxe probes and inertia match the 0.48 visual scale.

src/main.js renders the 3D scene, camera controls, and debug geometry. src/art.js draws original procedural pixel textures. The visual reference is https://github.com/vycdev/falling-pickaxe; no source code, textures, or audio from that repository are included.

Deliberate limits: scalar inertia, probe-based collision approximation, static surviving blocks, no body-to-body collisions, decorative side trim, and a 100-body limit that recycles sleeping bodies first.

## Development

Use Node.js 20.19+ or 22.12+. Run npm ci, then npm run dev. npm test checks physics constraints, collision behavior, and multi-body stability. npm run build produces a static dist folder. GitHub Actions tests and publishes pushes to main on GitHub Pages.

## Impact tuning

Head damage uses a 0.65 multiplier and blocks have 65 resistance (previously 1.25 and 38). Breaking a block applies a rebound impulse with 0.55 restitution and a minimum upward hop of 4.2 units/second. This makes the pickaxe jump out of a destroyed cell instead of carrying its downward speed through the column. The rebound still uses off-center Z torque and respects the hard X/Y rotation lock. Regression tests check that a fast downward strike breaks one block and then moves upward.
