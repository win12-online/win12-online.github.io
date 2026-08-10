# $Cursor

内容大多为 AI 生成。
## 使用指南
```js

// 1. 选择元素并添加效果
$cursor.query('.card')
    .addEffect('glow', { intensity: 1.0 })
    .addEffect('magnetic', { strength: 0.5 });

// 2. 链式调用
$cursor.query('button')
    .addEffect('magnetic')
    .addEffect('glow');

// 3. 控制效果
const effects = $cursor.query('.hero');
effects.addEffect('glow');

effects.pause();   // 暂停
effects.resume();  // 恢复
effects.destroy(); // 销毁（清理DOM和事件）

// 4. 全局销毁（清理所有效果）
$cursor.destroy();

// 5. 获取原生DOM
const el = $cursor.query('.item').get();     // 第一个元素
const els = $cursor.query('.item').elements; // 所有元素数组
```

## 参数简释

### 通用效果

| 效果 | 参数 | 说明 |
|------|------|------|
| **glowEdge** | `color` | 发光颜色，默认 `rgba(100,150,255,0.6)` |
| | `width` | 边缘粗细，默认 `2px` |
| | `blur` | 光晕模糊程度，默认 `8px` |
| **magneticAttract** | `k1` | 元素中心引力系数，越大越跟随鼠标，默认 `30` |
| | `k2` | 鼠标吸引力系数，越大越稳定，默认 `120` |
| | `maxOffset` | 最大偏移像素，默认 `20` |
| **dynamicBgGlow** | `varName` | 输出的CSS变量名，默认 `--cursor-glow` |
| | `glowColor` | 光斑颜色 |
| | `bgColor` | 背景底色 |
| | `size` | 光斑半径(px) |
| | `falloff` | 0~1，越大光斑越靠内确保不溢出边界 |

### 悬停效果

| 效果 | 参数 | 说明 |
|------|------|------|
| **hoverGlow** | `varName` | CSS变量名，默认 `--hover-glow` |
| | `glowColor` / `bgColor` / `size` | 同上 |
| **tiltRepel** | `maxTilt` | 最大偏转角度，默认 `15deg`，负则吸引 |
| | `perspective` | 3D透视距离，默认 `800px` |


## 注册效果

```js

$cursor.registerEffect('效果名称', {
    type: 'global',  // 'global' 通用效果 | 'hover' 悬停效果
    
    // ===== 通用方法 =====
    
    // 初始化，在用户注册此效果时触发以处理参数（可选）
    // @param {Element} element - 作用的DOM元素，效果的主体对象
    // @param {Object} options  - 用户传入的参数
    // @return {Object} data    - 返回的数据对象，会保留并在各方法间传递
    init(element, options) {
        return {}; // 初始化状态数据
        // 不要在这里预存储元素位置，事物是变化的。
    },
    
    // 销毁清理（可选 - 必须实现以清理事件及其它内容）
    // @param {Object} data    - init返回的数据对象
    // @param {Element} element
    destroy(data, element) {
        // 清理创建的DOM元素、事件等
    },
    
    
    // ===== 通用效果专用 =====
    
    // 鼠标移动时更新（global类型必须实现）
    // @param {Object} data
    // @param {number} mouseX    - 鼠标X坐标(clientX)
    // @param {number} mouseY    - 鼠标Y坐标(clientY)
    // @param {MouseEvent} event - 原始事件对象
    // @param {Element} element  - 作用的元素
    update(data, mouseX, mouseY, event, element) {
        // 每帧mousemove时被调用（仅元素可见时）
    },
    
    // 可见性变化事件（可选 - 用于优化性能）
    // @param {Object} data
    // @param {boolean} visible  - 是否可见
    // @param {Element} element
    onVisibilityChange(data, visible, element) {
        // 元素不可见时，update将自动停止作用，此事件将被触发
    },
    
    
    // ===== 悬停效果专用 =====
    
    // 悬停时鼠标移动（hover类型必须实现）
    // @param {Object} data
    // @param {number} x         - 鼠标相对元素的X坐标
    // @param {number} y         - 鼠标相对元素的Y坐标
    // @param {MouseEvent} event
    // @param {Element} element
    hover(data, x, y, event, element) {
        // 鼠标在元素上移动时调用
    },
    
    // 鼠标离开（可选）
    leave(data, event, element) {
        // 鼠标离开元素时调用，可用于重置状态
    },
    
    // 鼠标进入（可选）
    enter(data, event, element) {
        // 鼠标进入元素时调用
    }
});

```
