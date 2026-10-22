from pathlib import Path
import json
r=Path('Software/WARD-SIM/SIMV7')
p=r/'js/assembly.js';s=p.read_text(encoding='utf-8');a=s.index('const steps=');b=s.index('const installations=',a)
steps=[
('Bovenplaat uit twee lagen','BASE','Lijm twee identieke 4 mm MDF-platen vlak op elkaar tot 8 mm. Lijn motoropeningen en ribslots uit. Laat onder druk volledig uitharden.'),
('Twee houten ribben','RIB','Steek de 8 mm tanden door beide lagen, bovenzijde vlak. Verlijm ribben op y=140 en 240 en later tegen de zijwanden.'),
('Motoren onder de plaat','MOTOR','Motorflens tegen de MDF-onderzijde. Centreerrand vrij in Ø22,5; assen zijn Ø5 × 24 ±1. Houd de onderzijde bereikbaar.'),
('Motoren vastzetten','MOTOR-FIX','12× M3×12 met brede Ø9×0,8-ringen. 12−8−0,8=3,2 mm draad in maximaal 4,5 mm diepe gaten. Licht kruislings vastzetten.'),
('Naaf C voorbereiden','HUB-C','Pololu 1998: Ø19×5, vier M3 op steekcirkel Ø12,7. Laat de ene radiale stelschroef los.'),
('Plateau op naaf C','PL','Leg 4 mm MDF op naaf. Maak na lasersnijden vier 90° verzinkingen passend bij de echte M3-koppen.'),
('Plateau vastschroeven','PL-FIX','Vier verzonken M3×8; 4 mm draad in de naaf. Koppen vlak onder papier.'),
('Plateau-eenheid op as C','INSTALL-C','Samen recht omlaag schuiven. Naaf z=17…22, plateau z=22…26. De maximale as van 25 blijft 1 mm onder papier.'),
('Naaf C borgen','HUB-LOCK-C','Eén meegeleverde M3-stelschroef met 1,5 mm inbus radiaal aandraaien. Houd hoogte vast, test slip en slingering.'),
('Naaf A voorbereiden','HUB-A','Bereid de onderste kruk los op de werkbank voor; gebruik Pololu 1998, geen geprinte motorasklem.'),
('PLA-kruk A','K-A','De vlakke kruk is 6 mm dik. Vier Ø3,4-gaten op steekcirkel Ø12,7 en centrale Ø5,6 moeten open zijn.'),
('Kruk A aan naaf','K-FIX-A','Vier M3×10 met standaard Ø7×0,5-ringen. 3,5 mm draad. Licht vastzetten, PLA niet indrukken.'),
('Kruk A op motor','INSTALL-A','Naaf z=13…18, kruk z=18…24. Motorbouten blijven vrij. Niet op de motorcentreerrand laten zakken.'),
('Naaf A borgen','HUB-LOCK-A','Eén radiale M3-stelschroef; markeer as/naaf en test omkeerbelasting zonder slip.'),
('Naaf B voorbereiden','HUB-B','Zelfde naaf; de PLA-wortelboss overbrugt het hoogteverschil zonder verlengas.'),
('PLA-kruk B','K-B','6 mm hoofdkruk plus 4 mm wortelboss. Bosszijde naar beneden in montage; bij printen juist omhoog.'),
('Kruk B aan naaf','K-FIX-B','Vier M3×14 met 0,5 mm ringen. 10 mm PLA-wortel geeft 3,5 mm naafdraad.'),
('Kruk B op motor','INSTALL-B','Naaf z=18…23, boss z=23…27, hoofdkruk z=27…33. De hele naaf zit op de minimale as van 23 mm.'),
('Naaf B borgen','HUB-LOCK-B','Eén radiale stelschroef. Hoofdkrukken hebben 3 mm verticale tussenruimte; werkelijke hoogtes nameten.'),
('Standaard scharnierbouten', ['ELBOW-BOLT-A','ELBOW-BOLT-B'],'Steek M8×50 bij A en M8×60 bij B van ONDER met elk een Ø16×1,6-ring in de Ø8,4-krukgaten. Geen bewerkte metalen posten.'),
('PLA-afstandsbussen','E-A E-B'.split(),'Schuif de juiste bus over elke bout tot op de kruk. A is 16,5 mm en B 28,5 mm hoog; laatste 2 mm Ø12 bovenaan.'),
('Onderste arm A','L-A','Plaats klein oog over bout A. Lagerogen hebben een onderste aanslag voor de buitenring.'),
('Ellebooglager A','608-JOINT-A','608-2RS van boven in de zitting. Binnenring rust op de Ø12-top van de bus. Geen boutkracht gebruiken voor perspassing.'),
('Penlager A','6804-A','61804-2RS / 6804 van boven in grote oog. Binnenring en doorvoer vrij houden.'),
('Bus tussen penlagers','SP-P','Plaats Ø24/20,2×14 op de onderste binnenring vóór arm B.'),
('Bovenste arm B','L-B','Plaats B boven de binnenringbus en over scharnierbout B. Armlagen z=44/65.'),
('Ellebooglager B','608-JOINT-B','Plaats tweede 608 op bus B en op de aanslag in de arm.'),
('Penlager B','6804-B','Plaats tweede 6804; beide armen draaien onafhankelijk.'),
('Scharnieren borgen','ELBOW-FIX','PLA-bus Ø12/8,4×4,5, M8-ring en DIN985-borgmoer op elke bout. Alleen binnenringstapel spelingvrij klemmen. Houd boutkop tegen, arm moet vrij blijven.'),
('Holle PLA-penas van onder','P','Steek de penas van ONDER door beide penlagers en middenbus. De geïntegreerde flens stopt tegen de onderste binnenring. Geen schroefdraad.'),
('Bovenste binnenringbus','SP-P-TOP','Schuif Ø24/20,2×9,5 van boven op de bovenste binnenring.'),
('Penhouder op penas','PEN','Schuif de onderste Ø20,2-boring over de penas tot de houder op de bovenbus rust. Geen lagervoorspanning.'),
('Metalen moeren in de houder',['M3-NUT','M4-NUT'],'Druk M3-moer in klemoor en M4-moer in radiaal zijvak. Beide zeskantvakken zijn open vanaf de buitenkant.'),
('Penhouder vastklemmen','COLLAR-BOLT','Steek M3×20 tangentieel door beide oren in de M3-moer. Licht sluiten; test of penas en houder axiaal vast blijven zonder de lagers te klemmen.'),
('PLA-drukblok','PAD','Breng het blok via de centrale opening naar de radiale kamer. Penbus en pen zijn nog niet geplaatst.'),
('Penbus van boven','BUSH','Laat bus met flens van boven zakken, sleuf naar drukblok. Meet de echte pen en pas boring zo nodig aan.'),
('Handschroef en knop',['CLAMP-SCREW','KNOB'],'M4×25 door metalen zijmoer tot aan het drukblok. 7 mm zeskantkop in PLA-knop, met druppel lijm borgen. Alleen handvast.'),
('Papier','PAPER','Na controle van boutkoppen, plateauhoogte en slingering papier Ø210 uit A4 aanbrengen.'),
('Tekenpen','PEN-TOOL','Pen van boven door houder en holle as. Punt licht op papier, handvast klemmen. Begin met lage penkracht.'),
('Boxwanden en bodem',['WALL-FB','WALL-LR','BOTTOM'],'Wanden haaks tegen dek/ribben verlijmen, bodem met tape afneembaar sluiten. Box 358×404×112. Controleer temperatuur, speling en doorbuiging vóór tekenen.')]
steps=[{'title':title,'mounts':mounts if isinstance(mounts,list) else [mounts],'instruction':instruction} for title,mounts,instruction in steps]
s=s[:a]+'const steps='+json.dumps(steps,ensure_ascii=False,indent=1)+';\n'+s[b:]
s=s.replace("if(part.id==='box-bottom')", "if(part.bom==='P'){out.z-=move(35);return out;}\n if(part.id==='box-bottom')")
p.write_text(s,encoding='utf-8')
p=r/'js/machineGeometry.js';s=p.read_text(encoding='utf-8').replace('knobReach:32','knobReach:36').replace('const screwStart=g.pen.radius+2;','const screwStart=g.pen.radius+3;').replace('(screwStart+32)/2','(screwStart+33)/2').replace("pt.x+29,pt.y,z,6,16,16", "pt.x+33,pt.y,z,6,16,16");p.write_text(s,encoding='utf-8')
p=r/'index.html';s=p.read_text(encoding='utf-8').replace('108','112').replace('PETG','PLA')
a=s.index('<aside class="panel design-notes">');b=s.index('<h3>Geselecteerd onderdeel',a)
s=s[:a]+'''<aside class="panel design-notes"><h2>PLA, lasercut en standaard hardware</h2><p>Twee verlijmde lagen 4 mm MDF vormen een 8 mm bovenplaat. Twee houten ribben ondersteunen het dek. De motoren zitten rechtstreeks onder het hout.</p><p>PLA-krukken en armen, standaard M8-scharnierbouten en een geprinte holle penas met klemhouder. Geen gedraaide posten of M20-moeren. Drie metalen Pololu-naafjes verbinden de ronde motorassen; kooponderdelen komen van toegestane winkels.</p><p>De routecontrole beoordeelt bereik en vrijloop. PLA-passingen, kruip, motortemperatuur en werkelijk loopkoppel vragen een fysieke proef.</p><p><a href="README.md">Bouwinformatie</a> · <a href="SOURCING.md">Bestellijst en winkels</a> · <a href="exports/PRINTING.md">PLA-printbestanden</a> · <a href="exports/MOTIO-V7-laser-layout.svg">Lasersnijplan</a> · <a href="DESIGN.md">Montagematen</a></p>'''+s[b:]
s=s.replace('standaard 3200 pulsen per omwenteling','standaard 1600 pulsen per omwenteling') if False else s
s=s.replace('MDF · box · grijs · lagering','PLA · gekleurd · MDF · houtkleur · metaal · grijs')
p.write_text(s,encoding='utf-8')
# Source URLs are clickable in the BOM; text stays escaped.
p=r/'js/ui.js';s=p.read_text(encoding='utf-8');s=s.replace("window.MotioBOM.values(r).map(v=>'<td>'+esc(v)+'</td>')", "window.MotioBOM.values(r).map((v,i)=>'<td>'+(i===5&&r.source?'<a href=\"'+esc(r.source[1])+'\" target=\"_blank\" rel=\"noopener\">'+esc(r.source[0])+'</a>':esc(v))+'</td>')");p.write_text(s,encoding='utf-8')
# Correct material and mounting evidence without changing the meaningful validation gates.
p=r/'js/validation.js';s=p.read_text(encoding='utf-8').replace('PETG','PLA').replace('MDF-platen','MDF-platen').replace('klemnaven 10 mm op 23 mm minimumas','Pololu-naven volledig 5 mm op minimumas 23 mm').replace('1,5 mm vlakke stalen plaatjes bovenop','twee verlijmde 4 mm deklagen met twee MDF-ribben').replace('Ø22,5-doorvoeren; motorflenzen rechtstreeks tegen MDF;','Ø22,5-doorvoeren; motorflenzen rechtstreeks tegen MDF;');p.write_text(s,encoding='utf-8')
# Update post masses to printed spacers + actual standard steel M8 hardware.
p=r/'js/motorAnalysis.js';s=p.read_text(encoding='utf-8')
old='const post=Math.PI*(5**2*(d.rodZ-3.5-d.crankZ-g.crankHeight/2)+4**2*7+3**2*29.5)*1e-9*7850;'
new='const post=Math.PI*((7**2-4.2**2)*(d.rodZ-3.5-d.crankZ-g.crankHeight/2)+(6**2-4.2**2)*4.5)*1e-9*g.density;'
s=s.replace(old,new).replace("const hardware=.012+.018+.014+g.armHardwareMass;", "const hardware=.012+.018+.020+Math.PI*4**2*(key==='A'?50:60)*1e-9*7850+g.armHardwareMass;")
s=s.replace('const crank=g.crankWidth*g.crankHeight*g[\'radius\'+key]*1e-9*g.crankDensity;', "const crank=(g.crankWidth*g.crankHeight*g['radius'+key]+Math.PI*17**2*g.crankHeight+(key==='B'?Math.PI*14**2*4:0))*1e-9*g.crankDensity;")
p.write_text(s,encoding='utf-8')
print('SIMV7 guide, material evidence and UI updated')
