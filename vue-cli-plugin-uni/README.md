# @xohu/vue-cli-plugin-uni

> 基于 uni-app 修改

 **安装**

  ```
  npm install @xohu/vue-cli-plugin-uni -D
  ```

### 注入的命令
 ```
  使用：uni-cli [options]
  选项：
    --platform 要运行的平台，支持的平台详见 uni-app 官网
    --mode 要运行的环境变量文件，使用方法详见 vue-cli 官网
    --watch 监听文件变化，自动编译
  ```

  [uni-app 官网](https://uniapp.dcloud.io/quickstart?id=%E8%BF%90%E8%A1%8C%E5%B9%B6%E5%8F%91%E5%B8%83uni-app "demo")（platform 详解）
  [vue-cli 官网](https://cli.vuejs.org/zh/guide/mode-and-env.html "demo")（mode 环境变量 详解）

### 使用
  ```
  uni-cli serve --platform h5 --mode h5 --watch
  uni-cli build --platform h5 --mode h5
  ```
