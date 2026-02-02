import { createRouter, createWebHashHistory } from "vue-router";
import Home from "@/views/Home.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      component: Home,
    },
    {
      path: "/Politics",
      name: "Politics",

      component: () => import("@/views/Politics.vue"),
    },
    {
      path: "/DistrictMap",
      name: "DistrictMap",

      component: () => import("@/views/DistrictMap.vue"),
    },
    {
      path: "/RecordOfStreetMap",
      name: "RecordOfStreetMap",

      component: () => import("@/views/RecordOfStreetMap.vue"),
    },
    {
      path: "/TainanThree",
      name: "TainanThree",

      component: () => import("@/views/TainanThree.vue"),
    },
    {
      path: "/PastRecord",
      name: "PastRecord",

      component: () => import("@/views/PastRecord/PastRecord.vue"),
      children: [
        {
          path: "SpeechRecord",
          name: "SpeechRecord",
          component: () => import("@/views/PastRecord/SpeechRecord.vue"),
        },
        {
          path: "PastWorks",
          name: "PastWorks",
          component: () => import("@/views/PastRecord/PastWorks.vue"),
        },
        {
          path: "RelatedNews",
          name: "RelatedNews",
          component: () => import("@/views/PastRecord/RelatedNews.vue"),
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "Home" },
    },
  ],
});

export default router;
