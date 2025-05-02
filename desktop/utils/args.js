const argparse = require("argparse");

const parser = new argparse.ArgumentParser({
	description: "Lotja ",
	addHelp: true,
});


parser.addArgument("--verbose", {
	type: "int",
	defaultValue: 0,
	help: "Set verbosity",
});

parser.addArgument("--endpoint", {
	type: String,
	defaultValue: "main",
	help: "Endpoint location",
});

parser.addArgument("--endpointPath", {
	type: String,
	defaultValue: "main",
	help: "Endpoint path",
});


const args = parser.parseArgs();
module.exports = args;