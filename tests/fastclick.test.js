import { beforeEach, describe, expect, it, vi } from 'vitest';

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME_UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const ANDROID_OLD_UA = 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Safari/537.36';

function setUserAgent(ua) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
}

// index.js is UMD and reads the UA at load time, so every test re-imports it.
async function load(ua) {
  vi.resetModules();
  setUserAgent(ua);
  delete window.FastClick;

  const mod = await import('../index.js');
  const exported = mod && mod.default && mod.default.FastClick ? mod.default : null;
  const FastClick = (exported && exported.FastClick) || window.FastClick;

  return { attach: exported || FastClick.attach, FastClick };
}

function touch(type, { x = 10, y = 10, id = 1 } = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  const point = {
    pageX: x,
    pageY: y,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    identifier: id,
  };

  Object.defineProperty(event, 'targetTouches', { value: type === 'touchstart' ? [point] : [] });
  Object.defineProperty(event, 'changedTouches', { value: [point] });
  Object.defineProperty(event, 'timeStamp', { value: performance.now() });

  return event;
}

function tap(element, options) {
  element.dispatchEvent(touch('touchstart', options));
  const end = touch('touchend', options);
  element.dispatchEvent(end);
  return end;
}

// Keep test content next to (not instead of) the iframe that provides a real
// Window for initMouseEvent. Vitest's global `window` is a shim that jsdom
// does not accept as the event's view.
function render(html) {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  document.body.appendChild(holder);
  return holder;
}

beforeEach(() => {
  vi.resetModules();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.body.removeAttribute('data-fastclick-layer');
  // jsdom has no touch support, so window.ontouchstart would be undefined and
  // every FastClick instance would bail out as "not needed".
  window.ontouchstart = null;

  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  Object.defineProperty(document, 'defaultView', {
    value: iframe.contentWindow,
    configurable: true,
  });
});

describe('notNeeded', () => {
  it('returns true on Android Chrome with a device-width viewport', async () => {
    document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1">';
    const { FastClick } = await load(ANDROID_CHROME_UA);

    expect(FastClick.notNeeded(document.body)).toBe(true);
  });

  it('returns false on iOS, which has no viewport opt-out here', async () => {
    document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1">';
    const { FastClick } = await load(IOS_UA);

    expect(FastClick.notNeeded(document.body)).toBe(false);
  });
});

describe('click fix', () => {
  it('dispatches a forwarded click on tap and cancels the native one', async () => {
    render('<button id="target">go</button>');
    const { attach } = await load(IOS_UA);
    const button = document.getElementById('target');
    const clicks = [];

    button.addEventListener('click', (event) => clicks.push(event));
    const fc = attach(document.body);
    const end = tap(button);

    expect(clicks).toHaveLength(1);
    expect(clicks[0].forwardedTouchEvent).toBe(true);
    expect(end.defaultPrevented).toBe(true);

    fc.destroy();
  });

  it('lets elements marked needsclick handle their own click', async () => {
    render('<a id="target" class="needsclick" href="#x">go</a>');
    const { attach } = await load(IOS_UA);
    const link = document.getElementById('target');
    let clicks = 0;

    link.addEventListener('click', () => clicks++);
    const fc = attach(document.body);
    const end = tap(link);

    expect(clicks).toBe(0);
    expect(end.defaultPrevented).toBe(false);

    fc.destroy();
  });

  it('lets disabled buttons handle their own click', async () => {
    render('<button id="target" disabled>go</button>');
    const { attach } = await load(IOS_UA);
    const button = document.getElementById('target');
    let clicks = 0;

    button.addEventListener('click', () => clicks++);
    const fc = attach(document.body);
    const end = tap(button);

    expect(clicks).toBe(0);
    expect(end.defaultPrevented).toBe(false);

    fc.destroy();
  });

  it('cancels the native click after focusing a text input on non-iOS', async () => {
    // Regression for the fork's dead isTextInput branch: it never ran, so the
    // native click used to be left alone on inputs.
    render('<input id="target" type="text">');
    const { attach } = await load(ANDROID_OLD_UA);
    const input = document.getElementById('target');
    const fc = attach(document.body);
    const end = tap(input);

    expect(end.defaultPrevented).toBe(true);

    fc.destroy();
  });

  it('stops intercepting taps after destroy()', async () => {
    render('<button id="target">go</button>');
    const { attach } = await load(IOS_UA);
    const button = document.getElementById('target');
    let clicks = 0;

    button.addEventListener('click', () => clicks++);
    const fc = attach(document.body);
    fc.destroy();

    const end = tap(button);

    expect(clicks).toBe(0);
    expect(end.defaultPrevented).toBe(false);
  });
});

describe('zoom lock', () => {
  it('is on by default and is fully undone by destroy()', async () => {
    render('<button id="target">go</button>');
    const { attach } = await load(IOS_UA);
    const fc = attach(document.body);

    expect(document.body.style.getPropertyValue('touch-action')).toBe('pan-x pan-y');
    expect(document.body.style.getPropertyValue('user-select')).toBe('none');
    expect(document.body.getAttribute('data-fastclick-layer')).toMatch(/^lock-\d+$/);

    const styleElement = document.querySelector('style[data-fastclick]');
    expect(styleElement).not.toBeNull();
    expect(styleElement.textContent).toContain('input');
    expect(styleElement.textContent).toContain('user-select: text');

    const gesture = new window.Event('gesturestart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(gesture);
    expect(gesture.defaultPrevented).toBe(true);

    fc.destroy();

    expect(document.body.style.getPropertyValue('touch-action')).toBe('');
    expect(document.body.style.getPropertyValue('user-select')).toBe('');
    expect(document.body.hasAttribute('data-fastclick-layer')).toBe(false);
    expect(document.querySelector('style[data-fastclick]')).toBeNull();

    const after = new window.Event('gesturestart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it('can be turned off without touching the layer', async () => {
    render('<button id="target">go</button>');
    const { attach } = await load(IOS_UA);
    const fc = attach(document.body, {
      disableZoom: false,
      disableLongPressMagnifier: false,
    });

    expect(document.body.getAttribute('style')).toBeNull();
    expect(document.body.hasAttribute('data-fastclick-layer')).toBe(false);
    expect(document.querySelector('style[data-fastclick]')).toBeNull();

    const gesture = new window.Event('gesturestart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(gesture);
    expect(gesture.defaultPrevented).toBe(false);

    let clicks = 0;
    document.getElementById('target').addEventListener('click', () => clicks++);
    tap(document.getElementById('target'));
    expect(clicks).toBe(1);

    fc.destroy();
  });

  it('locks zoom even when the click fix itself is not needed', async () => {
    document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1">';
    render('<button id="target">go</button>');
    const { attach } = await load(ANDROID_CHROME_UA);
    const button = document.getElementById('target');
    let clicks = 0;

    button.addEventListener('click', () => clicks++);
    const fc = attach(document.body);

    expect(document.body.style.getPropertyValue('touch-action')).toBe('pan-x pan-y');

    const end = tap(button);
    expect(clicks).toBe(0);
    expect(end.defaultPrevented).toBe(false);

    fc.destroy();
  });

  it('restores a touch-action the page had before', async () => {
    document.body.style.setProperty('touch-action', 'manipulation');
    const { attach } = await load(IOS_UA);
    const fc = attach(document.body);

    expect(document.body.style.getPropertyValue('touch-action')).toBe('pan-x pan-y');

    fc.destroy();

    expect(document.body.style.getPropertyValue('touch-action')).toBe('manipulation');
  });

  it('can be destroyed twice without throwing', async () => {
    const { attach } = await load(IOS_UA);
    const fc = attach(document.body);

    fc.destroy();
    expect(() => fc.destroy()).not.toThrow();
  });
});
