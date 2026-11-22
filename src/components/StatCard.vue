<script setup lang="ts">
defineProps<{
    label: string;
    value: string | number;
    icon: string;
    accent?: string;
}>();
</script>
<template>
    <div class="stat-card" :class="accent"><span class="stat-icon">{{icon}}</span>
        <div><small>{{label}}</small><strong>{{value}}</strong></div>
    </div>
</template>
<style scoped>
.stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 17px;
    background: #242a43;
    border: 1px solid #343b59;
    border-radius: 16px;
    min-width: 0;
}
.stat-icon {
    font-size: 25px;
}
.stat-card small {
    display: block;
    color: #9da7c3;
    font-size: 12px;
}
.stat-card strong {
    display: block;
    color: #fff;
    font-size: 21px;
    margin-top: 3px;
}
.stat-card.gold strong {
    color: #ffd46b;
}
</style>