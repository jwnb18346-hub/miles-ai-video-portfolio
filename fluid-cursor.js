/**
 * 鼠标流体特效
 * ------------------------------------------------------------------
 * 鼠标划过会在页面背景上留下发光的流体尾迹，按下鼠标会额外炸开一团。
 * 只提亮、不遮挡内容（screen 混合 + 低透明度 + pointer-events: none）。
 *
 * 底层的流体求解器（advection / divergence / pressure / curl 那一套）
 * 来自 Pavel Dobryakov 的 WebGL-Fluid-Simulation，MIT 许可，
 * 这里通过 npm 包 webgl-fluid 引入：
 *   vendor/webgl-fluid.umd.js
 *   vendor/webgl-fluid.LICENSE.txt   ← 许可证原文，MIT 要求随代码保留
 *
 * 本文件只做初始化和参数调校，不包含算法本身。
 * 想关掉这个特效：删掉 index.html 里的 <canvas id="fluid"> 和下面两个
 * <script> 标签，再删掉本文件与 vendor/ 目录即可。
 */
(() => {
  "use strict";

  const canvas = document.getElementById("fluid");
  if (!canvas) return;

  // 触屏设备使用 script.js 中更轻量的触摸轨迹，避免移动端持续占用 GPU。
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (typeof window.WebGLFluid !== "function") return;

  // 与站点主色 --accent (#d8ff3e) 同一个色相，但故意不收满亮度：
  // screen 混合会把过亮的颜色推向白色，那样就丢掉柠檬绿了。
  const ACCENT = { r: 0.75, g: 1, b: 0.22 };

  try {
    window.WebGLFluid(canvas, {
      // hover：划过留尾迹；同时按下鼠标依然会额外炸开（库内对 mousedown 单独处理）
      TRIGGER: "hover",

      // 进页面先随机溅一下，否则用户不动鼠标就以为没生效
      IMMEDIATE: true,
      SPLAT_COUNT: 7,
      AUTO: false,

      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,

      // 消散速度：数值越大尾迹散得越快。1.6 大约留 1 秒多，不糊住内容
      DENSITY_DISSIPATION: 1.6,
      VELOCITY_DISSIPATION: 0.5,

      PRESSURE: 0.8,
      PRESSURE_ITERATIONS: 20,

      // 涡度：越大越"乱"。18 比默认 30 收敛一些，不会到处乱窜
      CURL: 18,

      SPLAT_RADIUS: 0.22,
      SPLAT_FORCE: 5200,

      // 单色（跟随站点主色）。想回到彩色随机，把这两行改成
      //   SPLAT_COLOR: undefined,  COLORFUL: true,
      SPLAT_COLOR: ACCENT,
      COLORFUL: false,

      SHADING: true,
      TRANSPARENT: true,

      // bloom 辉光会把颜色冲成白色，关掉才能保住柠檬绿的色相
      BLOOM: false,

      // 体积光在深色底上容易糊成一片，关掉
      SUNRAYS: false,

      BACK_COLOR: { r: 0, g: 0, b: 0 },
    });

    // 画布不接管点击，因此把全页面的鼠标输入桥接给流体求解器。
    // 这样链接、视频控件与对比滑杆都保持可用，拖动轨迹仍能覆盖整个视口。
    const forwardMouse = (type, source) => {
      const forwarded = new MouseEvent(type, {
        bubbles: false,
        cancelable: false,
        clientX: source.clientX,
        clientY: source.clientY,
        button: source.button,
        buttons: source.buttons,
      });
      Object.defineProperty(forwarded, "offsetX", { get: () => source.clientX });
      Object.defineProperty(forwarded, "offsetY", { get: () => source.clientY });
      canvas.dispatchEvent(forwarded);
    };

    document.addEventListener("mousedown", (event) => forwardMouse("mousedown", event), { passive: true });
    document.addEventListener("mousemove", (event) => forwardMouse("mousemove", event), { passive: true });
    window.addEventListener("mouseup", (event) => forwardMouse("mouseup", event), { passive: true });
  } catch (error) {
    // 老机器 / 禁用硬件加速 / 虚拟机里拿不到 WebGL 上下文时静默降级，
    // 特效没了但不能影响页面本身
    if (window.console && console.warn) console.warn("[fluid] 已跳过鼠标特效：", error);
  }
})();
