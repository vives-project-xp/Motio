(function(){
'use strict';
const headers=['Onderdeel','Aantal','Afmetingen','Materiaal','Uitvoering / montage','Bron / kooplink'],cache=new WeakMap();
const sources={
 motor:['Opencircuit · Pololu 2267','https://opencircuit.be/product/stepper-motor-bipolar-200-steps-rev-42-38mm'],
 hub:['Opencircuit · Pololu 1998 · koop 2 sets van 2','https://opencircuit.be/product/pololu-universal-aluminum-mounting-hub-5mm-2'],
 m3:['Conrad · TOOLCRAFT 114515 M3×10','https://www.conrad.de/de/p/toolcraft-114515-zylinderschrauben-m3-10-mm-innensechskant-din-912-stahl-100-st-114515.html'],
 m314:['Conrad · TOOLCRAFT 1061821 M3×14','https://www.conrad.nl/nl/p/toolcraft-1061821-cilinderkopschroeven-m3-14-mm-binnenzeskant-inbus-din-912-rvs-a2-100-stuk-s-1061821.html'],
 m320:['Conrad · TOOLCRAFT 839673 M3×20','https://www.conrad.de/de/p/toolcraft-839673-zylinderschrauben-m3-20-mm-innensechskant-din-912-stahl-8-8-geschwaerzt-100-st-839673.html'],
 csk:['Conrad · TOOLCRAFT 839916 M3×10 verzonken','https://www.conrad.nl/nl/p/toolcraft-839916-verzonken-schroeven-m3-10-mm-t-din-965-rvs-a2-100-stuk-s-839916.html'],
 m425:['Conrad · TOOLCRAFT 1064017 M4×25','https://www.conrad.nl/nl/p/toolcraft-1064017-zeskantbout-m4-25-mm-buitenzeskant-din-933-rvs-a2-200-stuk-s-1064017.html'],
 m850:['Conrad · SWG 057 8 50 67 M8×50','https://www.conrad.nl/nl/p/swg-057-8-50-67-tapschroef-m8-50-mm-buitenzeskant-din-933-staal-verzinkt-25-stuk-s-2258933.html'],
 m860:['Conrad · SWG 057 8 60 67 M8×60','https://www.conrad.de/de/p/swg-057-8-60-67-gewindeschraube-m8-60-mm-aussensechskant-din-933-stahl-verzinkt-25-st-2258934.html'],
 broad:['Reichelt · SKA 3,2X9-100','https://www.reichelt.com/de/en/shop/product/large-diameter_washers_3_2_mm_100_pcs_-65774'],
 washer:['Reichelt · SKU 3,2-100 DIN 125','https://www.reichelt.com/fr/fr/shop/produit/rondelles_3_2_mm_100_pieces-65763'],
 washer8:['Reichelt · SKU 8,4-100 DIN 125','https://www.reichelt.de/de/de/shop/produkt/unterlegscheiben_8_4_mm_100_stueck-65767'],
 nut3:['Conrad · TOOLCRAFT 815624 M3 DIN 934','https://www.conrad.de/de/p/toolcraft-815624-sechskantmuttern-m3-din-934-stahl-verzinkt-100-st-815624.html'],
 nut4:['Conrad · TOOLCRAFT 131566 M4 DIN 934','https://www.conrad.de/de/p/toolcraft-131566-sechskantmuttern-m4-din-934-stahl-100-st-131566.html'],
 nyloc8:['Conrad · TOOLCRAFT 135393 M8 DIN 985','https://www.conrad.nl/nl/p/toolcraft-135393-borgmoeren-m8-din-985-staal-galvanisch-verzinkt-100-stuk-s-135393.html'],
 bearing608:['Conrad · UBC 608-2RS 8×22×7','https://www.conrad.nl/nl/p/ubc-bearing-608-2rs-groefkogellager-radiaal-boordiameter-8-mm-buitendiameter-22-mm-toerental-max-20000-omw-min-198527.html'],
 bearing6804:['Conrad · UBC 61804-2RS 20×32×7','https://www.conrad.be/nl/p/ubc-bearing-61804-2rs-groefkogellager-radiaal-boordiameter-20-mm-buitendiameter-32-mm-toerental-max-13000-omw-min-197411.html'],
 pen:['DiscountOffice · Staedtler 308 03-9 · schacht nameten','https://discountoffice.nl/p/fineliner-staedtler-pigment-308-03mm-zwart/'],
 paper:['DiscountOffice · A4-papier','https://discountoffice.nl/'],
 pla:['Bambu · PLA Basic 1,75 mm','https://eu.store.bambulab.com/products/pla-basic'],
 wood:['Brico · Fibromax Pro LF+ MDF 6 mm · 244×122 cm','https://www.brico.be/nl/hout-ramen-trappen-deuren/hout/houten-platen/mdf-platen/mdf-plaat-fibromax-pro-lf-hoge-densiteit-244x122-cm-6-mm/10645347'],
 glue:['Brico · Bison professional houtlijm 250 g','https://www.brico.be/nl/ijzerwaren/lijmen-tapes-reparatiekits/lijmen/houtlijm/bison-professional-houtlijm-transparant-250g/6089274']
};
function referencePose(g){const q={A:g.phaseA*Math.PI/180,B:g.phaseB*Math.PI/180,C:g.phaseC*Math.PI/180},p=window.MotioKinematics.solve(g,q);return p.valid?p:{valid:true,q,a:{x:g.pivotAx+g.radiusA,y:g.pivotAy},b:{x:g.pivotBx+g.radiusB,y:g.pivotBy},pen:{x:g.paper.x,y:g.paper.y}};}
function create(g){
 if(cache.has(g))return cache.get(g);
 const parts=window.MotioGeometry.bodies(g,referencePose(g)),rows=[];
 const add=(id,name,dimensions,material,method,spec,source)=>rows.push({id,name,qty:new Set(parts.filter(v=>v.bom===id).map(v=>v.instance)).size,dimensions,material,method,spec,source:sources[source]||null});
 const print=(id,name,dim,spec)=>add(id,name,dim,'PLA · 3D-geprint','3D-printen',spec,'pla');
 const laser=(id,name,dim,spec)=>add(id,name,dim,'MDF · 6 mm','Lasersnijden',spec,'wood');
 laser('BASE','Bovenplaat','358 × 404 × 6 mm','Eén standaardplaat; Ø22,5 en 4× Ø3,6 per motor op 31×31. Ribslots 20,2×6,2.');
 laser('RIB','Rib onder bovenplaat','346 × 36 × 6 mm inclusief tanden','Twee ribben op y=140/240; 30 mm onder dek, 6 mm tanden door de bovenplaat. Verlijmen aan dek en zijwanden.');
 add('MOTOR','SY42STH38-1684A-stappenmotor','42,3 × 42,3 × 38; as Ø5 × 24 ±1','Staal / koper','Kopen','Pololu 2267, flens rechtstreeks onder MDF. PLA raakt het motorhuis niet. Temperatuur en loopkoppel fysiek controleren.','motor');
 add('M3-BOLT','Motorbout M3×10','M3 × 10 · DIN 912','Staal','Kopen','12 stuks; 6 mm dek + 0,8 mm ring → 3,2 mm draad, motor max. 4,5 mm. Licht kruislings vastzetten.','m3');
 add('M3-WASHER','Brede sluitring M3','Ø9/3,2 × 0,8 · DIN 9021','Staal','Kopen','Eén per motorbout; standaardmaat.','broad');
 add('HUB','Metalen motornaaf Ø5','Ø19 × 5; 4× M3 op steekcirkel Ø12,7','Aluminium','Kopen','Pololu 1998: drie naven, twee sets kopen. Eén radiale M3-stelschroef. A z=13…18, B 18…23, C 15…20; volledig op minimumas 23 mm. Slipproef vereist.','hub');
 add('HUB-SET','Meegeleverde M3-naafstelschroef','M3 · inbus 1,5 mm','Staal','Bij naaf','Eén per naaf, radiaal bereikbaar na montage; niet extra bestellen.','hub');
 print('K-A','PLA-kruk A','65 h.o.h.; 24 × 6; wortel Ø34; z=21','Vlak printen. Ø5,6 centraal, vier Ø3,4 op steekcirkel Ø12,7; einde Ø8,4. M3×10 + ring 0,5.');
 print('K-B','PLA-kruk B','65 h.o.h.; 24 × 6 + wortelboss Ø28×4; z=30','Vlakke bovenzijde op bed; wortelboss omhoog. Naafcontact z=23, hoofdkruk begint z=27. M3×14 + ring 0,5.');
 add('HUB-BOLT-A','Krukbout A M3×10','M3 × 10 · DIN 912','Staal','Kopen','Vier; 6 mm PLA + 0,5 ring → 3,5 mm naafdraad.','m3');
 add('HUB-BOLT-B','Krukbout B M3×14','M3 × 14 · DIN 912','Staal','Kopen','Vier; 10 mm PLA-wortel + 0,5 ring → 3,5 mm naafdraad.','m314');
 add('HUB-WASHER','Kruksluitring M3','Ø7/3,2 × 0,5 · DIN 125','Staal','Kopen','Acht onder de krukboutkoppen.','washer');
 for(const key of ['A','B']){
  const height=g[key].rodZ-3.5-g[key].crankZ-g.crankHeight/2;
  print('E-'+key,'PLA-scharnierafstandbus '+key,'Ø14/8,4 × '+height+'; laatste 2 mm Ø12','Op kruk; Ø12-top raakt uitsluitend 608-binnenring. M8-bout door gehele stapel, geen gedraaide post.');
  print('L-'+key,'PLA-penarm '+key,g['length'+key]+' h.o.h.; koker 24 × 16, wand 3','Vlak printen. Lagerogen met bodemschouders; passingproef Ø22,1/Ø32. Lagers niet met boutkracht in trekken; zo nodig buitenring met kleine hoeveelheid lijm borgen.');
 }
 add('M8-BOLT-A','Scharnierbout A M8×50','M8 × 50 · DIN 933','Staal','Kopen','Van onder met ring. Lagerbinnenring zit vast op bout; arm draait op kogellager, niet op de draad.','m850');
 add('M8-BOLT-B','Scharnierbout B M8×60','M8 × 60 · DIN 933','Staal','Kopen','Van onder met ring; minimaal twee gangen voorbij borgmoer. Geen afdraaien.','m860');
 add('M8-WASHER','Sluitring M8','Ø16/8,4 × 1,6 · DIN 125','Staal','Kopen','Vier; onder krukken en boven de lagerbussen.','washer8');
 add('M8-NUT','Borgmoer M8','M8 · DIN 985 · hoogte 8','Staal / nylon','Kopen','Twee; alleen speling uit binnenringstapel halen. PLA niet indrukken, arm blijft vrij draaien.','nyloc8');
 print('E-SPACER','PLA-bus boven ellebooglager','Ø12/8,4 × 4,5','Twee; uitsluitend op binnenring, nooit op draaiend armvlak.');
 add('608','Ellebooglager 608-2RS','8 × 22 × 7','Lagerstaal','Kopen','Twee echte kogellagers.','bearing608');
 add('6804','Penlager 61804-2RS / 6804','20 × 32 × 7','Lagerstaal','Kopen','Twee; armen draaien onafhankelijk rond de penas.','bearing6804');
 print('P','Holle PLA-penas met onderflens','Ø19,9/13 × 50; flens Ø24×5','Flens op bed, rechtop printen. Van ONDER door beide lagers. Geen M20-draad. Nauwe schuifpassing met proefstuk bepalen.');
 print('SP-P','PLA-bus tussen penlagers','Ø24/20,2 × 14','Tussen binnenringen, plaatsen vóór bovenste arm.');
 print('SP-P-TOP','PLA-bus boven penlager','Ø24/20,2 × 9,5','Op bovenste binnenring; draagt houder vrij van armvlak.');
 print('PEN','PLA-penhouder met klemoren','Ø28/13 × 22; onderboring Ø20,2 × 8','Over bovenbus op penas. Onderste sleuf met M3×20 en ingevangen M3-moer sluiten. M4-moer in zijvak voor penklem. Geen getapte PLA-draad.');
 add('COLLAR-BOLT','Klembout penhouder M3×20','M3 × 20 · DIN 912','Staal','Kopen','Eén tangentieel door klemoren. Licht vastzetten, geen axiale lagervoorspanning.','m320');
 add('M3-NUT','Ingevangen moer M3','M3 · DIN 934 · sleutel 5,5','Staal','Kopen','Eén in zeskantvak klemoor.','nut3');
 add('M4-NUT','Ingevangen moer M4','M4 · DIN 934 · sleutel 7','Staal','Kopen','Eén in radiale zijvak vóór de klemschroef.','nut4');
 print('BUSH','PLA-penbus met bovenflens','Ø13/10,3 × 14; flens Ø16×1','Van boven, sleuf naar drukblok. Aan werkelijke pen aanpassen.');
 print('PAD','PLA-drukblok voor pen','2 × 6 × 6','Vóór bus via centrale opening in zijkamer schuiven. Handvast; geen TPU nodig.');
 add('CLAMP-SCREW','Handklemschroef M4×25','M4 × 25 · zeskantkop DIN 933','Staal','Kopen','Door metalen M4-moer; 7 mm kop in geprinte knop.','m425');
 print('KNOB','PLA-handknop','6 × 16 × 16; zeskantvak 7,2','Vlak op bed; schroefkop in vak met druppel lijm borgen.');
 laser('PL','MDF-draaiplateau','Ø210 × 6','Ø5,6 centraal, 4× Ø3,4 op steekcirkel Ø12,7. Na lasersnijden 90° verzinken naar echte M3-kop, vlak onder papier.');
 add('PL-BOLT','Verzonken plateaubout M3×10','M3 × 10, 90°','Staal','Kopen','Vier; lengte inclusief kop, 4 mm draad in naaf.','csk');
 add('PAPER','Rond tekenpapier','Ø210; tekenzone Ø190','Papier','Uit A4 snijden','Zelf uit A4 knippen.','paper');
 add('PEN-TOOL','Tekenpen','Ø10 nominaal; circa 110 bruikbare lengte','Gebruiksonderdeel','Kopen','Rechte schacht en lengte nameten; bestaande passende pen mag.','pen');
 laser('BOTTOM','Bodem','358 × 404 × 6','Voor onderhoud met tape afneembaar vastzetten.');
 laser('WALL-FB','Voor- en achterwand','358 × 100 × 6','Haaks verlijmen; 6 mm wand; bestaand bedieningspaneel los naast de kast plaatsen.');
 laser('WALL-LR','Zijwand','6 × 392 × 100','Tussen voor- en achterwand verlijmen. Box buitenmaat 358×404×112.');
 for(const p of parts)if(!rows.some(r=>r.id===p.bom))throw Error('Geen BOM voor '+p.id+' / '+p.bom);
 cache.set(g,rows);return rows;
}
const values=r=>[r.name,r.qty,r.dimensions,r.material,r.method+' · '+r.spec,r.source?r.source.join(' · '):''];
const csv=g=>'\uFEFF'+[headers,...create(g).map(values)].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
window.MotioBOM={create,headers,values,csv,referencePose,sources};
})();
