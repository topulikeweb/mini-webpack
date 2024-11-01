import fs from 'fs'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import path from 'path'
import ejs from 'ejs'
import { transformFromAst } from '@babel/core'
import { jsonLoader } from './jsonLoader.js'
import { SyncHook } from 'tapable'
import { ChangeOutPutPath } from './ChangeOutPutPath.js'
let id = 0
const webpackConfig = {
    module: {
        rules: [
            {
                test: /\.json$/,
                use: [jsonLoader]
            }
        ]
    },
    plugins: [new ChangeOutPutPath]
}

// 定义hooks
const hooks = {
    emitFile: new SyncHook(["context"])
}
/**
 * 获取文件的依赖等信息
 * @param {*} filePath 
 * @returns 
 */
function createAsset(filePath) {
    let source = fs.readFileSync(filePath, {
        encoding: 'utf-8'
    })
    const loader = webpackConfig.module.rules
    const loaderContext = {
        // 添加依赖
        addDeps(dep) {
            console.log(dep)
        }
    }
    loader.forEach(({ test, use }) => {
        if (test.test(filePath)) {
            if (Array.isArray(use)) {
                //顺序需要从后向前进行加载
                use.reverse().forEach(loaderItem => {
                    source = loaderItem.call(loaderContext, source)
                })
            }

        }
    })
    // 将代码转换为ast
    const ast = parse(source, {
        'sourceType': 'module'
    })

    const deps = []
    traverse.default(ast, {
        // 获取 ast 中的'import'语法字段
        ImportDeclaration({ node }) {
            deps.push(node.source.value)
        },
    });
    const { code } = transformFromAst(ast, null, {
        presets: [
            ['@babel/preset-env', { modules: 'commonjs' }]
        ]
    });
    return {
        id: id++,
        deps,
        filePath,
        mapping: {},
        code
    }
}

function createGraph() {
    const minMain = createAsset('min-pack-example/main.js')
    const queue = [minMain]
    for (const asset of queue) {
        console.log(asset)
        asset.deps.forEach(relativePath => {
            const { mapping } = asset
            const source = createAsset(path.resolve('min-pack-example', relativePath))
            mapping[relativePath] = source.id
            // 这里会不断将文件的依赖读取 main.js->foo.js->bar.js .....
            queue.push(source)
        });
    }
    return queue
}

const graph = createGraph()

function initPlugins() {
    const plugins = webpackConfig.plugins
    plugins.forEach(plugin => {
        plugin.apply(hooks)
    })
}

function build(graph) {
    const template = fs.readFileSync('./bundle.ejs', { encoding: 'utf-8' })
    const data = graph.map(item => {
        const { code, mapping, id } = item
        return {
            id,
            code,
            mapping
        }
    })
    const code = ejs.render(template, {
        data: data
    })
    let outPutPath = './dist/bundle.js'

    const context = {
        _ChangeOutPutPath(newPath) {
            outPutPath = newPath
        }
    }
    // 同步执行
    hooks.emitFile.call(context)
    fs.writeFileSync(outPutPath, code)
}

initPlugins()

build(graph)
