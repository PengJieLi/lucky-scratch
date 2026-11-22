import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
	base: "/lucky-scratch/",
	plugins: [vue()]
	// 其他原有配置保持不变
});
