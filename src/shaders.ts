
export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const fluidFragmentShader = `
  uniform sampler2D uPrevTrails;
  uniform vec2 uMouse;
  uniform vec2 uPrevMouse;
  uniform vec2 uAutoMouse;
  uniform vec2 uPrevAutoMouse;
  uniform vec2 uResolution;
  uniform float uDecay;
  uniform bool uIsMoving;
  uniform bool uUseAutoMouse;
  
  varying vec2 vUv;

  float line(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    vec4 prev = texture2D(uPrevTrails, vUv);
    
    // User cursor brush - smooth transition
    float dist = line(vUv, uPrevMouse, uMouse);
    float brush = exp(-dist * 33.0);
    if (!uIsMoving) brush = 0.0;
    
    // Auto idle cursor brush - smooth transition
    float autoDist = line(vUv, uPrevAutoMouse, uAutoMouse);
    float autoBrush = exp(-autoDist * 33.0);
    if (!uUseAutoMouse) autoBrush = 0.0;
    
    // Combine brushes
    float finalBrush = max(brush, autoBrush);
    
    // Add current brush to previous state
    vec3 color = prev.rgb * (uDecay - 0.005) + vec3(finalBrush * 0.85);
    
    // Simple diffusion - sample neighbors lightly
    vec2 off = 1.0 / uResolution;
    vec4 n = texture2D(uPrevTrails, vUv + vec2(0.0, off.y));
    vec4 s = texture2D(uPrevTrails, vUv - vec2(0.0, off.y));
    vec4 e = texture2D(uPrevTrails, vUv + vec2(off.x, 0.0));
    vec4 w = texture2D(uPrevTrails, vUv - vec2(off.x, 0.0));
    
    // Blend a bit of neighbors to diffuse
    color = mix(color, (n.rgb + s.rgb + e.rgb + w.rgb) * 0.25, 0.015);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const displayFragmentShader = `
  uniform sampler2D uFluid;
  uniform sampler2D uBaseTexture;
  uniform sampler2D uRevealTexture;
  uniform sampler2D uIceTexture;
  uniform vec2 uResolution;
  uniform vec2 uBaseSize;
  uniform vec2 uRevealSize;
  uniform vec2 uIceSize;
  uniform bool uIceManMode;
  uniform float uPortraitZoom;
  uniform float uPortraitCenterY;
  uniform float uPortraitShiftY;
  uniform bool uSubjectOnlyPortrait;
  uniform float uTime;
  uniform float uBgBrightness;
  uniform float uBgBlurMix;
  
  varying vec2 vUv;

  vec2 containUv(vec2 uv, vec2 targetSize, vec2 textureSize) {
    float targetAspect = targetSize.x / targetSize.y;
    float textureAspect = textureSize.x / textureSize.y;
    vec2 newUv = uv;
    if (targetAspect > textureAspect) {
        float f = textureAspect / targetAspect;
        newUv.x = (uv.x - (1.0 - f) * 0.5) / f;
    } else {
        float f = targetAspect / textureAspect;
        newUv.y = (uv.y - (1.0 - f) * 0.5) / f;
    }
    return newUv;
  }

  float containMask(vec2 uv, vec2 targetSize, vec2 textureSize, float shiftY) {
    vec2 imageUv = containUv(uv, targetSize, textureSize) + vec2(0.0, shiftY);
    if (imageUv.x < 0.0 || imageUv.x > 1.0 || imageUv.y < 0.0 || imageUv.y > 1.0) {
      return 0.0;
    }
    // Smooth edge fade on the portrait borders
    return smoothstep(0.0, 0.08, imageUv.x) * smoothstep(1.0, 0.92, imageUv.x);
  }

  vec4 sampleZoomedContain(sampler2D image, vec2 uv, vec2 targetSize, vec2 textureSize, float zoom, float centerY, float shiftY) {
    vec2 imageUv = containUv(uv, targetSize, textureSize) + vec2(0.0, shiftY);
    if (imageUv.x < 0.0 || imageUv.x > 1.0 || imageUv.y < 0.0 || imageUv.y > 1.0) {
      return vec4(0.0);
    }
    
    // Zoom in around the specified center (focusing on head and shoulders)
    vec2 zoomedUv = (imageUv - vec2(0.5, centerY)) / zoom + vec2(0.5, centerY);
    zoomedUv = clamp(zoomedUv, 0.001, 0.999);
    
    return texture2D(image, zoomedUv);
  }

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float snowLayer(vec2 uv, float scale, float speed, float size, float drift) {
    vec2 gridUv = uv * scale;
    vec2 cell = floor(gridUv);
    vec2 local = fract(gridUv);
    float rnd = hash(cell);
    float y = fract(local.y + uTime * speed + rnd);
    float x = local.x + sin((uTime * speed + rnd) * 6.2831) * drift;
    float d = length(vec2(x, y) - vec2(0.5 + (rnd - 0.5) * 0.45, 0.5));
    return smoothstep(size, 0.0, d) * smoothstep(0.18, 1.0, rnd);
  }

  vec3 proceduralSnow(vec2 uv, float mask, vec2 distortion) {
    vec2 aspectUv = uv;
    aspectUv.x *= uResolution.x / max(uResolution.y, 1.0);
    vec2 stirredUv = aspectUv + distortion * 1.35;
    float pushed = smoothstep(0.05, 0.7, mask);
    stirredUv += vec2(pushed * 0.055, pushed * -0.035);

    float fine = snowLayer(stirredUv + vec2(0.0, uTime * 0.015), 44.0, 0.055, 0.030, 0.20);
    float mid = snowLayer(stirredUv + vec2(1.7, 0.3), 24.0, 0.035, 0.045, 0.16);
    float soft = snowLayer(stirredUv + vec2(5.1, 1.9), 12.0, 0.020, 0.070, 0.10);
    float flakes = fine * 0.45 + mid * 0.48 + soft * 0.36;
    flakes *= 1.0 - clamp(uBgBlurMix / 18.0, 0.0, 0.45);

    vec3 base = mix(vec3(0.62, 0.70, 0.76), vec3(0.82, 0.91, 0.96), uv.y);
    vec3 haze = vec3(0.84, 0.93, 1.0) * (0.12 + pushed * 0.12);
    vec3 snow = vec3(flakes) * mix(0.62, 1.15, pushed);
    return (base + haze + snow) * uBgBrightness;
  }

  void main() {
    float mask = texture2D(uFluid, vUv).r;
    
    float zoom = uPortraitZoom;
    float centerY = uPortraitCenterY;
    float shiftY = uPortraitShiftY;

    // Liquid refraction distortion based on derivatives
    vec2 px = 1.0 / uResolution;
    float mx = texture2D(uFluid, vUv + vec2(px.x * 2.0, 0.0)).r - texture2D(uFluid, vUv - vec2(px.x * 2.0, 0.0)).r;
    float my = texture2D(uFluid, vUv + vec2(0.0, px.y * 2.0)).r - texture2D(uFluid, vUv - vec2(0.0, px.y * 2.0)).r;
    
    // Distortion vector for transition edge ripple
    vec2 distortion = vec2(mx, my) * 0.06;
    vec3 bgColor = proceduralSnow(vUv, mask, distortion);

    // Sample portrait textures using undistorted vUv to prevent face from twisting
    vec4 base = sampleZoomedContain(uBaseTexture, vUv, uResolution, uBaseSize, zoom, centerY, shiftY);
    vec4 iceTex = sampleZoomedContain(uIceTexture, vUv, uResolution, uIceSize, zoom, centerY, shiftY);
    vec4 revealBase = sampleZoomedContain(uRevealTexture, vUv, uResolution, uRevealSize, zoom, centerY, shiftY);
    
    float alphaMask = max(base.a, revealBase.a);
    float subjectMask = containMask(vUv, uResolution, uBaseSize, shiftY) * smoothstep(0.02, 0.2, alphaMask);

    // Apply distortion to the fluid mask sampling for a liquid reveal boundary ripple
    float distortedMask = texture2D(uFluid, vUv + distortion * 0.4).r;
    float threshold = 0.05;
    float revealAmount = smoothstep(threshold, threshold + 0.3, distortedMask) * subjectMask;
    
    // Mix images using undistorted UVs (to keep face sharp), with color splitting aberration at reveal edges
    vec4 finalColor;
    if (uIceManMode) {
      finalColor = iceTex;
    } else {
      // Subtle aberration shifting at the transition boundary
      float edge = revealAmount * (1.0 - revealAmount) * 4.0 * subjectMask;
      float shift = edge * 0.006 + length(distortion) * 0.03;
      
      float cr = sampleZoomedContain(uRevealTexture, vUv + vec2(shift, 0.0), uResolution, uRevealSize, zoom, centerY, shiftY).r;
      float cg = revealBase.g;
      float cb = sampleZoomedContain(uRevealTexture, vUv - vec2(shift, 0.0), uResolution, uRevealSize, zoom, centerY, shiftY).b;
      vec4 revealTex = vec4(cr, cg, cb, revealBase.a);
      
      finalColor = mix(base, revealTex, revealAmount);
    }

    finalColor.rgb = mix(bgColor, finalColor.rgb, finalColor.a);
    finalColor.a = max(finalColor.a, 1.0);
    
    float outsideSubject = uSubjectOnlyPortrait ? 0.0 : 1.0 - subjectMask;
    float softTrail = smoothstep(0.025, 0.55, mask);
    float denseTrail = smoothstep(0.28, 0.9, mask);
    float rim = smoothstep(0.04, 0.22, mask) * (1.0 - smoothstep(0.32, 0.72, mask));
    float ridge = clamp(length(vec2(mx, my)) * 5.0, 0.0, 1.0);
    float cursorEffect = (softTrail * 0.16 + denseTrail * 0.14 + rim * ridge * 0.28) * outsideSubject;
    vec3 iceWash = vec3(0.80, 0.94, 1.0);
    vec3 iceEdge = vec3(0.18, 0.68, 0.95);
    vec3 frostGlow = mix(iceWash, iceEdge, rim * ridge);
    finalColor.rgb = mix(finalColor.rgb, frostGlow, cursorEffect);
    finalColor.a = max(finalColor.a, cursorEffect);

    float containerEdgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    finalColor.a *= containerEdgeFade;
    finalColor.rgb *= containerEdgeFade;
    if (uSubjectOnlyPortrait) {
      finalColor.a *= subjectMask;
      finalColor.rgb *= subjectMask;
    }

    gl_FragColor = finalColor;
  }
`;
