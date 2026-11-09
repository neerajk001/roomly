# Landing room concepts

Generated with the built-in imagegen tool for the landing-page demonstration.
These are illustrative source scenes and redesign concepts, not customer projects
or a measured benchmark of the application's image provider.

Final files: `apps/web/public/demo/redesign/` (16 WebP assets, 1440 × 1080).
Full generation and edit prompts: [landing-image-prompts.json](landing-image-prompts.json).

| Source scene          | Redesign concepts                                                                                      | Uses                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `living-before.webp`  | `hero-after-modern.webp`, `hero-after-minimal.webp`, `hero-after-boho.webp`, `hero-after-classic.webp` | Hero, living-room gallery, process, homeowner feature, CTA |
| `bedroom-before.webp` | `bedroom-after.webp`                                                                                   | Bedroom gallery and concept card                           |
| `kitchen-before.webp` | `kitchen-after.webp`                                                                                   | Kitchen gallery and concept card                           |
| `office-before.webp`  | `office-after.webp`                                                                                    | Office gallery and professional feature                    |
| `dining-before.webp`  | `dining-after.webp`                                                                                    | Dining gallery                                             |
| `bath-before.webp`    | `bath-after.webp`                                                                                      | Bathroom gallery and concept card                          |

Each after image was edited from its paired source image with camera position,
room proportions, windows and doors specified as invariants. Furniture, decor,
paint and finishes provide the redesign. The hero's style choices all use the
same source room; the process illustrations reuse that room's original and results.

The process's final step uses `living-refined.webp`, edited from the modern concept
with the displayed request: “Make the walls sage green and add a floor lamp.”
It shows a refinement of the same concept rather than an unrelated room.

The original generated PNGs remain in Codex's generated-images directory. Project
assets are optimized WebP encodings with identical dimensions and no added labels
or cropping. UI labels provide before/after context. Old stock files are no longer
referenced as room examples; existing small profile avatars remain separate from
the room-transformation demonstrations.
