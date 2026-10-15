// MOTIO SIMV6: print this identical crank twice in PETG.
// Flat on bed; 0.2 mm layers, 6 walls, 100% infill as initial settings.
// No strength or motion tests performed for this revision.
// Finish holes to their stated diameters; retain metal clamping hubs.
$fn = 96;
linear_extrude(height=6)
 difference() {
  union() {
   circle(d=34);
   translate([12,-12]) square([48,24]);
   translate([65,0]) circle(d=24);
  }
  circle(d=5.6);
  for (x=[-8,8], y=[-8,8]) translate([x,y]) circle(d=4.4);
  translate([65,0]) circle(d=6.6);
 }
