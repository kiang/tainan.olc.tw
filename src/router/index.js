import { createRouter, createWebHashHistory } from "vue-router";
import Home from "@/views/Home.vue";

const baseTitle = "江明宗 - 台灣民眾黨 北中西區台南市議員參選人";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      component: Home,
      meta: {
        title: baseTitle,
        description: "江明宗，公民科技專家，100+公民科技專案開發者。用科技解決社會問題，推動資料治理與開放政府。",
      },
    },
    {
      path: "/Politics",
      name: "Politics",
      component: () => import("@/views/Politics.vue"),
      meta: {
        title: `政治理念 | ${baseTitle}`,
        description: "江明宗的政治理念與政見，推動資料治理、開放政府、公民參與。",
      },
    },
    {
      path: "/District",
      name: "District",
      component: () => import("@/views/District/District.vue"),
      meta: {
        title: `選區資訊 | ${baseTitle}`,
        description: "台南市北區、中西區選區地圖與掃街紀錄。",
      },
      redirect: { name: "DistrictMap" },
      children: [
        {
          path: "Map",
          name: "DistrictMap",
          component: () => import("@/views/District/DistrictMap.vue"),
          meta: {
            title: `選區 | ${baseTitle}`,
            description: "台南市北區、中西區選區地圖，了解選區人口統計與區域資訊。",
          },
        },
        {
          path: "Street",
          name: "StreetRecord",
          component: () => import("@/views/District/StreetRecord.vue"),
          meta: {
            title: `掃街 | ${baseTitle}`,
            description: "江明宗競選期間的掃街活動GPS紀錄，展現勤跑基層的決心。",
          },
        },
        {
          path: "StreetTalk",
          name: "StreetTalk",
          component: () => import("@/views/District/StreetTalk.vue"),
          meta: {
            title: `街講 | ${baseTitle}`,
            description: "台南三江街講活動紀錄。",
          },
        },
      ],
    },
    {
      path: "/PastRecord",
      name: "PastRecord",
      component: () => import("@/views/PastRecord/PastRecord.vue"),
      meta: {
        title: `過去成績 | ${baseTitle}`,
        description: "江明宗過去的公民科技專案成果、演講紀錄與媒體報導。",
      },
      children: [
        {
          path: "SpeechRecord",
          name: "SpeechRecord",
          component: () => import("@/views/PastRecord/SpeechRecord.vue"),
          meta: {
            title: `演講紀錄 | ${baseTitle}`,
            description: "江明宗的公開演講與分享紀錄。",
          },
        },
        {
          path: "PastWorks",
          name: "PastWorks",
          component: () => import("@/views/PastRecord/PastWorks.vue"),
          meta: {
            title: `科技創作 | ${baseTitle}`,
            description: "超過100個公民科技專案，包含口罩地圖、COVID-19本土病例地圖、蛋蛋前線支援地圖等，獲國際媒體報導。",
          },
        },
        {
          path: "RelatedNews",
          name: "RelatedNews",
          component: () => import("@/views/PastRecord/RelatedNews.vue"),
          meta: {
            title: `相關報導 | ${baseTitle}`,
            description: "江明宗相關的媒體報導，包含Bloomberg、PBS、CNN等國際媒體。",
          },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "Home" },
    },
  ],
});

// Navigation guard to update document title and meta description
router.afterEach((to) => {
  // Update title
  document.title = to.meta.title || baseTitle;

  // Update meta description
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta && to.meta.description) {
    descriptionMeta.setAttribute("content", to.meta.description);
  }

  // Update OG description
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription && to.meta.description) {
    ogDescription.setAttribute("content", to.meta.description);
  }

  // Update OG title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && to.meta.title) {
    ogTitle.setAttribute("content", to.meta.title);
  }

  // Update Twitter description
  const twitterDescription = document.querySelector('meta[property="twitter:description"]');
  if (twitterDescription && to.meta.description) {
    twitterDescription.setAttribute("content", to.meta.description);
  }

  // Update Twitter title
  const twitterTitle = document.querySelector('meta[property="twitter:title"]');
  if (twitterTitle && to.meta.title) {
    twitterTitle.setAttribute("content", to.meta.title);
  }
});

export default router;
