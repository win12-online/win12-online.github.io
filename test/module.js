// ==================== 通用效果 ====================

// 1. 发光边缘 - 旋转光亮朝向鼠标
$cursor.registerEffect('glowEdge', {
    type: 'global',
    
    init(element, options) {
        const pseudo = document.createElement('div');
        pseudo.className = 'cursor-glow-edge';
        element.style.position = element.style.position || 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(pseudo);
        
        return {
            pseudo,
            color: options.color || 'rgb(247, 244, 85)',
            bgcolor: options.bgcolor || 'transparent',
            width: options.width || '2px',
            blur: options.blur || '0px',
            radius: options.radius || element.style.borderRadius +'px',
        };
        
    },
    
    update(data, mouseX, mouseY, event, element) {
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(mouseY - cy, mouseX - cx) * 180 / Math.PI;
        console.log(data.radius);
        data.pseudo.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 10;
            padding: ${data.width};
            border-radius: ${data.radius};
            background: conic-gradient(
                from ${angle}deg at 50% 50%,
                ${data.bgcolor} 0deg 50deg,
                ${data.color} 90deg,
                ${data.bgcolor} 130deg
            );
            -webkit-mask: 
                linear-gradient(#fff 0 0) content-box,
                linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            filter: blur(${data.blur});
        `;
    },
    
    destroy(data, element) {
        data.pseudo.remove();
    }
});

// 2. 鼠标吸引偏移
$cursor.registerEffect('magneticAttract', {
    type: 'global',
    
    init(element, options) {
        return {
            k1: options.k1 ?? 30,      // 元素中心引力系数
            k2: options.k2 ?? 120,     // 鼠标引力系数
            maxOffset: options.maxOffset ?? 20, // 最大偏移量(px)
            element: element
        };
    },
    
    update(data, mouseX, mouseY, event, element) {
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        const dx = mouseX - cx;
        const dy = mouseY - cy;
        
        // offset = k1 * (mouse - center) / (k1 + k2)
        // k1越大，越靠近鼠标；k2越大，越稳定在中心
        let offsetX = data.k1 * dx / (data.k1 + data.k2);
        let offsetY = data.k1 * dy / (data.k1 + data.k2);
        
        // 限制最大偏移
        const dist = Math.sqrt(offsetX ** 2 + offsetY ** 2);
        if (dist > data.maxOffset) {
            offsetX = offsetX / dist * data.maxOffset;
            offsetY = offsetY / dist * data.maxOffset;
        }
        
        element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        // element.style.transition = 'transform 0.1s ease-out';
    },
    
    destroy(data, element) {
        element.style.transform = '';
        element.style.transition = '';
    }
});

// 3. 动态CSS变量 - radial-gradient背景跟随
$cursor.registerEffect('dynamicBgGlow', {
    type: 'global',
    
    init(element, options) {
        return {
            varName: options.varName || '--cursor-glow',
            glowColor: options.glowColor || 'rgba(255, 200, 150, 0.15)',
            bgColor: options.bgColor || 'transparent',
            size: options.size || 300,    // 光斑半径(px)
            falloff: options.falloff ?? 0.7 // 衰减曲线陡峭度 (0~1, 越接近1越确保光斑在元素内)
        };
    },
    
    update(data, mouseX, mouseY, event, element) {
        const rect = element.getBoundingClientRect();
        
        // 计算相对位置 (0~1)
        let rx = (mouseX - rect.left) / rect.width;
        let ry = (mouseY - rect.top) / rect.height;
        
        // 使用渐进于1的函数确保光斑中心在背景内部
        // 将rx/ry映射到 [margin, 1-margin]，margin随falloff增大而增大
        const margin = 0.1 * data.falloff;
        rx = margin + rx * (1 - 2 * margin);
        ry = margin + ry * (1 - 2 * margin);
        
        const px = rx * 100;
        const py = ry * 100;
        
        element.style.setProperty(
            data.varName,
            `radial-gradient(circle ${data.size}px at ${px}% ${py}%, ${data.glowColor}, ${data.bgColor})`
        );
    },
    
    destroy(data, element) {
        element.style.removeProperty(data.varName);
    }
});


// ==================== 悬停效果 ====================

// 1. 悬停径向渐变光源
$cursor.registerEffect('hoverGlow', {
    type: 'hover',
    
    init(element, options) {
        return {
            varName: options.varName || '--hover-glow',
            glowColor: options.glowColor || 'rgba(255, 255, 200, 0.25)',
            bgColor: options.bgColor || 'transparent',
            size: options.size || 200
        };
    },
    
    hover(data, x, y, event, element) {
        const px = (x / element.offsetWidth) * 100;
        const py = (y / element.offsetHeight) * 100;
        
        element.style.setProperty(
            data.varName,
            `radial-gradient(circle ${data.size}px at ${px}% ${py}%, ${data.glowColor}, ${data.bgColor})`
        );
    },
    
    leave(data, event, element) {
        element.style.removeProperty(data.varName);
    },
    
    destroy(data, element) {
        element.style.removeProperty(data.varName);
    }
});

// 2. 卡片立体偏转（斥力版 - 远离指针）
$cursor.registerEffect('tiltRepel', {
    type: 'hover',
    
    init(element, options) {
        return {
            maxTilt: options.maxTilt ?? 15,    // 最大偏转角度(deg)
            perspective: options.perspective ?? 800 // 透视距离(px)
        };
    },
    
    hover(data, x, y, event, element) {
        const w = element.offsetWidth;
        const h = element.offsetHeight;
        
        // 计算相对中心的位置 (-1 ~ 1)
        const rx = (x / w - 0.5) * 2;
        const ry = (y / h - 0.5) * 2;
        
        // 斥力：远离指针方向偏转
        const rotateY = rx * data.maxTilt;
        const rotateX = -ry * data.maxTilt;
        
        element.style.transform = `
            perspective(${data.perspective}px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
        `;
        // element.style.transition = ' 0.1s ease-out';
    },
    
    leave(data, event, element) {
        element.style.transform = `
            perspective(${data.perspective}px)
            rotateX(0deg)
            rotateY(0deg)
        `;
        // element.style.transition = ' 0.4s ease-out';
    },
    
    destroy(data, element) {
        element.style.transform = '';
        element.style.transition = '';
    }
});
