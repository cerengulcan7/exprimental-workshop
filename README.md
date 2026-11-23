# SCALE / 70 — WebXR Hand-Tracked Architectural Navigation

A no-build, no-backend, statically hosted project for **Meta Quest 3 Browser** (native WebXR hand tracking) and **desktop browsers** (MediaPipe Hand Landmarker with webcam). The same pure JavaScript gesture engine handles both modes.

**Verification status:** Gesture-engine unit tests are included and runnable without a device. **Immersive VR operation and real Quest 3 hand gestures have NOT been hardware-tested or certified here.** Actual availability depends on the installed Quest Browser, permissions, headset settings and hand-tracking support. See the manual acceptance checklist below.

## Run / publish using GitHub Pages

1. Create a GitHub repository, ideally named `webxr-quest3`.
2. Copy **the contents of this folder** into the repository root. The root must contain `index.html`, `css/`, `js/`, `assets/`, and `tests/`. Include the supplied `.nojekyll` file so Pages serves these files directly without Jekyll processing.
3. Commit and push. You do not need Node.js, a package manager, a server process, a build, a GitHub Actions build, or a backend.
4. In the GitHub repository open **Settings → Pages → Build and deployment → Deploy from a branch**; select **main** and **/(root)**, then Save.
5. Open `https://YOUR_USERNAME.github.io/webxr-quest3/`. For another repository name, substitute that name in the URL. On a custom domain, use that domain's HTTPS address.
6. Optionally test `https://YOUR_USERNAME.github.io/webxr-quest3/tests/gestures.test.html`.

**Important:** GitHub Pages serves your files over HTTPS; `getUserMedia` and immersive WebXR require a secure context. Opening `file:///.../index.html` is **not** supported for ES modules or camera access. If developing locally, an optional `python -m http.server 8000` provides `http://localhost:8000` (localhost is treated as secure by browsers); this local development convenience is **not required** for deployment. Library files, MediaPipe WASM and the pretrained model are fetched from pinned CDN/model URLs at runtime, so first use requires internet access. No backend calls or personal video uploads are implemented by this project; webcam frames are processed in the browser.

### Architecture

```text
webxr-quest3/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js            # renderer, event wiring and single render loop
│   ├── xr-manager.js      # session create/end, reference-space fallback
│   ├── hand-tracking.js   # native XRFrame.getJointPose() per hand
│   ├── gestures.js        # common, testable normalized-pinch engine
│   ├── locomotion.js      # world-metre locomotion and pivoting
│   ├── desktop-hands.js   # explicit camera permission and MediaPipe
│   ├── scene.js           # miniature-space architecture + glTF loader
│   └── xr-hud.js          # low peripheral XR hand/action indicator
├── assets/
│   └── models/            # place model files here
└── tests/
    ├── gestures.test.html
    └── gestures.test.js
.nojekyll                # disable Jekyll processing for Pages
```

There is **no `package.json`, build artifact, secret, API key, database, or service worker**. Relative project imports (`./js/main.js`, `../js/gestures.js`, etc.) work on GitHub Pages project subpaths. Third-party browser imports are pinned:

- Three.js `0.180.0`: `https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js` and matching add-ons in the import map.
- MediaPipe Tasks Vision `0.10.22`: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs`; the matching `@0.10.22/wasm` directory.
- Hand Landmarker float16 model, fixed release `1`: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.

MediaPipe is dynamically imported only when **Start Camera** is clicked, so a MediaPipe loading error does not prevent the Three.js/Quest parts from loading. If the GPU MediaPipe delegate fails, a CPU delegate is attempted.

## Gestures / controls

| Current hand pose | Action | Speed |
|---|---|---|
| Thumb tip close to index tip | WALK forward, along the head's horizontal gaze direction | 1.2 m/s |
| Thumb tip close to pinky tip | Turn RIGHT, continuous | 0.90 rad/s (51.57°/s) |
| Thumb tip close to ring tip | Turn LEFT, continuous | 0.90 rad/s (51.57°/s) |
| No recognized pinch, or hands untracked | STOP immediately | 0 |

Gesture recognition is defined in `js/gestures.js` and is shared unchanged by both tracking systems. The engine uses 3D positions of `thumb-tip`, `index-finger-tip`, `ring-finger-tip`, `pinky-finger-tip`, `index-finger-metacarpal` and `pinky-finger-metacarpal` on native XR. On desktop, it uses MediaPipe indices **4, 8, 16, 20, 5, 17**. MediaPipe's 3D `worldLandmarks` are preferred; when unavailable, 2D coordinates are converted to a consistent pixel metric before measuring distances.

`palm = distance(index MCP, pinky MCP)` and `ratio = distance(thumb tip, target fingertip) / palm`.

- **Press ratio:** `ratio < 0.27`.
- **Release ratio:** `ratio >= 0.40`. These form hysteresis so minor flicker does not rapidly toggle movement.
- A held gesture retains ownership until release. If there is no held gesture, only one winning pinch is selected. For ambiguous same-hand simultaneous pinches (closest two ratios differ by less than `0.045`), neither wins. For multiple hands presenting different valid gestures, explicit priority is **WALK → RIGHT → LEFT**. A currently held gesture beats newly appearing gestures on other hands.
- Every frame supplies the currently tracked hands, not a cached hand pose. If the active hand is lost, its pinch is released immediately. Another visibly tracked hand may take over in that same frame. If all hands disappear, movement stops.
- The reaction to release is immediate **on the next available tracking sample**, not necessarily at sub-frame times. Gesture update frequency depends on the platform's actual tracking/video frame rate.
- Movement applies `deltaTime` from `renderer.setAnimationLoop()`, capped to 50 ms so tab resumes do not generate large jumps.
- Right/left rotation is around global Y, pivoting around the current **tracked head** rather than the headset tracking-space origin.

Desktop without a webcam or with camera stopped: **W / ↑ to walk, A / ← left, D / → right**, and **click-drag** on the scene to turn/look. When webcam hand recognition is active, locomotion comes from gesture recognition, not keyboard. Both modes have **Reset Position** for the virtual navigation transform. No snap turn is used.

## Enter VR / Quest 3 hardware test

1. Ensure the headset has current firmware and **Hand Tracking is enabled** in Quest settings. In Quest Browser, visit the exact HTTPS GitHub Pages URL; do not open the local HTML file.
2. Set your controllers aside and ensure Quest recognizes your hands. The browser/runtime decides whether hand input sources are exposed. The application does not require controller events to locomote.
3. Press **ENTER VR**. Approve the browser's immersive session and any relevant permission prompts. The code requests:

   ```js
   navigator.xr.requestSession('immersive-vr', {
     optionalFeatures: ['hand-tracking', 'local-floor']
   });
   ```

4. The program first tries a `local-floor` reference space, then falls back to `local`. The Three.js renderer is configured for the successfully acquired type. `local-floor` uses the headset's floor reference; `local` does not provide a physical floor origin, so the virtual *rig* receives a documented approximate **+1.60 m** placement offset. In neither case is the live XR head transform rescaled or overwritten.
5. Show one or both hands. You should see a small 3D status indicator low and right in your headset. Make the index pinch and look to the side: walk follows your current head direction horizontally. Test pinky and ring pinches separately for turning.
6. Release every pinch; the virtual motion must stop. Take both hands out of view; the motion must stop. Move your head naturally while standing still; head orientation and physical head translations must remain native and undistorted.
7. To exit, use the headset's system Exit control or the web page's **EXIT VR** button when available. Session end cleans up navigation state and restores the desktop camera. No VR mode is faked in a desktop browser.

If no `XRInputSource.hand` is present after 4.5 seconds, a warning appears in the page's diagnostics/toast (on Quest the browser overlay may not remain visible). A small in-VR 3D HUD still shows `0 HANDS`. The app ignores controller input, so it does not silently substitute a controller-based movement mechanism. If only a controller appears and no hand is tracked, locomotion remains stopped. **Native hand tracking is an optional WebXR capability; a browser may start VR without exposing the hands.**

### Quest-specific troubleshooting

- **ENTER VR disabled**: the browser does not report `immersive-vr` support, or the page is not in a secure context. Use Quest Browser over HTTPS; verify XR permissions/settings.
- **VR scene loads but pinches do not work**: hand tracking may not be enabled, the Quest may prefer controllers, the browser may not grant `hand-tracking`, or hand joints may be occluded. Put controllers aside, enable natural hands, check your lighting and open hand/hand separation.
- **Fingertips are unstable**: normalized pinch thresholds can be adjusted in `js/gestures.js` (`pressThreshold`, `releaseThreshold`, `ambiguityMargin`). Avoid setting press >= release.
- **Floor alignment feels wrong**: check the displayed `HEAD REFERENCE` telemetry after exiting VR; `local` uses an approximate offset because the physical floor is not known. `local-floor` is preferred.
- **Sensitive VR comfort**: first use while seated in a clear area and begin with short pinches. No walls or obstacles are physically enforced; this demonstration intentionally does **not** implement collision detection or guardian logic. Stay aware of your physical surroundings.

## 1:70 scale — explicit mathematics

**Scene units**: 1 unit in miniature/model coordinates = **1 physical metre on the miniature** (not 1 metre of the imagined full-sized building). Full-sized architecture is authored as distances `L_real` measured in metres. The geometries are stored at `L_model = L_real / 70` in a separate root. That root has a single uniform `modelRoot.scale.setScalar(70)` in the **WebXR/world metre** scene.

```text
Scale factor                      s = 1 / 70
Reference human height           H_real = 1.70 m
Reference normal eye height      E_real = 1.60 m
Human height in miniature space  H_model = 1.70 / 70 = 0.024285714 m
Eye height in miniature space    E_model = 1.60 / 70 = 0.022857143 m
Example 7m architectural wall    L_model = 7 / 70 = 0.10 model units
Stage transform                  P_world = 70 * P_model
Therefore                       70 * (7/70) = 7 world metres
```

The **XR reference space and headset tracking pose remain in actual metres**. Formally, the position/orientation of the viewer in world coordinates is a composition of navigation rig transform and native headset transform:

```text
T_model_to_world = Scale(70)
T_head_world     = T_navigation_rig · T_XR_head_reference
T_head_model     = inverse(Scale(70)) · T_head_world   [conceptual relationship ONLY]
```

The last relation is a mathematical comparison; we never assign it back to WebXR's camera or scale any WebXR pose. **Never set `camera.scale` to 1/70 or multiply the headset's `position` by 1/70.** A physical 10 cm head movement remains 10 cm in immersive world space, which is mathematically 10/70 cm relative to miniature coordinates. At a nominal standing eye height of 1.60 m, the implied eye level *inside the miniature coordinate system* is 0.022857 m above the miniature floor; the corresponding actual rendered immersive eye is 1.60 m above the full-sized architectural floor. The perceived building is **human-sized and walkable**, although its source data represents a 1:70 model. This is the intentional “walk inside the miniature as a person” interpretation; it is not viewing a tabletop miniature from the outside.

With `local-floor`, the viewer's actual head height changes naturally when kneeling, sitting, bobbing or standing. No fixed camera height is forced in XR; 1.60 m is **only a nominal reference for the maths and a default desktop eye height**, plus the conditional `local` fallback virtual-floor offset described above. With `local-floor`, moving your head from 1.60 m to 1.30 m changes your effective miniature height from 0.022857 m to 0.018571 m naturally.

Navigation speed is also in **XR/world metres per second**. Walk speed 1.2 m/s corresponds to 1.2/70 miniature metres per second. Artificial yaw is applied to the world-space navigation rig; the original XR head rotation remains unmodified. Translation uses the tracked headset's forward vector projected onto the world XZ plane.

## Add .glb / .gltf architectural models

1. Export from your DCC/CAD pipeline in **real metres** (recommended) with positive Y up, origin on floor. Place `studio.glb` or `studio.gltf` plus its referenced textures/buffers under `assets/models/`.
2. Open: `https://YOUR_USERNAME.github.io/webxr-quest3/?model=assets/models/studio.glb&units=real`
3. `GLTFLoader` loads that file; its native **real-metre** geometry is given an additional `1/70` scale under the modelRoot's `70` scale, cancelling exactly. The real-metre geometry remains correct in immersive world coordinates. The sample architecture is hidden after a successful load.
4. If your GLB's raw geometry **already uses 1:70 miniature metres**, use `&units=miniature` to omit the per-import `1/70` adjustment.
5. Imported models are not automatically centred/scaled to fit. Author their floor near `Y=0`; change spawn coordinates in `new Locomotion(..., { startX, startZ })` in `js/main.js` as needed. For `.gltf`, upload any `.bin` and texture files relative to the file, with exact case-matching names.

`js/scene.js` exports `createArchitecturalScene(scene)`, `SCALE`, `EYE_HEIGHT_REAL` and `EYE_HEIGHT_MODEL`. Its returned `loadArchitecturalModel(url, { units, replaceDemo })` method may also be called from your own UI. The demo has floor, wall segments, doors, frame pieces, a 1m grid, different-height objects, dimensional labels, and direction markers. The model does not have rigid-body collisions.

## Test the gestures automatically

Open `tests/gestures.test.html` through GitHub Pages (or localhost) to run the unit suite in the browser. It tests distances, scale invariance, each gesture, no-pinches, lost hands, hysteresis, ambiguity, two-hand priority, tracking handover, invalid data, parameter validation and reset.

Optional developer command **if Node.js happens to be installed** (Node is never used by the deployed app):

```bash
node --experimental-default-type=module tests/gestures.test.js
```

This should exit with a nonzero code if any test fails. These unit tests **do not substitute** for headset integration testing or real camera permission tests.

## Manual acceptance checklist

- [ ] GitHub Pages displays the 3D room; no top-level JS import errors.
- [ ] Start Camera shows the permission prompt; approve it and see landmark lines/points.
- [ ] Index pinch moves forward at frame-independent speed; ring/pinky turn in the documented directions.
- [ ] Releasing a pinch stops movement at the next valid tracking sample; losing all hands stops motion.
- [ ] Stop Camera stops webcam tracks and clears the overlay. Deny camera permission and observe the error.
- [ ] Open the **same HTTPS URL** in Quest 3 Browser and click Enter VR.
- [ ] The VR session starts using the headset pose, and head rotations/translations are natural.
- [ ] With controllers set aside, native hands are tracked and the same three gestures work.
- [ ] Test both hands, ambiguous gestures, and tracked-hand loss; no phantom motion.
- [ ] Verify nominal scale (1.60/70 m in model coordinate terms), floor reference, door/object dimensions and human-sized walking.
- [ ] Exit immersive VR and verify desktop render recovers; repeat enter/exit several times.
- [ ] Observe frame-rate and browser console on the actual Quest hardware (no critical errors).

**Platform specification references:** [Meta WebXR Hands](https://developers.meta.com/vr/documentation/web/webxr-hands/), [MDN XRFrame.getJointPose](https://developer.mozilla.org/en-US/docs/Web/API/XRFrame/getJointPose), [Three.js installation/import maps](https://threejs.org/manual/pages/installation.html), [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker).