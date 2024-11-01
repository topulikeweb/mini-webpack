export class ChangeOutPutPath {
    apply(hooks) {
        hooks.emitFile.tap("-----change", (context) => {
            console.log('-----changeoutputpath');
            context._ChangeOutPutPath('./dist/new_bundle.js')
        })
    }
}