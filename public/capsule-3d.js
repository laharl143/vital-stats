// <capsule-3d> — stylized real-time glass capsule: stratified soil bed, curved grass,
// level plinth. The specimen leans and turns on its own tilted axis.
// Falls back to a still photograph if WebGL is unavailable.
// Attributes: speed, tilt (degrees), grass (blade count), label, fallback, plinth ("on"|"off")
(() => {
  const THREE_URL = 'https://esm.sh/three@0.166.0';
  let threePromise = null;
  const loadThree = () => (threePromise ||= import(THREE_URL));

  class Capsule3D extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      Object.assign(this.style, { position: 'absolute', inset: '0', display: 'block' });

      this._canvas = document.createElement('canvas');
      Object.assign(this._canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(this._canvas);

      const label = this.getAttribute('label');
      if (label) {
        this._label = document.createElement('span');
        this._label.textContent = label;
        Object.assign(this._label.style, {
          position: 'absolute', left: '50%', top: '41%', transform: 'translate(-50%,-50%)',
          font: '600 13px/1 var(--font-body, system-ui)', letterSpacing: '0.34em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)',
          textShadow: '0 1px 3px rgba(32,30,29,0.45)', pointerEvents: 'none', whiteSpace: 'nowrap'
        });
        this.appendChild(this._label);
      }

      this._init().catch(() => this._fallback());
    }

    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      this._ro?.disconnect();
      this._renderer?.dispose();
    }

    _fallback() {
      const src = this.getAttribute('fallback');
      if (!src) return;
      this._canvas.remove();
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      Object.assign(img.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        objectFit: 'contain', filter: 'saturate(0.82) contrast(0.94)'
      });
      this.insertBefore(img, this.firstChild);
    }

    async _init() {
      const THREE = await loadThree();
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const speed = parseFloat(this.getAttribute('speed') || '1');
      const tiltDeg = parseFloat(this.getAttribute('tilt') || '11');
      const bladeCount = parseInt(this.getAttribute('grass') || '320', 10);

      const renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      this._renderer = renderer;

      // Weak/virtualized GPUs can drop the context mid-render (not just
      // fail to init) — fall back to the static photo rather than leaving a
      // permanently blank canvas.
      this._canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        cancelAnimationFrame(this._raf);
        this._ro?.disconnect();
        this._fallback();
      });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0.5, 10);
      camera.lookAt(0, 0.05, 0);

      // warm cream-to-white environment, so the glass has something to reflect
      scene.environment = (() => {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 128;
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.45, '#f7f9f8');
        g.addColorStop(0.75, '#eaf5f2');
        g.addColorStop(1, '#5cafa0');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 128);
        const tex = new THREE.CanvasTexture(c);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const rt = pmrem.fromEquirectangular(tex);
        pmrem.dispose(); tex.dispose();
        return rt.texture;
      })();

      const rand = (() => { let s = 8123; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      const dummy = new THREE.Object3D();
      const tone = new THREE.Color();
      // Hash-based value noise. Summed sines were producing periodic interference ridges,
      // which on a body of revolution read as wood grain — this is genuinely isotropic.
      const hash3 = (i, j, k) => {
        let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
      };
      const fade = (t) => t * t * (3 - 2 * t);
      const vnoise = (x, y, z) => {
        const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
        const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
        let n = 0;
        for (let dz = 0; dz < 2; dz++)
          for (let dy = 0; dy < 2; dy++)
            for (let dx = 0; dx < 2; dx++)
              n += (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf) * hash3(xi + dx, yi + dy, zi + dz);
        return n * 2 - 1;
      };
      const fbm = (x, y, z) =>
        vnoise(x, y, z) * 0.54 +
        vnoise(x * 2.03, y * 2.03, z * 2.03) * 0.27 +
        vnoise(x * 4.11, y * 4.11, z * 4.11) * 0.13 +
        vnoise(x * 8.31, y * 8.31, z * 8.31) * 0.06;

      // root holds everything (breathing float); stand stays level; tilt leans; spin turns
      const root = new THREE.Group();
      scene.add(root);
      const stand = new THREE.Group();
      root.add(stand);
      const tilt = new THREE.Group();
      tilt.rotation.set(0, 0, -tiltDeg * Math.PI / 180);
      tilt.position.y = 0.42;
      root.add(tilt);
      const spin = new THREE.Group();
      tilt.add(spin);

      // ——— soil textures ———
      // isotropic blotchy earth — no bands, so nothing can wrap the column as grain
      const earthTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#3c4a42'; ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 900; i++) {
          ctx.fillStyle = rand() > 0.5
            ? `rgba(18,28,24,${0.12 + rand() * 0.3})`
            : `rgba(120,142,132,${0.1 + rand() * 0.28})`;
          ctx.beginPath();
          ctx.arc(rand() * 512, rand() * 512, 4 + rand() * 34, 0, 6.284);
          ctx.fill();
        }
        for (let i = 0; i < 26000; i++) {
          const l = rand();
          ctx.fillStyle = l > 0.5
            ? `rgba(${132 + l * 26 | 0},${156 + l * 26 | 0},${144 + l * 24 | 0},${0.25 + rand() * 0.4})`
            : `rgba(${18 + l * 26 | 0},${30 + l * 24 | 0},${26 + l * 20 | 0},${0.25 + rand() * 0.45})`;
          const s = 2 + rand() * 6;
          ctx.fillRect(rand() * 512, rand() * 512, s, s);
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, 1);
        t.anisotropy = 8;
        return t;
      })();

      // fine grain, used as bump only, tiled tightly
      const grainTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 16000; i++) {
          const v = rand();
          ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${rand() * 0.5})` : `rgba(0,0,0,${rand() * 0.5})`;
          const s = 0.8 + rand() * 2.4;
          ctx.fillRect(rand() * 256, rand() * 256, s, s);
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(6, 6);
        return t;
      })();

      // topsoil: darker, richer than the strata below it
      const topTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#22302a'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 340; i++) {
          ctx.fillStyle = rand() > 0.5 ? `rgba(10,18,15,${0.15 + rand() * 0.3})` : `rgba(78,100,90,${0.12 + rand() * 0.28})`;
          ctx.beginPath();
          ctx.arc(rand() * 256, rand() * 256, 3 + rand() * 18, 0, 6.284);
          ctx.fill();
        }
        for (let i = 0; i < 9000; i++) {
          const v = rand();
          ctx.fillStyle = v > 0.5 ? `rgba(104,128,116,${0.2 + rand() * 0.35})` : `rgba(8,16,13,${0.2 + rand() * 0.4})`;
          const s = 0.8 + rand() * 2.6;
          ctx.fillRect(rand() * 256, rand() * 256, s, s);
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(3, 3);
        return t;
      })();

      // ——— soil body: one icosphere deformed to the vessel profile ———
      // Any surface of revolution has a pole where every angular column converges on a single
      // vertex: averaged normals go to noise there and no UV scheme has bounded density, which
      // is what produced the radiating spokes. An icosphere has near-uniform triangle area and
      // no convergence vertex, so both stay clean. It carries the mound too.
      const soilBase = -1.7, soilCrown = 0.06, soilPeak = 0.34, soilR = 0.64, moundR = 0.7;
      const WALL = 0.86;
      const bodyY = (v) => v <= WALL
        ? soilBase + (v / WALL) * (soilCrown - soilBase)
        : soilCrown + ((v - WALL) / (1 - WALL)) * (soilPeak - soilCrown);
      const bodyR = (v) => {
        if (v <= WALL) {
          const t = v / WALL;
          return soilR * Math.pow(Math.sin(Math.min(1, t / 0.19) * Math.PI / 2), 0.8) * (0.92 + 0.08 * t);
        }
        const m = (v - WALL) / (1 - WALL);
        return moundR * Math.sqrt(Math.max(0, 1 - m * m));
      };

      const bodyGeo = new THREE.IcosahedronGeometry(1, 5);
      {
        const p = bodyGeo.attributes.position;
        const shade = [];
        for (let i = 0; i < p.count; i++) {
          const nx = p.getX(i), ny = p.getY(i), nz = p.getZ(i);
          const v = (ny + 1) / 2;
          const hl = Math.hypot(nx, nz) || 1e-6;
          const y = bodyY(v) + fbm(nx * 7, ny * 7, nz * 7) * 0.018;
          const r = bodyR(v) * (1 + fbm(nx * 3.6, ny * 5.2, nz * 3.6) * 0.1);
          p.setXYZ(i, (nx / hl) * r, y, (nz / hl) * r);
          let s = 0.5 + 0.5 * Math.min(1, Math.max(0, (bodyY(v) - soilBase) / (soilCrown - soilBase)));
          // topsoil on the mound is richer and darker than the strata below it
          if (v > WALL) s *= 1 - 0.38 * Math.min(1, (v - WALL) / 0.04);
          shade.push(s, s * 0.985, s * 0.96);
        }
        bodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
        bodyGeo.computeVertexNormals();
        // Triplanar UVs: project on the two axes the normal is least aligned with, so texel
        // density is bounded everywhere. earthTex is isotropic, so the switches show no seam.
        const n = bodyGeo.attributes.normal, uv = bodyGeo.attributes.uv, K = 1.24;
        for (let i = 0; i < p.count; i++) {
          const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          if (ay >= ax && ay >= az) uv.setXY(i, x * K, z * K);
          else if (ax >= az) uv.setXY(i, z * K, y * K);
          else uv.setXY(i, x * K, y * K);
        }
        uv.needsUpdate = true;
      }
      const column = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
        map: earthTex, vertexColors: true, bumpMap: grainTex, bumpScale: 0.16,
        roughness: 1, metalness: 0, envMapIntensity: 0.22
      }));
      spin.add(column);

      // the mound is part of the body mesh now; this only describes its surface for planting
      const domeR = moundR, domeH = soilPeak - soilCrown, soilTop = soilCrown;
      const domeY = (r) => soilTop + domeH * Math.sqrt(Math.max(0, 1 - (r / domeR) ** 2));

      // clods and grit: on the mound, and over the visible side wall
      const clodMat = new THREE.MeshStandardMaterial({ map: topTex, bumpMap: grainTex, bumpScale: 0.2, roughness: 1, envMapIntensity: 0.2 });
      const clodGeo = new THREE.IcosahedronGeometry(1, 0);
      const wallClods = new THREE.InstancedMesh(clodGeo, clodMat, 340);
      for (let i = 0; i < wallClods.count; i++) {
        const a = rand() * Math.PI * 2;
        const v = 0.05 + rand() * 0.79;
        const y = bodyY(v);
        const rAt = bodyR(v);
        const s = 0.018 + rand() * 0.045;
        dummy.position.set(Math.cos(a) * (rAt - s * 0.35), y, Math.sin(a) * (rAt - s * 0.35));
        dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        dummy.scale.set(s, s * (0.6 + rand() * 0.6), s);
        dummy.updateMatrix();
        wallClods.setMatrixAt(i, dummy.matrix);
        const tint = 0.7 + rand() * 0.5;
        wallClods.setColorAt(i, tone.setRGB(tint, tint * 0.96, tint * 0.9));
      }
      spin.add(wallClods);

      for (let i = 0; i < 24; i++) {
        const a = rand() * Math.PI * 2, r = rand() ** 0.5 * 0.64;
        const s = 0.022 + rand() * 0.055;
        const clod = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), clodMat);
        clod.position.set(Math.cos(a) * r, domeY(r) - s * 0.35, Math.sin(a) * r);
        clod.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        clod.scale.set(1, 0.7 + rand() * 0.5, 1);
        spin.add(clod);
      }

      // ——— grass: curved, tapered blades, dark at the root ———
      const bladeGeo = (() => {
        const segs = 7, pos = [], col = [], idx = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const hw = 0.5 * Math.pow(1 - t, 1.15);
          const z = 0.3 * t * t;
          pos.push(-hw, t, z, hw, t, z);
          const sh = 0.52 + 0.48 * Math.pow(t, 0.7);
          col.push(sh, sh, sh, sh, sh, sh);
        }
        for (let i = 0; i < segs; i++) {
          const a = i * 2;
          idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      })();

      const bladeMat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide
      });
      // grass in the brand teals rather than olive
      const greens = [0x2e8b72, 0x1d6b57, 0x5cafa0, 0x0f4a3c, 0x6fe6b8];
      const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
      const seeds = [];
      for (let i = 0; i < bladeCount; i++) {
        const a = rand() * Math.PI * 2, r = rand() ** 0.55 * 0.63;
        const h = 0.4 + rand() * 0.72;
        const s = {
          x: Math.cos(a) * r, z: Math.sin(a) * r, y: domeY(r) - 0.02,
          w: 0.055 + rand() * 0.03, h,
          yaw: rand() * Math.PI * 2, lean: (rand() - 0.5) * 0.34, phase: rand() * 6.28
        };
        seeds.push(s);
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(0, s.yaw, s.lean);
        dummy.scale.set(s.w, s.h, s.h);
        dummy.updateMatrix();
        blades.setMatrixAt(i, dummy.matrix);
        blades.setColorAt(i, tone.setHex(greens[i % greens.length]));
      }
      spin.add(blades);

      // thatch: short dark blades hiding the soil/grass junction
      const thatch = new THREE.InstancedMesh(bladeGeo, bladeMat, Math.round(bladeCount * 0.55));
      for (let i = 0; i < thatch.count; i++) {
        const a = rand() * Math.PI * 2, r = rand() ** 0.45 * 0.66;
        dummy.position.set(Math.cos(a) * r, domeY(r) - 0.03, Math.sin(a) * r);
        dummy.rotation.set(0, rand() * 6.28, (rand() - 0.5) * 1.1);
        const h = 0.12 + rand() * 0.2;
        dummy.scale.set(0.05 + rand() * 0.03, h, h);
        dummy.updateMatrix();
        thatch.setMatrixAt(i, dummy.matrix);
        thatch.setColorAt(i, tone.setHex(i % 2 ? 0x2e8b72 : 0x1d6b57));
      }
      spin.add(thatch);

      // ——— glass ———
      const glass = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.92, 1.95, 56, 56),
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff, transmission: 1, thickness: 0.9, roughness: 0.03,
          metalness: 0, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.04,
          attenuationColor: new THREE.Color(0xd4efe6), attenuationDistance: 5.5,
          envMapIntensity: 1.5, transparent: true, side: THREE.DoubleSide
        })
      );
      glass.position.y = 0.12;
      spin.add(glass);

      const seam = new THREE.Mesh(
        new THREE.TorusGeometry(0.925, 0.018, 12, 96),
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff, roughness: 0.08, metalness: 0, transmission: 0.85,
          thickness: 0.2, envMapIntensity: 1.4, transparent: true, opacity: 0.5
        })
      );
      seam.rotation.x = Math.PI / 2;
      seam.position.y = 1.09;
      spin.add(seam);

      // ——— plinth, level under the leaning specimen ———
      if (this.getAttribute('plinth') !== 'off') {
        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 1.16, 0.36, 84),
          new THREE.MeshStandardMaterial({ color: 0xf7f9f8, roughness: 0.38, metalness: 0, envMapIntensity: 0.8 })
        );
        plinth.position.y = -1.8;
        stand.add(plinth);
      }

      // contact shadow on the plinth
      const shadowTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(13,21,18,0.42)');
        g.addColorStop(0.5, 'rgba(13,21,18,0.13)');
        g.addColorStop(1, 'rgba(13,21,18,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      })();
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.6),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(-0.14, -1.61, 0.05);
      shadow.scale.set(1, 0.66, 1);
      stand.add(shadow);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 5.4),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.985;
      ground.scale.set(1, 0.5, 1);
      stand.add(ground);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f83, 0.7));
      const key = new THREE.DirectionalLight(0xfbfffd, 1.6);
      key.position.set(3.2, 5, 3.4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xdcf1ea, 1.1);
      fill.position.set(-3.6, 1.2, -2.4);
      scene.add(fill);
      const rim = new THREE.PointLight(0xffffff, 12, 14);
      rim.position.set(-1.4, 1.8, -3.2);
      scene.add(rim);

      const resize = () => {
        const w = this.clientWidth || 480, h = this.clientHeight || 480;
        renderer.setSize(w, h, false);
        const aspect = w / h;
        camera.aspect = aspect;
        let z = 2.5 / Math.tan((camera.fov * Math.PI) / 360);
        if (aspect < 0.95) z *= 1 + (0.95 - aspect) * 0.7;
        camera.position.z = z;
        camera.updateProjectionMatrix();
      };
      resize();
      this._ro = new ResizeObserver(resize);
      this._ro.observe(this);

      const t0 = performance.now();
      const tick = (now) => {
        const t = (now - t0) / 1000;
        if (reduce) {
          spin.rotation.y = 0.5;
        } else {
          spin.rotation.y = t * 0.22 * speed;
          root.position.y = Math.sin(t * 0.6) * 0.03;
          // grass sways where it is tallest
          for (let i = 0; i < bladeCount; i++) {
            const s = seeds[i];
            dummy.position.set(s.x, s.y, s.z);
            dummy.rotation.set(0, s.yaw, s.lean + Math.sin(t * 1.15 + s.phase) * 0.05 * s.h);
            dummy.scale.set(s.w, s.h, s.h);
            dummy.updateMatrix();
            blades.setMatrixAt(i, dummy.matrix);
          }
          blades.instanceMatrix.needsUpdate = true;
        }
        renderer.render(scene, camera);
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
      this.setAttribute('data-ready', '');
    }
  }

  if (!customElements.get('capsule-3d')) customElements.define('capsule-3d', Capsule3D);
})();
