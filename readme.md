## 安装
```js
npm i vue-faskclick
```

## 使用   

```js
// 在main.js
import fastclick from 'fastclick';
fastclick.attach(document.body);
```

##  说明   
fastclick 已经好近年没更新了,貌似遗留了许多问题   

ios11 据说是修复300ms 的延迟, 但是经过测试,貌似问题还是存在的.至于说 元素加入 
```css
html { touch-action: manipulation; }
```
貌似还会有各种各样的问题, 事实上fastclick 还是用的着的. vue-fastclick 在某些地方修复了fastclick遗留的一些问题.