(function(){
'use strict';
const n=v=>+v.toFixed(5),rect=(w,h)=>[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
function parts(g){
 const bodies=window.MotioGeometry.bodies(g,window.MotioBOM.referencePose(g)),deck=bodies.find(b=>b.id==='BASE');
 const W=g.base.width,H=g.base.height,w=g.box.wall,wallH=-g.box.bottom-g.box.bottomThickness;
 const rib=[{x:0,y:0},{x:W-2*w,y:0},{x:W-2*w,y:30},{x:254,y:30},{x:254,y:36},{x:234,y:36},{x:234,y:30},{x:104,y:30},{x:104,y:36},{x:84,y:36},{x:84,y:30},{x:0,y:30}];
 return [
  {id:'top-plate',bom:'BASE',qty:1,title:'Bovenplaat · MDF 6 mm · één plaat',width:W,height:H,outline:rect(W,H),holes:deck.holes.map(h=>({x:h.x+deck.x,y:h.y+deck.y,r:h.r})),slots:deck.slots.map(s=>({x:s.x+deck.x,y:s.y+deck.y,w:s.w,l:s.l}))},
  {id:'bottom',bom:'BOTTOM',qty:1,title:'Bodem · MDF 6 mm',width:W,height:H,outline:rect(W,H),holes:[]},
  {id:'front-back',bom:'WALL-FB',qty:2,title:'Voor- / achterwand · MDF 6 mm',width:W,height:wallH,outline:rect(W,wallH),holes:[]},
  {id:'side',bom:'WALL-LR',qty:2,title:'Zijwand · MDF 6 mm',width:H-2*w,height:wallH,outline:rect(H-2*w,wallH),holes:[]},
  {id:'rib',bom:'RIB',qty:2,title:'Rib · MDF 6 mm · 30 mm web + 6 mm tanden',width:W-2*w,height:36,outline:rib,holes:[]},
  {id:'platter',bom:'PL',qty:1,title:'Plateau · MDF 6 mm · M3-koppen achteraf verzinken',width:g.paper.radius*2,height:g.paper.radius*2,circle:{x:g.paper.radius,y:g.paper.radius,r:g.paper.radius},holes:[{x:g.paper.radius,y:g.paper.radius,r:2.8},...Array.from({length:4},(_,i)=>({x:g.paper.radius+g.hub.boltRadius*Math.cos(i*Math.PI/2),y:g.paper.radius+g.hub.boltRadius*Math.sin(i*Math.PI/2),r:1.7}))]}
 ];
}
function entities(part){
 const paths=[];
 if(part.outline)paths.push({points:part.outline});
 if(part.circle)paths.push({circle:part.circle});
 for(const h of part.holes||[])paths.push({circle:h});
 for(const s of part.slots||[])paths.push({points:rect(s.w,s.l).map(p=>({x:p.x+s.x-s.w/2,y:p.y+s.y-s.l/2}))});
 return paths;
}
function dxf(part){
 const out=['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES'];
 for(const path of entities(part))if(path.circle){const c=path.circle;out.push('0','CIRCLE','8','CUT','10',String(n(c.x)),'20',String(n(-c.y)),'30','0','40',String(n(c.r)));}
 else {out.push('0','LWPOLYLINE','8','CUT','90',String(path.points.length),'70','1');for(const p of path.points)out.push('10',String(n(p.x)),'20',String(n(-p.y)));}
 return [...out,'0','ENDSEC','0','EOF'].join('\r\n');
}
function cuts(part){return entities(part).map(p=>p.circle?'<circle cx="'+n(p.circle.x)+'" cy="'+n(p.circle.y)+'" r="'+n(p.circle.r)+'"/>':'<polygon points="'+p.points.map(v=>n(v.x)+','+n(v.y)).join(' ')+'"/>').join('');}
function svg(part){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+part.width+'mm" height="'+part.height+'mm" viewBox="0 0 '+part.width+' '+part.height+'"><title>'+part.title+'</title><g fill="none" stroke="#000" stroke-width="0.1">'+cuts(part)+'</g></svg>';}
function layout(g){
 const width=1220,height=2440,gap=12,placements=[];let x=gap,y=gap,row=0;
 for(const p of parts(g))for(let i=0;i<p.qty;i++){
  if(x+p.width+gap>width){x=gap;y+=row+gap;row=0;}
  if(y+p.height+gap>height)throw Error('Laserdelen passen niet op de grondplaat');
  placements.push({id:p.id,index:i,x,y,width:p.width,height:p.height,part:p});x+=p.width+gap;row=Math.max(row,p.height);
 }
 return {width,height,usedHeight:y+row+gap,placements};
}
function layoutSVG(g){const l=layout(g);return '<svg xmlns="http://www.w3.org/2000/svg" width="'+l.width+'mm" height="'+l.height+'mm" viewBox="0 0 '+l.width+' '+l.height+'"><title>SIMV7 · alle 6 mm MDF-delen · geen kerfcompensatie</title><g fill="none" stroke="#000" stroke-width="0.1">'+l.placements.map(p=>'<g transform="translate('+p.x+' '+p.y+')">'+cuts(p.part)+'</g>').join('')+'</g></svg>';}
function printParts(g){
 const pose=window.MotioBOM.referencePose(g),bodies=window.MotioGeometry.bodies(g,pose),rows=window.MotioBOM.create(g).filter(r=>r.method==='3D-printen');
 return rows.map(row=>{
  const first=bodies.find(b=>b.bom===row.id),parts=bodies.filter(b=>b.bom===row.id&&b.instance===first.instance),key=row.id.slice(-1);
  let origin={x:first.x,y:first.y},angle=0,rotate=[0,0,0];
  if(row.id.startsWith('K-')){origin=g[key].pivot;angle=-pose.q[key];if(key==='B')rotate=[180,0,0];}
  if(row.id.startsWith('L-')){origin=key==='A'?pose.a:pose.b;angle=-Math.atan2(pose.pen.y-origin.y,pose.pen.x-origin.x);}
  if(row.id==='KNOB')rotate=[0,90,0];
  return {id:row.id,name:row.name,qty:row.qty,filename:'MOTIO-V7-'+row.id+'.stl',origin,angle,rotate,parts};
 });
}
window.MotioFabrication={parts,entities,svg,dxf,layout,layoutSVG,printParts};
})();
