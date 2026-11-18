<template>
  <!--
    环境光层：液态玻璃必须有可折射的东西，否则只是白色磨砂。
    四团缓慢漂移的暖色光斑 + 极细颗粒，固定在视口最底层，只做 transform 动画。
  -->
  <div class="lg-ambient" aria-hidden="true">
    <span class="lg-ambient__blob lg-ambient__blob--amber"></span>
    <span class="lg-ambient__blob lg-ambient__blob--rose"></span>
    <span class="lg-ambient__blob lg-ambient__blob--sky"></span>
    <span class="lg-ambient__blob lg-ambient__blob--cream"></span>
    <span class="lg-ambient__blob lg-ambient__blob--slate"></span>
    <span class="lg-ambient__grain"></span>
  </div>
</template>

<script setup lang="ts">
import '@/styles/liquid-glass.css'
</script>
