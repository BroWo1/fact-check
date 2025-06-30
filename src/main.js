import { createApp, h } from 'vue';
import Antd from 'ant-design-vue';
import { ConfigProvider } from 'ant-design-vue';
import App from './App.vue';
import { themeConfig } from './theme.js';
import 'ant-design-vue/dist/reset.css';

const app = createApp({
  render() {
    return h(ConfigProvider, { theme: themeConfig }, {
      default: () => h(App)
    });
  }
});

app.use(Antd).mount('#app');