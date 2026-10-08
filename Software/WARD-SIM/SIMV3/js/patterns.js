(function () {
'use strict';
const {TAU}=window.MotioMath;
// All profiles keep the pen on the existing certified radial route. C rotates
// the paper to put the ink in the requested place, including bubble words.
const list=Object.freeze([
 // Profile RPM sets drawing progress, not the instantaneous motor-shaft RPM.
 {id:'circle',name:'Cirkel',detail:'Een gesloten cirkel',min:.68,max:.68,frequency:0,turns:1,rpm:5.6},
 {id:'flower3',name:'Bloem · 3 blaadjes',detail:'Drie brede lussen',min:.12,max:.86,frequency:3,turns:1,rpm:2.4},
 {id:'flower5',name:'Bloem · 5 blaadjes',detail:'Vijf symmetrische lussen',min:.12,max:.86,frequency:5,turns:1,rpm:1.8},
 {id:'flower7',name:'Bloem · 7 blaadjes',detail:'Zeven fijne lussen',min:.24,max:.86,frequency:7,turns:1,rpm:1.4},
 {id:'ripple12',name:'Golfring',detail:'Twaalf golven rond de cirkel',min:.43,max:.71,frequency:12,turns:1,rpm:1.2},
 {id:'rosette52',name:'Rozet · 2 rondes',detail:'Vijf overlappende lussen',min:.24,max:.84,frequency:2.5,turns:2,rpm:3.6},
 {id:'rosette73',name:'Rozet · 3 rondes',detail:'Zeven overlappende lussen',min:.24,max:.84,frequency:7/3,turns:3,rpm:3.6},
 {id:'wovenFlower',name:'Verweven bloem',detail:'73 verschoven lussen · 18 rondes',min:.12,max:.86,frequency:73/18,turns:18,rpm:2.4},
 {id:'openRosette',name:'Open rozet',detail:'17 ruime lussen · 6 rondes',min:.24,max:.76,frequency:17/6,turns:6,rpm:3.6},
 {id:'wovenRosette',name:'Dichte rozet',detail:'61 verweven lussen · 16 rondes',min:.08,max:.86,frequency:61/16,turns:16,rpm:2.4},
 {id:'wovenStar',name:'Sterrozet',detail:'79 overlappende lussen met open kern · 18 rondes',min:.18,max:.86,frequency:79/18,turns:18,rpm:2.4},
 {id:'spiral',name:'Spiraal',detail:'Drie rondes van binnen naar buiten',min:.08,max:.86,turns:3,rpm:4.8},
 {id:'vives',name:'VIVES',detail:'Vloeiende bubbelletters · verbonden · vaste pen',turns:1,rpm:.64}
].map(Object.freeze));
// Rounded outlines joined in one pen-down stroke. The knots stay above the
// paper centre so the polar paper angle remains defined throughout the word.
const word=Object.freeze([
 [-56,-14],[-61,-16],[-69,-36],[-69,-41],[-65,-43],[-61,-40],[-56,-26],[-51,-40],[-47,-43],[-43,-41],[-43,-36],[-51,-16],[-56,-14], // V
 [-44,-11],[-33,-14], // flowing connector
 [-38,-17],[-38,-38],[-36,-43],[-30,-43],[-28,-38],[-28,-17],[-33,-14], // I
 [-22,-11],[-10,-14],
 [-15,-16],[-23,-36],[-23,-41],[-19,-43],[-15,-40],[-10,-26],[-5,-40],[-1,-43],[3,-41],[3,-36],[-5,-16],[-10,-14], // V
 [4,-11],[18,-14],
 [11,-16],[9,-22],[9,-36],[11,-42],[18,-44],[29,-44],[33,-41],[31,-37],[20,-36],[19,-32],[28,-31],[30,-28],[28,-25],[19,-24],[20,-20],[31,-20],[34,-17],[31,-14],[18,-14], // E
 [33,-11],[48,-14],
 [41,-17],[41,-22],[45,-24],[50,-22],[57,-23],[58,-26],[51,-29],[45,-31],[41,-36],[42,-41],[48,-44],[58,-44],[65,-41],[65,-37],[61,-35],[56,-37],[50,-36],[49,-33],[57,-31],[63,-28],[66,-23],[64,-17],[58,-14],[48,-14], // S
 [58,-11],[68,-14] // rounded exit
].map(Object.freeze));
const generated=Object.freeze({id:'word',name:'Eigen woord',detail:'Verbonden bubbelletters',turns:1,rpm:.9});
const isText=p=>p?.id==='vives'||p?.id==='word';
const textPath=(g,p)=>p?.id==='word'?window.MotioBubbleText.path(g):word;
function textPoint(phase,g,p=get(g.patternId)) {
 const knots=textPath(g,p),segments=knots.length-1,at=Math.max(0,Math.min(segments,phase/TAU*segments)),i=Math.min(Math.floor(at),segments-1),t=at-i;
 // Catmull-Rom curves share tangents at each knot: no stop at every corner.
 const a=knots[Math.max(0,i-1)],b=knots[i],c=knots[i+1],d=knots[Math.min(knots.length-1,i+2)],scale=g.paper.safeRadius/95;
 const value=[],derivative=[];
 for(let axis=0;axis<2;axis++){
  const m=(c[axis]-a[axis])/2,n=(d[axis]-b[axis])/2;
  const u=2*b[axis]-2*c[axis]+m+n,v=-3*b[axis]+3*c[axis]-2*m-n;
  value[axis]=((u*t+v)*t+m)*t+b[axis];
  derivative[axis]=(3*u*t*t+2*v*t+m)*segments/TAU;
 }
 return {x:value[0]*scale,y:value[1]*scale,dx:derivative[0]*scale,dy:derivative[1]*scale};
}
const get=id=>id==='word'?generated:list.find(p=>p.id===id);
const motion=p=>isText(p)?'A/B en C volgen verbonden bubbelletters in één vloeiend penpad':p.id==='circle'?'A/B houden de pen op vaste radius; C draait het papier':p.id==='spiral'?'A/B bewegen de pen langzaam naar buiten; C draait het papier':'A/B bewegen heen en weer; C draait het papier';
function radius(p,phase,g) {
 if(isText(p)){const t=textPoint(phase,g,p),value=Math.hypot(t.x,t.y);return {value,derivative:(t.x*t.dx+t.y*t.dy)/value};}
 const R=g.paper.safeRadius,span=(p.max-p.min)*R;
 if(p.id==='spiral')return {value:p.min*R+span*phase/(TAU*p.turns),derivative:span/(TAU*p.turns)};
 return {value:p.min*R+span*(1+Math.cos(p.frequency*phase))/2,derivative:-span*p.frequency*Math.sin(p.frequency*phase)/2};
}
function point(g,r) {const a=g.reachAngle*Math.PI/180;return {x:g.paper.x+r*Math.cos(a),y:g.paper.y+r*Math.sin(a)};}
function textRPM(config,p,g) {
 // Check the actual word once before drawing. Short letters can require faster
 // paper reversals than long words; leave 30% reserve in the existing limits.
 const count=(textPath(g,p).length-1)*64,a=g.reachAngle*Math.PI/180;
 let previous=null,last=null,limit=Infinity;
 for(let i=0;i<=count;i++){
  const phase=TAU*i/count,next=pose(config,p,phase,previous);
  if(!next.valid)throw Error('Woord niet bereikbaar met deze geometrie.');
  previous=next.pose;
  const v=next.r.derivative,px=Math.cos(a)*v,py=Math.sin(a)*v,J=next.pose.J,det=J.ax*J.by-J.ay*J.bx;
  const w={A:(J.by*px-J.bx*py)/det,B:(J.ax*py-J.ay*px)/det,C:next.paperDerivative,pen:v};
  for(const key of ['A','B','C','pen']){
   const speedLimit=key==='pen'?g.maxPenSpeed:(key==='C'?g.maxPaperRPM:g.maxRPM)*TAU/60;
   const accelerationLimit=key==='pen'?g.maxPenAcceleration:key==='C'?g.paperAcceleration:g.acceleration;
   if(w[key])limit=Math.min(limit,.7*speedLimit/Math.abs(w[key]));
   if(last){const derivative=Math.abs(w[key]-last[key])*count/TAU;
    if(derivative)limit=Math.min(limit,Math.sqrt(.7*accelerationLimit/derivative));
   }
  }
  last=w;
 }
 const pace=(textPath(g,p).length-1)/(word.length-1);
 return limit*60/TAU*pace;
}
function prepare(config) {
 const p=get(config.patternId);if(!p)return config;
 if(!config.rpmC)throw Error('Een patroon vraagt papierrotatie. Kies Eigen motorinstellingen voor stilstaand papier.');
 const g=window.MotioGeometry.build(config),home=window.MotioKinematics.solve(config,{A:config.phaseA*Math.PI/180,B:config.phaseB*Math.PI/180,C:config.phaseC*Math.PI/180});
 const ik=window.MotioKinematics.inverse(config,point(g,radius(p,0,g).value),home.valid?home:null,true);
 if(!ik.valid)throw Error('Patroon niet bereikbaar met deze geometrie. Herstel bouwgeometrie.');
 const start=isText(p)?textPoint(0,g,p):null;
 const phaseC=start?g.reachAngle-Math.atan2(start.y,start.x)*180/Math.PI:config.phaseC;
 const rpmC=p.id==='word'?Math.sign(config.rpmC)*Math.min(Math.abs(config.rpmC),textRPM(config,p,g)):config.rpmC;
 return window.MotioGeometry.normalize({...config,rpmC,phaseA:ik.q.A*180/Math.PI,phaseB:ik.q.B*180/Math.PI,phaseC});
}
function pose(config,p,phase,previous) {
 const g=window.MotioGeometry.build(config),r=radius(p,phase,g),ik=window.MotioKinematics.inverse(config,point(g,r.value),previous,true);
 if(!ik.valid)return {valid:false,reason:ik.reason};
 let paperDelta=Math.sign(config.rpmC)*phase,paperDerivative=Math.sign(config.rpmC);
 if(isText(p)){
  const t=textPoint(phase,g,p),start=textPoint(0,g,p);
  paperDelta=Math.atan2(start.y,start.x)-Math.atan2(t.y,t.x);
  paperDerivative=-(t.x*t.dy-t.y*t.dx)/(r.value*r.value);
 }
 const q={...ik.q,C:config.phaseC*Math.PI/180+paperDelta};
 return {valid:true,q,pose:ik.pose,r,paperDelta,paperDerivative};
}
// The ideal reference is computed from the requested machine position and paper
// angle. Live ink is computed independently by forward kinematics in Simulation.
function preview(config,p,samples=360*p.turns) {
 const g=window.MotioGeometry.build(config),points=[];
 if(isText(p)){
  const count=(textPath(g,p).length-1)*16;
  for(let i=0;i<=count;i++){const t=textPoint(TAU*i/count,g,p);points.push({x:t.x,y:t.y});}
  return points;
 }
 for(let i=0;i<=samples;i++){
  const phase=TAU*p.turns*i/samples,r=radius(p,phase,g).value;
  points.push(window.MotioPaper.machineToPaper(point(g,r),config.phaseC*Math.PI/180+Math.sign(config.rpmC||-1)*phase,g));
 }
 return points;
}
function svg(g,points,name) {
 const R=g.paper.radius,path=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[-R-4,-R-4,2*R+8,2*R+8].join(' ')+'" role="img" aria-label="Voorbeeld '+name+'"><circle r="'+R+'" fill="#f4f0e7"/><circle r="'+g.paper.safeRadius+'" fill="none" stroke="#b5a284" stroke-dasharray="3 5"/><path d="'+path+'" fill="none" stroke="#233b50" stroke-width="1.2"/></svg>';
}
function timing(config,p,t) {
 // Keep roughly the same time per curve segment as VIVES for short/long words.
 const pace=p.id==='word'?(textPath(window.MotioGeometry.build(config),p).length-1)/(word.length-1):1;
 const speed=Math.abs(config.rpmC)*TAU/60/pace,limit=TAU*p.turns,ramp=Math.max(3,speed/config.paperAcceleration),duration=limit/speed+ramp;
 if(t>=duration)return {phase:limit,speed:0,duration,complete:true};
 if(t<ramp)return {phase:speed*t*t/(2*ramp),speed:speed*t/ramp,duration};
 if(t<=duration-ramp)return {phase:speed*(t-ramp/2),speed,duration};
 const remaining=duration-t;return {phase:limit-speed*remaining*remaining/(2*ramp),speed:speed*remaining/ramp,duration};
}
window.MotioPatterns={list,get,isText,motion,radius,point,textPoint,prepare,pose,preview,svg,timing};
})();
