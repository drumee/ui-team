module.exports = function (opt={}) {
	const {domain} = opt;
	return {
		serviceUrl: `wss://${domain}:443/xmpp-websocket`,
		hosts: {
			domain: `${domain}`,
			muc: `muc.${domain}`,
			anonymousdomain: `guest.${domain}`,
		},
		// xmppPing : {
		// 	interval : 6,
		// 	timeout :3,
		// }
	}
}