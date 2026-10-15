(function(){
'use strict';
const n=v=>+v.toFixed(4);
function crankOutline(g,key){
 const L=g['radius'+key],w=g.crankWidth/2,t=Math.min(5,L/3),x=Math.sqrt(g.hub.rootRadius**2-w**2),end=L-t,y=Math.sqrt(12**2-t**2),points=[{x,y:w},{x:end,y:w},{x:end,y}];
 const a=Math.acos(-t/12),b=Math.asin(w/g.hub.rootRadius),arc=(cx,r,start,stop)=>{const count=Math.ceil(Math.abs(stop-start)*r/.4);for(let i=1;i<=count;i++){const a=start+(stop-start)*i/count;points.push({x:cx+r*Math.cos(a),y:r*Math.sin(a)});}};
 arc(L,12,a,-a);points.push({x:end,y:-w},{x,y:-w});arc(0,g.hub.rootRadius,-b,b-2*Math.PI);return points;
}
function parts(g){
 const bodies=window.MotioGeometry.bodies(g,window.MotioBOM.referencePose(g)),deck=bodies.find(b=>b.id==='BASE'),stiff=bodies.find(b=>b.id==='stiffenerA');
 const rect=(w,h)=>[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
 return [
  {id:'top-plate',title:'Bovenplaat · 358 × 404 × 4 MDF',width:g.base.width,height:g.base.height,outline:rect(g.base.width,g.base.height),holes:deck.holes.map(h=>({x:h.x+deck.x,y:h.y+deck.y,r:h.r}))},
  {id:'reinforcement',title:'3× vlak staalplaatje · 60 × 60 × 1,5',width:60,height:60,outline:rect(60,60),holes:stiff.holes.map(h=>({x:30+h.x,y:30+h.y,r:h.r}))},
  {id:'crank',title:'2× PETG-kruk · 6 mm · 3D-print',width:g.radiusA+22,height:34,outline:crankOutline(g,'A'),holes:[{x:0,y:0,r:2.8},{x:g.radiusA,y:0,r:3.3},...Array.from({length:4},(_,i)=>({x:g.hub.boltRadius*Math.cos(Math.PI/4+i*Math.PI/2),y:g.hub.boltRadius*Math.sin(Math.PI/4+i*Math.PI/2),r:2.2}))]},
  {id:'platter',title:'Plateau · Ø210 × 4 MDF',width:g.paper.radius*2,height:g.paper.radius*2,circle:{x:0,y:0,r:g.paper.radius},holes:[{x:0,y:0,r:2.8},...Array.from({length:4},(_,i)=>({x:g.hub.boltRadius*Math.cos(Math.PI/4+i*Math.PI/2),y:g.hub.boltRadius*Math.sin(Math.PI/4+i*Math.PI/2),r:2.2}))]}
 ];
}
function dxf(part){
 const out=['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES'];
 const circle=(p)=>out.push('0','CIRCLE','8','CUT','10',String(n(p.x)),'20',String(n(-p.y)),'30','0','40',String(n(p.r)));
 if(part.circle)circle(part.circle);
 if(part.outline){out.push('0','LWPOLYLINE','8','CUT','90',String(part.outline.length),'70','1');for(const p of part.outline)out.push('10',String(n(p.x)),'20',String(n(-p.y)));}
 part.holes.forEach(circle);out.push('0','ENDSEC','0','EOF');return out.join('\r\n');
}
function svg(part,g){
 const xmin=part.id==='crank'?-20:part.id==='platter'?-g.paper.radius-12:-12,ymin=part.id==='crank'?-25:part.id==='platter'?-g.paper.radius-12:-12;
 const xmax=part.id==='crank'?g.radiusA+22:part.id==='platter'?g.paper.radius+12:part.width+12,ymax=part.id==='crank'?40:part.id==='platter'?g.paper.radius+12:part.height+12;
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+(xmax-xmin+165)+'mm" height="'+(ymax-ymin)+'mm" viewBox="'+[xmin,ymin,xmax-xmin+165,ymax-ymin].join(' ')+'"><rect x="'+xmin+'" y="'+ymin+'" width="'+(xmax-xmin+165)+'" height="'+(ymax-ymin)+'" fill="white"/><g fill="none" stroke="#18344b" stroke-width=".25">';
 if(part.outline)s+='<polygon points="'+part.outline.map(p=>n(p.x)+','+n(p.y)).join(' ')+'"/>';
 if(part.circle)s+='<circle cx="0" cy="0" r="'+part.circle.r+'"/>';
 for(const p of part.holes)s+='<circle cx="'+n(p.x)+'" cy="'+n(p.y)+'" r="'+p.r+'"/>';
 s+='</g><g fill="#18344b" font-family="Arial" font-size="4">';
 const x=xmax+4,y=ymin+7;
 const labels=[part.title,'Maten mm · geometrie 1:1 bij 100% print','XY: oorsprong linksboven bovenplaat.','DXF: zelfde XY; Y wijst naar beneden.',...(part.id==='top-plate'?['A: X '+g.pivotAx+' / Y '+g.pivotAy,'B: X '+g.pivotBx+' / Y '+g.pivotBy,'C: X '+g.paper.x+' / Y '+g.paper.y,'Elk: Ø22,5 + 4× Ø3,6 op 31×31']:part.id==='crank'?['h.o.h. '+g.radiusA+'; breedte '+g.crankWidth,'Wortel Ø34, einde Ø24','Ø5,6 + 4× Ø4,4 op 16×16','Uiteinde Ø6,6 voor M6-post','Vlak printen; laag 0,2; 6 wanden','100% infill; gaten nabewerken','Vlak printen; laag 0,2; 6 wanden','100% infill; gaten nabewerken']:part.id==='platter'?['Centrum Ø5,6','4× Ø4,4 op 16×16','4× 90° verzinken, kop Ø8,2 vlak','Verzinking na proef met echte M4-kop']:['Ø22,5 + 4× Ø3,6','Steek 31 × 31','Scherpe kanten ontbramen'])];
 labels.forEach((label,i)=>s+='<text x="'+x+'" y="'+(y+i*6)+'">'+label+'</text>');
 return s+'</g></svg>';
}
window.MotioFabrication={parts,svg,dxf,crankOutline};
})();
