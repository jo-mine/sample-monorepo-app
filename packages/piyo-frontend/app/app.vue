<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtWelcome />
  </div>
</template>
<script setup lang="ts">
import type { App } from "@jo-mine/piyo-backend";
import { hc } from "hono/client";
import type { App as SubmoduleApp } from "@jo-mine/anon-backend";

const client = hc<App>("http://localhost:3001");
client.users.$get().then((res) => {
  res.json().then((data) => {
    console.log(data);
  });
});
const submoduleClient = hc<SubmoduleApp>("http://localhost:3002");
submoduleClient.news.$get().then((res) => {
  res.json().then((data) => {
    console.log(data);
  });
});
</script>
