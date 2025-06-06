const argparse = require("argparse");

const parser = new argparse.ArgumentParser({
	description: "Drumee options",
	addHelp: true,
});


parser.addArgument("--dbdir", {
	type: String,
	default: null,
	help: "Database directory",
});

parser.addArgument("--endpoint", {
	type: String,
	default: null,
	help: "Endpoint name",
});

parser.addArgument("--sync-mode", {
	type: String,
	default: "standard",
	help: "standard|experimental",
});

parser.addArgument("--dev", {
	type: "int",
	default: 0,
	help: "Set developer mode",
});

parser.addArgument("--reset", {
	type: "int",
	default: 0,
	help: "Reset working rables before reloading. Requires dev mode to be set",
});

parser.addArgument("--experimental", {
	type: "int",
	default: 0,
	help: "Enable experimental feature (Ransomeware detector)",
});

parser.addArgument("--local-bundle", {
	type: "int",
	default: 0,
	help: "Force updater menu to be displayed",
});

parser.addArgument("--debug-bundle", {
	type: "int",
	default: 0,
	help: "Display updater menu to be displayed",
});

parser.addArgument("--resync", {
	type: "int",
	default: 0,
	help: "Reset pending events before reloading. Requires dev mode to be set",
});

parser.addArgument("--offline", {
	type: "int",
	default: 0,
	help: "Simulate offline mode. Requires dev mode to be set",
});

parser.addArgument("--trace-service", {
	type: "int",
	default: 0,
	help: "Show backend service response",
});

parser.addArgument("--trace-db", {
	type: "int",
	default: 0,
	help: "Set sqlite verbosity",
});

parser.addArgument("--trace-sql", {
	type: "int",
	default: 0,
	help: "Trace sql statements",
});

parser.addArgument("--trace-watcher", {
	type: "int",
	default: 0,
	help: "Trace local FS events watcher",
});

parser.addArgument("--open-dev", {
	type: "int",
	default: 0,
	help: "Start developer mode with dev tools open",
});

parser.addArgument("--verbose", {
	type: "int",
	default: 0,
	help: "Set verbosity level",
});


const args = parser.parseArgs();
Object.freeze(args)
module.exports = args;
