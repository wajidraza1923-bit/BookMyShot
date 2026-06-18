/**
 * ThreeHero — Full-screen cinematic 3D hero (Three.js WebView)
 * Massive DSLR lens (40-50% height), orbiting photos, glass stat cards,
 * shutter animation, golden streaks, particles, premium intro sequence
 */
import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(SCREEN_H - 60, 720);

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050403;overflow:hidden;touch-action:none;-webkit-user-select:none;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif}
canvas{display:block;position:absolute;top:0;left:0}
#overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:0 20px 20px;pointer-events:none}
#overlay *{pointer-events:auto}
#content{opacity:0;transform:translateY(24px);transition:all 1s cubic-bezier(.25,.1,.25,1) .3s}
#content.show{opacity:1;transform:translateY(0)}
.eyebrow{font-size:8px;font-weight:700;color:#FF8C2B;letter-spacing:3.5px;text-align:center;margin-bottom:8px}
.headline{text-align:center;font-size:26px;font-weight:200;color:#fff;line-height:1.25}
.headline b{font-weight:700;color:#FFB347;text-shadow:0 0 30px rgba(255,140,43,.25)}
.sub{text-align:center;font-size:11px;color:rgba(255,255,255,.4);margin-top:8px;line-height:1.5}
.stats{display:flex;justify-content:center;gap:8px;margin-top:14px}
.stat-card{background:rgba(255,255,255,.03);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px 14px;text-align:center;min-width:85px}
.stat-num{font-size:16px;font-weight:800;color:#FF8C2B}
.stat-label{font-size:8px;color:rgba(255,255,255,.4);margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
.trust{display:flex;justify-content:center;gap:14px;margin-top:12px}
.trust span{font-size:9px;color:rgba(255,255,255,.45);display:flex;align-items:center;gap:3px}
.trust .dot{width:5px;height:5px;border-radius:50%;display:inline-block}
.btns{display:flex;justify-content:center;gap:10px;margin-top:14px}
.btn{padding:11px 20px;border-radius:12px;font-size:12px;font-weight:700;text-decoration:none;cursor:pointer;border:none}
.btn-p{background:#FF8C2B;color:#000}
.btn-g{background:rgba(255,255,255,.03);border:1.5px solid rgba(255,140,43,.3);color:#FFB347}
.ticker{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:10px;padding:5px 12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-radius:14px;align-self:center;width:fit-content;margin-left:auto;margin-right:auto}
.ticker-dot{width:5px;height:5px;border-radius:50%;background:#10B981;animation:pulse 2s infinite}
.ticker-text{font-size:9px;color:rgba(255,255,255,.4)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
</style></head><body>
<div id="overlay"><div id="content">
<div class="eyebrow">INDIA'S PREMIUM WEDDING MARKETPLACE</div>
<div class="headline">Find Your Perfect<br><b>Wedding Creator</b></div>
<div class="sub">10,000+ verified photographers, filmmakers &amp; artists</div>
<div class="ticker"><span class="ticker-dot"></span><span class="ticker-text" id="tick">📸 New booking confirmed in Srinagar</span></div>
<div class="stats">
<div class="stat-card"><div class="stat-num">10K+</div><div class="stat-label">Creators</div></div>
<div class="stat-card"><div class="stat-num">5K+</div><div class="stat-label">Weddings</div></div>
<div class="stat-card"><div class="stat-num">100+</div><div class="stat-label">Cities</div></div>
</div>
<div class="trust">
<span><span class="dot" style="background:#10B981"></span> Verified</span>
<span><span class="dot" style="background:#FFB347"></span> 4.9 Rated</span>
<span><span class="dot" style="background:#3B82F6"></span> Secure</span>
</div>
<div class="btns">
<button class="btn btn-p" onclick="window.ReactNativeWebView.postMessage('discover')">Find Creator</button>
<button class="btn btn-g" onclick="window.ReactNativeWebView.postMessage('inquiry')">Get Quote</button>
</div>
</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function(){
const W=window.innerWidth,H=window.innerHeight;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,W/H,.1,100);
camera.position.set(0,.5,5);

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(W,H);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
renderer.outputEncoding=THREE.sRGBEncoding;
document.body.insertBefore(renderer.domElement,document.getElementById('overlay'));

// Environment
const pmrem=new THREE.PMREMGenerator(renderer);
const eScene=new THREE.Scene();eScene.background=new THREE.Color(0x050403);
[new THREE.PointLight(0xff8c2b,4,10),new THREE.PointLight(0xffd700,3,10),new THREE.PointLight(0xffffff,2,10)].forEach((l,i)=>{l.position.set([3,-3,0][i],[3,1,-2][i],[4,3,5][i]);eScene.add(l)});
scene.environment=pmrem.fromScene(eScene,.04).texture;

// Lights
scene.add(new THREE.AmbientLight(0x111111,.6));
const key=new THREE.SpotLight(0xffeedd,3.5,15,Math.PI/5,.6);key.position.set(4,4,6);scene.add(key);
const fill=new THREE.PointLight(0xff8c2b,2,8);fill.position.set(-3,1,4);scene.add(fill);
const rim=new THREE.PointLight(0xffd700,2.5,7);rim.position.set(0,-2,3);scene.add(rim);
const top=new THREE.PointLight(0xffeedd,1,6);top.position.set(0,3,2);scene.add(top);

// Materials
const M={
  body:new THREE.MeshStandardMaterial({color:0x151515,metalness:.97,roughness:.1}),
  gold:new THREE.MeshStandardMaterial({color:0xcc8800,metalness:.95,roughness:.15,emissive:0xff6600,emissiveIntensity:.03}),
  chrome:new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.99,roughness:.04}),
  glass:new THREE.MeshPhysicalMaterial({color:0x0a0a20,metalness:0,roughness:0,transmission:.92,thickness:.5,ior:1.52,clearcoat:1,clearcoatRoughness:.01,reflectivity:1}),
  inner:new THREE.MeshPhysicalMaterial({color:0x050510,metalness:.05,roughness:0,transmission:.65,thickness:.8,ior:1.8,clearcoat:1,clearcoatRoughness:0}),
  blade:new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:.85,roughness:.2,side:2}),
  core:new THREE.MeshStandardMaterial({color:0x050403,metalness:.3,roughness:.4,emissive:0xff8c2b,emissiveIntensity:0})
};

// ═══ LENS ═══
const lens=new THREE.Group();

// Barrel
const barrel=new THREE.Mesh(new THREE.CylinderGeometry(2,2.05,.5,72,1,true),M.body);
barrel.rotation.x=Math.PI/2;lens.add(barrel);
// Back cap
lens.add(new THREE.Mesh(new THREE.RingGeometry(1.4,2,72),M.body));

// Accent ring
lens.add(new THREE.Mesh(new THREE.TorusGeometry(1.95,.05,16,72),M.gold));

// Inner rings (rotating)
const rings=[];
const rData=[[1.75,.03,'chrome'],[1.55,.035,'gold'],[1.35,.04,'body'],[1.15,.03,'gold'],[.95,.035,'chrome'],[.75,.025,'gold'],[.55,.03,'chrome']];
rData.forEach(([r,t,m],i)=>{
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r,t,12,72),M[m].clone());
  ring.position.z=.02*(i-3);ring.userData.spd=(i%2?1:-1)*(.12+i*.04);
  rings.push(ring);lens.add(ring);
});

// Glass elements
const g1=new THREE.Mesh(new THREE.SphereGeometry(1.5,48,48,0,Math.PI*2,0,.35),M.glass);
g1.position.z=.2;g1.scale.z=.25;lens.add(g1);
lens.add(Object.assign(new THREE.Mesh(new THREE.CircleGeometry(1.1,48),M.inner),{position:{x:0,y:0,z:.08}}));
lens.add(Object.assign(new THREE.Mesh(new THREE.CircleGeometry(.65,48),M.glass.clone()),{position:{x:0,y:0,z:.22}}));

// Aperture (9 blades)
const blades=new THREE.Group();
for(let i=0;i<9;i++){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(.5,.16);sh.lineTo(.5,-.16);sh.closePath();
const b=new THREE.Mesh(new THREE.ShapeGeometry(sh),M.blade);b.rotation.z=(i/9)*Math.PI*2;b.position.z=.14;blades.add(b);}
lens.add(blades);

// Focus bumps
for(let i=0;i<48;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.012,.05,.018),M.gold.clone());
const a=(i/48)*Math.PI*2;b.position.set(Math.cos(a)*1.97,Math.sin(a)*1.97,0);b.rotation.z=a;lens.add(b);}

// BMS core
const core=new THREE.Mesh(new THREE.CircleGeometry(.45,48),M.core);core.position.z=.15;lens.add(core);

lens.position.set(0,1.8,-1);lens.rotation.x=.2;
scene.add(lens);

// ═══ ORBITING PHOTOS ═══
const photos=new THREE.Group();
const photoUrls=['https://images.unsplash.com/photo-1519741497674-611481863552?w=150','https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=150','https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=150','https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=150'];
const loader=new THREE.TextureLoader();
photoUrls.forEach((url,i)=>{
  const tex=loader.load(url);tex.encoding=THREE.sRGBEncoding;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.8});
  const card=new THREE.Mesh(new THREE.PlaneGeometry(.7,.9),mat);
  const angle=(i/photoUrls.length)*Math.PI*2;
  card.position.set(Math.cos(angle)*2.8,Math.sin(angle)*.8+.5,-1+i*.3);
  card.rotation.y=-.3+i*.15;
  card.userData={angle,radius:2.8,yOff:Math.sin(angle)*.8};
  photos.add(card);
});
scene.add(photos);

// ═══ PARTICLES ═══
const pN=100;const pG=new THREE.BufferGeometry();const pA=new Float32Array(pN*3);
for(let i=0;i<pN;i++){pA[i*3]=(Math.random()-.5)*8;pA[i*3+1]=(Math.random()-.5)*7;pA[i*3+2]=(Math.random()-.5)*4-2;}
pG.setAttribute('position',new THREE.BufferAttribute(pA,3));
scene.add(new THREE.Points(pG,new THREE.PointsMaterial({color:0xffaa33,size:.025,transparent:true,opacity:.45,sizeAttenuation:true})));

// ═══ GOLDEN LIGHT STREAKS ═══
const streaks=[];
for(let i=0;i<3;i++){
  const g=new THREE.Mesh(new THREE.PlaneGeometry(.02,3),new THREE.MeshBasicMaterial({color:0xff8c2b,transparent:true,opacity:.08}));
  g.position.set(Math.cos(i*2.1)*2.2,Math.sin(i*2.1)*1.5,.5);g.rotation.z=i*.7;
  g.userData={baseAngle:i*2.1};streaks.push(g);scene.add(g);
}

// ═══ STATE ═══
let t=0,phase=0,pt=0;
let tX=0,tY=0,gX=0,gY=0;
const acts=['📸 Booking in Srinagar','⭐ 5★ review in Jammu','💬 Inquiry from Rajouri','🎬 Booked in Poonch','📷 New portfolio upload'];
let aI=0;setInterval(()=>{aI=(aI+1)%acts.length;const el=document.getElementById('tick');if(el)el.textContent=acts[aI]},3500);

renderer.domElement.addEventListener('touchstart',()=>{gX=0;gY=0});
renderer.domElement.addEventListener('touchmove',e=>{gX=(e.touches[0].clientY/H-.5)*.5;gY=(e.touches[0].clientX/W-.5)*1;});
renderer.domElement.addEventListener('touchend',()=>{gX=0;gY=0});

function run(){
requestAnimationFrame(run);t+=.016;

// Intro
if(phase===0){pt+=.007;const e=Math.min(pt,1),ez=1-Math.pow(1-e,4);
lens.position.y=3.5*(1-ez)+.4;lens.position.z=-3*(1-ez);lens.rotation.x=.35*(1-ez)+.05;
camera.position.z=7-ez*2;camera.position.y=.5-ez*.2;
photos.children.forEach((c,i)=>{c.material.opacity=ez*.7});
if(e>=1){phase=1;pt=0;}}
// Shutter
else if(phase===1){pt+=.01;const e=Math.min(pt,1),ez=e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2;
blades.children.forEach((b,i)=>{b.scale.set(1-ez*.85,1-ez*.85,1);b.rotation.z=(i/9)*Math.PI*2+ez*.7;});
M.core.emissiveIntensity=ez*.35;
if(e>=1){phase=2;blades.visible=false;document.getElementById('content').classList.add('show');}}
// Idle
else{
lens.position.y=.4+Math.sin(t*.35)*.04;
rings.forEach(r=>r.rotation.z+=r.userData.spd*.001);
M.core.emissiveIntensity=.25+Math.sin(t*2.5)*.1;
fill.intensity=2+Math.sin(t*1.8)*.5;
rim.position.x=Math.sin(t*.4)*.6;
// Photo orbit
photos.children.forEach((c,i)=>{
  const a=c.userData.angle+t*.15;
  c.position.x=Math.cos(a)*c.userData.radius;
  c.position.y=Math.sin(a*1.3)*.6+.3;
  c.position.z=-1.5+Math.sin(a)*.5;
  c.rotation.y=Math.sin(a)*.2;
});
// Streaks
streaks.forEach((s,i)=>{const a=s.userData.baseAngle+t*.3;s.position.x=Math.cos(a)*2.3;s.position.y=Math.sin(a)*1.6;s.rotation.z=a;s.material.opacity=.04+Math.sin(t*2+i)*.03;});
}

// Touch
tX+=(gX-tX)*.04;tY+=(gY-tY)*.04;
if(phase>=2){lens.rotation.x=.05+tX;lens.rotation.y=tY+Math.sin(t*.2)*.015;}

// Particles
const pos=pG.attributes.position.array;
for(let i=0;i<pN;i++){pos[i*3+1]+=Math.sin(t+i*.5)*.0006;pos[i*3]+=Math.cos(t*.4+i)*.0003;}
pG.attributes.position.needsUpdate=true;

renderer.render(scene,camera);}
run();
})();
</script></body></html>`;

export default function ThreeHero({ onNavigate }: { onNavigate?: (s: string) => void }) {
  return (
    <View style={st.wrap}>
      <WebView
        source={{ html: HTML }}
        style={st.wv}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        androidLayerType="hardware"
        onMessage={(e) => onNavigate?.(e.nativeEvent.data)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width, height: HERO_HEIGHT, backgroundColor: '#050403' },
  wv: { flex: 1, backgroundColor: 'transparent' },
});
