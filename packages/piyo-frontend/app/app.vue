<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtWelcome />
  </div>
</template>
<script setup lang="ts">
import { hoge } from "@jo-mine/sample-micro-services-hoge";
import { hc } from "hono/client";
import type { App } from "@jo-mine/piyo-backend";
console.log(hoge());
const client = hc<App>("http://localhost:3001");
client.users.$get().then((res) => {
  console.log(res);
});
</script>