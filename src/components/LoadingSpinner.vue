<script setup>
defineProps({
  size: {
    type: String,
    default: "medium", // small, medium, large
  },
});
</script>

<template>
  <div class="loading-container" :class="size">
    <div class="spinner"></div>
    <p class="loading-text">載入中...</p>
  </div>
</template>

<style lang="scss" scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 200px;

  &.small {
    min-height: 100px;
    padding: 20px;

    .spinner {
      width: 24px;
      height: 24px;
      border-width: 2px;
    }

    .loading-text {
      font-size: 12px;
    }
  }

  &.large {
    min-height: 400px;
    padding: 60px;

    .spinner {
      width: 48px;
      height: 48px;
      border-width: 4px;
    }

    .loading-text {
      font-size: 16px;
    }
  }
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(40, 200, 200, 0.2);
  border-top-color: #28c8c8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 12px;
  color: #666;
  font-size: 14px;
}
</style>
