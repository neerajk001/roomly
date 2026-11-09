# Landing room concepts

Generated with the built-in imagegen tool for the landing-page demonstration.
These are illustrative scenes and redesign concepts, not customer projects or
a benchmark of the application's image provider.

Final files: `apps/web/public/demo/redesign/` (16 WebP assets, 1440 × 1080).
Full prompts and source history: [landing-image-prompts.json](landing-image-prompts.json).

The ten approved clean-design files remain byte-for-byte unchanged. The six
current before scenes were edited from those finished designs to show realistic
clutter, mismatched furnishings and unfinished styling. The camera, room shape,
windows and doors were specified as invariants for aligned comparisons.

| Current before                   | Approved clean design                                                                                  | Uses                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `living-before-unfinished.webp`  | `hero-after-modern.webp`, `hero-after-minimal.webp`, `hero-after-boho.webp`, `hero-after-classic.webp` | Hero, living gallery, process |
| `bedroom-before-unfinished.webp` | `bedroom-after.webp`                                                                                   | Bedroom gallery               |
| `kitchen-before-unfinished.webp` | `kitchen-after.webp`                                                                                   | Kitchen gallery               |
| `office-before-unfinished.webp`  | `office-after.webp`                                                                                    | Office gallery                |
| `dining-before-unfinished.webp`  | `dining-after.webp`                                                                                    | Dining gallery                |
| `bath-before-unfinished.webp`    | `bath-after.webp`                                                                                      | Bathroom gallery              |

Clean concepts are also reused in feature cards and the final CTA. The process's
last step uses the unchanged `living-refined.webp`, showing sage walls and a floor
lamp added to the modern concept to match the displayed chat request.

The six earlier ordinary before images were removed from the project. Their
historical generation prompts remain under `supersededSourcePrompts`, since the
approved clean designs were originally generated from those earlier scenes.
Current before prompts explicitly name the approved clean image used as reference.

Seven unused legacy stock files were also removed, including the unrelated dress
photo. Older photos still referenced by onboarding, the wizard or inspiration
remain in place; profile avatars are separate from room demonstrations.

Original imagegen PNGs remain in Codex's generated-images directory. Project
WebPs preserve the full 4:3 frame without cropping or baked-in UI labels. New
before filenames avoid browsers showing a cached superseded scene.
