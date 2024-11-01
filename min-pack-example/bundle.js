// 1. 打包后的文件模板
// 2. import 无在在此作用域生效  -> 改为 cjs
// 3. 如何进行变量别名的隔离 -> 使用函数隔离每个文件
// 4. 隔离后如何执行对应函数 -> 根据引入的文件进行执行

// // foo.js
// function foojs() {
//     function foo() {
//         console.log('foo文件');
//     }

//     export { foo }
// }


// // main.js
// // import foo from './foo.js'
// function mainjs() {
//     const foo = require('./foo.js')
//     foo()
//     console.log('main')
// }

// 
(function (modules) {
    function require(id) {
        const module = {
            exports: {}
        }
        const [fn, mapping] = modules[id]
        function localRequire(filePath) {
            const id = mapping[filePath]
            return require(id)
        }
        fn(localRequire, module, module.exports)
        return module.exports
    }
    require('2')
})({
    1: [function (require, module, exports) {
        function foo() {
            console.log('foo文件');
        }

        module.exports = {
            foo
        }
    }, {
        './main.js': 2
    }],
    2: [function (require, module, exports) {
        const { foo } = require('./foo.js')
        foo()
        console.log('main')
    }, {
        "./foo.js": 1
    }]
})

