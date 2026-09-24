(function () {
'use strict';

const TAU = Math.PI * 2;

function gcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) [a, b] = [b, a % b];
  return a;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function reducedFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function repeatDriverRotations(driverTeeth, ...outputTeeth) {
  return outputTeeth.reduce((repeat, teeth) => {
    const denominator = teeth / gcd(driverTeeth, teeth);
    return lcm(repeat, denominator);
  }, 1);
}

function normalizeDegrees(radians) {
  const degrees = radians * 180 / Math.PI;
  return ((degrees % 360) + 360) % 360;
}

function worldToPaper(x, y, paperAngle, centerX = 210, centerY = 148.5) {
  const dx = x - centerX;
  const dy = y - centerY;
  const cos = Math.cos(paperAngle);
  const sin = Math.sin(paperAngle);
  return { x: dx * cos + dy * sin + centerX, y: -dx * sin + dy * cos + centerY };
}

function paperToWorld(x, y, paperAngle, centerX = 210, centerY = 148.5) {
  const dx = x - centerX;
  const dy = y - centerY;
  const cos = Math.cos(paperAngle);
  const sin = Math.sin(paperAngle);
  return { x: centerX + dx * cos - dy * sin, y: centerY + dx * sin + dy * cos };
}

window.MotioMath = { TAU, gcd, lcm, reducedFraction, repeatDriverRotations, normalizeDegrees, worldToPaper, paperToWorld };
})();
