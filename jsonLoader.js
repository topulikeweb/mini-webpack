function jsonLoader(source) {
    console.log(source)
    this.addDeps('dep1')
    return `export default ${JSON.stringify(source)}`
}
export { jsonLoader }