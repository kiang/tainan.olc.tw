<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

// Define breadcrumb mapping for routes
const breadcrumbMap = {
  Home: { label: "首頁", icon: "bi-house-door" },
  Politics: { label: "政治理念" },
  District: { label: "選區" },
  DistrictMap: { label: "選區", parent: "District" },
  StreetRecord: { label: "掃街", parent: "District" },
  TainanThree: { label: "台南三傑" },
  PastRecord: { label: "過去成績" },
  SpeechRecord: { label: "演講紀錄", parent: "PastRecord" },
  PastWorks: { label: "科技創作", parent: "PastRecord" },
  RelatedNews: { label: "相關報導", parent: "PastRecord" },
};

const breadcrumbs = computed(() => {
  const crumbs = [{ name: "Home", label: "首頁", icon: "bi-house-door" }];
  const currentRoute = route.name;

  if (currentRoute === "Home") return crumbs;

  const current = breadcrumbMap[currentRoute];
  if (!current) return crumbs;

  // Add parent if exists
  if (current.parent) {
    const parent = breadcrumbMap[current.parent];
    crumbs.push({
      name: current.parent,
      label: parent.label,
    });
  }

  // Add current page (not a link)
  crumbs.push({
    name: currentRoute,
    label: current.label,
    active: true,
  });

  return crumbs;
});
</script>

<template>
  <nav class="breadcrumb-nav" aria-label="麵包屑導覽">
    <ol class="breadcrumb-list">
      <li
        v-for="(crumb, index) in breadcrumbs"
        :key="crumb.name"
        class="breadcrumb-item"
        :class="{ active: crumb.active }"
      >
        <template v-if="!crumb.active">
          <RouterLink :to="{ name: crumb.name }" class="breadcrumb-link">
            <i v-if="crumb.icon" :class="'bi ' + crumb.icon"></i>
            <span>{{ crumb.label }}</span>
          </RouterLink>
          <span class="separator" aria-hidden="true">/</span>
        </template>
        <span v-else class="breadcrumb-current" aria-current="page">
          {{ crumb.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
.breadcrumb-nav {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #eee;

  @media (min-width: 992px) {
    padding: 15px 40px;
  }
}

.breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  max-width: 1400px;
  margin: 0 auto;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  font-size: 13px;

  @media (min-width: 992px) {
    font-size: 14px;
  }

  &.active {
    color: #333;
    font-weight: 600;
  }
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #28c8c8;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: #1a9a9a;
    text-decoration: underline;
  }

  i {
    font-size: 14px;
  }
}

.separator {
  margin: 0 8px;
  color: #999;
}

.breadcrumb-current {
  color: #666;
}
</style>
