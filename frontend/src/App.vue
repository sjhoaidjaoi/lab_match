<template>
  <router-view />
  <!--
    液态玻璃折射滤镜：必须与使用它的元素处于同一份文档、且 id 唯一。
    用 0 尺寸绝对定位而不是 display:none，某些构建链对隐藏 SVG 的滤镜引用不稳定。

    参数取舍（改前必读）：stdDeviation 决定高斯模糊半径，也是这个滤镜的唯一成本大头，
    半径越大边缘越「隆」，但每帧开销近似按半径增长。34 在顶栏那种宽幅元素上会明显拖慢
    滚动，实测降到 14 后视觉几乎察觉不到差别，成本却回落一个量级。
    位移 scale 同理，18 → 10 已足够看到边缘的弯曲。
  -->
  <svg class="lg-filter-defs" aria-hidden="true" focusable="false" width="0" height="0">
    <defs>
      <filter id="lgLensChrome" x="-8%" y="-30%" width="116%" height="160%" filterUnits="objectBoundingBox">
        <feGaussianBlur in="SourceAlpha" stdDeviation="14" result="lgBlur" />
        <feDisplacementMap in="SourceGraphic" in2="lgBlur" scale="10"
          xChannelSelector="A" yChannelSelector="A" />
      </filter>
    </defs>
  </svg>
</template>

<style>
.lg-filter-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
</style>
