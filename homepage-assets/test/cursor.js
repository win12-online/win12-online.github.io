/**
 * CursorEffects - 鼠标指针效果模块
 * 提供类似jQuery的API体验，支持通用效果和悬停效果
 */
class CursorEffects {
    constructor() {
        this.effects = new Map(); // 存储所有注册的效果
        this.globalEffects = []; // 通用效果列表
        this.hoverEffects = new Map(); // 元素悬停效果 {element: [{effect, instance}]}
        this.globalHandler = null; // document mousemove处理器
        this.initialized = false;
        this.rafId = null;
    }

    /**
     * 初始化全局监听
     */
    init() {
        if (this.initialized) return;
        
        this.globalHandler = this._handleGlobalMouseMove.bind(this);
        document.addEventListener('mousemove', this.globalHandler, { passive: true });
        this.initialized = true;
        this._startRAF();
    }

    /**
     * 选择元素并返回可操作的实例
     * @param {string} selector - CSS选择器
     * @returns {CursorEffectsInstance}
     */
    query(selector) {
        const elements = document.querySelectorAll(selector);
        return new CursorEffectsInstance(elements, this);
    }

    /**
     * 注册效果处理器
     * @param {string} name - 效果名称
     * @param {Object} handler - 效果处理器
     * @param {Function} handler.init - 初始化函数
     * @param {Function} handler.update - 全局mousemove更新函数
     * @param {Function} handler.hover - 悬停效果函数
     * @param {Function} handler.destroy - 清理函数
     */
    registerEffect(name, handler) {
        if (this.effects.has(name)) {
            console.warn(`Effect "${name}" is already registered.`);
            return;
        }
        this.effects.set(name, {
            handler,
            instances: new Map() // 存储该效果的实例数据
        });
    }

    /**
     * 为元素添加效果实例
     */
    _addEffectInstance(element, effectName, options = {}) {
        if (!this.effects.has(effectName)) {
            console.error(`Effect "${effectName}" is not registered.`);
            return null;
        }

        const effect = this.effects.get(effectName);
        const instanceId = Symbol('effect-instance');
        
        // 初始化效果实例
        const instance = {
            id: instanceId,
            element,
            options,
            data: effect.handler.init ? effect.handler.init(element, options) : {},
            paused: false,
            destroyed: false
        };

        // 存储实例数据
        if (!effect.instances.has(element)) {
            effect.instances.set(element, []);
        }
        effect.instances.get(element).push(instance);

        return instance;
    }

    /**
     * 添加全局效果到元素
     */
    _addGlobalEffect(element, effectName, instance) {
        const globalEffect = {
            element,
            effectName,
            instance,
            lastMouseX: 0,
            lastMouseY: 0,
            visible: true
        };

        this.globalEffects.push(globalEffect);
    }

    /**
     * 添加悬停效果到元素
     */
    _addHoverEffect(element, effectName, instance) {
        if (!this.hoverEffects.has(element)) {
            this.hoverEffects.set(element, []);
            
            // 为元素绑定悬停事件
            this._bindHoverEvents(element);
        }
        
        this.hoverEffects.get(element).push({
            effectName,
            instance
        });
    }

    /**
     * 绑定元素的悬停事件
     */
    _bindHoverEvents(element) {
        const handleMouseMove = (e) => {
            if (!this.hoverEffects.has(element)) return;
            
            const effects = this.hoverEffects.get(element);
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            effects.forEach(({ effectName, instance }) => {
                if (instance.destroyed || instance.paused) return;
                
                const effect = this.effects.get(effectName);
                if (effect && effect.handler.hover) {
                    effect.handler.hover(instance.data, x, y, e, element);
                }
            });
        };

        const handleMouseLeave = (e) => {
            if (!this.hoverEffects.has(element)) return;
            
            const effects = this.hoverEffects.get(element);
            effects.forEach(({ effectName, instance }) => {
                if (instance.destroyed) return;
                
                const effect = this.effects.get(effectName);
                if (effect && effect.handler.leave) {
                    effect.handler.leave(instance.data, e, element);
                }
            });
        };

        const handleMouseEnter = (e) => {
            if (!this.hoverEffects.has(element)) return;
            
            const effects = this.hoverEffects.get(element);
            effects.forEach(({ effectName, instance }) => {
                if (instance.destroyed) return;
                
                const effect = this.effects.get(effectName);
                if (effect && effect.handler.enter) {
                    effect.handler.enter(instance.data, e, element);
                }
            });
        };

        element.addEventListener('mousemove', handleMouseMove, { passive: true });
        element.addEventListener('mouseleave', handleMouseLeave);
        element.addEventListener('mouseenter', handleMouseEnter);

        // 存储事件处理器引用以便清理
        element._cursorEffectsHandlers = {
            handleMouseMove,
            handleMouseLeave,
            handleMouseEnter
        };
    }

    /**
     * 处理全局鼠标移动
     */
    _handleGlobalMouseMove(e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // 遍历所有全局效果
        for (let i = this.globalEffects.length - 1; i >= 0; i--) {
            const globalEffect = this.globalEffects[i];
            
            if (globalEffect.instance.destroyed) {
                this.globalEffects.splice(i, 1);
                continue;
            }

            if (globalEffect.instance.paused) continue;

            // 检查元素可见性
            const element = globalEffect.element;
            if (!this._isElementVisible(element)) {
                if (globalEffect.visible) {
                    globalEffect.visible = false;
                    // 通知效果元素不可见
                    const effect = this.effects.get(globalEffect.effectName);
                    if (effect && effect.handler.onVisibilityChange) {
                        effect.handler.onVisibilityChange(globalEffect.instance.data, false, element);
                    }
                }
                continue;
            } else if (!globalEffect.visible) {
                globalEffect.visible = true;
                const effect = this.effects.get(globalEffect.effectName);
                if (effect && effect.handler.onVisibilityChange) {
                    effect.handler.onVisibilityChange(globalEffect.instance.data, true, element);
                }
            }

            // 执行效果更新
            const effect = this.effects.get(globalEffect.effectName);
            if (effect && effect.handler.update) {
                effect.handler.update(
                    globalEffect.instance.data,
                    mouseX,
                    mouseY,
                    e,
                    element
                );
            }

            // 更新最后鼠标位置
            globalEffect.lastMouseX = mouseX;
            globalEffect.lastMouseY = mouseY;
        }
    }

    /**
     * 检查元素是否可见且在屏幕内
     */
    _isElementVisible(element) {
        if (!element || !element.isConnected) return false;
        
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }

        const rect = element.getBoundingClientRect();
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth
        );
    }

    /**
     * 启动RAF循环进行可见性检查
     */
    _startRAF() {
        const check = () => {
            // 执行定时检查（如元素可见性变化）
            this._checkVisibilityChanges();
            this.rafId = requestAnimationFrame(check);
        };
        this.rafId = requestAnimationFrame(check);
    }

    /**
     * 定期检查可见性变化
     */
    _checkVisibilityChanges() {
        for (let i = this.globalEffects.length - 1; i >= 0; i--) {
            const globalEffect = this.globalEffects[i];
            
            if (globalEffect.instance.destroyed) {
                this.globalEffects.splice(i, 1);
                continue;
            }

            if (globalEffect.instance.paused) continue;

            const element = globalEffect.element;
            const isVisible = this._isElementVisible(element);
            
            if (globalEffect.visible !== isVisible) {
                globalEffect.visible = isVisible;
                const effect = this.effects.get(globalEffect.effectName);
                if (effect && effect.handler.onVisibilityChange) {
                    effect.handler.onVisibilityChange(
                        globalEffect.instance.data,
                        isVisible,
                        element
                    );
                }
            }
        }
    }

    /**
     * 销毁所有效果
     */
    destroy() {
        // 移除全局事件
        if (this.globalHandler) {
            document.removeEventListener('mousemove', this.globalHandler);
            this.globalHandler = null;
        }

        // 取消RAF
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // 清理全局效果
        this.globalEffects.forEach(({ effectName, instance }) => {
            this._destroyEffectInstance(effectName, instance);
        });
        this.globalEffects = [];

        // 清理悬停效果
        this.hoverEffects.forEach((effects, element) => {
            effects.forEach(({ effectName, instance }) => {
                this._destroyEffectInstance(effectName, instance);
            });
            
            // 移除事件监听
            if (element._cursorEffectsHandlers) {
                const handlers = element._cursorEffectsHandlers;
                element.removeEventListener('mousemove', handlers.handleMouseMove);
                element.removeEventListener('mouseleave', handlers.handleMouseLeave);
                element.removeEventListener('mouseenter', handlers.handleMouseEnter);
                delete element._cursorEffectsHandlers;
            }
        });
        this.hoverEffects.clear();

        // 清理效果实例数据
        this.effects.forEach(effect => {
            effect.instances.clear();
        });

        this.initialized = false;
    }

    /**
     * 销毁单个效果实例
     */
    _destroyEffectInstance(effectName, instance) {
        if (instance.destroyed) return;
        
        const effect = this.effects.get(effectName);
        if (effect && effect.handler.destroy) {
            effect.handler.destroy(instance.data, instance.element);
        }
        
        // 从存储中移除实例
        if (effect) {
            const instances = effect.instances.get(instance.element);
            if (instances) {
                const index = instances.indexOf(instance);
                if (index > -1) {
                    instances.splice(index, 1);
                }
                if (instances.length === 0) {
                    effect.instances.delete(instance.element);
                }
            }
        }
        
        instance.destroyed = true;
        instance.data = null;
    }
}

/**
 * CursorEffectsInstance - 元素效果实例
 * 提供类似jQuery的链式调用
 */
class CursorEffectsInstance {
    constructor(elements, manager) {
        this.elements = Array.from(elements);
        this.manager = manager;
        this._instances = []; // 存储当前操作创建的所有效果实例
        this.length = this.elements.length;
        
        // 确保manager已初始化
        if (!manager.initialized) {
            manager.init();
        }
    }

    /**
     * 遍历元素
     */
    // each(callback) {
    //     this.elements.forEach((el, index) => callback.call(el, index, el));
    //     return this;
    // }

    /**
     * 添加效果
     * @param {string} effectName - 效果名称
     * @param {Object} options - 效果选项
     * @returns {CursorEffectsInstance}
     */
    addEffect(effectName, options = {}) {
        this.elements.forEach(element => {
            const instance = this.manager._addEffectInstance(element, effectName, options);
            if (!instance) return;

            const effect = this.manager.effects.get(effectName);
            
            // 判断效果类型
            if (effect.handler.type === 'hover') {
                // 悬停效果
                this.manager._addHoverEffect(element, effectName, instance);
            } else {
                // 全局效果（默认）
                this.manager._addGlobalEffect(element, effectName, instance);
            }

            this._instances.push({ element, instance, effectName });
        });

        return this;
    }

    /**
     * 暂停效果
     * @returns {CursorEffectsInstance}
     */
    pause() {
        this._instances.forEach(({ instance }) => {
            if (instance.paused) return;
            if (!instance.destroyed) {
                instance.paused = true;
            }
        });
        return this;
    }

    /**
     * 恢复效果
     * @returns {CursorEffectsInstance}
     */
    resume() {
        this._instances.forEach(({ instance }) => {
            if (!instance.paused) return;
            if (!instance.destroyed) {
                instance.paused = false;
                
                // 重新检查可见性
                const globalEffect = this.manager.globalEffects.find(
                    ge => ge.instance === instance
                );
                if (globalEffect) {
                    globalEffect.visible = true;
                }
            }
        });
        return this;
    }

    /**
     * 销毁当前实例创建的效果
     * @returns {CursorEffectsInstance}
     */
    destroy() {
        this._instances.forEach(({ element, instance, effectName }) => {
            // 从全局效果列表移除
            const globalIndex = this.manager.globalEffects.findIndex(
                ge => ge.instance === instance
            );
            if (globalIndex > -1) {
                this.manager.globalEffects.splice(globalIndex, 1);
            }

            // 从悬停效果列表移除
            if (this.manager.hoverEffects.has(element)) {
                const hoverEffects = this.manager.hoverEffects.get(element);
                const hoverIndex = hoverEffects.findIndex(
                    he => he.instance === instance
                );
                if (hoverIndex > -1) {
                    hoverEffects.splice(hoverIndex, 1);
                }
                
                // 如果元素没有悬停效果了，移除事件监听
                if (hoverEffects.length === 0) {
                    this.manager.hoverEffects.delete(element);
                    if (element._cursorEffectsHandlers) {
                        const handlers = element._cursorEffectsHandlers;
                        element.removeEventListener('mousemove', handlers.handleMouseMove);
                        element.removeEventListener('mouseleave', handlers.handleMouseLeave);
                        element.removeEventListener('mouseenter', handlers.handleMouseEnter);
                        delete element._cursorEffectsHandlers;
                    }
                }
            }

            // 销毁效果实例
            this.manager._destroyEffectInstance(effectName, instance);
        });

        this._instances = [];
        return this;
    }

    /**
     * 获取第一个元素的原生DOM引用
     */
    get(index = 0) {
        return this.elements[index] || null;
    }
}

// 创建全局单例
const cursorEffects = new CursorEffects();

// 如果使用模块化，导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = cursorEffects;
}

// 挂载到全局（可选）
if (typeof window !== 'undefined') {
    window.$cursor = cursorEffects;
    window.CursorEffects = CursorEffects;
}