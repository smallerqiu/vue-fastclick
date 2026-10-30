export = attach;

declare function attach(layer: Element, options?: attach.Options): attach.Instance;

declare namespace attach {
  interface Options {
    /** Touchmove distance (px) beyond which a tap is cancelled. Default: 10. */
    touchBoundary?: number;
    /** Minimum time (ms) between two taps. Default: 200. */
    tapDelay?: number;
    /** Maximum duration (ms) of a tap. Default: 700. */
    tapTimeout?: number;
    /**
     * Disable pinch-zoom and double-tap-zoom on the layer.
     * Default: true.
     */
    disableZoom?: boolean;
    /**
     * Disable the iOS long-press magnifier on the layer.
     * This also turns off long-press text selection; form controls keep theirs.
     * Default: true.
     */
    disableLongPressMagnifier?: boolean;
  }

  interface Instance {
    layer: Element;
    destroy(): void;
  }

  class FastClick {
    constructor(layer: Element, options?: Options);
    destroy(): void;
    static attach(layer: Element, options?: Options): Instance;
    static notNeeded(layer: Element): boolean;
  }
}
