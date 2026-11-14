'use strict';

// The line runs clockwise. Labels sit outside the track to leave its centre clear.
const transitStops = [
  { x: 130, y: 125, dx: -10, dy: -37, anchor: 'middle' },
  { x: 320, y: 125, dx: 0, dy: -37, anchor: 'middle' },
  { x: 516, y: 185, dx: 8, dy: -38, anchor: 'middle' },
  { x: 498, y: 331, dx: 0, dy: 38, anchor: 'middle' },
  { x: 307, y: 331, dx: 0, dy: 38, anchor: 'middle' },
  { x: 104, y: 269, dx: 10, dy: 39, anchor: 'middle' }
];
const transitPath = 'M130 125 H445 Q453 125 459 131 L516 185 Q526 195 526 204 V290 Q526 302 518 310 L498 331 H197 Q190 331 184 325 L153 294 Q149 290 142 290 H128 Q122 290 116 284 L104 269 V163 Q104 151 112 143 Z';

function createTransitMap(container) {
  const ns = 'http://www.w3.org/2000/svg';
  const diagram = container.querySelector('svg');
  const stations = diagram.querySelector('.stations');
  const train = diagram.querySelector('.train');
  const track = diagram.querySelector('.track');
  const length = track.getTotalLength();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function element(tag, attrs, parent) {
    const item = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    parent.append(item);
    return item;
  }
  function place(distance) {
    const point = track.getPointAtLength((distance % length + length) % length);
    train.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
  }
  const offsets = transitStops.map(stop => {
    let bestDistance = 0, smallest = Infinity;
    for (let d = 0; d < length; d += 2) {
      const p = track.getPointAtLength(d);
      const squared = (p.x - stop.x) ** 2 + (p.y - stop.y) ** 2;
      if (squared < smallest) { smallest = squared; bestDistance = d; }
    }
    return bestDistance;
  });
  const labels = transitStops.map(stop => {
    const group = element('g', {}, stations);
    element('circle', { cx: stop.x, cy: stop.y, r: 8 }, group);
    const label = element('text', { x: stop.x + stop.dx, y: stop.y + stop.dy, 'text-anchor': stop.anchor }, group);
    return { group, label };
  });
  let lastIndex = -1, position = 0, animation = 0;
  return function update(stops, currentIndex) {
    labels.forEach(({ group, label }, i) => {
      const stop = stops[i];
      group.style.display = stop ? '' : 'none';
      if (!stop) return;
      group.setAttribute('class', i === currentIndex ? 'current' : '');
      label.textContent = stop;
    });
    train.style.display = currentIndex < 0 ? 'none' : '';
    if (currentIndex < 0 || currentIndex === lastIndex) return;
    cancelAnimationFrame(animation);
    const target = offsets[currentIndex];
    if (lastIndex === -1 || reducedMotion.matches) {
      position = target;
      place(position);
    } else {
      const start = position;
      const forward = (target - start + length) % length;
      const started = performance.now();
      const frame = now => {
        const t = Math.min(1, (now - started) / 760);
        position = (start + forward * (t*t*(3-2*t))) % length;
        place(position);
        if (t < 1) animation = requestAnimationFrame(frame);
      };
      animation = requestAnimationFrame(frame);
    }
    lastIndex = currentIndex;
  };
}