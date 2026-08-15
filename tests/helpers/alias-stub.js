module.exports = new Proxy(function(){ return {}; }, { get: () => () => ({}), apply: () => ({}) });
