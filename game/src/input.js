// Keyboard + mouse input, kept apart from the world so the game logic can be
// driven headlessly in tests. Mouse aim is in logical field coordinates.
export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    vent: false,
    firing: false,
    mouseX: 640,
    mouseY: 200,
    // Edge-triggered presses, consumed once by the loop.
    pressed: new Set(),
  };
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'dash', ShiftRight: 'dash',
  Space: 'vent',
};

export function attachInput(input, canvas) {
  const scaleMouse = (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  };
  window.addEventListener('keydown', (event) => {
    const name = KEYMAP[event.code];
    if (name) {
      if (!event.repeat) input.pressed.add(name);
      input[name] = true;
      event.preventDefault();
    }
    if (event.code === 'Digit1') input.pressed.add('choice1');
    if (event.code === 'Digit2') input.pressed.add('choice2');
    if (event.code === 'Digit3') input.pressed.add('choice3');
    if (event.code === 'Enter') input.pressed.add('confirm');
    if (event.code === 'KeyR') input.pressed.add('restart');
    if (event.code === 'KeyM') input.pressed.add('mute');
  });
  window.addEventListener('keyup', (event) => {
    const name = KEYMAP[event.code];
    if (name) input[name] = false;
  });
  canvas.addEventListener('mousemove', scaleMouse);
  canvas.addEventListener('mousedown', (event) => {
    scaleMouse(event);
    input.firing = true;
    input.pressed.add('fire');
  });
  window.addEventListener('mouseup', () => { input.firing = false; });
  return () => {};
}

/** True once for a key pressed since the last frame; callers consume it. */
export function consumePress(input, name) {
  if (input.pressed.has(name)) {
    input.pressed.delete(name);
    return true;
  }
  return false;
}

export function clearPresses(input) {
  input.pressed.clear();
}
