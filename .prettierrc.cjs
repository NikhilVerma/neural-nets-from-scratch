// eslint-disable-next-line no-undef
module.exports = {
	arrowParens: "avoid",
	printWidth: 100,
	tabWidth: 2,
	trailingComma: "none",
	useTabs: true,
	vueIndentScriptAndStyle: false,
	overrides: [
		{
			files: ["package.json", "*.html"],
			options: {
				useTabs: false
			}
		},
		{
			files: ["*.json"],
			options: {
				printWidth: 1000
			}
		}
	]
};
