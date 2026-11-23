<template>
  <span class="school-brand" aria-label="软件学院">
    <span class="school-brand__emblem" aria-hidden="true"><i></i></span>
    <span class="school-brand__type"><strong>软件学院</strong><small lang="en">SCHOOL OF SOFTWARE</small></span>
  </span>
</template>

<style scoped>
span.school-brand { display: inline-flex; align-items: center; gap: .65em; color: #23292d; font-size: clamp(15px, 1.25vw, 19px); }
.school-brand__emblem { display: grid; flex: none; place-items: center; width: 2em; aspect-ratio: 1; border-radius: 9px 2px;
  background: linear-gradient(145deg,#ff9b48,#ba400c); box-shadow: inset 0 0 0 1px #ffffff36; }
.school-brand__emblem i { width: .93em; height: .93em; border: 2px solid #fff; transform: rotate(-45deg); }
.school-brand__emblem i::after { content: ''; display: block; width: 58%; height: 58%; border: solid white; border-width: 0 0 2px 2px; }
.school-brand__type { display: grid; gap: .2em; text-align: left; line-height: 1.08; white-space: nowrap; }
.school-brand__type strong { font-family: "Microsoft YaHei", sans-serif; font-size: 1.23em; letter-spacing: .12em; }
.school-brand__type small { font: 600 .44em/1.2 Arial, sans-serif; letter-spacing: .16em; color: #655b51; }
</style>
