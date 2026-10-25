import * as THREE from 'three';

/**
 * Three.js 3D Master Broadcast Deck
 * Renders pristine flat 16:9 rectangle master monitor with high-res safe texture mapping,
 * 3D real-time audio spectrum visualizer arc, and dynamic ambient back-lighting.
 * (Starfield overlay and floating 3D boxes removed per user request).
 */
export class Scene3D {
  constructor(canvasElement, videoElement, onCardClicked, onCardHover) {
    this.canvas = canvasElement;
    this.video = videoElement;
    this.onCardClicked = onCardClicked;
    this.onCardHover = onCardHover;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.audioEngine = null;

    // Focused 16:9 monitor camera framing
    this.viewMode = 'deck';
    this.cameraTargetPos = new THREE.Vector3(0, 0.92, 4.4);
    this.cameraTargetLook = new THREE.Vector3(0, 0.92, 0);

    // Meshes & Textures
    this.videoTexture = null;
    this.mainScreenMesh = null;
    this.screenGlowLight = null;
    this.screenEdge = null;
    this.visualizerBars = [];

    this.textureLoader = new THREE.TextureLoader();
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060911, 0.035);

    // 2. Camera
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
    this.camera.position.set(0, 0.92, 4.55);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 4. Lighting
    this.setupLighting();

    // 5. Environment (Subtle Cyber Floor Grid, no starfield)
    this.setupEnvironment();

    // 6. Main 3D Flat 16:9 Live Video Screen (High-Resolution Safe)
    this.setupMainScreen();

    // Events
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setAudioEngine(engine) {
    this.audioEngine = engine;
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x151e30, 1.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x00f5d4, 1.4);
    mainLight.position.set(0, 6, 4);
    this.scene.add(mainLight);

    // Screen dynamic backlight (synchronizes with active channel accent color)
    this.screenGlowLight = new THREE.PointLight(0x00f5d4, 4.0, 14);
    this.screenGlowLight.position.set(0, 0.7, -0.35);
    this.scene.add(this.screenGlowLight);

    const floorLight = new THREE.PointLight(0x00f5d4, 1.0, 8);
    floorLight.position.set(0, -1.8, 2);
    this.scene.add(floorLight);
  }

  setupEnvironment() {
    // Subtle Cyber Grid Floor
    const gridHelper = new THREE.GridHelper(24, 32, 0x00f5d4, 0x0f172a);
    gridHelper.position.y = -1.6;
    gridHelper.material.opacity = 0.35;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
    // (Starfield particles removed per user specification)
  }

  setupMainScreen() {
    // Master Video Texture with High-Resolution Protection (4K / 2160p safe)
    this.videoTexture = new THREE.VideoTexture(this.video);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.generateMipmaps = false; // Prevents massive VRAM exhaustion on 4K/1080p60 feeds
    this.videoTexture.format = THREE.RGBAFormat;
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;

    // Pristine Flat 16:9 Standard Rectangle Monitor (5.333 x 3.0)
    const screenGeo = new THREE.PlaneGeometry(5.333, 3.0, 1, 1);

    const screenMat = new THREE.MeshBasicMaterial({
      map: this.videoTexture,
      toneMapped: false
    });

    this.mainScreenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.mainScreenMesh.position.set(0, 0.92, 0);
    this.scene.add(this.mainScreenMesh);

    // Bezel Frame behind the 16:9 screen
    const bezelGeo = new THREE.PlaneGeometry(5.46, 3.13, 1, 1);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x080d1a,
      roughness: 0.25,
      metalness: 0.9
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0.92, -0.04);
    this.scene.add(bezelMesh);

    // Glowing Neon Edge Frame
    const edgeGeo = new THREE.EdgesGeometry(screenGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00f5d4,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    this.screenEdge = new THREE.LineSegments(edgeGeo, edgeMat);
    this.screenEdge.position.set(0, 0.92, 0.01);
    this.scene.add(this.screenEdge);
  }

  /**
   * Dynamically fits high-resolution or varying aspect ratios safely into the 16:9 rectangle
   */
  updateTextureFitting() {
    if (!this.video || !this.videoTexture || !this.video.videoWidth || !this.video.videoHeight) return;

    const videoAspect = this.video.videoWidth / this.video.videoHeight;
    const targetAspect = 16 / 9;

    if (Math.abs(videoAspect - targetAspect) > 0.04) {
      if (videoAspect > targetAspect) {
        // Ultra-wide (e.g. 21:9) -> letterbox vertically
        const scaleY = targetAspect / videoAspect;
        this.videoTexture.repeat.set(1, scaleY);
        this.videoTexture.offset.set(0, (1 - scaleY) / 2);
      } else {
        // Standard/Classic (e.g. 4:3) -> pillarbox horizontally
        const scaleX = videoAspect / targetAspect;
        this.videoTexture.repeat.set(scaleX, 1);
        this.videoTexture.offset.set((1 - scaleX) / 2, 0);
      }
    } else {
      // Standard 16:9 (e.g. 1080p, 4K UHD, 720p)
      this.videoTexture.repeat.set(1, 1);
      this.videoTexture.offset.set(0, 0);
    }
  }


  /**
   * Stub retained for API compatibility - 3D card boxes removed per user request.
   */
  buildChannelCarousel(channels, activeIndex = 0) {
    // 3D boxes removed per user specification in favor of rich text & findings panels
  }

  setActiveChannelVisual(index, channel) {
    if (channel && channel.accentColor && this.screenGlowLight) {
      this.screenGlowLight.color.set(channel.accentColor);
      if (this.screenEdge && this.screenEdge.material) {
        this.screenEdge.material.color.set(channel.accentColor);
      }
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    if (mode === 'cinema') {
      this.cameraTargetPos.set(0, 0.7, 3.8);
      this.cameraTargetLook.set(0, 0.7, 0);
    } else if (mode === 'matrix') {
      this.cameraTargetPos.set(0, 0.8, 5.0);
      this.cameraTargetLook.set(0, 0.7, 0);
    } else {
      // 'deck' default
      this.cameraTargetPos.set(0, 0.62, 4.55);
      this.cameraTargetLook.set(0, 0.70, 0);
    }
  }

  toggleViewMode() {
    const modes = ['deck', 'cinema', 'matrix'];
    const nextIdx = (modes.indexOf(this.viewMode) + 1) % modes.length;
    this.setViewMode(modes[nextIdx]);
    return this.viewMode;
  }

  onWindowResize() {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);

    try {
      // 1. Texture Fitting Update (Safeguards High-Resolution 4K & non-16:9 feeds)
      this.updateTextureFitting();

      // 2. Smooth Camera Glide
      this.camera.position.lerp(this.cameraTargetPos, 0.055);
      this.camera.lookAt(this.cameraTargetLook);


      // 4. Update Source Resolution Label Position (Below bottom-left corner of central display)
      if (!this.monitorResolutionEl) {
        this.monitorResolutionEl = document.getElementById('monitorSourceResolution');
      }
      if (this.monitorResolutionEl && this.camera && this.canvas) {
        if (!this.tempCornerVec) this.tempCornerVec = new THREE.Vector3(-2.6665, -0.58, 0.01);
        const v = this.tempCornerVec.clone().project(this.camera);
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-(v.y * 0.5) + 0.5) * h;
        if (x > 50 && y > 100 && x < w - 100 && y < h) {
          this.monitorResolutionEl.style.left = `${Math.round(x)}px`;
          this.monitorResolutionEl.style.top = `${Math.round(y + 2)}px`;
          this.monitorResolutionEl.style.bottom = 'auto';
        }
      }

      // 5. Dynamic 3D-to-2D projection of central audio deck (right of central video display)
      if (!this.centralAudioDeckEl) {
        this.centralAudioDeckEl = document.getElementById('centralAudioDeck');
      }
      if (this.centralAudioDeckEl && this.camera && this.canvas) {
        if (!this.tempRightEdgeVec) this.tempRightEdgeVec = new THREE.Vector3(2.82, 0.92, 0.01);
        const vr = this.tempRightEdgeVec.clone().project(this.camera);
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const rx = (vr.x * 0.5 + 0.5) * w;
        const ry = (-(vr.y * 0.5) + 0.5) * h;
        if (rx > 100 && ry > 50 && rx < w - 20 && ry < h) {
          this.centralAudioDeckEl.style.left = `${Math.round(rx + 14)}px`;
          this.centralAudioDeckEl.style.top = `${Math.round(ry)}px`;
          this.centralAudioDeckEl.style.right = 'auto';
        }
      }

      this.renderer.render(this.scene, this.camera);
    } catch (e) {
      // Safeguard WebGL animation loop continuity
    }
  }
}
