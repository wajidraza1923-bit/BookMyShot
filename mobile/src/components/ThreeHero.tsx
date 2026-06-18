/**
 * ThreeHero — Real 3D Camera Lens (Three.js WebView)
 * Premium DSLR lens with PBR materials, environment reflections,
 * cinematic lighting, shutter animation, touch interaction
 */
import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 520;

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050403;overflow:hidden;touch-action:none;-webkit-user-select:none}
canvas{display:block}
#ui{position:absolute;bottom:0;left:0;right:0;padding:0 20px 24px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;opacity:0;transform:translateY(30px);transition:all 1.2s cubic-bezier(.25,.1,.25,1)}
#ui.show{opacity:1;transform:translateY(0)}
.eyebrow{font-size:8px;font-weight:700;color:#FF8C2B;letter-spacing:3px;margin-bottom:6px}
.h1{font-size:24px;font-weight:300;color:#fff;line-height:1.3}
.h1 span{font-weight:700;color:#FFB347;text-shadow:0 0 20px rgba(255,140,43,.3)}
.sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:8px;line-height:1.5}
.trust{display:flex;justify-content:center;gap:12px;margin-top:12px}
.trust-item{display:flex;align-items:center;gap:3px;font-size:9px;color:rgba(255,255,255,.5)}
.trust-dot{width:5px;height:5px;border-radius:50%}
.btns{display:flex;justify-content:center;gap:10px;margin-top:16px}
.btn{padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;text-decoration:none;display:inline-block}
.btn-primary{background:#FF8C2B;color:#000}
.btn-glass{border:1.5px solid rgba(255,140,43,.35);color:#FFB347;background:rgba(255,255,255,.02)}
.activity{margin-top:12px;display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.04);border-radius:16px;padding:5px 12px}
.activity-dot{width:5px;height:5px;border-radius:50%;background:#10B981}
.activity-text{font-size:9px;color:rgba(255,255,255,.45)}
</style></head><body>
<div id="ui">
<div class="eyebrow">PREMIUM WEDDING MARKETPLACE</div>
<div class="h1">Find Your Perfect<br><span>Wedding Creator</span></div>
<div class="sub">Verified photographers, filmmakers & artists across India</div>
<div class="activity"><span class="activity-dot"></span><span class="activity-text" id="actText">📸 New booking confirmed in Srinagar</span></div>
<div class="trust">
<span class="trust-item"><span class="trust-dot" style="background:#10B981"></span>Verified</span>
<span class="trust-item"><span class="trust-dot" style="background:#FFB347"></span>4.9 Rated</span>
<span class="trust-item"><span class="trust-dot" style="background:#3B82F6"></span>Secure</span>
</div>
<div class="btns">
<a class="btn btn-primary" onclick="window.ReactNativeWebView.postMessage('discover')">Find Creator</a>
<a class="btn btn-glass" onclick="window.ReactNativeWebView.postMessage('inquiry')">Get Quote</a>
</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function(){
const W=window.innerWidth,H=window.innerHeight;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(40,W/H,0.1,100);
camera.position.set(0,0.3,4.5);

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setSize(W,H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
renderer.outputEncoding=THREE.sRGBEncoding;
document.body.insertBefore(renderer.domElement,document.getElementById('ui'));

// Env map for reflections
const pmremGen=new THREE.PMREMGenerator(renderer);
const envScene=new THREE.Scene();
envScene.background=new THREE.Color(0x050403);
const envL1=new THREE.PointLight(0xff8c2b,3,10);envL1.position.set(2,3,4);envScene.add(envL1);
const envL2=new THREE.PointLight(0xffd700,2,10);envL2.position.set(-3,1,2);envScene.add(envL2);
const envL3=new THREE.PointLight(0xffffff,1,10);envL3.position.set(0,-2,3);envScene.add(envL3);
const envTex=pmremGen.fromScene(envScene,0.04).texture;
scene.environment=envTex;

// Lights
const key=new THREE.SpotLight(0xffeedd,3,12,Math.PI/6,0.5);key.position.set(3,3,5);scene.add(key);
const fill=new THREE.PointLight(0xff8c2b,1.5,8);fill.position.set(-2,1,3);scene.add(fill);
const rim=new THREE.PointLight(0xffd700,2,6);rim.position.set(0,-1.5,2);scene.add(rim);
const ambient=new THREE.AmbientLight(0x111111,0.8);scene.add(ambient);

// Materials
const darkMetal=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:0.97,roughness:0.12});
const goldMetal=new THREE.MeshStandardMaterial({color:0xd4910a,metalness:0.95,roughness:0.18,emissive:0xff6600,emissiveIntensity:0.02});
const chrome=new THREE.MeshStandardMaterial({color:0x333333,metalness:0.99,roughness:0.05});
const glass=new THREE.MeshPhysicalMaterial({color:0x080818,metalness:0,roughness:0,transmission:0.9,thickness:0.4,ior:1.52,clearcoat:1,clearcoatRoughness:0.02,reflectivity:1});
const innerGlass=new THREE.MeshPhysicalMaterial({color:0x040410,metalness:0.05,roughness:0,transmission:0.7,thickness:0.8,ior:1.8,clearcoat:1,clearcoatRoughness:0});
const bladeMat=new THREE.MeshStandardMaterial({color:0x080808,metalness:0.85,roughness:0.25,side:2});

// Lens group
const lens=new THREE.Group();

// Outer body (thick cylinder)
const body=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.65,0.35,64,1,true),darkMetal);
body.rotation.x=Math.PI/2;
lens.add(body);

// Front ring (gold accent)
const frontRing=new THREE.Mesh(new THREE.TorusGeometry(1.55,0.04,16,64),goldMetal);
lens.add(frontRing);

// Multiple inner rings
const rings=[];
[1.4,1.25,1.1,0.95,0.8,0.65].forEach((r,i)=>{
  const mat=i%3===0?goldMetal.clone():i%3===1?chrome.clone():darkMetal.clone();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r,0.025+i*0.003,12,64),mat);
  ring.position.z=0.01*(i-3);
  ring.userData.speed=(i%2?1:-1)*(0.15+i*0.05);
  rings.push(ring);
  lens.add(ring);
});

// Glass elements (convex front element)
const frontGlass=new THREE.Mesh(new THREE.SphereGeometry(1.2,48,48,0,Math.PI*2,0,0.4),glass);
frontGlass.position.z=0.15;
frontGlass.scale.z=0.3;
lens.add(frontGlass);

const midGlass=new THREE.Mesh(new THREE.CircleGeometry(0.9,48),innerGlass);
midGlass.position.z=0.05;
lens.add(midGlass);

const rearGlass=new THREE.Mesh(new THREE.CircleGeometry(0.55,48),glass.clone());
rearGlass.position.z=0.2;
lens.add(rearGlass);

// Aperture blades (9 blades)
const blades=new THREE.Group();
for(let i=0;i<9;i++){
  const shape=new THREE.Shape();
  shape.moveTo(0,0);shape.lineTo(0.45,0.15);shape.lineTo(0.45,-0.15);shape.closePath();
  const blade=new THREE.Mesh(new THREE.ShapeGeometry(shape),bladeMat);
  blade.rotation.z=(i/9)*Math.PI*2;
  blade.position.z=0.12;
  blades.add(blade);
}
lens.add(blades);

// Focus grip texture (tiny bumps around barrel)
for(let i=0;i<36;i++){
  const bump=new THREE.Mesh(new THREE.BoxGeometry(0.015,0.06,0.02),goldMetal.clone());
  const a=(i/36)*Math.PI*2;
  bump.position.set(Math.cos(a)*1.58,Math.sin(a)*1.58,0);
  bump.rotation.z=a;
  lens.add(bump);
}

// BMS core (emissive center)
const coreMat=new THREE.MeshStandardMaterial({color:0x050403,metalness:0.3,roughness:0.5,emissive:0xff8c2b,emissiveIntensity:0});
const core=new THREE.Mesh(new THREE.CircleGeometry(0.4,48),coreMat);
core.position.z=0.13;
lens.add(core);

lens.position.set(0,0.8,0);
lens.rotation.x=0.1;
scene.add(lens);

// Particles
const pCount=60;
const pGeo=new THREE.BufferGeometry();
const pArr=new Float32Array(pCount*3);
for(let i=0;i<pCount;i++){pArr[i*3]=(Math.random()-.5)*6;pArr[i*3+1]=(Math.random()-.5)*5;pArr[i*3+2]=(Math.random()-.5)*3-1;}
pGeo.setAttribute('position',new THREE.BufferAttribute(pArr,3));
const pMat=new THREE.PointsMaterial({color:0xffaa33,size:0.02,transparent:true,opacity:0.5,sizeAttenuation:true});
scene.add(new THREE.Points(pGeo,pMat));

// State
let time=0,phase=0,phaseT=0;
let touchX=0,touchY=0,tgtX=0,tgtY=0,touching=false;
const activities=['📸 New booking in Srinagar','⭐ Creator rated 5★ in Jammu','💬 Inquiry from Rajouri','🎬 Filmmaker booked in Poonch','📷 Portfolio updated'];
let actIdx=0;

renderer.domElement.addEventListener('touchstart',e=>{touching=true;tgtX=0;tgtY=0;});
renderer.domElement.addEventListener('touchmove',e=>{
  if(!touching)return;
  const cx=e.touches[0].clientX/W-.5;
  const cy=e.touches[0].clientY/H-.5;
  tgtX=cy*.6;tgtY=cx*1.2;
});
renderer.domElement.addEventListener('touchend',()=>{touching=false;tgtX=0;tgtY=0;});

setInterval(()=>{actIdx=(actIdx+1)%activities.length;const el=document.getElementById('actText');if(el)el.textContent=activities[actIdx];},4000);

function animate(){
  requestAnimationFrame(animate);
  time+=0.016;

  // Phase 0: Intro (lens flies in)
  if(phase===0){
    phaseT+=0.008;
    const t=Math.min(phaseT,1);
    const e=1-Math.pow(1-t,4);
    lens.position.y=2.5*(1-e)+0.2;
    lens.rotation.x=0.4*(1-e)+0.05;
    camera.position.z=6-e*1.5;
    if(t>=1){phase=1;phaseT=0;}
  }
  // Phase 1: Shutter opens
  else if(phase===1){
    phaseT+=0.012;
    const t=Math.min(phaseT,1);
    const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    blades.children.forEach((b,i)=>{
      b.scale.set(1-e*.8,1-e*.8,1);
      b.rotation.z=(i/9)*Math.PI*2+e*.6;
    });
    coreMat.emissiveIntensity=e*0.3;
    if(t>=1){phase=2;blades.visible=false;document.getElementById('ui').classList.add('show');}
  }
  // Phase 2: Idle
  else{
    lens.position.y=0.2+Math.sin(time*.4)*.03;
    rings.forEach(r=>{r.rotation.z+=r.userData.speed*.001;});
    coreMat.emissiveIntensity=0.2+Math.sin(time*2)*.1;
    fill.intensity=1.5+Math.sin(time*1.5)*.4;
    rim.position.x=Math.sin(time*.3)*.5;
  }

  // Touch interaction
  touchX+=(tgtX-touchX)*.04;
  touchY+=(tgtY-touchY)*.04;
  if(phase>=2){
    lens.rotation.x=0.05+touchX;
    lens.rotation.y=touchY+Math.sin(time*.25)*.02;
  }

  // Particles
  const pos=pGeo.attributes.position.array;
  for(let i=0;i<pCount;i++){pos[i*3+1]+=Math.sin(time+i)*.0008;pos[i*3]+=Math.cos(time*.5+i)*.0004;}
  pGeo.attributes.position.needsUpdate=true;

  renderer.render(scene,camera);
}
animate();
})();
</script></body></html>`;

export default function ThreeHero({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const webViewRef = useRef<WebView>(null);

  const handleMessage = (event: any) => {
    const msg = event.nativeEvent.data;
    if (onNavigate) onNavigate(msg);
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: HTML }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        androidLayerType="hardware"
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height: HERO_HEIGHT, backgroundColor: '#050403' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
