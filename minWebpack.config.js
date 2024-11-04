import path from 'path'
import { ChangeOutPutPath } from './ChangeOutPutPath.js'
import { jsonLoader }from './jsonLoader.js'
export default {
    entry: "./min-pack-example/main.js",
    output: {
        filename: 'bundle.js',
        path: path.resolve('./dist')
    },
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