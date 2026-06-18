/**
 * ThreeHero — Real 3D Camera Lens Hero using WebView + Three.js
 * Features: Metallic materials, glass reflections, dynamic lighting,
 * shutter animation, fly-in intro, touch rotation, 60fps WebGL
 */
import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 440;

// The entire Three.js scene is self-contained HTML
const THREE_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050403;overflow:hidden;touch-action:none}
canvas{display:block;width:100vw;height:100vh}
#brand{position:absolute;bottom:24px;left:0;right:0;text-align:center;font-family:-apple-system,system-ui,sans-serif;opacity:0;transition:opacity 1.5s ease 2s}
#brand.show{opacity:1}
#brand h1{font-size:15px;font-weight:300;color:#fff;letter-spacing:6px;margin-bottom:4px}
#brand p{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px}
#brand .line{width:40px;height:1px;background:rgba(255,140,43,0.4);margin:6px auto}
</style>
</head>
<body>
<div id="brand"><h1>BOOKMYSHOT</h1><div class="line"></div><p>Premium Wedding Creators</p></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function(){
  const W=window.innerWidth,H=window.innerHeight;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x050403);
  
  // Camera
  const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);
  camera.position.set(0,0,6);
  
  // Renderer
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.physicallyCorrectLights=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  document.body.appendChild(renderer.domElement);
  
  // Lighting
  const ambientLight=new THREE.AmbientLight(0x222222,0.5);
  scene.add(ambientLight);
  
  const keyLight=new THREE.DirectionalLight(0xffeedd,2);
  keyLight.position.set(3,4,5);
  scene.add(keyLight);
  
  const fillLight=new THREE.DirectionalLight(0xff8c2b,0.8);
  fillLight.position.set(-3,1,3);
  scene.add(fillLight);
  
  const rimLight=new THREE.PointLight(0xff8c2b,1.5,10);
  rimLight.position.set(0,-2,3);
  scene.add(rimLight);
  
  const topLight=new THREE.PointLight(0xffd700,0.6,8);
  topLight.position.set(0,3,2);
  scene.add(topLight);
  
  // Materials
  const metalMat=new THREE.MeshStandardMaterial({
    color:0x1a1a1a,metalness:0.95,roughness:0.15,envMapIntensity:1.5
  });
  const goldMat=new THREE.MeshStandardMaterial({
    color:0xff8c2b,metalness:0.9,roughness:0.2,emissive:0xff6600,emissiveIntensity:0.05
  });
  const glassMat=new THREE.MeshPhysicalMaterial({
    color:0x111122,metalness:0,roughness:0,transmission:0.85,thickness:0.3,
    ior:1.5,clearcoat:1,clearcoatRoughness:0.05,envMapIntensity:2
  });
  const innerGlassMat=new THREE.MeshPhysicalMaterial({
    color:0x0a0a1a,metalness:0.1,roughness:0.05,transmission:0.6,thickness:0.5,
    ior:1.8,clearcoat:1,clearcoatRoughness:0
  });
  
  // Environment map (simple gradient for reflections)
  const envSize=64;
  const envData=new Uint8Array(envSize*envSize*4);
  for(let i=0;i<envSize;i++)for(let j=0;j<envSize;j++){
    const idx=(i*envSize+j)*4;
    const t=i/envSize;
    envData[idx]=Math.floor(5+t*15);
    envData[idx+1]=Math.floor(4+t*10);
    envData[idx+2]=Math.floor(3+t*8);
    envData[idx+3]=255;
  }
  const envTex=new THREE.DataTexture(envData,envSize,envSize,THREE.RGBAFormat);
  envTex.mapping=THREE.EquirectangularReflectionMapping;
  envTex.needsUpdate=true;
  scene.environment=envTex;
  
  // ═══ BUILD CAMERA LENS ═══
  const lensGroup=new THREE.Group();
  
  // Outer barrel (metallic body)
  const outerBarrel=new THREE.Mesh(
    new THREE.TorusGeometry(1.8,0.08,16,64),metalMat
  );
  lensGroup.add(outerBarrel);
  
  // Multiple metallic rings at different radii
  const ringRadii=[1.65,1.5,1.35,1.2,1.05,0.9,0.75];
  const ringThickness=[0.06,0.05,0.07,0.04,0.06,0.05,0.04];
  ringRadii.forEach((r,i)=>{
    const mat=i%2===0?metalMat:goldMat;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,ringThickness[i],12,64),mat.clone());
    ring.userData={speed:(i%2===0?1:-1)*0.1*(i+1),baseZ:0};
    lensGroup.add(ring);
  });
  
  // Glass lens elements (3 layers)
  const glass1=new THREE.Mesh(new THREE.SphereGeometry(1.3,32,32,0,Math.PI*2,0,Math.PI*0.5),glassMat);
  glass1.scale.set(1,1,0.15);
  glass1.position.z=0.05;
  lensGroup.add(glass1);
  
  const glass2=new THREE.Mesh(new THREE.CircleGeometry(1.0,48),innerGlassMat);
  glass2.position.z=0.02;
  lensGroup.add(glass2);
  
  const glass3=new THREE.Mesh(new THREE.CircleGeometry(0.6,48),glassMat.clone());
  glass3.position.z=0.08;
  lensGroup.add(glass3);
  
  // Aperture blades (8 blades)
  const bladeGroup=new THREE.Group();
  const bladeMat=new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:0.8,roughness:0.3,side:THREE.DoubleSide});
  for(let i=0;i<8;i++){
    const shape=new THREE.Shape();
    shape.moveTo(0,0);
    shape.lineTo(0.5,0.2);
    shape.lineTo(0.5,-0.2);
    shape.closePath();
    const blade=new THREE.Mesh(new THREE.ShapeGeometry(shape),bladeMat);
    blade.rotation.z=(i/8)*Math.PI*2;
    blade.position.z=0.1;
    blade.userData={index:i};
    bladeGroup.add(blade);
  }
  lensGroup.add(bladeGroup);
  
  // Focus ring ticks
  for(let i=0;i<24;i++){
    const tick=new THREE.Mesh(
      new THREE.BoxGeometry(0.01,0.04,0.02),
      goldMat.clone()
    );
    const angle=(i/24)*Math.PI*2;
    tick.position.set(Math.cos(angle)*1.72,Math.sin(angle)*1.72,0.04);
    tick.rotation.z=angle;
    lensGroup.add(tick);
  }
  
  // BMS text (using a flat ring with emissive center)
  const coreMat=new THREE.MeshStandardMaterial({
    color:0x050403,metalness:0.5,roughness:0.3,emissive:0xff8c2b,emissiveIntensity:0.15
  });
  const coreRing=new THREE.Mesh(new THREE.RingGeometry(0.35,0.55,48),coreMat);
  coreRing.position.z=0.12;
  lensGroup.add(coreRing);
  
  // Position lens off-screen for intro
  lensGroup.position.set(0,3,-2);
  lensGroup.rotation.x=0.3;
  scene.add(lensGroup);
  
  // ═══ PARTICLES ═══
  const particleCount=80;
  const pGeo=new THREE.BufferGeometry();
  const pPos=new Float32Array(particleCount*3);
  const pSizes=new Float32Array(particleCount);
  for(let i=0;i<particleCount;i++){
    pPos[i*3]=(Math.random()-0.5)*8;
    pPos[i*3+1]=(Math.random()-0.5)*6;
    pPos[i*3+2]=(Math.random()-0.5)*4-1;
    pSizes[i]=Math.random()*3+1;
  }
  pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  pGeo.setAttribute('size',new THREE.BufferAttribute(pSizes,1));
  const pMat=new THREE.PointsMaterial({color:0xff8c2b,size:0.03,transparent:true,opacity:0.4,sizeAttenuation:true});
  const particles=new THREE.Points(pGeo,pMat);
  scene.add(particles);
  
  // ═══ ANIMATION STATE ═══
  let time=0;
  let introPhase=0; // 0=fly-in, 1=shutter, 2=idle
  let introT=0;
  let shutterT=0;
  let touchX=0,touchY=0,targetRotX=0,targetRotY=0;
  
  // Touch handling
  let touching=false,startX=0,startY=0;
  renderer.domElement.addEventListener('touchstart',(e)=>{
    touching=true;
    startX=e.touches[0].clientX;
    startY=e.touches[0].clientY;
  });
  renderer.domElement.addEventListener('touchmove',(e)=>{
    if(!touching)return;
    const dx=(e.touches[0].clientX-startX)/W;
    const dy=(e.touches[0].clientY-startY)/H;
    targetRotY=dx*1.5;
    targetRotX=dy*0.8;
  });
  renderer.domElement.addEventListener('touchend',()=>{
    touching=false;
    targetRotX=0;
    targetRotY=0;
  });
  
  // ═══ RENDER LOOP ═══
  function animate(){
    requestAnimationFrame(animate);
    time+=0.016;
    
    // Intro animation
    if(introPhase===0){
      introT+=0.012;
      const t=Math.min(introT,1);
      const ease=1-Math.pow(1-t,3); // easeOutCubic
      lensGroup.position.y=3*(1-ease);
      lensGroup.position.z=-2*(1-ease);
      lensGroup.rotation.x=0.3*(1-ease);
      if(t>=1){introPhase=1;introT=0;}
    }
    else if(introPhase===1){
      // Shutter opening
      shutterT+=0.015;
      const t=Math.min(shutterT,1);
      const ease=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      bladeGroup.children.forEach((blade,i)=>{
        const scale=1-ease*0.7;
        blade.scale.set(scale,scale,1);
        blade.rotation.z=((i/8)*Math.PI*2)+ease*0.5;
      });
      bladeGroup.scale.set(1-ease*0.3,1-ease*0.3,1);
      if(t>=1){
        introPhase=2;
        bladeGroup.visible=false;
        document.getElementById('brand').classList.add('show');
      }
    }
    
    // Idle animations
    if(introPhase===2){
      // Gentle float
      lensGroup.position.y=Math.sin(time*0.5)*0.05;
      
      // Ring rotations
      lensGroup.children.forEach((child)=>{
        if(child.userData&&child.userData.speed){
          child.rotation.z+=child.userData.speed*0.001;
        }
      });
    }
    
    // Touch rotation (smooth lerp)
    touchX+=(targetRotX-touchX)*0.05;
    touchY+=(targetRotY-touchY)*0.05;
    if(introPhase===2){
      lensGroup.rotation.x=touchX*0.5;
      lensGroup.rotation.y=touchY*0.8+Math.sin(time*0.3)*0.02;
    }
    
    // Particles drift
    const positions=particles.geometry.attributes.position.array;
    for(let i=0;i<particleCount;i++){
      positions[i*3+1]+=Math.sin(time+i)*0.001;
      positions[i*3]+=Math.cos(time*0.7+i*0.5)*0.0005;
    }
    particles.geometry.attributes.position.needsUpdate=true;
    
    // Dynamic lighting
    rimLight.intensity=1.5+Math.sin(time*2)*0.3;
    fillLight.position.x=-3+Math.sin(time*0.5)*0.5;
    
    renderer.render(scene,camera);
  }
  animate();
  
  // Resize
  window.addEventListener('resize',()=>{
    const w=window.innerWidth,h=window.innerHeight;
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  });
})();
</script>
</body>
</html>
`;

export default function ThreeHero() {
  const webViewRef = useRef<WebView>(null);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: THREE_HTML }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: HERO_HEIGHT,
    backgroundColor: '#050403',
    overflow: 'hidden',
  },
  webview: {
    width: width,
    height: HERO_HEIGHT,
    backgroundColor: 'transparent',
  },
});
