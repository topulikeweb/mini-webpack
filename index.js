import fs from 'fs'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import path from 'path'
import ejs from 'ejs'
import { transformFromAst } from '@babel/core'
import { SyncHook } from 'tapable'
import * as minWebpackConfig from './minWebpack.config.js'
let id = 0

let { entry, outPutPath } = minWebpackConfig.default
const loader = minWebpackConfig.default.module.rules
const plugins = minWebpackConfig.default.plugins
// 定义hooks
const hooks = {
    emitFile: new SyncHook(["context"])
}

const assetCache = new Map();

/**
 * 获取文件的依赖等信息
 * @param {*} filePath 
 * @returns 
 */
function createAsset(filePath) {
    // 检查缓存中是否已经有该模块
    if (assetCache.has(filePath)) {
        return assetCache.get(filePath);
    }

    let source = fs.readFileSync(filePath, {
        encoding: 'utf-8'
    });
    const loaderContext = {
        addDeps(dep) {
            console.log(dep);
        }
    };
    // loader
    loader.forEach(({ test, use }) => {
        if (test.test(filePath)) {
            if (Array.isArray(use)) {
                use.reverse().forEach(loaderItem => {
                    source = loaderItem.call(loaderContext, source);
                });
            }
        }
    });
    // 转换为ast
    const ast = parse(source, { sourceType: 'module' });
    const deps = [];
    // 获取文件的import语法部分
    traverse.default(ast, {
        ImportDeclaration({ node }) {
            const { value } = node.source;
            deps.push(value);
        },
    });

    const { code } = transformFromAst(ast, null, {
        presets: [['@babel/preset-env', { modules: 'commonjs' }]]
    });

    // 创建 asset 对象
    const asset = {
        id: id++,
        deps,
        filePath,
        mapping: {},
        code,
    };

    // 将创建的 asset 存入缓存
    assetCache.set(filePath, asset);

    return asset;
}

function createGraph() {
    const minMain = createAsset(entry);
    const queue = [minMain];

    for (const asset of queue) {
        asset.deps.forEach(relativePath => {
            const { mapping } = asset;
            const fullPath = path.resolve('min-pack-example', relativePath);

            // 检查缓存，避免重复处理
            if (!assetCache.has(fullPath)) {
                const source = createAsset(fullPath);
                mapping[relativePath] = source.id;
                // 这里会造成循环引用问题
                queue.push(source);
            } else {
                // 如果已经在缓存中，直接使用缓存中的 ID
                mapping[relativePath] = assetCache.get(fullPath).id;
            }
        });
    }
    return queue;
}


const graph = createGraph()
console.log(graph)

function initPlugins() {
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
