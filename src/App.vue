<template>
  <n-config-provider :theme="theme">
    <n-notification-provider>
      <n-message-provider>
        <fileexplorer />
      </n-message-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup>
import { fileExplorer } from "./components";
import { darkTheme } from "naive-ui";

const theme = darkTheme;
const fileexplorer = fileExplorer;
</script>

<style>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 20px;
}
body {
  background-color: rgb(24, 24, 28);
}
</style>
