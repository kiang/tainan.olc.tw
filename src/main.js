import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { VueMasonryPlugin } from "vue-masonry";
import "./assets/scss/style.scss";

const app = createApp(App);

app.use(router).use(VueMasonryPlugin).mount("#app");

app.config.globalProperties.window = window;
