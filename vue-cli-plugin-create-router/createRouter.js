const fs = require('fs')
const path = require('path')
const watch = require('watch')
const chalk = require('chalk')
const globby = require('globby')
const vueTemplate = require('vue-template-compiler')

module.exports = class CreateRouter {
    constructor (api, options) {
        options = (options.pluginOptions && options.pluginOptions.createRouterConfig) || ''
        // this.initOptions = options

        // global router config
        this.options = {
            async: false,
            watch: false,
            cwd: path.resolve(process.cwd(), './src'),
            projectPath: 'views',
            outputFileName: 'index',
            ...options
        }
        this.options.rootPath = this.options.projectPath.replace(/\/.*/g, '')

        // page router config
        this.pageOptions = {
            note: '',
            watch: this.options.watch,
            async: this.options.async,
            name: '',
            path: '',
            meta: '',
            alias: '',
            redirect: '',
            beforeEnter: ''
        }

        // add router-loader
        api.chainWebpack(config => {
            config.module.rule('router').resourceQuery(/blockType=router-config/).use('router-loader').loader(require.resolve('./router-loader'))
        })

        if (this.hasArgv('--async')) {
            this.pageOptions.async = true
        }

        if (this.hasArgv('--watch')) {
            this.pageOptions.watch = true
        }

        if (this.hasArgv('help')) { 
            let opts = api.service.commands['serve'].opts || {};
            let pkg = require('./package');
            opts.options['--watch'] = `run serve in watch mode . More：${ chalk.cyan(pkg.homepage) }`;
        }

        if(process.env.NODE_ENV !== 'production') {
            watch.createMonitor(path.join(this.options.cwd, this.options.projectPath.replace(/\/$/g, '')), {
                interval: 2
            }, monitor => {
                this.pageOptions.watch && monitor.on("created", p => {
                    /.vue$/g.test(p) && this.run();
                })

                monitor.on("changed", p => {
                    /.vue$/g.test(p) && this.getPageInfo(p).watch && this.run();
                })
    
                this.pageOptions.watch && monitor.on("removed", p => {
                    /.vue$/g.test(p) && this.run();
                })
            })
        }
    }

    async createRoutesFiles () {
        const files = [];
    
        (await globby(`${ this.options.projectPath.replace(/\/$/g, '') }/**/*.vue`, {
            cwd: this.options.cwd,
            ignore: ['**/*.test.*', '**/*.spec.*', '**/-*.*']
        })).forEach(p => {
            const key = p.replace(/\.(js|vue)$/, '')

            if (/\.vue$/.test(p) || !files[key]) {
                p =  p.replace(/('|")/g, '\\$1')
                files.push({ page: p, info: this.getPageInfo(p) })
            }
        })

        return this.createRoutes(files)
    }
    
    getPageInfo (p) {
        const pageFile = this.resolveFile(p, { cwd: this.options.cwd })
        const pageTemplate = vueTemplate.parseComponent(pageFile)
        const customBlocks = pageTemplate.customBlocks.find(b => b.type === 'router-config')
        let info = { ...this.pageOptions };
        try {
            info = customBlocks ? { ...this.pageOptions, ...eval('('+ customBlocks.content +')') } : this.pageOptions
        } catch (error) {
            console.log(
                `  - error: ${ chalk.red('Error in router-config format') }` + 
                `  pages: ${ chalk.cyan(p) }`
            )
        }

        return info
    }
    
    createRoutes (files) {
        const routes = [];
        const requireComponent = [];

        requireComponent.push(`/* 此代码自动生成 \n * date ${ this.getDate() } \n*/\n`)
        files.forEach(file => {
            const keys = file.page
                .replace(RegExp(`^${ this.options.rootPath }`), '')
                .replace(/\.(vue|js)$/, '')
                .replace(/\/{2,}/g, '/')
                .split('/')
                .slice(1)
            
            const pageName = `${ this.camelCase(this.options.rootPath + '-' + keys.join('-').replace(/[_|-|.]/g, '')) }`
            const pagePath = `@/${ this.options.rootPath }/${ keys.join('/')}`
            const note = file.info.note ? `// ${ file.info.note } \n` : ''

            const route = {
                name: '',
                path: '',
                customName: file.info.name,
                customPath: file.info.path,
                customMeta: file.info.meta,
                customRedirect: file.info.redirect,
                customAlias: file.info.alias,
                customBeforeEnter: `${ file.info.beforeEnter }`.replace(/\"/gm, "'").replace(/\r|\n|\t/gm, ''),
                component: pageName
            }

            file.info.async 
            ? requireComponent.push(`${ note }const ${ pageName } = () => import('${ pagePath }')`) 
            : requireComponent.push(`${ note }import ${ pageName } from '${ pagePath }'`)

            let parent = routes
            keys.forEach((key, i) => {
                route.name = key.startsWith('_') ? key.substr(1) : key
                route.name += key === '_' ? 'all' : ''
                const child = parent.find(parentRoute => parentRoute.name === route.name);
    
         
                if (child) {
                    child.children = child.children || []
                    parent = child.children
                    route.path = ''
                } else if (key === 'index' && i + 1 === keys.length) {
                    route.path += i > 0 ? '' : '/'
                } else {
                    route.path = `/` + this.getRoutePathExtension(key)
    
                    if (key.startsWith('_') && key.length > 1) {
                        route.path += '?'
                    }
                }
            })
            parent.push(route)
        })
        this.sortRoutes(routes)
        return {
            'routes': this.cleanChildrenRoutes(routes),
            'requireComponent': requireComponent
        }
    }
    
    getRoutePathExtension (key) {
        if (key === '_') {
            return '*'
        }
    
        if (key.startsWith('_')) {
            return `:${key.substr(1)}`
        }
    
        return key
    }
    
    sortRoutes (routes) {
        const DYNAMIC_ROUTE_REGEX = /^\/(:|\*)/
    
        routes.sort((a, b) => {
            if (!a.path.length) {
                return -1
            }
            if (!b.path.length) {
                return 1
            }
            if (a.path === '/') {
                return DYNAMIC_ROUTE_REGEX.test(b.path) ? -1 : 1
            }
            if (b.path === '/') {
                return DYNAMIC_ROUTE_REGEX.test(a.path) ? 1 : -1
            }
    
            let i
            let res = 0
            let y = 0
            let z = 0
            const _a = a.path.split('/')
            const _b = b.path.split('/')
            for (i = 0; i < _a.length; i++) {
                if (res !== 0) {
                    break
                }
                y = _a[i] === '*' ? 2 : _a[i].includes(':') ? 1 : 0
                z = _b[i] === '*' ? 2 : _b[i].includes(':') ? 1 : 0
                res = y - z
                if (i === _b.length - 1 && res === 0) {
                    res = _a[i] === '*' ? -1 : (
                        _a.length === _b.length ? a.path.localeCompare(b.path) : (_a.length - _b.length)
                    )
                }
            }
    
            if (res === 0) {
                res = _a[i - 1] === '*' && _b[i] ? 1 : (
                    _a.length === _b.length ? a.path.localeCompare(b.path) : (_a.length - _b.length)
                )
            }
            return res
        })
    
        routes.forEach((route) => {
            if (route.children) {
                this.sortRoutes(route.children)
            }
        })
    
        return routes
    }
    
    cleanChildrenRoutes (routes, isChild = false) {
        let start = -1
        const routesIndex = []
        routes.forEach(route => {
            if (/-index$/.test(route.name) || route.name === 'index') {
                const res = route.name.split('-')
                const s = res.indexOf('index')
                start = start === -1 || s < start ? s : start
                routesIndex.push(res)
            }
        })
        routes.forEach(route => {
            route.path = isChild ? route.path.replace('/', '') : route.path
            if (route.path.includes('?')) {
                const names = route.name.split('-')
                const paths = route.path.split('/')
                if (!isChild) {
                    paths.shift()
                }
                routesIndex.forEach((r) => {
                    const i = r.indexOf('index') - start
                    if (i < paths.length) {
                        for (let a = 0; a <= i; a++) {
                            if (a === i) {
                                paths[a] = paths[a].replace('?', '')
                            }
                            if (a < i && names[a] !== r[a]) {
                                break
                            }
                        }
                    }
                })
                route.path = (isChild ? '' : '/') + paths.join('/')
            }

            route.name = route.name.replace(/-index$/, '')
            route.customName && (route.name = route.customName)
            route.customPath && (route.path = route.customPath)
            route.customMeta && (route.meta = route.customMeta)
            route.customAlias && (route.alias = route.customAlias)
            route.customRedirect && (route.redirect = route.customRedirect)
            route.customBeforeEnter && (route.beforeEnter = route.customBeforeEnter)
            delete route.customName; delete route.customPath; delete route.customMeta; delete route.customAlias; delete route.customRedirect; delete route.customBeforeEnter

            if (route.children) {
                if (route.children.find(child => child.path === '')) {
                    delete route.name
                }
                route.children = this.cleanChildrenRoutes(route.children, true)
            }
        })
        return routes
    }
    
    camelCase (string) {
        return string.replace(/-([a-z])/g, function (all, letter) {
            return letter.toUpperCase()
        });
    }

    getDate () {
        const date = new Date()
        return `${ date.getFullYear() }-${ date.getMonth() + 1 }-${ date.getDate() } ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }`
    }

    hasArgv (argv) {
        return process.argv.some(v => v == argv)
    }
    
    writeFile (dirname, fileName, content) {
        function writeFiles () {
            fs.writeFile(path.resolve(dirname, fileName), content, function(err){
                if(err) {
                    console.log(`  - writeFile: ${ chalk.red(err)}`);
                } else {
                    console.log('  Router generate at:')
                    console.log(`  - ${ fileName }:`, ` ${ chalk.cyan(path.join(dirname, fileName))}`)
                }
            });  
        }
    
        fs.exists(path.resolve(dirname), function(exists) { 
            exists ? writeFiles() : fs.mkdir(path.resolve(dirname), writeFiles)
        });
    }

    // 读取文件
    resolveFile (fileName, options) {
        options = Object.assign({
            cwd: process.cwd()
        }, options)

        try {
            const json = fs.readFileSync(path.resolve(options.cwd, fileName), 'utf8')
            return json;
        } catch (err) {
            console.log(`  - resolveFile: ${ chalk.red(err)}`)
        }
    }

    run () {
        /*
        if (!this.initOptions) {
            console.log(`  - Set the ${chalk.cyan('pluginOptions > createRouterConfig')} parameter in ${chalk.cyan('vue.config.js')}`)
            process.exit()
            return
        }
        */
        this.createRoutesFiles().then(res => {
            let content = ''
            res.requireComponent.forEach(res => {
                content += `${res}\n`
            });
    
            content += `\nexport default ${JSON.stringify(res.routes, null, 2)}`
                .replace(/"component": "(\w+?)"/g, `"component": $1`)
                .replace(/"beforeEnter": "(.*)"/gm, `"beforeEnter": $1`)
                .replace(/"(\w+?)":/g, '$1:')
    
            const dirname = path.resolve(this.options.cwd, './router')
            const fileName = `${ this.options.outputFileName }.js`
    
            this.writeFile(dirname, fileName, content)
        }).catch(error => {
            console.log(error);
        })
    }
}