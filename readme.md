# vue-fastclick

针对老 iOS / 老 WebView 的 300ms 点击延迟补丁，fork 自 [FastClick 1.0.6](https://github.com/ftlabs/fastclick)。

> **现代浏览器不需要它。** iOS 10+ 和 Android Chrome 32+ 在设置
> `<meta name="viewport" content="width=device-width, initial-scale=1">` 后已经没有点击延迟，
> 再给可点元素加 `touch-action: manipulation` 就够了。只有必须支持老 WebView，
> 或者需要它的「锁缩放」能力时再用。

## 安装

```bash
npm i vue-fastclick
```

## 使用

```js
// main.js
import fastclick from 'vue-fastclick';

const fc = fastclick.attach(document.body);

// 不再需要时（例如热更新、SPA 路由销毁）可以完整还原：
// fc.destroy();
```

## 选项

`attach(layer, options)` 的第二个参数：

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `disableZoom` | `true` | 禁止双指缩放和双击缩放。用 `touch-action: pan-x pan-y` 实现，老 iOS 上额外挂 `gesturestart`。 |
| `disableLongPressMagnifier` | `true` | 禁止 iOS 长按放大镜。底层是 `user-select: none`，同时会关掉长按选词；`input` / `textarea` / `select` / `contenteditable` 已经单独放开。 |
| `touchBoundary` | `10` | 手指移动超过多少 px 就取消这次点击。 |
| `tapDelay` | `200` | 两次点击的最小间隔（ms）。 |
| `tapTimeout` | `700` | 一次点击允许的最长时长（ms）。 |

只要点击修复、不要锁缩放：

```js
fastclick.attach(document.body, {
  disableZoom: false,
  disableLongPressMagnifier: false,
});
```

## 已知限制

- 派发的是合成 click（`isTrusted === false`）。密码管理器 / 自动填充、剪贴板、
  部分支付与 WebAuthn 可能不工作；读屏（尤其 iOS `select` + VoiceOver）行为不可靠。
- `attach(document.body)` 时，body 上的 `touchstart` / `touchmove` 在 Chrome 56+
  默认是 passive，`onTouchStart` 里用于取消双击的 `preventDefault()` 会被忽略。
- 锁缩放会在**所有**触屏设备上生效，包括本来就不需要点击补丁的 Android Chrome。
  不想要这个副作用就把 `disableZoom` 设成 `false`。
- `disableLongPressMagnifier` 等价于关闭长按选词与复制，输入框除外。
- 桌面浏览器没有 touch，`attach()` 不会改动任何东西。

## 许可

MIT，见 [LICENSE](./LICENSE)。原始版权归 The Financial Times Ltd。
