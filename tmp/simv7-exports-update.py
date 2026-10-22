from pathlib import Path
r=Path('Software/WARD-SIM/SIMV7')
p=r/'js/renderers.js';s=p.read_text(encoding='utf-8')
s=s.replace("'M20×1 · 8 mm verbinding'","'M3-klem om gladde PLA-penas'").replace("'Holle Ø20/13-as + binnenringbus'","'Holle PLA Ø19,9/13 + binnenringbus'").replace("'Plateau Ø210 × 4; onderzijde z=22'","'Plateau Ø210 × 6; onderzijde z=20'").replace("'Klemnaaf Ø32/5 × 8; 4× M4×10'","'Pololu Ø19/5 × 5; 4× M3×10'").replace("'1,5 mm staal bovenop 4 mm MDF'","'6 mm MDF + twee gelijmde ribben'")
s=s.replace('V-4 H-42 Z M11.25 0 H42 V-4','V-6 H-42 Z M11.25 0 H42 V-6')
s=s.replace("(-d.hubTop-(key==='C'?g.paper.thickness:g.crankHeight))", "(-(key==='C'?g.paper.z+g.paper.thickness/2:d.crankZ+g.crankHeight/2))")
s=s.replace("width=\"17.2\"", "width=\"14.2\"").replace('[-20,2.8]','[-17,2.8]')
needle="  svg+='<g font-size=\"5\"><text"
s=s.replace(needle,"  if(key==='B')svg+='<rect x=\"-14\" y=\"-27\" width=\"11.2\" height=\"4\" fill=\"#a4bbcb\"/><rect x=\"2.8\" y=\"-27\" width=\"11.2\" height=\"4\" fill=\"#a4bbcb\"/>';\n"+needle)
s=s.replace('M3×10 + ring 1 + staal 1,5 + MDF 4 → 3,5 mm draad (motor max. 4,5).','M3×10 − ring 0,8 − MDF 6 → 3,2 mm draad (motor max. 4,5).').replace('Motoras min. 23; overlap A/C 10 mm, B 9 mm. As max. 25; papier boven z=26.','Motoras min. 23; alle Pololu-naven volledig 5 mm op de as. Papier boven z=26.').replace('Geen beugels, koppelingen, verlengassen of extra hoofdlagers. PETG-krukken 6 mm; M4×12. Niet opnieuw getest.','PLA-krukken; M8-scharnieren; PLA-penas zonder draad. Fysieke passing en warmte testen.')
s=s.replace(' · krukken ', ' · krukken ').replace(' · plaat ',' · plaat ')
p.write_text(s,encoding='utf-8')
p=r/'tests/export.js';s=p.read_text(encoding='utf-8')
needle="const report={scope:"
s=s.replace(needle,"fs.writeFileSync(path.join(folder,'MOTIO-V7-laser-layout.svg'),MotioFabrication.layoutSVG(sim.geometry));\nfs.writeFileSync(path.join(folder,'laser-manifest.json'),JSON.stringify({material:'MDF 6 mm',kerfCompensated:false,parts:MotioFabrication.parts(sim.geometry),layout:MotioFabrication.layout(sim.geometry)},null,2));\nfs.writeFileSync(path.join(folder,'print-manifest.json'),JSON.stringify({material:'PLA',parts:MotioFabrication.printParts(sim.geometry)},null,2));\n"+needle)
s=s.replace("scope:'Continue radiale route", "physicalValidation:{tested:false,remaining:['PLA-passing en kruip','motor- en PLA-temperatuur','naafslip','werkelijk loopkoppel','houtstijfheid en penkracht']},scope:'Continue radiale route")
p.write_text(s,encoding='utf-8')
# CSV and UI both refer to exact verified bearing / bolt / stock-panel pages.
p=r/'js/bom.js';s=p.read_text(encoding='utf-8').replace('Bovenplaatlaag','Bovenplaat')
s=s.replace("'https://www.conrad.be/nl/c/lagers-213335.html'", "'https://www.conrad.nl/nl/p/ubc-bearing-608-2rs-groefkogellager-radiaal-boordiameter-8-mm-buitendiameter-22-mm-toerental-max-20000-omw-min-198527.html'")
s=s.replace("m860:['Conrad · DIN 933 M8×60','https://www.conrad.nl/nl/f/din-933-1628905.html']", "m860:['Conrad · SWG 057 8 60 67 M8×60','https://www.conrad.de/de/p/swg-057-8-60-67-gewindeschraube-m8-60-mm-aussensechskant-din-933-stahl-verzinkt-25-st-2258934.html']")
s=s.replace("wood:['Brico · MDF 6 mm minimaal 358×404','https://www.brico.be/']", "wood:['Brico · Fibromax Pro LF+ MDF 6 mm · 244×122 cm','https://www.brico.be/nl/hout-ramen-trappen-deuren/hout/houten-platen/mdf-platen/mdf-plaat-fibromax-pro-lf-hoge-densiteit-244x122-cm-6-mm/10645347']")
p.write_text(s,encoding='utf-8')
print('SIMV7 export drawings and print/laser manifests updated')
