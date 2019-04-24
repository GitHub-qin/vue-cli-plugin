# @xohu/vue-cli-plugin-create-router

> vue-cli 的 create-router 插件

- **使用**

  ```
  vue add @xohu/create-router
  or
  npm install @xohu/vue-cli-plugin-create-router -D
  or
  cnpm install @xohu/vue-cli-plugin-create-router -D
  ```

## 注入的命令

- **`vue-cli-service createRouter`**

  ```
  使用：vue-cli-service lint [options]

  选项：

    --async 开启路由异步模式，实现路由组件的懒加载 (默认不开启)
  ```

## 配置
create-router 默认配置基本可以满足日常需要，如需更改可以通过 `vue.config.js` 中的 `pluginOptions` 进行配置。

``` js
// vue.config.js
module.exports = {
  pluginOptions: {
       createRouterConfig: {
          // 工作目录（默认: src）
          cwd: path.resolve(process.cwd(), './src'),
          // 项目页面地址（默认: views）
          projectPath: `views`,
          // 生成路由文件的名称（默认: index）
          outputFileName: 'index'
          // 开启路由异步模式（默认: false）
          async: true,
          // 以监听模式运行 serve 服务，监听 projectPath 目录下文件的 created，removed，changed （默认: false）
          watch: true
      }
   }
}
```

## 项目目录

```
.
├─assets
├─components
├─views
│  ├─layout
│  │   ├─_id.vue
│  │   └─home.vue
│  └─layout.vue
├─router
│  └─index.js
└─store
```

创建内嵌子路由，你需要添加一个 vue 文件，同时添加一个与该文件同名的目录用来存放子视图组件

另外在使用动态路由时，需要创建对应的以下划线作为前缀的 vue 文件或目录
推荐使用 **`<router-config>`** 标签来配置动态路由

使用 **`<router-config>`** 标签
默认配置基本可以满足日常需要，如需更改可以通过每个页面灵活单独配置
```
# views/layout.vue
<router-config>
{
    // 注释说明文字
    note: 'Layout 页面9999',
    // 开启路由异步模式（默认: false）
    async: true,
    // 以监听模式运行 serve 服务，监听 projectPath 目录下文件的 created，removed，changed （默认: false）
    watch: true,

    // 以下参数请参考 [vue-router 官网](https://router.vuejs.org/zh/ "vue-router 官网")
    path: '/',
    alias: '',
    redirect: '',
    meta: {
        code...
    },
    beforeEnter: function(to, from, next) {
        code...
    }
}
</router-config>

<template>
    <div>
        hello
    </div>
</template>
```

`<route-config>` 包含一个 `json` 的内容, 其中字段会同步到生成的 `router/index.js` 路由配置文件

启动项目后生成文件`router/index.js`

```
// Layout 页面
const viewsLayout = () => import('@/views/layout')
import viewsLayoutHome from '@/views/layout/home'
import viewsLayoutId from '@/views/layout/_id'

export default [
  {
    name: "layout",
    path: "/",
    component: viewsLayout,
    children: [
      {
        name: "home",
        path: "home",
        component: viewsLayoutHome
      },
      {
        name: "id",
        path: ":id?",
        component: viewsLayoutId
      }
    ],
    meta: {
        requiresAuth: true
    },
    redirect: {
        name: "/test"
    },
    beforeEnter: function(to, from, next) {
        next()
    }
  }
]
```

``` js
// main.js
import Vue from 'vue'
import App from './App.vue'
import Router from 'vue-router'
Vue.use(Router)

import router from '@/router'

router = new Router({
  routes: router
})

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
```